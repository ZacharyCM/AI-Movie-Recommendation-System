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
    score: float  # cosine similarity score (0-1)
    reason: str  # "content_based" or "popular"


class RecommendationListResponse(BaseModel):
    """List of recommendations with strategy metadata."""

    recommendations: list[RecommendationResponse]
    strategy: str  # "content_based" or "popularity_fallback"
    total_ratings: int  # how many ratings user has
