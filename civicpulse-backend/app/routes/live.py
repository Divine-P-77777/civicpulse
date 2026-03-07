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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live", tags=["live"])

class ConnectionManager:
    def __init__(self):
        # Store active connections per session_id
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"Session {session_id}: WebSocket connected.")

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            self.active_connections.pop(session_id, None)
            logger.info(f"Session {session_id}: Cleaned up and removed.")

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
    "Hello! I'm CivicPulse, your AI legal rights assistant. "
    "How can I help you today? You can ask me anything about your legal rights, "
    "government schemes, or civic issues."
)

GREETING_TEXT_HI = (
    "नमस्ते! मैं CivicPulse हूँ, आपकी AI कानूनी अधिकार सहायक। "
    "आज मैं आपकी कैसे मदद कर सकती हूँ? आप मुझसे अपने कानूनी अधिकारों, "
    "सरकारी योजनाओं या नागरिक मुद्दों के बारे में कुछ भी पूछ सकते हैं।"
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
        else:
            audio_generator = elevenlabs_service.generate_speech_stream(iter([text]))

        async for audio_chunk in audio_generator:
            chunk_b64 = base64.b64encode(audio_chunk).decode('utf-8')
            if not await manager.send_json(session_id, {
                "type": "audio_stream",
                "data": chunk_b64
            }):
                return  # Connection died

        logger.info(f"Session {session_id}: Greeting sent successfully.")
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
        else:
            audio_generator = elevenlabs_service.generate_speech(text)

        for audio_chunk in audio_generator:
            chunk_b64 = base64.b64encode(audio_chunk).decode('utf-8')
            if not await manager.send_json(session_id, {
                "type": "audio_stream",
                "data": chunk_b64
            }):
                return  # Connection died

        logger.info(f"Session {session_id}: Custom voice message sent successfully.")
    except Exception as e:
        logger.error(f"Session {session_id}: Custom voice message failed: {e}")


async def process_voice_turn(
    session_id: str, 
    transcript_text: str,
    language: str
):
    """Process a complete voice turn: RAG → TTS → stream back (bypassing STT)."""
    try:
        transcript_text = transcript_text.strip()
        logger.info(f"Session {session_id}: Transcript received: '{transcript_text}'")

        if not transcript_text:
            return  # Silence or blank

        # 1. Process with RAG Pipeline (Streaming)
        logger.info(f"Session {session_id}: Running RAG pipeline (streaming to TTS)...")
        llm_stream = rag_pipeline.analyze_document(
            query=transcript_text,
            user_id="live_user",
            session_id=session_id,
            language=language,
            stream=True
        )

        # Buffer to capture the full transcript for the UI while streaming to TTS
        full_response_chunks = []
        
        def text_iterator():
            for chunk in llm_stream:
                full_response_chunks.append(chunk)
                yield chunk

        # 2. Generate Speech with TTS Service using Text Stream
        logger.info(f"Session {session_id}: Generating TTS streaming for language '{language}'")
        
        # Route to Sarvam for Hindi, ElevenLabs for everything else
        if language == "hi":
            from app.services.sarvamai_service import sarvam_service
            audio_generator = sarvam_service.generate_speech_stream(text_iterator())
        else:
            audio_generator = elevenlabs_service.generate_speech_stream(text_iterator())

        # 3. Stream TTS audio chunks back to the client instantly
        async for audio_chunk in audio_generator:
            chunk_b64 = base64.b64encode(audio_chunk).decode('utf-8')
            if session_id not in manager.active_connections:
                break
            await manager.send_json(session_id, {
                "type": "audio_stream",
                "data": chunk_b64
            })

        # 4. Send final AI transcript (after streaming ends)
        final_text = "".join(full_response_chunks)
        logger.info(f"Session {session_id}: RAG response length: {len(final_text)}")
        await manager.send_json(session_id, {
            "type": "ai_transcript",
            "text": final_text
        })

    except Exception as e:
        logger.error(f"Session {session_id}: Voice turn error: {e}")
        traceback.print_exc() # Print full stack trace to terminal
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
        await websocket.close(code=1008, reason="Missing authentication token")
        return
        
    try:
        from app.core.auth import verify_jwt
        user_data = verify_jwt(token)
        user_id = user_data.get("sub")
        logger.info(f"Session {session_id}: Authenticated user {user_id}")
    except Exception as e:
        logger.warning(f"Session {session_id}: Rejected connection with invalid token: {e}")
        await websocket.close(code=1008, reason="Invalid authentication token")
        return

    # 2. Accept connection
    await manager.connect(websocket, session_id)
    language = "en"

    try:
        # Greeting will be requested explicitly by client via 'request_greeting'

        # Main message loop
        while True:
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect:
                logger.info(f"Session {session_id}: Client disconnected normally.")
                manager.disconnect(session_id)
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
                    await process_voice_turn(session_id, text, language)

            elif msg_type == "interrupt":
                logger.info(f"Session {session_id}: Interrupted by user.")

    except WebSocketDisconnect:
        logger.info(f"Session {session_id}: WebSocket disconnected (outer).")
        manager.disconnect(session_id)
    except Exception as e:
        logger.error(f"Session {session_id}: Unexpected error: {e}")
        traceback.print_exc()
        await manager.send_json(session_id, {
            "type": "error",
            "message": "An unexpected server error occurred."
        })
        manager.disconnect(session_id)
    finally:
        manager.disconnect(session_id)
