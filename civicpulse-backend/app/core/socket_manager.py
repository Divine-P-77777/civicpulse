import socketio
from typing import Optional

class SocketManager:
    def __init__(self):
        self.sio = socketio.AsyncServer(
            async_mode='asgi',
            cors_allowed_origins=[], # Disable internal CORS headers to avoid duplication with FastAPI
            logger=True,
            engineio_logger=True
        )
        self.app = socketio.ASGIApp(self.sio)
        self.setup_handlers()

    def setup_handlers(self):
        @self.sio.event
        async def connect(sid, environ):
            print(f"Client connected: {sid}")

        @self.sio.event
        async def disconnect(sid):
            print(f"Client disconnected: {sid}")

        @self.sio.on("join_session")
        async def handle_join(sid, data):
            session_id = data.get("sessionId")
            if session_id:
                self.sio.enter_room(sid, session_id)
                print(f"Client {sid} joined room: {session_id}")

        @self.sio.on("voice_chunk")
        async def handle_voice(sid, data):
            session_id = data.get("sessionId")
            if session_id:
                # Broadcast back to the room (or handle as needed)
                await self.sio.emit("voice_received", data, room=session_id, skip_sid=sid)

        @self.sio.on("camera_capture")
        async def handle_camera(sid, data):
            session_id = data.get("sessionId")
            if session_id:
                await self.sio.emit("camera_received", data, room=session_id, skip_sid=sid)

    async def emit_progress(self, progress: int, message: str, sid: Optional[str] = None):
        """Emits ingestion progress to a specific socket ID."""
        if sid:
            await self.sio.emit("ingestion_progress", {
                "progress": progress,
                "message": message
            }, to=sid)

# Singleton instance
socket_manager = SocketManager()
socket_app = socket_manager.app
