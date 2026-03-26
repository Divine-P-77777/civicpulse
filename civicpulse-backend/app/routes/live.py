import json
import os
import base64
import asyncio
import logging
import tempfile
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.elevenlabs_service import elevenlabs_service
from app.services.rag_pipeline import rag_pipeline
from app.services.live_session_service import (
    create_session, get_history, append_turns,
    update_language as persist_language, delete_session, ensure_table_exists
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live", tags=["live"])

# Bootstrap DynamoDB live session table on first import (idempotent)
try:
    ensure_table_exists()
except Exception as _e:
    logger.warning(f"[LiveSession] Table bootstrap warning: {_e}")


class ConnectionManager:
    def __init__(self):
        # Store active connections per session_id
        self.active_connections: dict[str, WebSocket] = {}
        self.cancel_events: dict[str, asyncio.Event] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.cancel_events[session_id] = asyncio.Event()
        logger.info(f"Session {session_id}: WebSocket connected.")

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            self.active_connections.pop(session_id, None)
            self.cancel_events.pop(session_id, None)
            logger.info(f"Session {session_id}: Cleaned up and removed.")

    def set_cancel_event(self, session_id: str):
        if session_id in self.cancel_events:
            self.cancel_events[session_id].set()

    def clear_cancel_event(self, session_id: str):
        if session_id in self.cancel_events:
            self.cancel_events[session_id].clear()
            
    def is_cancelled(self, session_id: str) -> bool:
        event = self.cancel_events.get(session_id)
        return event.is_set() if event else False

    async def send_json(self, session_id: str, data: dict) -> bool:
        """Send JSON to a specific session's WebSocket safely."""
        websocket = self.active_connections.get(session_id)
        if not websocket:
            return False
        try:
            await websocket.send_json(data)
            return True
        except Exception as e:
            logger.warning(f"Session {session_id}: Failed to send message: {e}")
            self.disconnect(session_id)
            return False

manager = ConnectionManager()

GREETING_TEXT = (
    "Hi! I'm CivicPulse. How can I help you today?"
)

GREETING_TEXT_HI = (
    "नमस्ते! मैं CivicPulse हूँ। आज कैसे मदद कर सकती हूँ?"
)


async def send_greeting(session_id: str, language: str = "en"):
    """Send an AI greeting with TTS audio when the user first connects."""
    try:
        text = GREETING_TEXT_HI if language == "hi" else GREETING_TEXT
        
        # 1. Send the greeting text transcript
        await manager.send_json(session_id, {
            "type": "ai_transcript",
            "text": text
        })

        # 2. Generate TTS audio and stream it
        logger.info(f"Session {session_id}: Generating greeting TTS ({language})...")
        
        if language == "hi":
            from app.services.sarvamai_service import sarvam_service
            audio_generator = sarvam_service.generate_speech_stream(iter([text]))
            audio_format = "wav"
        else:
            audio_generator = elevenlabs_service.generate_speech_stream(iter([text]))
            audio_format = "mp3"

        async for audio_chunk in audio_generator:
            chunk_b64 = base64.b64encode(audio_chunk).decode('utf-8')
            if not await manager.send_json(session_id, {
                "type": "audio_stream",
                "data": chunk_b64,
                "format": audio_format
            }):
                return  # Connection died

        logger.info(f"Session {session_id}: Greeting sent successfully.")
        # Signal that we are done sending chunks
        await manager.send_json(session_id, {"type": "speaking_done"})
    except Exception as e:
        logger.error(f"Session {session_id}: Greeting failed: {e}")
        text = GREETING_TEXT_HI if language == "hi" else GREETING_TEXT
        await manager.send_json(session_id, {
            "type": "ai_transcript",
            "text": text
        })

async def send_ai_voice_message(session_id: str, text: str, language: str = "en"):
    """Send an arbitrary AI message with TTS audio to a specific session."""
    try:
        # 1. Send the text transcript
        await manager.send_json(session_id, {
            "type": "ai_transcript",
            "text": text
        })

        # 2. Generate TTS audio and stream it
        logger.info(f"Session {session_id}: Generating custom TTS ({language}): {text[:50]}...")
        
        if language == "hi":
            from app.services.sarvamai_service import sarvam_service
            audio_generator = sarvam_service.generate_speech_stream(iter([text]))
            audio_format = "wav"
        else:
            audio_generator = elevenlabs_service.generate_speech_stream(iter([text]))
            audio_format = "mp3"

        async for audio_chunk in audio_generator:
            chunk_b64 = base64.b64encode(audio_chunk).decode('utf-8')
            if not await manager.send_json(session_id, {
                "type": "audio_stream",
                "data": chunk_b64,
                "format": audio_format
            }):
                return  # Connection died

        logger.info(f"Session {session_id}: Custom voice message sent successfully.")
        # Signal that we are done sending chunks
        await manager.send_json(session_id, {"type": "speaking_done"})
    except Exception as e:
        logger.error(f"Session {session_id}: Custom voice message failed: {e}")


async def process_voice_turn(
    session_id: str,
    transcript_text: str,
    language: str
):
    """Process a complete voice turn: load history → RAG → TTS → stream back → persist turn."""
    try:
        transcript_text = transcript_text.strip()
        logger.info(f"Session {session_id}: Transcript received: '{transcript_text}'")

        if not transcript_text:
            return

        # 1. Load session chat history from DynamoDB
        chat_history = get_history(session_id)
        logger.info(f"Session {session_id}: Loaded {len(chat_history)} history turns")

        manager.clear_cancel_event(session_id)
        # 2. Run RAG Pipeline (streaming) with conversation context
        logger.info(f"Session {session_id}: Running RAG pipeline...")

        llm_stream = rag_pipeline.analyze_document(
            query=transcript_text,
            user_id="live_user",
            session_id=session_id,
            chat_history=chat_history,
            language=language,
            stream=True,
            mode="live"
        )

        # Collect full response while streaming to TTS
        full_response_chunks = []
        
        def text_iterator():
            """
            Yields text chunks to TTS, stripping <DRAFT_READY .../> tags so they
            are never spoken aloud. The full response (including the tag) is still
            collected in full_response_chunks for the frontend transcript.
            """
            tag_buffer = ""
            inside_tag = False

            for chunk in llm_stream:
                full_response_chunks.append(chunk)  # Always collect full text

                if inside_tag:
                    tag_buffer += chunk
                    # Check if we've reached the end of the tag
                    if "/>" in tag_buffer:
                        inside_tag = False
                        # Yield anything that came AFTER the closing />
                        after_tag = tag_buffer.split("/>", 1)[-1]
                        tag_buffer = ""
                        if after_tag.strip():
                            yield after_tag
                    # Still inside tag — don't yield anything
                    continue

                if "<DRAFT_READY" in chunk:
                    # Tag starts in this chunk — split and yield only the pre-tag part
                    pre_tag, rest = chunk.split("<DRAFT_READY", 1)
                    if pre_tag.strip():
                        yield pre_tag
                    tag_buffer = "<DRAFT_READY" + rest
                    # Check if the tag closes in the same chunk
                    if "/>" in tag_buffer:
                        after_tag = tag_buffer.split("/>", 1)[-1]
                        tag_buffer = ""
                        if after_tag.strip():
                            yield after_tag
                    else:
                        inside_tag = True
                else:
                    yield chunk

        # 2. Generate TTS audio from the text stream
        logger.info(f"Session {session_id}: Generating TTS for language '{language}'")
        
        if language == "hi":
            from app.services.sarvamai_service import sarvam_service
            audio_generator = sarvam_service.generate_speech_stream(text_iterator())
            audio_format = "wav"
        else:
            audio_generator = elevenlabs_service.generate_speech_stream(text_iterator())
            audio_format = "mp3"

        # 3. Stream TTS audio chunks back to the client
        async for audio_chunk in audio_generator:
            if manager.is_cancelled(session_id):
                logger.info(f"Session {session_id}: Audio streaming interrupted by user.")
                break
            chunk_b64 = base64.b64encode(audio_chunk).decode('utf-8')
            if session_id not in manager.active_connections:
                break
            await manager.send_json(session_id, {
                "type": "audio_stream",
                "data": chunk_b64,
                "format": audio_format
            })

        # 4. Send the AI transcript ONCE after all audio is streamed
        final_text = "".join(full_response_chunks)
        logger.info(f"Session {session_id}: RAG response ({len(final_text)} chars): {final_text}")
        await manager.send_json(session_id, {
            "type": "ai_transcript",
            "text": final_text
        })
        await manager.send_json(session_id, {"type": "speaking_done"})

        # 5. Persist turn to DynamoDB - AWAIT to ensure history is saved before next message
        try:
            await asyncio.to_thread(append_turns, session_id, transcript_text, final_text)
            logger.info(f"Session {session_id}: Turn persisted to DynamoDB.")
        except Exception as e:
            logger.error(f"Session {session_id}: Failed to persist turn: {e}")

    except Exception as e:
        logger.error(f"Session {session_id}: Voice turn error: {e}")
        traceback.print_exc()
        await manager.send_json(session_id, {
            "type": "error",
            "message": f"Processing error: {str(e)}"
        })


@router.websocket("/ws/{session_id}")
async def live_voice_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for full-duplex Live Voice Mode.
    Receives raw user text transcripts (from frontend STT), processes with RAG,
    and streams AI TTS audio back. Auth is required.
    """
    # 1. Extract token from query params
    token = websocket.query_params.get("token")
    if not token:
        logger.warning(f"Session {session_id}: Rejected connection missing token.")
        try:
            await websocket.close(code=1008, reason="Missing authentication token")
        except Exception:
            pass
        return
        
    try:
        from app.core.auth import verify_jwt
        user_data = verify_jwt(token)
        user_id = user_data.get("sub")
        logger.info(f"Session {session_id}: Authenticated user {user_id}")
    except Exception as e:
        logger.warning(f"Session {session_id}: Rejected connection with invalid token: {e}")
        try:
            await websocket.close(code=1008, reason="Invalid authentication token")
        except Exception:
            pass
        return

    # 2. Accept connection and create DynamoDB session document
    await manager.connect(websocket, session_id)
    language = "en"
    # Create isolated session record (one doc per concurrent user)
    # AWAIT completion to ensure session exists before processing messages
    try:
        await asyncio.to_thread(create_session, session_id, user_id, language)
        logger.info(f"Session {session_id}: DynamoDB session created successfully.")
    except Exception as e:
        logger.warning(f"Session {session_id}: Session creation failed (may already exist): {e}")

    try:
        # Main message loop
        while True:
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect:
                logger.info(f"Session {session_id}: Client disconnected normally.")
                break
            except RuntimeError as e:
                logger.warning(f"Session {session_id}: WebSocket runtime error: {e}")
                break
            except Exception as e:
                logger.warning(f"Session {session_id}: Unexpected receive error: {e}")
                break

            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                logger.warning(f"Session {session_id}: Invalid JSON received.")
                continue

            msg_type = message.get("type")

            if msg_type == "config":
                language = message.get("language", "en")
                logger.info(f"Session {session_id}: Language set to '{language}'.")

            elif msg_type == "camera_capture":
                # Future: pass to a vision model
                pass

            elif msg_type == "request_greeting":
                await send_greeting(session_id, language)

            elif msg_type == "user_text":
                text = message.get("text", "")
                if text:
                    from app.services.rag_pipeline import rag_pipeline
                    detected_lang = rag_pipeline.detect_language(text)
                    
                    if detected_lang != language:
                        logger.info(f"Session {session_id}: Auto-switching language '{language}' → '{detected_lang}'")
                        language = detected_lang
                        # Notify frontend toggle to update
                        await manager.send_json(session_id, {
                            "type": "language_switch",
                            "language": detected_lang
                        })
                        # Persist language change to DynamoDB
                        asyncio.create_task(
                            asyncio.to_thread(persist_language, session_id, detected_lang)
                        )
                    
                    await process_voice_turn(session_id, text, language)

            elif msg_type == "session_end":
                # Explicit cleanup when user navigates to draft page or leaves
                logger.info(f"Session {session_id}: Received session_end from client.")
                asyncio.create_task(
                    asyncio.to_thread(delete_session, session_id)
                )
                break


            elif msg_type == "ingestion_complete":
                # Auto-respond about an uploaded document
                doc_name = message.get("filename", "document")
                auto_query = f"A document called '{doc_name}' was just uploaded. Please briefly tell me what this document is about and if there are any concerns I should know about."
                await process_voice_turn(session_id, auto_query, language)

            elif msg_type == "interrupt":
                logger.info(f"Session {session_id}: Interrupted by user.")
                manager.set_cancel_event(session_id)

    except WebSocketDisconnect:
        logger.info(f"Session {session_id}: WebSocket disconnected (outer).")
    except Exception as e:
        logger.error(f"Session {session_id}: Unexpected error: {e}")
        traceback.print_exc()
        try:
            await manager.send_json(session_id, {
                "type": "error",
                "message": "An unexpected server error occurred."
            })
        except Exception:
            pass
    finally:
        manager.disconnect(session_id)
        # Only delete session on explicit session_end, not on accidental disconnect
        # DynamoDB TTL (4 hours) acts as safety net for abandoned sessions
        logger.info(f"Session {session_id}: WebSocket disconnected. Session data preserved in DynamoDB.")

