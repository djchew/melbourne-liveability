"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { SuburbSummary } from "@/lib/api";

interface Props {
  suburbs: SuburbSummary[];
  onSelect: (suburb: SuburbSummary) => void;
}

export default function SearchBar({ suburbs, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.length >= 2
    ? suburbs
        .filter((s) =>
          s.name.replace(/ \(Vic\.\)/, "").toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8)
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="absolute top-4 left-4 z-30 w-72">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search suburbs..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-8 py-2.5 bg-surface-card/95 backdrop-blur border border-surface-border rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {open && filtered.length > 0 && (
        <div className="mt-1 bg-surface-card/95 backdrop-blur border border-surface-border rounded-xl overflow-hidden shadow-2xl">
          {filtered.map((s) => (
            <button
              key={s.suburb_id}
              onClick={() => {
                onSelect(s);
                setQuery(s.name.replace(/ \(Vic\.\)/, ""));
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
            >
              <span className="text-sm text-slate-200">
                {s.name.replace(/ \(Vic\.\)/, "")}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {s.score_total?.toFixed(1) ?? "—"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
