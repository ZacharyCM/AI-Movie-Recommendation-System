import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { fetchRecommendations } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

/**
 * Session-gated recommendations query.
 *
 * On hard refresh, supabase.auth.getSession() may briefly return null before
 * the browser client finishes reading localStorage. If we fire the query
 * immediately (enabled: true), it throws 'Not authenticated' and — because
 * retry is disabled — never recovers. The carousel then stays blank until
 * navigation. Fix: track session in local state, keep the query disabled
 * (enabled: !!session) until getSession resolves or onAuthStateChange fires.
 */
export function useRecommendations(topN: number = 10) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Initial read — resolves from localStorage.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Subscribe for SIGNED_IN / TOKEN_REFRESHED / SIGNED_OUT.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return useQuery({
    queryKey: ['recommendations', session?.user?.id ?? 'anon'],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      return fetchRecommendations(session.access_token, topN);
    },
    enabled: !!session?.access_token,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}
