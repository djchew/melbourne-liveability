"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import SuburbMap from "@/components/SuburbMap";
import SuburbCard from "@/components/SuburbCard";
import SearchBar from "@/components/SearchBar";
import BookmarksPanel from "@/components/BookmarksPanel";
import { SuburbScore, SuburbSummary, getSuburbs, getSuburb } from "@/lib/api";
import { useBookmarks } from "@/hooks/useBookmarks";

export default function Home() {
  const [selected, setSelected] = useState<SuburbScore | null>(null);
  const [suburbs, setSuburbs] = useState<SuburbSummary[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [activeMetric, setActiveMetric] = useState<string>("score_total");
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
        activeMetric={activeMetric}
        activeBand={activeBand}
        onMetricChange={setActiveMetric}
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
        <aside
          className="absolute top-16 bottom-0 w-80 bg-white border-l border-slate-200 overflow-y-auto shadow-xl animate-slide-in transition-right"
          style={{ right: showBookmarks ? "15rem" : "0px" }}
        >
          <SuburbCard
            suburb={selected}
            onClose={() => setSelected(null)}
            isBookmarked={isBookmarked(selected.suburb_id)}
            onToggleBookmark={handleToggleBookmark}
          />
        </aside>
      )}
    </div>
  );
}
