import { useQuery } from "@tanstack/react-query";
import { fetchMoods, fetchMoviesByMood } from "@/lib/api";

export function useMoodRecommendations(mood: string | null) {
  return useQuery({
    queryKey: ["movies-mood", mood],
    queryFn: () => fetchMoviesByMood(mood!),
    enabled: !!mood,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMoods() {
  return useQuery({
    queryKey: ["moods"],
    queryFn: fetchMoods,
    staleTime: 1000 * 60 * 60,
  });
}
