/**
 * Shared Movie types mirroring TMDB API response structure.
 * Used throughout the frontend for type-safe movie data handling.
 */

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface MovieDetail extends Movie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  tagline: string | null;
  credits: { cast: CastMember[] };
  videos: { results: Video[] };
}

export interface PaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/**
 * TMDB image base URL for constructing full image paths.
 * Image sizes: w92, w154, w185, w342, w500, w780, original
 */
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

/**
 * Helper function to build full TMDB image URLs.
 *
 * @param path - Image path from TMDB API (e.g., "/abc123.jpg")
 * @param size - Image size (default: "w500")
 * @returns Full image URL or placeholder if path is null
 */
export function getImageUrl(path: string | null, size: string = "w500"): string {
  if (!path) {
    return "https://via.placeholder.com/500x750?text=No+Image";
  }
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
