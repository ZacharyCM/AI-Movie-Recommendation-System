"""
SVD collaborative filtering model builder.

Trains an SVD model on combined MovieLens seed data + real user ratings from Supabase.
Produces persisted model artifacts for the hybrid recommendation system.
"""
import pandas as pd
import joblib
from pathlib import Path
from surprise import SVD, Dataset, Reader
from surprise.model_selection import cross_validate
import logging

from ml.download_movielens import (
    download_movielens_100k,
    load_movielens_ratings_with_tmdb_mapping
)

# Optional Supabase import - gracefully handle if not configured
try:
    from supabase import create_client, Client
    from config import settings
    SUPABASE_AVAILABLE = True
except Exception:
    SUPABASE_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_real_user_ratings() -> pd.DataFrame:
    """
    Fetch real user ratings from Supabase.

    Returns empty DataFrame if Supabase is not configured or fails.

    Returns:
        DataFrame with columns [user_id (str), movie_id (int), rating (float)]
    """
    if not SUPABASE_AVAILABLE:
        logger.info("Supabase not available - skipping real user ratings")
        return pd.DataFrame(columns=['user_id', 'movie_id', 'rating'])

    try:
        # Check if Supabase is configured
        if not settings.supabase_url or not settings.supabase_service_role_key:
            logger.info("Supabase not configured - skipping real user ratings")
            return pd.DataFrame(columns=['user_id', 'movie_id', 'rating'])

        # Create Supabase client
        supabase: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )

        # Fetch all ratings
        logger.info("Fetching real user ratings from Supabase...")
        response = supabase.table("ratings").select("user_id, movie_id, rating").execute()

        if not response.data:
            logger.info("No real user ratings found in Supabase")
            return pd.DataFrame(columns=['user_id', 'movie_id', 'rating'])

        # Convert to DataFrame
        df = pd.DataFrame(response.data)
        logger.info(f"Fetched {len(df)} real user ratings from Supabase")

        return df

    except Exception as e:
        logger.warning(f"Error fetching real user ratings: {e}. Continuing with MovieLens only.")
        return pd.DataFrame(columns=['user_id', 'movie_id', 'rating'])


def combine_ratings(ml_ratings: pd.DataFrame, real_ratings: pd.DataFrame) -> pd.DataFrame:
    """
    Combine MovieLens seed ratings with real user ratings.

    Args:
        ml_ratings: MovieLens ratings with columns [user_id, movie_id, rating]
        real_ratings: Real user ratings with columns [user_id, movie_id, rating]

    Returns:
        Combined DataFrame with same columns
    """
    logger.info(f"Combining ratings:")
    logger.info(f"  MovieLens ratings: {len(ml_ratings)}")
    logger.info(f"  Real user ratings: {len(real_ratings)}")

    if len(real_ratings) == 0:
        logger.info("No real ratings to combine - using MovieLens only")
        return ml_ratings

    # Concatenate
    combined = pd.concat([ml_ratings, real_ratings], ignore_index=True)
    logger.info(f"  Combined total: {len(combined)}")

    return combined


def train_svd_model(combined_ratings: pd.DataFrame) -> tuple:
    """
    Train SVD collaborative filtering model.

    Args:
        combined_ratings: DataFrame with columns [user_id, movie_id, rating]

    Returns:
        Tuple of (svd_model, trainset)
    """
    logger.info(f"\n{'=' * 60}")
    logger.info("Training SVD Model")
    logger.info(f"{'=' * 60}")

    # Create Surprise dataset
    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(
        combined_ratings[['user_id', 'movie_id', 'rating']],
        reader
    )

    # Run quick cross-validation to get RMSE estimate
    logger.info("\nRunning 3-fold cross-validation...")
    svd = SVD(
        n_factors=100,
        n_epochs=20,
        lr_all=0.005,
        reg_all=0.02,
        verbose=False
    )

    cv_results = cross_validate(svd, data, measures=['RMSE', 'MAE'], cv=3, verbose=True)

    logger.info(f"\nCross-validation results:")
    logger.info(f"  RMSE: {cv_results['test_rmse'].mean():.4f} (+/- {cv_results['test_rmse'].std():.4f})")
    logger.info(f"  MAE:  {cv_results['test_mae'].mean():.4f} (+/- {cv_results['test_mae'].std():.4f})")

    # Train on full dataset
    logger.info("\nTraining on full dataset...")
    trainset = data.build_full_trainset()

    svd_full = SVD(
        n_factors=100,
        n_epochs=20,
        lr_all=0.005,
        reg_all=0.02,
        verbose=True
    )

    svd_full.fit(trainset)

    # Sanity check: predict a known rating
    logger.info("\nSanity check - predicting a known rating...")
    test_user = combined_ratings.iloc[0]['user_id']
    test_movie = combined_ratings.iloc[0]['movie_id']
    test_actual = combined_ratings.iloc[0]['rating']

    prediction = svd_full.predict(test_user, test_movie)
    logger.info(f"  User: {test_user}, Movie: {test_movie}")
    logger.info(f"  Actual rating: {test_actual:.1f}")
    logger.info(f"  Predicted rating: {prediction.est:.2f}")

    logger.info("\n✓ SVD model trained successfully!")

    return svd_full, trainset


