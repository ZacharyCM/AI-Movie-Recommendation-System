# Pitfalls Research

**Domain:** AI-Powered Movie/TV Recommendation Platform
**Researched:** 2026-02-10
**Confidence:** MEDIUM-HIGH

## Critical Pitfalls

### 1. Filter Bubble Amplification

**Risk:** HIGH | **Phase:** Core Engine (Stage 1 + Fusion)

The hybrid system creates a reinforcing feedback loop — content-based narrows by similarity, collaborative narrows by peer behavior, and together they push users into increasingly narrow recommendation tunnels after 10-20 ratings.

**Warning signs:**
- Recommendations become repetitive (same genres/directors dominating)
- Users stop discovering new content
- Top-N lists for different users converge

**Prevention:**
- Inject diversity at the fusion layer: reserve 10-20% of recommendation slots for "exploration" picks
- Track genre distribution of recommendations and enforce minimum variety
- Use the Serendipity parameter when it's added later

**Phase mapping:** Must be designed into the fusion layer during recommendation engine build.

### 2. Cold Start Death Spiral

**Risk:** HIGH | **Phase:** Foundation + Core Engine

New users get poor collaborative filtering results (no data), receive generic/bad recommendations, lose interest, and never generate enough ratings for the system to learn their preferences. Classic chicken-and-egg.

**Warning signs:**
- New users' first recommendations are indistinguishable from "popular" lists
- Users rate < 5 movies before abandoning
- Collaborative filtering scores are all near-zero for new users

**Prevention:**
- Adaptive fusion weights: `α(n) = max(0.9, 1.0 - n*0.02)` where n = rating count. Heavy content-based for new users, gradually blend in collaborative.
- Engaging onboarding: Ask users to rate 5-10 well-known movies at signup (the "taste quiz")
- Fallback to popularity + content-based for users with < 5 ratings
- MovieLens seed data ensures the collaborative model itself is trained; cold start is per-user, not per-system

**Phase mapping:** Onboarding flow in Foundation phase. Adaptive weights in Core Engine phase.

### 3. RAG Hallucination

**Risk:** HIGH | **Phase:** RAG Integration

Claude can fabricate movie details, recommend movies not in your catalog, or generate plausible-sounding but factually wrong explanations. This is the #1 risk with LLM-powered recommendations.

**Warning signs:**
- Explanations reference movies not in TMDB catalog
- Plot details in explanations don't match actual movie
- "Based on your love for X" references movies user hasn't rated

**Prevention:**
- **Constrain Claude's output:** Only recommend from a provided candidate list (IDs from Stage 1)
- **Validate all movie IDs** in Claude's response against your database
- **Use structured output** (JSON mode) so Claude returns parseable recommendations
- **Include movie metadata in the prompt** so Claude doesn't need to recall from training data
- **Set ChromaDB similarity threshold** > 0.7 to ensure retrieval quality
- **Fallback:** If Claude's response fails validation, return Stage 1 results without AI explanation

**Phase mapping:** Core RAG integration phase. Validation must be built alongside, not after.

### 4. Embedding Quality Mismatch

**Risk:** MEDIUM | **Phase:** Data Foundation + RAG

Generic text embedding models (all-MiniLM-L6-v2) are trained on web text and may not capture movie-specific semantic similarity well. "Dark thriller" and "noir detective story" should be close in embedding space but might not be with generic models.

**Warning signs:**
- Semantic search returns irrelevant results
- "Similar" movies don't feel similar to users
- Natural language queries produce unexpected results

**Prevention:**
- **Multi-field embeddings:** Concatenate genre + mood keywords + plot summary + director/cast info before embedding
- **Test embedding quality** early: Manually check that known-similar movies (e.g., The Godfather ↔ Goodfellas) have high cosine similarity
- **Consider domain-tuned models** if generic quality is insufficient (e.g., fine-tune on movie review text)
- Start with all-MiniLM-L6-v2, upgrade only if quality testing fails

