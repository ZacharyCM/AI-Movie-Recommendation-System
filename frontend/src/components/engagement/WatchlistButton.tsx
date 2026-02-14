'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useIsWatchlisted, useToggleWatchlist } from '@/hooks/useWatchlist';

interface WatchlistButtonProps {
  movieId: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function WatchlistButton({
  movieId,
  size = 'md',
  className = ''
}: WatchlistButtonProps) {
  const { data: isWatchlisted = false } = useIsWatchlisted(movieId);
  const toggleMutation = useToggleWatchlist();

  const sizes = { sm: 16, md: 24, lg: 32 };
  const iconSize = sizes[size];

  const handleClick = () => {
    toggleMutation.mutate(movieId);
  };

  const Icon = isWatchlisted ? BookmarkCheck : Bookmark;
  const ariaLabel = isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist';
  const colorClass = isWatchlisted
    ? 'text-green-400'
    : 'text-slate-400 hover:text-slate-200';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={toggleMutation.isPending}
      aria-label={ariaLabel}
      className={`
        transition-all duration-200
        ${colorClass}
        ${toggleMutation.isPending ? 'opacity-50' : 'opacity-100'}
        hover:scale-110 focus:scale-110
        focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded
        ${className}
      `}
    >
      <Icon size={iconSize} />
    </button>
  );
}
