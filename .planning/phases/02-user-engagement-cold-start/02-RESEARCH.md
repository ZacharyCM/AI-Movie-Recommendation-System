# Phase 2: User Engagement & Cold Start - Research

**Researched:** 2026-02-13
**Domain:** User engagement features (ratings, watchlist, profiles) + cold start onboarding with Supabase, React, TanStack Query
**Confidence:** HIGH

## Summary

Phase 2 implements interactive user engagement features (star ratings, watchlist, viewing history, user profiles) and solves the cold start problem through a taste quiz onboarding flow. The technical stack builds on the existing Next.js 16 + Supabase + TanStack Query foundation established in Phase 1.

**Key technical challenges:** (1) Supabase database schema design for user-owned data with proper RLS policies, (2) Optimistic UI updates for instant feedback on ratings/watchlist changes, (3) Taste quiz movie selection strategy for cold start problem, (4) Database indexing strategy for foreign keys and frequently queried columns.

The standard approach uses Supabase Row Level Security for data isolation, TanStack Query mutations with optimistic updates for UI responsiveness, and a custom star rating component (avoiding heavyweight libraries). Database triggers auto-create user profiles on signup. The taste quiz presents 5-10 popular, genre-diverse movies to gather initial preference signals.

**Primary recommendation:** Use Supabase RLS policies with `auth.uid()` for all user-owned data tables, implement optimistic updates with TanStack Query's `onMutate` callback for instant UI feedback, build a lightweight custom star rating component, and create database indexes on all foreign key columns manually.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/ssr | 0.8.0 | Supabase client with SSR support | Already used in Phase 1, handles cookie-based auth correctly in Next.js App Router |
| @tanstack/react-query | 5.90.21 | Server state management, mutations | Already used in Phase 1, provides optimistic updates pattern |
| Supabase Postgres | Latest | Database with RLS, triggers, functions | Built-in auth integration, row-level security, real-time capabilities |
| Next.js Server Actions | 16.1.6 | Form mutations, server-side operations | Native to Next.js App Router, eliminates API routes for simple mutations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | Latest | Schema validation | Validate form inputs in Server Actions before DB writes |
| Lucide React | Latest | Icon library (stars, bookmark, user) | Lightweight SVG icons, already common in Next.js ecosystem |
| framer-motion | 12.34.0 | Subtle animations for rating interactions | Already installed, use sparingly for hover/selection feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom star rating | react-rating-stars-component | Library last updated 6 years ago; custom component gives full control, accessibility, Next.js integration |
| Custom star rating | react-simple-star-rating | Last updated 3 years ago; minimal benefit over 50-line custom component |
| TanStack Query mutations | Next.js Server Actions only | Server Actions alone lack optimistic UI updates; combine both |
| Manual profile creation | Supabase triggers | Triggers automate profile creation on signup, prevent orphaned users |

**Installation:**
```bash
npm install zod lucide-react
# @supabase/ssr, @tanstack/react-query, framer-motion already installed
```

## Architecture Patterns

### Recommended Database Schema

```sql
-- Public profiles table (extends auth.users)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id)
);

-- Movie ratings (user-owned)
create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,  -- TMDB movie ID
  rating integer not null check (rating >= 1 and rating <= 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, movie_id)  -- One rating per user per movie
);

-- Watchlist (user-owned)
create table public.watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,  -- TMDB movie ID
  created_at timestamptz default now(),
  unique(user_id, movie_id)
);

-- Viewing history (implicit engagement signals)
create table public.viewing_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  action_type text not null,  -- 'rated', 'watchlisted', 'detail_viewed'
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.ratings enable row level security;
alter table public.watchlist enable row level security;
alter table public.viewing_history enable row level security;

-- Create indexes on foreign keys (CRITICAL: Supabase doesn't auto-create these)
create index idx_ratings_user_id on public.ratings(user_id);
create index idx_ratings_movie_id on public.ratings(movie_id);
create index idx_watchlist_user_id on public.watchlist(user_id);
create index idx_watchlist_movie_id on public.watchlist(movie_id);
create index idx_viewing_history_user_id on public.viewing_history(user_id);
create index idx_viewing_history_created_at on public.viewing_history(created_at desc);
```

