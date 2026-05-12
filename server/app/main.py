"""
VogueFrame AI — FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

from app.core.config import settings
from app.db.session import init_db
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""
    # Ensure uploads directory exists on startup
    os.makedirs(os.path.join(os.path.dirname(__file__), "../uploads"), exist_ok=True)
    init_db()
    yield


app = FastAPI(
    title="VogueFrame AI",
    description="AI-powered outfit image generation backend — Nano Banana Engine (Imagen 4) + FastAPI",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

# Mount local uploads directory for serving static images locally without Cloudinary
app.mount("/uploads", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "../uploads")), name="uploads")


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "vogueframe-ai"}
