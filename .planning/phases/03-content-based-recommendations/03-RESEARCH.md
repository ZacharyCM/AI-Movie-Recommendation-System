# Phase 3: Content-Based Recommendations - Research

**Researched:** 2026-02-15
**Domain:** Content-based recommendation systems using TF-IDF vectorization
**Confidence:** HIGH

## Summary

Content-based recommendation systems recommend items similar to those a user has rated highly by analyzing item features (genres, keywords, cast, plot). For movie recommendations, this is typically implemented using **TF-IDF (Term Frequency-Inverse Document Frequency) vectorization** to convert textual metadata into numerical vectors, then computing **cosine similarity** to find similar movies.

The standard approach: (1) extract and concatenate movie metadata (genres, keywords, overview, cast, director), (2) vectorize using TF-IDF to create a feature matrix, (3) build user profiles as weighted averages of their highly-rated movies' vectors, (4) compute cosine similarity between user profile and candidate movies, (5) return top N most similar movies as recommendations.

**Primary recommendation:** Use **scikit-learn** (`TfidfVectorizer` + `cosine_similarity`) with metadata from TMDB. Pre-compute the TF-IDF matrix on a corpus of popular movies at startup, cache in memory, and only rebuild when new movies are added or ratings reach a threshold (e.g., 5+). Use popularity-based fallback for cold-start users (< 5 ratings).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| scikit-learn | 1.8.0+ | TF-IDF vectorization, cosine similarity | Industry standard for ML in Python; optimized sparse matrix operations |
| numpy | 1.26+ | Numerical computations, array operations | Required by scikit-learn; efficient vector math |
| joblib | 1.4+ | Model persistence (save/load fitted vectorizer) | Optimized for numpy arrays, memory mapping, recommended by scikit-learn |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| scipy | 1.12+ | Sparse matrix operations | Automatically used by scikit-learn for TF-IDF output |
| pandas | 2.2+ | Data manipulation, DataFrame operations | When preprocessing movie metadata from TMDB/database |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TF-IDF + cosine | Word2Vec/BERT embeddings | Deep learning embeddings capture semantic meaning better but require more compute, training data, and complexity; TF-IDF is simpler and works well for metadata |
| scikit-learn | Custom implementation | No benefit; scikit-learn is battle-tested, optimized, and handles edge cases |
| In-memory caching | Redis caching | Redis enables multi-instance sharing but adds infrastructure complexity; for single-instance MVP, in-memory is sufficient |

**Installation:**
```bash
pip install scikit-learn==1.8.0 numpy pandas joblib
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── routers/
│   └── recommendations.py    # API endpoints
├── services/
│   ├── tmdb.py              # Existing TMDB client
│   └── recommender.py       # Recommendation engine (TF-IDF + similarity)
├── ml/
│   ├── __init__.py
│   ├── vectorizer.py        # TfidfVectorizer wrapper
│   └── models/              # Persisted .pkl files
│       └── tfidf_vectorizer.pkl
└── schemas/
    └── recommendation.py    # Pydantic models for API
```

### Pattern 1: Startup Model Loading with FastAPI Lifespan
**What:** Load and cache the fitted TfidfVectorizer at application startup, not on each request.
**When to use:** Always for ML models in FastAPI to avoid re-computation overhead.
**Example:**
```python
# Source: https://fastapi.tiangolo.com/advanced/events/
# Verified: Official FastAPI docs (2026)

from contextlib import asynccontextmanager
from fastapi import FastAPI
import joblib

ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model at startup
    ml_models["vectorizer"] = joblib.load("ml/models/tfidf_vectorizer.pkl")
    ml_models["tfidf_matrix"] = joblib.load("ml/models/tfidf_matrix.pkl")
    ml_models["movie_ids"] = joblib.load("ml/models/movie_ids.pkl")
    yield
    # Cleanup on shutdown
    ml_models.clear()

app = FastAPI(lifespan=lifespan)
```

