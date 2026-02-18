---
phase: quick-1
plan: 1
subsystem: frontend-search
tags: [search, ux, navbar, browse, debounce, suspense]
dependency_graph:
  requires: []
  provides: [live-search-from-navbar, search-results-at-top-of-browse]
  affects: [frontend/src/components/layout/Navbar.tsx, frontend/src/app/browse/page.tsx]
tech_stack:
  added: []
  patterns: [debounced-url-update, suspense-boundary-for-useSearchParams, conditional-section-visibility]
key_files:
  created: []
  modified:
    - frontend/src/components/layout/Navbar.tsx
    - frontend/src/app/browse/page.tsx
    - frontend/src/app/browse/layout.tsx
    - frontend/src/app/page.tsx
    - frontend/src/app/profile/page.tsx
    - frontend/src/app/movies/[id]/page.tsx
decisions:
  - "Debounce via useRef(NodeJS.Timeout) to avoid stale closure issues; 300ms matches existing SearchBar pattern"
  - "router.replace on /browse (live typing), router.push from other pages (cross-page navigation needs history entry)"
  - "Suspense wraps Navbar at every call site — useSearchParams in Navbar requires Suspense boundary for Next.js SSR prerendering to succeed"
  - "BrowsePageContent inner component pattern: Suspense wraps inner component, outer default export stays clean"
metrics:
  duration: "8m 6s"
  completed: "2026-02-17"
  tasks: 2
  files: 6
---

# Quick Task 1: Consolidate Search Bars — Summary

**One-liner:** Navbar search upgraded to 300ms debounced live filtering via URL ?q= param; browse page restructured to show search results prominently at top with carousels hidden during search; bottom SearchBar removed; Suspense boundaries added to all Navbar consumers to fix Next.js prerender error.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Upgrade Navbar search to live debounced filtering | c246898 | Navbar.tsx, browse/layout.tsx, page.tsx, profile/page.tsx, movies/[id]/page.tsx |
| 2 | Show search results at top of browse page, remove bottom search bar | b579ce3 | browse/page.tsx |

## What Was Built

### Task 1 — Live Debounced Navbar Search

The Navbar search input now updates the URL (`?q=`) on every keystroke with a 300ms debounce, removing the need to press Enter. Key behaviors:

- `useRef<NodeJS.Timeout>` manages the debounce timer, clearing previous timeouts on each keystroke
- On `/browse`: uses `router.replace` (avoids polluting browser history during live typing)
- On other pages: uses `router.push` (creates a history entry for back-navigation)
- A clear button (X) appears when there is an active query, resetting both local state and the URL to `/browse`
- `FormEvent` import removed; form `onSubmit` now just prevents default

### Task 2 — Browse Page Restructuring

The browse page was reorganized so search results appear first, carousels second:

- `{searchQuery && <section>...</section>}` renders the results section with a heading ("Search results for '...'") and movie count at the very top
- `{!searchQuery && <>MoodSelector + carousels</>}` hides discovery UI when search is active
- Pagination moved into the search results section
- `SearchBar` component import removed; `handleSearch` function removed
- `BrowsePageContent` inner component wraps all state/hooks; exported `BrowsePage` wraps it in `<Suspense>`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added Suspense boundaries to all Navbar consumers**
- **Found during:** Task 1 verification (npm run build)
- **Issue:** `useSearchParams()` in Navbar requires a Suspense boundary in the component tree above it. Without this, Next.js throws a prerender error for every page that renders `<Navbar />` without Suspense. This was a pre-existing bug that became a hard build failure.
- **Fix:**
  - `browse/layout.tsx`: `<Suspense><Navbar /></Suspense>`
  - `app/page.tsx` (home): `<Suspense><Navbar /></Suspense>`
  - `profile/page.tsx`: both `<Navbar />` render sites wrapped in `<Suspense>`
  - `movies/[id]/page.tsx`: `<Navbar />` wrapped in `<Suspense>`
  - `browse/page.tsx`: `BrowsePageContent` (which uses `useSearchParams`) extracted into a named inner component and wrapped in `<Suspense>` in the default export
- **Files modified:** 5 additional files beyond the 2 originally scoped
- **Commits:** c246898, b579ce3

## Verification Results

- [x] `SearchBar` import removed from `browse/page.tsx`
- [x] `handleSearch` function removed from `browse/page.tsx`
- [x] `debounceRef` and `handleChange` present in `Navbar.tsx`
- [x] `{searchQuery && ...}` section appears before `{!searchQuery && ...}` in browse JSX
- [x] `npm run build` passes with 0 TypeScript errors, 0 prerender errors

## Self-Check: PASSED

Files confirmed to exist:
- `/Users/zacharym/netflixrecs/frontend/src/components/layout/Navbar.tsx` — FOUND
- `/Users/zacharym/netflixrecs/frontend/src/app/browse/page.tsx` — FOUND

Commits confirmed:
- `c246898` (task 1) — FOUND
- `b579ce3` (task 2) — FOUND
