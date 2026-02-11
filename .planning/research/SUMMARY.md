# Project Research Summary

**Project:** NetflixRecs
**Domain:** AI-Powered Movie/TV Recommendation Platform
**Researched:** 2026-02-10
**Confidence:** MEDIUM-HIGH

## Executive Summary

NetflixRecs is an AI-powered movie and TV recommendation platform that combines hybrid recommendation algorithms (content-based + collaborative filtering) with large language model explanations to solve a key gap in the market: transparency in recommendations. Unlike Netflix (opaque black-box recommendations) or Letterboxd (social-driven discovery with weak personalization), NetflixRecs explains WHY each recommendation fits the user's taste using RAG-powered AI analysis.

The recommended approach is a two-stage hybrid system: Stage 1 generates candidates using TF-IDF content similarity and SVD/KNN collaborative filtering, then Stage 2 re-ranks using Claude-powered RAG to generate natural language explanations. The architecture uses Next.js 15 (App Router with Server Components) for the frontend, FastAPI for the Python backend (leveraging ML libraries like scikit-learn and Surprise), Supabase for auth/database, and ChromaDB for vector embeddings. This stack balances modern web performance with Python's ML ecosystem while keeping deployment complexity reasonable for a portfolio project.

The primary risks are filter bubble amplification (recommendations becoming too narrow), cold start problems (new users lacking data for personalization), and RAG hallucination (Claude fabricating movie details). These are mitigated through diversity injection at the fusion layer, an engaging taste quiz onboarding flow, and strict validation of Claude's outputs against the actual movie catalog. The research identifies clear phase dependencies: foundation (auth, data) must precede the recommendation engine, which must be working before RAG integration can add explanations.

## Key Findings

### Recommended Stack

The stack is built around a Python backend for ML processing and a modern React frontend. FastAPI was chosen over Django/Flask for native async support and automatic API documentation. Next.js App Router leverages Server Components to reduce bundle size and improve streaming performance for AI-generated content. Supabase provides auth and PostgreSQL with Row Level Security, avoiding the need for custom auth flows or ORM complexity.

**Core technologies:**
- **Next.js 15 (App Router)**: React framework with SSR/RSC for SEO-friendly catalog pages and streaming AI responses
- **FastAPI + Python 3.12**: API framework with native async for non-blocking TMDB/Claude calls, aligns with ML ecosystem (scikit-learn, Surprise)
- **Supabase**: Auth + PostgreSQL with RLS for user data, ratings, watchlists, and movie metadata cache
- **scikit-learn + Surprise**: TF-IDF/cosine similarity for content-based filtering, SVD/KNN for collaborative filtering
- **ChromaDB + sentence-transformers**: Vector database for movie embeddings enabling semantic search and RAG retrieval
- **Anthropic SDK (direct)**: Claude API for explanation generation, chosen over LangChain for better control and learning
- **Tailwind CSS + Framer Motion**: Utility-first styling and declarative animations for Netflix-style dark UI with carousels and modals
- **TanStack Query + Zustand**: Server state caching/refetching and lightweight client state management

**Key decisions:**
- ChromaDB over Pinecone (free, self-hosted) or FAISS (persistent storage without extra work)
- Anthropic SDK direct over LangChain (less abstraction, more control over RAG pipeline)
- Zustand over Redux (simpler for portfolio scope, less boilerplate)
- Railway/Render for backend deployment (Python + ChromaDB in one service)

### Expected Features

Research identified a clear three-tier feature set based on analysis of Netflix, Spotify, Letterboxd, JustWatch, and emerging AI discovery tools.

**Must have (table stakes):**
- User authentication (email/password via Supabase) - every modern app requires accounts
- Browse catalog with pagination/filtering - core discovery mechanism
- Search by title - users need to find specific content
- Movie/show details (synopsis, cast, trailers) - users expect rich metadata
- Star ratings (1-5) - standard feedback mechanism
- Personalized recommendations - the core value proposition
- Watchlist/save functionality - users want to bookmark content
- Viewing history - track what users have already watched
- Responsive Netflix-style UI (dark mode, carousels, hero sections)

**Should have (competitive differentiators):**
- **AI explanation of recommendations** - THE core differentiator, tells users WHY they'll like something
- Natural language search - "Find me a dark thriller like Zodiac" using semantic search
- Mood-based discovery - "I'm feeling adventurous" maps to genre/theme recommendations
- Taste profile visualization - graphical representation of user's preference patterns
- Multi-factor explanations - combine content, collaborative, and trending signals in natural language
- Interactive preference tuning - "more like this" / "less like that" feedback loops
- Serendipity mode - deliberately recommend outside comfort zone for discovery

