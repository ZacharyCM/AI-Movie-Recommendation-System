# Architecture Research

**Domain:** AI-Powered Movie/TV Recommendation Platform
**Researched:** 2026-02-10
**Confidence:** MEDIUM

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Browse   │  │  Search  │  │  Recs    │  │   Auth     │  │
│  │  Catalog  │  │  (NL)    │  │  Feed    │  │   Flow     │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
└───────┼──────────────┼─────────────┼──────────────┼─────────┘
        │              │             │              │
        ▼              ▼             ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                  API GATEWAY (FastAPI)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  /movies │  │ /search  │  │  /recs   │  │  /auth     │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
└───────┼──────────────┼─────────────┼──────────────┼─────────┘
        │              │             │              │
        ▼              ▼             ▼              ▼
┌───────────────────────────────────────────┐  ┌──────────────┐
│        RECOMMENDATION ENGINE              │  │   SUPABASE   │
│  ┌────────────────────────────────────┐   │  │              │
│  │  Stage 1: Candidate Generation     │   │  │  Auth        │
│  │  ┌────────────┐  ┌──────────────┐  │   │  │  PostgreSQL  │
│  │  │ Content    │  │ Collaborative│  │   │  │  - users     │
│  │  │ (TF-IDF   │  │ (SVD + KNN)  │  │   │  │  - ratings   │
│  │  │  + Cosine) │  │              │  │   │  │  - watchlist  │
│  │  └─────┬──────┘  └──────┬───────┘  │   │  │  - movies    │
│  │        └──────┬─────────┘          │   │  └──────────────┘
│  │               ▼                    │   │
│  │  ┌────────────────────────────┐    │   │  ┌──────────────┐
│  │  │  Fusion Layer              │    │   │  │  ChromaDB    │
│  │  │  (weighted candidate merge)│    │   │  │              │
│  │  └────────────┬───────────────┘    │   │  │  Movie       │
│  │               ▼                    │   │  │  Embeddings  │
│  │  ┌────────────────────────────┐    │   │  │              │
│  │  │  Stage 2: RAG Re-Ranking   │    │   │  └──────────────┘
│  │  │  ChromaDB → Claude          │    │   │
│  │  │  → Explanations            │    │   │  ┌──────────────┐
│  │  └────────────────────────────┘    │   │  │  TMDB API    │
│  └────────────────────────────────────┘   │  │              │
└───────────────────────────────────────────┘  │  Metadata    │
                                               │  Images      │
                                               │  Trailers    │
                                               └──────────────┘
