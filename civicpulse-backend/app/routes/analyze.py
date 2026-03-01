from fastapi import APIRouter
from app.services.rag_pipeline import analyze_document
from pydantic import BaseModel

class QueryRequest(BaseModel):
    query: str

router = APIRouter()

@router.post("/analyze")
async def analyze(request: QueryRequest):
    result = analyze_document(request.query)
    return {"analysis": result}
