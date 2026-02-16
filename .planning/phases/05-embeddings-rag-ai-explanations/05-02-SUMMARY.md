---
phase: 05-embeddings-rag-ai-explanations
plan: 02
subsystem: api, ui, ai
tags: [anthropic, claude, rag, chromadb, react-query, framer-motion, supabase, postgresql]

# Dependency graph
requires:
  - phase: 05-01
    provides: ChromaDB embedding store with movie embeddings, EmbeddingStore interface
provides:
  - ExplanationService implementing full RAG pipeline (cache → retrieval → augmentation → generation → cache)
  - GET /api/recommendations/{movie_id}/explain endpoint with authentication
  - ExplanationButton component with lazy loading and smooth animations
  - AI-powered explanations referencing user's personal ratings and recommendation factors
affects: [06-ui-discovery-enhancements]

# Tech tracking
tech-stack:
  added: [anthropic>=0.18.0, AsyncAnthropic client]
  patterns:
    - RAG pipeline pattern (retrieval-augmented generation)
    - 7-day cache expiration for AI-generated content
    - Lazy-loaded React hooks (enabled: !!condition)
    - Framer Motion AnimatePresence for expand/collapse UI

key-files:
  created:
    - backend/services/explanations.py
    - frontend/src/hooks/useExplanation.ts
    - frontend/src/components/recommendations/ExplanationButton.tsx
  modified:
    - backend/config.py
    - backend/dependencies.py
    - backend/routers/recommendations.py
    - backend/schemas/recommendation.py
    - frontend/src/lib/api.ts
    - frontend/src/components/recommendations/RecommendationSection.tsx

key-decisions:
  - "Used Claude Sonnet 4.5 (cost-effective model) for short explanations instead of Opus"
  - "7-day cache expiration balances freshness with API cost reduction"
  - "AsyncAnthropic client for FastAPI async compatibility"
  - "Graceful fallback (genre-based explanation) when Claude API unavailable"
  - "Lazy loading pattern: only fetch explanation when user clicks 'Why this?'"
  - "Self-bootstrapping table creation via Supabase service role client"
  - "Only show ExplanationButton for personalized strategies (not popularity_fallback)"

patterns-established:
  - "RAG pipeline: Cache check → Retrieval (ratings + embeddings + metadata) → Structured prompt → Claude generation → Cache storage"
  - "Structured prompts with XML-like tags (<user_taste>, <recommended_movie>, etc.) for Claude"
  - "JSON response parsing with fallback to raw text wrapping"
  - "Factor pills for transparent AI reasoning (content_similarity, collaborative_filtering, genre_match, etc.)"
  - "AnimatePresence for smooth expand/collapse with height: auto animation"

# Metrics
duration: 5m 46s
completed: 2026-02-16
---

# Phase 05 Plan 02: AI-Powered Recommendation Explanations Summary

**RAG pipeline delivering natural language explanations via Claude Sonnet 4.5, ChromaDB retrieval, and PostgreSQL caching with 'Why this?' button UI**

## Performance

- **Duration:** 5m 46s
- **Started:** 2026-02-16T23:48:07Z
- **Completed:** 2026-02-16T23:53:53Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Full RAG pipeline with 5-step flow: cache check, retrieval (user ratings + ChromaDB similar movies + TMDB metadata), structured prompt augmentation, Claude generation, and cache storage
- GET /api/recommendations/{movie_id}/explain endpoint with Bearer token authentication
- ExplanationButton React component with lazy loading, Framer Motion animations, and factor pills
- Graceful fallback explanations when Claude API fails (genre-based fallback maintains UX)
- 7-day cache expiration reduces API costs for repeat explanation views

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ExplanationService with RAG pipeline, caching, and API endpoint** - `37aefdc` (feat)
2. **Task 2: Build "Why this?" button component and integrate into recommendation cards** - `3f65145` (feat)

_Note: Task 2 frontend changes were bundled with plan 05-03 commit due to concurrent development_

