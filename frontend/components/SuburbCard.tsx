"use client";

import { X } from "lucide-react";
import { SuburbScore } from "@/lib/api";
import ScoreBreakdown from "./ScoreBreakdown";

interface Props {
  suburb: SuburbScore;
  onClose: () => void;
}

const fmt = (v: number | null) => (v !== null ? v.toFixed(1) : "—");

const scoreColor = (v: number | null) => {
  if (v === null) return "text-slate-400";
  if (v >= 80) return "text-cyan-400";
  if (v >= 65) return "text-green-400";
  if (v >= 50) return "text-yellow-400";
  if (v >= 35) return "text-orange-400";
  return "text-red-400";
};

export default function SuburbCard({ suburb, onClose }: Props) {
  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{suburb.name}</h2>
          <p className="text-sm text-slate-400">Greater Melbourne</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-border transition-colors"
        >
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Total score */}
      <div className="flex items-center justify-between bg-surface/60 rounded-xl px-4 py-3 border border-surface-border">
        <span className="text-sm text-slate-300 font-medium">Overall score</span>
        <span className={`text-3xl font-bold ${scoreColor(suburb.score_total)}`}>
          {fmt(suburb.score_total)}
        </span>
      </div>

      {/* Score breakdown chart */}
      <ScoreBreakdown suburb={suburb} />

      {/* Score rows */}
      <div className="space-y-2">
        {[
          { label: "Safety",       value: suburb.score_crime },
          { label: "Transport",    value: suburb.score_transport },
          { label: "Schools",      value: suburb.score_schools },
          { label: "Green space",  value: suburb.score_greenspace },
          { label: "Affordability",value: suburb.score_affordability },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-sm text-slate-400 w-28 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  value !== null && value >= 65 ? "bg-green-500" :
                  value !== null && value >= 50 ? "bg-yellow-400" :
                  value !== null && value >= 35 ? "bg-orange-500" : "bg-red-500"
                }`}
                style={{ width: `${value ?? 0}%` }}
              />
            </div>
            <span className={`text-sm font-semibold w-8 text-right ${scoreColor(value)}`}>
              {fmt(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
