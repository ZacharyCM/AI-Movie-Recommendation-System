---
phase: 06-netflix-style-ui-discovery
plan: 02
subsystem: ui
tags: [react, framer-motion, carousel, lucide-react, tanstack-query, tmdb, horizontal-scroll]

# Dependency graph
requires:
  - phase: 06-01
    provides: Homepage hero section and browse page foundation with MovieCard/MovieGrid
  - phase: 02-01
    provides: StarRating and WatchlistButton engagement components
  - phase: 04-02
    provides: Recommendation engine providing personalized movie lists
tech-stack:
  added: []
  patterns:
    - "whileInView framer-motion stagger pattern: each card animates opacity/y with Math.min(index * 0.05, 0.5) delay cap"
    - "Carousel navigation: useRef scroll container, track scroll position with state to show/hide arrows"
    - "Genre endpoint registered before /{movie_id} catch-all (same pattern as /search and /featured)"
    - "useMoviesByGenre hook returns {data, isLoading} for direct destructuring in browse page"

provides:
  - "GET /api/movies/genre/{genre_id} endpoint via TMDB discover/movie"
  - "Carousel component: horizontal scroll with framer-motion stagger, nav arrows, loading skeletons"
  - "CarouselCard component: compact poster card with title overlay and engagement controls"
  - "useMoviesByGenre hook: TanStack Query with 10-min staleTime"
  - "fetchMoviesByGenre API function"
  - "Browse page: 5 carousel rows (Trending, Recommended, Action, Sci-Fi, Thrillers) + full catalog below"
affects:
  - "06-03 (Mood Discovery): can add new Carousel rows using same pattern"

key-files:
  created:
    - frontend/src/components/movies/Carousel.tsx
    - frontend/src/components/movies/CarouselCard.tsx
    - frontend/src/hooks/useMoviesByGenre.ts
  modified:
    - frontend/src/app/browse/page.tsx
    - frontend/src/lib/api.ts
    - backend/routers/movies.py
    - backend/services/tmdb.py

key-decisions:
  - "whileInView instead of animate for stagger: cards only animate when scrolled into view (viewport once: true)"
  - "Math.min(index * 0.05, 0.5) delay cap prevents long waits on large carousels"
  - "Carousel arrow visibility uses group-hover/carousel Tailwind pattern for smooth UX"
  - "CarouselCard shows engagement overlay only on md+ screens to avoid mobile clutter"
  - "Browse page reuses popular movies query (queryKey: ['movies', '', 1]) as Trending row - no new endpoint needed"
  - "RecommendationSection removed from browse page; recommendations now shown via Carousel component directly"

patterns-established:
  - "Genre endpoint: TMDBService.discover_by_genre registered before catch-all /{movie_id}"
  - "Carousel section layout: space-y-6 rows inside section, then border-t divider before catalog"

# Metrics
duration: 2m 13s
completed: 2026-02-17
---

# Phase 6 Plan 02: Horizontal Scroll Carousels Summary

**Netflix-style horizontal scroll carousels with framer-motion whileInView stagger animations, organizing browse page into 5 genre rows (Trending, Recommended, Action, Sci-Fi, Thrillers) above the full catalog grid.**

## Performance

- **Duration:** 2m 13s
- **Started:** 2026-02-18T02:34:32Z
- **Completed:** 2026-02-18T02:36:45Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Carousel component with framer-motion `whileInView` stagger animations, left/right navigation arrows (hide when at scroll boundary), responsive card sizing, and loading skeleton state
- CarouselCard component: compact 2:3 poster with title overlay on hover, engagement controls (star rating + watchlist) on md+ screens only
- GET /api/movies/genre/{genre_id} endpoint using TMDB discover/movie, registered before /{movie_id} catch-all
- Browse page restructured: 5 horizontal carousel rows above the original search+grid+pagination catalog

## Task Commits

Each task was committed atomically:

1. **Task 1: Genre endpoint + Carousel component with stagger animations** - `964a543` (feat)
2. **Task 2: Restructure browse page with carousel rows** - `52f9d8b` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `frontend/src/components/movies/Carousel.tsx` - Horizontal scroll carousel with framer-motion stagger, nav arrows, skeleton loading (114 lines)
- `frontend/src/components/movies/CarouselCard.tsx` - Compact poster card for carousels with engagement overlay
- `frontend/src/hooks/useMoviesByGenre.ts` - TanStack Query hook returning `{data, isLoading}` for genre movies
- `frontend/src/lib/api.ts` - Added `fetchMoviesByGenre` function
- `frontend/src/app/browse/page.tsx` - Restructured with 5 carousel rows + catalog section (143 lines)
- `backend/routers/movies.py` - Added `GET /genre/{genre_id}` endpoint
- `backend/services/tmdb.py` - Added `discover_by_genre` method

## Decisions Made
- Used `whileInView` instead of `animate` so cards animate when they enter viewport (better for wide carousels)
- Capped stagger delay at `Math.min(index * 0.05, 0.5)` to prevent multi-second waits on 20-card carousels
- Reused `fetchMovies(1)` query for "Trending Now" row (no new endpoint needed - popular movies serve as trending)
- Removed `RecommendationSection` and replaced with direct `Carousel` usage in browse page

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Carousel component is fully reusable - Phase 6 Plan 03 (Mood Discovery) can add new rows by importing Carousel with any Movie[]
- /api/movies/genre/{genre_id} available for mood-based filtering if needed
- Browse page layout is stable for adding additional sections

## Self-Check: PASSED

Files verified:
- FOUND: frontend/src/components/movies/Carousel.tsx
- FOUND: frontend/src/components/movies/CarouselCard.tsx
- FOUND: frontend/src/app/browse/page.tsx
- FOUND: frontend/src/hooks/useMoviesByGenre.ts
- FOUND: frontend/src/lib/api.ts
- FOUND: backend/routers/movies.py
- FOUND: backend/services/tmdb.py

Commits verified:
- 964a543: Task 1 - genre endpoint and Carousel component
- 52f9d8b: Task 2 - browse page restructured

Build verified: `npx next build` compiled successfully with zero TypeScript errors.

---
*Phase: 06-netflix-style-ui-discovery*
*Completed: 2026-02-17*
