"""
Embedding builder for movie semantic search and RAG.

Fetches movie details from TMDB for the TF-IDF catalog, generates embeddings
using sentence-transformers (all-MiniLM-L6-v2), and stores them in ChromaDB.
"""
import asyncio
import httpx
import joblib
import logging
from pathlib import Path
from sentence_transformers import SentenceTransformer

from config import settings
from ml.embeddings.store import EmbeddingStore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

TMDB_BASE_URL = "https://api.themoviedb.org/3"


async def fetch_movie_details(movie_id: int, client: httpx.AsyncClient) -> dict:
    """
    Fetch detailed movie information including keywords and credits.

    Args:
        movie_id: TMDB movie ID
        client: httpx AsyncClient instance

    Returns:
        Movie details dictionary
    """
    response = await client.get(
        f"{TMDB_BASE_URL}/movie/{movie_id}",
        params={
            "api_key": settings.tmdb_api_key,
            "append_to_response": "keywords,credits"
        }
    )
    response.raise_for_status()
    return response.json()


def build_text_representation(movie: dict) -> str:
    """
    Build text representation for embedding generation.

    Combines: title + overview + genres + director + top 3 cast.
    Uses natural language (keeps spaces) since sentence-transformers
    handles natural text better than TF-IDF.

    Args:
        movie: Movie details dictionary from TMDB

    Returns:
        Text representation string
    """
    parts = []

    # Title
    title = movie.get("title", "")
    if title:
        parts.append(title)

    # Overview
    overview = movie.get("overview", "")
    if overview:
        parts.append(overview)

    # Genres
    genres = movie.get("genres", [])
    if genres:
        genre_list = ", ".join([g["name"] for g in genres])
        parts.append(f"Genres: {genre_list}")

    # Director
    credits = movie.get("credits", {})
    crew = credits.get("crew", [])
    directors = [c["name"] for c in crew if c.get("job") == "Director"]
    if directors:
        parts.append(f"Director: {directors[0]}")

    # Top 3 cast
    cast = credits.get("cast", [])[:3]
    if cast:
        cast_names = ", ".join([c["name"] for c in cast])
        parts.append(f"Cast: {cast_names}")

    return " ".join(parts)


def extract_metadata(movie: dict) -> dict:
    """
    Extract metadata for ChromaDB storage.

    Args:
        movie: Movie details dictionary from TMDB

    Returns:
        Metadata dict with title, genres, year
    """
    # Extract year from release_date (YYYY-MM-DD format)
    release_date = movie.get("release_date", "")
    year = release_date[:4] if release_date else ""

    # Extract genres as comma-separated string
    genres = movie.get("genres", [])
    genre_str = ", ".join([g["name"] for g in genres])

    return {
        "title": movie.get("title", "Unknown"),
        "genres": genre_str,
        "year": year
    }


async def build_embeddings():
    """
    Main function to build and store movie embeddings.

    1. Load movie IDs from TF-IDF catalog
    2. Fetch detailed info for each movie from TMDB
    3. Build text representations
    4. Generate embeddings with sentence-transformers
    5. Store in ChromaDB via EmbeddingStore
    """
    # Step 1: Load TF-IDF catalog movie IDs
    models_dir = Path(__file__).parent.parent / "models"
    movie_ids_path = models_dir / "movie_ids.pkl"

    if not movie_ids_path.exists():
        logger.error(f"Movie IDs file not found: {movie_ids_path}")
        logger.error("Please run 'python -m ml.build_model' first to create the TF-IDF catalog")
        return

    movie_ids = joblib.load(movie_ids_path)
    logger.info(f"Loaded {len(movie_ids)} movie IDs from TF-IDF catalog")

    # Step 2: Fetch movie details from TMDB
    logger.info("\nFetching movie details from TMDB...")
    movie_details = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, movie_id in enumerate(movie_ids, 1):
            try:
                details = await fetch_movie_details(movie_id, client)
                title = details.get("title", "Unknown")
                logger.info(f"Processing movie {i}/{len(movie_ids)}: {title}")
                movie_details.append(details)

                # Rate limiting: TMDB allows ~40 req/10s
                await asyncio.sleep(0.25)

            except Exception as e:
                logger.error(f"  Error fetching movie {movie_id}: {e}")
                continue

    logger.info(f"\nSuccessfully fetched {len(movie_details)} movie details")

    # Step 3: Build text representations
    logger.info("\nBuilding text representations...")
    texts = []
    valid_movie_ids = []
    metadatas = []

    for movie in movie_details:
        text = build_text_representation(movie)
        if text.strip():  # Only include movies with non-empty text
            texts.append(text)
            valid_movie_ids.append(str(movie["id"]))  # Convert to string for ChromaDB
            metadatas.append(extract_metadata(movie))

    logger.info(f"Built {len(texts)} text representations")

    # Step 4: Generate embeddings
    logger.info("\nGenerating embeddings with sentence-transformers...")
    logger.info("Loading model: all-MiniLM-L6-v2")

    model = SentenceTransformer('all-MiniLM-L6-v2')

    logger.info("Encoding text representations...")
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        convert_to_numpy=True
    )

    logger.info(f"Generated embeddings with shape: {embeddings.shape}")
    logger.info(f"Embedding dimension: {embeddings.shape[1]}")

    # Step 5: Store in ChromaDB
    logger.info("\nStoring embeddings in ChromaDB...")

    store = EmbeddingStore()

    # Convert numpy arrays to lists for ChromaDB
    embeddings_list = embeddings.tolist()

    store.upsert_movies(
        ids=valid_movie_ids,
        embeddings=embeddings_list,
        documents=texts,
        metadatas=metadatas
    )

    final_count = store.count()
    logger.info(f"\nEmbedding generation complete!")
    logger.info(f"Total embeddings in ChromaDB: {final_count}")
    logger.info(f"Embeddings saved to: {store.persist_dir}")


def main():
    """Entry point for building movie embeddings."""
    asyncio.run(build_embeddings())


if __name__ == "__main__":
    main()