## Files Created/Modified

**Backend:**
- `backend/services/explanations.py` - ExplanationService with full RAG pipeline (413 lines)
- `backend/config.py` - Added anthropic_api_key configuration
- `backend/dependencies.py` - Registered explanation_service singleton
- `backend/routers/recommendations.py` - Added GET /{movie_id}/explain endpoint
- `backend/schemas/recommendation.py` - Added ExplanationResponse schema
- `backend/requirements.txt` - Added anthropic>=0.18.0 dependency

**Frontend:**
- `frontend/src/hooks/useExplanation.ts` - React Query hook with lazy loading
- `frontend/src/components/recommendations/ExplanationButton.tsx` - "Why this?" button with animations
- `frontend/src/lib/api.ts` - Added fetchExplanation API function
- `frontend/src/components/recommendations/RecommendationSection.tsx` - Integrated ExplanationButton below cards

## Decisions Made

1. **Claude Sonnet 4.5 over Opus**: Cost-effective for short explanations (2-3 sentences), max_tokens=400, temperature=0.7
2. **7-day cache expiration**: Balances freshness (ratings may change) with API cost savings for repeat views
3. **Self-bootstrapping table creation**: ExplanationService attempts to create ai_explanations table on init via Supabase service role client
4. **Structured prompt with XML tags**: `<user_taste>`, `<recommended_movie>`, `<similar_movies_in_catalog>`, `<recommendation_context>` for clear Claude input
5. **JSON response parsing with fallback**: Attempts to parse Claude response as JSON, wraps raw text if parsing fails
6. **Lazy loading UI pattern**: useExplanation hook only enabled when movieId is not null (user clicks button)
7. **Factor pills for transparency**: Display human-readable AI reasoning factors (Content Similarity, Similar Users, etc.)
8. **Graceful fallback**: When Claude API fails, return genre-based explanation instead of error
9. **Only show for personalized strategies**: ExplanationButton hidden for popularity_fallback (no personalization to explain)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Both backend RAG pipeline and frontend UI component implementation proceeded smoothly.

## User Setup Required

**External services require manual configuration.**

**Anthropic API Key:**
- **Service:** Claude API (Anthropic)
- **Why:** Generate natural language explanations for recommendations
- **How to get:**
  1. Visit https://console.anthropic.com/settings/keys
  2. Create a new API key
  3. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
- **Verification:** Start backend, click "Why this?" on a recommendation - should see AI explanation

**Database Table Creation:**
The `ai_explanations` table is self-bootstrapping (created automatically on first run), but if manual creation is needed:

```sql
CREATE TABLE IF NOT EXISTS ai_explanations (
  user_id UUID NOT NULL,
  movie_id INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  factors TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  PRIMARY KEY (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_explanations_expires ON ai_explanations(expires_at);
```

## Next Phase Readiness

**Ready for Phase 05 Plan 03 (Semantic Search & Command Palette):**
- ExplanationService uses ChromaDB embeddings for similar movie retrieval
- RAG pipeline patterns can be applied to semantic search query processing
- Frontend hooks and UI components follow patterns that can be extended

**Blockers:** None

**Validation:**
- ExplanationService imports successfully
- API endpoint returns 500 without ANTHROPIC_API_KEY (expected - requires user setup)
- Frontend builds without TypeScript errors
- ExplanationButton integrates cleanly into RecommendationSection

## Self-Check: PASSED

**Files verified:**
- ✓ backend/services/explanations.py
- ✓ frontend/src/hooks/useExplanation.ts
- ✓ frontend/src/components/recommendations/ExplanationButton.tsx

**Commits verified:**
- ✓ 37aefdc (Task 1: ExplanationService with RAG pipeline)
- ✓ 3f65145 (Task 2: ExplanationButton UI component)

---
*Phase: 05-embeddings-rag-ai-explanations*
*Completed: 2026-02-16*
