# Roadmap: NetflixRecs AI Recommendation Platform

## Overview

NetflixRecs delivers a premium movie discovery platform powered by hybrid AI recommendations with natural language explanations. The roadmap follows the critical dependency chain: foundation (auth, data, catalog) enables user engagement (ratings, profiles), which feeds the recommendation engine (content-based, then collaborative with hybrid fusion), which powers the core differentiator (RAG-based AI explanations via Claude), culminating in Netflix-quality UI and discovery features. Six phases deliver 23 v1 requirements from first login to polished portfolio demo.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation & Data Infrastructure** - Auth, database, TMDB integration, and catalog browsing *(completed 2026-02-12)*
- [x] **Phase 2: User Engagement & Cold Start** - Ratings, watchlist, profiles, and taste quiz onboarding *(completed 2026-02-14)*
- [x] **Phase 3: Content-Based Recommendations** - TF-IDF + cosine similarity personalized recommendations *(completed 2026-02-16)*
- [x] **Phase 4: Collaborative Filtering & Hybrid Fusion** - SVD/KNN collaborative model with hybrid fusion layer *(completed 2026-02-16)*
- [ ] **Phase 5: Embeddings, RAG & AI Explanations** - ChromaDB embeddings, Claude RAG pipeline, and AI explanations **(CORE DIFFERENTIATOR)**
- [ ] **Phase 6: Netflix-Style UI & Discovery** - Cinematic UI polish, animations, responsive design, and mood-based discovery

## Phase Details

### Phase 1: Foundation & Data Infrastructure
**Goal**: Users can create accounts, browse the movie catalog, and view rich movie details -- establishing the data and auth foundation everything else depends on
**Depends on**: Nothing (first phase)
**Requirements**: REQ-AUTH-01, REQ-AUTH-02, REQ-AUTH-03, REQ-CAT-01, REQ-CAT-02, REQ-CAT-03
**Success Criteria** (what must be TRUE):
  1. User can sign up with email/password, log in, log out, and reset their password
  2. User stays logged in across browser sessions without re-entering credentials
  3. User can browse a paginated grid of movies with poster thumbnails from TMDB
  4. User can search for a specific movie by title and find it in results
  5. User can open a movie detail page showing synopsis, cast, trailer, and backdrop image
**Plans**: 5 plans
**Research flag**: Standard patterns, skip research-phase

Plans:
- [x] 01-01-PLAN.md — Next.js frontend scaffold + Supabase client setup
- [x] 01-02-PLAN.md — FastAPI backend scaffold + TMDB client + shared types
- [x] 01-03-PLAN.md — Authentication flows (signup, login, logout, password reset, session persistence)
- [x] 01-04-PLAN.md — TMDB API backend endpoints (popular, search, detail)
- [x] 01-05-PLAN.md — Catalog browsing UI (movie grid, search, pagination) and movie detail page

### Phase 2: User Engagement & Cold Start
**Goal**: Users can rate movies, build taste profiles, and have enough data to power personalized recommendations from their first session
**Depends on**: Phase 1
**Requirements**: REQ-ENG-01, REQ-ENG-02, REQ-ENG-03, REQ-ENG-04, REQ-REC-04
**Success Criteria** (what must be TRUE):
  1. User can rate any movie 1-5 stars and see their rating persisted across sessions
  2. User can add/remove movies from their watchlist from any movie card or detail page
  3. User can view their profile page showing rating history, viewing stats, and watchlist
  4. New user is prompted to rate 5-10 well-known movies at signup (taste quiz) before seeing the main experience
  5. User's viewing history accurately reflects all movies they have rated or interacted with
**Plans**: 4 plans
**Research flag**: Standard patterns, skip research-phase

Plans:
- [ ] 02-01-PLAN.md — Database schema (profiles, ratings, watchlist, viewing_history), RLS policies, triggers, indexes + StarRating/WatchlistButton components + TanStack Query hooks with optimistic updates
- [ ] 02-02-PLAN.md — Integrate StarRating and WatchlistButton into MovieCard (hover overlay) and MovieDetail (backdrop section) + viewing history tracking
- [ ] 02-03-PLAN.md — User profile page with ProfileHeader, RatingHistory, WatchlistGrid + Navbar profile link
- [ ] 02-04-PLAN.md — Taste quiz onboarding (10 curated movies, minimum 5 ratings) + middleware redirect for new users

