import { createClient } from '@/lib/supabase/client';
import { ViewingHistoryEntry } from '@/types/database';

export async function trackAction(
  movieId: number,
  actionType: 'rated' | 'watchlisted' | 'detail_viewed'
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Silently fail for unauthenticated users (viewing history is optional)
    return;
  }

  const { error } = await supabase
    .from('viewing_history')
    .insert({
      user_id: user.id,
      movie_id: movieId,
      action_type: actionType
    });

  if (error) {
    // Log error but don't throw - tracking shouldn't break user flow
    console.error('Failed to track action:', error);
  }
}

export async function getViewingHistory(limit: number = 50): Promise<ViewingHistoryEntry[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('viewing_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}
