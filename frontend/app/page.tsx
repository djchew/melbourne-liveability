"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import SuburbMap from "@/components/SuburbMap";
import SuburbCard from "@/components/SuburbCard";
import SearchBar from "@/components/SearchBar";
import BookmarksPanel from "@/components/BookmarksPanel";
import { SuburbScore, SuburbSummary, getSuburbs, getSuburb } from "@/lib/api";
import { useBookmarks } from "@/hooks/useBookmarks";
import { BarChart3 } from "lucide-react";

export default function Home() {
  const [selected, setSelected] = useState<SuburbScore | null>(null);
  const [suburbs, setSuburbs] = useState<SuburbSummary[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [activeMetrics, setActiveMetrics] = useState<string[]>(["score_crime", "score_transport", "score_schools", "score_greenspace", "score_affordability"]);
  const [activeBand, setActiveBand] = useState<string | null>(null);

  const { bookmarks, toggle: toggleBookmark, isBookmarked } = useBookmarks();

  useEffect(() => {
    getSuburbs().then(setSuburbs).catch(console.error);
  }, []);

  const handleSearchSelect = async (s: SuburbSummary) => {
    const detail = await getSuburb(s.suburb_id);
    setSelected(detail);
  };

  const handleSelectBookmarkedSuburb = async (id: number) => {
    const detail = await getSuburb(id);
    setSelected(detail);
  };

  const handleToggleBookmark = () => {
    if (selected) {
      toggleBookmark(selected.suburb_id);
    }
  };

  return (
    <div className="relative h-screen">
      {/* Header with bookmarks button */}
      <Header
        bookmarkCount={bookmarks.size}
        onOpenBookmarks={() => setShowBookmarks(!showBookmarks)}
      />

      {/* Map — full screen */}
      <SuburbMap
        onSuburbSelect={setSelected}
        activeMetrics={activeMetrics}
        activeBand={activeBand}
        onMetricsChange={setActiveMetrics}
        onBandChange={setActiveBand}
      />

      {/* Search bar — overlaid on map */}
      <SearchBar suburbs={suburbs} onSelect={handleSearchSelect} />

      {/* Bookmarks panel — slides in from left */}
      <BookmarksPanel
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        bookmarkedIds={bookmarks}
        suburbs={suburbs}
        onSelectSuburb={handleSelectBookmarkedSuburb}
      />

      {/* Sidebar — slides in from right when a suburb is selected */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSelected(null)}
            aria-hidden="true"
          />
          {/* Sidebar */}
          <aside
            className="absolute top-16 bottom-0 right-0 w-full md:w-80 bg-white/95 backdrop-blur-sm border-l border-slate-200/50 overflow-y-auto shadow-2xl z-40"
          >
            <SuburbCard
              suburb={selected}
              onClose={() => setSelected(null)}
              isBookmarked={isBookmarked(selected.suburb_id)}
              onToggleBookmark={handleToggleBookmark}
            />
          </aside>
        </>
      )}

      {/* Analytics Quick Access Button */}
      <Link
        href="/analytics"
        className="absolute bottom-8 right-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full p-3 shadow-lg transition-all hover:shadow-xl hover:scale-110"
        title="View Analytics Dashboard"
      >
        <BarChart3 size={24} />
      </Link>
    </div>
  );
}
