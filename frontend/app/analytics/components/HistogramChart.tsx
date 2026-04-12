"use client";

import { useMemo } from "react";

interface SuburbData {
  name: string;
  score_total: number;
  score_crime: number | null;
  score_transport: number | null;
  score_schools: number | null;
  score_greenspace: number | null;
  score_affordability: number | null;
}

interface HistogramChartProps {
  data: SuburbData[];
}

export default function HistogramChart({ data }: HistogramChartProps) {
  const { bins, counts, maxCount } = useMemo(() => {
    const scores = data.map((d) => d.score_total);

    if (scores.length === 0) {
      return { bins: [], counts: [], maxCount: 0 };
    }

    const min = Math.floor(Math.min(...scores) * 10) / 10;
    const max = Math.ceil(Math.max(...scores) * 10) / 10;
    const binSize = (max - min) / 10;

    const binArray = Array.from({ length: 10 }, (_, i) => ({
      start: min + i * binSize,
      end: min + (i + 1) * binSize,
      count: 0,
    }));

    scores.forEach((score) => {
      const binIndex = Math.min(9, Math.floor((score - min) / binSize));
      binArray[binIndex].count++;
    });

    return {
      bins: binArray.map((b) => `${b.start.toFixed(1)}-${b.end.toFixed(1)}`),
      counts: binArray.map((b) => b.count),
      maxCount: Math.max(...binArray.map((b) => b.count)),
    };
  }, [data]);

  return (
    <div className="space-y-8">
      {/* Histogram Bars */}
      <div className="space-y-4">
        {bins.map((bin, idx) => (
          <div key={bin} className="flex items-center gap-4">
            <div className="w-14 text-right">
              <p className="text-sm text-slate-600">{bin}</p>
            </div>
            <div className="flex-1 h-8 bg-slate-100 rounded overflow-hidden">
              <div
                className="h-full bg-cyan-600 transition-all"
                style={{
                  width: `${Math.max(2, (counts[idx] / maxCount) * 100)}%`,
                }}
              />
            </div>
            <div className="w-8 text-right">
              <p className="text-sm font-medium text-slate-900">{counts[idx]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Mean Score</p>
          <p className="text-3xl font-bold text-slate-900">
            {data.length > 0 ? (data.reduce((sum, d) => sum + d.score_total, 0) / data.length).toFixed(1) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Median Score</p>
          <p className="text-3xl font-bold text-slate-900">
            {data.length > 0
              ? (() => {
                  const sorted = data.map((d) => d.score_total).sort((a, b) => a - b);
                  return data.length % 2 === 0
                    ? ((sorted[data.length / 2 - 1] + sorted[data.length / 2]) / 2).toFixed(1)
                    : sorted[Math.floor(data.length / 2)].toFixed(1);
                })()
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Most Common</p>
          <p className="text-3xl font-bold text-slate-900">
            {data.length > 0 ? Math.max(...counts) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