**Defer (v2+):**
- Comparison mode ("How is Movie A different from Movie B?")
- Context-aware recommendations ("What to watch with family" vs "alone late night")
- Watch party recommendations (group preference reconciliation)
- Streaming service integration (where to watch)
- Advanced analytics dashboard

**Critical anti-features (requested but problematic):**
- Real-time streaming (licensing costs astronomical, out of scope)
- User reviews/comments (moderation nightmare, dilutes AI focus)
- Full social network features (scope creep, not the core value prop)

### Architecture Approach

The architecture follows a two-stage recommendation pipeline with clear separation of concerns. The frontend uses Next.js Server Components for SEO-friendly catalog pages and Client Components for interactive elements (search, ratings, carousels). The FastAPI backend orchestrates the recommendation engine and RAG pipeline while Supabase handles auth and relational data.

**Major components:**

1. **Client Layer (Next.js)** - Server Components render static catalog pages with TMDB data, Client Components handle interactivity (search bar, rating stars, Framer Motion animations). State management via Zustand (UI state) and TanStack Query (server data caching).

2. **API Layer (FastAPI)** - RESTful routes for movies, search, recommendations, ratings, and watchlist. Proxies auth to Supabase. Handles TMDB rate limiting through cache-first architecture. Async endpoints for non-blocking Claude/TMDB calls.

3. **Recommendation Engine** - Two-stage pipeline:
   - **Stage 1 (Candidate Generation)**: Content-based (TF-IDF + cosine similarity on rated movies) and collaborative filtering (SVD/KNN on MovieLens seed data + user ratings) run in parallel. Fusion layer merges with adaptive weights (more content-based for new users, more collaborative for established users).
   - **Stage 2 (RAG Re-Ranking)**: Top candidates passed to ChromaDB for semantic enrichment, then Claude re-ranks with user taste profile context and generates natural language explanations.

4. **Data Layer** - Supabase PostgreSQL stores users, ratings, watchlist, movie metadata cache, and viewing history. ChromaDB stores movie embeddings (sentence-transformers vectors) for semantic search. TMDB API provides external metadata but is cached aggressively to avoid rate limits (40 req/10s).

**Critical data flow:** User ratings trigger both content-based (instant) and collaborative (requires periodic SVD retraining) updates. Cold start (<5 ratings) falls back to popularity-based recommendations. Full hybrid pipeline activates at 20+ ratings.

**Build order dependencies:** Supabase setup → TMDB data ingestion → Next.js shell + auth → Browse/details UI → Rating system → Content-based filtering → Collaborative filtering → ChromaDB embeddings → RAG integration → UI polish → Natural language search → Deployment.

### Critical Pitfalls

1. **Filter Bubble Amplification (HIGH RISK)** - Hybrid system creates reinforcing feedback loops where recommendations become increasingly narrow after 10-20 ratings. **Prevention:** Inject diversity at fusion layer (reserve 10-20% slots for exploration), track genre distribution and enforce minimum variety, add Serendipity parameter. Must be designed into fusion layer during engine build.

2. **Cold Start Death Spiral (HIGH RISK)** - New users get poor recommendations, lose interest before rating enough content for personalization to work. **Prevention:** Adaptive fusion weights (heavy content-based for new users), engaging onboarding taste quiz (rate 5-10 well-known movies at signup), fallback to popularity + content-based for <5 ratings, MovieLens seed ensures collaborative model is trained.

3. **RAG Hallucination (HIGH RISK)** - Claude can fabricate movie details or recommend movies not in catalog. **Prevention:** Constrain Claude to only recommend from provided candidate list (IDs from Stage 1), validate all movie IDs against database, use structured JSON output, include movie metadata in prompt so Claude doesn't rely on training data, set ChromaDB similarity threshold >0.7, fallback to Stage 1 results if validation fails.

4. **TMDB Rate Limit Cascade (MEDIUM-HIGH RISK)** - 40 req/10s limit will be hit quickly if fetching on-demand during user requests. **Prevention:** Cache-first architecture, fetch and cache movie data in Supabase during seed/ETL process, never call TMDB in request path for cacheable data, implement exponential backoff with circuit breaker.