### Pattern 2: User Profile Construction (Weighted Average)
**What:** Build a user profile vector by averaging the TF-IDF vectors of movies they rated highly (4-5 stars), weighted by rating.
**When to use:** When user has sufficient ratings (5+) to create a meaningful profile.
**Example:**
```python
# Source: Content-based filtering best practices
# Verified: Multiple implementations on Medium, Analytics Vidhya

import numpy as np

def build_user_profile(user_ratings, tfidf_matrix, movie_id_to_index):
    """
    Build user profile from rated movies.

    user_ratings: List[{movie_id: int, rating: int}]
    tfidf_matrix: sparse matrix of shape (n_movies, n_features)
    movie_id_to_index: dict mapping movie_id -> matrix index
    """
    # Filter for high ratings (4-5 stars)
    high_ratings = [r for r in user_ratings if r["rating"] >= 4]

    if not high_ratings:
        return None

    # Get indices and weights
    indices = [movie_id_to_index[r["movie_id"]] for r in high_ratings
               if r["movie_id"] in movie_id_to_index]
    weights = np.array([r["rating"] for r in high_ratings])

    # Weighted average of TF-IDF vectors
    user_vectors = tfidf_matrix[indices]
    weighted_profile = (user_vectors.T @ weights) / weights.sum()

    return weighted_profile.T
```

### Pattern 3: Recommendation Generation with Filtering
**What:** Compute cosine similarity between user profile and all movies, exclude already-rated movies, return top N.
**When to use:** After building user profile.
**Example:**
```python
# Source: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html

from sklearn.metrics.pairwise import cosine_similarity

def get_recommendations(user_profile, tfidf_matrix, movie_ids,
                       rated_movie_ids, top_n=10):
    """
    Get top N recommendations for user.

    user_profile: 1D array (1, n_features)
    tfidf_matrix: sparse matrix (n_movies, n_features)
    movie_ids: list of movie IDs aligned with tfidf_matrix rows
    rated_movie_ids: set of movie IDs user already rated
    """
    # Compute similarity scores
    similarities = cosine_similarity(user_profile, tfidf_matrix).flatten()

    # Get indices sorted by similarity (descending)
    top_indices = np.argsort(similarities)[::-1]

    # Filter out already-rated movies
    recommendations = []
    for idx in top_indices:
        movie_id = movie_ids[idx]
        if movie_id not in rated_movie_ids:
            recommendations.append({
                "movie_id": movie_id,
                "score": float(similarities[idx])
            })
            if len(recommendations) >= top_n:
                break

    return recommendations
```

### Pattern 4: Cold Start Fallback (Popularity-Based)
**What:** For users with < 5 ratings, return popular/trending movies instead of content-based recommendations.
**When to use:** Always as a fallback when personalized recommendations aren't available.
**Example:**
```python
# Source: Cold start problem literature

async def get_recommendations_with_fallback(user_id: str, supabase, top_n=10):
    """Get recommendations with cold start handling."""
    # Get user ratings
    ratings = await get_user_ratings(user_id, supabase)

    # Cold start: use popularity-based fallback
    if len(ratings) < 5:
        return await get_popular_movies(top_n)

    # Build user profile and generate content-based recommendations
    user_profile = build_user_profile(ratings, tfidf_matrix, movie_id_to_index)
    rated_ids = {r["movie_id"] for r in ratings}

    return get_recommendations(user_profile, tfidf_matrix, movie_ids,
                              rated_ids, top_n)
```

### Pattern 5: Movie Metadata Preprocessing
**What:** Concatenate genres, keywords, overview, cast, director into a single text string ("soup") for each movie.
**When to use:** When preparing data for TF-IDF vectorization.
**Example:**
```python
# Source: https://www.geeksforgeeks.org/nlp/movie-recommender-based-on-plot-summary-using-tf-idf-vectorization-and-cosine-similarity/

def create_metadata_soup(movie):
    """
    Combine movie metadata into single string.

    movie: dict with keys like genres, keywords, overview, credits
    """
    # Extract components
    genres = " ".join([g["name"] for g in movie.get("genres", [])])
    keywords = " ".join([k["name"] for k in movie.get("keywords", {}).get("keywords", [])])
    overview = movie.get("overview", "")

    # Get top 3 cast members
    cast = movie.get("credits", {}).get("cast", [])[:3]
    cast_names = " ".join([c["name"].replace(" ", "") for c in cast])

    # Get director
    crew = movie.get("credits", {}).get("crew", [])
    directors = [c["name"].replace(" ", "") for c in crew if c["job"] == "Director"]
    director = directors[0] if directors else ""

    # Combine (space-separated, lowercase done by TfidfVectorizer)
    soup = f"{genres} {keywords} {overview} {cast_names} {director}"

    return soup.strip()
```

