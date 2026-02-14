import { createClient } from '@/lib/supabase/client';
import { WatchlistItem } from '@/types/database';

export async function getUserWatchlist(): Promise<WatchlistItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function isMovieWatchlisted(movieId: number): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('watchlist')
    .select('id')
    .eq('user_id', user.id)
    .eq('movie_id', movieId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data;
}

export async function addToWatchlist(movieId: number): Promise<WatchlistItem> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('watchlist')
    .insert({
      user_id: user.id,
      movie_id: movieId
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function removeFromWatchlist(movieId: number): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('movie_id', movieId);

  if (error) {
    throw error;
  }
}

export async function toggleWatchlist(movieId: number): Promise<boolean> {
  const isWatchlisted = await isMovieWatchlisted(movieId);

  if (isWatchlisted) {
    await removeFromWatchlist(movieId);
    return false;
  } else {
    await addToWatchlist(movieId);
    return true;
  }
}
