---
phase: 02-user-engagement-cold-start
plan: 02
subsystem: user-engagement
tags:
  - ui-integration
  - engagement
  - viewing-history
  - ratings
  - watchlist

dependency-graph:
  requires:
    - 02-01-PLAN.md (User Engagement Foundation)
  provides:
    - MovieCard with hover-based engagement overlays
    - MovieDetail with rating and watchlist controls
    - Implicit engagement tracking via detail_viewed action
  affects:
    - frontend/src/components/movies/MovieCard.tsx
    - frontend/src/components/movies/MovieDetail.tsx
    - frontend/src/app/movies/[id]/page.tsx

tech-stack:
  added: []
  patterns:
    - Hover overlays for engagement controls
    - Event propagation prevention to avoid navigation conflicts
    - Fire-and-forget tracking for implicit signals
    - Optional movieId prop pattern for component flexibility

key-files:
  created: []
  modified:
    - frontend/src/components/movies/MovieCard.tsx
    - frontend/src/components/movies/MovieDetail.tsx
    - frontend/src/app/movies/[id]/page.tsx

decisions:
  - title: "Hover-based engagement on MovieCard"
    rationale: "Keeps card clean by default, reveals controls on hover to avoid cluttering grid view"
  - title: "Event propagation prevention with preventDefault + stopPropagation"
    rationale: "Card is wrapped in Link, so engagement buttons need both preventDefault and stopPropagation to prevent navigation"
  - title: "Personal rating replaces TMDB rating in card footer"
    rationale: "Shows user their own rating when available, making cards personalized to their taste"
  - title: "Fire-and-forget detail_viewed tracking"
    rationale: "Viewing history is implicit signal, shouldn't block rendering if tracking fails"

metrics:
  duration: "2m 9s"
  tasks_completed: 2
  files_modified: 3
  commits: 2
  completed_at: "2026-02-14"
---

# Phase 02 Plan 02: UI Integration Summary

**One-liner:** Integrated rating and watchlist controls into browse grid cards and detail pages with implicit view tracking.

## Overview

This plan successfully integrated the engagement components built in 02-01 into the existing MovieCard and MovieDetail views. Users can now rate and bookmark movies from both the browse grid (via hover overlay) and detail pages (in the backdrop section). Detail page views are automatically tracked as implicit engagement signals for the future recommendation engine.

## Completed Tasks

### Task 1: Add StarRating and WatchlistButton to MovieCard

**What was done:**
- Imported StarRating and WatchlistButton components
- Added `useMovieRating` and `useRateMovie` hooks to fetch and update ratings
- Created hover overlay with semi-transparent dark background (bg-slate-900/80)
- Positioned StarRating (size="sm") and WatchlistButton (size="sm") in overlay at bottom of poster
- Added `preventDefault()` and `stopPropagation()` on overlay click handler to prevent Link navigation
- Replaced TMDB vote_average in card footer with user's personal rating when available (shows "Your: ★ 4")

**Files modified:**
- `frontend/src/components/movies/MovieCard.tsx`

**Commit:** `9722709`

**Verification:**
- TypeScript compilation passed
- Confirmed StarRating and WatchlistButton imports
- Confirmed preventDefault usage
- Confirmed useMovieRating and useRateMovie hook usage

### Task 2: Add engagement controls to MovieDetail and track detail views

**What was done:**

**MovieDetail component:**
- Imported StarRating and WatchlistButton components
- Imported `useMovieRating` and `useRateMovie` hooks
- Added optional `movieId: number` prop to MovieDetailProps
- Added engagement controls row in backdrop section below metadata line
- Shows StarRating (size="md") with user's current rating
- Shows WatchlistButton (size="md") next to rating
- Displays "Rate this movie" label when unrated, or "Your rating: X/5" when rated

**Detail page:**
- Imported `trackAction` from history lib
- Imported `useEffect` from React
- Added useEffect hook to track 'detail_viewed' action on page load
- Wrapped tracking in try/catch as fire-and-forget operation (doesn't block rendering)
- Passed `movieId={Number(id)}` prop to MovieDetail component

**Files modified:**
- `frontend/src/components/movies/MovieDetail.tsx`
- `frontend/src/app/movies/[id]/page.tsx`

**Commit:** `93a12a5`

**Verification:**
- TypeScript compilation passed
- Confirmed StarRating and WatchlistButton imports in MovieDetail
- Confirmed trackAction and useEffect imports in detail page
- Confirmed detail_viewed tracking fires on page load

## Deviations from Plan

None - plan executed exactly as written.

## Technical Highlights

**Event handling pattern:** The MovieCard hover overlay uses both `preventDefault()` and `stopPropagation()` because the card is wrapped in a Next.js Link component. This prevents navigation when users interact with rating/watchlist controls.

**Personal rating display:** When a user has rated a movie, the card footer shows "Your: ★ 4" instead of the TMDB vote_average. This provides personalized feedback and makes the browse grid more meaningful.

**Fire-and-forget tracking:** The detail_viewed tracking is wrapped in a try/catch block and doesn't await the promise. This ensures that tracking failures (e.g., user not authenticated) don't block page rendering or cause errors.

**Component flexibility:** MovieDetail accepts an optional `movieId` prop, allowing it to work with both the movie object's ID and an externally provided ID. This pattern makes the component more flexible for different use cases.

## Integration Points

**From 02-01 (User Engagement Foundation):**
- StarRating component (accessible, keyboard navigable, 5-star rating)
- WatchlistButton component (toggle bookmark with optimistic updates)
- useMovieRating hook (fetch user's rating for a movie)
- useRateMovie hook (upsert rating with optimistic updates and history tracking)
- useToggleWatchlist hook (add/remove from watchlist)
- trackAction function (log implicit engagement signals)

**Affects future plans:**
- 02-03 (Taste Quiz) and 02-04 (Onboarding) will benefit from the rating UI being visible throughout the app
- Phase 04 (Recommendation Engine) will use viewing_history data collected by detail_viewed tracking

## Verification Results

**TypeScript compilation:** Passed
**Runtime testing:** Not performed (plan type: execute, autonomous: true)
**All tasks completed:** Yes (2/2)
**All commits created:** Yes (2 commits)

## Self-Check: PASSED

**Created files exist:** N/A (no new files created)

**Modified files exist:**
```
FOUND: frontend/src/components/movies/MovieCard.tsx
FOUND: frontend/src/components/movies/MovieDetail.tsx
FOUND: frontend/src/app/movies/[id]/page.tsx
```

**Commits exist:**
```
FOUND: 9722709 (Task 1)
FOUND: 93a12a5 (Task 2)
```

All files modified and all commits verified.

## Next Steps

The next plan in this phase is **02-03-PLAN.md (Taste Quiz)**, which will build a multi-step quiz to help new users rate a selection of popular movies across different genres. This will provide initial data for the cold start problem, giving new users a personalized experience from day one.
