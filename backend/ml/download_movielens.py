"""
MovieLens 100K download and TMDB ID mapping utilities.

Provides functions to:
1. Download and cache MovieLens 100K dataset
2. Map MovieLens movie IDs to TMDB IDs
3. Filter ratings to only movies in the existing TF-IDF catalog
"""
import urllib.request
import zipfile
from pathlib import Path
import pandas as pd
import joblib
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def download_movielens_100k(data_dir: str = None) -> str:
    """
    Download MovieLens 100K dataset if not already cached.

    Args:
        data_dir: Directory to store data (defaults to ml/data)

    Returns:
        Path to ml-100k directory
    """
    if data_dir is None:
        data_dir = Path(__file__).parent / "data"
    else:
        data_dir = Path(data_dir)

    data_dir.mkdir(exist_ok=True)
    ml_100k_dir = data_dir / "ml-100k"

    # Check if already downloaded
    if ml_100k_dir.exists() and (ml_100k_dir / "u.data").exists():
        logger.info(f"MovieLens 100K already exists at {ml_100k_dir}")
        return str(ml_100k_dir)

    # Download
    url = "https://files.grouplens.org/datasets/movielens/ml-100k.zip"
    zip_path = data_dir / "ml-100k.zip"

    logger.info(f"Downloading MovieLens 100K from {url}...")
    urllib.request.urlretrieve(url, zip_path)
    logger.info(f"Downloaded to {zip_path}")

    # Extract
    logger.info(f"Extracting to {data_dir}...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(data_dir)

    # Clean up zip file
    zip_path.unlink()
    logger.info(f"Extracted and cleaned up. Data at {ml_100k_dir}")

    return str(ml_100k_dir)


def download_movielens_links(data_dir: str = None) -> str:
    """
    Download MovieLens links.csv (MovieLens ID to TMDB ID mapping).

    Uses ml-latest-small which has links for most ML-100K movies.

    Args:
        data_dir: Directory to store data (defaults to ml/data)

    Returns:
        Path to links.csv
    """
    if data_dir is None:
        data_dir = Path(__file__).parent / "data"
    else:
        data_dir = Path(data_dir)

    data_dir.mkdir(exist_ok=True)
    links_path = data_dir / "links.csv"

    # Check if already downloaded
    if links_path.exists():
        logger.info(f"links.csv already exists at {links_path}")
        return str(links_path)

    # Download ml-latest-small
    url = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip"
    zip_path = data_dir / "ml-latest-small.zip"

    logger.info(f"Downloading links.csv from {url}...")
    urllib.request.urlretrieve(url, zip_path)

    # Extract only links.csv
    logger.info(f"Extracting links.csv...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        # Extract only links.csv from ml-latest-small/links.csv
        with zip_ref.open('ml-latest-small/links.csv') as source:
            with open(links_path, 'wb') as target:
                target.write(source.read())

    # Clean up zip file
    zip_path.unlink()
    logger.info(f"links.csv saved to {links_path}")

    return str(links_path)


def load_movielens_ratings_with_tmdb_mapping(data_dir: str = None) -> pd.DataFrame:
    """
    Load MovieLens 100K ratings and map to TMDB IDs.

    Filters to only movies present in the TF-IDF catalog (movie_ids.pkl).
    Prefixes MovieLens user IDs with "ml_" to prevent collision with real UUIDs.

    Args:
        data_dir: Directory containing ml-100k and links.csv

    Returns:
        DataFrame with columns [user_id (str), movie_id (int), rating (float)]
    """
    if data_dir is None:
        data_dir = Path(__file__).parent / "data"
    else:
        data_dir = Path(data_dir)

    # Ensure data is downloaded
    ml_100k_dir = download_movielens_100k(data_dir)
    links_path = download_movielens_links(data_dir)

    # Load ratings from u.data
    # Format: user_id \t item_id \t rating \t timestamp
    ratings_path = Path(ml_100k_dir) / "u.data"
    logger.info(f"Loading ratings from {ratings_path}...")

    ratings = pd.read_csv(
        ratings_path,
        sep='\t',
        names=['user_id', 'item_id', 'rating', 'timestamp'],
        engine='python'
    )
    total_ratings = len(ratings)
    logger.info(f"Loaded {total_ratings} ratings from MovieLens 100K")

    # Load links (MovieLens ID to TMDB ID mapping)
    logger.info(f"Loading TMDB mappings from {links_path}...")
    links = pd.read_csv(links_path)
    # links.csv has columns: movieId, imdbId, tmdbId
    # Keep only movieId and tmdbId
    links = links[['movieId', 'tmdbId']].dropna()
    links['tmdbId'] = links['tmdbId'].astype(int)
    logger.info(f"Loaded {len(links)} MovieLens-to-TMDB mappings")

    # Merge ratings with links
    # item_id in u.data corresponds to movieId in links.csv
    merged = ratings.merge(
        links,
        left_on='item_id',
        right_on='movieId',
        how='inner'
    )
    logger.info(f"Merged ratings with TMDB IDs: {len(merged)} ratings have TMDB mappings")

    # Load TF-IDF catalog movie IDs
    models_dir = Path(__file__).parent / "models"
    movie_ids_path = models_dir / "movie_ids.pkl"

    if not movie_ids_path.exists():
        logger.warning(f"movie_ids.pkl not found at {movie_ids_path}. Run build_model.py first.")
        return pd.DataFrame(columns=['user_id', 'movie_id', 'rating'])

    logger.info(f"Loading TF-IDF catalog from {movie_ids_path}...")
    catalog_movie_ids = joblib.load(movie_ids_path)
    catalog_set = set(catalog_movie_ids)
    logger.info(f"TF-IDF catalog contains {len(catalog_set)} movies")

    # Filter to only movies in catalog
    filtered = merged[merged['tmdbId'].isin(catalog_set)].copy()
    logger.info(f"Filtered to catalog movies: {len(filtered)} ratings remain")

    # Prefix user IDs with "ml_" to prevent collision with real UUIDs
    filtered['user_id'] = 'ml_' + filtered['user_id'].astype(str)

    # Select final columns
    result = filtered[['user_id', 'tmdbId', 'rating']].copy()
    result = result.rename(columns={'tmdbId': 'movie_id'})

    logger.info(f"Final dataset: {len(result)} ratings from {result['user_id'].nunique()} users on {result['movie_id'].nunique()} movies")

    return result


def main():
    """Test the download and mapping functions."""
    print("=" * 60)
    print("MovieLens 100K Download and TMDB Mapping Test")
    print("=" * 60)

    # Download MovieLens 100K
    ml_dir = download_movielens_100k()
    print(f"\n✓ MovieLens 100K available at: {ml_dir}")

    # Download links
    links_path = download_movielens_links()
    print(f"✓ links.csv available at: {links_path}")

    # Load and map ratings
    print("\n" + "=" * 60)
    print("Loading and mapping ratings to TMDB...")
    print("=" * 60)

    ratings_df = load_movielens_ratings_with_tmdb_mapping()

    if len(ratings_df) > 0:
        print(f"\n✓ Successfully mapped ratings!")
        print(f"\nStats:")
        print(f"  Total ratings: {len(ratings_df)}")
        print(f"  Unique users: {ratings_df['user_id'].nunique()}")
        print(f"  Unique movies: {ratings_df['movie_id'].nunique()}")
        print(f"  Rating range: {ratings_df['rating'].min():.1f} - {ratings_df['rating'].max():.1f}")
        print(f"  Mean rating: {ratings_df['rating'].mean():.2f}")

        print(f"\nSample ratings:")
        print(ratings_df.head(10))
    else:
        print("\n⚠ No ratings returned. Make sure movie_ids.pkl exists (run build_model.py first).")


if __name__ == "__main__":
    main()
