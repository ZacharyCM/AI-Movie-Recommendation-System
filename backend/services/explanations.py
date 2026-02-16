"""
AI-powered explanation service using RAG pipeline.

Implements retrieval-augmented generation for personalized recommendation
explanations: ChromaDB retrieval + Claude generation + PostgreSQL caching.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Any

from anthropic import AsyncAnthropic
from supabase import create_client, Client

from config import settings
from ml.embeddings.store import EmbeddingStore
from services.tmdb import TMDBService

logger = logging.getLogger(__name__)

# Required Supabase table schema (self-bootstrapping on init)
TABLE_SCHEMA = """
CREATE TABLE IF NOT EXISTS ai_explanations (
  user_id UUID NOT NULL,
  movie_id INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  factors TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  PRIMARY KEY (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_explanations_expires ON ai_explanations(expires_at);
"""


class ExplanationService:
    """
    Service for generating AI-powered recommendation explanations.

    Uses a RAG pipeline:
    1. Check cache (Supabase)
    2. Retrieve context (user ratings, embeddings, metadata)
    3. Augment with structured prompt
    4. Generate explanation with Claude
    5. Cache result for 7 days
    """

    def __init__(self):
        """Initialize the explanation service."""
        # Supabase client for cache and user data
        self.supabase: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )

        # Claude API client
        self.anthropic_client = AsyncAnthropic(
            api_key=settings.anthropic_api_key
        ) if settings.anthropic_api_key else None

        # Embedding store for similarity retrieval
        self.embedding_store = EmbeddingStore()

        # TMDB service for movie metadata
        self.tmdb_service = TMDBService()

        # Bootstrap table on init
        self._create_table_if_not_exists()

        logger.info("ExplanationService initialized")

    def _create_table_if_not_exists(self) -> None:
        """Create ai_explanations table if it doesn't exist."""
        try:
            # Use raw SQL via service role client
            self.supabase.postgrest.schema("public").rpc(
                "exec",
                {"sql": TABLE_SCHEMA}
            )
            logger.info("ai_explanations table ready")
        except Exception as e:
            # Table might already exist or exec RPC might not be available
            # This is non-critical - table can be created manually
            logger.warning(f"Could not auto-create table (may already exist): {e}")

    async def get_explanation(
        self,
        user_id: str,
        movie_id: int
    ) -> dict[str, Any]:
        """
        Get or generate explanation for a recommendation.

        Implements full RAG pipeline with 7-day caching.

        Args:
            user_id: User UUID
            movie_id: TMDB movie ID

        Returns:
            Dict with keys: movie_id, explanation, factors, cached
        """
        # 1. CACHE CHECK
        cached_result = self._check_cache(user_id, movie_id)
        if cached_result:
            logger.info(f"Cache hit for user {user_id}, movie {movie_id}")
            return cached_result

        logger.info(f"Cache miss for user {user_id}, movie {movie_id} - generating explanation")

        # 2. RETRIEVAL: Gather context for Claude
        try:
            context = await self._retrieve_context(user_id, movie_id)
        except Exception as e:
            logger.error(f"Context retrieval failed: {e}")
            return self._fallback_explanation(movie_id, context=None)

        # 3. AUGMENTATION + 4. GENERATION
        try:
            explanation_data = await self._generate_explanation(context)
        except Exception as e:
            logger.error(f"Claude generation failed: {e}")
            return self._fallback_explanation(movie_id, context)

        # 5. CACHE STORE
        result = {
            "movie_id": movie_id,
            "explanation": explanation_data["explanation"],
            "factors": explanation_data["factors"],
            "cached": False
        }

        self._store_cache(user_id, movie_id, result)

        return result

    def _check_cache(self, user_id: str, movie_id: int) -> dict[str, Any] | None:
        """
        Check cache for existing explanation.

        Returns:
            Cached explanation dict or None if not found/expired
        """
        try:
            response = self.supabase.table("ai_explanations").select("*").eq(
                "user_id", user_id
            ).eq(
                "movie_id", movie_id
            ).execute()

            if not response.data or len(response.data) == 0:
                return None

            cached = response.data[0]

            # Check expiration
            expires_at = datetime.fromisoformat(cached["expires_at"].replace("Z", "+00:00"))
            if datetime.now(expires_at.tzinfo) > expires_at:
                logger.info("Cached explanation expired")
                return None

            return {
                "movie_id": movie_id,
                "explanation": cached["explanation"],
                "factors": cached["factors"],
                "cached": True
            }

        except Exception as e:
            logger.error(f"Cache check failed: {e}")
            return None

    async def _retrieve_context(
        self,
        user_id: str,
        movie_id: int
    ) -> dict[str, Any]:
        """
        Retrieve all context needed for explanation generation.

        Returns:
            Dict with user_ratings, recommended_movie, similar_movies, strategy
        """
        context = {}

        # Fetch user's top-rated movies
        try:
            ratings_response = self.supabase.table("ratings").select(
                "movie_id, rating"
            ).eq(
                "user_id", user_id
            ).order(
                "rating", desc=True
            ).limit(10).execute()

            user_ratings = ratings_response.data if ratings_response.data else []

            # Enrich with TMDB metadata
            enriched_ratings = []
            for rating in user_ratings:
                try:
                    movie_data = await self.tmdb_service.get_movie_details(rating["movie_id"])
                    enriched_ratings.append({
                        "title": movie_data.get("title", "Unknown"),
                        "year": movie_data.get("release_date", "")[:4] if movie_data.get("release_date") else "",
                        "genres": ", ".join(g["name"] for g in movie_data.get("genres", [])),
                        "rating": rating["rating"]
                    })
                except Exception as e:
                    logger.warning(f"Failed to fetch metadata for movie {rating['movie_id']}: {e}")

            context["user_ratings"] = enriched_ratings

        except Exception as e:
            logger.error(f"Failed to fetch user ratings: {e}")
            context["user_ratings"] = []

        # Fetch recommended movie metadata
        try:
            movie_data = await self.tmdb_service.get_movie_details(movie_id)
            context["recommended_movie"] = {
                "title": movie_data.get("title", "Unknown"),
                "year": movie_data.get("release_date", "")[:4] if movie_data.get("release_date") else "",
                "overview": movie_data.get("overview", ""),
                "genres": ", ".join(g["name"] for g in movie_data.get("genres", [])),
                "director": self._extract_director(movie_data)
            }
        except Exception as e:
            logger.error(f"Failed to fetch recommended movie metadata: {e}")
            context["recommended_movie"] = {"title": "Unknown", "year": "", "overview": "", "genres": "", "director": ""}

        # Query ChromaDB for similar movies
        try:
            # Get embedding for the recommended movie
            movie_results = self.embedding_store.get_by_ids([str(movie_id)])
            if movie_results["embeddings"] and len(movie_results["embeddings"]) > 0:
                query_embedding = movie_results["embeddings"][0]

                # Find similar movies
                similar = self.embedding_store.query_similar(query_embedding, n_results=4)

                # Exclude the query movie itself and take top 3
                similar_movies = []
                for item in similar:
                    if item["id"] != str(movie_id):
                        similar_movies.append({
                            "title": item["metadata"].get("title", "Unknown"),
                            "year": item["metadata"].get("year", ""),
                            "genres": item["metadata"].get("genres", "")
                        })
                        if len(similar_movies) >= 3:
                            break

                context["similar_movies"] = similar_movies
            else:
                context["similar_movies"] = []

        except Exception as e:
            logger.warning(f"ChromaDB query failed: {e}")
            context["similar_movies"] = []

        # Determine recommendation strategy
        # This is a simplified version - in production, would track actual strategy used
        total_ratings = len(user_ratings)
        if total_ratings < 5:
            context["strategy"] = "popularity"
        elif total_ratings < 20:
            context["strategy"] = "content-based"
        else:
            context["strategy"] = "hybrid (content + collaborative filtering)"

        return context

    def _extract_director(self, movie_data: dict[str, Any]) -> str:
        """Extract director name from TMDB movie data."""
        try:
            crew = movie_data.get("credits", {}).get("crew", [])
            for person in crew:
                if person.get("job") == "Director":
                    return person.get("name", "")
            return ""
        except Exception:
            return ""

    async def _generate_explanation(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Generate explanation using Claude.

        Args:
            context: Retrieved context with user_ratings, recommended_movie, etc.

        Returns:
            Dict with explanation and factors
        """
        if not self.anthropic_client:
            raise ValueError("Anthropic API key not configured")

        # Build structured prompt
        prompt = self._build_prompt(context)

        # Call Claude API
        response = await self.anthropic_client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=400,
            temperature=0.7,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        # Parse JSON response
        try:
            response_text = response.content[0].text
            # Try to parse as JSON
            result = json.loads(response_text)
            return {
                "explanation": result.get("explanation", response_text),
                "factors": result.get("factors", ["content_similarity"])
            }
        except json.JSONDecodeError:
            # If not valid JSON, wrap in default structure
            logger.warning("Claude returned non-JSON response, using raw text")
            return {
                "explanation": response.content[0].text,
                "factors": ["content_similarity"]
            }

    def _build_prompt(self, context: dict[str, Any]) -> str:
        """Build structured prompt for Claude."""
        user_ratings = context.get("user_ratings", [])
        recommended = context.get("recommended_movie", {})
        similar = context.get("similar_movies", [])
        strategy = context.get("strategy", "content-based")

        # Format user taste section
        taste_section = "\n".join([
            f"- {r['title']} ({r['year']}) - {r['genres']} - rated {r['rating']}/5"
            for r in user_ratings
        ])

        # Format similar movies section
        similar_section = "\n".join([
            f"- {m['title']} ({m['year']}) - {m['genres']}"
            for m in similar
        ])

        prompt = f"""You are a movie recommendation assistant. Explain WHY this user will enjoy the recommended movie.

<user_taste>
Movies they loved (rated 4-5 stars):
{taste_section if taste_section else "- (Not enough ratings yet)"}
</user_taste>

<recommended_movie>
{recommended['title']} ({recommended['year']})
{recommended['overview']}
Genres: {recommended['genres']}
Director: {recommended['director']}
</recommended_movie>

<similar_movies_in_catalog>
Movies similar to the recommendation:
{similar_section if similar_section else "- (None available)"}
</similar_movies_in_catalog>

<recommendation_context>
This movie was recommended via {strategy} algorithm.
</recommendation_context>

Generate a 2-3 sentence explanation connecting the recommended movie to their taste.
Rules:
- Reference specific movies they rated highly by name
- Mention shared genres, themes, directors, or cast
- If collaborative filtering was used, mention "users with similar taste also enjoyed..."
- Be conversational and natural, like a friend recommending a movie
- ONLY reference movies listed above. NEVER mention movies not in the provided context.
- Output valid JSON: {{"explanation": "...", "factors": ["content_similarity", ...]}}

Valid factors: "content_similarity", "collaborative_filtering", "genre_match", "director_match", "thematic_similarity"
"""

        return prompt

    def _fallback_explanation(
        self,
        movie_id: int,
        context: dict[str, Any] | None
    ) -> dict[str, Any]:
        """
        Generate graceful fallback explanation when Claude API fails.

        Args:
            movie_id: Movie ID
            context: Retrieved context (may be None)

        Returns:
            Dict with fallback explanation
        """
        if context and context.get("recommended_movie"):
            genres = context["recommended_movie"].get("genres", "various genres")
            explanation = f"This movie was recommended based on your taste for {genres}."
        else:
            explanation = "This movie was recommended based on your viewing history and preferences."

        return {
            "movie_id": movie_id,
            "explanation": explanation,
            "factors": ["content_similarity"],
            "cached": False
        }

    def _store_cache(
        self,
        user_id: str,
        movie_id: int,
        result: dict[str, Any]
    ) -> None:
        """
        Store explanation in cache.

        Args:
            user_id: User UUID
            movie_id: Movie ID
            result: Explanation result to cache
        """
        try:
            self.supabase.table("ai_explanations").upsert({
                "user_id": user_id,
                "movie_id": movie_id,
                "explanation": result["explanation"],
                "factors": result["factors"],
                "generated_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat()
            }).execute()

            logger.info(f"Cached explanation for user {user_id}, movie {movie_id}")

        except Exception as e:
            # Non-critical error - explanation still returned to user
            logger.error(f"Failed to cache explanation: {e}")
