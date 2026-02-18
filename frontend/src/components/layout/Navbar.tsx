"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import LogoutButton from "@/components/auth/LogoutButton";

export default function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Keep input in sync when URL changes (e.g. navigating back)
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = val.trim();
      // Use replace so live typing doesn't fill history stack
      if (window.location.pathname === "/browse") {
        router.replace(trimmed ? `/browse?q=${encodeURIComponent(trimmed)}` : "/browse");
      } else {
        router.push(trimmed ? `/browse?q=${encodeURIComponent(trimmed)}` : "/browse");
      }
    }, 300);
  };

  const handleClear = () => {
    setQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    router.replace("/browse");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center gap-4">
      <Link href="/browse" className="text-xl font-bold text-red-600 shrink-0">
        NetflixRecs
      </Link>

      {/* Search bar */}
      <form onSubmit={(e) => e.preventDefault()} className="flex-1 max-w-md">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search movies..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-8 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              aria-label="Clear search"
            >
              &#x2715;
            </button>
          )}
        </div>
      </form>

      <div className="flex items-center gap-4 shrink-0 ml-auto">
        <Link
          href="/profile"
          className="text-slate-400 hover:text-white transition flex items-center gap-1 text-sm"
        >
          <User size={16} />
          <span>Profile</span>
        </Link>
        <LogoutButton />
      </div>
    </nav>
  );
}
