import json
import os
import base64
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from openai import AsyncOpenAI
from app.services.elevenlabs_service import elevenlabs_service
from app.services.rag_pipeline import rag_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live", tags=["live"])

# In-memory dictionary to store active WebSocket connections per session
# Key: session_id, Value: WebSocket
active_connections = {}

@router.websocket("/ws/{session_id}")
async def live_voice_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for full-duplex Live Voice Mode.
    Receives base64-encoded audio chunks. Transcribes, processes with RAG, and streams AI TTS audio back.
    """
    await websocket.accept()
    active_connections[session_id] = websocket
    
    # Initialize Async OpenAI client for whisper
    client = AsyncOpenAI()
    
    # Simple state for accumulating audio
    audio_buffer = bytearray()
    language = "en" # Default, can be overridden by first message
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            msg_type = message.get("type")
            
            if msg_type == "config":
                # Client sets language preference
                language = message.get("language", "en")
                logger.info(f"WebSocket session {session_id} configured for language: {language}")
                
            elif msg_type == "camera_capture":
                # Client streams base64 image frames
                frame_b64 = message.get("data")
                if frame_b64:
                    # For now, we just log we received it. 
                    # In the future, we could pass this to a vision model.
                    # logger.info(f"Received camera frame from session {session_id}")
                    pass
                    
            elif msg_type == "audio_chunk":
                # Client streams base64 audio (webm/pcm)
                chunk_b64 = message.get("data")
                if chunk_b64:
                    chunk_bytes = base64.b64decode(chunk_b64)
                    audio_buffer.extend(chunk_bytes)
                    
            elif msg_type == "end_of_speech":
                # Client paused speaking. We process the buffer.
                if not audio_buffer:
                    continue
                    
                # 1. Transcribe with Whisper
                # We need to save the buffer to a temporary file to give to Whisper
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
                    temp_audio.write(audio_buffer)
                    temp_audio_path = temp_audio.name
                
                # Reset buffer immediately for next phrase
                audio_buffer = bytearray()
                
                try:
                    logger.info("Transcribing audio...")
                    with open(temp_audio_path, "rb") as f:
                        transcript_resp = await client.audio.transcriptions.create(
                            model="whisper-1",
                            file=f,
                            response_format="text"
                        )
                    transcript_text = transcript_resp.strip()
                    logger.info(f"User transcript: {transcript_text}")
                    
                    if not transcript_text:
                        continue # Silence or noise
                        
                    # 2. Send transcript back to UI instantly
                    await websocket.send_json({
                        "type": "user_transcript",
                        "text": transcript_text
                    })
                    
                    # 3. Process with RAG Pipeline
                    logger.info("Processing RAG pipeline...")
                    llm_response = rag_pipeline.analyze_document(
                        query=transcript_text,
                        user_id="live_user",
                        session_id=session_id,
                        language=language,
                        stream=False
                    )
                    
                    # 4. Generate Speech with ElevenLabs
                    logger.info("Generating ElevenLabs speech...")
                    audio_generator = elevenlabs_service.generate_speech(llm_response)
                    
                    # 5. Stream TTS audio chunks back to the client
                    for audio_chunk in audio_generator:
                        chunk_b64 = base64.b64encode(audio_chunk).decode('utf-8')
                        # Check if connection is still alive before sending
                        if session_id in active_connections:
                            await websocket.send_json({
                                "type": "audio_stream",
                                "data": chunk_b64
                            })
                            
                    # 6. Send final AI transcript
                    if session_id in active_connections:
                        await websocket.send_json({
                            "type": "ai_transcript",
                            "text": llm_response
                        })
                        
                except Exception as e:
                    logger.error(f"Error processing voice turn: {e}")
                    await websocket.send_json({"type": "error", "message": str(e)})
                    
                finally:
                    # Clean up temp file
                    if os.path.exists(temp_audio_path):
                        os.remove(temp_audio_path)
            
            elif msg_type == "interrupt":
                # User started speaking over the AI.
                audio_buffer = bytearray()
                logger.info(f"Session {session_id} interrupted.")
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    finally:
        active_connections.pop(session_id, None)
