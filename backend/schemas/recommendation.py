"""Pydantic schemas for recommendation responses."""
from pydantic import BaseModel


class RecommendationResponse(BaseModel):
    """Individual recommendation with movie details and score."""

    movie_id: int
    title: str
    poster_path: str | None
    overview: str
    vote_average: float
    release_date: str
    score: float  # similarity/hybrid score (0-1)
    reason: str  # "content_based", "popular", "hybrid_content_heavy", or "hybrid_collaborative_heavy"


class RecommendationListResponse(BaseModel):
    """List of recommendations with strategy metadata."""

    recommendations: list[RecommendationResponse]
    strategy: str  # "content_based", "popularity_fallback", "hybrid_content_heavy", or "hybrid_collaborative_heavy"
    total_ratings: int  # how many ratings user has


class ExplanationResponse(BaseModel):
    """AI-generated explanation for a recommendation."""

    movie_id: int
    explanation: str
    factors: list[str]  # e.g., ["content_similarity", "collaborative_filtering"]
    cached: bool  # whether this was served from cache
