"use client";

import { useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { Movie } from "@/types/movie";
import CarouselCard from "./CarouselCard";

interface CarouselProps {
  title: string;
  movies: Movie[];
  isLoading?: boolean;
  subtitle?: string;
}

export default function Carousel({ title, movies, isLoading, subtitle }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 0);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({
      left: -(scrollRef.current.clientWidth * 0.8),
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({
      left: scrollRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  // Don't render empty carousels
  if (!isLoading && movies.length === 0) {
    return null;
  }

  return (
    <section className="group/carousel relative">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Scroll container + arrow buttons */}
      <div className="relative">
        {/* Left arrow */}
        {showLeftArrow && (
          <button
            onClick={scrollLeft}
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity shadow-lg"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Right arrow */}
        {showRightArrow && (
          <button
            onClick={scrollRight}
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity shadow-lg"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Scrollable movie row */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-x-auto scrollbar-hide flex gap-3 pb-4"
        >
          {isLoading
            ? // Skeleton loading cards
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="min-w-[160px] w-[160px] md:min-w-[180px] md:w-[180px] lg:min-w-[200px] lg:w-[200px] aspect-[2/3] bg-slate-700 animate-pulse rounded-lg flex-shrink-0"
                />
              ))
            : movies.map((movie, index) => (
                <motion.div
                  key={movie.id}
                  className="flex-shrink-0"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.4,
                    delay: Math.min(index * 0.05, 0.5),
                  }}
                >
                  <CarouselCard movie={movie} />
                </motion.div>
              ))}
        </div>
      </div>
    </section>
  );
}
