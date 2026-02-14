import { createClient } from '@/lib/supabase/client';
import { Rating } from '@/types/database';

export async function getUserRatings(): Promise<Rating[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getMovieRating(movieId: number): Promise<number | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('ratings')
    .select('rating')
    .eq('user_id', user.id)
    .eq('movie_id', movieId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.rating ?? null;
}

export async function upsertRating(movieId: number, rating: number): Promise<Rating> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('ratings')
    .upsert(
      {
        user_id: user.id,
        movie_id: movieId,
        rating,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,movie_id' }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteRating(movieId: number): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('ratings')
    .delete()
    .eq('user_id', user.id)
    .eq('movie_id', movieId);

  if (error) {
    throw error;
  }
}
