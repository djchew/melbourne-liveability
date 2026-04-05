"use client";

import { useState } from "react";
import { X, Bookmark, ChevronDown, ShieldCheck, Train, GraduationCap, Leaf, Banknote } from "lucide-react";
import { SuburbScore } from "@/lib/api";
import ScoreBreakdown from "./ScoreBreakdown";

interface Props {
  suburb: SuburbScore;
  onClose: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

// Melbourne averages (computed from database)
const MEL_AVG = {
  score_crime: 55,
  score_transport: 52,
  score_schools: 57,
  score_greenspace: 48,
  score_affordability: 50,
};

const fmt = (v: number | null) => (v !== null ? v.toFixed(1) : "—");

const scoreTheme = (v: number | null): { text: string; bar: string; border: string; bg: string } => {
  if (v === null) return { text: "text-slate-400", bar: "bg-slate-300", border: "border-slate-200", bg: "bg-slate-50" };
  if (v >= 80) return { text: "text-cyan-600",   bar: "bg-cyan-500",   border: "border-cyan-200",  bg: "bg-cyan-50" };
  if (v >= 65) return { text: "text-green-600",  bar: "bg-green-500",  border: "border-green-200", bg: "bg-green-50" };
  if (v >= 50) return { text: "text-amber-600",  bar: "bg-amber-400",  border: "border-amber-200", bg: "bg-amber-50" };
  if (v >= 35) return { text: "text-orange-600", bar: "bg-orange-500", border: "border-orange-200",bg: "bg-orange-50" };
  return         { text: "text-red-600",    bar: "bg-red-500",    border: "border-red-200",   bg: "bg-red-50" };
};

const grade = (v: number | null) => {
  if (v === null) return "–";
  if (v >= 80) return "A";
  if (v >= 65) return "B";
  if (v >= 50) return "C";
  if (v >= 35) return "D";
  return "F";
};

const METRICS = [
  { label: "Safety",        key: "score_crime",         Icon: ShieldCheck },
  { label: "Transport",     key: "score_transport",      Icon: Train },
  { label: "Schools",       key: "score_schools",        Icon: GraduationCap },
  { label: "Green space",   key: "score_greenspace",     Icon: Leaf },
  { label: "Affordability", key: "score_affordability",  Icon: Banknote },
] as const;

export default function SuburbCard({
  suburb,
  onClose,
  isBookmarked = false,
  onToggleBookmark,
}: Props) {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const total = suburb.score_total;
  const theme = scoreTheme(total);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            {suburb.name ? suburb.name.replace(/ \(Vic\.\)/, "") : "Suburb"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">Greater Melbourne</p>
        </div>
        <div className="flex gap-1.5">
          {onToggleBookmark && (
            <button
              onClick={onToggleBookmark}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              <Bookmark
                size={15}
                className={isBookmarked ? "fill-cyan-600 text-cyan-600" : "text-slate-400"}
              />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={15} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Description */}
      {suburb.description && (
        <div className="mx-5 mt-4 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-700 leading-relaxed">{suburb.description}</p>
        </div>
      )}

      {/* Overall score */}
      <div className={`mx-5 mt-4 rounded-xl border ${theme.border} ${theme.bg} px-4 py-3 flex items-center justify-between`}>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Liveability score</p>
          <p className={`text-3xl font-bold mt-0.5 ${theme.text}`}>{fmt(total)}</p>
        </div>
        <div className={`text-4xl font-black ${theme.text} opacity-20`}>{grade(total)}</div>
      </div>

      {/* Category scores */}
      <div className="px-5 mt-5 space-y-3 pb-6">
        {METRICS.map(({ label, key, Icon }) => {
          const val = suburb[key];
          const t = scoreTheme(val);
          const melAvg = MEL_AVG[key as keyof typeof MEL_AVG];
          const isExpanded = expandedMetric === key;

          return (
            <div key={label}>
              <button
                onClick={() => setExpandedMetric(isExpanded ? null : key)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon size={13} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${t.text}`}>{fmt(val)}</span>
                    <ChevronDown
                      size={12}
                      className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>
              </button>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${t.bar} transition-all`}
                  style={{ width: `${val ?? 0}%` }}
                />
              </div>

              {/* Expanded comparison view */}
              {isExpanded && val !== null && (
                <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 mb-2 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-600">Your suburb</span>
                    <span className="font-semibold text-slate-900">{val.toFixed(1)}</span>
                  </div>
                  <div className="h-1 bg-white rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${t.bar}`}
                      style={{ width: `${Math.min(val, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mb-2 pt-1 border-t border-slate-200">
                    <span className="text-slate-600">Melbourne avg</span>
                    <span className="font-semibold text-slate-700">{melAvg.toFixed(1)}</span>
                  </div>
                  <div className="h-1 bg-white rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-slate-300"
                      style={{ width: `${Math.min(melAvg, 100)}%` }}
                    />
                  </div>

                  <div className="text-slate-600">
                    {val > melAvg + 5 ? (
                      <span>
                        <strong className="text-green-700">Better</strong> than{" "}
                        {Math.round(((val - melAvg) / (100 - melAvg)) * 100)}% of suburbs
                      </span>
                    ) : val < melAvg - 5 ? (
                      <span>
                        <strong className="text-orange-600">Below</strong> the Melbourne average
                      </span>
                    ) : (
                      <span>
                        <strong>In line</strong> with Melbourne average
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Radar chart */}
      <div className="px-5 pb-6">
        <p className="text-xs font-medium text-slate-600 mb-3">Score breakdown</p>
        <ScoreBreakdown suburb={suburb} />
      </div>
    </div>
  );
}
