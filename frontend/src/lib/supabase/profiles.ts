import { createClient } from '@/lib/supabase/client';
import { Profile, UserStats } from '@/types/database';

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProfile(updates: {
  username?: string;
  avatar_url?: string;
}): Promise<Profile> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserStats(): Promise<UserStats> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Fetch ratings to compute stats
  const { data: ratings } = await supabase
    .from('ratings')
    .select('rating')
    .eq('user_id', user.id);

  // Fetch watchlist count
  const { data: watchlist } = await supabase
    .from('watchlist')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Fetch profile for member_since
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', user.id)
    .single();

  const totalRatings = ratings?.length || 0;
  const totalWatchlist = watchlist?.length || 0;
  const averageRating = totalRatings > 0
    ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalRatings
    : 0;

  return {
    total_ratings: totalRatings,
    total_watchlist: totalWatchlist,
    average_rating: averageRating,
    favorite_genre: null, // Will be computed with movie data in future
    member_since: profile?.created_at || new Date().toISOString()
  };
}
