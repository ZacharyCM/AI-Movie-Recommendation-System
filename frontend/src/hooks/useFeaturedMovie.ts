import { useQuery } from "@tanstack/react-query";
import { fetchFeaturedMovie } from "@/lib/api";

export function useFeaturedMovie() {
  return useQuery({
    queryKey: ["featured-movie"],
    queryFn: fetchFeaturedMovie,
    staleTime: 1000 * 60 * 30, // 30 minutes -- don't change featured movie too often
  });
}
