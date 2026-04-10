"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";

interface SuburbData {
  name: string;
  score_total: number;
  score_crime: number | null;
  score_transport: number | null;
  score_schools: number | null;
  score_greenspace: number | null;
  score_affordability: number | null;
}

interface TopSuburbsProps {
  data: SuburbData[];
  limit?: number;
}

export default function TopSuburbs({ data, limit = 10 }: TopSuburbsProps) {
  const topSuburbs = useMemo(() => {
    return [...data].sort((a, b) => b.score_total - a.score_total).slice(0, limit);
  }, [data, limit]);

  const maxScore = topSuburbs.length > 0 ? topSuburbs[0].score_total : 0;

  return (
    <div className="space-y-2">
      {topSuburbs.length === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">No data available</p>
      ) : (
        topSuburbs.map((suburb, idx) => {
          const percentage = (suburb.score_total / maxScore) * 100;
          return (
            <div
              key={suburb.name}
              className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 font-semibold text-xs flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate group-hover:text-cyan-700 transition-colors">
                  {suburb.name}
                </p>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-cyan-600 h-full rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-slate-900">{suburb.score_total.toFixed(1)}</p>
              </div>
            </div>
          );
        })
      )}

      {/* Footer note if there are more suburbs */}
      {limit && data.length > limit && (
        <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 text-center">
          +{data.length - limit} more suburbs
        </div>
      )}
    </div>
  );
}