**Source:** [Supabase User Management Docs](https://supabase.com/docs/guides/auth/managing-user-data), [Supabase RLS Performance Best Practices](https://www.leanware.co/insights/supabase-best-practices)

### Pattern 1: Row Level Security Policies

**What:** PostgreSQL RLS policies that restrict data access to the owning user using `auth.uid()`.

**When to use:** ALL tables containing user-specific data (ratings, watchlist, profiles, history).

**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security

-- Profiles: users can view all, but only update their own
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can update own profile"
  on public.profiles for update
  using ( (select auth.uid()) = id );

-- Ratings: users can CRUD only their own ratings
create policy "Users can view own ratings"
  on public.ratings for select
  using ( (select auth.uid()) = user_id );

create policy "Users can insert own ratings"
  on public.ratings for insert
  with check ( (select auth.uid()) = user_id );

create policy "Users can update own ratings"
  on public.ratings for update
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Users can delete own ratings"
  on public.ratings for delete
  using ( (select auth.uid()) = user_id );

-- Watchlist: same pattern as ratings
create policy "Users can view own watchlist"
  on public.watchlist for select
  using ( (select auth.uid()) = user_id );

create policy "Users can insert into own watchlist"
  on public.watchlist for insert
  with check ( (select auth.uid()) = user_id );

create policy "Users can delete from own watchlist"
  on public.watchlist for delete
  using ( (select auth.uid()) = user_id );

-- Viewing history: insert + read only (no updates/deletes)
create policy "Users can view own history"
  on public.viewing_history for select
  using ( (select auth.uid()) = user_id );

create policy "Users can insert into own history"
  on public.viewing_history for insert
  with check ( (select auth.uid()) = user_id );
```

**Critical security considerations:**
- NEVER use `user_metadata` from JWT in RLS policies (user-modifiable, security risk)
- ALWAYS enable RLS on public schema tables
- NEVER expose service_role key to client code (bypasses RLS)

**Source:** [Supabase RLS Complete Guide 2026](https://designrevision.com/blog/supabase-row-level-security), [RLS Security Issues 2025-2026](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c)

### Pattern 2: Auto-Create Profile on Signup with Triggers

**What:** PostgreSQL trigger that automatically creates a profile row when a user signs up.

**When to use:** User registration flow to ensure every auth.users entry has a corresponding profiles entry.

**Example:**
```sql
-- Source: https://supabase.com/docs/guides/auth/managing-user-data

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Important notes:**
- If trigger fails, signup WILL fail (test thoroughly)
- Extract data from `raw_user_meta_data` during signup
- Use `security definer` to allow inserting into RLS-protected table
- Set `search_path = ''` to prevent search_path exploits

### Pattern 3: Optimistic Updates with TanStack Query

**What:** Update UI immediately when user takes action (rate movie, add to watchlist), then sync with server. Rollback on error.

**When to use:** All user mutations (ratings, watchlist) for instant feedback.

**Example:**
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
// Pattern adapted from: https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query

const useRateMovie = (movieId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rating: number) => {
      // Call Supabase or Server Action
      const { error } = await supabase
        .from('ratings')
        .upsert({ user_id: userId, movie_id: movieId, rating });
      if (error) throw error;
    },

    onMutate: async (newRating) => {
      // Cancel outgoing refetches (prevent overwriting optimistic update)
      await queryClient.cancelQueries({ queryKey: ['ratings', movieId] });

      // Snapshot current value for rollback
      const previousRating = queryClient.getQueryData(['ratings', movieId]);

      // Optimistically update cache
      queryClient.setQueryData(['ratings', movieId], newRating);

      // Return context with snapshot
      return { previousRating };
    },

    onError: (err, newRating, context) => {
      // Rollback to previous value
      queryClient.setQueryData(['ratings', movieId], context?.previousRating);
      toast.error('Failed to save rating');
    },

    onSettled: () => {
      // Refetch to sync with server state
      // Only if no other mutations pending (prevents over-invalidation)
      if (queryClient.isMutating({ mutationKey: ['ratings'] }) === 1) {
        queryClient.invalidateQueries({ queryKey: ['ratings', movieId] });
      }
    },
  });
};

// Usage in component
const rateMutation = useRateMovie(movie.id);

<StarRating
  value={currentRating}
  onChange={(rating) => rateMutation.mutate(rating)}
