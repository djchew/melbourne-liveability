"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/analytics/StatCard";
import AnalyticsNav from "@/components/analytics/AnalyticsNav";
import dynamic from "next/dynamic";
import { BarChart3, TrendingUp, Zap } from "lucide-react";

const DynamicHistogram = dynamic(() => import("./components/HistogramChart"), {
  ssr: false,
  loading: () => <div className="h-96 bg-white rounded-lg border border-slate-200 animate-pulse" />,
});

const DynamicTopSuburbs = dynamic(() => import("./components/TopSuburbs"), {
  ssr: false,
  loading: () => <div className="h-96 bg-white rounded-lg border border-slate-200 animate-pulse" />,
});

interface SuburbData {
  name: string;
  score_total: number;
  score_crime: number | null;
  score_transport: number | null;
  score_schools: number | null;
  score_greenspace: number | null;
  score_affordability: number | null;
  median_house_price: number | null;
}

export default function AnalyticsOverview() {
  const [data, setData] = useState<SuburbData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/suburbs?lightweight=true");
        if (!response.ok) throw new Error("Failed to fetch data");
        const suburbs = await response.json();
        setData(suburbs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="pt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
          <h3 className="font-semibold mb-2">Error Loading Data</h3>
          <p>{error}</p>
          <p className="text-sm mt-2">Make sure the backend API is running on port 8000.</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const scores = data.map((d) => d.score_total);
  const meanScore = scores.length > 0 ? (scores.reduce((a, b) => a + b) / scores.length).toFixed(1) : "0";
  const medianScore =
    scores.length > 0
      ? (scores.length % 2 === 0
          ? ((scores.sort((a, b) => a - b)[scores.length / 2 - 1] + scores.sort((a, b) => a - b)[scores.length / 2]) / 2).toFixed(1)
          : scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)].toFixed(1))
      : "0";
  const stdDev =
    scores.length > 0
      ? Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - parseFloat(meanScore), 2), 0) / scores.length).toFixed(1)
      : "0";

  // Calculate house price statistics
  const prices = data
    .filter((d) => d.median_house_price != null)
    .map((d) => d.median_house_price as number)
    .sort((a, b) => a - b);

  const meanPrice = prices.length > 0 ? prices.reduce((a, b) => a + b) / prices.length : 0;
  const medianPrice = prices.length > 0
    ? (prices.length % 2 === 0
        ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
        : prices[Math.floor(prices.length / 2)])
    : 0;
  const priceCoverage = data.length > 0 ? ((data.filter((d) => d.median_house_price != null).length / data.length) * 100).toFixed(1) : "0";

  // Calculate coverage
  const crimeCoverage = data.length > 0 ? ((data.filter((d) => d.score_crime != null).length / data.length) * 100).toFixed(1) : "0";
  const transportCoverage = data.length > 0 ? ((data.filter((d) => d.score_transport != null).length / data.length) * 100).toFixed(1) : "0";

  return (
    <div className="pt-8 pb-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics Overview</h1>
        <p className="text-slate-600">Explore liveability trends across Greater Melbourne</p>
      </div>

      {/* Navigation */}
      <AnalyticsNav />

      {/* Stats Grid */}
      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="📍 Total Suburbs"
              value={data.length}
              accent="cyan"
              icon={<BarChart3 size={24} className="text-cyan-600" />}
            />
            <StatCard
              label="⭐ Mean Score"
              value={meanScore}
              accent="cyan"
              icon={<TrendingUp size={24} className="text-cyan-600" />}
            />
            <StatCard
              label="📊 Median Score"
              value={medianScore}
              accent="orange"
              icon={<Zap size={24} className="text-orange-600" />}
            />
            {prices.length > 0 && (
              <>
                <StatCard
                  label="💰 Median House Price"
                  value={`$${(medianPrice / 1000000).toFixed(2)}M`}
                  accent="orange"
                />
                <StatCard
                  label="💵 Mean House Price"
                  value={`$${(meanPrice / 1000000).toFixed(2)}M`}
                  accent="slate"
                />
              </>
            )}
          </div>

          {/* Data Coverage Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Data Quality:</span> Crime data {crimeCoverage}% complete, Transport {transportCoverage}% complete, House prices {priceCoverage}% complete. School data ~66% complete.
            </p>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Score Distribution */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Score Distribution</h2>
                <DynamicHistogram data={data} />
              </div>
            </div>

            {/* Top 10 */}
            <div>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">🏆 Top 10 Suburbs</h2>
                <DynamicTopSuburbs data={data} limit={10} />
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">📊 Quick Insights</h2>
            <ul className="space-y-2 text-slate-700">
              <li>✓ <strong>{data.length} suburbs</strong> analyzed with liveability scores</li>
              <li>✓ Scores range from <strong>{Math.min(...scores).toFixed(1)}</strong> to <strong>{Math.max(...scores).toFixed(1)}</strong></li>
              <li>✓ Most suburbs cluster around <strong>{medianScore}</strong> (median)</li>
              {prices.length > 0 && (
                <li>✓ Median house price: <strong>${(medianPrice / 1000000).toFixed(2)}M</strong> across {prices.length} suburbs with data</li>
              )}
              <li>✓ Crime & transport data most complete; use filters for full-data suburbs</li>
            </ul>
          </div>
        </>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="h-32 bg-white rounded-lg border border-slate-200 animate-pulse" />
          <div className="h-96 bg-white rounded-lg border border-slate-200 animate-pulse" />
        </div>
      )}
    </div>
  );
}