**Phase mapping:** Test during data ingestion/embedding phase. Fix before RAG integration.

### 5. TMDB Rate Limit Cascade

**Risk:** MEDIUM-HIGH | **Phase:** Data Foundation

TMDB API allows ~40 requests per 10 seconds. If you fetch movie data on-demand during user requests, moderate traffic will trigger rate limits and cascade into failed pages.

**Warning signs:**
- 429 (Too Many Requests) errors from TMDB
- Movie detail pages showing missing data
- Slow page loads waiting for TMDB responses

**Prevention:**
- **Cache-first architecture:** Fetch and cache movie data in Supabase `movies` table during a seed/ETL process
- **Never call TMDB in the request path** for data you can pre-cache (metadata, images, ratings)
- **Only call TMDB live** for data that changes frequently (trending) or on cache-miss
- **Implement exponential backoff** for TMDB calls with a circuit breaker

**Phase mapping:** Must be solved in Foundation phase during data ingestion design.

### 6. SVD Model Staleness

**Risk:** MEDIUM | **Phase:** Core Engine

The SVD/KNN models are trained on a snapshot of ratings data. As users add new ratings, the models become stale. Recommendations don't reflect recent taste changes.

**Warning signs:**
- User rates a bunch of horror movies but still gets rom-com recommendations
- Prediction accuracy degrades over time
- New movies never appear in collaborative recommendations

**Prevention:**
- **Periodic retraining:** Retrain SVD/KNN on a schedule (daily for active development, could be triggered on N new ratings)
- **For portfolio demo:** Retrain on each server restart or on-demand. No need for a full ML pipeline.
- **Hybrid approach helps:** Content-based adapts instantly to new ratings (no training required)

**Phase mapping:** Design retraining hook during Core Engine phase. Keep it simple for portfolio.

### 7. Claude API Cost Explosion

**Risk:** MEDIUM | **Phase:** RAG Integration

Every recommendation request with AI explanation triggers a Claude API call. At $3/MTok input and $15/MTok output (Claude Sonnet), costs can grow fast if every page load generates fresh explanations.

**Warning signs:**
- Monthly API bill exceeding expectations
- Every recommendation page load triggers a Claude call
- Identical explanations being regenerated

**Prevention:**
- **Cache explanations:** Store generated explanations per (user, movie) pair in Supabase. Only regenerate when user's taste profile significantly changes.
- **Lazy generation:** Don't generate explanations for all recommendations upfront. Generate only when user clicks "Why this?" or opens the detail modal.
- **Batch context:** Send multiple movie candidates in one Claude call rather than one call per movie.
- **Set a token budget:** Limit explanation length to ~200 tokens per movie.

**Phase mapping:** Design caching in RAG phase. Implement lazy generation in UI.

### 8. Overcomplicated Onboarding

**Risk:** MEDIUM | **Phase:** Foundation (Auth + UI)

If the first experience is "sign up, then stare at an empty page until you rate 20 movies," users will bounce. The onboarding must demonstrate value immediately.

**Warning signs:**
- Users sign up but never complete the taste quiz
- First-time recommendations are generic "top popular" lists
- Time-to-first-personalized-rec exceeds 2 minutes

**Prevention:**
- **Taste quiz on signup:** Show 15-20 well-known movies, ask user to rate at least 5
- **Instant gratification:** After 5 ratings, immediately show "Based on your ratings..." recommendations
- **Progressive enhancement:** Start with content-based (works with few ratings), blend in collaborative as data grows
- **Pre-seeded demo mode:** Allow browsing without auth, show "Sign up to get personalized recommendations"

**Phase mapping:** Design onboarding flow in Foundation phase.

### 9. Frontend Performance with Large Movie Lists

**Risk:** MEDIUM | **Phase:** UI Polish

Netflix-style horizontal carousels with high-res images, trailers, and animations can become performance nightmares. Hundreds of movie cards rendering simultaneously will tank performance.

**Warning signs:**
- Jank/stuttering when scrolling carousels
- High memory usage (images not lazy-loaded)
- Long initial page load (too many API calls)

