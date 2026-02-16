---
phase: 04-collaborative-filtering-hybrid-fusion
plan: 01
subsystem: ml
tags: [scikit-surprise, svd, collaborative-filtering, movielens, pandas, joblib]

# Dependency graph
requires:
  - phase: 03-content-based-recommendations
    provides: "TF-IDF catalog (movie_ids.pkl) for filtering MovieLens ratings"
provides:
  - "Trained SVD collaborative filtering model (svd_model.pkl)"
  - "Surprise trainset for CF predictions (cf_trainset.pkl)"
  - "MovieLens 100K seed data download and TMDB mapping utilities"
  - "Combined MovieLens + real user ratings pipeline"
affects: [04-collaborative-filtering-hybrid-fusion, hybrid-recommendations]

# Tech tracking
tech-stack:
  added: [scikit-surprise==1.1.4, pandas>=2.2.0]
  patterns: [MovieLens seed data, collaborative filtering with SVD, graceful Supabase fallback]

key-files:
  created:
    - backend/ml/download_movielens.py
    - backend/ml/build_collaborative.py
    - backend/ml/models/svd_model.pkl
    - backend/ml/models/cf_trainset.pkl
    - backend/ml/data/ml-100k/u.data
    - backend/ml/data/links.csv
  modified:
    - backend/requirements.txt

key-decisions:
  - "Used MovieLens 100K for seed data to enable CF recommendations from day one"
  - "Filtered MovieLens ratings to only movies in TF-IDF catalog to prevent phantom movie IDs"
  - "Prefixed MovieLens user IDs with 'ml_' to prevent collision with real UUIDs"
  - "Combined MovieLens seed data (1389 ratings) with real Supabase ratings (19) for hybrid training"
  - "SVD hyperparameters: 100 factors, 20 epochs, lr=0.005, reg=0.02"
  - "Graceful Supabase fallback - script works even if Supabase not configured"

patterns-established:
  - "MovieLens download scripts are idempotent - check for cached data before downloading"
  - "ML model builders follow same pattern as build_model.py (sync/async, logging, error handling)"
  - "Model artifacts saved to ml/models/ directory alongside TF-IDF models"
  - "Real user ratings fetched from Supabase if available, empty DataFrame if not"

# Metrics
duration: 3m 30s
completed: 2026-02-16
---

# Phase 04 Plan 01: SVD Collaborative Filtering Foundation Summary

**SVD collaborative filtering model trained on MovieLens 100K seed data (1389 ratings) + real Supabase ratings (19), achieving RMSE 0.964 for 647 users on 21 movies**

## Performance

- **Duration:** 3m 30s
- **Started:** 2026-02-16T17:02:03Z
- **Completed:** 2026-02-16T17:05:33Z
- **Tasks:** 2
- **Files modified:** 3 (created 2, modified 1)

## Accomplishments
- MovieLens 100K dataset downloaded and mapped to TMDB IDs (100K ratings → 1389 after filtering to catalog)
- SVD collaborative filtering model trained with 100 factors, achieving RMSE 0.964 (+/- 0.055) on 3-fold CV
- Combined MovieLens seed data with 19 real Supabase ratings for hybrid training dataset
- Model artifacts persisted (svd_model.pkl: 576 KB, cf_trainset.pkl: 48 KB) ready for hybrid fusion layer

## Task Commits

Each task was committed atomically:

1. **Task 1: MovieLens download and TMDB mapping** - `0db01ec` (feat)
2. **Task 2: SVD model training script** - `0d9bd39` (feat)

## Files Created/Modified

### Created
- `backend/ml/download_movielens.py` - Downloads MovieLens 100K and ml-latest-small links.csv, maps ratings to TMDB IDs, filters to TF-IDF catalog
- `backend/ml/build_collaborative.py` - Trains SVD model on combined MovieLens + real ratings, runs cross-validation, saves model artifacts
- `backend/ml/models/svd_model.pkl` - Trained SVD model (576 KB, 100 factors)
- `backend/ml/models/cf_trainset.pkl` - Surprise trainset for making predictions (48 KB)
- `backend/ml/data/ml-100k/u.data` - MovieLens 100K ratings (1.9 MB, 100K ratings)
- `backend/ml/data/links.csv` - MovieLens to TMDB ID mappings (193 KB, 9734 mappings)

### Modified
- `backend/requirements.txt` - Added scikit-surprise==1.1.4 and pandas>=2.2.0

## Decisions Made

**MovieLens seed data strategy:**
- Used MovieLens 100K instead of larger datasets for faster iteration and build times
- Filtered to only movies in TF-IDF catalog (260 movies) to prevent phantom movie IDs in recommendations
- This resulted in 1389 ratings from 645 users on 12 movies - small but sufficient for initial CF
- Prefixed MovieLens user IDs with "ml_" to prevent collision with real Supabase UUIDs

**SVD hyperparameters:**
- 100 factors (good balance of accuracy vs. overfitting for small dataset)
- 20 epochs (fast training, ~1 second on full dataset)
- lr_all=0.005, reg_all=0.02 (standard regularization to prevent overfitting)
- Skipped GridSearchCV for build speed - hyperparameters can be tuned later if needed

**Hybrid training approach:**
- Combined MovieLens seed data with real Supabase ratings (19 found)
- Graceful fallback if Supabase not configured (development/CI environments)
- Script continues with MovieLens-only if Supabase fetch fails

**Mapping approach:**
- Downloaded ml-latest-small links.csv (MovieLens ID → TMDB ID) instead of manual title matching
- This covers most ML-100K movies (80,380 of 100K ratings have TMDB mappings)
- Final catalog filter reduces to 1389 ratings on 12 movies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Small overlap between MovieLens and TF-IDF catalog:**
- Only 12 of 260 catalog movies have MovieLens ratings (4.6% overlap)
- This is expected - TF-IDF catalog uses current popular movies, MovieLens 100K is from 1998
- 1389 ratings is sufficient for initial CF model training
- As real users rate more movies, the CF model will improve naturally
- Considered acceptable tradeoff for fast iteration vs. downloading larger MovieLens datasets

## User Setup Required

None - no external service configuration required. MovieLens data downloads automatically on first run.

## Next Phase Readiness

**Ready for Plan 02 (Hybrid Fusion Layer):**
- SVD model artifacts (svd_model.pkl, cf_trainset.pkl) are loadable and tested
- Model can predict ratings for user-movie pairs (sanity check passed)
- Training pipeline is reusable (can retrain as real user ratings accumulate)

**Model quality:**
- RMSE 0.964 is reasonable for a small dataset (1408 ratings)
- 3-fold cross-validation shows stable performance (std dev 0.055)
- Prediction sanity check: actual 4.0 → predicted 3.93

**Known limitations:**
- Small training dataset (only 12 overlapping movies between MovieLens and catalog)
- Cold start problem for new users (will rely on TF-IDF content-based fallback)
- Fusion layer (Plan 02) will address these by blending CF + content-based signals

---
*Phase: 04-collaborative-filtering-hybrid-fusion*
*Completed: 2026-02-16*

## Self-Check: PASSED

All files and commits verified:
- ✓ backend/ml/download_movielens.py
- ✓ backend/ml/build_collaborative.py
- ✓ backend/ml/models/svd_model.pkl
- ✓ backend/ml/models/cf_trainset.pkl
- ✓ backend/ml/data/ml-100k/u.data
- ✓ backend/ml/data/links.csv
- ✓ Commit 0db01ec (Task 1)
- ✓ Commit 0d9bd39 (Task 2)
