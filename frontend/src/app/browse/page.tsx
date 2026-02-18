"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { fetchMovies, searchMovies } from "@/lib/api";
import MovieGrid from "@/components/movies/MovieGrid";
import SearchBar from "@/components/movies/SearchBar";
import Carousel from "@/components/movies/Carousel";
import MoodSelector from "@/components/discovery/MoodSelector";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useMoviesByGenre } from "@/hooks/useMoviesByGenre";
import { useMoodRecommendations } from "@/hooks/useMoodRecommendations";
import type { Movie } from "@/types/movie";

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [page, setPage] = useState(1);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Sync search query when URL ?q= param changes (driven by Navbar search)
  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
    setPage(1);
  }, [searchParams]);

  // Full catalog (search + pagination)
  const { data, isLoading } = useQuery({
    queryKey: ["movies", searchQuery, page],
    queryFn: () =>
      searchQuery
        ? searchMovies(searchQuery, page)
        : fetchMovies(page),
    placeholderData: (previousData) => previousData,
  });

  // Carousel data sources
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ["movies", "", 1],
    queryFn: () => fetchMovies(1),
    staleTime: 1000 * 60 * 5,
  });

  const { data: recData, isLoading: recLoading } = useRecommendations(15);
  const { data: moodData, isLoading: moodLoading } = useMoodRecommendations(selectedMood);
  const { data: actionData, isLoading: actionLoading } = useMoviesByGenre(28);
  const { data: scifiData, isLoading: scifiLoading } = useMoviesByGenre(878);
  const { data: thrillerData, isLoading: thrillerLoading } = useMoviesByGenre(53);

  // Map recommendations to Movie[] using same pattern as RecommendationSection
  const recommendationMovies: Movie[] = useMemo(() => {
    if (!recData?.recommendations) return [];
    return recData.recommendations.map((rec) => ({
      id: rec.movie_id,
      title: rec.title,
      poster_path: rec.poster_path,
      overview: rec.overview,
      vote_average: rec.vote_average,
      release_date: rec.release_date,
      genre_ids: [],
      vote_count: 0,
      backdrop_path: null,
    }));
  }, [recData]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const recTitle =
    recData?.strategy === "popularity_fallback"
      ? "Popular Right Now"
      : "Recommended for You";

  const recSubtitle =
    recData?.strategy === "hybrid_collaborative_heavy"
      ? "Powered by users with similar taste"
      : undefined;

  return (
    <div className="space-y-8">
      {/* Mood Selector */}
      <MoodSelector selectedMood={selectedMood} onMoodSelect={setSelectedMood} />

      {/* Carousel Section */}
      <section className="space-y-6">
        {/* Mood results carousel -- only show when mood is selected */}
        {selectedMood && (
          <Carousel
            title={`Movies for your "${selectedMood}" mood`}
            movies={moodData?.results ?? []}
            isLoading={moodLoading}
          />
        )}

        <Carousel
          title="Trending Now"
          movies={trendingData?.results ?? []}
          isLoading={trendingLoading}
        />

        <Carousel
          title={recTitle}
          subtitle={recSubtitle}
          movies={recommendationMovies}
          isLoading={recLoading}
        />

        <Carousel
          title="Action & Adventure"
          movies={actionData ?? []}
          isLoading={actionLoading}
        />
        <Carousel
          title="Sci-Fi"
          movies={scifiData ?? []}
          isLoading={scifiLoading}
        />
        <Carousel
          title="Thrillers"
          movies={thrillerData ?? []}
          isLoading={thrillerLoading}
        />
      </section>

      {/* Full Catalog Section */}
      <div className="border-t border-slate-700 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Full Catalog</h1>
          <SearchBar onSearch={handleSearch} />
        </div>

        {searchQuery && (
          <p className="text-slate-400 mb-4">
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
    </div>
  );
}