### Phase 3: Content-Based Recommendations
**Goal**: Users receive personalized movie recommendations based on the content characteristics of movies they have rated highly
**Depends on**: Phase 2
**Requirements**: REQ-REC-01
**Success Criteria** (what must be TRUE):
  1. User who has rated 5+ movies sees a personalized "Recommended for You" section with results that reflect their rated genres and themes
  2. Recommendations update after the user rates additional movies (not stale)
  3. User with fewer than 5 ratings sees a meaningful fallback (popularity-based or prompt to rate more)
**Plans**: 2 plans
**Research flag**: Standard patterns with domain-specific considerations. Light research may be needed on TF-IDF feature engineering for movie metadata.

Plans:
- [x] 03-01-PLAN.md — TF-IDF model builder, recommender service, and FastAPI recommendation endpoint with cold-start fallback
- [x] 03-02-PLAN.md — Frontend RecommendationSection component on browse page with TanStack Query hook and cache invalidation on rating

### Phase 4: Collaborative Filtering & Hybrid Fusion
**Goal**: Users benefit from the collective taste of all users through collaborative filtering, merged with content-based signals via a hybrid fusion layer that prevents filter bubbles
**Depends on**: Phase 3
**Requirements**: REQ-REC-02, REQ-REC-03
**Success Criteria** (what must be TRUE):
  1. User with 20+ ratings sees recommendations influenced by similar users' preferences (not just content similarity)
  2. Recommendations include 10-20% exploration picks outside the user's established taste profile (diversity injection)
  3. New users (few ratings) get predominantly content-based recommendations while established users get a balanced hybrid blend
  4. MovieLens seed data is integrated so collaborative filtering works from day one without requiring organic user ratings
**Plans**: 2 plans
**Research flag**: Research completed (04-RESEARCH.md). Surprise SVD, adaptive alpha weights, MovieLens 100K seed data.

Plans:
- [x] 04-01-PLAN.md — MovieLens 100K download, TMDB ID mapping, SVD model training script
- [x] 04-02-PLAN.md — Hybrid fusion layer in RecommenderService, adaptive weights, diversity injection, API + frontend updates

### Phase 5: Embeddings, RAG & AI Explanations (CORE DIFFERENTIATOR)
**Goal**: Users understand WHY each recommendation fits their taste through Claude-powered natural language explanations, and can search for movies using natural language queries
**Depends on**: Phase 4
**Requirements**: REQ-AI-01, REQ-AI-02, REQ-AI-03, REQ-AI-04
**Success Criteria** (what must be TRUE):
  1. User can click "Why this?" on any recommendation and see a natural language explanation connecting the movie to their personal taste and rating history
  2. User can open a Cmd+K search overlay and type natural language queries like "something gritty like The Batman but with 80s vibes" and get relevant results
  3. AI explanations reference multiple factors (content similarity, what similar users enjoyed, trending signals) in a natural, readable way
  4. All AI-recommended movies exist in the catalog (no hallucinated titles) and explanations reference accurate movie details
  5. Explanations are cached per user-movie pair so repeated views load instantly without additional Claude API calls
**Plans**: 3 plans
**Research flag**: Research completed (05-RESEARCH.md). ChromaDB + sentence-transformers + anthropic SDK + cmdk stack.

Plans:
- [ ] 05-01-PLAN.md — ChromaDB embeddings foundation: sentence-transformers embedding generation + EmbeddingStore interface
- [ ] 05-02-PLAN.md — AI explanations: RAG pipeline (retrieval + Claude generation), PostgreSQL caching, "Why this?" button UI
- [ ] 05-03-PLAN.md — Natural language search: semantic vector search service + Cmd+K command palette UI

