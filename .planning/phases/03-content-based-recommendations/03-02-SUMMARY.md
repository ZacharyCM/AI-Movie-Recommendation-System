---
phase: 03-content-based-recommendations
plan: 02
subsystem: frontend/recommendations-ui
tags: [frontend, recommendations, tanstack-query, react, ui-components]
dependency_graph:
  requires:
    - phase-03-plan-01 (recommendation endpoint, TF-IDF model)
    - phase-02-user-engagement (ratings hook, MovieCard component)
  provides:
    - RecommendationSection component
    - useRecommendations hook
    - fetchRecommendations API client
  affects:
    - Browse page (adds recommendations section)
    - User engagement loop (recommendations refresh after ratings)
tech_stack:
  added:
    - TanStack Query (recommendations caching)
  patterns:
    - Horizontal scroll layout with fixed-width cards
    - Strategy-based rendering (content_based vs popularity_fallback)
    - Silent error handling (hide section if backend unavailable)
    - Cache invalidation on rating mutation settle
    - Loading skeleton cards
key_files:
  created:
    - frontend/src/lib/api.ts (fetchRecommendations function, types)
    - frontend/src/hooks/useRecommendations.ts (TanStack Query hook)
    - frontend/src/components/recommendations/RecommendationSection.tsx (UI component)
  modified:
    - frontend/src/app/browse/page.tsx (added RecommendationSection)
    - frontend/src/hooks/useRatings.ts (added recommendations invalidation)
    - frontend/src/app/globals.css (added scrollbar-hide utility)
decisions:
  - choice: "Silent error handling (return null on error)"
    reason: "Don't break browse experience if recommendation backend is down or model not loaded. Better to show nothing than an error."
  - choice: "5-minute stale time, no retry"
    reason: "Recommendations don't change unless user rates something (which triggers invalidation). Avoid retry on auth errors or 503 model-not-ready."
  - choice: "Strategy-based title rendering"
    reason: "Be honest with users: 'Popular Right Now' for popularity fallback, 'Recommended for You' for content-based. Include prompt to rate more movies for cold-start users."
  - choice: "Fixed-width cards (180px) with horizontal scroll"
    reason: "Consistent card sizing, touch-friendly scrolling, visually distinct from main grid below."
  - choice: "Invalidate on mutation settle, inside isMutating check"
    reason: "Reuse existing pattern from useRatings. Only invalidate after last pending rating mutation to prevent redundant fetches during rapid rating."
  - choice: "Map Recommendation to Movie type for MovieCard"
    reason: "Reuse existing MovieCard component. Set missing fields (genre_ids, vote_count, backdrop_path) to safe defaults."
metrics:
  duration: "3m 8s"
  tasks_completed: 2
  files_created: 3
  files_modified: 3
  commits: 2
  completed_at: "2026-02-16"
---

# Phase 03 Plan 02: Recommendation UI Integration Summary

**One-liner:** Frontend recommendation UI with horizontal scroll section, loading states, cold-start fallback messaging, and automatic refresh after ratings.

## What Was Built

**fetchRecommendations API Client (lib/api.ts):**
- `Recommendation` interface: movie_id, title, poster_path, overview, vote_average, release_date, score, reason
- `RecommendationList` interface: recommendations array, strategy ("content_based" or "popularity_fallback"), total_ratings
- `fetchRecommendations(accessToken, topN)`: Fetches from `/api/recommendations?top_n={topN}` with Bearer token auth

**useRecommendations Hook (hooks/useRecommendations.ts):**
- TanStack Query hook with `['recommendations']` query key
- Gets Supabase session, extracts access_token, passes to fetchRecommendations
- Config: enabled=true, staleTime=5 minutes, retry=false
- Returns { data, isLoading, isError } for UI consumption

