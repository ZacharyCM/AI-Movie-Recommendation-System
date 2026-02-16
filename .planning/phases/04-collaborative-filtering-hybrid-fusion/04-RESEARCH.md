# Phase 4: Collaborative Filtering & Hybrid Fusion - Research

**Researched:** 2026-02-16
**Domain:** Collaborative filtering (SVD, User-User KNN) with Surprise library, hybrid fusion strategies, MovieLens dataset integration, diversity injection
**Confidence:** HIGH

## Summary

Phase 4 implements collaborative filtering using matrix factorization (SVD) and neighborhood-based methods (User-User KNN) via the Surprise library, then merges these signals with Phase 3's content-based recommendations through a weighted hybrid fusion layer. The system uses MovieLens dataset as seed data to enable collaborative filtering from day one, and implements diversity injection (10-20% exploration picks) to prevent filter bubbles.

Collaborative filtering predicts user preferences by analyzing patterns in the collective behavior of all users. SVD (Singular Value Decomposition) decomposes the user-item rating matrix into latent factors, discovering hidden patterns like "this user likes dark thrillers" and "this movie is a dark thriller" without explicit metadata. User-User KNN finds users with similar rating patterns and recommends movies those similar users enjoyed.

The hybrid fusion layer combines three signals: (1) content-based scores from Phase 3's TF-IDF model, (2) collaborative filtering scores from SVD/KNN, (3) diversity injection picks from outside the user's taste profile. Weights adapt based on user rating count—new users (< 20 ratings) get mostly content-based recommendations, established users (20+ ratings) get balanced hybrid recommendations with collaborative signals. The MovieLens 100K dataset (100,000 ratings, 943 users, 1,682 movies) provides seed data mapped to TMDB IDs.

**Primary recommendation:** Use Surprise library's SVD and KNNWithMeans algorithms, train models offline with combined MovieLens + real user ratings, persist models with joblib, load at FastAPI startup. Implement weighted fusion with adaptive weights (alpha parameter) based on user rating count. Inject 10-20% diversity picks using genre diversity or low-similarity exploration. Retrain models daily via background job to incorporate new ratings.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| scikit-surprise | 1.1.4+ | Collaborative filtering algorithms (SVD, KNN) | De facto standard for CF in Python; built-in cross-validation, multiple algorithms, MovieLens loaders |
| numpy | 1.26+ | Matrix operations, array handling | Required by Surprise; efficient numerical computation |
| pandas | 2.2+ | Data manipulation, rating matrix construction | Standard for tabular data; used for merging MovieLens with TMDB mappings |
| joblib | 1.4+ | Model persistence (save/load trained models) | Recommended by scikit-learn/Surprise; optimized for numpy arrays |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| scipy | 1.12+ | Sparse matrix operations | Used internally by Surprise for efficiency |
| requests | 2.31+ | Download MovieLens dataset | One-time data acquisition |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Surprise | implicit (ALS algorithm) | implicit is faster for implicit feedback (clicks, views) but Surprise better for explicit ratings (1-5 stars); we have explicit ratings |
| Surprise | LightFM | LightFM handles cold start better with metadata but adds complexity; Surprise simpler for MVP, can add LightFM later |
| MovieLens 100K | MovieLens 25M | 25M dataset (25 million ratings) is much larger and slower to train; 100K sufficient for seed data, easier to manage |
| Weighted fusion | Stacked ensemble (meta-learner) | Stacking trains a secondary model to combine predictions; more accurate but adds training complexity; weighted fusion simpler for MVP |
| Offline retraining | Online/incremental learning | Incremental learning updates models with each new rating; more complex, Surprise doesn't support well; daily retraining sufficient for MVP |

**Installation:**
```bash
pip install scikit-surprise pandas
# numpy, joblib already installed from Phase 3
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── ml/
│   ├── __init__.py
│   ├── build_model.py              # Existing: builds TF-IDF (Phase 3)
│   ├── build_collaborative.py      # NEW: trains SVD/KNN on MovieLens + real ratings
│   ├── data/
│   │   ├── ml-100k/                # MovieLens 100K dataset (downloaded)
│   │   └── links.csv               # TMDB ID mappings for MovieLens
│   ├── models/
│   │   ├── tfidf_vectorizer.pkl    # Existing (Phase 3)
│   │   ├── tfidf_matrix.pkl        # Existing (Phase 3)
│   │   ├── movie_ids.pkl           # Existing (Phase 3)
│   │   ├── svd_model.pkl           # NEW: trained SVD model
│   │   ├── knn_model.pkl           # NEW: trained KNN model
│   │   └── cf_trainset.pkl         # NEW: Surprise trainset for predictions
│   └── recommender.py              # UPDATED: add hybrid fusion logic
├── services/
│   └── recommender.py              # UPDATED: call hybrid recommender
└── routers/
    └── recommendations.py          # UPDATED: return hybrid recommendations
```

### Pattern 1: Loading MovieLens Dataset and Mapping to TMDB IDs

**What:** Download MovieLens 100K, load ratings, map MovieLens movie IDs to TMDB IDs using links.csv.

**When to use:** One-time setup before training collaborative models.