### Anti-Patterns to Avoid
- **Re-fitting TfidfVectorizer on every request:** Extremely slow. Fit once, persist with joblib, load at startup.
- **Converting sparse matrices to dense:** TF-IDF matrices are huge and sparse (e.g., 10,000 movies × 5,000 features). Keeping sparse saves 90%+ memory.
- **Using pickle across scikit-learn versions:** Models saved with one version may fail or give wrong results in another. Pin scikit-learn version in requirements.txt.
- **Loading untrusted .pkl files:** Pickle can execute arbitrary code. Only load models you created or from trusted sources.
- **Ignoring normalization:** Use `norm='l2'` (default) in TfidfVectorizer so cosine similarity works correctly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TF-IDF calculation | Custom TF-IDF from scratch | `sklearn.feature_extraction.text.TfidfVectorizer` | Edge cases: IDF smoothing, sublinear term frequency, handling empty docs, min/max document frequency filtering |
| Cosine similarity | Manual dot product / norm calculation | `sklearn.metrics.pairwise.cosine_similarity` | Optimized for sparse matrices, handles broadcasting, numerically stable |
| Model persistence | Custom save/load with JSON | `joblib.dump()` / `joblib.load()` | Memory mapping, compression, handles numpy arrays and scipy sparse matrices |
| Text preprocessing | Regex-based tokenization | TfidfVectorizer's built-in `analyzer`, `token_pattern`, `stop_words` | Handles unicode, multiple languages, standard patterns |
| Similarity ranking | Bubble sort, manual top-N | `numpy.argsort()` + slicing | Optimized C implementations, handles large arrays |

**Key insight:** Recommendation systems have deceptive complexity. The "simple" version breaks with real data: empty overviews, movies with 1 genre vs. 5 genres (normalization needed), sparse matrices growing to GB scale, numerical precision issues with cosine similarity. scikit-learn has solved all of these.

## Common Pitfalls

### Pitfall 1: Version Incompatibility (joblib/pickle)
**What goes wrong:** Model saved with scikit-learn 1.5 fails to load or gives incorrect results with scikit-learn 1.8.
**Why it happens:** scikit-learn explicitly does NOT support cross-version model loading. Internal data structures change between versions.
**How to avoid:**
- Pin exact scikit-learn version in `requirements.txt` (e.g., `scikit-learn==1.8.0`)
- Use Docker containers for reproducible environments
- Save training script alongside model so you can retrain with future versions
**Warning signs:** `InconsistentVersionWarning` when loading model, or predictions suddenly change after pip upgrade.

### Pitfall 2: Over-Specialization / Filter Bubble
**What goes wrong:** User who rates 5 superhero movies only sees superhero recommendations forever. Recommendations feel stale.
**Why it happens:** Content-based filtering recommends items similar to past preferences. It can't discover truly new content outside the user's rated features.
**How to avoid:**
- Add diversity: After getting top 50 similar movies, sample from different genres
- Inject popular/trending items: Mix 20% popular movies into recommendations
- Plan for hybrid approach: Phase 4+ could add collaborative filtering
**Warning signs:** User feedback "recommendations are repetitive" or engagement drops after initial usage.

### Pitfall 3: Sparse Matrix Densification
**What goes wrong:** Memory explosion when converting sparse TF-IDF matrix to dense array.
**Why it happens:** TF-IDF for 10,000 movies × 5,000 features: sparse = ~50MB, dense = ~400MB. Unintended `.toarray()` call uses 8x memory.
**How to avoid:**
- Keep sparse throughout pipeline: `cosine_similarity` accepts sparse input
- Use `dense_output=False` when you need sparse output
- Monitor memory: `scipy.sparse.issparse()` to check matrix type
**Warning signs:** FastAPI server crashes with OOM (out of memory) errors under load.

