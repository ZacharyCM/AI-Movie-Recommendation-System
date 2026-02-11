# NetflixRecs — AI Recommendation Platform

## What This Is

A premium movie and TV show discovery platform that mirrors the Netflix user experience, powered by a hybrid AI recommendation engine. It combines behavioral math (content-based filtering + collaborative filtering) with semantic reasoning (RAG-powered re-ranking via Claude) to deliver personalized recommendations with natural language explanations of *why* you'll love something. Built as a portfolio showpiece demonstrating AI engineering and production-quality frontend craft.

## Core Value

Smart, explainable recommendations — users rate movies, get personalized suggestions that *feel* intelligent, and can search in natural language ("something gritty like The Batman but with 80s synth-wave vibes") with Claude-powered explanations connecting recommendations to their personal taste.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

- [ ] Two-stage recommendation pipeline (candidate generation → RAG re-ranking)
- [ ] Content-based filtering with TF-IDF + cosine similarity on movie metadata
- [ ] Collaborative filtering with SVD and User-User KNN via Surprise library
- [ ] RAG re-ranking with Claude via Anthropic SDK + ChromaDB vector store
- [ ] Natural language search ("Command Palette" style, Cmd+K) triggering RAG retrieval
- [ ] AI-generated recommendation explanations ("Based on your love for X, you'll enjoy this because...")
- [ ] Netflix-aesthetic dark UI with cinematic hero section featuring video trailers
- [ ] Horizontal scrolling carousels with staggered reveal animations
- [ ] Interactive movie/show detail modal with AI explanation
- [ ] Full auth flow (sign up, login, persistent profiles)
- [ ] User rating system to build taste profiles
- [ ] TMDB API integration for movie/TV catalog, images, and trailers
- [ ] MovieLens dataset seeding for collaborative filtering from day one
- [ ] Supabase for auth, user data, and movie metadata storage

### Out of Scope

- Mobile native app — web-first, responsive design sufficient
- Real-time chat or social features — not core to recommendation value
- Admin dashboard — portfolio demo doesn't need content moderation
- Payment/subscription system — free portfolio demo
- User-generated content (reviews, lists) — focus is on AI recommendations, not community

## Context

- **Portfolio project** — needs to impress technically and visually. The full flow (sign up → rate → get recs → search → AI explanations) should be demo-able end-to-end.
- **TMDB API** provides movie/TV metadata, poster images, backdrop images, and trailer video links. Free tier with API key.
- **MovieLens dataset** (100K+ ratings) pre-seeds collaborative filtering so recommendations work immediately without needing organic user ratings.
- **ChromaDB** stores movie embeddings for semantic search and RAG retrieval. Chosen over FAISS for persistence and cleaner API.
- **Anthropic SDK used directly** (no LangChain/LlamaIndex) for RAG pipeline — less abstraction, more control, better learning experience.

## Constraints

- **Tech stack**: Next.js (App Router) + Tailwind CSS + Framer Motion for frontend; FastAPI (Python) for backend
- **Auth/DB**: Supabase (auth + PostgreSQL for relational data)
- **ML**: scikit-learn (TF-IDF, cosine similarity), Surprise (SVD, KNN)
- **LLM**: Claude via Anthropic SDK
- **Vector DB**: ChromaDB
- **Data**: TMDB API + MovieLens seed dataset
- **Deployment**: Vercel (frontend) + Railway or Render (FastAPI backend)
- **Design**: Dark mode default, deep slate/black palette (#0f172a), vibrant accent color (Netflix Red or Neon Indigo)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Direct Anthropic SDK over LangChain/LlamaIndex | Simpler, less abstraction for a focused RAG pipeline. More control over retrieval logic. | — Pending |
| ChromaDB over FAISS | Persistent storage, cleaner API, easier deployment vs in-memory only | — Pending |
| Supabase for auth + DB | Full auth system with PostgreSQL, Row Level Security, free tier sufficient for portfolio | — Pending |
| MovieLens seed data | Enables collaborative filtering from day one without needing organic user ratings | — Pending |
| TMDB API for catalog | Rich metadata, images, trailers. Industry standard for movie data | — Pending |

---
*Last updated: 2026-02-08 after initialization*
