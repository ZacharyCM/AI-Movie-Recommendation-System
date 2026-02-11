# Stack Research

**Domain:** AI-Powered Movie/TV Recommendation Platform
**Researched:** 2026-02-10
**Confidence:** MEDIUM

## Recommended Stack

### Frontend

| Technology | Version | Purpose | Confidence |
|-----------|---------|---------|------------|
| Next.js (App Router) | 15.x | React framework with SSR/RSC, routing, API routes | HIGH |
| React | 19.x | UI library | HIGH |
| Tailwind CSS | 4.x | Utility-first CSS for Netflix-style dark UI | HIGH |
| Framer Motion | 11.x | Animations (carousels, modals, staggered reveals) | HIGH |
| Lucide React | latest | Icon library | HIGH |
| Zustand | 5.x | Lightweight client state management | MEDIUM |
| TanStack Query | 5.x | Server state, caching, background refetching | HIGH |
| next-themes | latest | Dark/light mode (default dark) | HIGH |

**Why these choices:**
- **Next.js App Router** over Pages Router: Server Components reduce bundle size, better streaming for AI responses. App Router is the standard path forward.
- **Zustand** over Redux: Less boilerplate, simpler for a portfolio project. No need for Redux's middleware complexity.
- **TanStack Query** for API state: Handles caching, loading states, and background refetching. Perfect for recommendation data that changes based on user actions.
- **Framer Motion** over CSS animations: Declarative API makes complex Netflix-style animations (stagger, layout, exit) manageable.

**What NOT to use:**
- Redux Toolkit — overkill for this project's state needs
- Styled Components / CSS Modules — Tailwind is faster to develop with and produces a more consistent design system
- GSAP — Framer Motion has better React integration

### Backend

| Technology | Version | Purpose | Confidence |
|-----------|---------|---------|------------|
| FastAPI | 0.115.x | Python API framework, async support | HIGH |
| Python | 3.12 | Runtime | HIGH |
| Pydantic | 2.x | Request/response validation, settings management | HIGH |
| Uvicorn | 0.32.x | ASGI server | HIGH |
| httpx | 0.28.x | Async HTTP client (TMDB API calls) | HIGH |

**Why FastAPI:**
- Native async for non-blocking TMDB/Claude API calls
- Automatic OpenAPI docs (great for portfolio)
- Pydantic validation built-in
- Python ecosystem aligns with ML libraries (scikit-learn, Surprise)

**What NOT to use:**
- Django — too heavyweight, ORM not needed with Supabase
- Flask — no native async, FastAPI is the modern standard
- Express/Node — would require separate ML service; Python keeps everything in one backend

### ML / AI

| Technology | Version | Purpose | Confidence |
|-----------|---------|---------|------------|
| scikit-learn | 1.6.x | TF-IDF vectorization, cosine similarity | HIGH |
| Surprise | 1.1.x | SVD, KNN collaborative filtering | HIGH |
| anthropic (SDK) | 0.42.x | Claude API client for RAG explanations | HIGH |
| chromadb | 0.6.x | Vector database for movie embeddings | MEDIUM |
| sentence-transformers | 3.x | Generate movie embeddings (all-MiniLM-L6-v2 or similar) | MEDIUM |
| numpy | 2.x | Numerical operations | HIGH |
| pandas | 2.x | Data manipulation (MovieLens, TMDB data) | HIGH |

**Why this ML stack:**
- **scikit-learn** for TF-IDF + cosine: Industry standard, well-documented, fast for the scale we need
- **Surprise** for collaborative filtering: Purpose-built for recommendation algorithms, clean API for SVD/KNN
- **Anthropic SDK direct** over LangChain: Less abstraction, more control over the RAG pipeline, better for learning and demonstrating understanding
- **ChromaDB** over FAISS: Persistent storage, simpler API, better for deployment. FAISS is in-memory only.
- **sentence-transformers** for embeddings: Pre-trained models handle movie text well. all-MiniLM-L6-v2 balances quality and speed.

**What NOT to use:**
- LangChain — adds abstraction without clear benefit for a focused RAG pipeline
- PyTorch/TensorFlow — no custom model training needed; pre-trained embeddings + scikit-learn sufficient
- Pinecone — managed vector DB adds cost; ChromaDB is free and self-hosted

### Database & Auth

| Technology | Version | Purpose | Confidence |
|-----------|---------|---------|------------|
| Supabase | latest | Auth + PostgreSQL + Row Level Security | HIGH |
| PostgreSQL (via Supabase) | 15+ | Relational data (users, ratings, movies, watchlists) | HIGH |
| ChromaDB | 0.6.x | Vector store (movie embeddings for RAG) | MEDIUM |

**Data separation strategy:**
- **Supabase/Postgres**: User accounts, ratings, watchlists, movie metadata cache, viewing history
- **ChromaDB**: Movie embeddings for semantic search and RAG retrieval

**Why Supabase:**
- Auth with email/password out of the box
- PostgreSQL with Row Level Security
- Real-time subscriptions (future use)
- Free tier sufficient for portfolio
- Client libraries for Next.js

### Data Sources

| Source | Purpose | Access |
|--------|---------|--------|
| TMDB API | Movie/TV metadata, images, trailers | Free API key, 40 req/10s rate limit |
| MovieLens (ml-25m) | Seed ratings for collaborative filtering | Free download, 25M ratings |

### Deployment

| Service | Purpose | Confidence |
|---------|---------|------------|
| Vercel | Next.js frontend hosting | HIGH |
| Railway or Render | FastAPI backend + ChromaDB | MEDIUM |
| Supabase Cloud | Managed Postgres + Auth | HIGH |

**Deployment notes:**
- Vercel handles Next.js natively with edge functions
- Railway/Render for Python backend — Railway has better DX, Render has free tier
- ChromaDB runs alongside FastAPI on the same Railway/Render service
- Supabase Cloud free tier: 500MB database, 50K monthly active users

### Dev Tooling

| Tool | Purpose |
|------|---------|
| pnpm | Frontend package manager (faster than npm) |
| uv or pip | Python dependency management |
| ESLint + Prettier | Frontend code quality |
| Ruff | Python linting (fast, replaces flake8+isort+black) |
| pytest | Python testing |
| Vitest | Frontend testing |

## Alternatives Considered

| Choice | Alternative | Why Not |
|--------|-------------|---------|
| ChromaDB | Pinecone | Managed service adds cost; ChromaDB is free, self-hosted |
| ChromaDB | FAISS | In-memory only, no persistence without extra work |
| Zustand | Redux Toolkit | Overkill for this project's state complexity |
| Anthropic SDK | LangChain | Unnecessary abstraction for a focused RAG pipeline |
| Surprise | implicit library | Surprise has cleaner API for explicit ratings (stars) |
| Supabase | Firebase | PostgreSQL > Firestore for relational movie data |
| FastAPI | Django REST | Too heavyweight; FastAPI is faster to develop and deploy |

## Installation Commands

**Frontend:**
```bash
pnpm create next-app@latest frontend --typescript --tailwind --app --src-dir
cd frontend && pnpm add framer-motion lucide-react zustand @tanstack/react-query @supabase/supabase-js next-themes
```

**Backend:**
```bash
pip install fastapi uvicorn[standard] pydantic-settings httpx anthropic chromadb scikit-learn surprise sentence-transformers pandas numpy python-dotenv
```

---
*Stack research for: AI-Powered Movie/TV Recommendation Platform*
*Researched: 2026-02-10*
