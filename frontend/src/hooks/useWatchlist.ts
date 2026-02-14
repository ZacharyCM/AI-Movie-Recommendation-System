import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserWatchlist,
  isMovieWatchlisted,
  addToWatchlist,
  removeFromWatchlist,
  toggleWatchlist
} from '@/lib/supabase/watchlist';
import { trackAction } from '@/lib/supabase/history';
import { WatchlistItem } from '@/types/database';

export function useUserWatchlist() {
  return useQuery({
    queryKey: ['user-watchlist'],
    queryFn: getUserWatchlist
  });
}

export function useIsWatchlisted(movieId: number) {
  return useQuery({
    queryKey: ['watchlist', movieId],
    queryFn: () => isMovieWatchlisted(movieId)
  });
}

export function useToggleWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['watchlist'],

    mutationFn: async (movieId: number) => {
      // Check current state to determine if we're adding or removing
      const isCurrentlyWatchlisted = await isMovieWatchlisted(movieId);
      const willBeWatchlisted = await toggleWatchlist(movieId);

      // Track action only when adding (not when removing)
      if (willBeWatchlisted) {
        await trackAction(movieId, 'watchlisted');
      }

      return { movieId, isWatchlisted: willBeWatchlisted };
    },

    onMutate: async (movieId) => {
      // 1. Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['watchlist', movieId] });
      await queryClient.cancelQueries({ queryKey: ['user-watchlist'] });

      // 2. Snapshot current values
      const previousIsWatchlisted = queryClient.getQueryData(['watchlist', movieId]);
      const previousWatchlist = queryClient.getQueryData(['user-watchlist']);

      // 3. Optimistically toggle the watchlist status
      queryClient.setQueryData(['watchlist', movieId], (old: boolean | undefined) => !old);

      // 4. Optimistically update watchlist array
      queryClient.setQueryData(['user-watchlist'], (old: WatchlistItem[] | undefined) => {
        const currentlyInList = old?.some(item => item.movie_id === movieId);

        if (currentlyInList) {
          // Remove from list
          return old?.filter(item => item.movie_id !== movieId) || [];
        } else {
          // Add to list
          const newItem: WatchlistItem = {
            id: 'temp-id',
            user_id: 'temp-user-id',
            movie_id: movieId,
            created_at: new Date().toISOString()
          };
          return [newItem, ...(old || [])];
        }
      });

      // 5. Return context for rollback
      return { previousIsWatchlisted, previousWatchlist };
    },

    onError: (err, movieId, context) => {
      // Rollback optimistic updates on error
      if (context?.previousIsWatchlisted !== undefined) {
        queryClient.setQueryData(['watchlist', movieId], context.previousIsWatchlisted);
      }
      if (context?.previousWatchlist !== undefined) {
        queryClient.setQueryData(['user-watchlist'], context.previousWatchlist);
      }

      console.error('Failed to toggle watchlist:', err);
    },

    onSettled: (data) => {
      // Only invalidate if this is the last pending mutation
      if (data && queryClient.isMutating({ mutationKey: ['watchlist'] }) === 1) {
        queryClient.invalidateQueries({ queryKey: ['watchlist', data.movieId] });
        queryClient.invalidateQueries({ queryKey: ['user-watchlist'] });
      }
    }
  });
}
