---
phase: 06-netflix-style-ui-discovery
plan: 01
subsystem: ui
tags: [nextjs, react, framer-motion, tanstack-query, tmdb, fastapi]

# Dependency graph
requires:
  - phase: 01-foundation-data-infrastructure
    provides: TMDB API service, MovieDetail types, getImageUrl helper, Next.js app structure
  - phase: 02-user-engagement-cold-start
    provides: Navbar component, layout patterns
provides:
  - Cinematic homepage hero section with featured movie backdrop, title, synopsis, genre tags, and CTAs
  - GET /api/movies/featured backend endpoint returning curated movie details
  - useFeaturedMovie TanStack Query hook (30-minute staleTime)
  - fetchFeaturedMovie API function in api.ts
  - HeroSection component with framer-motion animations and YouTube trailer embed
affects: [06-02, 06-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Curated featured content via random.choice from hand-picked movie ID list"
    - "Route registration order: /featured before /{movie_id} to prevent FastAPI routing ambiguity"
    - "Conditional YouTube trailer embed toggled via React state below hero section"
    - "Triple gradient overlay pattern (bottom fade + left fade) for hero readability over backdrop"
    - "AnimatePresence for graceful trailer embed show/hide transitions"

key-files:
  created:
    - frontend/src/components/home/HeroSection.tsx
    - frontend/src/hooks/useFeaturedMovie.ts
  modified:
    - frontend/src/app/page.tsx
    - frontend/src/lib/api.ts
    - backend/routers/movies.py

key-decisions:
  - "Curated featured movie list: Inception, Interstellar, Dark Knight, Dune, Spider-Verse, Oppenheimer (random.choice each request)"
  - "Trailer embed appears below hero (state toggle) rather than modal overlay for simplicity"
  - "Watch Trailer button hidden when no YouTube Trailer type video found in movie videos"
  - "Backend restarted (no --reload flag) to pick up route changes"

patterns-established:
  - "HeroSection: full-viewport backdrop + dual gradient overlays + framer-motion fade-in-up content"
  - "Featured movie hook: 30-minute staleTime to avoid excessive re-renders on hero movie change"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 6 Plan 01: Homepage Hero Section Summary

**Netflix-style cinematic homepage hero with TMDB backdrop, animated title/synopsis/genres, YouTube trailer embed, and backend /api/movies/featured endpoint serving curated movies via random selection**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-18T02:28:56Z
- **Completed:** 2026-02-18T02:31:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Replaced placeholder homepage with full-bleed cinematic hero section using TMDB backdrop images
- Added `GET /api/movies/featured` FastAPI endpoint returning curated movie details (Inception, Interstellar, Dark Knight, Dune, Spider-Verse, Oppenheimer)
- Created `HeroSection` component with framer-motion fade-in-up animations, genre tags, synopsis, and dual CTA buttons
- Watch Trailer button toggles an animated YouTube iframe embed below the hero (hidden if no trailer available)
- Homepage is fully responsive: text 4xl -> 6xl, hero height 70vh -> 80vh at md breakpoint

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend featured movie endpoint + frontend API/hook** - `78e6c93` (feat)
2. **Task 2: Cinematic hero section component + homepage layout** - `b882587` (feat)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified
- `backend/routers/movies.py` - Added FEATURED_MOVIE_IDS list and GET /featured endpoint (registered before /{movie_id})
- `frontend/src/lib/api.ts` - Added fetchFeaturedMovie() async function
- `frontend/src/hooks/useFeaturedMovie.ts` - TanStack Query hook, queryKey ['featured-movie'], staleTime 30 minutes
- `frontend/src/components/home/HeroSection.tsx` - Cinematic hero with backdrop, gradients, animated content, trailer embed
- `frontend/src/app/page.tsx` - Replaced placeholder with Navbar + HeroSection + Browse CTA section

## Decisions Made
- **Curated movie list**: Used random.choice from 6 visually striking films (Inception, Interstellar, Dark Knight, Dune, Spider-Verse, Oppenheimer) - same approach avoids stale content while keeping editorial curation
- **Trailer embed placement**: State-toggled section below hero (not a modal) for implementation simplicity and better UX on mobile
- **Watch Trailer button**: Conditionally rendered only when a YouTube Trailer type video is present in movie.videos.results
- **Backend restart**: uvicorn was running without --reload; killed and restarted process to pick up route changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Backend uvicorn process was running without `--reload` flag, so the new `/featured` route was not picked up by hot reload. Required killing the process (PID 26148) and restarting to register the new endpoint before the `/{movie_id}` wildcard route. Resolved cleanly.

## User Setup Required

None - no external service configuration required. TMDB API key was already configured.

## Next Phase Readiness
- Hero section complete, homepage transformed from placeholder to cinematic landing experience
- Ready for Phase 6 Plan 02: Movie Rows / Discovery Carousels below the hero
- No blockers

---
*Phase: 06-netflix-style-ui-discovery*
*Completed: 2026-02-17*
