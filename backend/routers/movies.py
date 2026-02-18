import random
from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, HTTPException, Query

from schemas.movie import (
    MovieDetailResponse,
    PaginatedMovieResponse,
)
from services.tmdb import TMDBService

router = APIRouter(prefix="/api/movies", tags=["movies"])

tmdb_service = TMDBService()

FEATURED_MOVIE_IDS = [
    27205,   # Inception
    157336,  # Interstellar
    155,     # The Dark Knight
    438631,  # Dune
    569094,  # Spider-Man: Across the Spider-Verse
    872585,  # Oppenheimer
]

# Mood to TMDB genre ID mapping (pipe-separated for OR logic)
MOOD_GENRE_MAP: Dict[str, str] = {
    "adventurous": "28|12",         # Action, Adventure
    "cozy": "18|10749|10751",       # Drama, Romance, Family
    "thrilling": "53|27|9648",      # Thriller, Horror, Mystery
    "mindblowing": "878|14",         # Science Fiction, Fantasy
    "funny": "35|10751",             # Comedy, Family
    "romantic": "10749|18",          # Romance, Drama
    "nostalgic": "16|10751|12",      # Animation, Family, Adventure
    "intense": "28|80|53",           # Action, Crime, Thriller
}

MOOD_LABELS: Dict[str, Dict[str, str]] = {
    "adventurous": {"label": "Adventurous", "emoji": "🗺️"},
    "cozy": {"label": "Something Cozy", "emoji": "☕"},
    "thrilling": {"label": "Edge of My Seat", "emoji": "😱"},
    "mindblowing": {"label": "Mind-Blowing", "emoji": "🤯"},
    "funny": {"label": "Make Me Laugh", "emoji": "😂"},
    "romantic": {"label": "Feeling Romantic", "emoji": "💕"},
    "nostalgic": {"label": "Feeling Nostalgic", "emoji": "✨"},
    "intense": {"label": "Something Intense", "emoji": "🔥"},
}


@router.get("/featured", response_model=MovieDetailResponse)
async def get_featured_movie():
    """Get a curated featured movie for the homepage hero section."""
    movie_id = random.choice(FEATURED_MOVIE_IDS)
    try:
        data = await tmdb_service.get_movie_details(movie_id=movie_id)
        return data
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="Failed to fetch featured movie from TMDB")


@router.get("", response_model=PaginatedMovieResponse)
async def get_popular_movies(page: int = Query(1, ge=1, le=500)):
    """Get popular movies from TMDB with pagination."""
    try:
        data = await tmdb_service.get_popular(page=page)
        return data
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="Failed to fetch movies from TMDB")


@router.get("/search", response_model=PaginatedMovieResponse)
async def search_movies(
    query: str = Query(..., min_length=1),
    page: int = Query(1, ge=1, le=500),
):
    """Search movies by title."""
    try:
        data = await tmdb_service.search_movies(query=query, page=page)
        return data
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="Failed to search movies from TMDB")


@router.get("/genre/{genre_id}", response_model=PaginatedMovieResponse)
async def get_movies_by_genre(
    genre_id: int,
    page: int = Query(1, ge=1, le=500),
):
    """Get movies by genre from TMDB discover endpoint."""
    try:
        data = await tmdb_service.discover_by_genre(genre_id=genre_id, page=page)
        return data
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="Failed to fetch movies by genre from TMDB")


@router.get("/moods", response_model=List[Dict[str, Any]])
async def get_available_moods():
    """Get available mood options with labels and emoji."""
    return [
        {"id": mood, "label": info["label"], "emoji": info["emoji"]}
        for mood, info in MOOD_LABELS.items()
    ]


@router.get("/mood/{mood}", response_model=PaginatedMovieResponse)
async def get_movies_by_mood(
    mood: str,
    page: int = Query(1, ge=1, le=500),
):
    """Get movies filtered by user mood via genre combinations."""
    if mood not in MOOD_GENRE_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown mood '{mood}'. Available moods: {list(MOOD_GENRE_MAP.keys())}"
        )
    genre_ids = MOOD_GENRE_MAP[mood]
    try:
        data = await tmdb_service.discover_by_genres(genre_ids=genre_ids, page=page)
        return data
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="Failed to fetch mood movies from TMDB")


@router.get("/{movie_id}", response_model=MovieDetailResponse)
async def get_movie_detail(movie_id: int):
    """Get detailed information about a specific movie."""
    try:
        data = await tmdb_service.get_movie_details(movie_id=movie_id)
        return data
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Movie not found")
        raise HTTPException(status_code=502, detail="Failed to fetch movie details from TMDB")
