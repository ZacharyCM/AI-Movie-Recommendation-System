"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMovies, searchMovies } from "@/lib/api";
import MovieGrid from "@/components/movies/MovieGrid";
import SearchBar from "@/components/movies/SearchBar";

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["movies", searchQuery, page],
    queryFn: () =>
      searchQuery
        ? searchMovies(searchQuery, page)
        : fetchMovies(page),
    placeholderData: (previousData) => previousData,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Browse Movies</h1>
        <SearchBar onSearch={handleSearch} />
      </div>

      {searchQuery && (
        <p className="text-slate-400">
          Results for &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      <MovieGrid movies={data?.results ?? []} isLoading={isLoading} />

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded transition"
          >
            Previous
          </button>
          <span className="text-slate-400">
            Page {page} of {data.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={page >= data.total_pages}
            className="bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