**Example:**
```python
# Source: https://grouplens.org/datasets/movielens/100k/
# Source: Surprise Dataset.load_builtin() documentation

import os
import requests
import zipfile
import pandas as pd
from surprise import Dataset

def download_movielens_100k(data_dir: str = "ml/data"):
    """Download and extract MovieLens 100K dataset."""
    os.makedirs(data_dir, exist_ok=True)
    ml_100k_path = os.path.join(data_dir, "ml-100k")

    if os.path.exists(ml_100k_path):
        print("MovieLens 100K already exists")
        return ml_100k_path

    # Download from GroupLens
    url = "http://files.grouplens.org/datasets/movielens/ml-100k.zip"
    zip_path = os.path.join(data_dir, "ml-100k.zip")

    print("Downloading MovieLens 100K...")
    response = requests.get(url)
    with open(zip_path, "wb") as f:
        f.write(response.content)

    # Extract
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(data_dir)

    os.remove(zip_path)
    print(f"MovieLens 100K extracted to {ml_100k_path}")
    return ml_100k_path

def load_movielens_with_tmdb_mapping():
    """
    Load MovieLens 100K ratings and map to TMDB IDs.

    Returns:
        pd.DataFrame with columns: user_id, tmdb_id, rating, timestamp
    """
    # Load MovieLens 100K ratings
    # Format: user_id, item_id, rating, timestamp (tab-separated)
    ml_path = "ml/data/ml-100k/u.data"
    ratings = pd.read_csv(
        ml_path,
        sep="\t",
        names=["user_id", "item_id", "rating", "timestamp"]
    )

    # Load MovieLens to TMDB mappings
    # Download from: https://github.com/recsyspolimi/recsys-challenge-2020-twitter/blob/master/data/movies.csv
    # Or manually create from ml-100k/u.item + TMDB API lookups
    # Format: movieId (MovieLens), tmdbId
    links = pd.read_csv("ml/data/links.csv")

    # Merge to get TMDB IDs
    ratings_tmdb = ratings.merge(
        links,
        left_on="item_id",
        right_on="movieId",
        how="inner"
    )

    # Filter: only keep movies that exist in our TMDB catalog
    # (loaded from Phase 3 tfidf model)
    tmdb_catalog_ids = joblib.load("ml/models/movie_ids.pkl")
    ratings_tmdb = ratings_tmdb[ratings_tmdb["tmdbId"].isin(tmdb_catalog_ids)]

    print(f"Loaded {len(ratings_tmdb)} MovieLens ratings mapped to TMDB IDs")
    return ratings_tmdb[["user_id", "tmdbId", "rating", "timestamp"]]
```

**Notes:**
- MovieLens 100K has 943 users, 1,682 movies, 100,000 ratings (scale 1-5)
- Not all MovieLens movies have TMDB IDs; expect ~70-80% match rate
- Store MovieLens user IDs with negative values (e.g., -1 to -943) to distinguish from real users in Supabase (UUID strings)

### Pattern 2: Training SVD and KNN Models with Surprise

**What:** Use Surprise's SVD and KNNWithMeans algorithms to train collaborative filtering models on combined MovieLens + real user ratings.

**When to use:** Initial model training and daily retraining to incorporate new ratings.

**Example:**
```python
# Source: https://surprise.readthedocs.io/en/stable/matrix_factorization.html
# Source: https://surprise.readthedocs.io/en/stable/knn_inspired.html

from surprise import SVD, KNNWithMeans, Dataset, Reader
from surprise.model_selection import GridSearchCV
import pandas as pd
import joblib

def prepare_surprise_dataset(ratings_df: pd.DataFrame) -> Dataset:
    """
    Convert DataFrame to Surprise Dataset.

    Args:
        ratings_df: DataFrame with columns [user_id, movie_id, rating]

    Returns:
        Surprise Dataset object
    """
    # Define rating scale (1-5 stars)
    reader = Reader(rating_scale=(1, 5))

    # Load from DataFrame
    data = Dataset.load_from_df(
        ratings_df[["user_id", "movie_id", "rating"]],
        reader
    )

    return data

def train_svd_model(ratings_df: pd.DataFrame):
    """Train SVD model with hyperparameter tuning."""
    data = prepare_surprise_dataset(ratings_df)

    # Hyperparameter grid search
    param_grid = {
        'n_factors': [50, 100, 150],      # Latent factor dimensions
        'n_epochs': [20, 30],             # Training iterations
        'lr_all': [0.005, 0.01],          # Learning rate
        'reg_all': [0.02, 0.1]            # Regularization
    }

    gs = GridSearchCV(SVD, param_grid, measures=['rmse', 'mae'], cv=3)
    gs.fit(data)

    # Get best model
    print(f"Best RMSE: {gs.best_score['rmse']:.3f}")
    print(f"Best params: {gs.best_params['rmse']}")

    svd = gs.best_estimator['rmse']

    # Train on full dataset with best params
    trainset = data.build_full_trainset()
    svd.fit(trainset)

    # Save model
    joblib.dump(svd, "ml/models/svd_model.pkl")
    joblib.dump(trainset, "ml/models/cf_trainset.pkl")

    print("SVD model trained and saved")
    return svd

def train_knn_model(ratings_df: pd.DataFrame):
    """Train User-User KNN model."""
    data = prepare_surprise_dataset(ratings_df)

    # KNN configuration
    # user_based=True: User-User collaborative filtering
    # sim_options: similarity metric and options
    sim_options = {
        'name': 'pearson_baseline',  # Pearson correlation with baseline
        'user_based': True,          # User-User (not Item-Item)
        'min_support': 3             # Min common items for similarity
    }

    knn = KNNWithMeans(k=40, sim_options=sim_options)

    # Train on full dataset
    trainset = data.build_full_trainset()
    knn.fit(trainset)

    # Save model
    joblib.dump(knn, "ml/models/knn_model.pkl")

    print("KNN model trained and saved")
    return knn
```

**Key Parameters:**
- **SVD n_factors**: Number of latent factors (50-150). Higher = more expressive but slower, risk of overfitting.
- **SVD n_epochs**: Training iterations (20-30). More epochs improve fit but risk overfitting.
- **SVD lr_all**: Learning rate (0.005-0.01). Higher = faster convergence but less stable.
- **SVD reg_all**: Regularization (0.02-0.1). Higher = less overfitting but underfits data.
- **KNN k**: Number of neighbors (20-50). Higher = smoother predictions but slower.
- **KNN sim_options**: Similarity metric. `pearson_baseline` recommended for better accuracy.