5. **Claude API Cost Explosion (MEDIUM RISK)** - Every recommendation page load triggering Claude calls can quickly rack up costs. **Prevention:** Cache explanations per (user, movie) pair in Supabase, lazy generation (only when user clicks "Why this?" or opens detail modal), batch multiple movies in one Claude call, set token budget (~200 tokens per explanation).

## Implications for Roadmap

Based on research, suggested phase structure follows architectural dependencies and risk mitigation patterns:

### Phase 1: Foundation & Data Infrastructure
**Rationale:** Everything depends on auth, database schema, and TMDB data. Must solve rate limiting and caching strategy before building features. This phase establishes the foundation for all downstream work.

**Delivers:**
- Supabase setup with auth (email/password) and database schema (users, ratings, watchlist, movies, viewing_history)
- TMDB data ingestion pipeline with caching strategy
- Basic Next.js shell with routing and auth flow
- Movie catalog browsing (grid view, pagination)
- Movie detail pages (synopsis, cast, trailers, ratings)

**Addresses:**
- User Authentication (table stakes)
- Browse Catalog (table stakes)
- Movie/Show Details (table stakes)

**Avoids:**
- TMDB Rate Limit Cascade (implements cache-first from the start)
- Overcomplicated Onboarding (establishes auth flow foundation)

**Research flag:** Standard patterns, skip research-phase. Auth and CRUD operations are well-documented for Supabase + Next.js.

### Phase 2: Rating System & Cold Start Strategy
**Rationale:** Ratings are required before recommendations can work. Must solve cold start problem before building the recommendation engine. Onboarding UX directly impacts user retention.

**Delivers:**
- Star rating system (1-5 stars) with POST endpoint
- Viewing history tracking
- Taste quiz onboarding flow (rate 5-10 well-known movies at signup)
- User profile page with basic preferences
- Watchlist save functionality

**Addresses:**
- Star Ratings (table stakes)
- Viewing History (table stakes)
- User Profile (table stakes)
- Save/Watchlist (table stakes)

**Avoids:**
- Cold Start Death Spiral (taste quiz ensures minimum 5 ratings for new users)
- Overcomplicated Onboarding (progressive enhancement with instant gratification after 5 ratings)

**Research flag:** Standard patterns, skip research-phase. Rating systems and onboarding flows have established UX patterns.

### Phase 3: Content-Based Recommendation Engine
**Rationale:** Content-based filtering works with minimal ratings and doesn't require collaborative model training. This enables personalization to start working immediately while building toward the full hybrid system.

**Delivers:**
- TF-IDF vectorization of movie metadata (plot summary + genres)
- Cosine similarity calculation against user's rated movies
- Content-based recommendation endpoint (GET /recommendations)
- Basic recommendation display UI (carousel layout)
- Loading and empty states for recommendations

**Addresses:**
- Personalized Recommendations (table stakes, partial implementation)

**Avoids:**
- Cold Start Death Spiral (content-based works with 5+ ratings, no collaborative model needed yet)
- Filter Bubble Amplification (baseline established before adding collaborative signals)

**Research flag:** Standard patterns with domain-specific considerations. May need light research on TF-IDF feature engineering for movie metadata (which fields to include, weighting strategies).

### Phase 4: Collaborative Filtering & Hybrid Fusion
**Rationale:** Adds collaborative signals to improve recommendation quality for users with 20+ ratings. Fusion layer is where diversity injection must happen to avoid filter bubbles.

**Delivers:**
- MovieLens seed data integration (map to TMDB IDs)
- SVD and KNN collaborative filtering models
- Fusion layer with adaptive weights (α for content-based, β for collaborative)
- Diversity injection logic (reserve 10-20% slots for exploration picks)
- Periodic model retraining strategy (for portfolio: on-demand or server restart)

**Addresses:**
- Personalized Recommendations (table stakes, full implementation)

**Avoids:**
- Filter Bubble Amplification (diversity injection built into fusion layer)
- SVD Model Staleness (designs retraining hook from the start)

**Research flag:** May need research. Collaborative filtering implementation has standard patterns (scikit-surprise library), but fusion layer weighting and diversity injection strategies may need domain research or experimentation.

### Phase 5: Vector Embeddings & ChromaDB Setup
**Rationale:** RAG pipeline requires embeddings infrastructure. This phase prepares for AI explanations without yet integrating Claude, allowing testing of embedding quality before committing to the RAG approach.

