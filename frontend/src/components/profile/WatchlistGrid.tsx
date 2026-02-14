'use client';

import { useQuery } from '@tanstack/react-query';
import { WatchlistItem } from '@/types/database';
import { fetchMovieDetail } from '@/lib/api';
import { getImageUrl } from '@/types/movie';
import Image from 'next/image';
import Link from 'next/link';

interface WatchlistGridProps {
  watchlistItems: WatchlistItem[];
}

export function WatchlistGrid({ watchlistItems }: WatchlistGridProps) {
  if (watchlistItems.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center">
        <p className="text-slate-400">
          Your watchlist is empty. Browse movies and bookmark ones you want to watch!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-slate-200 mb-4">Watchlist</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {watchlistItems.map((item) => (
          <WatchlistMovieCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function WatchlistMovieCard({ item }: { item: WatchlistItem }) {
  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', item.movie_id],
    queryFn: () => fetchMovieDetail(item.movie_id)
  });

  if (isLoading) {
    return (
      <div className="aspect-[2/3] bg-slate-700 rounded animate-pulse"></div>
    );
  }

  if (!movie) return null;

  return (
    <Link
      href={`/movies/${movie.id}`}
      className="group relative aspect-[2/3] overflow-hidden rounded hover:ring-2 hover:ring-red-600 transition"
    >
      <Image
        src={getImageUrl(movie.poster_path)}
        alt={movie.title}
        fill
        className="object-cover"
      />

      {/* Hover overlay with title */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
        <h3 className="text-white text-sm font-medium line-clamp-2">
          {movie.title}
        </h3>
      </div>
    </Link>
  );
}
