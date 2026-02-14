export interface TasteQuizMovie {
  tmdbId: number;
  title: string;
  genre: string;
}

// Minimum ratings required to complete the taste quiz
export const MINIMUM_RATINGS = 5;

// Curated list of well-known, genre-diverse movies for the taste quiz
export const TASTE_QUIZ_MOVIES: TasteQuizMovie[] = [
  { tmdbId: 550, title: 'Fight Club', genre: 'Thriller' },
  { tmdbId: 13, title: 'Forrest Gump', genre: 'Drama' },
  { tmdbId: 155, title: 'The Dark Knight', genre: 'Action' },
  { tmdbId: 122, title: 'The Lord of the Rings: The Return of the King', genre: 'Fantasy' },
  { tmdbId: 680, title: 'Pulp Fiction', genre: 'Crime' },
  { tmdbId: 27205, title: 'Inception', genre: 'Sci-Fi' },
  { tmdbId: 238, title: 'The Godfather', genre: 'Crime/Drama' },
  { tmdbId: 603, title: 'The Matrix', genre: 'Sci-Fi/Action' },
  { tmdbId: 862, title: 'Toy Story', genre: 'Animation' },
  { tmdbId: 11, title: 'Star Wars: A New Hope', genre: 'Sci-Fi/Adventure' },
];

/**
 * Check if the user has completed the taste quiz
 * @param ratingCount - The number of ratings the user has submitted
 * @returns true if the user has met the minimum rating requirement
 */
export function hasCompletedTasteQuiz(ratingCount: number): boolean {
  return ratingCount >= MINIMUM_RATINGS;
}
