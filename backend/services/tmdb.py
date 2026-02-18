import httpx
from typing import Dict, Any, Optional
from config import settings

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"


class TMDBService:
    """Service for interacting with The Movie Database (TMDB) API."""

    @staticmethod
    def get_image_url(path: Optional[str], size: str = "w500") -> str:
        """
        Build full TMDB image URL.

        Args:
            path: Image path from TMDB API (e.g., "/abc123.jpg")
            size: Image size (w92, w154, w185, w342, w500, w780, original)

        Returns:
            Full image URL or placeholder if path is None
        """
        if not path:
            return "https://via.placeholder.com/500x750?text=No+Image"
        return f"{TMDB_IMAGE_BASE}/{size}{path}"

    async def get_popular(self, page: int = 1) -> Dict[str, Any]:
        """
        Fetch popular movies from TMDB.

        Args:
            page: Page number for pagination

        Returns:
            TMDB API response with popular movies

        Raises:
            httpx.HTTPStatusError: If API request fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TMDB_BASE_URL}/movie/popular",
                params={
                    "api_key": settings.tmdb_api_key,
                    "page": page
                }
            )
            response.raise_for_status()
            return response.json()

    async def search_movies(self, query: str, page: int = 1) -> Dict[str, Any]:
        """
        Search for movies on TMDB.

        Args:
            query: Search query string
            page: Page number for pagination

        Returns:
            TMDB API response with search results

        Raises:
            httpx.HTTPStatusError: If API request fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TMDB_BASE_URL}/search/movie",
                params={
                    "api_key": settings.tmdb_api_key,
                    "query": query,
                    "page": page
                }
            )
            response.raise_for_status()
            return response.json()

    async def discover_by_genre(self, genre_id: int, page: int = 1) -> Dict[str, Any]:
        """
        Fetch movies by genre using TMDB discover endpoint.

        Args:
            genre_id: TMDB genre ID (e.g., 28 for Action, 878 for Sci-Fi)
            page: Page number for pagination

        Returns:
            TMDB API response with movies in the given genre

        Raises:
            httpx.HTTPStatusError: If API request fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TMDB_BASE_URL}/discover/movie",
                params={
                    "api_key": settings.tmdb_api_key,
                    "with_genres": genre_id,
                    "sort_by": "popularity.desc",
                    "page": page,
                }
            )
            response.raise_for_status()
            return response.json()

    async def get_movie_details(self, movie_id: int) -> Dict[str, Any]:
        """
        Fetch detailed information about a specific movie.

        Args:
            movie_id: TMDB movie ID

        Returns:
            TMDB API response with movie details, credits, and videos

        Raises:
            httpx.HTTPStatusError: If API request fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TMDB_BASE_URL}/movie/{movie_id}",
                params={
                    "api_key": settings.tmdb_api_key,
                    "append_to_response": "credits,videos"
                }
            )
            response.raise_for_status()
            return response.json()
