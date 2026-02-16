"""
Search API endpoints for natural language movie search.

Provides semantic search endpoint using ChromaDB vector search.
"""
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field
from dependencies import get_semantic_search_service

router = APIRouter(prefix="/api/search", tags=["search"])


class SemanticSearchResult(BaseModel):
    """Single search result."""
    movie_id: int
    title: str
    year: str
    genres: str
    score: float = Field(..., description="Similarity score (0-1, higher is better)")


class SemanticSearchResponse(BaseModel):
    """Response for semantic search endpoint."""
    results: list[SemanticSearchResult]
    query: str


@router.get("/semantic", response_model=SemanticSearchResponse)
async def search_semantic(
    q: str = Query(..., min_length=2, description="Natural language search query"),
    top_n: int = Query(10, ge=1, le=30, description="Number of results to return")
):
    """
    Search for movies using natural language queries.

    No authentication required - search is public like movie browse.

    Examples:
    - "dark thriller like Zodiac"
    - "romantic comedy set in new york"
    - "sci-fi adventure with space travel"

    Returns movies ranked by semantic similarity to the query.
    """
    try:
        # Get semantic search service
        search_service = get_semantic_search_service()

        # Perform semantic search
        results = search_service.search(query=q, top_n=top_n)

        # Convert distance to similarity score (1 - distance)
        # ChromaDB cosine distance is in [0, 2] range
        # Score of 1.0 = perfect match, 0.0 = opposite
        search_results = [
            SemanticSearchResult(
                movie_id=r["movie_id"],
                title=r["title"],
                year=r["year"],
                genres=r["genres"],
                score=max(0.0, 1.0 - r["distance"])  # Convert distance to similarity
            )
            for r in results
        ]

        return SemanticSearchResponse(
            results=search_results,
            query=q
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