/>
```

**Key techniques:**
- `cancelQueries`: Prevents in-flight requests from overwriting optimistic update
- Context return: Passes snapshot from `onMutate` to `onError` for rollback
- `isMutating` check: Prevents invalidation from reverting subsequent optimistic updates
- `onSettled` refetch: Ensures eventual consistency with server

**Source:** [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates), [Concurrent Optimistic Updates - TkDodo](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)

### Pattern 4: Custom Star Rating Component

**What:** Lightweight, accessible star rating component with hover states and keyboard navigation.

**When to use:** Movie rating UI on cards and detail pages.

**Example:**
```typescript
// Custom component - full accessibility, no dependencies
// Sources:
// - https://www.amanmaharshi.com/blog/react-star-rating
// - https://www.telerik.com/kendo-react-ui/components/inputs/rating/accessibility

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const sizes = { sm: 16, md: 24, lg: 32 };
  const iconSize = sizes[size];

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    if (readonly) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(index + 1);
    } else if (e.key === 'ArrowRight' && index < 4) {
      e.preventDefault();
      setFocusedIndex(index + 1);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      setFocusedIndex(index - 1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Movie rating"
      className="flex gap-1"
    >
      {[1, 2, 3, 4, 5].map((star, index) => {
        const filled = (hoverValue || value) >= star;

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-setsize={5}
            aria-posinset={star}
            aria-label={`Rate ${star} out of 5 stars`}
            tabIndex={index === focusedIndex || (focusedIndex === -1 && index === 0) ? 0 : -1}
            disabled={readonly}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onMouseLeave={() => !readonly && setHoverValue(0)}
            onFocus={() => setFocusedIndex(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          >
            <Star
              size={iconSize}
              className={filled ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}
            />
          </button>
        );
      })}
    </div>
  );
}
```

**Accessibility features:**
- `role="radiogroup"` and `role="radio"` for screen readers
- `aria-label`, `aria-setsize`, `aria-posinset` for context
- Keyboard navigation: Arrow keys to navigate, Enter/Space to select
- `tabIndex` management for proper focus flow
- Descriptive labels for each star

**Source:** [React Star Rating Accessibility - KendoReact](https://www.telerik.com/kendo-react-ui/components/inputs/rating/accessibility), [Star Rating with Hooks & Accessibility](https://www.amanmaharshi.com/blog/react-star-rating)

### Pattern 5: Taste Quiz Movie Selection Strategy

**What:** Select 5-10 well-known movies across diverse genres for onboarding taste quiz.

**When to use:** New user signup flow to solve cold start problem.

**Selection criteria:**
1. **Popularity:** High TMDB popularity scores (>100), widely recognized titles
2. **Genre diversity:** Cover major genres (action, comedy, drama, sci-fi, horror, romance, thriller)
3. **Recency bias:** Mix of recent hits (last 2-3 years) and classics
4. **Cultural reach:** Internationally recognized titles, not region-specific
5. **Polarizing films:** Include divisive films to differentiate user tastes

**Example movie selection logic:**
```typescript
// Curated list approach (recommended for simplicity)
const TASTE_QUIZ_MOVIES = [
  { id: 550, title: "Fight Club", genre: "thriller" },
  { id: 13, title: "Forrest Gump", genre: "drama" },
  { id: 155, title: "The Dark Knight", genre: "action" },
  { id: 637, title: "Life Is Beautiful", genre: "comedy-drama" },
  { id: 122, title: "The Lord of the Rings: The Return of the King", genre: "fantasy" },
  { id: 680, title: "Pulp Fiction", group: "drama" },
  { id: 27205, title: "Inception", genre: "sci-fi" },
  { id: 238, title: "The Shawshank Redemption", genre: "drama" },
  { id: 278, title: "The Godfather", genre: "crime" },
  { id: 372058, title: "Your Name", genre: "anime" },
];

// Alternative: Dynamic selection from TMDB (more complex, enables freshness)
async function selectTasteQuizMovies() {
  const genres = await fetchGenres();
  const movies = [];

  for (const genre of priorityGenres) {
    const topMovie = await fetchTopMovieByGenre(genre.id, { minPopularity: 100 });
    movies.push(topMovie);
  }

  return movies.slice(0, 10);
}
```

**Rationale:**
- 5-10 movies balances data quality vs. user patience
- Genre diversity prevents bias toward single category
- Well-known titles ensure users have seen or heard of them
- Ratings on these movies provide strong preference signals

**Source:** [Solving Cold Start Problem in Recommender Systems](https://aicompetence.org/cold-start-problem-in-recommendation-systems/), [6 Strategies to Solve Cold Start Problem](https://web.tapereal.com/blog/6-strategies-to-solve-cold-start-problem-in-recommender-systems/)

### Recommended Project Structure

```
frontend/src/
├── app/
│   ├── (auth)/
│   │   └── taste-quiz/          # NEW: Onboarding taste quiz page
│   │       └── page.tsx
│   ├── profile/                 # NEW: User profile page
│   │   └── page.tsx
│   └── browse/
│       └── page.tsx             # UPDATE: Add rating/watchlist buttons to cards
├── components/
│   ├── engagement/              # NEW: User engagement components
│   │   ├── StarRating.tsx       # Custom star rating component
│   │   ├── WatchlistButton.tsx  # Add/remove from watchlist
│   │   └── RatingDisplay.tsx    # Read-only rating display
│   ├── profile/                 # NEW: Profile page components
│   │   ├── ProfileHeader.tsx    # Username, avatar, stats
│   │   ├── RatingHistory.tsx    # List of rated movies
│   │   └── WatchlistGrid.tsx    # Watchlist movie grid
│   └── onboarding/              # NEW: Taste quiz components
│       ├── TasteQuizCard.tsx    # Individual movie card with rating
│       └── TasteQuizProgress.tsx # Progress indicator
├── lib/
│   ├── supabase/                # UPDATE: Add mutation helpers
│   │   ├── client.ts            # Existing client
│   │   ├── ratings.ts           # NEW: Rating CRUD operations
│   │   ├── watchlist.ts         # NEW: Watchlist CRUD operations
│   │   └── profiles.ts          # NEW: Profile operations
│   └── hooks/                   # NEW: Custom hooks
│       ├── useRatings.ts        # TanStack Query hooks for ratings
│       ├── useWatchlist.ts      # TanStack Query hooks for watchlist
│       └── useProfile.ts        # Profile data hook
└── types/
    └── database.ts              # UPDATE: Add DB types (ratings, watchlist, profiles)

backend/
└── (No changes - TMDB API remains read-only)

supabase/
└── migrations/
    └── 20260213_user_engagement.sql  # NEW: Schema + RLS + triggers + indexes
```

### Anti-Patterns to Avoid

- **Skipping RLS policies:** Leaving tables without RLS exposes all user data. ALWAYS enable RLS and create policies.
- **Using service_role key on client:** Bypasses RLS entirely, massive security hole.
- **Not indexing foreign keys:** Supabase doesn't auto-create FK indexes. Slow queries on joins without them.
- **Over-invalidating queries:** Invalidating queries while other mutations pending reverts optimistic updates.
- **Heavyweight rating library:** 6-year-old npm packages add bloat; custom component is ~50 lines with full control.
- **Storing TMDB data in Supabase:** Don't duplicate movie metadata; store only TMDB IDs and fetch details from TMDB API.
- **Blocking signup with complex triggers:** If trigger fails (e.g., RLS misconfiguration), signup breaks. Test thoroughly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User authentication | Custom JWT + password hashing | Supabase Auth (already using) | Handles tokens, refresh, password reset, email verification, MFA |
| Database security | Application-level permission checks | Supabase RLS policies | Enforced at DB layer, can't be bypassed by API bugs |
| Cache invalidation logic | Manual state management for mutations | TanStack Query mutations | Handles cache updates, optimistic UI, rollback, refetch automatically |
| Form validation | Manual regex checks | Zod schemas | Type-safe, composable, generates TypeScript types |
| Accessibility for ratings | Manual ARIA attributes | Follow ARIA authoring practices (radiogroup pattern) | Screen reader tested, keyboard navigation standards |

**Key insight:** Supabase RLS + TanStack Query mutations eliminate most hand-rolled state management and security code. Use them.

## Common Pitfalls

### Pitfall 1: Forgetting to Create Indexes on Foreign Keys

**What goes wrong:** Queries joining ratings/watchlist to users become slow as data grows (>1000 rows). Database CPU spikes.

**Why it happens:** Supabase/Postgres doesn't auto-create indexes on foreign key columns. Developers assume they exist.

**How to avoid:**
```sql
-- ALWAYS create indexes on foreign keys
create index idx_ratings_user_id on public.ratings(user_id);
create index idx_ratings_movie_id on public.ratings(movie_id);
create index idx_watchlist_user_id on public.watchlist(user_id);
create index idx_watchlist_movie_id on public.watchlist(movie_id);
```

**Warning signs:**
- Database advisor showing missing indexes
- Slow queries with EXPLAIN showing sequential scans on FK columns
- Increasing response times as user count grows

**Source:** [Supabase Database Indexing Discussion](https://github.com/orgs/supabase/discussions/21672), [Supabase Index Best Practices](https://www.leanware.co/insights/supabase-best-practices)

### Pitfall 2: Optimistic Update Overwritten by In-Flight Queries

**What goes wrong:** User rates movie, sees star fill immediately, then it reverts to empty because a background refetch completed with stale data.

**Why it happens:** Forgot to call `queryClient.cancelQueries()` in `onMutate`. In-flight query finishes after optimistic update and overwrites cache.

**How to avoid:**
```typescript
onMutate: async (newRating) => {
  // CRITICAL: Cancel any outgoing refetches
  await queryClient.cancelQueries({ queryKey: ['ratings', movieId] });

  // Then update cache
  queryClient.setQueryData(['ratings', movieId], newRating);

  return { previousRating };
}
```

**Warning signs:**
- Optimistic updates "flicker" or revert briefly
- UI state inconsistent with user action
- Race conditions between mutation and query

**Source:** [TanStack Query Optimistic Updates Guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates), [Concurrent Optimistic Updates Blog](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)

### Pitfall 3: RLS Policies Block Trigger Functions

**What goes wrong:** Trigger function fails to insert profile row on signup because RLS policy on profiles table blocks the insert. Signup fails.

**Why it happens:** Trigger runs as authenticated user (who doesn't exist yet), not as superuser.

**How to avoid:**
```sql
-- Use 'security definer' to run trigger as function owner (superuser privileges)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''  -- Prevent search_path exploits
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;
```

**Warning signs:**
- Signup fails with "permission denied" or "RLS policy violation"
- No profile row created for new users
- Trigger function error in Supabase logs

**Source:** [Supabase User Management - Triggers](https://supabase.com/docs/guides/auth/managing-user-data)

### Pitfall 4: Using user_metadata in RLS Policies

**What goes wrong:** RLS policy checks `auth.jwt() ->> 'user_metadata'`, but users can modify their own metadata. Attacker changes metadata to impersonate another user.

**Why it happens:** Misunderstanding which JWT claims are user-modifiable vs. system-controlled.

**How to avoid:**
```sql
-- SAFE: auth.uid() is system-controlled, can't be modified by user
create policy "Users see own ratings"
  on public.ratings for select
  using ( (select auth.uid()) = user_id );

-- UNSAFE: user_metadata is user-modifiable
-- DO NOT USE
create policy "Users see own ratings"
  on public.ratings for select
  using ( (select auth.jwt() ->> 'user_metadata'->>'id') = user_id );
```

**Warning signs:**
- Security audit flags user_metadata in policies
- RLS policies bypassed by modified JWT claims

**Source:** [Supabase RLS Security Issues](https://designrevision.com/blog/supabase-row-level-security), [Token Security and RLS](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c)

### Pitfall 5: Taste Quiz Movie Selection Too Niche

**What goes wrong:** Taste quiz shows obscure indie films. Users haven't seen any of them, skip quiz or rate randomly. Cold start not solved.

**Why it happens:** Optimizing for "quality" or "hidden gems" instead of recognizability.

**How to avoid:**
- Select movies with TMDB popularity > 100
- Choose widely distributed, mainstream titles (Marvel, Pixar, classic franchises)
- Include recent blockbusters users likely saw
- Test with non-film-buff users

**Warning signs:**
- High quiz abandonment rate (>30%)
- Users selecting "Skip" or "Haven't seen" on most movies
- Low rating completion in taste quiz

**Source:** [Cold Start Problem Solutions](https://aicompetence.org/cold-start-problem-in-recommendation-systems/), [Warm Recommendations for AI Cold Start](https://airbyte.com/blog/recommendations-for-the-ai-cold-start-problem)

### Pitfall 6: Not Tracking Viewing History as Implicit Feedback

**What goes wrong:** Recommendation system only uses explicit ratings (1-5 stars). Misses implicit signals like "viewed movie detail" or "added to watchlist without rating."

**Why it happens:** Focusing only on explicit feedback, ignoring valuable implicit signals.

**How to avoid:**
```sql
-- Track all engagement actions, not just ratings
create table public.viewing_history (
  user_id uuid references auth.users(id),
  movie_id integer,
  action_type text,  -- 'rated', 'watchlisted', 'detail_viewed', 'search_clicked'
  created_at timestamptz default now()
);

-- Insert on every significant action
insert into viewing_history (user_id, movie_id, action_type)
values (auth.uid(), 12345, 'detail_viewed');
```

**Weighted signal values:**
- Rating: +5 (strongest signal)
- Watchlist add: +3
- Detail page view: +1
- Search result click: +0.5

**Warning signs:**
- Recommendation engine lacks data for users who browse but rarely rate
- No way to recommend based on "interest" vs. "satisfaction"

**Source:** [Implicit Feedback in Recommender Systems](https://milvus.io/ai-quick-reference/what-is-implicit-feedback-in-recommender-systems), [Implicit vs. Explicit Feedback](https://blog.reachsumit.com/posts/2022/09/explicit-implicit-cf/)

## Code Examples

Verified patterns from official sources:

### Complete Supabase Setup (Schema + RLS + Triggers + Indexes)

```sql
-- Source: https://supabase.com/docs/guides/auth/managing-user-data
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security

-- ============================================
-- 1. CREATE TABLES
-- ============================================

create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id)
);

