"use client";

import { use, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMovieDetail } from "@/lib/api";
import MovieDetail from "@/components/movies/MovieDetail";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { trackAction } from "@/lib/supabase/history";

export default function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["movie", id],
    queryFn: () => fetchMovieDetail(Number(id)),
  });

  // Track detail page view
  useEffect(() => {
    try {
      trackAction(Number(id), 'detail_viewed');
    } catch (err) {
      // Fire-and-forget, don't block rendering
      console.error('Failed to track detail view:', err);
    }
  }, [id]);

  return (
    <>
      <Suspense>
        <Navbar />
      </Suspense>
      <main className="pt-16 px-4 md:px-8 py-6 max-w-6xl mx-auto">
        {isLoading && (
          <div className="space-y-4">
            <div className="h-[400px] bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-8 bg-slate-800 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-slate-800 rounded w-2/3 animate-pulse" />
            <div className="h-4 bg-slate-800 rounded w-1/2 animate-pulse" />
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg mb-4">Movie not found</p>
            <Link
              href="/browse"
              className="text-red-500 hover:text-red-400 transition"
            >
              Back to Browse
            </Link>
          </div>
        )}

        {data && <MovieDetail movie={data} movieId={Number(id)} />}
      </main>
    </>
  );
}