def save_models(svd_model, trainset, models_dir: str = None):
    """
    Save trained SVD model and trainset to disk.

    Args:
        svd_model: Trained SVD model
        trainset: Surprise Trainset object
        models_dir: Directory to save models (defaults to ml/models)
    """
    if models_dir is None:
        models_dir = Path(__file__).parent / "models"
    else:
        models_dir = Path(models_dir)

    models_dir.mkdir(exist_ok=True)

    logger.info(f"\nSaving models to {models_dir}...")

    # Save SVD model
    svd_path = models_dir / "svd_model.pkl"
    joblib.dump(svd_model, svd_path)
    svd_size = svd_path.stat().st_size / 1024  # KB
    logger.info(f"  ✓ svd_model.pkl ({svd_size:.1f} KB)")

    # Save trainset
    trainset_path = models_dir / "cf_trainset.pkl"
    joblib.dump(trainset, trainset_path)
    trainset_size = trainset_path.stat().st_size / 1024  # KB
    logger.info(f"  ✓ cf_trainset.pkl ({trainset_size:.1f} KB)")

    logger.info("\n✓ Models saved successfully!")


def main():
    """Entry point for building the collaborative filtering model."""
    print("\n" + "=" * 60)
    print("SVD Collaborative Filtering Model Builder")
    print("=" * 60)

    # Step 1: Ensure MovieLens data is downloaded
    logger.info("\nStep 1: Ensuring MovieLens data is available...")
    download_movielens_100k()

    # Step 2: Load MovieLens ratings mapped to TMDB
    logger.info("\nStep 2: Loading MovieLens ratings...")
    ml_ratings = load_movielens_ratings_with_tmdb_mapping()

    if len(ml_ratings) == 0:
        logger.error("No MovieLens ratings loaded. Make sure movie_ids.pkl exists (run build_model.py first).")
        return

    # Step 3: Load real user ratings from Supabase
    logger.info("\nStep 3: Loading real user ratings from Supabase...")
    real_ratings = get_real_user_ratings()

    # Step 4: Combine ratings
    logger.info("\nStep 4: Combining ratings...")
    combined_ratings = combine_ratings(ml_ratings, real_ratings)

    # Step 5: Train SVD model
    logger.info("\nStep 5: Training SVD model...")
    svd_model, trainset = train_svd_model(combined_ratings)

    # Step 6: Save models
    logger.info("\nStep 6: Saving models...")
    save_models(svd_model, trainset)

    # Final summary
    print("\n" + "=" * 60)
    print("BUILD COMPLETE")
    print("=" * 60)
    print(f"\n✓ Model artifacts saved to: backend/ml/models/")
    print(f"  - svd_model.pkl")
    print(f"  - cf_trainset.pkl")
    print(f"\n✓ Training dataset:")
    print(f"  - {len(combined_ratings)} total ratings")
    print(f"  - {combined_ratings['user_id'].nunique()} unique users")
    print(f"  - {combined_ratings['movie_id'].nunique()} unique movies")
    print(f"\n✓ Ready for collaborative filtering recommendations!")


if __name__ == "__main__":
    main()
