"""
Semantic search service using ChromaDB vector search.

Uses sentence-transformers to encode natural language queries and ChromaDB
for vector similarity search over the movie catalog.
"""
import logging
from typing import Any

from sentence_transformers import SentenceTransformer
from ml.embeddings.store import EmbeddingStore

logger = logging.getLogger(__name__)


class SemanticSearchService:
    """
    Service for semantic search over movies using ChromaDB vector search.

    Encodes natural language queries with sentence-transformers and performs
    cosine similarity search over movie embeddings.
    """

    def __init__(self, embedding_store: EmbeddingStore):
        """
        Initialize the semantic search service.

        The SentenceTransformer model is loaded here. On Railway cold starts the
        ~90MB HuggingFace download can time out — if that happens we log the
        failure and set self.model = None so the process can still boot. The
        search() method then returns an empty list instead of raising.
        """
        self.embedding_store = embedding_store
        self.model = None
        try:
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Loaded SentenceTransformer model: all-MiniLM-L6-v2")
        except Exception as e:
            logger.error(
                f"Failed to load SentenceTransformer model (semantic search will be disabled): {e}"
            )
            # DO NOT re-raise — boot must continue so /recommendations and /health still work.

    def search(self, query: str, top_n: int = 10) -> list[dict[str, Any]]:
        """
        Search for movies using natural language query.

        Args:
            query: Natural language search query
            top_n: Number of results to return (default 10)

        Returns:
            List of dicts with keys: movie_id, title, year, genres, distance
            Results are sorted by cosine similarity (closest first)
        """
        if self.model is None:
            logger.warning("Semantic search requested but model is not loaded; returning empty results.")
            return []

        try:
            # Encode the query text into an embedding vector
            query_embedding = self.model.encode(query, convert_to_numpy=True).tolist()

            # Query ChromaDB for similar movies
            results = self.embedding_store.query_similar(
                query_embedding=query_embedding,
                n_results=top_n
            )

            # Transform results into API response format
            movies = []
            for result in results:
                movies.append({
                    "movie_id": int(result["id"]),
                    "title": result["metadata"]["title"],
                    "year": result["metadata"]["year"],
                    "genres": result["metadata"]["genres"],
                    "distance": result["distance"]
                })

            logger.info(f"Semantic search for '{query}' returned {len(movies)} results")
            return movies

        except Exception as e:
            logger.error(f"Failed to perform semantic search: {e}")
            raise
