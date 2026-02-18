"use client";

import { motion } from "framer-motion";
import { useMoods } from "@/hooks/useMoodRecommendations";

interface MoodSelectorProps {
  selectedMood: string | null;
  onMoodSelect: (mood: string | null) => void;
}

export default function MoodSelector({
  selectedMood,
  onMoodSelect,
}: MoodSelectorProps) {
  const { data: moods, isLoading } = useMoods();

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        What are you in the mood for?
      </h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-700 animate-pulse rounded-full h-10 w-32 flex-shrink-0"
              />
            ))
          : moods?.map((mood) => {
              const isSelected = selectedMood === mood.id;
              return (
                <motion.button
                  key={mood.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    isSelected ? onMoodSelect(null) : onMoodSelect(mood.id)
                  }
                  className={[
                    "flex-shrink-0 rounded-full px-4 py-2 text-sm transition-all cursor-pointer whitespace-nowrap border",
                    isSelected
                      ? "bg-red-600/20 border-red-500 text-red-400"
                      : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200",
                  ].join(" ")}
                >
                  {mood.emoji} {mood.label}
                </motion.button>
              );
            })}
      </div>
    </section>
  );
}
