"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, Loader2 } from "lucide-react";
import { useSemanticSearch } from "@/hooks/useSemanticSearch";
import { useRouter } from "next/navigation";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { query, setQuery, results, isLoading } = useSemanticSearch();
  const router = useRouter();

  // Toggle command palette with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open, setQuery]);

  const handleSelect = (movieId: number) => {
    setOpen(false);
    router.push(`/movies/${movieId}`);
  };

  return (
    <>
      {/* Keyboard hint */}
      <div className="fixed bottom-4 right-4 text-slate-500 text-sm hidden md:block">
        Press <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300">⌘K</kbd> to search
      </div>

      {/* Command Dialog */}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Semantic Movie Search"
        className="fixed inset-0 z-50"
        shouldFilter={false} // Disable client-side filtering (server-side via embeddings)
      >
        <Dialog.Title className="sr-only">Semantic Movie Search</Dialog.Title>
        {/* Backdrop + Dialog Container */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Input */}
            <div className="flex items-center gap-3 border-b border-slate-700 p-4">
              <Search className="w-5 h-5 text-slate-500" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search movies with natural language..."
                className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-base"
              />
              {isLoading && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
            </div>

            {/* Results List */}
            <Command.List className="max-h-[400px] overflow-y-auto p-2">
              {query.length > 0 && query.length < 3 && (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  Type at least 3 characters to search
                </div>
              )}

              {query.length >= 3 && !isLoading && results.length === 0 && (
                <Command.Empty className="px-4 py-8 text-center text-slate-500 text-sm">
                  No results found.
                </Command.Empty>
              )}

              {query.length >= 3 && isLoading && results.length === 0 && (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  Searching...
                </div>
              )}

              {results.map((result) => (
                <Command.Item
                  key={result.movie_id}
                  value={result.movie_id.toString()}
                  onSelect={() => handleSelect(result.movie_id)}
                  className="flex items-start gap-3 px-4 py-3 rounded-lg cursor-pointer text-slate-200 hover:bg-slate-800 aria-selected:bg-slate-800 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {result.title}{" "}
                      <span className="text-slate-400 font-normal">
                        ({result.year})
                      </span>
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      {result.genres}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {Math.round(result.score * 100)}% match
                  </div>
                </Command.Item>
              ))}
            </Command.List>
          </div>
        </div>
      </Command.Dialog>
    </>
  );
}