create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, movie_id)
);

create table public.watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  created_at timestamptz default now(),
  unique(user_id, movie_id)
);

create table public.viewing_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  action_type text not null,
  created_at timestamptz default now()
);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.ratings enable row level security;
alter table public.watchlist enable row level security;
alter table public.viewing_history enable row level security;

-- ============================================
-- 3. CREATE RLS POLICIES
-- ============================================

-- Profiles
create policy "Public profiles viewable by everyone"
  on public.profiles for select using ( true );

create policy "Users can update own profile"
  on public.profiles for update
  using ( (select auth.uid()) = id );

-- Ratings
create policy "Users view own ratings"
  on public.ratings for select
  using ( (select auth.uid()) = user_id );

create policy "Users insert own ratings"
  on public.ratings for insert
  with check ( (select auth.uid()) = user_id );

create policy "Users update own ratings"
  on public.ratings for update
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Users delete own ratings"
  on public.ratings for delete
  using ( (select auth.uid()) = user_id );

-- Watchlist
create policy "Users view own watchlist"
  on public.watchlist for select
  using ( (select auth.uid()) = user_id );

create policy "Users insert into own watchlist"
  on public.watchlist for insert
  with check ( (select auth.uid()) = user_id );

create policy "Users delete from own watchlist"
  on public.watchlist for delete
  using ( (select auth.uid()) = user_id );