**Delivers:**
- ChromaDB setup with persistent storage
- Sentence-transformers integration (all-MiniLM-L6-v2)
- Movie embedding generation (multi-field: genre + plot + cast/director)
- Batch embedding insertion for entire movie catalog
- Embedding quality testing (verify known-similar movies have high cosine similarity)
- Semantic search endpoint (POST /search) for natural language queries

**Addresses:**
- Natural Language Search (differentiator, partial implementation)

**Avoids:**
- Embedding Quality Mismatch (tests embedding quality before RAG integration)

**Research flag:** Standard patterns for ChromaDB + sentence-transformers, skip research-phase. Multi-field embedding concatenation strategy is straightforward.

### Phase 6: RAG Integration & AI Explanations (CORE DIFFERENTIATOR)
**Rationale:** This is the key competitive advantage. RAG adds transparency to recommendations by explaining WHY in natural language. Must implement validation safeguards against hallucination from the start.

**Delivers:**
- Anthropic SDK integration with Claude
- RAG pipeline: Stage 1 candidates → ChromaDB retrieval → Claude prompt with user context
- Structured JSON output format from Claude (movie IDs + explanations)
- Validation layer: verify all returned movie IDs exist in database
- AI explanation display UI (modal or expandable cards)
- Explanation caching in Supabase (user, movie) pairs
- Lazy generation: only generate on "Why this?" click, not upfront

**Addresses:**
- AI Explanation of Recommendations (differentiator, CORE FEATURE)
- Multi-Factor Explanations (differentiator, natural language combines all signals)

**Avoids:**
- RAG Hallucination (constrained output, validation layer, metadata in prompt, similarity threshold >0.7)
- Claude API Cost Explosion (caching + lazy generation built in from start)

**Research flag:** NEEDS RESEARCH. RAG pipeline design for recommendations is a niche application. Prompt engineering for constrained output, validation strategies, and error handling for failed Claude responses need domain-specific research. Consider `/gsd:research-phase` focused on RAG + LLM best practices for recommendation systems.

### Phase 7: Netflix-Style UI Polish
**Rationale:** Core functionality works, now make it visually compelling for portfolio presentation. Performance optimization (virtualization, lazy loading) prevents technical debt.

**Delivers:**
- Hero section with featured movie/show
- Horizontal carousels with Framer Motion animations (stagger, layout, exit)
- Dark mode (default) with next-themes
- Responsive design (mobile, tablet, desktop)
- Carousel virtualization or lazy rendering (only render visible cards)
- Image lazy loading with Next.js Image component (TMDB w200/w500 sizes)
- Skeleton loading states for all async data
- Command palette (Cmd+K) search interface

**Addresses:**
- Netflix-style Responsive UI (table stakes)
- Content Thumbnails (table stakes)

**Avoids:**
- Frontend Performance with Large Movie Lists (virtualization + lazy loading built in)

**Research flag:** Standard patterns, skip research-phase. Netflix UI patterns are well-documented in Framer Motion examples and Next.js Image docs.

### Phase 8: Advanced Discovery Features (Post-MVP)
**Rationale:** These features enhance discovery but aren't required for core value prop. Add after validating core recommendation + explanation experience with users.

**Delivers:**
- Mood-based discovery (mood-to-genre/theme mapping)
- Taste profile visualization (genre distribution charts, rating patterns)
- Interactive preference tuning ("more like this" / "less like that" feedback)
- Serendipity mode toggle (adjust diversity parameters)
- Content filtering enhancements (decade, rating thresholds, runtime)

**Addresses:**
- Mood-Based Discovery (differentiator)
- Taste Profile Visualization (differentiator)
- Interactive Preference Tuning (differentiator)
- Serendipity Mode (differentiator)
- Content Filtering (table stakes, enhanced version)

**Research flag:** Standard patterns, skip research-phase. These are UI/UX enhancements on top of working recommendation engine.

### Phase 9: Deployment & Production Readiness
**Rationale:** Deploy to demonstrate live functionality for portfolio. Production environment configuration and monitoring.

**Delivers:**
- Vercel deployment for Next.js frontend
- Railway or Render deployment for FastAPI + ChromaDB
- Supabase Cloud configuration (production project)
- Environment variable management (TMDB API key, Claude API key, Supabase credentials)
- Error tracking (Sentry or similar)
- Basic analytics (Vercel Analytics or Plausible)
- Performance monitoring
- Production database backups

**Avoids:**
- "Looks Done But Isn't" (checklist verification: auth refresh, loading states, error handling, env vars)

**Research flag:** Standard patterns, skip research-phase. Deployment to Vercel/Railway is well-documented.

