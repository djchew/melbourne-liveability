"use client";

import { X } from "lucide-react";
import { SuburbSummary } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookmarkedIds: Set<number>;
  suburbs: SuburbSummary[];
  onSelectSuburb: (id: number) => void;
}

const fmt = (v: number | null) => (v !== null ? v.toFixed(1) : "—");

export default function BookmarksPanel({
  isOpen,
  onClose,
  bookmarkedIds,
  suburbs,
  onSelectSuburb,
}: Props) {
  const bookmarkedSuburbs = suburbs.filter((s) => bookmarkedIds.has(s.suburb_id));

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        className={`fixed top-16 right-0 bottom-0 w-60 bg-white/95 backdrop-blur-sm border-l border-slate-200/50 overflow-y-auto transition-transform duration-300 ease-out z-40 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Bookmarks</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close bookmarks"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {bookmarkedSuburbs.length === 0 ? (
          <div className="p-5 text-center text-sm text-slate-500">
            No bookmarks yet. Click the bookmark icon on a suburb to save it.
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {bookmarkedSuburbs.map((suburb) => (
              <button
                key={suburb.suburb_id}
                onClick={() => {
                  onSelectSuburb(suburb.suburb_id);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="font-medium text-slate-900 truncate">
                  {suburb.name.replace(/ \(Vic\.\)/, "")}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  Score: <span className="font-semibold text-slate-700">{fmt(suburb.score_total)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
