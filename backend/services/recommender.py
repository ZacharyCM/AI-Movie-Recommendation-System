"""
Recommender service for content-based movie recommendations.

Uses pre-computed TF-IDF matrix and user rating profiles to generate
personalized recommendations via cosine similarity.
"""
import joblib
import numpy as np
import random
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
        self.svd_model = None
        self.cf_trainset = None

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

        # Reshape to 2D (1, n_features) for cosine_similarity
        return user_profile.reshape(1, -1)

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

    def load_collaborative_model(self, model_dir: str) -> None:
        """
        Load collaborative filtering (SVD) model artifacts from disk.

        Args:
            model_dir: Directory containing .pkl files

        Note:
            Missing files are logged but don't raise errors - CF is optional.
        """
        model_path = Path(model_dir)

        svd_path = model_path / "svd_model.pkl"
        trainset_path = model_path / "cf_trainset.pkl"

        # Check if all files exist
        if not all([svd_path.exists(), trainset_path.exists()]):
            logger.warning(
                f"Collaborative filtering model files not found in {model_dir}. "
                "Hybrid recommendations will fall back to content-based only."
            )
            return

        try:
            self.svd_model = joblib.load(svd_path)
            self.cf_trainset = joblib.load(trainset_path)

            logger.info(
                f"Collaborative filtering model loaded successfully. "
                f"Trainset: {self.cf_trainset.n_users} users, "
                f"{self.cf_trainset.n_items} items"
            )

        except Exception as e:
            logger.error(f"Error loading collaborative model: {e}")
            # Reset to None on error
            self.svd_model = None
            self.cf_trainset = None

    def is_collaborative_loaded(self) -> bool:
        """
        Check if collaborative filtering model is loaded and ready.

        Returns:
            True if CF model is loaded, False otherwise
        """
        return self.svd_model is not None and self.cf_trainset is not None

    def calculate_alpha(self, user_rating_count: int) -> float:
        """
        Calculate alpha (CF weight) based on user rating count.

        Adaptive weighting strategy:
        - < 5 ratings: alpha = 0.0 (pure content-based / popularity)
        - 5-19 ratings: alpha = 0.0 to 0.3 (gradual transition)
        - 20+ ratings: alpha = 0.7 (collaborative-heavy)

        Args:
            user_rating_count: Number of ratings the user has

        Returns:
            Alpha value (0.0 to 0.7)
        """
        if user_rating_count < 5:
            return 0.0
        elif user_rating_count < 20:
            # Linear interpolation from 0.0 to 0.3
            return 0.3 * (user_rating_count - 5) / 15
        else:
            return 0.7

    def get_cf_scores(self, user_id: str, candidate_movie_ids: list[int]) -> dict[int, float]:
        """
        Get collaborative filtering scores for candidate movies.

        Args:
            user_id: User ID (Supabase UUID or "ml_X" for MovieLens users)
            candidate_movie_ids: List of movie IDs to score

        Returns:
            Dict mapping movie_id -> normalized_score (0-1 range)
        """
        if not self.is_collaborative_loaded():
            return {}

        predictions = {}
        for movie_id in candidate_movie_ids:
            try:
                pred = self.svd_model.predict(user_id, movie_id)
                # If prediction was impossible (user/item not in trainset), use neutral fallback
                if pred.details['was_impossible']:
                    predictions[movie_id] = 3.0
                else:
                    predictions[movie_id] = pred.est
            except Exception as e:
                logger.warning(f"Error predicting for movie {movie_id}: {e}")
                predictions[movie_id] = 3.0

        # Normalize to 0-1 range
        if not predictions:
            return {}

        scores = list(predictions.values())
        min_score = min(scores)
        max_score = max(scores)

        # Handle edge case where all scores are the same
        if max_score == min_score:
            return {movie_id: 0.5 for movie_id in predictions.keys()}

        normalized = {}
        for movie_id, score in predictions.items():
            normalized[movie_id] = (score - min_score) / (max_score - min_score)

        return normalized

    def get_diversity_picks(
        self,
        user_ratings: list[dict],
        hybrid_scores: dict[int, float],
        rated_ids: set,
        num_picks: int
    ) -> list[dict]:
        """
        Get diversity/exploration picks from mid-ranked movies.

        Selects from 50th-80th percentile range to add exploration beyond
        the user's established taste profile.

        Args:
            user_ratings: User's rating history
            hybrid_scores: Dict of movie_id -> hybrid_score
            rated_ids: Set of already-rated movie IDs
            num_picks: Number of diversity picks to return

        Returns:
            List of {movie_id: int, score: float} dicts
        """
        if not hybrid_scores:
            return []

        # Sort scores descending
        sorted_items = sorted(hybrid_scores.items(), key=lambda x: x[1], reverse=True)

        # Get 50th-80th percentile range
        n_items = len(sorted_items)
        percentile_50 = int(n_items * 0.5)
        percentile_80 = int(n_items * 0.8)

        # Extract mid-ranked movies
        mid_range = sorted_items[percentile_50:percentile_80]

        if not mid_range:
            # Fallback: use lower half if mid-range is empty
            mid_range = sorted_items[len(sorted_items) // 2:]

        if not mid_range:
            return []

        # Sample randomly from mid-range
        sample_size = min(num_picks, len(mid_range))
        sampled = random.sample(mid_range, sample_size)

        return [{"movie_id": movie_id, "score": score} for movie_id, score in sampled]

    def hybrid_recommendations(
        self,
        user_id: str,
        ratings: list[dict],
        top_n: int = 10,
        diversity_ratio: float = 0.15
    ) -> tuple[list[dict], str]:
        """
        Get hybrid recommendations combining content-based and collaborative filtering.

        Adaptive fusion weights based on user rating count:
        - < 5 ratings: Pure content-based (alpha = 0.0)
        - 5-19 ratings: Content-heavy hybrid (alpha = 0.0-0.3)
        - 20+ ratings: Collaborative-heavy hybrid (alpha = 0.7)

        Includes diversity injection (10-20% exploration picks).

        Args:
            user_id: User ID for collaborative filtering
            ratings: List of {movie_id: int, rating: float} dicts
            top_n: Number of recommendations to return
            diversity_ratio: Fraction of recommendations to use for exploration (default 0.15)

        Returns:
            Tuple of (recommendations_list, strategy_string)
            strategy_string: "content_based", "hybrid_content_heavy", or "hybrid_collaborative_heavy"
        """
        if not self.is_loaded():
            return ([], "content_based")

        # Calculate fusion weight
        alpha = self.calculate_alpha(len(ratings))

        # If alpha is 0 or CF model not loaded, fall back to pure content-based
        if alpha == 0.0 or not self.is_collaborative_loaded():
            recommendations = self.get_recommendations(ratings, top_n)
            return (recommendations, "content_based")

        # Build user profile for content-based scores
        user_profile = self.build_user_profile(ratings)

        if user_profile is None:
            # No high ratings - fall back to content-based
            recommendations = self.get_recommendations(ratings, top_n)
            return (recommendations, "content_based")

        # Get content-based scores for all unrated movies
        similarities = cosine_similarity(user_profile, self.tfidf_matrix)
        similarity_scores = similarities.flatten()

        rated_movie_ids = {r.get("movie_id") for r in ratings}

        # Build content scores dict for unrated movies
        content_scores = {}
        for idx, score in enumerate(similarity_scores):
            movie_id = self.movie_ids[idx]
            if movie_id not in rated_movie_ids:
                content_scores[movie_id] = float(score)

        # Get CF scores for the same movies
        cf_scores = self.get_cf_scores(user_id, list(content_scores.keys()))

        # Compute hybrid scores: (1 - alpha) * content + alpha * cf
        hybrid_scores = {}
        for movie_id in content_scores.keys():
            content_score = content_scores[movie_id]
            cf_score = cf_scores.get(movie_id, 0.5)  # Fallback to neutral if missing
            hybrid_scores[movie_id] = (1 - alpha) * content_score + alpha * cf_score

        # Sort by hybrid score descending
        sorted_candidates = sorted(hybrid_scores.items(), key=lambda x: x[1], reverse=True)

        # Split into exploit and explore
        num_explore = max(1, int(top_n * diversity_ratio))
        num_exploit = top_n - num_explore

        # Take top exploit picks
        exploit_picks = [
            {"movie_id": movie_id, "score": score}
            for movie_id, score in sorted_candidates[:num_exploit]
        ]

        # Get diversity picks from mid-ranked range
        explore_picks = self.get_diversity_picks(ratings, hybrid_scores, rated_movie_ids, num_explore)

        # Combine
        recommendations = exploit_picks + explore_picks

        # Determine strategy string
        strategy = "hybrid_content_heavy" if alpha < 0.5 else "hybrid_collaborative_heavy"

        return (recommendations, strategy)
