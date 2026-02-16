# Phase 05 Plan 01: Movie Embeddings & ChromaDB Foundation Summary

**One-liner:** Movie embeddings generated with sentence-transformers (all-MiniLM-L6-v2) and stored in ChromaDB with cosine similarity indexing for semantic search and RAG context retrieval

**Completed:** 2026-02-16
**Duration:** 5m 28s

---

## Plan Metadata

```yaml
phase: 05-embeddings-rag-ai-explanations
plan: 01
subsystem: ml-embeddings
tags: [embeddings, chromadb, sentence-transformers, semantic-search, rag]
```

## What Was Built

Created a movie embedding system that generates 384-dimensional semantic embeddings for all movies in the TF-IDF catalog and stores them in ChromaDB for semantic search and RAG-based AI explanations.

**Core Components:**

1. **EmbeddingStore** (`backend/ml/embeddings/store.py`) - ChromaDB wrapper providing:
   - `upsert_movies()` - Idempotent embedding storage
   - `query_similar()` - Cosine similarity search
   - `get_by_ids()` - Direct lookup by movie IDs
   - `count()` - Collection size tracking

2. **Embedding Builder** (`backend/ml/embeddings/builder.py`) - Script that:
   - Loads TF-IDF catalog movie IDs (260 movies)
   - Fetches detailed metadata from TMDB API
   - Builds natural language text representations
   - Generates embeddings using sentence-transformers
   - Stores in ChromaDB with metadata

3. **ChromaDB Persistent Database** (`backend/ml/embeddings/chroma_db/`) - Vector store with:
   - 260 movie embeddings (384 dimensions each)
   - Cosine similarity indexing (HNSW algorithm)
   - Metadata: title, genres, year

**Text Representation Format:**
```
"[Title] [Overview] Genres: [genre1, genre2] Director: [name] Cast: [actor1, actor2, actor3]"
```

**Why natural language?** Unlike TF-IDF which strips spaces ("BradPitt"), sentence-transformers perform better with natural text since they're pre-trained on readable sentences.

## Dependency Graph

**Requires:**
- Phase 03 TF-IDF catalog (`backend/ml/models/movie_ids.pkl`)
- TMDB API for fetching movie details

**Provides:**
- `EmbeddingStore` class for semantic search (used by Plan 05-03)
- Movie embeddings for RAG context retrieval (used by Plan 05-02)

**Affects:**
- Future semantic search endpoints
- AI explanation generation system

## Tech Stack

**Added:**
- `chromadb>=0.4.0` - Vector database with cosine similarity
- `sentence-transformers>=2.0.0` - Pre-trained embedding models
- Sentence-transformers model: `all-MiniLM-L6-v2` (384-dim, fast, good quality)

**Patterns:**
- PersistentClient for single-worker development (not HttpClient)
- Idempotent upsert operations (safe re-runs)
- Async TMDB fetching with rate limiting (0.25s between requests)
- Natural language text over keyword-stuffed metadata

## Key Files

**Created:**
- `backend/ml/embeddings/__init__.py` - Package marker
- `backend/ml/embeddings/store.py` - ChromaDB interface (EmbeddingStore class)
- `backend/ml/embeddings/builder.py` - Embedding generation script
- `backend/ml/embeddings/chroma_db/` - Persistent vector database (260 embeddings)

**Modified:**
- `backend/requirements.txt` - Added chromadb and sentence-transformers

## Task Breakdown

### Task 1: Install dependencies and create EmbeddingStore ChromaDB interface
**Commit:** aaaa8b3
**Files:** requirements.txt, store.py, __init__.py

- Added chromadb and sentence-transformers to requirements.txt
- Created `EmbeddingStore` class with PersistentClient
- Implemented upsert, query, get_by_ids, count methods
- Configured cosine similarity indexing (`hnsw:space: cosine`)
- Basic error handling with logging

**Verification:** ✓ EmbeddingStore().count() returns 0 on empty collection

### Task 2: Create embedding builder script and generate movie embeddings
**Commit:** ed4e970
**Files:** builder.py

