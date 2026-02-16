"""
Recommender service for content-based movie recommendations.

Uses pre-computed TF-IDF matrix and user rating profiles to generate
personalized recommendations via cosine similarity.
"""
import joblib
import numpy as np
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class RecommenderService:
    """
    Content-based recommender using TF-IDF and cosine similarity.

    Loads pre-trained TF-IDF model and computes recommendations based on
    user's highly-rated movies.
    """

    def __init__(self):
        """Initialize with empty state."""
        self.vectorizer = None
        self.tfidf_matrix = None
        self.movie_ids = None
        self.movie_id_to_index = None

    def load_model(self, model_dir: str) -> None:
        """
        Load TF-IDF model artifacts from disk.

        Args:
            model_dir: Directory containing .pkl files

        Raises:
            FileNotFoundError: If model files don't exist
        """
        model_path = Path(model_dir)

        vectorizer_path = model_path / "tfidf_vectorizer.pkl"
        matrix_path = model_path / "tfidf_matrix.pkl"
        ids_path = model_path / "movie_ids.pkl"

        # Check if all files exist
        if not all([vectorizer_path.exists(), matrix_path.exists(), ids_path.exists()]):
            logger.warning(
                f"Model files not found in {model_dir}. "
                "Recommender will not be available until model is built."
            )
            return

        try:
            self.vectorizer = joblib.load(vectorizer_path)
            self.tfidf_matrix = joblib.load(matrix_path)
            self.movie_ids = joblib.load(ids_path)

            # Build index mapping for fast lookup
            self.movie_id_to_index = {
                movie_id: idx for idx, movie_id in enumerate(self.movie_ids)
            }

            logger.info(
                f"Recommender model loaded successfully. "
                f"Matrix shape: {self.tfidf_matrix.shape}"
            )

        except Exception as e:
            logger.error(f"Error loading model: {e}")
            # Reset to None on error
            self.vectorizer = None
            self.tfidf_matrix = None
            self.movie_ids = None
            self.movie_id_to_index = None

    def is_loaded(self) -> bool:
        """
        Check if model is loaded and ready.

        Returns:
            True if model is loaded, False otherwise
        """
        return all([
            self.vectorizer is not None,
            self.tfidf_matrix is not None,
            self.movie_ids is not None,
            self.movie_id_to_index is not None
        ])

    def build_user_profile(self, ratings: list[dict]) -> Optional[np.ndarray]:
        """
        Build user taste profile from ratings.

        Uses only high ratings (>= 4.0) to build a weighted average
        of TF-IDF vectors representing user's preferred content.

        Args:
            ratings: List of {movie_id: int, rating: float} dicts

        Returns:
            User profile vector (sparse matrix) or None if no valid ratings
        """
        if not self.is_loaded():
            return None

        # Filter for high ratings only
        high_ratings = [r for r in ratings if r.get("rating", 0) >= 4.0]

        if not high_ratings:
            return None

        # Map movie IDs to matrix indices
        valid_indices = []
        valid_ratings = []

        for rating_record in high_ratings:
            movie_id = rating_record.get("movie_id")
            rating = rating_record.get("rating")

            if movie_id in self.movie_id_to_index:
                idx = self.movie_id_to_index[movie_id]
                valid_indices.append(idx)
                valid_ratings.append(rating)

        if not valid_indices:
            return None

        # Get TF-IDF vectors for rated movies (keep sparse)
        rated_vectors = self.tfidf_matrix[valid_indices]

        # Compute weighted average (normalize by sum of weights)
        weights = np.array(valid_ratings)
        weighted_sum = rated_vectors.T.dot(weights)
        user_profile = weighted_sum / weights.sum()

        return user_profile.T

    def get_recommendations(
        self,
        ratings: list[dict],
        top_n: int = 10
    ) -> list[dict]:
        """
        Get personalized recommendations for a user.

        Args:
            ratings: List of {movie_id: int, rating: float} dicts
            top_n: Number of recommendations to return

        Returns:
            List of {movie_id: int, score: float} dicts, sorted by score descending
        """
        if not self.is_loaded():
            return []

        # Build user profile
        user_profile = self.build_user_profile(ratings)

        if user_profile is None:
            return []

        # Compute cosine similarity against all movies
        similarities = cosine_similarity(user_profile, self.tfidf_matrix)
        similarity_scores = similarities.flatten()

        # Get already-rated movie IDs to exclude
        rated_movie_ids = {r.get("movie_id") for r in ratings}

        # Build list of (movie_id, score) tuples, excluding rated movies
        candidates = []
        for idx, score in enumerate(similarity_scores):
            movie_id = self.movie_ids[idx]
            if movie_id not in rated_movie_ids:
                candidates.append({"movie_id": movie_id, "score": float(score)})

        # Sort by score descending and return top N
        candidates.sort(key=lambda x: x["score"], reverse=True)

        return candidates[:top_n]

    def get_popular_fallback(self, top_n: int = 10) -> list[int]:
        """
        Get popular movies as fallback for cold-start users.

        Returns the first N movies from the corpus (which are already
        sorted by TMDB popularity).

        Args:
            top_n: Number of movies to return

        Returns:
            List of movie IDs
        """
        if not self.is_loaded():
            return []

        return self.movie_ids[:top_n]