### Pattern 3: Combining MovieLens Seed Data with Real User Ratings

**What:** Merge MovieLens historical ratings (seed data) with real user ratings from Supabase to train collaborative models.

**When to use:** Every time models are retrained (daily or on-demand).

**Example:**
```python
# Source: Custom integration pattern

import pandas as pd
from supabase import create_client

async def get_combined_ratings() -> pd.DataFrame:
    """
    Combine MovieLens seed data with real user ratings.

    Returns:
        DataFrame with columns [user_id, movie_id, rating]
    """
    # 1. Load MovieLens ratings (mapped to TMDB IDs)
    ml_ratings = load_movielens_with_tmdb_mapping()

    # Prefix MovieLens user IDs to distinguish from real users
    # Use string IDs: "ml_1", "ml_2", ... "ml_943"
    ml_ratings["user_id"] = "ml_" + ml_ratings["user_id"].astype(str)
    ml_ratings = ml_ratings.rename(columns={"tmdbId": "movie_id"})
    ml_ratings = ml_ratings[["user_id", "movie_id", "rating"]]

    # 2. Load real user ratings from Supabase
    supabase = create_client(settings.supabase_url, settings.supabase_key)
    real_ratings_response = supabase.table("ratings").select("user_id, movie_id, rating").execute()
    real_ratings = pd.DataFrame(real_ratings_response.data)

    # Convert user_id (UUID) to string
    real_ratings["user_id"] = real_ratings["user_id"].astype(str)

    # 3. Combine datasets
    combined = pd.concat([ml_ratings, real_ratings], ignore_index=True)

    print(f"Combined ratings: {len(ml_ratings)} MovieLens + {len(real_ratings)} real = {len(combined)} total")

    return combined
```

