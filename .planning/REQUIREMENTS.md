# NetflixRecs — Requirements

**Version:** 1.0
**Created:** 2026-02-11
**Status:** Approved

## v1 Requirements (Ship Now)

### Authentication

| ID | Feature | Priority | Complexity | Description |
|----|---------|----------|------------|-------------|
| REQ-AUTH-01 | Email/password sign up & login | P1 | LOW | Standard auth via Supabase with email/password. Sign up, login, and logout flows. |
| REQ-AUTH-02 | Session persistence | P1 | LOW | Stay logged in across browser sessions using Supabase refresh tokens. Automatic token refresh. |
| REQ-AUTH-03 | Password reset flow | P1 | LOW | Email-based password recovery via Supabase magic link / reset email. |

### Catalog & Browsing

| ID | Feature | Priority | Complexity | Description |
|----|---------|----------|------------|-------------|
| REQ-CAT-01 | Browse catalog (grid + pagination) | P1 | LOW | Grid view of movies/shows with TMDB data. Paginated results with poster thumbnails. |
| REQ-CAT-02 | Search by title | P1 | LOW | Keyword text search against TMDB catalog to find specific movies/shows. |
| REQ-CAT-03 | Movie/show detail page | P1 | LOW | Rich detail view with synopsis, cast, trailer embed, ratings, backdrop image from TMDB API. |

### User Engagement

| ID | Feature | Priority | Complexity | Description |
|----|---------|----------|------------|-------------|
| REQ-ENG-01 | Star ratings (1-5) | P1 | LOW | Interactive star rating component. Persisted to Supabase. Drives recommendation engine. |
| REQ-ENG-02 | Watchlist / Save | P1 | LOW | Bookmark movies to watch later. Add/remove from any movie card or detail page. |
| REQ-ENG-03 | Viewing history | P1 | LOW | Track movies the user has rated or interacted with. Displayed on profile. |
| REQ-ENG-04 | User profile page | P1 | LOW | Name, avatar, viewing stats, rating history. Basic account settings. |

### Recommendation Engine

| ID | Feature | Priority | Complexity | Description |
|----|---------|----------|------------|-------------|
| REQ-REC-01 | Content-based filtering | P1 | MEDIUM | TF-IDF vectorization of movie metadata + cosine similarity against user's rated movies. |
| REQ-REC-02 | Collaborative filtering | P1 | MEDIUM | SVD and User-User KNN via Surprise library. Seeded with MovieLens dataset. |
| REQ-REC-03 | Hybrid fusion layer | P1 | HIGH | Merge content-based + collaborative scores with adaptive weights. Diversity injection (10-20% exploration slots). |
| REQ-REC-04 | Taste quiz onboarding | P1 | MEDIUM | Rate 5-10 well-known movies at signup to solve cold start. Curated selection across genres. |

### AI & RAG

| ID | Feature | Priority | Complexity | Description |
|----|---------|----------|------------|-------------|
| REQ-AI-01 | AI recommendation explanations | P1 | MEDIUM | **CORE DIFFERENTIATOR.** Claude explains WHY you'll like each recommendation via RAG pipeline. Cached per (user, movie) pair. Lazy generation on "Why this?" click. |
| REQ-AI-02 | Natural language search | P1 | MEDIUM | "Find me a dark thriller like Zodiac" — semantic search via ChromaDB + Claude re-ranking. Cmd+K style overlay. |
| REQ-AI-03 | Multi-factor explanations | P1 | HIGH | Explanations combine content similarity, collaborative signals, and trending data in natural language. |
| REQ-AI-04 | ChromaDB vector embeddings | P1 | MEDIUM | Movie embeddings via sentence-transformers (all-MiniLM-L6-v2). Stored in ChromaDB for semantic search and RAG retrieval. |

### UI/UX