### Phase 6: Netflix-Style UI & Discovery
**Goal**: The application looks and feels like a premium streaming platform with cinematic presentation, smooth animations, and mood-based discovery that makes browsing feel effortless
**Depends on**: Phase 5 (recommendations and AI explanations must exist to display in polished UI)
**Requirements**: REQ-UI-01, REQ-UI-02, REQ-UI-03, REQ-UI-04, REQ-DISC-01
**Success Criteria** (what must be TRUE):
  1. Homepage features a cinematic hero section with a featured movie's backdrop image, title, synopsis, and embedded trailer
  2. Movies are organized in horizontal scrolling carousels by category (trending, recommended, genre-based) with smooth stagger reveal animations
  3. The entire application uses a dark mode palette (deep slate/black #0f172a base) by default
  4. Layout is fully responsive -- carousels, hero section, and detail pages work well on mobile, tablet, and desktop
  5. User can select a mood ("I'm feeling adventurous", "Something cozy") and receive recommendations filtered to match that mood
**Plans**: TBD
**Research flag**: Standard patterns, skip research-phase

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Coverage Matrix

Every v1 requirement is mapped to exactly one phase. No orphans.

| Requirement | Description | Phase |
|-------------|-------------|-------|
| REQ-AUTH-01 | Email/password sign up & login | Phase 1 |
| REQ-AUTH-02 | Session persistence | Phase 1 |
| REQ-AUTH-03 | Password reset flow | Phase 1 |
| REQ-CAT-01 | Browse catalog (grid + pagination) | Phase 1 |
| REQ-CAT-02 | Search by title | Phase 1 |
| REQ-CAT-03 | Movie/show detail page | Phase 1 |
| REQ-ENG-01 | Star ratings (1-5) | Phase 2 |
| REQ-ENG-02 | Watchlist / Save | Phase 2 |
| REQ-ENG-03 | Viewing history | Phase 2 |
| REQ-ENG-04 | User profile page | Phase 2 |
| REQ-REC-01 | Content-based filtering | Phase 3 |
| REQ-REC-02 | Collaborative filtering | Phase 4 |
| REQ-REC-03 | Hybrid fusion layer | Phase 4 |
| REQ-REC-04 | Taste quiz onboarding | Phase 2 |
| REQ-AI-01 | AI recommendation explanations | Phase 5 |
| REQ-AI-02 | Natural language search | Phase 5 |
| REQ-AI-03 | Multi-factor explanations | Phase 5 |
| REQ-AI-04 | ChromaDB vector embeddings | Phase 5 |
| REQ-UI-01 | Netflix-style hero section | Phase 6 |
| REQ-UI-02 | Horizontal scroll carousels | Phase 6 |
| REQ-UI-03 | Dark mode (default) | Phase 6 |
| REQ-UI-04 | Responsive design | Phase 6 |
| REQ-DISC-01 | Mood-based discovery | Phase 6 |

**Mapped: 23/23**

## Phase Dependency Diagram

```
Phase 1: Foundation & Data Infrastructure
  |
  v
Phase 2: User Engagement & Cold Start
  |
  v
Phase 3: Content-Based Recommendations
  |
  v
Phase 4: Collaborative Filtering & Hybrid Fusion
  |
  v
Phase 5: Embeddings, RAG & AI Explanations  <-- CORE DIFFERENTIATOR
  |
  v
Phase 6: Netflix-Style UI & Discovery
```

All phases are sequential. Each phase builds on the outputs of the previous phase. No parallel execution possible at the phase level.

## Progress

**Execution Order:** 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation & Data Infrastructure | 5/5 | ✓ Complete | 2026-02-12 |
| 2. User Engagement & Cold Start | 4/4 | ✓ Complete | 2026-02-14 |
| 3. Content-Based Recommendations | 2/2 | ✓ Complete | 2026-02-16 |
| 4. Collaborative Filtering & Hybrid Fusion | 2/2 | ✓ Complete | 2026-02-16 |
| 5. Embeddings, RAG & AI Explanations | 0/3 | Not started | - |
| 6. Netflix-Style UI & Discovery | 0/TBD | Not started | - |

---
*Created: 2026-02-11*
*Depth: Standard (5-8 phases)*
