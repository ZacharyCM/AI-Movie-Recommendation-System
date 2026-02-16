"use client";

import { useRecommendations } from "@/hooks/useRecommendations";
import MovieCard from "@/components/movies/MovieCard";
import type { Movie } from "@/types/movie";

export default function RecommendationSection() {
  const { data, isLoading, isError } = useRecommendations(10);

  // Error state or 503: silently hide (don't break browse experience)
  if (isError) {
    return null;
  }

  // Loading state: show skeleton cards
  if (isLoading) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">
          Recommended for You
        </h2>
        <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="min-w-[180px] w-[180px] aspect-[2/3] bg-slate-700 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const { recommendations, strategy } = data;

  // Empty recommendations for content_based strategy
  if (strategy === "content_based" && recommendations.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">
          Recommended for You
        </h2>
        <p className="text-slate-400">
          We&apos;re still learning your taste. Keep rating movies!
        </p>
      </section>
    );
  }

  // No recommendations at all
  if (recommendations.length === 0) {
    return null;
  }

  // Determine title based on strategy
  const title =
    strategy === "popularity_fallback" ? "Popular Right Now" : "Recommended for You";

  // Map recommendations to Movie objects for MovieCard
  const movies: Movie[] = recommendations.map((rec) => ({
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

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
      {strategy === "popularity_fallback" && (
        <p className="text-sm text-slate-400 mb-4">
          Rate 5+ movies to get personalized recommendations
        </p>
      )}
      <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-4">
        {movies.map((movie) => (
          <div key={movie.id} className="min-w-[180px] w-[180px]">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </section>
  );
}