-- Viewing history
create policy "Users view own history"
  on public.viewing_history for select
  using ( (select auth.uid()) = user_id );

create policy "Users insert into own history"
  on public.viewing_history for insert
  with check ( (select auth.uid()) = user_id );

-- ============================================
-- 4. CREATE TRIGGER FOR AUTO PROFILE CREATION
-- ============================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 5. CREATE INDEXES (CRITICAL - NOT AUTO-CREATED)
-- ============================================

create index idx_ratings_user_id on public.ratings(user_id);
create index idx_ratings_movie_id on public.ratings(movie_id);
create index idx_ratings_created_at on public.ratings(created_at desc);

create index idx_watchlist_user_id on public.watchlist(user_id);
create index idx_watchlist_movie_id on public.watchlist(movie_id);

create index idx_viewing_history_user_id on public.viewing_history(user_id);
create index idx_viewing_history_movie_id on public.viewing_history(movie_id);
create index idx_viewing_history_created_at on public.viewing_history(created_at desc);
create index idx_viewing_history_action_type on public.viewing_history(action_type);
```

### TanStack Query Mutation with Optimistic Update (Complete)

```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
// Source: https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

interface RateMovieParams {
  movieId: number;
  rating: number;
}

export function useRateMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['ratings'],

    mutationFn: async ({ movieId, rating }: RateMovieParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ratings')
        .upsert(
          { user_id: user.id, movie_id: movieId, rating, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,movie_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onMutate: async ({ movieId, rating }) => {
      // 1. Cancel outgoing refetches (critical to prevent overwrite)
      await queryClient.cancelQueries({ queryKey: ['ratings', movieId] });
      await queryClient.cancelQueries({ queryKey: ['user-ratings'] });

      // 2. Snapshot current values for rollback
      const previousMovieRating = queryClient.getQueryData(['ratings', movieId]);
      const previousUserRatings = queryClient.getQueryData(['user-ratings']);

      // 3. Optimistically update individual movie rating
      queryClient.setQueryData(['ratings', movieId], rating);

      // 4. Optimistically update user's rating list
      queryClient.setQueryData(['user-ratings'], (old: any[]) => {
        const updated = old?.filter((r) => r.movie_id !== movieId) || [];
        updated.push({ movie_id: movieId, rating, updated_at: new Date().toISOString() });
        return updated;
      });

      // 5. Return context for rollback
      return { previousMovieRating, previousUserRatings };
    },

    onError: (err, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousMovieRating !== undefined) {
        queryClient.setQueryData(['ratings', variables.movieId], context.previousMovieRating);
      }
      if (context?.previousUserRatings !== undefined) {
        queryClient.setQueryData(['user-ratings'], context.previousUserRatings);
      }

      console.error('Failed to rate movie:', err);
      // Show toast notification
    },

    onSettled: (data, error, variables) => {
      // Only invalidate if this is the last pending mutation
      // Prevents over-invalidation that reverts subsequent optimistic updates
      if (queryClient.isMutating({ mutationKey: ['ratings'] }) === 1) {
        queryClient.invalidateQueries({ queryKey: ['ratings', variables.movieId] });
        queryClient.invalidateQueries({ queryKey: ['user-ratings'] });
      }
    },
  });
}

