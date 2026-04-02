"use client";

import { useState } from "react";
import SuburbMap from "@/components/SuburbMap";
import SuburbCard from "@/components/SuburbCard";
import { SuburbScore } from "@/lib/api";

export default function Home() {
  const [selected, setSelected] = useState<SuburbScore | null>(null);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Map — takes full height on the left */}
      <div className="flex-1 relative">
        <SuburbMap onSuburbSelect={setSelected} />
      </div>

      {/* Sidebar — slides in when a suburb is selected */}
      <aside
        className={`
          w-80 shrink-0 bg-surface-card border-l border-surface-border
          overflow-y-auto transition-all duration-300
          ${selected ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 w-0"}
        `}
      >
        {selected && (
          <SuburbCard suburb={selected} onClose={() => setSelected(null)} />
        )}
      </aside>
    </div>
  );
}
