from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from services.recommender import RecommenderService

# Create recommender service instance
recommender_service = RecommenderService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup/shutdown."""
    # Startup: Load recommender model
    recommender_service.load_model("ml/models")
    yield
    # Shutdown: cleanup handled by garbage collection


app = FastAPI(title="Netflix Recommendations API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from routers.movies import router as movies_router
from routers.recommendations import router as recommendations_router

app.include_router(movies_router)
app.include_router(recommendations_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
