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

export async function fetchMoviesByGenre(
  genreId: number,
  page: number = 1
): Promise<PaginatedResponse<Movie>> {
  const res = await fetch(
    `${API_URL}/api/movies/genre/${genreId}?page=${page}`,
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

export async function fetchFeaturedMovie(): Promise<MovieDetail> {
  const res = await fetch(`${API_URL}/api/movies/featured`, { cache: "no-store" });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export interface Recommendation {
  movie_id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  release_date: string;
  score: number;
  reason: string;
}

export interface RecommendationList {
  recommendations: Recommendation[];
  strategy: string;
  total_ratings: number;
}

export async function fetchRecommendations(
  accessToken: string,
  topN: number = 10
): Promise<RecommendationList> {
  const res = await fetch(
    `${API_URL}/api/recommendations?top_n=${topN}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export interface SemanticSearchResult {
  movie_id: number;
  title: string;
  year: string;
  genres: string;
  score: number;
}

export interface SemanticSearchResponse {
  results: SemanticSearchResult[];
  query: string;
}

export async function fetchSemanticSearch(
  query: string,
  topN: number = 10
): Promise<SemanticSearchResponse> {
  const res = await fetch(
    `${API_URL}/api/search/semantic?q=${encodeURIComponent(query)}&top_n=${topN}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export interface ExplanationResponse {
  movie_id: number;
  explanation: string;
  factors: string[];
  cached: boolean;
}

export async function fetchExplanation(
  accessToken: string,
  movieId: number
): Promise<ExplanationResponse> {
  const res = await fetch(
    `${API_URL}/api/recommendations/${movieId}/explain`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}
