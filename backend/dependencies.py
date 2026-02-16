"""
Shared service instances for dependency injection.

Avoids circular imports by providing a central location for service instances.
"""
from services.recommender import RecommenderService

# Create recommender service instance
recommender_service = RecommenderService()


def get_recommender_service() -> RecommenderService:
    """Get the global recommender service instance."""
    return recommender_service
