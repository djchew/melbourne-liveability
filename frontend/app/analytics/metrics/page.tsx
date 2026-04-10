"use client";

import { useEffect, useState, useMemo } from "react";
import AnalyticsNav from "@/components/analytics/AnalyticsNav";
import { ChevronDown } from "lucide-react";

interface SuburbData {
  name: string;
  score_total: number;
  rate_per_100k: number | null;
  stop_count: number | null;
  avg_icsea_score: number | null;
  green_pct_of_suburb: number | null;
  median_house_price: number | null;
}

interface MetricInfo {
  key: keyof SuburbData;
  label: string;
  description: string;
  unit: string;
  weight: number;
  icon: string;
}

const METRICS: MetricInfo[] = [
  {
    key: "rate_per_100k",
    label: "Crime Rate",
    description: "Crime incidents per 100,000 population (lower is better)",
    unit: "per 100k",
    weight: 25,
    icon: "🚨",
  },
  {
    key: "stop_count",
    label: "Transport Connectivity",
    description: "Number of public transport stops nearby (higher is better)",
    unit: "stops",
    weight: 25,
    icon: "🚇",
  },
  {
    key: "avg_icsea_score",
    label: "School Quality",
    description: "Average ICSEA score of schools (higher is better)",
    unit: "ICSEA",
    weight: 20,
    icon: "🎓",
  },
  {
    key: "green_pct_of_suburb",
    label: "Green Space",
    description: "Percentage of suburb covered by green space (higher is better)",
    unit: "%",
    weight: 15,
    icon: "🌳",
  },
  {
    key: "median_house_price",
    label: "Housing Affordability",
    description: "Median house price (lower is better for affordability)",
    unit: "$",
    weight: 15,
    icon: "🏠",
  },
];

export default function MetricsPage() {
  const [data, setData] = useState<SuburbData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricInfo>(METRICS[0]);
  const [expandedMetric, setExpandedMetric] = useState<string>(METRICS[0].label);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/suburbs");
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

  const metricStats = useMemo(() => {
    const values = data
      .map((d) => d[selectedMetric.key] as number | null)
      .filter((v): v is number => v !== null);

    if (values.length === 0) {
      return {
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        count: 0,
        coverage: 0,
      };
    }

    values.sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b) / values.length;
    const median = values.length % 2 === 0 ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2 : values[Math.floor(values.length / 2)];

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      mean,
      median,
      count: values.length,
      coverage: ((values.length / data.length) * 100).toFixed(1),
    };
  }, [data, selectedMetric]);

  const rankedSuburbs = useMemo(() => {
    const filtered = data
      .filter((d) => d[selectedMetric.key] !== null)
      .sort((a, b) => {
        const aVal = a[selectedMetric.key] as number;
        const bVal = b[selectedMetric.key] as number;
        // For crime rate and house price, lower is better
        if (selectedMetric.key === "rate_per_100k" || selectedMetric.key === "median_house_price") {
          return aVal - bVal;
        }
        // For others, higher is better
        return bVal - aVal;
      });

    return filtered.slice(0, 15);
  }, [data, selectedMetric]);

  const formatValue = (value: number | null, unit: string): string => {
    if (value === null) return "—";
    if (unit === "$") return `$${(value / 1000000).toFixed(2)}M`;
    if (unit === "per 100k") return value.toFixed(0);
    if (unit === "%") return `${value.toFixed(1)}%`;
    return value.toFixed(1);
  };

  if (error) {
    return (
      <div className="pt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
          <h3 className="font-semibold mb-2">Error Loading Data</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Metrics Explorer</h1>
        <p className="text-slate-600">Deep dive into individual liveability metrics</p>
      </div>

      {/* Navigation */}
      <AnalyticsNav />

      {!loading && (
        <>
          {/* Metrics Tabs */}
          <div className="space-y-4 mb-8">
            {METRICS.map((metric) => (
              <div
                key={metric.label}
                className="border border-slate-200 rounded-lg overflow-hidden bg-white"
              >
                <button
                  onClick={() => {
                    setSelectedMetric(metric);
                    setExpandedMetric(expandedMetric === metric.label ? "" : metric.label);
                  }}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 text-left">
                    <span className="text-2xl">{metric.icon}</span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{metric.label}</h3>
                      <p className="text-sm text-slate-600">{metric.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase font-medium">Weight</p>
                      <p className="text-lg font-bold text-slate-900">{metric.weight}%</p>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-slate-400 transition-transform ${
                        expandedMetric === metric.label ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {expandedMetric === metric.label && (
                  <div className="border-t border-slate-200 px-6 py-6 bg-slate-50">
                    {/* Statistics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                      <div>
                        <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Coverage</p>
                        <p className="text-2xl font-bold text-slate-900">{metricStats.coverage}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Minimum</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {formatValue(metricStats.min, metric.unit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Average</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {formatValue(metricStats.mean, metric.unit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Median</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {formatValue(metricStats.median, metric.unit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Maximum</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {formatValue(metricStats.max, metric.unit)}
                        </p>
                      </div>
                    </div>

                    {/* Top/Bottom Suburbs */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-900 mb-4">
                        {selectedMetric.key === "rate_per_100k" || selectedMetric.key === "median_house_price"
                          ? "Best Suburbs (Lowest)"
                          : "Best Suburbs (Highest)"}
                      </p>
                      <div className="space-y-2">
                        {rankedSuburbs.map((suburb, idx) => {
                          const value = suburb[selectedMetric.key] as number | null;
                          const percentage = value
                            ? ((value - metricStats.min) / (metricStats.max - metricStats.min)) * 100
                            : 0;

                          return (
                            <div key={suburb.name} className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center text-xs font-semibold text-cyan-700">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{suburb.name}</p>
                                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                                  <div
                                    className="bg-gradient-to-r from-cyan-400 to-cyan-600 h-full rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-semibold text-slate-900">
                                  {formatValue(value, metric.unit)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Methodology Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">📊 About These Metrics:</span> Each metric is weighted according to its
              importance in the overall liveability score. Metrics are normalized to a 0-100 scale before being combined
              to produce suburb scores.
            </p>
          </div>
        </>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="h-24 bg-white rounded-lg border border-slate-200 animate-pulse" />
          <div className="h-24 bg-white rounded-lg border border-slate-200 animate-pulse" />
          <div className="h-24 bg-white rounded-lg border border-slate-200 animate-pulse" />
        </div>
      )}
    </div>
  );
}
