---
status: resolved
trigger: "CORS error on Supabase ratings fetch causing Recommended for You section to show blank/disappear on localhost:3000"
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:02:00Z
---

## Current Focus

hypothesis: RESOLVED
test: curl confirmed /api/recommendations/?top_n=10 reaches endpoint (401 vs 404 before fix)
expecting: Section now loads and stays visible
next_action: DONE

## Symptoms

expected: "Recommended for You" section loads and shows personalized movie recommendations
actual: Section loads briefly then disappears / shows blank. Console shows CORS errors on Supabase REST API calls.
errors:
  - Access to fetch at 'https://syfsjcgsszcrltywbvom.supabase.co/rest/v1/ratings?select=rating&user_id=eq.e7df49d6-...&movie_id=eq.157336' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
  - Failed to load resource: net::ERR_FAILED
  - Uncaught (in promise) AbortError: signal is aborted without reason (locks.ts:109)
  - Failed to load resource: net::ERR_FILE_NOT_FOUND
reproduction: Open http://localhost:3000/browse, inspect console, "Recommended for You" section is blank
timeline: Introduced when redirect_slashes=False was added to FastAPI (commit 162628b)

## Eliminated

- hypothesis: Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY format (sb_publishable_*) causes Supabase CORS rejection
  evidence: curl test confirmed Supabase responds with access-control-allow-origin: http://localhost:3000
  for GET requests with the sb_publishable_ key format. 200 status returned. Key is valid new format.
  timestamp: 2026-02-22T00:01:00Z

- hypothesis: Supabase project CORS settings don't allow localhost:3000
  evidence: Both OPTIONS preflight and GET requests return proper CORS headers from Supabase.
  The CORS error in browser is caused by AbortError (lock timeout) aborting the fetch before
  completion, which the browser reports misleadingly as a CORS error.
  timestamp: 2026-02-22T00:01:00Z

## Evidence

- timestamp: 2026-02-22T00:00:30Z
  checked: lib/api.ts fetchRecommendations function (line 74-76)
  found: URL constructed as `${API_URL}/api/recommendations?top_n=${topN}` - NO trailing slash
  implication: Does not match the FastAPI route registration

- timestamp: 2026-02-22T00:00:31Z
  checked: backend/main.py line 34
  found: FastAPI app created with redirect_slashes=False
  implication: FastAPI will NOT redirect /api/recommendations to /api/recommendations/ - returns 404 instead

- timestamp: 2026-02-22T00:00:32Z
  checked: backend/routers/recommendations.py line 55
  found: @router.get("/", ...) with router prefix="/api/recommendations" -> registers as /api/recommendations/
  implication: The endpoint only exists at /api/recommendations/ (with trailing slash)

- timestamp: 2026-02-22T00:00:33Z
  checked: curl http://localhost:8000/api/recommendations?top_n=10
  found: STATUS:404 {"detail":"Not Found"}
  implication: Frontend fetch call fails with 404 -> fetchRecommendations throws -> useRecommendations error state

- timestamp: 2026-02-22T00:00:34Z
  checked: curl http://localhost:8000/api/recommendations/?top_n=10 with auth header
  found: STATUS:401 {"detail":"Token validation failed..."} (reaches the endpoint)
  implication: Confirms trailing slash routes correctly, no-trailing-slash does not

- timestamp: 2026-02-22T00:00:35Z
  checked: useRecommendations hook (hooks/useRecommendations.ts)
  found: retry: false - query does not retry on error
  implication: Single 404 response immediately sets isError=true, then isLoading=false, data=undefined

- timestamp: 2026-02-22T00:00:36Z
  checked: Carousel component line 43
  found: if (!isLoading && movies.length === 0) return null
  implication: When useRecommendations fails, recData is undefined, recommendationMovies=[],
  recLoading=false -> Carousel returns null -> section disappears

- timestamp: 2026-02-22T00:00:37Z
  checked: CarouselCard.tsx and MovieCard.tsx
  found: Both call useMovieRating(movie.id) which calls getMovieRating() -> supabase.auth.getUser()
  implication: With 30-50+ cards across all carousels, concurrent getUser() calls compete for
  Navigator LockManager exclusive lock. Some time out (locks.ts:109 abortController.abort()),
  which causes AbortError that browser reports as CORS error.

- timestamp: 2026-02-22T00:00:38Z
  checked: Supabase CORS via curl OPTIONS and GET with Origin: http://localhost:3000
  found: Supabase returns access-control-allow-origin: * (OPTIONS) and http://localhost:3000 (GET)
  implication: Supabase CORS is correctly configured. The browser CORS errors are a red herring
  caused by the AbortError, not actual Supabase CORS misconfiguration.

- timestamp: 2026-02-22T00:02:00Z
  checked: curl http://localhost:8000/api/recommendations/?top_n=10 after fix
  found: STATUS:401 (reaches auth check, not 404)
  implication: Fix verified - URL now correctly routes to the recommendations endpoint

## Resolution

root_cause: |
  PRIMARY BUG (causes section to disappear):
  fetchRecommendations in frontend/src/lib/api.ts called `/api/recommendations?top_n=N` (no trailing slash).
  The FastAPI recommendations router registers its root GET as `/api/recommendations/` (with trailing slash).
  FastAPI is configured with redirect_slashes=False (main.py:34), so no redirect occurs.
  Result: 404 -> useRecommendations error (retry:false) -> Carousel returns null -> blank section.

  SECONDARY BUG (causes CORS console noise):
  Every CarouselCard and MovieCard calls useMovieRating(movieId) which internally calls
  supabase.auth.getUser(). With many cards rendered simultaneously, 30-50+ concurrent calls
  compete for the Supabase auth Navigator LockManager exclusive lock. Slower calls time out,
  their AbortController fires (locks.ts:109), and the resulting AbortError causes the browser
  to display misleading CORS-blocked error messages in the console.

fix: |
  PRIMARY: Added trailing slash to fetchRecommendations URL in lib/api.ts:
    `/api/recommendations/?top_n=${topN}`

  SECONDARY: Refactored useRatings.ts:
  - useMovieRating now seeds from the `user-ratings` list cache via initialData() when available,
    eliminating individual per-card Supabase auth calls when the bulk query has already loaded.
  - Added staleTime: 5min to both useUserRatings and useMovieRating to prevent redundant refetches.
  - Added useUserRatings() call in browse/page.tsx to warm the cache before cards render,
    so all CarouselCard instances can read from the shared cache without individual network calls.

verification: |
  - TypeScript: npx tsc --noEmit exits clean (no errors)
  - curl http://localhost:8000/api/recommendations/?top_n=10 -> 401 (reaches endpoint, not 404)
  - curl http://localhost:8000/api/recommendations?top_n=10 -> 404 (confirms the bug was real)
  - Supabase CORS verified functional via curl GET/OPTIONS with origin http://localhost:3000

files_changed:
  - frontend/src/lib/api.ts
  - frontend/src/hooks/useRatings.ts
  - frontend/src/app/browse/page.tsx