### Phase Ordering Rationale

- **Sequential dependency chain:** Auth/data → ratings → content-based → collaborative → embeddings → RAG → UI polish. Each phase builds on the previous phase's outputs.
- **Risk-first approach:** Tackles cold start (Phase 2) before building recommendation engine. Tests embedding quality (Phase 5) before committing to RAG architecture. Implements validation safeguards (Phase 6) alongside RAG integration, not as an afterthought.
- **Value delivery milestones:** Phase 3 delivers working personalized recommendations (can demo). Phase 6 adds the core differentiator (AI explanations). Phase 7 makes it portfolio-ready visually. Phase 8 is enhancement, not blocking.
- **Avoid premature optimization:** Defers UI performance work (Phase 7) until core functionality exists. Doesn't over-engineer retraining pipeline or caching until proven necessary.

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 4 (Collaborative Filtering & Hybrid Fusion)**: Fusion layer weighting strategies and diversity injection techniques may benefit from domain research. While scikit-surprise provides standard collaborative filtering implementations, the fusion layer design for balancing content + collaborative signals and preventing filter bubbles is more art than science. Consider quick research pass on hybrid recommendation system design patterns.

- **Phase 6 (RAG Integration & AI Explanations)**: STRONGLY RECOMMEND `/gsd:research-phase` before implementation. RAG for recommendation explanations is a niche application with specific challenges:
  - Prompt engineering for constrained output (preventing hallucination)
  - Structured output strategies (JSON mode, validation schemas)
  - Error handling for failed LLM responses
  - Caching strategies for expensive LLM calls
  - Batching strategies for multiple explanations
  - Context window management (how much user history + movie metadata to include)

  This is the highest-risk, highest-value phase. Deep research will prevent costly rework.

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Foundation & Data Infrastructure)**: Supabase auth + Next.js setup, TMDB API integration, basic CRUD operations are well-documented with abundant examples.
- **Phase 2 (Rating System & Cold Start Strategy)**: Star rating UI patterns, onboarding flows, watchlist functionality are standard web app features.
- **Phase 3 (Content-Based Recommendation Engine)**: TF-IDF + cosine similarity is textbook content-based filtering with clear scikit-learn documentation.
- **Phase 5 (Vector Embeddings & ChromaDB Setup)**: ChromaDB docs + sentence-transformers are straightforward. Multi-field concatenation is simple string manipulation.
- **Phase 7 (Netflix-Style UI Polish)**: Framer Motion examples, Next.js Image optimization, Tailwind responsive design patterns are extensively documented.
- **Phase 8 (Advanced Discovery Features)**: UI enhancements on top of working engine, mostly frontend work with established patterns.
- **Phase 9 (Deployment)**: Vercel + Railway deployment guides are comprehensive.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Technologies chosen have clear documentation, active communities, and proven fit for this domain. FastAPI + scikit-learn + Surprise is standard for Python-based recommendation systems. Next.js App Router + Supabase is a mature stack for modern web apps. ChromaDB is purpose-built for vector search. |
| Features | MEDIUM-HIGH | Feature prioritization based on analysis of major platforms (Netflix, Letterboxd, JustWatch) and understanding of recommendation system UX. Table stakes features are well-validated. Differentiators (AI explanations) are the innovation but validated by gap in market. |
| Architecture | MEDIUM | Two-stage hybrid recommendation pipeline is a well-documented pattern. RAG integration for explanations is less documented but conceptually sound. Specific design decisions (fusion layer weighting, diversity injection, caching strategies) will require experimentation and tuning during implementation. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (filter bubble, cold start, hallucination, rate limits, cost) are well-known challenges in recommendation systems and LLM applications. Prevention strategies are based on industry best practices. Execution details will need validation during implementation. |

**Overall confidence:** MEDIUM-HIGH

The project is technically feasible with the recommended stack. Core risks are identified with clear mitigation strategies. The main uncertainty is in tuning the recommendation engine (fusion layer weights, diversity parameters) and RAG pipeline (prompt engineering, caching strategy), which will require experimentation. The research provides a solid foundation for roadmap creation, but Phase 6 (RAG) should undergo deeper research before implementation.

### Gaps to Address

- **Fusion layer weighting formula**: Research identifies adaptive weights (more content-based for new users, more collaborative for established users) but doesn't specify exact formula. Will need experimentation: `final_score = α(n) * content_score + β(n) * collab_score` where α and β are functions of rating count n. Start with α(n) = max(0.5, 1.0 - n*0.02) and β(n) = 1 - α(n), tune based on user testing.

