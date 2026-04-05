"use client";

import { useState, useEffect } from "react";
import SuburbMap from "@/components/SuburbMap";
import SuburbCard from "@/components/SuburbCard";
import SearchBar from "@/components/SearchBar";
import { SuburbScore, SuburbSummary, getSuburbs, getSuburb } from "@/lib/api";

export default function Home() {
  const [selected, setSelected] = useState<SuburbScore | null>(null);
  const [suburbs, setSuburbs] = useState<SuburbSummary[]>([]);

  useEffect(() => {
    getSuburbs().then(setSuburbs).catch(console.error);
  }, []);

  const handleSearchSelect = async (s: SuburbSummary) => {
    const detail = await getSuburb(s.suburb_id);
    setSelected(detail);
  };

  return (
    <div className="relative h-screen">
      {/* Map — full screen */}
      <SuburbMap onSuburbSelect={setSelected} />

      {/* Search bar — overlaid on map */}
      <SearchBar suburbs={suburbs} onSelect={handleSearchSelect} />

      {/* Sidebar — slides in from right when a suburb is selected */}
      {selected && (
        <aside className="absolute top-16 right-0 bottom-0 w-80 bg-white border-l border-slate-200 overflow-y-auto shadow-xl animate-slide-in">
          <SuburbCard suburb={selected} onClose={() => setSelected(null)} />
        </aside>
      )}
    </div>
  );
}
