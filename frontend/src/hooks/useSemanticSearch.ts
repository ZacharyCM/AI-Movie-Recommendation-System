"use client";

import { useState, useEffect } from "react";
import {
  fetchSemanticSearch,
  type SemanticSearchResult,
} from "@/lib/api";

export function useSemanticSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only search if query is at least 3 characters
    if (query.length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Debounce search by 300ms
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetchSemanticSearch(query);
        setResults(response.results);
      } catch (error) {
        console.error("Semantic search failed:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  return {
    query,
    setQuery,
    results,
    isLoading,
  };
}
