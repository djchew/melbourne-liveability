"use client";

import { X, ShieldCheck, Train, GraduationCap, Leaf, Banknote } from "lucide-react";
import { SuburbScore } from "@/lib/api";

interface Props {
  suburb: SuburbScore;
  onClose: () => void;
}

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

export default function SuburbCard({ suburb, onClose }: Props) {
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
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors mt-0.5"
        >
          <X size={15} className="text-slate-400" />
        </button>
      </div>

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
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Icon size={13} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                </div>
                <span className={`text-xs font-semibold ${t.text}`}>{fmt(val)}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${t.bar} transition-all`}
                  style={{ width: `${val ?? 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
