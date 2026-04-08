from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from app.routes import upload, analyze, admin, live, drafts, user
from app.routes import chat
from app.services.chat_service import ensure_table_exists
from app.services.profile_service import ensure_profile_table
import traceback
import logging

logger = logging.getLogger("civicpulse.main")

app = FastAPI(
    title="CivicPulse Backend",
    description="AI-powered legal rights assistant API",
    version="1.0.0"
)

# ─── CORS Middleware ───
ALLOWED_ORIGINS = [
    "https://civicpulse-pro.vercel.app",
    "https://civicpulse.pro",
    "https://www.civicpulse.pro",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Specifically allow Vercel previews and production domains
ORIGIN_REGEX = r"https://civicpulse-pro.*\.vercel\.app"

class CustomCORSMiddleware(CORSMiddleware):
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
            origin = headers.get("origin")
            if origin:
                logger.info(f"CORS Check: Origin={origin} Path={scope['path']} Method={scope.get('method')}")
                
        # Skip CORS headers for socket.io paths - let socketio server handle it internally
        if scope["type"] in ("http", "websocket") and scope["path"].startswith("/socket.io"):
            await self.app(scope, receive, send)
            return
        await super().__call__(scope, receive, send)

app.add_middleware(
    CustomCORSMiddleware,
    allow_origins=["*"] if os.getenv("DEBUG_CORS") == "true" else ALLOWED_ORIGINS,
    allow_origin_regex=ORIGIN_REGEX,
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
app.include_router(drafts.router, prefix="/api")
app.include_router(user.router, prefix="/api")

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
        ensure_profile_table()
    except Exception as e:
        print(f"⚠️  Could not auto-create tables: {e}")

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
