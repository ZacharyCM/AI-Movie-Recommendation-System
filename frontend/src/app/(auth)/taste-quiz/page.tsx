'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TASTE_QUIZ_MOVIES, MINIMUM_RATINGS, hasCompletedTasteQuiz } from '@/lib/taste-quiz';
import { TasteQuizCard } from '@/components/onboarding/TasteQuizCard';
import { TasteQuizProgress } from '@/components/onboarding/TasteQuizProgress';
import { useRateMovie, useUserRatings } from '@/hooks/useRatings';

export default function TasteQuizPage() {
  const router = useRouter();
  const { mutate: rateMovie } = useRateMovie();
  const { data: userRatings } = useUserRatings();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<Map<number, number>>(new Map());
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);

  // Check if user has already completed the taste quiz
  useEffect(() => {
    if (userRatings && hasCompletedTasteQuiz(userRatings.length)) {
      // User already has enough ratings, set cookie and redirect
      document.cookie = 'taste-quiz-complete=true; path=/; max-age=31536000'; // 1 year
      router.push('/browse');
    }
  }, [userRatings, router]);

  const currentMovie = TASTE_QUIZ_MOVIES[currentIndex];
  const totalMovies = TASTE_QUIZ_MOVIES.length;
  const ratedCount = ratings.size;

  const handleRate = (rating: number) => {
    if (!currentMovie) return;

    // Persist rating to Supabase
    rateMovie({ movieId: currentMovie.tmdbId, rating });

    // Update local state
    setRatings(new Map(ratings.set(currentMovie.tmdbId, rating)));

    // Advance to next movie or complete quiz
    advanceQuiz();
  };

  const handleSkip = () => {
    if (!currentMovie) return;

    // Mark as skipped
    setSkipped(new Set(skipped.add(currentMovie.tmdbId)));

    // Advance to next movie or complete quiz
    advanceQuiz();
  };

  const advanceQuiz = () => {
    if (currentIndex < totalMovies - 1) {
      // Move to next movie
      setCurrentIndex(currentIndex + 1);
    } else {
      // All movies shown, mark as complete
      setIsComplete(true);
    }
  };

  const handleContinue = () => {
    // Set cookie to mark quiz as complete
    document.cookie = 'taste-quiz-complete=true; path=/; max-age=31536000'; // 1 year
    router.push('/browse');
  };

  // Show completion screen
  if (isComplete) {
    const canContinue = ratedCount >= MINIMUM_RATINGS;

    return (
      <div className="flex flex-col items-center gap-6 max-w-lg mx-auto text-center">
        <div className="bg-slate-800 rounded-xl p-8 w-full">
          <h2 className="text-2xl font-bold text-slate-100 mb-4">
            {canContinue ? "Great taste!" : "Almost there!"}
          </h2>
          <p className="text-slate-300 mb-6">
            {canContinue
              ? "We're ready to recommend movies for you."
              : `Please rate at least ${MINIMUM_RATINGS} movies to continue.`}
          </p>

          <TasteQuizProgress
            rated={ratedCount}
            total={totalMovies}
            minimum={MINIMUM_RATINGS}
          />

          {canContinue && (
            <button
              onClick={handleContinue}
              className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Start Browsing
            </button>
          )}

          {!canContinue && (
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsComplete(false);
              }}
              className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show quiz card
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Header */}
      <div className="text-center max-w-lg">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Let's learn your taste</h1>
        <p className="text-slate-400">
          Rate movies you've seen so we can recommend ones you'll love
        </p>
      </div>

      {/* Progress */}
      <TasteQuizProgress
        rated={ratedCount}
        total={totalMovies}
        minimum={MINIMUM_RATINGS}
      />

      {/* Quiz Card */}
      {currentMovie && (
        <TasteQuizCard
          tmdbId={currentMovie.tmdbId}
          onRate={handleRate}
          currentRating={ratings.get(currentMovie.tmdbId) || 0}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}
