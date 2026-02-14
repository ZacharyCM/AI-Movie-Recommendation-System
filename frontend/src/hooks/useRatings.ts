import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserRatings, getMovieRating, upsertRating, deleteRating } from '@/lib/supabase/ratings';
import { trackAction } from '@/lib/supabase/history';
import { Rating } from '@/types/database';

export function useMovieRating(movieId: number) {
  return useQuery({
    queryKey: ['ratings', movieId],
    queryFn: () => getMovieRating(movieId)
  });
}

export function useUserRatings() {
  return useQuery({
    queryKey: ['user-ratings'],
    queryFn: getUserRatings
  });
}

interface RateMovieParams {
  movieId: number;
  rating: number;
}

export function useRateMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['ratings'],

    mutationFn: async ({ movieId, rating }: RateMovieParams) => {
      const result = await upsertRating(movieId, rating);

      // Track the action in viewing history
      await trackAction(movieId, 'rated');

      return result;
    },

    onMutate: async ({ movieId, rating }) => {
      // 1. Cancel outgoing refetches (critical to prevent overwrite)
      await queryClient.cancelQueries({ queryKey: ['ratings', movieId] });
      await queryClient.cancelQueries({ queryKey: ['user-ratings'] });

      // 2. Snapshot current values for rollback
      const previousMovieRating = queryClient.getQueryData(['ratings', movieId]);
      const previousUserRatings = queryClient.getQueryData(['user-ratings']);

      // 3. Optimistically update individual movie rating
      queryClient.setQueryData(['ratings', movieId], rating);

      // 4. Optimistically update user's rating list
      queryClient.setQueryData(['user-ratings'], (old: Rating[] | undefined) => {
        const updated = old?.filter((r) => r.movie_id !== movieId) || [];
        updated.push({
          id: 'temp-id',
          user_id: 'temp-user-id',
          movie_id: movieId,
          rating,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        return updated;
      });

      // 5. Return context for rollback
      return { previousMovieRating, previousUserRatings };
    },

    onError: (err, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousMovieRating !== undefined) {
        queryClient.setQueryData(['ratings', variables.movieId], context.previousMovieRating);
      }
      if (context?.previousUserRatings !== undefined) {
        queryClient.setQueryData(['user-ratings'], context.previousUserRatings);
      }

      console.error('Failed to rate movie:', err);
    },

    onSettled: (data, error, variables) => {
      // Only invalidate if this is the last pending mutation
      // Prevents over-invalidation that reverts subsequent optimistic updates
      if (queryClient.isMutating({ mutationKey: ['ratings'] }) === 1) {
        queryClient.invalidateQueries({ queryKey: ['ratings', variables.movieId] });
        queryClient.invalidateQueries({ queryKey: ['user-ratings'] });
      }
    }
  });
}

export function useDeleteRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRating,
    onSuccess: (_, movieId) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', movieId] });
      queryClient.invalidateQueries({ queryKey: ['user-ratings'] });
    }
  });
}
