'use client';

import { User } from '@supabase/supabase-js';
import { UserStats } from '@/types/database';
import Image from 'next/image';

interface ProfileHeaderProps {
  user: User;
  stats: UserStats;
}

export function ProfileHeader({ user, stats }: ProfileHeaderProps) {
  // Get username from user metadata or email
  const displayName = user.user_metadata?.username || user.email?.split('@')[0] || 'User';

  // Get first letter for avatar initial
  const initial = displayName.charAt(0).toUpperCase();

  // Format member since date
  const memberSince = new Date(stats.member_since).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <div className="bg-slate-800 rounded-lg p-6 mb-6">
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.user_metadata?.avatar_url ? (
            <Image
              src={user.user_metadata.avatar_url}
              alt={displayName}
              width={80}
              height={80}
              className="rounded-full"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-3xl font-bold text-slate-200">{initial}</span>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-200 mb-1">{displayName}</h1>
          <p className="text-slate-400 text-sm mb-4">
            Member since {memberSince}
          </p>

          {/* Stats Row */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-slate-400">Movies rated:</span>{' '}
              <span className="text-slate-200 font-semibold">{stats.total_ratings}</span>
            </div>
            <div>
              <span className="text-slate-400">On watchlist:</span>{' '}
              <span className="text-slate-200 font-semibold">{stats.total_watchlist}</span>
            </div>
            {stats.total_ratings > 0 && (
              <div>
                <span className="text-slate-400">Avg rating:</span>{' '}
                <span className="text-slate-200 font-semibold">
                  {stats.average_rating.toFixed(1)} ★
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
