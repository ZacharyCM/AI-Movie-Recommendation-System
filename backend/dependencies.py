"""
Shared service instances for dependency injection.

Avoids circular imports by providing a central location for service instances.
"""
from services.recommender import RecommenderService
from services.semantic_search import SemanticSearchService
from ml.embeddings.store import EmbeddingStore

# Create recommender service instance
recommender_service = RecommenderService()

# Create embedding store and semantic search service instances
# These are initialized at import time but models loaded in lifespan
embedding_store = EmbeddingStore()
semantic_search_service = SemanticSearchService(embedding_store)


def get_recommender_service() -> RecommenderService:
    """Get the global recommender service instance."""
    return recommender_service


def get_semantic_search_service() -> SemanticSearchService:
    """Get the global semantic search service instance."""
    return semantic_search_service


def get_embedding_store() -> EmbeddingStore:
    """Get the global embedding store instance."""
    return embedding_store
