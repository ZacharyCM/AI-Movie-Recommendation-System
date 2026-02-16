"""
TF-IDF model builder for content-based recommendations.

Fetches popular movies from TMDB, builds metadata soup (genres, keywords, cast, director),
fits a TF-IDF vectorizer, and saves model artifacts for the recommender service.
"""
import asyncio
import httpx
import joblib
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from config import settings

TMDB_BASE_URL = "https://api.themoviedb.org/3"


async def fetch_popular_movies(num_pages: int = 13) -> list[dict]:
    """
    Fetch popular movies from TMDB.

    Args:
        num_pages: Number of pages to fetch (~20 movies per page)

    Returns:
        List of movie dictionaries with basic info
    """
    movies = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for page in range(1, num_pages + 1):
            print(f"Fetching page {page}...")
            response = await client.get(
                f"{TMDB_BASE_URL}/movie/popular",
                params={
                    "api_key": settings.tmdb_api_key,
                    "page": page
                }
            )
            response.raise_for_status()
            data = response.json()
            movies.extend(data.get("results", []))
            # Rate limiting: TMDB allows ~40 req/10s
            await asyncio.sleep(0.25)

    print(f"Fetched {len(movies)} popular movies")
    return movies


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


def build_metadata_soup(movie: dict) -> str:
    """
    Build metadata 'soup' for TF-IDF from movie details.

    Concatenates: genres, keywords, overview, top 3 cast, director
    Names are space-stripped (e.g., "Brad Pitt" -> "BradPitt")

    Args:
        movie: Movie details dictionary from TMDB

    Returns:
        Metadata soup string
    """
    parts = []

    # Genres
    genres = movie.get("genres", [])
    genre_names = [g["name"] for g in genres]
    parts.extend(genre_names)

    # Keywords
    keywords_data = movie.get("keywords", {})
    keywords = keywords_data.get("keywords", [])
    keyword_names = [k["name"] for k in keywords]
    parts.extend(keyword_names)

    # Overview
    overview = movie.get("overview", "")
    if overview:
        parts.append(overview)

    # Top 3 cast (space-stripped)
    credits = movie.get("credits", {})
    cast = credits.get("cast", [])[:3]
    cast_names = [c["name"].replace(" ", "") for c in cast]
    parts.extend(cast_names)

    # Director (space-stripped)
    crew = credits.get("crew", [])
    directors = [c["name"].replace(" ", "") for c in crew if c.get("job") == "Director"]
    if directors:
        parts.append(directors[0])

    return " ".join(parts)


async def build_tfidf_model():
    """
    Main function to build and save TF-IDF model.

    1. Fetch popular movies from TMDB
    2. Fetch detailed info for each movie
    3. Build metadata soup
    4. Fit TF-IDF vectorizer
    5. Save model artifacts
    """
    # Step 1: Fetch popular movies
    popular_movies = await fetch_popular_movies(num_pages=13)

    # Step 2: Fetch detailed info for each movie
    print("\nFetching detailed movie information...")
    movie_details = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, movie in enumerate(popular_movies, 1):
            movie_id = movie["id"]
            title = movie.get("title", "Unknown")
            print(f"Processing movie {i}/{len(popular_movies)}: {title}")

            try:
                details = await fetch_movie_details(movie_id, client)
                movie_details.append(details)
                # Rate limiting
                await asyncio.sleep(0.25)
            except Exception as e:
                print(f"  Error fetching {movie_id}: {e}")
                continue

    print(f"\nSuccessfully fetched {len(movie_details)} movie details")

    # Step 3: Build metadata soup for each movie
    print("\nBuilding metadata soup...")
    movie_ids = []
    metadata_soups = []

    for movie in movie_details:
        movie_id = movie["id"]
        soup = build_metadata_soup(movie)
        if soup.strip():  # Only include movies with non-empty metadata
            movie_ids.append(movie_id)
            metadata_soups.append(soup)

    print(f"Built metadata for {len(metadata_soups)} movies")

    # Step 4: Fit TF-IDF vectorizer
    print("\nFitting TF-IDF vectorizer...")

    # Try with min_df=2 first
    vectorizer = TfidfVectorizer(
        max_features=5000,
        stop_words='english',
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.8,
        norm='l2'
    )

    try:
        tfidf_matrix = vectorizer.fit_transform(metadata_soups)
        vocab_size = len(vectorizer.vocabulary_)

        # If vocabulary is too small, retry with min_df=1
        if vocab_size < 100:
            print(f"Vocabulary too small ({vocab_size} features). Retrying with min_df=1...")
            vectorizer = TfidfVectorizer(
                max_features=5000,
                stop_words='english',
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.8,
                norm='l2'
            )
            tfidf_matrix = vectorizer.fit_transform(metadata_soups)
            vocab_size = len(vectorizer.vocabulary_)

        print(f"TF-IDF matrix shape: {tfidf_matrix.shape}")
        print(f"Vocabulary size: {vocab_size}")

    except Exception as e:
        print(f"Error fitting vectorizer: {e}")
        raise

    # Step 5: Save model artifacts
    models_dir = Path(__file__).parent / "models"
    models_dir.mkdir(exist_ok=True)

    print(f"\nSaving model to {models_dir}...")
    joblib.dump(vectorizer, models_dir / "tfidf_vectorizer.pkl")
    joblib.dump(tfidf_matrix, models_dir / "tfidf_matrix.pkl")
    joblib.dump(movie_ids, models_dir / "movie_ids.pkl")

    print(f"Model saved successfully!")
    print(f"  - tfidf_vectorizer.pkl")
    print(f"  - tfidf_matrix.pkl")
    print(f"  - movie_ids.pkl")
    print(f"\nMatrix shape: {tfidf_matrix.shape}")
    print(f"Ready for recommendations!")


def main():
    """Entry point for building the TF-IDF model."""
    asyncio.run(build_tfidf_model())


if __name__ == "__main__":
    main()
