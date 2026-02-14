'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMovieDetail } from '@/lib/api';
import { StarRating } from '@/components/engagement/StarRating';
import Image from 'next/image';

interface TasteQuizCardProps {
  tmdbId: number;
  onRate: (rating: number) => void;
  currentRating: number;
  onSkip: () => void;
}

export function TasteQuizCard({ tmdbId, onRate, currentRating, onSkip }: TasteQuizCardProps) {
  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie-detail', tmdbId],
    queryFn: () => fetchMovieDetail(tmdbId),
  });

  if (isLoading || !movie) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 max-w-lg w-full animate-pulse">
        <div className="flex gap-6">
          <div className="w-48 h-72 bg-slate-700 rounded-lg" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-slate-700 rounded w-3/4" />
            <div className="h-4 bg-slate-700 rounded w-1/2" />
            <div className="space-y-2">
              <div className="h-3 bg-slate-700 rounded" />
              <div className="h-3 bg-slate-700 rounded" />
              <div className="h-3 bg-slate-700 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.png';

  // Truncate overview to approximately 2-3 lines (around 200 characters)
  const truncatedOverview = movie.overview.length > 200
    ? movie.overview.slice(0, 200) + '...'
    : movie.overview;

  return (
    <div className="bg-slate-800 rounded-xl p-8 max-w-lg w-full shadow-xl">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Movie Poster */}
        <div className="flex-shrink-0 mx-auto md:mx-0">
          <div className="relative w-48 h-72 rounded-lg overflow-hidden shadow-lg">
            <Image
              src={posterUrl}
              alt={`${movie.title} poster`}
              fill
              className="object-cover"
              sizes="192px"
            />
          </div>
        </div>

        {/* Movie Details */}
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">{movie.title}</h2>
            <p className="text-slate-400">{releaseYear}</p>
          </div>

          {/* Genre Tags */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {movie.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre.id}
                  className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          <p className="text-slate-300 text-sm leading-relaxed">{truncatedOverview}</p>

          {/* Star Rating */}
          <div className="mt-auto">
            <p className="text-slate-400 text-sm mb-2">Rate this movie</p>
            <StarRating
              value={currentRating}
              onChange={onRate}
              size="lg"
            />
          </div>

          {/* Skip Button */}
          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-300 text-sm transition-colors text-left"
          >
            Haven't seen it
          </button>
        </div>
      </div>
    </div>
  );
}