**Prevention:**
- **Virtualize carousels:** Only render visible cards + buffer. Use react-window or custom virtualization.
- **Lazy load images:** Use Next.js `<Image>` with `loading="lazy"` and TMDB's multiple image sizes (w200, w500, original)
- **Skeleton loading states:** Show placeholder cards while data loads
- **Limit initial data:** Load 6-8 rows with 20 movies each, paginate on scroll
- **Defer animations:** Only animate cards that enter the viewport

**Phase mapping:** Address during UI/polish phase. Don't optimize prematurely.

### 10. Implicit vs Explicit Feedback Confusion

**Risk:** LOW-MEDIUM | **Phase:** Core Engine

Relying only on explicit ratings (stars) misses behavioral signals. A user who watches a movie detail page for 2 minutes and adds it to their watchlist probably likes it, even without a star rating.

**Warning signs:**
- Users have few explicit ratings but lots of browsing history
- Recommendation quality doesn't improve despite active usage
- Star ratings feel like friction

**Prevention:**
- **Design the schema for implicit feedback** from the start: track page views, watchlist adds, time-on-page, clicks
- **Don't block on this for v1:** Explicit ratings (stars) are sufficient for portfolio demo
- **Future enhancement:** Incorporate implicit signals into a combined preference score

**Phase mapping:** Schema design in Foundation. Implementation deferred to post-v1.

## Integration Gotchas

### TMDB API
- Rate limit: 40 requests per 10 seconds — always cache
- Image URLs require a base URL prefix: `https://image.tmdb.org/t/p/{size}/`
- Movie and TV show APIs are separate endpoints
- Some movies lack trailers — need fallback UI state

### Claude API (Anthropic SDK)
- Streaming responses recommended for explanation generation (better UX)
- Set `max_tokens` to prevent runaway costs
- System prompt should constrain Claude to only reference provided movie data
- Handle rate limits and timeouts gracefully with retries

### Supabase
- Row Level Security (RLS) must be enabled on all tables with user data
- Supabase Auth tokens expire — handle refresh in Next.js middleware
- Connection pooling via Supavisor for backend connections
- Real-time subscriptions add complexity — skip unless needed

### ChromaDB
- Persistent storage requires specifying a `persist_directory`
- Collection metadata is limited — store rich data in Supabase, IDs in ChromaDB
- Batch embedding insertion is much faster than individual inserts
- Default distance function is L2; switch to cosine for text similarity

## "Looks Done But Isn't" Checklist

Things that seem complete but commonly have gaps:

- [ ] Auth works but refresh tokens aren't handled (sessions expire)
- [ ] Ratings save but don't trigger recommendation refresh
- [ ] Recommendations generated but no loading/empty states
- [ ] Movie details show but trailer player has no fallback for missing trailers
- [ ] Search works for exact titles but fails on partial matches
- [ ] AI explanations generate but aren't cached (cost explosion)
- [ ] Carousel scrolls but no keyboard navigation or touch support
- [ ] Dark mode looks great but contrast ratios fail accessibility
- [ ] Deployment works but environment variables aren't set (TMDB key, Claude key, Supabase URL)

## Recovery Strategies

| Pitfall | If It Happens | Recovery Cost |
|---------|---------------|---------------|
| Filter bubble | Add diversity injection to fusion layer | LOW (1-2 hours) |
| Cold start | Add taste quiz onboarding flow | MEDIUM (4-8 hours) |
| RAG hallucination | Add validation layer + constrained output | MEDIUM (4-8 hours) |
| Embedding quality | Switch to multi-field embeddings | MEDIUM (re-embed all movies) |
| TMDB rate limits | Build cache layer + ETL pipeline | HIGH if not designed upfront |
| Cost explosion | Add caching + lazy generation | LOW (2-4 hours) |

---
*Pitfalls research for: AI-Powered Movie/TV Recommendation Platform*
*Researched: 2026-02-10*
