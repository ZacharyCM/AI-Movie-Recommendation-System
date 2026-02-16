---
phase: 04-collaborative-filtering-hybrid-fusion
plan: 02
subsystem: ml-api-frontend
tags: [hybrid-fusion, adaptive-weighting, diversity-injection, collaborative-filtering, content-based]

# Dependency graph
requires:
  - phase: 04-collaborative-filtering-hybrid-fusion
    plan: 01
    provides: "SVD model artifacts (svd_model.pkl, cf_trainset.pkl)"
  - phase: 03-content-based-recommendations
    provides: "TF-IDF content-based recommendation system"
provides:
  - "Hybrid recommendation pipeline combining content-based + collaborative filtering"
  - "Adaptive fusion weights based on user rating count (alpha 0.0-0.7)"
  - "Diversity injection (10-20% exploration picks)"
  - "Updated API returning hybrid strategy metadata"
  - "Frontend handling four strategy types"
affects: [recommendations, user-experience, cold-start-handling]

# Tech tracking
tech-stack:
  added: []
  patterns: [adaptive-weighting, exploration-exploitation-tradeoff, dependency-injection]

key-files:
  created:
    - backend/dependencies.py
  modified:
    - backend/services/recommender.py
    - backend/main.py
    - backend/routers/recommendations.py
    - backend/schemas/recommendation.py
    - frontend/src/components/recommendations/RecommendationSection.tsx

key-decisions:
  - "Alpha (CF weight) calculated adaptively: 0.0 for <5 ratings, 0.0-0.3 for 5-19 ratings, 0.7 for 20+ ratings"
  - "Diversity injection from 50th-80th percentile (mid-ranked movies) to prevent filter bubbles"
  - "Hybrid scores computed as: (1 - alpha) * content_score + alpha * cf_score"
  - "Fallback to content-based if hybrid returns empty (graceful degradation)"
  - "Created dependencies.py module to avoid circular imports between main.py and routers"
  - "Frontend shows 'Powered by users with similar taste' subtitle only for collaborative-heavy strategy"
  - "Strategy field expands to four types: popularity_fallback, content_based, hybrid_content_heavy, hybrid_collaborative_heavy"

patterns-established:
  - "Dependency injection pattern for shared service instances (dependencies.py)"
  - "Adaptive algorithm selection based on user data availability"
  - "Graceful fallback chains: hybrid → content-based → popularity"
  - "Diversity injection using percentile-based sampling"

# Metrics
duration: 3m 54s
completed: 2026-02-16
---

# Phase 04 Plan 02: Hybrid Fusion Layer Summary

**JWT auth with refresh rotation using jose library**

## Performance

- **Duration:** 3m 54s
- **Started:** 2026-02-16T17:09:08Z
- **Completed:** 2026-02-16T17:13:03Z
- **Tasks:** 2
- **Files modified:** 6 (created 1, modified 5)

## Accomplishments
- Integrated SVD collaborative filtering into recommendation pipeline with adaptive fusion weights
- Users with 20+ ratings get collaborative-heavy recommendations (alpha=0.7, 70% CF + 30% content)
- Users with 5-19 ratings get content-heavy hybrid (alpha=0.0-0.3, gradual transition)
- Users with <5 ratings continue to receive popularity fallback (unchanged)
- Diversity injection adds 10-20% exploration picks from mid-ranked movies (50th-80th percentile)
- API endpoint returns strategy metadata (content_based, hybrid_content_heavy, hybrid_collaborative_heavy)
- Frontend displays appropriate titles and subtitles for each strategy type
- Fixed circular import issue by introducing dependencies.py module

## Task Commits

Each task was committed atomically:

1. **Task 1: Hybrid fusion in RecommenderService** - `798bca3` (feat)
2. **Task 2: Update API and UI for hybrid strategies** - `4b91a1c` (feat)

## Files Created/Modified

### Created
- `backend/dependencies.py` - Shared service instances for dependency injection, avoids circular imports

### Modified
- `backend/services/recommender.py` - Added hybrid_recommendations(), calculate_alpha(), get_cf_scores(), get_diversity_picks(), load_collaborative_model(), is_collaborative_loaded()
- `backend/main.py` - Lifespan loads both TF-IDF and SVD models, imports from dependencies.py
- `backend/routers/recommendations.py` - Calls hybrid_recommendations for 5+ ratings users, returns strategy metadata
- `backend/schemas/recommendation.py` - Updated docstrings to include hybrid strategy types
- `frontend/src/components/recommendations/RecommendationSection.tsx` - Handles four strategy types, shows collaborative subtitle

