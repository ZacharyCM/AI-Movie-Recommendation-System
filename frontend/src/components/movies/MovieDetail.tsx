"use client";

import Image from "next/image";
import Link from "next/link";
import type { MovieDetail as MovieDetailType } from "@/types/movie";
import { getImageUrl } from "@/types/movie";

interface MovieDetailProps {
  movie: MovieDetailType;
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function MovieDetail({ movie }: MovieDetailProps) {
  const year = movie.release_date ? movie.release_date.split("-")[0] : "";
  const trailer = movie.videos?.results?.find(
    (v) => v.site === "YouTube" && v.type === "Trailer"
  );
  const cast = movie.credits?.cast?.slice(0, 10) ?? [];

  return (
    <div>
      {/* Back button */}
      <Link
        href="/browse"
        className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition mb-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Browse
      </Link>

      {/* Backdrop section */}
      <div className="relative w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden mb-8">
        {movie.backdrop_path ? (
          <Image
            src={getImageUrl(movie.backdrop_path, "w1280")}
            alt={movie.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-slate-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {movie.title}
          </h1>
          {movie.tagline && (
            <p className="text-slate-300 italic mb-3">{movie.tagline}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-slate-300">
            {year && <span>{year}</span>}
            {movie.runtime && <span>{formatRuntime(movie.runtime)}</span>}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {movie.vote_average.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3 space-y-8">
          {/* Overview */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
            <p className="text-slate-300 leading-relaxed">{movie.overview}</p>
          </div>

          {/* Cast */}
          {cast.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">Cast</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {cast.map((member) => (
                  <div key={member.id} className="flex-shrink-0 text-center w-20">
                    {member.profile_path ? (
                      <Image
                        src={getImageUrl(member.profile_path, "w185")}
                        alt={member.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover mx-auto"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto text-slate-400 text-lg font-semibold">
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <p className="text-sm font-medium text-slate-200 mt-2 truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {member.character}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Genres */}
        <div className="lg:w-1/3">
          {movie.genres && movie.genres.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">Genres</h2>
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trailer */}
      {trailer && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-3">Trailer</h2>
          <div className="aspect-video rounded-xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}`}
              title={trailer.name}
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
