# Phase 2 Plan 01: User Engagement Foundation Summary

**One-liner:** Supabase schema with RLS policies, StarRating and WatchlistButton components, and TanStack Query hooks with optimistic updates for ratings and watchlist features.

---

## Plan Reference

- **Phase:** 02-user-engagement-cold-start
- **Plan:** 01
- **Plan file:** `.planning/phases/02-user-engagement-cold-start/02-01-PLAN.md`
- **Subsystem:** User Engagement Data Layer
- **Tags:** `supabase`, `database`, `rls`, `react-components`, `tanstack-query`, `optimistic-updates`, `accessibility`

---

## What Was Built

### Database Schema (Supabase Migration)

Created complete user engagement schema with Row Level Security:

**Tables:**
- `profiles` - User profile data (extends auth.users with username, avatar_url)
- `ratings` - Movie ratings (1-5 stars, one per user per movie)
- `watchlist` - Saved movies (one entry per user per movie)
- `viewing_history` - Implicit engagement signals (rated, watchlisted, detail_viewed)

**Security:**
- RLS enabled on all tables
- Policies using `(select auth.uid())` pattern for user-owned data
- Profiles viewable by everyone, but users can only update their own
- Ratings, watchlist, and history fully isolated to owning user

**Automation:**
- `handle_new_user()` trigger auto-creates profile on signup
- Uses `security definer` to bypass RLS during profile creation
- Extracts username and avatar_url from `raw_user_meta_data`

**Performance:**
- Indexes on ALL foreign key columns (ratings.user_id, ratings.movie_id, watchlist.user_id, watchlist.movie_id, viewing_history.user_id, viewing_history.movie_id)
- Indexes on frequently queried columns (created_at desc, action_type)
- Critical because Supabase does NOT auto-create FK indexes

### React Components

**StarRating Component:**
- Full ARIA accessibility (radiogroup pattern)
- Keyboard navigation (Arrow keys, Enter, Space, Escape)
- Three sizes (sm: 16px, md: 24px, lg: 32px)
- Hover states with visual feedback
- Focus management (tabIndex based on current rating)
- Read-only mode support
- Uses Lucide React Star icon

**WatchlistButton Component:**
- Toggle bookmark icon (Bookmark vs BookmarkCheck)
- Optimistic UI feedback (instant state change)
- Loading state during mutation (opacity change)
- Accessible labels ("Add to watchlist" / "Remove from watchlist")
- Three sizes (sm, md, lg)
- Color-coded (green when watchlisted, slate otherwise)

### Supabase Data Layer

**ratings.ts:**
- `getUserRatings()` - Fetch all user ratings
- `getMovieRating(movieId)` - Get rating for specific movie
- `upsertRating(movieId, rating)` - Insert or update rating
- `deleteRating(movieId)` - Remove rating

**watchlist.ts:**
- `getUserWatchlist()` - Fetch all watchlist items
- `isMovieWatchlisted(movieId)` - Check if movie in watchlist
- `addToWatchlist(movieId)` - Add movie
- `removeFromWatchlist(movieId)` - Remove movie
- `toggleWatchlist(movieId)` - Smart toggle based on current state

**profiles.ts:**
- `getProfile()` - Fetch current user profile
- `updateProfile(updates)` - Update username or avatar_url
- `getUserStats()` - Compute aggregated stats (total ratings, average rating, watchlist count)

**history.ts:**
- `trackAction(movieId, actionType)` - Record implicit engagement signals
- `getViewingHistory(limit)` - Fetch recent history entries
- Silently fails for unauthenticated users (optional tracking)

### TanStack Query Hooks

**useRatings.ts:**
- `useMovieRating(movieId)` - Query hook for single movie rating
- `useUserRatings()` - Query hook for all user ratings
- `useRateMovie()` - Mutation hook with full optimistic update pattern:
  - Cancels outgoing queries to prevent overwrite
  - Snapshots previous state for rollback
  - Optimistically updates both `['ratings', movieId]` and `['user-ratings']` caches
  - Rolls back on error
  - Tracks action in viewing_history
  - Only invalidates if last pending mutation (prevents over-invalidation)

**useWatchlist.ts:**
- `useUserWatchlist()` - Query hook for all watchlist items
- `useIsWatchlisted(movieId)` - Query hook for single movie status
- `useToggleWatchlist()` - Mutation hook with optimistic updates:
  - Toggles `['watchlist', movieId]` cache
  - Updates `['user-watchlist']` array (adds or removes item)
  - Tracks action only when adding (not removing)
  - Rollback on error

**useProfile.ts:**
- `useProfile()` - Query hook for user profile
- `useUserStats()` - Query hook for computed stats
- `useUpdateProfile()` - Mutation hook with cache invalidation

---

## Deviations from Plan

None - plan executed exactly as written.

---

## Dependencies

### Requires

- Phase 01 foundation (Supabase client, auth, TanStack Query setup)
- TMDB API integration (movie IDs used as foreign keys)

### Provides

- Database schema for user engagement features
- Reusable StarRating and WatchlistButton components
- Typed data layer functions for all engagement features
- TanStack Query hooks with optimistic updates

### Affects

- Phase 2 Plans 02-04 (taste quiz, profile page, integration) depend on this schema and these components
- Phase 3 recommendation engine will consume ratings and watchlist data
- Phase 4 fusion layer will weight explicit (ratings) and implicit (history) signals

---

## Tech Stack

### Added

- `zod` (latest) - Schema validation (installed for future form validation)
- `lucide-react` (latest) - Icon library (Star, Bookmark, BookmarkCheck icons)

