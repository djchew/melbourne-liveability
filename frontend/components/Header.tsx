"use client";

import { HelpCircle, MapPin, Bookmark } from "lucide-react";
import MethodologyModal from "./MethodologyModal";
import { useState } from "react";

interface Props {
  bookmarkCount: number;
  onOpenBookmarks: () => void;
}

export default function Header({ bookmarkCount, onOpenBookmarks }: Props) {
  const [showMethodology, setShowMethodology] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
              <MapPin size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Melbourne Liveability</h1>
              <p className="text-xs text-slate-500">suburb scores</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenBookmarks}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 transition-colors"
              title={`${bookmarkCount} bookmarked`}
            >
              <Bookmark size={16} className="fill-cyan-600 text-cyan-600" />
              <span className="text-sm font-semibold text-cyan-700">{bookmarkCount}</span>
            </button>
            <button
              onClick={() => setShowMethodology(true)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="How are scores calculated?"
            >
              <HelpCircle size={18} className="text-slate-600" />
            </button>
          </div>
        </div>
      </header>

      <MethodologyModal isOpen={showMethodology} onClose={() => setShowMethodology(false)} />
    </>
  );
}
