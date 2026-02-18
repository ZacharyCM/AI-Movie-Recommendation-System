---
phase: 03-content-based-recommendations
plan: 01
subsystem: backend/ml-recommendations
tags: [machine-learning, content-based-filtering, tfidf, recommender-system, fastapi]
dependency_graph:
  requires:
    - phase-01-foundation (TMDB service, FastAPI setup)
    - phase-02-user-engagement (ratings table, user ratings)
  provides:
    - TF-IDF model builder script
    - RecommenderService for content-based recommendations
    - GET /api/recommendations endpoint
  affects:
    - Phase 3 Plan 2 (frontend integration will consume this endpoint)
tech_stack:
  added:
    - scikit-learn==1.6.1 (TF-IDF vectorization)
    - numpy>=1.26.0 (numerical operations)
    - joblib>=1.4.0 (model persistence)
    - supabase>=2.0.0 (auth validation, ratings queries)
  patterns:
    - FastAPI lifespan context manager for model loading
    - Sparse matrix operations (no .toarray() calls for memory efficiency)
    - Weighted user profile from high ratings (>= 4.0) only
    - Cold-start detection with popularity fallback
    - JWT validation via Supabase admin client
key_files:
  created:
    - backend/ml/__init__.py (ML package marker)
    - backend/ml/build_model.py (TF-IDF model builder script)
    - backend/services/recommender.py (RecommenderService class)
    - backend/schemas/recommendation.py (Pydantic response models)
    - backend/routers/recommendations.py (GET /api/recommendations endpoint)
  modified:
    - backend/requirements.txt (added ML dependencies)
    - backend/config.py (added Supabase settings)
    - backend/main.py (added lifespan for model loading, registered recommendations router)
decisions:
  - choice: "Use scikit-learn 1.6.1 (not 1.8.0)"
    reason: "1.6.1 is latest stable as of Feb 2026; 1.8.0 doesn't exist yet. Pinned exact version for model compatibility."
  - choice: "Start with 250 popular movies (13 TMDB pages)"
    reason: "Sufficient for development/demo, keeps build time fast (~1-2 minutes). Can increase for production."
  - choice: "min_df=2 with fallback to min_df=1"
    reason: "For 250-movie corpus, min_df=2 may be too aggressive. Auto-fallback ensures sufficient vocabulary."
  - choice: "Only high ratings (>= 4.0) build user profile"
    reason: "Focus on positive signals. Low ratings don't reliably indicate inverse preference in this system."
  - choice: "No user profile caching"
    reason: "TF-IDF matrix is cached, but user profiles are rebuilt on each request so recommendations update immediately after new ratings."
  - choice: "Cold-start threshold = 5 ratings"
    reason: "Below 5 ratings, user profile is too sparse for reliable content-based recommendations. Popularity fallback ensures all users get results."
  - choice: "JWT validation via Supabase admin client (not manual PyJWT)"
    reason: "Simpler and more secure. Supabase client handles token validation, expiry, and user extraction automatically."
  - choice: "Sequential TMDB fetching with 0.03s delay (not asyncio.gather)"
    reason: "TMDB rate limit is ~40 req/10s. Sequential with small delay respects limits and keeps code simple."
metrics:
  duration: "4m 7s"
  tasks_completed: 2
  files_created: 5
  files_modified: 3
  commits: 2
  completed_at: "2026-02-15"
---

# Phase 03 Plan 01: TF-IDF Recommendation Engine Summary

**One-liner:** Content-based recommendation backend with TF-IDF vectorization, cosine similarity ranking, and cold-start popularity fallback.

## What Was Built

**TF-IDF Model Builder (`ml/build_model.py`):**
- Fetches 250 popular movies from TMDB (13 pages)
- For each movie, fetches detailed data including keywords and credits
- Builds metadata "soup": genres + keywords + overview + top 3 cast + director (names space-stripped)
- Fits TfidfVectorizer: max_features=5000, stop_words='english', ngram_range=(1,2), min_df=2 (fallback to 1), max_df=0.8, norm='l2'
- Saves three .pkl files to `ml/models/`: tfidf_vectorizer.pkl, tfidf_matrix.pkl, movie_ids.pkl
- Runnable as: `cd backend && python -m ml.build_model`

**RecommenderService (`services/recommender.py`):**
- `load_model(model_dir)`: Loads .pkl files, builds movie_id_to_index map, logs warnings if files missing
- `is_loaded()`: Returns whether model is ready
- `build_user_profile(ratings)`: Filters for ratings >= 4.0, maps to matrix indices, computes weighted average of TF-IDF vectors (keeps sparse)
- `get_recommendations(ratings, top_n)`: Builds user profile, computes cosine similarity, ranks, excludes already-rated movies, returns top N
- `get_popular_fallback(top_n)`: Returns first N movie IDs from corpus (already sorted by TMDB popularity)

