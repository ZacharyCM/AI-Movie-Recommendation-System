import { useQuery } from '@tanstack/react-query';
import { fetchRecommendations } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

export function useRecommendations(topN: number = 10) {
  return useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      return fetchRecommendations(session.access_token, topN);
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false
  });
}
