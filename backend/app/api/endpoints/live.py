"""
Live mode endpoints and WebSocket handlers.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter()

# Store active connections
active_connections: Dict[str, WebSocket] = {}


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for live mode interactions."""
    await websocket.accept()
    active_connections[client_id] = websocket
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Process different message types
            if message["type"] == "voice_chunk":
                # TODO: Process voice data
                response = {
                    "type": "ai_response",
                    "content": "Mock AI voice response",
                    "audio_url": None
                }
            elif message["type"] == "camera_capture":
                # TODO: Process camera image
                response = {
                    "type": "ai_response", 
                    "content": "Mock AI image analysis response",
                    "risk_assessment": {
                        "level": "medium",
                        "explanation": "Document analysis in progress..."
                    }
                }
            else:
                response = {
                    "type": "error",
                    "message": "Unknown message type"
                }
            
            # Send response back to client
            await websocket.send_text(json.dumps(response))
            
    except WebSocketDisconnect:
        if client_id in active_connections:
            del active_connections[client_id]


@router.get("/status")
async def live_status():
    """Get live mode service status."""
    return {
        "status": "active",
        "active_connections": len(active_connections)
    }