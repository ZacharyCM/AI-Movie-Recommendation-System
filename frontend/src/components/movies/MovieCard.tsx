"use client";

import Image from "next/image";
import Link from "next/link";
import type { Movie } from "@/types/movie";
import { getImageUrl } from "@/types/movie";
import { StarRating } from "@/components/engagement/StarRating";
import { WatchlistButton } from "@/components/engagement/WatchlistButton";
import { useMovieRating, useRateMovie } from "@/hooks/useRatings";

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const year = movie.release_date ? movie.release_date.split("-")[0] : "";
  const { data: userRating } = useMovieRating(movie.id);
  const rateMutation = useRateMovie();

  const handleRatingChange = (rating: number) => {
    rateMutation.mutate({ movieId: movie.id, rating });
  };

  return (
    <Link href={`/movies/${movie.id}`}>
      <div className="group rounded-lg overflow-hidden bg-slate-800 transition-transform hover:scale-105 hover:shadow-lg">
        <div className="relative aspect-[2/3]">
          {movie.poster_path ? (
            <Image
              src={getImageUrl(movie.poster_path, "w342")}
              alt={movie.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            />
          ) : (
            <div className="w-full h-full bg-slate-700 flex items-center justify-center text-slate-500 text-sm text-center p-2">
              {movie.title}
            </div>
          )}

          {/* Engagement overlay */}
          <div
            className="absolute inset-x-0 bottom-0 bg-slate-900/80 p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <StarRating
              value={userRating || 0}
              onChange={handleRatingChange}
              size="sm"
            />
            <WatchlistButton movieId={movie.id} size="sm" />
          </div>
        </div>
        <div className="p-2">
          <h3 className="text-sm font-medium text-slate-200 truncate">
            {movie.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
            <span>{year}</span>
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {userRating ? `Your: ★ ${userRating}` : movie.vote_average.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
