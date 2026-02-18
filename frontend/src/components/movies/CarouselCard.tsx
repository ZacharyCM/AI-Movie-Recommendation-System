"use client";

import Image from "next/image";
import Link from "next/link";
import type { Movie } from "@/types/movie";
import { getImageUrl } from "@/types/movie";
import { StarRating } from "@/components/engagement/StarRating";
import { WatchlistButton } from "@/components/engagement/WatchlistButton";
import { useMovieRating, useRateMovie } from "@/hooks/useRatings";

interface CarouselCardProps {
  movie: Movie;
}

export default function CarouselCard({ movie }: CarouselCardProps) {
  const { data: userRating } = useMovieRating(movie.id);
  const rateMutation = useRateMovie();

  const handleRatingChange = (rating: number) => {
    rateMutation.mutate({ movieId: movie.id, rating });
  };

  return (
    <Link href={`/movies/${movie.id}`}>
      <div className="group relative min-w-[160px] w-[160px] md:min-w-[180px] md:w-[180px] lg:min-w-[200px] lg:w-[200px] aspect-[2/3] rounded-lg overflow-hidden bg-slate-800 transition-transform duration-200 hover:scale-105">
        {movie.poster_path ? (
          <Image
            src={getImageUrl(movie.poster_path, "w342")}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 160px, (max-width: 1024px) 180px, 200px"
          />
        ) : (
          <div className="w-full h-full bg-slate-700 flex items-center justify-center text-slate-500 text-xs text-center p-2">
            {movie.title}
          </div>
        )}

        {/* Title overlay on hover */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-sm font-medium text-white truncate">{movie.title}</p>
        </div>

        {/* Engagement overlay: only show on md+ screens */}
        <div
          className="absolute inset-x-0 top-0 hidden md:flex bg-slate-900/80 p-1.5 items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity"
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
    </Link>
  );
}
