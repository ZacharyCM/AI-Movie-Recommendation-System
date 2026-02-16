"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExplanation } from "@/hooks/useExplanation";

interface ExplanationButtonProps {
  movieId: number;
}

// Human-readable factor labels
const FACTOR_LABELS: Record<string, string> = {
  content_similarity: "Content Similarity",
  collaborative_filtering: "Similar Users",
  genre_match: "Genre Match",
  director_match: "Director Match",
  thematic_similarity: "Thematic Similarity",
};

export default function ExplanationButton({ movieId }: ExplanationButtonProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  // Only fetch when showExplanation is true (lazy loading)
  const { data, isLoading, isError } = useExplanation(
    showExplanation ? movieId : null
  );

  const toggleExplanation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowExplanation((prev) => !prev);
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        onClick={toggleExplanation}
        className="text-sm text-blue-400 hover:text-blue-300 transition-colors mt-2"
      >
        {showExplanation ? "Hide explanation" : "Why this?"}
      </button>

      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {isLoading && (
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-sm text-slate-400 animate-pulse">
                  Generating explanation...
                </p>
              </div>
            )}

            {isError && (
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-sm text-slate-500">
                  Unable to load explanation
                </p>
              </div>
            )}

            {data && (
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-sm text-slate-300 leading-relaxed mb-2">
                  {data.explanation}
                </p>
                {data.factors && data.factors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {data.factors.map((factor, index) => (
                      <span
                        key={index}
                        className="bg-slate-700 text-slate-300 text-xs rounded-full px-2 py-0.5"
                      >
                        {FACTOR_LABELS[factor] || factor}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