## Decisions Made

**Adaptive fusion weighting (alpha calculation):**
- Cold start (<5 ratings): alpha = 0.0 (pure content-based, same as popularity fallback trigger)
- Warm users (5-19 ratings): alpha = 0.0 to 0.3 (linear interpolation, content-heavy hybrid)
- Established users (20+ ratings): alpha = 0.7 (collaborative-heavy hybrid, CF dominates)
- This progressive weighting prevents cold-start CF predictions from overfitting or using global mean

**Diversity injection strategy:**
- Sample from 50th-80th percentile of hybrid scores (mid-ranked candidates)
- Defaults to 15% exploration picks (1-2 out of 10 recommendations)
- Prevents filter bubbles and increases serendipity
- Uses random.sample for true randomness (not deterministic top-N)

**Graceful degradation chain:**
- Hybrid fails or returns empty → fall back to content-based
- Content-based fails or user has no high ratings → fall back to popularity
- Each layer provides progressively simpler but working recommendations

**Circular import fix:**
- Created dependencies.py module to hold shared service instances
- main.py and routers both import from dependencies.py (no circular path)
- Follows FastAPI best practices for dependency injection
- Similar to how movies router creates its own TMDBService instance, but centralized

**Frontend strategy handling:**
- Four strategy types: popularity_fallback, content_based, hybrid_content_heavy, hybrid_collaborative_heavy
- Only collaborative-heavy shows subtitle "Powered by users with similar taste"
- All personalized strategies (content + hybrids) use same title "Recommended for You"
- Empty state handling unified for content-based and hybrid strategies

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Circular import between main.py and routers/recommendations.py**
- **Found during:** Task 2 verification
- **Issue:** recommendations.py imported recommender_service from main, but main imports routers. Python circular import error on startup.
- **Fix:** Created dependencies.py module to hold shared service instances. Both main.py and routers import from dependencies.py (no circular path).
- **Files modified:** backend/dependencies.py (created), backend/main.py, backend/routers/recommendations.py
- **Commit:** Included in Task 2 commit (4b91a1c)

## Issues Encountered

None - plan executed smoothly after fixing circular import.

## User Setup Required

None - hybrid fusion layer uses existing SVD model from Plan 01. No external service configuration required.

## Next Phase Readiness

**Ready for Phase 04 completion:**
- Hybrid recommendation pipeline working end-to-end (model → API → frontend)
- All four strategy types tested (popularity_fallback, content_based, hybrid_content_heavy, hybrid_collaborative_heavy)
- Adaptive weighting based on user rating count (0.0 → 0.3 → 0.7)
- Diversity injection working (50th-80th percentile sampling)
- Graceful fallback chain in place

**API backward compatibility:**
- RecommendationListResponse schema unchanged (only strategy string values expanded)
- Frontend handles all strategy types (new and old)
- Existing content-based flow still works for users without CF model loaded

**Model integration complete:**
- SVD model loads at startup alongside TF-IDF models
- Both is_loaded() and is_collaborative_loaded() provide clear status
- CF predictions handle missing users gracefully (was_impossible flag → neutral fallback)

**Known limitations:**
- Small CF training dataset (1389 ratings on 12 overlapping movies) means many CF predictions fall back to global mean
- As more real users rate movies, CF quality will improve naturally
- Alpha weighting formula is heuristic-based (not optimized via A/B testing)
- Diversity ratio hardcoded at 15% (could be made configurable in future)

---
*Phase: 04-collaborative-filtering-hybrid-fusion*
*Completed: 2026-02-16*

## Self-Check: PASSED

All files and commits verified:
- ✓ backend/dependencies.py
- ✓ backend/services/recommender.py
- ✓ backend/main.py
- ✓ backend/routers/recommendations.py
- ✓ backend/schemas/recommendation.py
- ✓ frontend/src/components/recommendations/RecommendationSection.tsx
- ✓ Commit 798bca3 (Task 1)
- ✓ Commit 4b91a1c (Task 2)
