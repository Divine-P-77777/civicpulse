from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.rag_pipeline import rag_pipeline
from app.services.elevenlabs_service import elevenlabs_service
from pydantic import BaseModel

class QueryRequest(BaseModel):
    query: str
    stream: bool = False

router = APIRouter()

@router.post("/analyze")
async def analyze(request: QueryRequest):
    """
    Standard analysis endpoint. 
    Supports both blocking and streaming responses.
    """
    if request.stream:
        return StreamingResponse(
            rag_pipeline.analyze_document(request.query, stream=True),
            media_type="text/event-stream"
        )
    
    result = rag_pipeline.analyze_document(request.query)
    return {"analysis": result}

@router.post("/voice")
async def generate_voice(request: QueryRequest):
    """
    Live Mode: Generates speech for a given text query.
    """
    # First get the text analysis
    analysis_text = rag_pipeline.analyze_document(request.query)
    
    # Then generate audio
    audio_stream = elevenlabs_service.generate_speech(analysis_text)
    
    return StreamingResponse(audio_stream, media_type="audio/mpeg")
