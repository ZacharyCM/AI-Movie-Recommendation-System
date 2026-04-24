from dotenv import load_dotenv

load_dotenv()

from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from dependencies import recommender_service

_MODEL_DIR = str(Path(__file__).parent / "ml" / "models")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup/shutdown."""
    # Startup: Load recommender models
    recommender_service.load_model(_MODEL_DIR)
    recommender_service.load_collaborative_model(_MODEL_DIR)

    # Log model status
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Content-based model loaded: {recommender_service.is_loaded()}")
    logger.info(f"Collaborative filtering model loaded: {recommender_service.is_collaborative_loaded()}")

    # Semantic search service is initialized in dependencies.py
    # SentenceTransformer model loads on first import (cached for subsequent requests)
    from dependencies import semantic_search_service, embedding_store
    logger.info(f"Semantic search initialized with {embedding_store.count()} movie embeddings")

    yield
    # Shutdown: cleanup handled by garbage collection


app = FastAPI(title="Netflix Recommendations API", lifespan=lifespan, redirect_slashes=False)

# Configure CORS
allowed_origins = [settings.frontend_url]
if settings.frontend_url and not settings.frontend_url.startswith("http://localhost"):
    # Also allow www subdomain
    allowed_origins.append(settings.frontend_url.replace("https://", "https://www."))
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from routers.movies import router as movies_router
from routers.recommendations import router as recommendations_router
from routers.search import router as search_router

app.include_router(movies_router)
app.include_router(recommendations_router)
app.include_router(search_router)


@app.get("/health")
async def health_check():
    """
    Health check endpoint.

    Reports model load state so Railway and smoke tests can confirm that
    ML-01 (boot succeeded) and ML-03 (model files present) are satisfied
    without needing an authenticated /recommendations call.
    """
    return {
        "status": "ok",
        "content_model_loaded": recommender_service.is_loaded(),
        "collaborative_model_loaded": recommender_service.is_collaborative_loaded(),
    }