**Important:**
- MovieLens user IDs MUST be distinct from real user IDs (use string prefix like "ml_")
- Only include MovieLens movies that exist in TMDB catalog (from Phase 3 model)
- Real user ratings take precedence if same user-movie pair exists (shouldn't happen)

### Pattern 4: Hybrid Fusion Layer with Adaptive Weights

**What:** Combine content-based scores (Phase 3 TF-IDF) with collaborative filtering scores (SVD/KNN) using adaptive weighted average based on user rating count.

**When to use:** Generating recommendations for any user.

**Example:**
```python
# Source: Weighted hybrid fusion literature
# Source: https://www.researchgate.net/publication/378846446_Weighted_Hybrid_Recommendation_System

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def calculate_alpha(user_rating_count: int) -> float:
    """
    Calculate weight for collaborative filtering based on user rating count.

    Args:
        user_rating_count: Number of ratings user has provided

    Returns:
        alpha: Weight for collaborative filtering (0.0 to 0.7)
               - < 5 ratings: alpha = 0.0 (pure content-based)
               - 5-19 ratings: alpha increases linearly (0.0 to 0.3)
               - 20+ ratings: alpha = 0.7 (collaborative-heavy hybrid)
    """
    if user_rating_count < 5:
        return 0.0  # Cold start: pure content-based
    elif user_rating_count < 20:
        # Gradual transition: 5 ratings -> 0.0, 19 ratings -> 0.3
        return 0.3 * (user_rating_count - 5) / 15
    else:
        # Established user: 70% collaborative, 30% content-based
        return 0.7

def hybrid_recommendations(
    user_id: str,
    user_ratings: list,
    top_n: int = 10,
    diversity_ratio: float = 0.15
):
    """
    Generate hybrid recommendations combining content-based + collaborative filtering.

    Args:
        user_id: User identifier (string UUID or "ml_X")
        user_ratings: List of user's ratings [{movie_id, rating}, ...]
        top_n: Number of recommendations to return
        diversity_ratio: Fraction of exploration picks (0.1-0.2)

    Returns:
        List of recommendations with scores and reasons
    """
    # Load models (cached at startup)
    svd_model = ml_models["svd"]
    knn_model = ml_models["knn"]
    tfidf_matrix = ml_models["tfidf_matrix"]
    vectorizer = ml_models["vectorizer"]
    movie_ids = ml_models["movie_ids"]

    # Get adaptive weight
    alpha = calculate_alpha(len(user_ratings))

    # Get rated movie IDs
    rated_ids = {r["movie_id"] for r in user_ratings}

    # 1. Content-based scores (Phase 3 logic)
    content_scores = get_content_based_scores(
        user_ratings, tfidf_matrix, vectorizer, movie_ids
    )

    # 2. Collaborative filtering scores
    cf_scores = {}
    for movie_id in movie_ids:
        if movie_id in rated_ids:
            continue  # Skip already-rated movies

        # Predict rating using SVD
        pred = svd_model.predict(user_id, movie_id)
        cf_scores[movie_id] = pred.est  # Estimated rating (1-5 scale)

    # Normalize CF scores to 0-1 range (same as content-based cosine similarity)
    cf_min, cf_max = min(cf_scores.values()), max(cf_scores.values())
    cf_scores_norm = {
        mid: (score - cf_min) / (cf_max - cf_min) if cf_max > cf_min else 0.5
        for mid, score in cf_scores.items()
    }

    # 3. Hybrid fusion: weighted average
    hybrid_scores = {}
    for movie_id in movie_ids:
        if movie_id in rated_ids:
            continue

        content_score = content_scores.get(movie_id, 0.0)
        cf_score = cf_scores_norm.get(movie_id, 0.0)

        # Weighted combination: (1 - alpha) * content + alpha * collaborative
        hybrid_scores[movie_id] = (1 - alpha) * content_score + alpha * cf_score

    # 4. Get top recommendations
    sorted_recs = sorted(hybrid_scores.items(), key=lambda x: x[1], reverse=True)

    # 5. Diversity injection: replace bottom 10-20% with exploration picks
    num_explore = int(top_n * diversity_ratio)
    num_exploit = top_n - num_explore

    exploit_recs = sorted_recs[:num_exploit]

    # Exploration: sample from lower-similarity movies or different genres
    explore_recs = get_diversity_picks(
        user_ratings, hybrid_scores, rated_ids, num_explore
    )

    # Combine
    final_recs = exploit_recs + explore_recs

    # Format output
    recommendations = []
    for movie_id, score in final_recs:
        recommendations.append({
            "movie_id": movie_id,
            "score": float(score),
            "reason": get_recommendation_reason(alpha, diversity_ratio)
        })

    return recommendations

def get_recommendation_reason(alpha: float, diversity_ratio: float) -> str:
    """Generate explanation for recommendation source."""
    if alpha == 0.0:
        return "content_based"
    elif alpha < 0.5:
        return "hybrid_content_heavy"
    else:
        return "hybrid_collaborative_heavy"
```

**Fusion Strategy:**
- **Alpha = 0.0** (< 5 ratings): Pure content-based, no collaborative signal
- **Alpha = 0.0-0.3** (5-19 ratings): Gradual transition, more content than collaborative
- **Alpha = 0.7** (20+ ratings): Collaborative-heavy, 70% CF + 30% content-based

**Rationale:**
- Research shows 70% collaborative + 30% content-based works well for established users
- Cold start users benefit more from content-based (metadata-driven)
- Gradual transition prevents jarring changes in recommendations

### Pattern 5: Diversity Injection to Prevent Filter Bubbles

**What:** Inject 10-20% of recommendations from outside the user's established taste profile to encourage exploration and prevent over-personalization.

**When to use:** Always, for all users (even cold start users benefit from genre diversity).

**Example:**
```python
# Source: Filter bubble mitigation literature
# Source: https://arxiv.org/abs/2307.01221

import random

def get_diversity_picks(
    user_ratings: list,
    hybrid_scores: dict,
    rated_ids: set,
    num_picks: int
) -> list:
    """
    Select diverse exploration picks outside user's taste profile.

    Strategies:
    1. Genre diversity: Pick movies from underrepresented genres
    2. Low-similarity exploration: Pick lower-ranked movies with decent scores
    3. Popular serendipity: Mix in popular movies user hasn't rated

    Args:
        user_ratings: User's rating history
        hybrid_scores: Computed hybrid scores for all movies
        rated_ids: Set of movie IDs user has already rated
        num_picks: Number of exploration picks

    Returns:
        List of (movie_id, score) tuples
    """
    # Get user's dominant genres (from their rated movies)
    user_genres = get_user_genre_distribution(user_ratings)

    # Find movies from underrepresented genres
    underrepresented_genres = [
        genre for genre, count in user_genres.items() if count < 2
    ]

    # Candidate pool: mid-ranked movies (50th-80th percentile)
    # These have decent scores but wouldn't make top-N normally
    sorted_scores = sorted(hybrid_scores.items(), key=lambda x: x[1], reverse=True)
    mid_start = int(len(sorted_scores) * 0.5)
    mid_end = int(len(sorted_scores) * 0.8)
    mid_ranked = sorted_scores[mid_start:mid_end]

    # Filter for genre diversity
    diverse_candidates = []
    for movie_id, score in mid_ranked:
        if movie_id in rated_ids:
            continue
        movie_genres = get_movie_genres(movie_id)
        if any(g in underrepresented_genres for g in movie_genres):
            diverse_candidates.append((movie_id, score))

    # Sample exploration picks
    if len(diverse_candidates) >= num_picks:
        return random.sample(diverse_candidates, num_picks)
    else:
        # Fallback: random sample from mid-ranked
        return random.sample(mid_ranked, num_picks)

def get_user_genre_distribution(user_ratings: list) -> dict:
    """Get count of each genre in user's rated movies."""
    genre_counts = {}
    for rating in user_ratings:
        movie_genres = get_movie_genres(rating["movie_id"])
        for genre in movie_genres:
            genre_counts[genre] = genre_counts.get(genre, 0) + 1
    return genre_counts

def get_movie_genres(movie_id: int) -> list:
    """Fetch genres for a movie from TMDB or cached metadata."""
    # Implementation: call TMDB API or query Supabase cache
    # Return list of genre strings: ["Action", "Thriller", "Sci-Fi"]
    pass
```

**Diversity Strategies:**
1. **Genre diversity**: Recommend movies from genres user hasn't explored much
2. **Mid-ranked exploration**: Pick movies from 50th-80th percentile (decent but not top-ranked)
3. **Serendipity**: Mix in popular/trending movies outside user's pattern

**Benefits:**
- Prevents filter bubble (over-specialization)
- Increases recommendation novelty and serendipity
- Improves long-term user engagement vs. accuracy-only approach

### Pattern 6: FastAPI Startup Model Loading

**What:** Load collaborative filtering models (SVD, KNN, trainset) at FastAPI startup using lifespan events, same as Phase 3 TF-IDF models.

**When to use:** Always, to avoid re-loading models on each request.

**Example:**
```python
# Source: https://fastapi.tiangolo.com/advanced/events/

from contextlib import asynccontextmanager
from fastapi import FastAPI
import joblib

ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models at startup
    print("Loading ML models...")

    # Phase 3: Content-based models
    ml_models["vectorizer"] = joblib.load("ml/models/tfidf_vectorizer.pkl")
    ml_models["tfidf_matrix"] = joblib.load("ml/models/tfidf_matrix.pkl")
    ml_models["movie_ids"] = joblib.load("ml/models/movie_ids.pkl")

    # Phase 4: Collaborative filtering models
    ml_models["svd"] = joblib.load("ml/models/svd_model.pkl")
    ml_models["knn"] = joblib.load("ml/models/knn_model.pkl")
    ml_models["cf_trainset"] = joblib.load("ml/models/cf_trainset.pkl")

    print("All models loaded")

    yield

    # Cleanup on shutdown
    ml_models.clear()

app = FastAPI(lifespan=lifespan)
```

### Pattern 7: Daily Model Retraining with Background Jobs

**What:** Retrain collaborative filtering models daily (or weekly) to incorporate new user ratings without blocking API requests.

**When to use:** Production deployment; not necessary during development.

**Example:**
```python
# Source: https://fastapi.tiangolo.com/tutorial/background-tasks/
# Source: Production recommendation system patterns

from fastapi import BackgroundTasks
import asyncio

async def retrain_models_background():
    """
    Background task to retrain collaborative filtering models.

    Should be run via cron job or task queue (Celery, RQ) in production.
    """
    print("Starting model retraining...")

    # 1. Fetch latest ratings (MovieLens + real users)
    combined_ratings = await get_combined_ratings()

    # 2. Retrain SVD
    svd = train_svd_model(combined_ratings)

    # 3. Retrain KNN
    knn = train_knn_model(combined_ratings)

    print("Model retraining complete")

# Option 1: FastAPI BackgroundTasks (for lightweight tasks)
@app.post("/admin/retrain")
async def trigger_retrain(background_tasks: BackgroundTasks):
    """Admin endpoint to trigger model retraining."""
    background_tasks.add_task(retrain_models_background)
    return {"message": "Model retraining started"}

# Option 2: External cron job (recommended for production)
# Run daily at 2 AM: python -c "from backend.ml.build_collaborative import main; main()"
```

**Production Recommendation:**
- Use external job scheduler (cron, Celery, RQ) instead of FastAPI BackgroundTasks
- BackgroundTasks is fine for lightweight operations but collaborative model training can take minutes
- Consider running retraining on separate worker machine to avoid impacting API performance
- Monitor training time and set up alerts if training fails

### Anti-Patterns to Avoid

- **Training models on every recommendation request:** Extremely slow. Train offline, load at startup.
- **Ignoring cold start problem:** SVD cannot predict for users/movies not in training set. Must handle gracefully with content-based fallback.
- **Using same weights for all users:** New users need content-based, established users benefit from collaborative. Use adaptive alpha.
- **No diversity injection:** Leads to filter bubbles and recommendation staleness. Always inject 10-20% exploration.
- **MovieLens IDs conflicting with real user IDs:** Use prefixes ("ml_1") or negative IDs to distinguish seed data from real users.
- **Retraining too frequently:** Daily is sufficient for MVP. Hourly retraining wastes compute and doesn't improve quality meaningfully.
- **Not normalizing scores before fusion:** Content-based cosine similarity (0-1) and CF predicted ratings (1-5) have different scales. Normalize before weighted average.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Matrix factorization (SVD) | Custom gradient descent SVD | Surprise `SVD` class | Handles sparse data, regularization, early stopping, hyperparameter tuning; battle-tested |
| KNN similarity calculation | Manual cosine/Pearson on full matrix | Surprise `KNNWithMeans` | Optimized sparse matrix operations, baseline normalization, configurable similarity metrics |
| Rating matrix construction | Custom pandas pivot + sparse conversion | Surprise `Dataset.load_from_df()` | Handles missing values, validates rating scale, creates trainset automatically |
| Model persistence | Custom pickle with version handling | joblib (same as Phase 3) | Optimized for numpy/scipy, compression, memory mapping |
| Hyperparameter tuning | Manual grid search with loops | Surprise `GridSearchCV` | Parallel cross-validation, automatic metric tracking, best model selection |
| Diversity metrics | Custom genre distribution | Use existing diversity libraries or simple genre counting | Diversity calculation has nuances (coverage, Gini coefficient); start simple, add complexity if needed |

**Key insight:** Collaborative filtering is deceptively complex. Cold start handling, sparse matrix operations, normalization, and hyperparameter tuning all have gotchas. Surprise library has solved these problems with a clean API. Don't rebuild unless you have specific requirements Surprise can't meet.

## Common Pitfalls

### Pitfall 1: Cold Start for New Users/Items in SVD

**What goes wrong:** SVD trained on MovieLens data cannot predict for new real users (UUIDs not in training set). Calling `svd.predict(new_user_uuid, movie_id)` returns default prediction (global mean) with low confidence.

**Why it happens:** Matrix factorization requires latent factors for both user and item. New users have no latent factors until model is retrained.

**How to avoid:**
- Use adaptive alpha: new users (< 5 ratings) get alpha=0.0 (pure content-based)
- Retrain models daily to incorporate new users/ratings into trainset
- For ultra-new users (signed up today), fallback to content-based or popularity

**Warning signs:** All new users get same generic recommendations; hybrid scores look identical to content-based scores.

### Pitfall 2: Score Normalization Mismatch in Fusion

**What goes wrong:** Content-based cosine similarity ranges 0-1. Collaborative filtering predicted ratings range 1-5. Direct weighted average produces meaningless results: `0.3 * 0.8 + 0.7 * 4.2 = 3.18` (what does this mean?).

**Why it happens:** Different scoring scales from different algorithms.

**How to avoid:**
- Normalize CF scores to 0-1 range: `(score - min) / (max - min)`
- Alternatively, normalize content-based to 1-5 scale: `1 + 4 * cosine_sim`
- Ensure both scores represent "how good is this recommendation" on same scale

**Warning signs:** Hybrid recommendations strongly favor one algorithm; fusion weights don't behave as expected.

### Pitfall 3: MovieLens User IDs Colliding with Real User UUIDs

**What goes wrong:** MovieLens user IDs (integers 1-943) might collide with real user UUIDs if not handled carefully. For example, if user UUID happens to be "1", it conflicts with MovieLens user 1.

**Why it happens:** Surprise accepts any user/item ID (int or string). If you don't namespace MovieLens IDs, collisions are possible.

**How to avoid:**
- Prefix MovieLens user IDs: "ml_1", "ml_2", ... "ml_943"
- Use string UUIDs for real users (Supabase default)
- Verify no collisions before training: `assert len(set(user_ids)) == len(user_ids)`

**Warning signs:** Real users get recommendations influenced by MovieLens users' ratings; recommendation quality degrades mysteriously for specific users.

### Pitfall 4: Not Filtering MovieLens Movies to TMDB Catalog

**What goes wrong:** MovieLens 100K has 1,682 movies. Not all have TMDB IDs. Even with mapping, some TMDB IDs don't exist in your Phase 3 catalog (e.g., you only loaded 250 popular movies). Recommending MovieLens movies not in TMDB catalog causes frontend to fail (no poster, no metadata).

**Why it happens:** MovieLens dataset is older (1998); some movies not in modern TMDB, or you filtered TMDB catalog by popularity.

**How to avoid:**
- After mapping MovieLens to TMDB IDs, filter to only movies in Phase 3 `movie_ids.pkl`
- Log movies dropped during filtering for debugging
- Consider expanding Phase 3 catalog if too many MovieLens movies are lost

**Warning signs:** Recommendations include movie IDs that don't exist in frontend; API returns 404 for movie details.

### Pitfall 5: Training on Real User Ratings Only (Ignoring MovieLens)

**What goes wrong:** Collaborative filtering needs many ratings to work well. If only 10 real users have signed up, collaborative filtering is weak (sparse matrix, overfitting).

**Why it happens:** Temptation to use "real data only" instead of seed data.

**How to avoid:**
- Always include MovieLens 100K seed data (100,000 ratings from 943 users)
- Seed data provides density for cold start; real user ratings fine-tune over time
- As real user base grows (1,000+ users), MovieLens becomes less important but still helpful

**Warning signs:** Collaborative filtering performs worse than content-based; recommendations are generic or random-seeming.

### Pitfall 6: Over-Weighting Collaborative Filtering for New Users

**What goes wrong:** User with 5-10 ratings gets alpha=0.5 (50% collaborative), but their CF latent factors are weak (not enough data). Hybrid recommendations are noisy.

**Why it happens:** Collaborative filtering needs 20+ ratings per user to be reliable.

**How to avoid:**
- Use conservative alpha thresholds: alpha=0.0 until 5 ratings, alpha=0.3 until 20 ratings, alpha=0.7 for 20+
- Consider using KNN instead of SVD for users with 5-20 ratings (KNN handles sparse data better)
- Monitor recommendation quality by user rating count segment

**Warning signs:** Users report recommendations get worse after rating 5-10 movies (should improve); success criterion 3 fails.

### Pitfall 7: No Diversity Injection Leading to Filter Bubbles

**What goes wrong:** User who rates 10 action movies only sees action recommendations forever. Recommendations feel stale and predictable.

**Why it happens:** Both content-based and collaborative filtering optimize for similarity/predicted rating. No exploration mechanism.

**How to avoid:**
- Always inject 10-20% diversity picks (success criterion 2 requires this)
- Use genre diversity or mid-ranked exploration strategies
- Monitor recommendation diversity metrics (coverage, Gini coefficient)

**Warning signs:** User feedback "recommendations are repetitive"; users stop engaging with recommendation section.

### Pitfall 8: Surprise Model Incompatibility Across Versions

**What goes wrong:** SVD model trained with scikit-surprise 1.1.3 fails to load or gives wrong predictions with 1.1.4.

**Why it happens:** Surprise uses pickle for model persistence. Internal data structures can change between versions.

**How to avoid:**
- Pin exact scikit-surprise version in `requirements.txt`: `scikit-surprise==1.1.4`
- Save training script alongside model for reproducibility
- Use Docker containers for consistent environments
- Re-train models after upgrading Surprise version

**Warning signs:** `ModuleNotFoundError` or `AttributeError` when loading models; predictions change after dependency upgrade.

## Code Examples

Verified patterns from official sources and production implementations:

### Training SVD with Surprise (Complete Script)

```python
# Source: https://surprise.readthedocs.io/en/stable/matrix_factorization.html

import pandas as pd
from surprise import SVD, Dataset, Reader
from surprise.model_selection import cross_validate
import joblib

def train_svd():
    """Complete script to train SVD on combined MovieLens + real ratings."""

    # 1. Load combined ratings
    print("Loading ratings...")
    ratings_df = load_combined_ratings()  # From Pattern 3
    print(f"Total ratings: {len(ratings_df)}")

    # 2. Create Surprise dataset
    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(ratings_df[["user_id", "movie_id", "rating"]], reader)

    # 3. Cross-validate to check performance
    print("Cross-validating SVD...")
    svd = SVD(n_factors=100, n_epochs=20, lr_all=0.005, reg_all=0.02)
    cv_results = cross_validate(svd, data, measures=['RMSE', 'MAE'], cv=5, verbose=True)

    print(f"Average RMSE: {cv_results['test_rmse'].mean():.3f}")
    print(f"Average MAE: {cv_results['test_mae'].mean():.3f}")

    # 4. Train on full dataset
    print("Training on full dataset...")
    trainset = data.build_full_trainset()
    svd.fit(trainset)

    # 5. Save model
    joblib.dump(svd, "ml/models/svd_model.pkl")
    joblib.dump(trainset, "ml/models/cf_trainset.pkl")

    print("SVD model saved successfully")
    return svd

if __name__ == "__main__":
    train_svd()
```

### Making Predictions with Surprise

```python
# Source: https://surprise.readthedocs.io/en/stable/predictions.html

def predict_rating(user_id: str, movie_id: int, svd_model) -> float:
    """
    Predict rating for user-movie pair.

    Args:
        user_id: User identifier (string)
        movie_id: Movie identifier (int)
        svd_model: Trained Surprise SVD model

    Returns:
        Predicted rating (1-5 scale)
    """
    prediction = svd_model.predict(user_id, movie_id)

    # prediction object has attributes:
    # - est: estimated rating
    # - details: dict with 'was_impossible' flag

    if prediction.details['was_impossible']:
        # Prediction failed (user/item not in trainset)
        # Return global mean or fallback
        return 3.0  # Neutral rating

    return prediction.est
```

### FastAPI Hybrid Recommendation Endpoint

```python
# Source: Integration of Phase 3 + Phase 4 patterns

from fastapi import APIRouter, HTTPException, Depends
from typing import List
import numpy as np

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

@router.get("/", response_model=List[RecommendationResponse])
async def get_hybrid_recommendations(
    user_id: str = Depends(get_current_user),
    top_n: int = 10
):
    """Get hybrid recommendations (content-based + collaborative filtering)."""

    # 1. Fetch user ratings
    ratings_response = supabase.table("ratings")\
        .select("movie_id, rating")\
        .eq("user_id", user_id)\
        .execute()

    ratings = ratings_response.data

    # 2. Cold start fallback (< 5 ratings)
    if len(ratings) < 5:
        popular = await tmdb_service.get_popular(page=1)
        return [
            {"movie_id": m["id"], "score": 0.0, "reason": "popular"}
            for m in popular["results"][:top_n]
        ]

    # 3. Generate hybrid recommendations
    recommendations = hybrid_recommendations(
        user_id=user_id,
        user_ratings=ratings,
        top_n=top_n,
        diversity_ratio=0.15
    )

    return recommendations
```

### Diversity Injection Implementation

```python
# Source: Filter bubble mitigation patterns

import random

def inject_diversity(
    top_recommendations: list,
    all_scores: dict,
    diversity_ratio: float = 0.15
) -> list:
    """
    Replace bottom N recommendations with diverse exploration picks.

    Args:
        top_recommendations: List of (movie_id, score) tuples
        all_scores: Dict of {movie_id: score} for all candidates
        diversity_ratio: Fraction to replace (0.1-0.2)

    Returns:
        Updated list with diversity injection
    """
    n = len(top_recommendations)
    num_diverse = int(n * diversity_ratio)
    num_keep = n - num_diverse

    # Keep top recommendations
    keep = top_recommendations[:num_keep]

    # Sample from mid-ranked for diversity
    sorted_all = sorted(all_scores.items(), key=lambda x: x[1], reverse=True)
    mid_start = int(len(sorted_all) * 0.5)
    mid_end = int(len(sorted_all) * 0.8)
    mid_ranked = sorted_all[mid_start:mid_end]

    diverse = random.sample(mid_ranked, num_diverse)

    return keep + diverse
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pure collaborative filtering | Hybrid systems (CF + content-based) | ~2015 | Better accuracy, handles cold start, reduces filter bubbles |
| Single algorithm (SVD or KNN) | Ensemble of multiple algorithms | ~2018 | Netflix Prize showed ensembles beat single models; complexity tradeoff |
| Accuracy-only optimization | Beyond-accuracy objectives (diversity, serendipity) | ~2020 | Improves long-term engagement vs. short-term accuracy |
| Manual weight tuning | Adaptive/learned weights based on context | ~2021 | Weights vary by user maturity, time of day, etc.; better than static |
| Batch retraining (monthly) | Incremental/online learning (daily) | ~2022 | Recommendations stay fresh without full retraining cost |
| Implicit feedback (clicks) | Explicit ratings preferred when available | Always | Explicit ratings (1-5 stars) are clearer signal than clicks/views |
| Matrix factorization only | Deep learning (NCF, autoencoders) | ~2019+ | Deep models can beat SVD but require more data and compute; MVP uses SVD |

**Deprecated/outdated:**
- **ALS (Alternating Least Squares)**: Still used for implicit feedback but SVD better for explicit ratings
- **Item-Item collaborative filtering**: Memory-based, doesn't scale well; SVD/KNN model-based approaches preferred
- **No diversity mechanisms**: Modern systems always include exploration/diversity injection
- **Static fusion weights**: Adaptive weights based on user context are now standard

## Open Questions

1. **What are optimal fusion weights for this dataset?**
   - What we know: Literature suggests 70% CF + 30% content for established users; needs user rating count threshold
   - What's unclear: Exact alpha curve (linear? sigmoid?) and thresholds (5? 10? 20 ratings?)
   - Recommendation: Start with alpha=0.0 (<5 ratings), alpha=0.3 (5-19), alpha=0.7 (20+). Monitor performance and adjust based on A/B testing in Phase 6+.

2. **How often should collaborative models be retrained?**
   - What we know: Daily retraining is common; more frequent doesn't help much; less frequent causes staleness
   - What's unclear: For MVP with small user base (< 100 users), is weekly sufficient?
   - Recommendation: Daily retraining for MVP. Monitor training time; if < 5 minutes, daily is fine. If > 15 minutes, consider weekly or incremental learning.

3. **Should we use SVD, KNN, or both in fusion?**
   - What we know: SVD (matrix factorization) and KNN (neighborhood-based) capture different patterns. Ensembles often beat single models.
   - What's unclear: Does complexity of dual-model ensemble justify ~10% accuracy gain for MVP?
   - Recommendation: Start with SVD only (simpler). If Phase 4 UAT shows poor performance, add KNN as second model with weighted ensemble.

4. **How to handle MovieLens movies not in TMDB catalog?**
   - What we know: ~20-30% of MovieLens movies may not map to TMDB or not be in Phase 3 catalog
   - What's unclear: Does losing this data significantly hurt collaborative filtering quality?
   - Recommendation: Filter MovieLens to only TMDB catalog movies. Log percentage lost. If > 40% lost, consider expanding Phase 3 catalog to include more movies.

5. **What diversity injection strategy works best?**
   - What we know: Genre diversity, mid-ranked exploration, and popular serendipity are common strategies
   - What's unclear: Which strategy prevents filter bubbles most effectively for this user base?
   - Recommendation: Start with genre diversity (simplest to implement). If success criterion 2 fails in UAT, experiment with mid-ranked exploration.

6. **Should we cache hybrid recommendations?**
   - What we know: Recommendations are expensive to compute (content-based + CF + fusion + diversity). Caching saves compute.
   - What's unclear: Cache invalidation strategy (invalidate on new rating? time-based TTL?)
   - Recommendation: Cache recommendations with 1-hour TTL. Invalidate cache when user rates new movie (same as Phase 3). Balance freshness vs. compute cost.

## Sources

### Primary (HIGH confidence)

- [Surprise Official Documentation](https://surprise.readthedocs.io/en/stable/) - SVD, KNN algorithms, parameters, cross-validation
- [Surprise Matrix Factorization Docs](https://surprise.readthedocs.io/en/stable/matrix_factorization.html) - SVD parameters (n_factors, n_epochs, lr_all, reg_all)
- [Surprise KNN Docs](https://surprise.readthedocs.io/en/stable/knn_inspired.html) - KNN algorithms, sim_options, user_based parameter
- [Surprise Official Website](https://surpriselib.com/) - Library overview, installation, algorithm benchmarks
- [MovieLens Dataset](https://grouplens.org/datasets/movielens/) - Official source for MovieLens 100K, 1M, 25M datasets
- [MovieLens 100K Dataset](https://grouplens.org/datasets/movielens/100k/) - 100K ratings, 943 users, 1,682 movies
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/) - Official docs for background task execution

### Secondary (MEDIUM confidence)

- [Shaped Blog: MovieLens Dataset](https://www.shaped.ai/blog/movielens-dataset-the-essential-benchmark-for-recommender-systems) - Dataset characteristics, usage in recommender systems
- [ScienceDirect: Hybrid Recommendation](https://www.sciencedirect.com/topics/computer-science/hybrid-recommendation) - Hybrid fusion strategies overview
- [Medium: 7 Types of Hybrid Recommendation System](https://medium.com/analytics-vidhya/7-types-of-hybrid-recommendation-system-3e4f78266ad8) - Weighted, switching, cascade, mixed, etc.
- [ResearchGate: Weighted Hybrid Recommendation System](https://www.researchgate.net/publication/378846446_Weighted_Hybrid_Recommendation_System) - Weighted fusion, optimal weights (70% CF + 30% content)
- [ACM: Diversity, Serendipity, Novelty, and Coverage](https://dl.acm.org/doi/10.1145/2926720) - Beyond-accuracy metrics for recommender systems
- [arXiv: Filter Bubbles in Recommender Systems](https://arxiv.org/abs/2307.01221) - Filter bubble problem, diversity injection strategies
- [Wikipedia: Cold Start Problem](https://en.wikipedia.org/wiki/Cold_start_(recommender_systems)) - Overview of cold start challenges
- [ACM: Differentiating Regularization Weights](https://dl.acm.org/doi/10.1145/3285954) - Adaptive constraints for cold start mitigation
- [ScienceDirect: Incremental Collaborative Filtering](https://www.sciencedirect.com/science/article/abs/pii/S0950705111002073) - Incremental learning for CF models
- [Analytics Vidhya: Collaborative Filtering Recommendation System 2026](https://www.analyticsvidhya.com/blog/2026/02/collaborative-filtering-recommendation-system/) - Recent best practices
- [Frontiers: Hybrid Attribute-based Recommender System](https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2024.1404391/full) - Cold start handling with adaptive weights

### Tertiary (LOW confidence - require validation)

- Various Medium and Towards Data Science articles on Surprise implementation examples
- GitHub repositories with Surprise + hybrid recommendation implementations
- Community blog posts on production deployment experiences

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Surprise is de facto standard for CF in Python, well-documented, mature
- Architecture: HIGH - Patterns verified across official docs and production implementations
- Hybrid fusion: MEDIUM-HIGH - Weighted fusion is standard, but optimal alpha curve requires experimentation
- Diversity injection: MEDIUM - Multiple strategies exist; best approach varies by domain
- MovieLens integration: HIGH - Standard practice in recommendation system development

**Research date:** 2026-02-16
**Valid until:** ~60 days (stable domain; Surprise updates infrequently, collaborative filtering is mature field)

**Notes:**
- No CONTEXT.md exists for this phase, so full discretion was available
- Research focused on practical implementation with Surprise library for FastAPI + scikit-learn stack
- Collaborative filtering is well-established (20+ years), low risk of approach changes
- Main variability is in hyperparameters (n_factors, k neighbors) and fusion weights (alpha), which should be tuned with cross-validation
- MovieLens 100K is sufficient for MVP; can upgrade to 1M or 25M if needed for better CF quality