### Pitfall 4: Cold Start Ignored
**What goes wrong:** New users (0-4 ratings) see empty recommendation section or generic error.
**Why it happens:** Can't build meaningful user profile from 1-2 ratings; cosine similarity becomes unreliable.
**How to avoid:**
- Implement 5-rating minimum threshold
- Show popularity-based fallback: "Trending Now" or "Popular This Week"
- Show onboarding message: "Rate 5+ movies to get personalized recommendations"
**Warning signs:** Error logs for users with < 5 ratings, or users drop off before reaching 5 ratings.

### Pitfall 5: Stale Recommendations
**What goes wrong:** User rates 10 new movies, recommendations don't update. Still seeing same results.
**Why it happens:** User profile cached or only rebuilt on app restart.
**How to avoid:**
- Invalidate user profile cache after new rating
- Rebuild user profile on-the-fly (fast: just weighted average of pre-computed vectors)
- Don't cache user profiles, only cache TF-IDF matrix (shared across all users)
**Warning signs:** User confusion "I just rated this, why am I still seeing X?", success criterion 2 fails.

### Pitfall 6: TF-IDF Re-computation on Every Request
**What goes wrong:** `/recommendations` endpoint takes 5+ seconds, times out.
**Why it happens:** Calling `fit_transform()` on each request re-computes TF-IDF for entire movie corpus.
**How to avoid:**
- Compute TF-IDF matrix ONCE during model building (offline or startup)
- Save with joblib: `vectorizer.pkl`, `tfidf_matrix.pkl`, `movie_ids.pkl`
- Load at FastAPI startup using lifespan events
- Only rebuild when new movies added (not per-request)
**Warning signs:** High API latency (> 1s), CPU spikes on every recommendation request.

### Pitfall 7: Metadata Concatenation Without Cleaning
**What goes wrong:** Director name "Christopher Nolan" becomes two features "Christopher" and "Nolan", polluting similarity (matches any Christopher or Nolan).
**Why it happens:** TfidfVectorizer splits on whitespace by default.
**How to avoid:**
- Remove spaces from names: `name.replace(" ", "")` → "ChristopherNolan"
- This treats multi-word names as single tokens
- Apply to cast, director, keywords with spaces
**Warning signs:** Recommendations seem to match common first names rather than full names/entities.

## Code Examples

Verified patterns from official sources:

### Building TF-IDF Model (Offline/Startup)
```python
# Source: https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html

from sklearn.feature_extraction.text import TfidfVectorizer
import joblib
import numpy as np

# Prepare movie corpus
movies = [
    {"id": 550, "soup": "action thriller drama EdwardNorton BradPitt DavidFincher fight club"},
    {"id": 680, "soup": "scifi action thriller KeanuReeves LanaWachowski matrix virtual reality"},
    # ... more movies
]

movie_ids = [m["id"] for m in movies]
corpus = [m["soup"] for m in movies]

# Create and fit TfidfVectorizer
vectorizer = TfidfVectorizer(
    max_features=5000,        # Limit vocabulary to top 5000 terms
    stop_words='english',     # Remove common English words
    ngram_range=(1, 2),       # Use unigrams and bigrams
    min_df=2,                 # Ignore terms appearing in < 2 documents
    max_df=0.8,               # Ignore terms appearing in > 80% of documents
    norm='l2'                 # L2 normalization for cosine similarity
)

tfidf_matrix = vectorizer.fit_transform(corpus)

# Save to disk
joblib.dump(vectorizer, "ml/models/tfidf_vectorizer.pkl")
joblib.dump(tfidf_matrix, "ml/models/tfidf_matrix.pkl")
joblib.dump(movie_ids, "ml/models/movie_ids.pkl")

print(f"TF-IDF matrix shape: {tfidf_matrix.shape}")  # (n_movies, n_features)
print(f"Matrix is sparse: {scipy.sparse.issparse(tfidf_matrix)}")  # True
```