```

### Component Layers

#### 1. Client Layer (Next.js)

**Server Components (default):**
- Movie catalog pages (SEO-friendly, TMDB data fetched server-side)
- Movie detail pages
- Static UI layout

**Client Components (interactive):**
- Search bar (Cmd+K command palette)
- Rating stars (user interaction)
- Carousel scrolling (Framer Motion animations)
- Modal (AI explanation display)
- Auth forms

**State management:**
- Zustand: User session, UI state (modal open, search active)
- TanStack Query: Server data (movies, recommendations, watchlist)

#### 2. API Layer (FastAPI)

**Route groups:**

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `POST /auth/*` | Proxy to Supabase auth | No |
| `GET /movies` | Browse catalog (paginated) | No |
| `GET /movies/{id}` | Movie details | No |
| `GET /movies/{id}/similar` | Content-based similar movies | No |
| `POST /ratings` | Submit user rating | Yes |
| `GET /recommendations` | Personalized recommendations | Yes |
| `GET /recommendations/{id}/explain` | AI explanation for a rec | Yes |
| `POST /search` | Natural language search | No |
| `GET /watchlist` | User's watchlist | Yes |
| `POST /watchlist` | Add to watchlist | Yes |

#### 3. Recommendation Engine

**Stage 1 — Candidate Generation:**

Two parallel algorithms that each produce a ranked list of candidate movies:

1. **Content-Based (TF-IDF + Cosine Similarity)**
   - Input: Movies the user has rated highly
   - Process: TF-IDF on plot summaries + genre vectors → cosine similarity
   - Output: Top-N similar movies by content

2. **Collaborative Filtering (SVD + KNN)**
   - Input: User-item rating matrix (seeded with MovieLens + user's own ratings)
   - Process: SVD for latent factor decomposition, KNN for user-user similarity
   - Output: Top-N movies predicted to score highly for this user

**Fusion Layer:**
- Merge candidates from both algorithms
- Weighted scoring: `final_score = α * content_score + β * collab_score`
- Adaptive weights: More content-based for new users (few ratings), more collaborative for established users

**Stage 2 — RAG Re-Ranking:**
- Take top candidates from Stage 1
- Retrieve enriched metadata from ChromaDB (embeddings + stored text)
- Send to Claude with user taste profile context
- Claude re-ranks based on semantic understanding and generates explanations

#### 4. Data Layer

**Supabase (PostgreSQL):**
```
users (id, email, name, avatar_url, created_at)
ratings (id, user_id, movie_id, score, created_at)
watchlist (id, user_id, movie_id, created_at)
movies (id, tmdb_id, title, overview, genres, release_date, poster_path, backdrop_path, vote_average, popularity)
viewing_history (id, user_id, movie_id, action, created_at)
```

**ChromaDB:**
```
collection: movie_embeddings
  - id: tmdb_id
  - embedding: sentence-transformers output
  - metadata: {title, genres, overview_snippet, year, rating}
```

**TMDB API (external):**
- Movie/TV metadata, images, trailers
- Rate limited: 40 requests per 10 seconds
- Cache responses in Supabase `movies` table

## Data Flow

### Recommendation Request Flow

```
User opens app
    │
    ▼
Next.js fetches /recommendations (TanStack Query)
    │
    ▼
FastAPI checks user's ratings count
    │
    ├── < 5 ratings → Return popular/trending (cold start)
    │
    ├── 5-20 ratings → Content-based only (not enough for collab)
    │
    └── 20+ ratings → Full hybrid pipeline
                │
                ├── Content-Based: TF-IDF similarity on rated movies
                │
                ├── Collaborative: SVD/KNN prediction
                │
                ▼
            Fusion Layer (merge + weight)
                │
                ▼
            RAG Re-Ranking (ChromaDB → Claude)
                │
                ▼
            Return ranked movies + explanations
```

### Natural Language Search Flow

```
User types in Cmd+K search bar
    │
    ▼
POST /search { query: "dark thriller like Zodiac" }
    │
    ▼
Embed query with sentence-transformers
    │
    ▼
ChromaDB similarity search → top candidates
    │
    ▼
Claude re-ranks with user context + generates explanations
    │
    ▼
Return search results with AI explanations
```

### Data Ingestion Flow (Startup/Seed)

```
1. Fetch TMDB popular/top-rated movies (paginated, cached)
    │
    ▼
2. Store metadata in Supabase `movies` table
    │
    ▼
3. Generate embeddings with sentence-transformers
    │
    ▼
4. Store embeddings in ChromaDB
    │
    ▼
5. Load MovieLens ratings → map to TMDB IDs → seed collaborative model
    │
    ▼
6. Train SVD/KNN on seeded ratings matrix
```

## Suggested Build Order

Based on component dependencies:

| Order | Component | Depends On | Enables |
|-------|-----------|------------|---------|
| 1 | Supabase setup (schema + auth) | Nothing | Everything |
| 2 | TMDB data ingestion + movie cache | Supabase | Browse, details, embeddings |
| 3 | Next.js shell (layout, routing, auth) | Supabase auth | All frontend features |
| 4 | Browse catalog + movie details UI | TMDB data, Next.js | User engagement |
| 5 | Rating system | Auth, movie details | Recommendation engine |
| 6 | Content-based filtering (TF-IDF) | Movie data, ratings | Stage 1 recs |
| 7 | Collaborative filtering (SVD/KNN) | MovieLens seed, ratings | Stage 1 recs |
| 8 | ChromaDB + embeddings | Movie data | RAG, semantic search |
| 9 | RAG re-ranking + Claude explanations | ChromaDB, Stage 1 | Core differentiator |
| 10 | Netflix UI polish (hero, carousels, animations) | All data flowing | Final product |
| 11 | Natural language search | ChromaDB, Claude | Enhanced discovery |
| 12 | Deployment (Vercel + Railway) | Everything | Live demo |

## Scaling Considerations

| Users | Bottleneck | Solution |
|-------|-----------|----------|
| 1-100 | None | Direct API calls work fine |
| 100-1K | Claude API latency/cost | Cache explanations per movie-user pair |
| 1K-10K | Database connections | Supabase connection pooling (Supavisor) |
| 10K+ | ML model compute | Pre-compute recommendation matrices on schedule |

For a portfolio project, the 1-100 user range is realistic. Design for caching but don't over-optimize.

## Anti-Patterns to Avoid

1. **Synchronous LLM calls blocking requests** — Claude calls should be async, with loading states on frontend
2. **N+1 queries for movie metadata** — Batch TMDB lookups, use Supabase joins
3. **Storing embeddings in PostgreSQL** — Use ChromaDB for vector operations
4. **Mixing ML logic in API route handlers** — Separate engine module from API layer
5. **Over-engineering cold start** — Simple popularity-based recs until user has enough ratings

---
*Architecture research for: AI-Powered Movie/TV Recommendation Platform*
*Researched: 2026-02-10*