### Patterns Introduced

- **Row Level Security (RLS):** Database-level security using Supabase policies with `auth.uid()`
- **Optimistic Updates:** TanStack Query pattern with cancelQueries, snapshot, rollback, and conditional invalidation
- **Database Triggers:** Auto-profile creation with `security definer` and `set search_path`
- **Implicit Feedback Tracking:** Viewing history for recommendation signals
- **ARIA Accessibility:** Radiogroup pattern for custom star rating component

---

## Key Files

### Created

- `supabase/migrations/20260213_user_engagement.sql` - Complete database schema with RLS, triggers, indexes
- `frontend/src/types/database.ts` - TypeScript interfaces (Profile, Rating, WatchlistItem, ViewingHistoryEntry, UserStats)
- `frontend/src/components/engagement/StarRating.tsx` - Accessible star rating component
- `frontend/src/components/engagement/WatchlistButton.tsx` - Watchlist toggle button
- `frontend/src/lib/supabase/ratings.ts` - Ratings CRUD functions
- `frontend/src/lib/supabase/watchlist.ts` - Watchlist CRUD functions
- `frontend/src/lib/supabase/profiles.ts` - Profile and stats functions
- `frontend/src/lib/supabase/history.ts` - Viewing history tracking functions
- `frontend/src/hooks/useRatings.ts` - TanStack Query hooks for ratings with optimistic updates
- `frontend/src/hooks/useWatchlist.ts` - TanStack Query hooks for watchlist with optimistic updates
- `frontend/src/hooks/useProfile.ts` - TanStack Query hooks for profile

### Modified

- `frontend/package.json` - Added zod and lucide-react dependencies
- `frontend/package-lock.json` - Dependency lockfile updated

---

## Decisions Made

1. **RLS Policy Pattern:** Use `(select auth.uid())` subselect pattern instead of direct `auth.uid()` for better performance per Supabase best practices.

2. **Manual FK Indexing:** Explicitly create indexes on all foreign key columns because Supabase/Postgres does NOT auto-create them. Critical for query performance.

3. **Optimistic Update Strategy:** Implement full cancelQueries + snapshot + rollback pattern with conditional invalidation (`isMutating === 1` check) to prevent over-invalidation from reverting subsequent updates.

4. **Viewing History Tracking:** Track implicit signals (rated, watchlisted, detail_viewed) in mutation hooks for future recommendation engine improvements. Silently fail for unauthenticated users.

5. **Custom Star Component:** Build lightweight custom component (~100 lines) with full accessibility instead of using unmaintained npm packages (react-rating-stars-component last updated 6 years ago).

6. **Profile Stats Computation:** Compute stats client-side by fetching all ratings and calculating average, rather than using Postgres aggregates (simpler, works with Supabase JS client limitations).

7. **Security Definer for Trigger:** Use `security definer set search_path = ''` on handle_new_user() trigger to allow profile creation while preventing search_path exploits.

---

## Verification Results

All verification checks passed:

- Migration SQL contains all tables (profiles, ratings, watchlist, viewing_history)
- RLS enabled on all tables with proper policies
- Trigger function created with security definer
- All FK indexes created (9 total indexes)
- TypeScript compilation passes with no errors
- StarRating has `role="radiogroup"` and full ARIA attributes
- WatchlistButton uses Lucide icons (Bookmark, BookmarkCheck)
- useRatings implements optimistic pattern with `cancelQueries`
- useRatings calls `trackAction` in mutationFn
- All hooks use typed database interfaces (no `any` types)
- lucide-react and zod dependencies installed

---

## Self-Check: PASSED

**Files created:**

```bash
# All files exist
[FOUND] supabase/migrations/20260213_user_engagement.sql
[FOUND] frontend/src/types/database.ts
[FOUND] frontend/src/components/engagement/StarRating.tsx
[FOUND] frontend/src/components/engagement/WatchlistButton.tsx
[FOUND] frontend/src/lib/supabase/ratings.ts
[FOUND] frontend/src/lib/supabase/watchlist.ts
[FOUND] frontend/src/lib/supabase/profiles.ts
[FOUND] frontend/src/lib/supabase/history.ts
[FOUND] frontend/src/hooks/useRatings.ts
[FOUND] frontend/src/hooks/useWatchlist.ts
[FOUND] frontend/src/hooks/useProfile.ts
```

**Commits created:**

```bash
[FOUND] 115a6b6 - feat(02-01): add user engagement database schema and types
[FOUND] 5c795ee - feat(02-01): add engagement components and data layer with optimistic updates
```

---

## Metrics

- **Tasks completed:** 2 of 2
- **Duration:** 3m 9s
- **Files created:** 11
- **Files modified:** 2
- **Lines added:** ~926
- **Commits:** 2
- **Deviations:** 0

---

## Next Steps

- **Plan 02-02:** Build taste quiz onboarding flow with selected movies
- **Plan 02-03:** Create user profile page displaying ratings, watchlist, stats
- **Plan 02-04:** Integrate StarRating and WatchlistButton into browse and detail pages

---

## Notes

- Migration SQL is ready to run but NOT yet executed (user must run via Supabase Dashboard or CLI)
- Components and hooks are built but not yet integrated into pages (Plan 02-04)
- Viewing history tracking is instrumented in hooks but won't collect data until components are integrated
- RLS policies prevent any data access until user is authenticated
- Trigger will auto-create profile on next user signup (existing users need manual profile creation)