### FastAPI Recommendation Endpoint
```python
# Source: FastAPI + ML best practices (multiple sources)

from fastapi import APIRouter, HTTPException, Depends
from typing import List
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

# Loaded at startup via lifespan
from main import ml_models

@router.get("/", response_model=List[RecommendationResponse])
async def get_recommendations(
    user_id: str = Depends(get_current_user),
    top_n: int = 10
):
    """Get personalized movie recommendations for user."""

    # Fetch user ratings from database
    ratings_response = supabase.table("ratings")\
        .select("movie_id, rating")\
        .eq("user_id", user_id)\
        .execute()

    ratings = ratings_response.data

    # Cold start fallback
    if len(ratings) < 5:
        popular = await tmdb_service.get_popular(page=1)
        return [
            {"movie_id": m["id"], "score": 0.0, "reason": "popular"}
            for m in popular["results"][:top_n]
        ]

    # Build user profile
    vectorizer = ml_models["vectorizer"]
    tfidf_matrix = ml_models["tfidf_matrix"]
    movie_ids = ml_models["movie_ids"]

    # Create movie_id -> index mapping
    movie_id_to_index = {mid: idx for idx, mid in enumerate(movie_ids)}

    # Get high-rated movies (4-5 stars)
    high_ratings = [r for r in ratings if r["rating"] >= 4]

    indices = [movie_id_to_index[r["movie_id"]] for r in high_ratings
               if r["movie_id"] in movie_id_to_index]
    weights = np.array([r["rating"] for r in high_ratings])

    # Weighted average of TF-IDF vectors
    user_vectors = tfidf_matrix[indices]
    user_profile = (user_vectors.T @ weights) / weights.sum()
    user_profile = user_profile.T  # Shape: (1, n_features)

    # Compute similarities
    similarities = cosine_similarity(user_profile, tfidf_matrix).flatten()

    # Get top N, excluding already-rated
    rated_ids = {r["movie_id"] for r in ratings}
    top_indices = np.argsort(similarities)[::-1]

    recommendations = []
    for idx in top_indices:
        movie_id = movie_ids[idx]
        if movie_id not in rated_ids:
            recommendations.append({
                "movie_id": movie_id,
                "score": float(similarities[idx]),
                "reason": "content_based"
            })
            if len(recommendations) >= top_n:
                break

    return recommendations
```

