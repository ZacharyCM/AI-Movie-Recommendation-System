import { useQuery } from "@tanstack/react-query";
import { fetchMoviesByGenre } from "@/lib/api";
import type { Movie } from "@/types/movie";

/**
 * Fetch movies by TMDB genre ID.
 * Returns the query result with data as Movie[] and isLoading boolean.
 */
export function useMoviesByGenre(genreId: number) {
  const { data, isLoading } = useQuery({
    queryKey: ["movies-genre", genreId],
    queryFn: () => fetchMoviesByGenre(genreId),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    data: data?.results,
    isLoading,
  };
}