**RecommendationSection Component (components/recommendations/RecommendationSection.tsx):**
- Client component with four rendering states:
  1. **Error state**: Returns null (silently hide -- don't break browse page)
  2. **Loading state**: Shows "Recommended for You" title + 5 skeleton cards (180px fixed width, 2/3 aspect ratio, gray pulsing animation)
  3. **Empty content_based**: Shows "We're still learning your taste. Keep rating movies!" message
  4. **Content state**: Renders based on strategy:
     - `content_based`: Title "Recommended for You", horizontal scroll of MovieCards
     - `popularity_fallback`: Title "Popular Right Now", subtitle "Rate 5+ movies to get personalized recommendations", horizontal scroll of MovieCards
- Horizontal scroll: `overflow-x-auto`, `gap-4`, `scrollbar-hide` class
- Maps `Recommendation[]` to `Movie[]` for MovieCard compatibility (sets genre_ids=[], vote_count=0, backdrop_path=null)

**Browse Page Integration (app/browse/page.tsx):**
- `<RecommendationSection />` rendered ABOVE search bar and movie grid
- No props needed (component is self-contained, fetches own data)
- Existing search, pagination, and grid functionality unchanged

**Cache Invalidation (hooks/useRatings.ts):**
- Added `queryClient.invalidateQueries({ queryKey: ['recommendations'] })` to `onSettled` callback
- Placed inside existing `isMutating({ mutationKey: ['ratings'] }) === 1` check
- Ensures recommendations re-fetch after last pending rating mutation, preventing redundant fetches during rapid rating

**Scrollbar Styling (app/globals.css):**
- Added `.scrollbar-hide` utility class
- Hides scrollbar across browsers (Chrome/Safari webkit, Firefox scrollbar-width, IE/Edge -ms-overflow-style)
- Maintains scroll functionality

## Task Breakdown

### Task 1: API Client, Hook, and RecommendationSection Component
- **Duration:** ~2 minutes
- **Actions:**
  - Added `Recommendation`, `RecommendationList` interfaces and `fetchRecommendations()` function to api.ts
  - Created `useRecommendations.ts` hook with TanStack Query, Supabase session extraction, 5-min stale time
  - Created `RecommendationSection.tsx` with loading/error/empty/content states, strategy-based rendering
  - Added `.scrollbar-hide` utility to globals.css
- **Verification:** TypeScript compilation successful, all imports valid
- **Commit:** 13d6d91

### Task 2: Integrate Recommendations into Browse Page and Wire Cache Invalidation
- **Duration:** ~1 minute
- **Actions:**
  - Imported and rendered `<RecommendationSection />` in browse page above search/grid
  - Added recommendations invalidation to `useRatings` onSettled callback
  - Verified invalidation is inside existing isMutating check
- **Verification:** TypeScript compilation successful, grep confirms all integrations present
- **Commit:** b4065bf

## Deviations from Plan

None - plan executed exactly as written.

## Technical Highlights

**Error Resilience:**
- Silent error handling (return null) prevents broken browse experience if backend is unavailable
- No retry on errors avoids spamming backend with failed auth or 503 model-not-ready requests

**Cache Strategy:**
- 5-minute stale time: Recommendations don't change unless user rates something
- Manual invalidation on rating mutation ensures immediate refresh
- Invalidation inside isMutating check prevents redundant fetches during rapid rating sequences

**Strategy-Based UX:**
- Honest labeling: "Popular Right Now" vs "Recommended for You"
- Cold-start messaging: "Rate 5+ movies to get personalized recommendations"
- Empty state messaging: "We're still learning your taste. Keep rating movies!"

**Component Reuse:**
- Maps backend `Recommendation` type to frontend `Movie` type
- Reuses existing `MovieCard` component (no duplication)
- Safe defaults for missing fields (genre_ids=[], vote_count=0, backdrop_path=null)

**Horizontal Scroll UX:**
- Fixed-width cards (180px) for consistent sizing
- Hidden scrollbar with `scrollbar-hide` utility
- Touch-friendly scrolling (overflow-x-auto)
- Visual separation from main grid (mb-8 spacing)

## Testing Notes

**Verified:**
- ✓ TypeScript compilation passes without errors
- ✓ fetchRecommendations function exists in api.ts with correct signature
- ✓ useRecommendations hook exists with TanStack Query
- ✓ RecommendationSection imports MovieCard and useRecommendations
- ✓ Browse page includes RecommendationSection component
- ✓ useRatings onSettled includes recommendations invalidation
- ✓ scrollbar-hide utility added to globals.css

**Not yet verified (requires running app):**
- Content-based recommendations display for users with 5+ ratings
- Popularity fallback display for cold-start users (< 5 ratings)
- Loading skeleton animation
- Horizontal scroll behavior
- Cache invalidation after rating a movie
- Error state handling (backend down or 503)
- Clickable recommendation cards navigate to movie detail pages

## Next Steps

1. **Start backend server:** Ensure FastAPI running with recommendation endpoint
2. **Build TF-IDF model:** Run `cd backend && python -m ml.build_model` if not already done
3. **Test recommendation flow:**
   - Visit /browse as user with < 5 ratings → verify popularity fallback
   - Rate 5 movies → verify switch to content-based recommendations
   - Rate another movie → verify recommendations refresh
4. **Verify visual design:** Check horizontal scroll, skeleton animation, card sizing
5. **UAT (Phase 3 Plan 3):** Full end-to-end testing of recommendation flow

## Files Changed

**Created (3):**
- frontend/src/lib/api.ts (fetchRecommendations function and types)
- frontend/src/hooks/useRecommendations.ts
- frontend/src/components/recommendations/RecommendationSection.tsx

**Modified (3):**
- frontend/src/app/browse/page.tsx
- frontend/src/hooks/useRatings.ts
- frontend/src/app/globals.css

## Self-Check

**Files:**
- ✓ frontend/src/lib/api.ts
- ✓ frontend/src/hooks/useRecommendations.ts
- ✓ frontend/src/components/recommendations/RecommendationSection.tsx

**Commits:**
- ✓ Task 1 commit (13d6d91)
- ✓ Task 2 commit (b4065bf)

**Result:** PASSED - All files and commits verified.
