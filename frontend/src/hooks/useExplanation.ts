import { useQuery } from '@tanstack/react-query';
import { fetchExplanation } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

export function useExplanation(movieId: number | null) {
  return useQuery({
    queryKey: ['explanation', movieId],
    queryFn: async () => {
      if (!movieId) {
        throw new Error('Movie ID is required');
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      return fetchExplanation(session.access_token, movieId);
    },
    enabled: !!movieId, // Only fetch when movieId is provided (lazy loading)
    staleTime: Infinity, // Explanations don't change unless ratings change
    retry: 1, // Single retry on failure
  });
}
