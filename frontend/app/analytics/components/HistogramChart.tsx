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
    <div className="space-y-4">
      {/* Histogram Bars */}
      <div className="space-y-2">
        {bins.map((bin, idx) => (
          <div key={bin}>
            <div className="flex items-end gap-3">
              <div className="w-12 text-xs text-slate-600 font-medium">{bin}</div>
              <div className="flex-1 flex items-end gap-1">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-t-lg transition-all hover:shadow-md"
                  style={{
                    height: `${Math.max(20, (counts[idx] / maxCount) * 80)}px`,
                  }}
                />
                <span className="text-xs text-slate-500 ml-1 pb-1">{counts[idx]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
        <div>
          <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Mean</p>
          <p className="text-lg font-semibold text-slate-900">
            {data.length > 0 ? (data.reduce((sum, d) => sum + d.score_total, 0) / data.length).toFixed(1) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Median</p>
          <p className="text-lg font-semibold text-slate-900">
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
          <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Mode</p>
          <p className="text-lg font-semibold text-slate-900">
            {data.length > 0 ? Math.max(...counts) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