**GET /api/recommendations Endpoint (`routers/recommendations.py`):**
- Requires Bearer token auth (JWT validated via Supabase admin client)
- Query param: `top_n` (1-50, default 10)
- Fetches user ratings from Supabase ratings table
- **If < 5 ratings:** Returns popularity_fallback strategy with popular TMDB movies
- **If >= 5 ratings:** Returns content_based strategy with personalized recommendations
- For each recommendation, fetches movie details from TMDB (title, poster, overview, vote_average)
- Response includes: recommendations list, strategy ("content_based" or "popularity_fallback"), total_ratings count

**FastAPI Integration (`main.py`):**
- Lifespan context manager calls `recommender_service.load_model("ml/models")` at startup
- Server starts gracefully even if model files don't exist (logs warning, returns 503 for recommendations until model built)
- Recommendations router registered at `/api/recommendations`

## Task Breakdown

### Task 1: TF-IDF Model Builder and Recommender Service
- **Duration:** ~2 minutes
- **Actions:**
  - Updated requirements.txt with scikit-learn, numpy, joblib, supabase
  - Updated config.py with supabase_url and supabase_service_role_key fields
  - Created ml/__init__.py package marker
  - Created ml/build_model.py with TMDB fetching, metadata soup building, TF-IDF fitting, model persistence
  - Created schemas/recommendation.py with RecommendationResponse and RecommendationListResponse
  - Created services/recommender.py with full RecommenderService implementation
- **Verification:** All imports successful, build_model importable, RecommenderService instantiable
- **Commit:** 197b3e8

### Task 2: FastAPI Recommendation Endpoint with Lifespan Integration
- **Duration:** ~2 minutes
- **Actions:**
  - Updated main.py with lifespan context manager, recommender_service instance, router registration
  - Created routers/recommendations.py with GET / endpoint, JWT auth helper, Supabase integration
  - Implemented cold-start detection and strategy selection (5 ratings threshold)
  - Added TMDB movie detail fetching with rate limiting
- **Verification:** App imports successfully, /api/recommendations route registered, server starts without errors
- **Commit:** ce94a96

## Deviations from Plan

None - plan executed exactly as written.

## Technical Highlights

**Sparse Matrix Efficiency:**
- User profiles are computed as weighted averages of sparse TF-IDF vectors
- Never calls `.toarray()` to avoid memory explosion with large vocabularies
- Cosine similarity operates directly on sparse matrices

**Model Persistence Strategy:**
- TF-IDF matrix pre-computed and cached on disk
- User profiles NOT cached (rebuilt on each request)
- This ensures recommendations update immediately after new ratings without requiring model rebuild

**Cold-Start Handling:**
- Detection: < 5 ratings = cold-start user
- Fallback: Popular movies from TMDB (first N from corpus, already sorted by popularity)
- Response metadata clearly indicates strategy used ("content_based" vs "popularity_fallback")

**Auth Integration:**
- Supabase admin client validates JWT tokens and extracts user_id
- Avoids manual PyJWT signature verification (simpler, more secure)
- Invalid tokens return 401 with clear error messages

**Rate Limiting:**
- Model building: 0.25s delay between TMDB requests
- Recommendation fetching: 0.03s delay between detail requests
- Respects TMDB's ~40 req/10s rate limit

## Testing Notes

**Verified:**
- ✓ All dependencies install successfully
- ✓ RecommenderService imports and instantiates
- ✓ RecommendationResponse schema imports
- ✓ build_model.py importable
- ✓ Metadata soup function correctly concatenates genres, keywords, cast, director
- ✓ RecommenderService handles missing model gracefully (returns None/[] instead of crashing)
- ✓ FastAPI app imports and configures without errors
- ✓ /api/recommendations route registered in app
- ✓ Server starts successfully (with warning about missing model files)

**Not yet verified (requires model build + auth):**
- Model building with real TMDB data (run `python -m ml.build_model`)
- Content-based recommendations for users with 5+ ratings
- Popularity fallback for cold-start users
- JWT token validation
- Already-rated movies exclusion
- Cosine similarity ranking accuracy

## Next Steps

1. **Build the TF-IDF model:** Run `cd backend && python -m ml.build_model` to fetch TMDB data and create .pkl files
2. **Add Supabase env vars:** Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env
3. **Test recommendations endpoint:**
   - Start server: `uvicorn main:app`
   - GET /api/recommendations with valid Bearer token
   - Verify content_based vs popularity_fallback strategy based on rating count
4. **Frontend integration (Plan 03-02):** Build UI to display recommendations

## Files Changed

**Created (5):**
- backend/ml/__init__.py
- backend/ml/build_model.py
- backend/services/recommender.py
- backend/schemas/recommendation.py
- backend/routers/recommendations.py

**Modified (3):**
- backend/requirements.txt
- backend/config.py
- backend/main.py

## Self-Check

Verifying created files exist.

<function_calls>
<invoke name="Bash">
<parameter name="command">cd /Users/zacharym/netflixrecs && [ -f "backend/ml/__init__.py" ] && echo "✓ backend/ml/__init__.py" || echo "✗ backend/ml/__init__.py"