- Loaded 260 movie IDs from TF-IDF catalog
- Fetched movie details from TMDB with rate limiting
- Built natural language text representations
- Generated embeddings using SentenceTransformer('all-MiniLM-L6-v2')
- Stored in ChromaDB with title/genres/year metadata
- Script is idempotent (uses upsert)

**Verification:** ✓ 260 embeddings stored in ChromaDB
**Verification:** ✓ Semantic search for "dark thriller" returns relevant horror/thriller movies

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Used PersistentClient over HttpClient** - Research recommended PersistentClient for single-worker development. HttpClient is for distributed production deployments.

2. **Natural language text representations** - Unlike TF-IDF's space-stripped format ("BradPitt"), sentence-transformers work better with natural text since they're pre-trained on readable sentences.

3. **Model selection: all-MiniLM-L6-v2** - Chosen from research for balance of speed (384-dim) and quality. Alternative was all-mpnet-base-v2 (768-dim, slower but higher quality).

4. **Metadata structure** - Stored title, genres (comma-separated), year as metadata for filtering and display. Kept simple - additional fields can be added later if needed.

## Testing & Verification

**Unit Testing:**
- ✓ EmbeddingStore initialization creates empty collection
- ✓ 260 embeddings stored after builder run
- ✓ query_similar() returns movies ranked by cosine distance

**Semantic Search Test:**
Query: "dark thriller"
Results:
1. Black Phone 2 (2025) - Horror, Thriller - Distance: 0.482
2. The Hidebehind (2018) - Horror - Distance: 0.498
3. Silent Night, Deadly Night (2025) - Horror, Thriller - Distance: 0.505

**File Verification:**
- ✓ `chroma_db/chroma.sqlite3` exists (2.3 MB)
- ✓ ChromaDB collection UUID directory created
- ✓ All created files exist and are importable

## Performance Metrics

- **Total duration:** 5m 28s
- **Tasks completed:** 2/2
- **Files created:** 3 (+ chroma_db directory)
- **Embeddings generated:** 260
- **Embedding dimension:** 384
- **ChromaDB size:** ~2.3 MB

**Builder Performance:**
- TMDB fetch time: ~1m 50s (260 movies × 0.25s rate limit)
- Model download: ~30s (first run only)
- Embedding generation: ~4s (9 batches × 32 movies/batch)
- ChromaDB storage: ~0.3s

## Known Limitations

1. **HuggingFace warning** - "You are sending unauthenticated requests to the HF Hub." This is cosmetic - downloading works fine, but setting HF_TOKEN would enable faster downloads and higher rate limits.

2. **Single-worker limitation** - PersistentClient doesn't support concurrent writes. For production with multiple workers, would need to switch to HttpClient with ChromaDB server.

3. **Fixed catalog** - Embeddings are only generated for movies in TF-IDF catalog. New movies require re-running builder (though it's idempotent).

4. **No incremental updates** - Builder fetches all movies from scratch. Could optimize by checking which movies are missing from ChromaDB.

## Next Steps

**Immediate (Plan 05-02 - RAG AI Explanations):**
- Use EmbeddingStore to retrieve similar movies for context
- Pass context to Claude API for explanation generation
- Implement prompt engineering for personalized explanations

**Soon (Plan 05-03 - Semantic Search):**
- Create `/movies/search/semantic` endpoint
- Use query_similar() for natural language search
- Combine with keyword search for hybrid results

**Future Optimizations:**
- Add incremental embedding updates (only new movies)
- Implement embedding cache/refresh strategy
- Consider switching to HttpClient for production scalability

## Self-Check: PASSED

**Created files verified:**
- ✓ FOUND: backend/ml/embeddings/__init__.py
- ✓ FOUND: backend/ml/embeddings/store.py
- ✓ FOUND: backend/ml/embeddings/builder.py
- ✓ FOUND: backend/ml/embeddings/chroma_db/chroma.sqlite3

**Commits verified:**
- ✓ FOUND: aaaa8b3 (Task 1 - EmbeddingStore)
- ✓ FOUND: ed4e970 (Task 2 - Builder)

**Functional verification:**
- ✓ EmbeddingStore().count() returns 260
- ✓ Semantic search returns relevant results
- ✓ Dependencies installed (chromadb 1.5.0, sentence-transformers 5.2.2)
