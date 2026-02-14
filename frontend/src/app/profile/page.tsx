'use client';

import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUserStats } from '@/hooks/useProfile';
import { useUserRatings } from '@/hooks/useRatings';
import { useUserWatchlist } from '@/hooks/useWatchlist';
import Navbar from '@/components/layout/Navbar';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { RatingHistory } from '@/components/profile/RatingHistory';
import { WatchlistGrid } from '@/components/profile/WatchlistGrid';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: ratings = [], isLoading: ratingsLoading } = useUserRatings();
  const { data: watchlist = [], isLoading: watchlistLoading } = useUserWatchlist();

  // Guard: redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Show loading state while any data is loading
  const isLoading = authLoading || profileLoading || statsLoading || ratingsLoading || watchlistLoading;

  if (authLoading) {
    return null; // Let middleware handle redirect
  }

  if (!user) {
    return null; // Redirecting
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-slate-900 pt-16">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Skeleton loader for ProfileHeader */}
            <div className="bg-slate-800 rounded-lg p-6 mb-6 animate-pulse">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 rounded-full bg-slate-700"></div>
                <div className="flex-1">
                  <div className="h-6 bg-slate-700 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/4 mb-4"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>

            {/* Skeleton loaders for content columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800 rounded-lg p-6 h-64 animate-pulse"></div>
              <div className="bg-slate-800 rounded-lg p-6 h-64 animate-pulse"></div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Default stats if not loaded
  const userStats = stats || {
    total_ratings: ratings.length,
    total_watchlist: watchlist.length,
    average_rating: ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0,
    favorite_genre: null,
    member_since: user.created_at
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-900 pt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Profile Header */}
          <ProfileHeader user={user} stats={userStats} />

          {/* Two-column layout on large screens, single column on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column: Rating History */}
            <div>
              <RatingHistory ratings={ratings} />
            </div>

            {/* Right column: Watchlist */}
            <div>
              <WatchlistGrid watchlistItems={watchlist} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