| ID | Feature | Priority | Complexity | Description |
|----|---------|----------|------------|-------------|
| REQ-UI-01 | Netflix-style hero section | P1 | MEDIUM | Cinematic featured movie banner with backdrop image, title, synopsis, and trailer embed. |
| REQ-UI-02 | Horizontal scroll carousels | P1 | MEDIUM | Category rows (trending, recommended, genre-based) with Framer Motion stagger animations. |
| REQ-UI-03 | Dark mode (default) | P1 | LOW | Deep slate/black palette (#0f172a base). Default theme, no toggle needed for v1. |
| REQ-UI-04 | Responsive design | P1 | MEDIUM | Mobile-first responsive layout. Carousels adapt to screen width. Touch-friendly on mobile. |

### Discovery

| ID | Feature | Priority | Complexity | Description |
|----|---------|----------|------------|-------------|
| REQ-DISC-01 | Mood-based discovery | P1 | MEDIUM | "I'm feeling adventurous" / "Something cozy" — maps mood to genre/theme filters, surfaces matching recommendations. |

---

## v2 Requirements (Build After Validation)

| ID | Feature | Priority | Complexity | Description |
|----|---------|----------|------------|-------------|
| REQ-V2-01 | Taste profile visualization | P2 | MEDIUM | Graphical genre distribution chart, rating pattern analysis, taste fingerprint display. |
| REQ-V2-02 | Interactive preference tuning | P2 | HIGH | "More like this" / "Less like that" feedback to adjust recommendation weights per user. |
| REQ-V2-03 | Serendipity mode | P2 | MEDIUM | Toggle to deliberately recommend outside comfort zone using semantic distance in embedding space. |

---

## Out of Scope

| Feature | Rationale |
|---------|-----------|
| OAuth (Google/GitHub) | Adds integration complexity; email/password sufficient for portfolio demo |
| Mobile native app | Web-first, responsive design sufficient |
| Real-time chat / social features | Not core to recommendation value |
| Admin dashboard | Portfolio demo doesn't need content moderation |
| Payment/subscription system | Free portfolio demo |
| User-generated content (reviews, lists) | Focus is on AI recommendations, not community |
| Real-time streaming | Licensing costs astronomical; link to services instead |
| Full social network | Massive scope expansion; not the core value prop |
| Context-aware recommendations | HIGH complexity, deferred beyond v2 |
| Comparison mode | Nice-to-have, not core |
| Streaming service integration | API maintenance burden for portfolio |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-AUTH-01 | Phase 1: Foundation & Data Infrastructure | Pending |
| REQ-AUTH-02 | Phase 1: Foundation & Data Infrastructure | Pending |
| REQ-AUTH-03 | Phase 1: Foundation & Data Infrastructure | Pending |
| REQ-CAT-01 | Phase 1: Foundation & Data Infrastructure | Pending |
| REQ-CAT-02 | Phase 1: Foundation & Data Infrastructure | Pending |
| REQ-CAT-03 | Phase 1: Foundation & Data Infrastructure | Pending |
| REQ-ENG-01 | Phase 2: User Engagement & Cold Start | Pending |
| REQ-ENG-02 | Phase 2: User Engagement & Cold Start | Pending |
| REQ-ENG-03 | Phase 2: User Engagement & Cold Start | Pending |
| REQ-ENG-04 | Phase 2: User Engagement & Cold Start | Pending |
| REQ-REC-01 | Phase 3: Content-Based Recommendations | Pending |
| REQ-REC-02 | Phase 4: Collaborative Filtering & Hybrid Fusion | Pending |
| REQ-REC-03 | Phase 4: Collaborative Filtering & Hybrid Fusion | Pending |
| REQ-REC-04 | Phase 2: User Engagement & Cold Start | Pending |
| REQ-AI-01 | Phase 5: Embeddings, RAG & AI Explanations | Pending |
| REQ-AI-02 | Phase 5: Embeddings, RAG & AI Explanations | Pending |
| REQ-AI-03 | Phase 5: Embeddings, RAG & AI Explanations | Pending |
| REQ-AI-04 | Phase 5: Embeddings, RAG & AI Explanations | Pending |
| REQ-UI-01 | Phase 6: Netflix-Style UI & Discovery | Pending |
| REQ-UI-02 | Phase 6: Netflix-Style UI & Discovery | Pending |
| REQ-UI-03 | Phase 6: Netflix-Style UI & Discovery | Pending |
| REQ-UI-04 | Phase 6: Netflix-Style UI & Discovery | Pending |
| REQ-DISC-01 | Phase 6: Netflix-Style UI & Discovery | Pending |

## Validation

- **Core value alignment:** All 23 v1 requirements contribute to the end-to-end flow: sign up -> rate -> get hybrid AI recs -> search in natural language -> read AI explanations.
- **Critical dependency chain covered:** Auth (REQ-AUTH-*) -> Ratings (REQ-ENG-01) -> Recs (REQ-REC-*) -> AI Explanations (REQ-AI-*).
- **Differentiator included:** REQ-AI-01 (AI explanations), REQ-AI-02 (NL search), REQ-AI-03 (multi-factor explanations) are all in v1.
- **Feature count:** 23 v1 requirements, 3 v2 requirements.

---
*Last updated: 2026-02-11*
