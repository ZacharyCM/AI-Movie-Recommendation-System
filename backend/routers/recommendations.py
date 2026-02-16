"""
Recommendations API endpoint.

Provides personalized movie recommendations based on user ratings using
content-based filtering (TF-IDF + cosine similarity).
"""
import asyncio
from fastapi import APIRouter, HTTPException, Header, Query
from supabase import create_client
from config import settings
from services.tmdb import TMDBService
from schemas.recommendation import RecommendationResponse, RecommendationListResponse
from main import recommender_service

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


async def get_current_user_id(authorization: str = Header(None)) -> str:
    """
    Extract and validate user ID from JWT token.

    Args:
        authorization: Bearer token from Authorization header

    Returns:
        User ID string

    Raises:
        HTTPException: 401 if token is missing or invalid
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    # Extract token from "Bearer {token}"
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    token = parts[1]

    # Validate token using Supabase admin client
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        return user_response.user.id

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")


@router.get("/", response_model=RecommendationListResponse)
async def get_recommendations(
    authorization: str = Header(None),
    top_n: int = Query(10, ge=1, le=50, description="Number of recommendations to return")
):
    """
    Get personalized movie recommendations.

    Users with 5+ ratings receive content-based recommendations.
    Users with < 5 ratings receive popularity fallback.

    Args:
        authorization: Bearer token
        top_n: Number of recommendations (1-50)

    Returns:
        RecommendationListResponse with recommendations, strategy, and rating count
    """
    # Authenticate user
    user_id = await get_current_user_id(authorization)

    # Check if recommender model is loaded
    if not recommender_service.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="Recommendation model not available. Please build the model first."
        )

    # Get user's ratings from Supabase
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
        response = supabase.table("ratings").select("movie_id, rating").eq("user_id", user_id).execute()
        ratings = response.data if response.data else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user ratings: {str(e)}")

    total_ratings = len(ratings)
    tmdb_service = TMDBService()

    # Strategy 1: Cold-start fallback (< 5 ratings)
    if total_ratings < 5:
        # Get popular movies as fallback
        popular_movie_ids = recommender_service.get_popular_fallback(top_n)

        # Fetch movie details from TMDB concurrently
        async def fetch_movie_for_popular(movie_id: int) -> RecommendationResponse | None:
            try:
                movie_data = await tmdb_service.get_movie_details(movie_id)
                return RecommendationResponse(
                    movie_id=movie_data["id"],
                    title=movie_data.get("title", ""),
                    poster_path=movie_data.get("poster_path"),
                    overview=movie_data.get("overview", ""),
                    vote_average=movie_data.get("vote_average", 0.0),
                    release_date=movie_data.get("release_date", ""),
                    score=0.0,  # No similarity score for popular fallback
                    reason="popular"
                )
            except Exception as e:
                print(f"Error fetching movie {movie_id}: {e}")
                return None

        # Fetch in batches to respect rate limits
        recommendations_list = []
        for movie_id in popular_movie_ids:
            rec = await fetch_movie_for_popular(movie_id)
            if rec:
                recommendations_list.append(rec)
            await asyncio.sleep(0.03)  # Small delay between requests

        return RecommendationListResponse(
            recommendations=recommendations_list,
            strategy="popularity_fallback",
            total_ratings=total_ratings
        )

    # Strategy 2: Content-based recommendations (5+ ratings)
    # Get recommendations from recommender service
    recommended_items = recommender_service.get_recommendations(ratings, top_n)

    # Fetch movie details from TMDB concurrently
    async def fetch_movie_for_recommendation(item: dict) -> RecommendationResponse | None:
        try:
            movie_id = item["movie_id"]
            score = item["score"]

            movie_data = await tmdb_service.get_movie_details(movie_id)
            return RecommendationResponse(
                movie_id=movie_data["id"],
                title=movie_data.get("title", ""),
                poster_path=movie_data.get("poster_path"),
                overview=movie_data.get("overview", ""),
                vote_average=movie_data.get("vote_average", 0.0),
                release_date=movie_data.get("release_date", ""),
                score=score,
                reason="content_based"
            )
        except Exception as e:
            print(f"Error fetching movie {item['movie_id']}: {e}")
            return None

    # Fetch movie details with rate limiting
    recommendations_list = []
    for item in recommended_items:
        rec = await fetch_movie_for_recommendation(item)
        if rec:
            recommendations_list.append(rec)
        await asyncio.sleep(0.03)  # Small delay between requests

    return RecommendationListResponse(
        recommendations=recommendations_list,
        strategy="content_based",
        total_ratings=total_ratings
    )
