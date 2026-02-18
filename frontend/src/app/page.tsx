"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/home/HeroSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      {/* Offset content below fixed navbar */}
      <div className="pt-[56px]">
        <HeroSection />

        {/* Browse All Movies CTA */}
        <section className="flex flex-col items-center gap-4 py-16 px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Discover Your Next Favorite Film
          </h2>
          <p className="text-slate-400 max-w-md">
            Browse our full catalog of movies, get personalized recommendations, and explore with AI-powered search.
          </p>
          <Link
            href="/browse"
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors mt-2"
          >
            Browse All Movies
          </Link>
          <Link
            href="/browse"
            className="text-slate-400 hover:text-slate-200 text-sm transition-colors mt-2"
          >
            Continue to Browse &rarr;
          </Link>
        </section>
      </div>
    </div>
  );
}