// Usage in component
function MovieCard({ movie }) {
  const { data: rating } = useQuery({
    queryKey: ['ratings', movie.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('ratings')
        .select('rating')
        .eq('movie_id', movie.id)
        .maybeSingle();
      return data?.rating;
    },
  });

  const rateMutation = useRateMovie();

  return (
    <StarRating
      value={rating || 0}
      onChange={(newRating) => rateMutation.mutate({ movieId: movie.id, rating: newRating })}
    />
  );
}
```

### Accessible Star Rating Component (Complete)

```typescript
// Source: https://www.telerik.com/kendo-react-ui/components/inputs/rating/accessibility
// Source: https://www.amanmaharshi.com/blog/react-star-rating
// ARIA pattern: https://www.w3.org/WAI/ARIA/apg/patterns/radio/

'use client';

import { useState, KeyboardEvent } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  className = ''
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const sizes = { sm: 16, md: 24, lg: 32 };
  const iconSize = sizes[size];

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    if (readonly) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(index + 1);
    } else if (e.key === 'ArrowRight' && index < 4) {
      e.preventDefault();
      (e.currentTarget.nextElementSibling as HTMLElement)?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Movie rating"
      className={`flex gap-1 ${className}`}
    >
      {[1, 2, 3, 4, 5].map((star, index) => {
        const filled = (hoverValue || value) >= star;
        const isChecked = value === star;

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={isChecked}
            aria-setsize={5}
            aria-posinset={star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            tabIndex={isChecked || (value === 0 && index === 0) ? 0 : -1}
            disabled={readonly}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onMouseLeave={() => !readonly && setHoverValue(0)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(-1)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`
              transition-all duration-200
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 focus:scale-110'}
              focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded
            `}
          >
            <Star
              size={iconSize}
              className={`
                transition-colors
                ${filled ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-slate-600'}
              `}
            />
          </button>
        );
      })}
    </div>
  );
}
```

**Accessibility compliance:**
- ✅ ARIA radiogroup pattern (W3C standard)
- ✅ Keyboard navigation (arrows, Enter, Space, Escape)
- ✅ Focus management (tabIndex based on current rating)
- ✅ Screen reader labels (aria-label, aria-setsize, aria-posinset)
- ✅ Focus indicators (ring-2, ring-yellow-400)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase `.on()` subscriptions | Channel-based `.channel()` subscriptions | ~2023 | More efficient, better multiplexing, required for newer features |
| Application-layer permissions | Row Level Security (RLS) | Always preferred | Enforced at DB, can't bypass via API bugs |
| Manual cache invalidation | TanStack Query optimistic updates | v3+ (2021+) | Eliminates race conditions, instant UI feedback |
| Explicit ratings only | Implicit + explicit feedback | Industry standard now | 30-40% more data for recommendations |
| Next.js API routes for mutations | Server Actions | Next.js 13+ (2022) | Fewer files, automatic revalidation, progressive enhancement |

**Deprecated/outdated:**
- `react-rating-stars-component`: Last updated 6 years ago, not maintained
- `supabase.from('table').on('INSERT')`: Replaced by channel-based subscriptions
- Using `user_metadata` in RLS policies: Security risk, user-modifiable

## Open Questions

1. **Should we implement realtime updates for watchlist/ratings?**
   - What we know: Supabase Realtime supports database change subscriptions
   - What's unclear: Necessary for single-user features? More valuable for social features (Phase 3+)
   - Recommendation: Defer to Phase 3 unless UX testing shows confusion from staleness

2. **How many taste quiz movies is optimal?**
   - What we know: Literature suggests 5-10, balancing data quality vs. user patience
   - What's unclear: Specific optimal number for this app
   - Recommendation: Start with 8 movies, A/B test 6 vs. 10 in production, measure completion rate

3. **Should viewing history track detail page views?**
   - What we know: Implicit signals improve recommendations 30-40%
   - What's unclear: Privacy concerns from tracking "views" vs. just "ratings"
   - Recommendation: Include in Phase 2, add privacy policy disclosure, allow opt-out in settings (Phase 3)

4. **Custom star component vs. headless UI library (Radix UI)?**
   - What we know: Custom component is ~60 lines, full control, zero deps
   - What's unclear: Whether Radix UI's Rating primitive adds value
   - Recommendation: Start with custom component (simple, lightweight), refactor to Radix if accessibility issues arise

## Sources

### Primary (HIGH confidence)
- [Supabase User Management Docs](https://supabase.com/docs/guides/auth/managing-user-data) - Profile table pattern, triggers
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS policy syntax, auth.uid()
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) - Official optimistic update pattern
- [TkDodo: Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) - Advanced patterns, isMutating check
- [Supabase Index Best Practices](https://supabase.com/docs/guides/database/postgres/indexes) - Manual FK indexing requirement
- [React Rating Accessibility - KendoReact](https://www.telerik.com/kendo-react-ui/components/inputs/rating/accessibility) - ARIA patterns for ratings

### Secondary (MEDIUM confidence)
- [Supabase RLS Complete Guide 2026](https://designrevision.com/blog/supabase-row-level-security) - Best practices, common pitfalls
- [Best Practices for Supabase 2026](https://www.leanware.co/insights/supabase-best-practices) - Indexing, RLS, performance
- [Solving Cold Start Problem](https://aicompetence.org/cold-start-problem-in-recommendation-systems/) - Taste quiz strategy
- [6 Strategies for Cold Start](https://web.tapereal.com/blog/6-strategies-to-solve-cold-start-problem-in-recommender-systems/) - Onboarding patterns
- [Implicit Feedback in Recommender Systems](https://milvus.io/ai-quick-reference/what-is-implicit-feedback-in-recommender-systems) - Viewing history value
- [Next.js Server Actions Guide 2026](https://makerkit.dev/blog/tutorials/nextjs-server-actions) - Validation patterns, best practices

### Tertiary (LOW confidence - requires validation)
- npm package comparisons (react-rating-stars-component vs. react-simple-star-rating) - Last updated dates from npm, but popularity metrics may be stale

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs, version numbers from package.json, patterns tested in Phase 1
- Architecture patterns: HIGH - RLS, optimistic updates, and trigger patterns from official Supabase/TanStack docs with code examples
- Pitfalls: HIGH - Directly sourced from official troubleshooting guides, GitHub discussions, and expert blogs (TkDodo)
- Taste quiz strategy: MEDIUM - Cold start patterns well-established in literature, but specific movie selection is domain expertise
- Star rating component: MEDIUM - Accessibility patterns from official ARIA docs, implementation details from multiple blog sources

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days - stable technologies, React/Supabase/TanStack patterns unlikely to change significantly)
