"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, X } from "lucide-react";
import { useFeaturedMovie } from "@/hooks/useFeaturedMovie";
import { getImageUrl } from "@/types/movie";

export default function HeroSection() {
  const { data: movie, isLoading, isError } = useFeaturedMovie();
  const [showTrailer, setShowTrailer] = useState(false);

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] md:h-[80vh] bg-slate-800 animate-pulse" />
    );
  }

  if (isError || !movie) {
    return null;
  }

  const trailer = movie.videos?.results?.find(
    (v) => v.site === "YouTube" && v.type === "Trailer"
  );

  return (
    <div>
      {/* Hero container */}
      <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden">
        {/* Backdrop image */}
        {movie.backdrop_path && (
          <Image
            src={getImageUrl(movie.backdrop_path, "original")}
            alt={movie.title}
            fill
            className="object-cover"
            priority
          />
        )}

        {/* Bottom-to-top gradient fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        {/* Left-to-right gradient fade for text area */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 p-8 md:p-16 lg:p-20 max-w-3xl">
          {/* Movie title */}
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {movie.title}
          </motion.h1>

          {/* Genre tags */}
          {movie.genres && movie.genres.length > 0 && (
            <motion.div
              className="flex flex-wrap gap-2 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {movie.genres.map((genre) => (
                <span
                  key={genre.id}
                  className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full"
                >
                  {genre.name}
                </span>
              ))}
            </motion.div>
          )}

          {/* Synopsis */}
          <motion.p
            className="max-w-2xl text-slate-200 text-sm md:text-base line-clamp-3 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {movie.overview}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Watch Trailer button — only shown if a YouTube trailer exists */}
            {trailer && (
              <button
                onClick={() => setShowTrailer((prev) => !prev)}
                className="bg-white text-slate-900 hover:bg-white/90 rounded-lg px-6 py-3 font-semibold flex items-center gap-2 transition-colors"
              >
                <Play size={18} />
                Watch Trailer
              </button>
            )}

            {/* More Info button */}
            <Link
              href={`/movies/${movie.id}`}
              className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30 rounded-lg px-6 py-3 font-semibold flex items-center gap-2 transition-colors"
            >
              <Info size={18} />
              More Info
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Trailer embed — conditionally rendered below hero */}
      <AnimatePresence>
        {showTrailer && trailer && (
          <motion.div
            className="aspect-video max-w-4xl mx-auto px-4 py-8"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowTrailer(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors"
              >
                <X size={16} />
                Close
              </button>
            </div>
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
              title={`${movie.title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full aspect-video rounded-lg"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
