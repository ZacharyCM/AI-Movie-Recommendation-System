import type { Movie, MovieDetail, PaginatedResponse } from "@/types/movie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchMovies(
  page: number = 1
): Promise<PaginatedResponse<Movie>> {
  const res = await fetch(`${API_URL}/api/movies?page=${page}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export async function searchMovies(
  query: string,
  page: number = 1
): Promise<PaginatedResponse<Movie>> {
  const res = await fetch(
    `${API_URL}/api/movies/search?query=${encodeURIComponent(query)}&page=${page}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export async function fetchMovieDetail(id: number): Promise<MovieDetail> {
  const res = await fetch(`${API_URL}/api/movies/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}
