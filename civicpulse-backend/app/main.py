from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from app.routes import upload, analyze, admin, live
from app.routes import chat
from app.services.chat_service import ensure_table_exists
import traceback

app = FastAPI(
    title="CivicPulse Backend",
    description="AI-powered legal rights assistant API",
    version="1.0.0"
)

# ─── CORS Middleware ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins including specific local network IPs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ───
app.include_router(live.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

# ─── Mount Socket.IO ───
# We need Socket.IO exclusively for Admin panel upload progress events
from app.core.socket_manager import socket_app
app.mount("/socket.io", socket_app)

# ─── Startup Event ───
@app.on_event("startup")
async def startup():
    """Ensure required DynamoDB tables exist on startup."""
    try:
        ensure_table_exists()
    except Exception as e:
        print(f"⚠️  Could not auto-create chat table: {e}")

# ─── Health Check ───
@app.get("/")
def read_root():
    return {"message": "Welcome to CivicPulse API"}

@app.get("/health")
async def health_check():
    return {
        "status": "ok", 
        "service": "civicpulse-backend", 
        "version": "1.0.0",
        "message": "Backend is running smoothly"
    }

# ─── Global Exception Handler ───
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred.",
            "error": str(exc)
        }
    )
