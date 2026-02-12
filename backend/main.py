from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

app = FastAPI(title="Netflix Recommendations API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from routers.movies import router as movies_router

app.include_router(movies_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
