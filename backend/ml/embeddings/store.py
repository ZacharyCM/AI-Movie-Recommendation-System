"""
ChromaDB interface for movie embedding storage and retrieval.

Provides a simple wrapper around ChromaDB's PersistentClient for storing
and querying movie embeddings with cosine similarity.
"""
import logging
from pathlib import Path
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings

logger = logging.getLogger(__name__)


class EmbeddingStore:
    """
    ChromaDB wrapper for movie embedding storage and retrieval.

    Uses PersistentClient for development (single-worker). Stores embeddings
    in a local directory with cosine similarity indexing.
    """

    def __init__(self, persist_dir: str | None = None):
        """
        Initialize the embedding store.

        Args:
            persist_dir: Directory to persist ChromaDB data. Defaults to
                        backend/ml/embeddings/chroma_db
        """
        if persist_dir is None:
            # Default to chroma_db directory next to this file
            persist_dir = str(Path(__file__).parent / "chroma_db")

        self.persist_dir = persist_dir

        # Create PersistentClient (recommended for development)
        try:
            self.client = chromadb.PersistentClient(
                path=persist_dir,
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            logger.info(f"Initialized ChromaDB at {persist_dir}")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            raise

        # Get or create movies collection with cosine similarity
        try:
            self.collection = self.client.get_or_create_collection(
                name="movies",
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"Loaded collection 'movies' with {self.collection.count()} embeddings")
        except Exception as e:
            logger.error(f"Failed to get/create collection: {e}")
            raise

    def upsert_movies(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        documents: list[str],
        metadatas: list[dict[str, Any]]
    ) -> None:
        """
        Upsert movie embeddings into the collection.

        Uses upsert to make this operation idempotent - safe to re-run.

        Args:
            ids: List of movie IDs (as strings)
            embeddings: List of embedding vectors
            documents: List of text representations used to generate embeddings
            metadatas: List of metadata dicts (title, genres, year)
        """
        try:
            self.collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            logger.info(f"Upserted {len(ids)} embeddings")
        except Exception as e:
            logger.error(f"Failed to upsert embeddings: {e}")
            raise

    def query_similar(
        self,
        query_embedding: list[float],
        n_results: int = 10
    ) -> list[dict[str, Any]]:
        """
        Query for similar movies using cosine similarity.

        Args:
            query_embedding: Query embedding vector
            n_results: Number of results to return

        Returns:
            List of dicts with keys: id, document, metadata, distance
        """
        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results
            )

            # Flatten results into list of dicts
            movies = []
            for i in range(len(results["ids"][0])):
                movies.append({
                    "id": results["ids"][0][i],
                    "document": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i]
                })

            logger.info(f"Found {len(movies)} similar movies")
            return movies

        except Exception as e:
            logger.error(f"Failed to query embeddings: {e}")
            raise

    def get_by_ids(self, ids: list[str]) -> dict[str, Any]:
        """
        Get movies by their IDs.

        Args:
            ids: List of movie IDs to retrieve

        Returns:
            Dict with keys: ids, documents, metadatas, embeddings
        """
        try:
            results = self.collection.get(ids=ids)
            logger.info(f"Retrieved {len(results['ids'])} movies by ID")
            return results
        except Exception as e:
            logger.error(f"Failed to get movies by ID: {e}")
            raise

    def count(self) -> int:
        """
        Get the number of embeddings stored in the collection.

        Returns:
            Number of embeddings
        """
        try:
            return self.collection.count()
        except Exception as e:
            logger.error(f"Failed to count embeddings: {e}")
            raise
