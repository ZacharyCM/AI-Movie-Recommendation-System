'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Rating } from '@/types/database';
import { fetchMovieDetail } from '@/lib/api';
import { StarRating } from '@/components/engagement/StarRating';
import { getImageUrl } from '@/types/movie';
import Image from 'next/image';
import Link from 'next/link';

interface RatingHistoryProps {
  ratings: Rating[];
}

export function RatingHistory({ ratings }: RatingHistoryProps) {
  const [showAll, setShowAll] = useState(false);

  // Sort by most recent first
  const sortedRatings = [...ratings].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Limit to 20 most recent unless showing all
  const displayedRatings = showAll ? sortedRatings : sortedRatings.slice(0, 20);
  const hasMore = sortedRatings.length > 20;

  if (ratings.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center">
        <p className="text-slate-400">
          No ratings yet. Start rating movies!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-slate-200 mb-4">Rating History</h2>

      <div className="space-y-3">
        {displayedRatings.map((rating) => (
          <RatingItem key={rating.id} rating={rating} />
        ))}
      </div>

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-4 w-full py-2 text-sm text-slate-400 hover:text-slate-200 transition"
        >
          View all {sortedRatings.length} ratings →
        </button>
      )}
    </div>
  );
}

function RatingItem({ rating }: { rating: Rating }) {
  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', rating.movie_id],
    queryFn: () => fetchMovieDetail(rating.movie_id)
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded animate-pulse">
        <div className="w-12 h-18 bg-slate-600 rounded"></div>
        <div className="flex-1">
          <div className="h-4 bg-slate-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-slate-600 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!movie) return null;

  const ratedDate = new Date(rating.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded hover:bg-slate-700 transition">
      {/* Movie Poster Thumbnail */}
      <Link href={`/movies/${movie.id}`} className="flex-shrink-0">
        <Image
          src={getImageUrl(movie.poster_path, 'w92')}
          alt={movie.title}
          width={48}
          height={72}
          className="rounded aspect-[2/3] object-cover"
        />
      </Link>

      {/* Movie Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/movies/${movie.id}`}>
          <h3 className="text-slate-200 font-medium hover:text-white transition truncate">
            {movie.title}
          </h3>
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <StarRating value={rating.rating} readonly size="sm" />
          <span className="text-xs text-slate-400">{ratedDate}</span>
        </div>
      </div>
    </div>
  );
}