- **Diversity injection strategy**: Research recommends reserving 10-20% of recommendation slots for "exploration" picks but doesn't specify selection criteria. Options: random from high-rated genres user hasn't explored, temporally diverse (different decades), or semantically distant in embedding space. Recommend starting with semantic distance approach (use ChromaDB to find movies with cosine similarity 0.3-0.5 to user's top-rated movies).

- **ChromaDB similarity threshold**: Research suggests >0.7 for quality but this may be too restrictive for discovery. Plan to test with values in 0.5-0.8 range and adjust based on retrieval quality. Too high = missed recommendations, too low = irrelevant results in RAG context.

- **Embedding field concatenation strategy**: Multi-field embeddings (genre + plot + cast/director) improve quality, but optimal field weighting is unclear. Recommend testing: `f"{' '.join(genres)} | {overview} | Director: {director} | Starring: {top_3_cast}"` format. Validate by manually checking embedding similarity for known-similar movie pairs (The Godfather ↔ Goodfellas should be >0.7).

- **Claude prompt structure for RAG**: Research identifies the need for constrained output but doesn't provide prompt template. Key elements needed: user taste profile summary, candidate movie metadata, output format schema (JSON with movie_id + explanation fields), instruction to only recommend from provided candidates. Phase 6 research should develop and test prompt templates.

- **SVD/KNN retraining trigger**: Research mentions "periodic retraining" but doesn't specify frequency. For portfolio scope, on-demand retraining (manual trigger or on server restart) is sufficient. Future: trigger retrain when N new ratings are added (e.g., every 100 new ratings across all users, or when a user adds 5+ new ratings).

- **Taste quiz movie selection**: Research recommends 15-20 well-known movies for onboarding but doesn't specify which. Criteria: high popularity (everyone recognizes them), genre diversity (cover action, comedy, drama, horror, sci-fi, romance), recency diversity (classics + recent hits). Recommend TMDB's "most popular" endpoint filtered for >8.0 rating and genre distribution.

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- Next.js 15 official docs (App Router, Server Components, Image optimization)
- FastAPI documentation (async patterns, Pydantic validation)
- scikit-learn documentation (TfidfVectorizer, cosine_similarity)
- Surprise library documentation (SVD, KNNBaseline)
- Anthropic API documentation (Claude SDK, structured output)
- ChromaDB documentation (collection management, similarity search)
- Supabase documentation (auth flows, Row Level Security, PostgreSQL patterns)
- TMDB API documentation (rate limits, endpoint specifications, image URLs)

**Architecture Research:**
- Two-stage recommendation system architecture (academic papers on hybrid filtering)
- RAG pipeline design patterns (Anthropic cookbook examples)
- Next.js App Router architecture patterns (Vercel guides)

### Secondary (MEDIUM confidence)

**Features Research:**
- Analysis of Netflix UI patterns (carousel behavior, hero sections, dark mode)
- Letterboxd feature analysis (ratings, watchlists, social discovery)
- JustWatch feature analysis (filtering, streaming aggregation)
- Spotify recommendation UX patterns (Discover Weekly explanations)
- YouTube recommendation transparency (context cards)

**Pitfalls Research:**
- Filter bubble mitigation strategies (diversification algorithms in research literature)
- Cold start problem solutions (onboarding patterns from Spotify, Netflix, Goodreads)
- LLM hallucination prevention (constrained decoding, structured output papers)
- Recommendation system evaluation metrics (precision@k, diversity metrics)

### Tertiary (LOW confidence, needs validation)

**Gaps requiring implementation validation:**
- Optimal fusion layer weighting formula for adaptive blending
- ChromaDB similarity threshold sweet spot for quality vs. recall
- Claude token budget for explanation quality vs. cost tradeoff
- SVD/KNN hyperparameters (number of factors, neighbors) for MovieLens seed data
- Multi-field embedding concatenation format for movie metadata

**Implementation details to determine during development:**
- Exact carousel virtualization strategy (react-window vs. custom vs. none for MVP)
- Taste quiz movie selection criteria and number (15-20 range, specific titles TBD)
- Explanation caching invalidation strategy (when does user taste profile "change enough" to regenerate?)
- Diversity injection selection algorithm (semantic distance vs. genre exploration vs. temporal diversity)

---
*Research completed: 2026-02-10*
*Ready for roadmap: yes*
