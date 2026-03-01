from fastapi import FastAPI
from app.routes import upload, analyze, admin

app = FastAPI(title="CivicPulse Backend")

app.include_router(upload.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to CivicPulse API"}