### Testing Cosine Similarity
```python
# Source: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html

from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Example: Find movies similar to movie at index 0
movie_index = 0
movie_vector = tfidf_matrix[movie_index]  # Shape: (1, n_features)

# Compute similarity to all movies
similarities = cosine_similarity(movie_vector, tfidf_matrix).flatten()

# Get top 5 most similar (excluding itself)
similar_indices = np.argsort(similarities)[::-1][1:6]  # Skip first (itself)

for idx in similar_indices:
    print(f"Movie ID: {movie_ids[idx]}, Similarity: {similarities[idx]:.3f}")
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual TF-IDF calculation | scikit-learn TfidfVectorizer | ~2010 | Standardized API, optimized performance, sparse matrix support |
| Dense matrix storage | Sparse CSR matrices | ~2008 | 90%+ memory savings for text data |
| pickle for model saving | joblib (still pickle-based, but optimized) | ~2012 | Better handling of numpy arrays, compression, memory mapping |
| Linear kernel for similarity | cosine_similarity | Still used (2026) | No change; both work, cosine is semantically clearer for normalized vectors |
| Simple average user profile | Weighted average by rating | ~2015 | Higher-rated items contribute more to user preferences |
| Pure content-based | Hybrid (content + collaborative) | ~2018+ | Better diversity, addresses over-specialization; Phase 4+ consideration |

**Deprecated/outdated:**
- **get_feature_names()**: Replaced by `get_feature_names_out()` in scikit-learn 1.0+
- **pickle.dump() for models**: Still works but joblib is preferred for scikit-learn objects (better numpy handling)
- **Dense output by default**: Modern scikit-learn keeps sparse matrices sparse; densification is opt-in

## Open Questions

1. **How many movies should be in the TF-IDF corpus?**
   - What we know: TMDB has millions of movies; we can't vectorize all of them (memory/compute limits)
   - What's unclear: Optimal corpus size for good recommendations without overwhelming system
   - Recommendation: Start with top 5,000 popular movies from TMDB. Expand to 10,000+ if users rate obscure movies not in corpus. Monitor memory usage.

2. **How often should TF-IDF matrix be rebuilt?**
   - What we know: Matrix should update when new movies are popular or rated frequently
   - What's unclear: Trigger frequency (daily rebuild? weekly? on-demand?)
   - Recommendation: For MVP, build once at deployment. Phase 4+ could add weekly cron job to rebuild with latest popular movies.

3. **Should we store movie metadata in database or fetch from TMDB?**
   - What we know: TMDB API provides genres, keywords, cast, overview. Supabase database could cache this.
   - What's unclear: Performance tradeoff (API calls vs. database storage), data freshness
   - Recommendation: Fetch from TMDB and cache in database with TTL. Use database for TF-IDF building (faster, no rate limits).

4. **How to handle movies not in TF-IDF corpus?**
   - What we know: If user rates movie #999999 not in our corpus, it's ignored in profile building
   - What's unclear: Does this hurt recommendation quality? Should we expand corpus on-the-fly?
   - Recommendation: Log corpus misses. If > 10% of user ratings are outside corpus, expand corpus or add on-demand vectorization for those movies.

## Sources

### Primary (HIGH confidence)
- [scikit-learn TfidfVectorizer documentation](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html) - Constructor parameters, methods, examples
- [scikit-learn cosine_similarity documentation](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html) - Function signature, sparse matrix support
- [scikit-learn Model Persistence documentation](https://scikit-learn.org/stable/model_persistence.html) - joblib, pickle, version compatibility warnings
- [FastAPI Lifespan Events](https://fastapi.tiangolo.com/advanced/events/) - Startup/shutdown for model loading

### Secondary (MEDIUM confidence)
- [IBM: What is content-based filtering?](https://www.ibm.com/think/topics/content-based-filtering) - User profile construction, weighted averages
- [Google ML: Content-based filtering](https://developers.google.com/machine-learning/recommendation/content-based/basics) - Fundamentals, vector similarity
- [GeeksforGeeks: Movie recommender using TF-IDF](https://www.geeksforgeeks.org/nlp/movie-recommender-based-on-plot-summary-using-tf-idf-vectorization-and-cosine-similarity/) - Metadata soup pattern
- [Analytics Vidhya: ML Model Serving with FastAPI and Redis](https://www.analyticsvidhya.com/blog/2025/06/ml-model-serving/) - Caching strategies, startup loading (2025)
- [FastAPI Performance Tuning & Caching 101 (2026)](https://blog.greeden.me/en/2026/02/03/fastapi-performance-tuning-caching-strategy-101-a-practical-recipe-for-growing-a-slow-api-into-a-lightweight-fast-api/) - Recent best practices

### Tertiary (LOW confidence - community/blog sources, need validation)
- [Building a Movie Recommendation Engine using Scikit-Learn](https://medium.com/@sumanadhikari/building-a-movie-recommendation-engine-using-scikit-learn-8dbb11c5aa4b) - Implementation examples
- [Content-Based Filtering Explained (Shaped Blog)](https://www.shaped.ai/blog/content-based-filtering-explained-recommending-based-on-what-you-like) - Overspecialization, filter bubble
- [Analytics Vidhya: Predicting Movie Genres using NLP](https://www.analyticsvidhya.com/blog/2019/04/predicting-movie-genres-nlp-multi-label-classification/) - Feature engineering for genres/keywords
- [FreeCodeCamp: Cold Start Problem](https://www.freecodecamp.org/news/cold-start-problem-in-recommender-systems/) - Minimum ratings threshold, popularity fallback
- Various GitHub implementations - Code patterns for movie recommendation systems

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - scikit-learn is industry standard, verified by official docs and widespread use
- Architecture: HIGH - FastAPI lifespan pattern is official docs, TF-IDF approach verified across multiple sources
- Pitfalls: MEDIUM-HIGH - Version incompatibility and sparse matrix issues verified by official docs; over-specialization well-documented in literature; other pitfalls based on common patterns

**Research date:** 2026-02-15
**Valid until:** ~60 days (stable domain; scikit-learn updates infrequently)

**Notes:**
- No CONTEXT.md exists for this phase, so full discretion was available
- Research focused on practical implementation patterns for FastAPI + scikit-learn
- TF-IDF + cosine similarity is well-established (15+ years), low risk of approach changes
- Main variability is in hyperparameters (max_features, min_df) and corpus size, which should be tuned based on data
