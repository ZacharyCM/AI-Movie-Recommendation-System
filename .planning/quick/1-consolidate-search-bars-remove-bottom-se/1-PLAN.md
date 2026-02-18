---
phase: quick-1
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/layout/Navbar.tsx
  - frontend/src/app/browse/page.tsx
autonomous: true

must_haves:
  truths:
    - "Typing in the Navbar search bar updates movie results in real time without pressing Enter"
    - "Search results appear prominently at the top of the browse page, above carousels"
    - "Carousels and mood selector are hidden while a search query is active"
    - "There is only one search bar — the one in the Navbar; no search bar in the Full Catalog section"
    - "Clearing search restores the normal browse view with carousels"
  artifacts:
    - path: "frontend/src/components/layout/Navbar.tsx"
      provides: "Live search input that debounces URL param updates"
    - path: "frontend/src/app/browse/page.tsx"
      provides: "Conditional search results section at top, carousels hidden during search"
  key_links:
    - from: "frontend/src/components/layout/Navbar.tsx"
      to: "frontend/src/app/browse/page.tsx"
      via: "URL ?q= param update triggers useEffect in browse page"
      pattern: "router\\.replace.*q="
---

<objective>
Consolidate two search bars into one and promote search results to the top of the browse page.

Purpose: The current UX is broken — searching from the Navbar requires an Enter press and buries results below 6 carousels. Users type a query and see nothing change immediately, then have to scroll past everything to find results.
Output: Single search bar in Navbar with live debounced filtering; search results rendered prominently at the top of browse page; carousels hidden while search is active.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Key patterns already established:
- Navbar reads `searchParams.get("q")` and keeps local `query` state in sync
- Browse page syncs from `searchParams` via `useEffect` (already wired)
- 300ms debounce already used in SearchBar component — apply same pattern to Navbar
- `router.replace` (not `router.push`) for live updates to avoid polluting browser history
</context>

<tasks>

<task type="auto">
  <name>Task 1: Upgrade Navbar search to live debounced filtering</name>
  <files>frontend/src/components/layout/Navbar.tsx</files>
  <action>
Remove the form `onSubmit` handler (no more Enter-to-search). Instead, update the URL on every keystroke with a 300ms debounce using `useRef` for the timeout.

Replace `useRouter` push-on-submit with `router.replace` on debounced input change:

```ts
import { useRef } from "react";
// ...
const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
```

Keep the form element but remove `onSubmit` (or change to `onSubmit={e => e.preventDefault()}`). Wire `onChange={handleChange}` on the input instead of the current `onChange={(e) => setQuery(e.target.value)}`.

Add a clear button (X) to the Navbar input: when clicked, set `query` to `""` and call `router.replace("/browse")`. This makes the Navbar search bar feel complete without needing the bottom SearchBar. Style the X button identically to the one in `SearchBar.tsx` (absolute right-3, text-slate-500 hover:text-slate-300).

Remove the `FormEvent` import from `react` since form submit is no longer used.
  </action>
  <verify>Visit /browse, type in the Navbar search box without pressing Enter — the URL should update to `/browse?q=...` and the page should react. Clearing the input should return to `/browse`.</verify>
  <done>Live typing in Navbar updates URL and movie results without pressing Enter; clear button resets search; browser Back still works correctly (replace keeps history clean for same-page typing, push used for cross-page navigation).</done>
</task>

<task type="auto">
  <name>Task 2: Show search results at top of browse page, remove bottom search bar</name>
  <files>frontend/src/app/browse/page.tsx</files>
  <action>
Two changes to `browse/page.tsx`:

**1. Remove the bottom SearchBar entirely.**

Delete the `import SearchBar from "@/components/movies/SearchBar"` import and the entire "Full Catalog Section" div that contains `<SearchBar onSearch={handleSearch} />`. Also remove the `handleSearch` function since search is now driven purely by URL params via the Navbar.

The `MovieGrid` and pagination should move to a new prominent position (see below), no longer wrapped in the "Full Catalog" border-t div.

**2. Promote search results to the top when a query is active.**

Add a conditional block at the very top of the returned JSX (before `<MoodSelector>`):

```tsx
{searchQuery && (
  <section>
    <div className="mb-4">
      <h2 className="text-2xl font-bold text-white">
        Search results for &ldquo;{searchQuery}&rdquo;
      </h2>
      <p className="text-slate-400 text-sm mt-1">
        {data?.results?.length ?? 0} movies found
      </p>
    </div>
    <MovieGrid movies={data?.results ?? []} isLoading={isLoading} />
    {/* Pagination */}
    {data && data.total_pages > 1 && (
      <div className="flex items-center justify-center gap-4 pt-4">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded transition">Previous</button>
        <span className="text-slate-400">Page {page} of {data.total_pages}</span>
        <button onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))} disabled={page >= data.total_pages} className="bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded transition">Next</button>
      </div>
    )}
  </section>
)}
```

**3. Hide carousels and mood selector while search is active.**

Wrap the existing `<MoodSelector>` and the entire carousel `<section>` in `{!searchQuery && (...)}` so they disappear during search and reappear when the query is cleared.

The final JSX structure should be:

```tsx
<div className="space-y-8">
  {/* Search results — visible only when query active */}
  {searchQuery && ( <section>...</section> )}

  {/* Normal browse content — hidden during search */}
  {!searchQuery && (
    <>
      <MoodSelector ... />
      <section className="space-y-6">
        {/* all carousels */}
      </section>
    </>
  )}
</div>
```

Remove the now-unused `handleSearch` function. The `searchQuery` state and the `useEffect` syncing from `searchParams` should remain — they are still needed for the search results section.
  </action>
  <verify>
1. With no query: browse page shows mood selector + all carousels, no search bar in the body.
2. Type in Navbar — search results section appears at top with heading and count, carousels disappear.
3. Clear Navbar input — carousels return, search results disappear.
4. Pagination still works when search results span multiple pages.
  </verify>
  <done>Single search bar (Navbar only); search results shown prominently at top of page with heading and count; carousels hidden during search; clearing search restores normal browse view.</done>
</task>

</tasks>

<verification>
- Only one search bar exists in the UI (Navbar)
- `SearchBar` component import is removed from browse/page.tsx
- `handleSearch` function is removed from browse/page.tsx
- Typing in Navbar live-updates results without Enter
- Search results section appears above carousels when query is active
- Carousels are hidden when `searchQuery` is non-empty
- Clearing Navbar input restores carousel view
- `npm run build` in `/Users/zacharym/netflixrecs/frontend` completes without TypeScript errors
</verification>

<success_criteria>
User types a query in the Navbar search bar, results appear immediately at the top of the page (no Enter required, no scrolling past carousels). Clearing the search restores the full browsing experience with carousels.
</success_criteria>

<output>
After completion, create `.planning/quick/1-consolidate-search-bars-remove-bottom-se/1-SUMMARY.md` following the summary template.
</output>
