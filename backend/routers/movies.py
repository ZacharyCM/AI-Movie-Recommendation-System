import httpx
from fastapi import APIRouter, HTTPException, Query

from schemas.movie import (
    MovieDetailResponse,
    PaginatedMovieResponse,
)
from services.tmdb import TMDBService

router = APIRouter(prefix="/api/movies", tags=["movies"])

tmdb_service = TMDBService()


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
