// Database types for Supabase user engagement schema
// Corresponds to: supabase/migrations/20260213_user_engagement.sql

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: string;
  user_id: string;
  movie_id: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  movie_id: number;
  created_at: string;
}

export interface ViewingHistoryEntry {
  id: string;
  user_id: string;
  movie_id: number;
  action_type: 'rated' | 'watchlisted' | 'detail_viewed';
  created_at: string;
}

export interface UserStats {
  total_ratings: number;
  total_watchlist: number;
  average_rating: number;
  favorite_genre: string | null;
  member_since: string;
}
