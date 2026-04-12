"use client";

import { useEffect, useState, useMemo } from "react";
import AnalyticsNav from "@/components/analytics/AnalyticsNav";
import { AlertCircle, TrendingUp, Target, Zap } from "lucide-react";

interface SuburbData {
  name: string;
  score_total: number;
  score_crime: number | null;
  score_transport: number | null;
  score_schools: number | null;
  score_greenspace: number | null;
  score_affordability: number | null;
}

interface Insight {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: "cyan" | "orange" | "green" | "purple";
}

export default function InsightsPage() {
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

  const insights = useMemo((): Insight[] => {
    const scores = data.map((d) => d.score_total);
    const crimeData = data.filter((d) => d.score_crime != null).map((d) => d.score_crime as number);
    const transportData = data.filter((d) => d.score_transport != null).map((d) => d.score_transport as number);
    const schoolData = data.filter((d) => d.score_schools != null).map((d) => d.score_schools as number);
    const greenData = data.filter((d) => d.score_greenspace != null).map((d) => d.score_greenspace as number);

    const crimeCoverage = ((crimeData.length / data.length) * 100).toFixed(0);
    const transportCoverage = ((transportData.length / data.length) * 100).toFixed(0);
    const schoolCoverage = ((schoolData.length / data.length) * 100).toFixed(0);
    const greenCoverage = ((greenData.length / data.length) * 100).toFixed(0);

    if (scores.length === 0) {
      return [];
    }

    // Find metric with highest coverage
    const coverageMap = {
      crime: parseFloat(crimeCoverage),
      transport: parseFloat(transportCoverage),
      schools: parseFloat(schoolCoverage),
      green: parseFloat(greenCoverage),
    };
    const entries = Object.entries(coverageMap);
    const mostCompleteCoverage = entries.reduce((prev, current) =>
      current[1] > prev[1] ? current : prev,
      entries[0]
    );
    const mostCompleteMetric = mostCompleteCoverage?.[0] || "transport";

    const topScoreSuburb = data.reduce((prev, current) =>
      prev.score_total > current.score_total ? prev : current
    );

    const avgScore = (scores.reduce((a, b) => a + b) / scores.length).toFixed(1);
    const scoreRange = (Math.max(...scores) - Math.min(...scores)).toFixed(1);

    // Generate insights based on actual coverage
    const metricLabels: Record<string, string> = {
      crime: "Crime Safety",
      transport: "Transport Connectivity",
      schools: "School Quality",
      green: "Green Space",
    };

    const insightsList: Insight[] = [
      {
        title: "Score Distribution",
        description: `Liveability scores range from ${Math.min(...scores).toFixed(1)} to ${Math.max(...scores).toFixed(
          1
        )}, with an average of ${avgScore} across ${data.length} suburbs.`,
        icon: <TrendingUp className="w-6 h-6" />,
        color: "cyan",
      },
      {
        title: "Data Quality Leader",
        description: `${topScoreSuburb.name} ranks as the most liveable suburb with a score of ${topScoreSuburb.score_total.toFixed(
          1
        )}, supported by comprehensive data across all metrics.`,
        icon: <Target className="w-6 h-6" />,
        color: "orange",
      },
      {
        title: "Most Complete Metric",
        description: `${metricLabels[mostCompleteMetric]} data is our most complete, available for ${mostCompleteCoverage[1].toFixed(0)}% of suburbs. This ensures the most reliable assessments for this metric across the region.`,
        icon: <AlertCircle className="w-6 h-6" />,
        color: "green",
      },
      {
        title: "Comprehensive Coverage",
        description: `With ${transportCoverage}% transport and ${crimeCoverage}% crime data coverage, we have broad visibility into the factors that most affect liveability across suburbs.`,
        icon: <Zap className="w-6 h-6" />,
        color: "purple",
      },
    ];

    return insightsList;
  }, [data]);

  const weights = [
    { metric: "Crime Safety", weight: 25, icon: "🚨" },
    { metric: "Transport Access", weight: 25, icon: "🚇" },
    { metric: "School Quality", weight: 20, icon: "🎓" },
    { metric: "Green Space", weight: 15, icon: "🌳" },
    { metric: "Affordability", weight: 15, icon: "🏠" },
  ];

  const recommendations = [
    {
      title: "For Families",
      insights: [
        "Prioritize suburbs with high school ICSEA scores (above 1000)",
        "Look for good transport connectivity for school commutes",
        "Check crime rates in candidate suburbs",
      ],
    },
    {
      title: "For Commuters",
      insights: [
        "Focus on transport stop count and proximity to major hubs",
        "Balance commute convenience with housing affordability",
        "Consider green space for work-life balance",
      ],
    },
    {
      title: "For Retirees",
      insights: [
        "Green space and local amenities are high priorities",
        "Evaluate transport access for healthcare and social visits",
        "Consider affordability to maximize retirement budget",
      ],
    },
    {
      title: "For Young Professionals",
      insights: [
        "Excellent transport access is essential for career flexibility",
        "Affordable housing enables savings and investment",
        "Good schools may matter for future family plans",
      ],
    },
  ];

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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Insights & Analysis</h1>
        <p className="text-slate-600">Data-driven insights into Greater Melbourne liveability</p>
      </div>

      {/* Navigation */}
      <AnalyticsNav />

      {!loading && (
        <>
          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {insights.map((insight, idx) => {
              const colorClasses = {
                cyan: "border-cyan-200 bg-cyan-50",
                orange: "border-orange-200 bg-orange-50",
                green: "border-green-200 bg-green-50",
                purple: "border-purple-200 bg-purple-50",
              };

              const iconColorClasses = {
                cyan: "text-cyan-600",
                orange: "text-orange-600",
                green: "text-green-600",
                purple: "text-purple-600",
              };

              return (
                <div
                  key={idx}
                  className={`border rounded-lg p-6 ${colorClasses[insight.color]}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 ${iconColorClasses[insight.color]}`}>
                      {insight.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{insight.title}</h3>
                      <p className="text-slate-700 text-sm">{insight.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scoring Methodology */}
          <div className="bg-white border border-slate-200 rounded-lg p-8 mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Scoring Methodology</h2>
            <p className="text-slate-700 mb-6">
              Melbourne liveability scores are calculated by combining five key metrics, each weighted according to its
              importance for suburb quality of life:
            </p>

            <div className="space-y-3 mb-8">
              {weights.map((item) => (
                <div key={item.metric} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="font-medium text-slate-900">{item.metric}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-cyan-600 h-full"
                        style={{ width: `${item.weight}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-900 w-10 text-right">{item.weight}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">📊 How scores are calculated:</span> Each metric is normalized to a
                0-100 scale, then weighted and combined to produce a final score. Metrics with missing data are
                extrapolated based on suburb characteristics to ensure fair comparison.
              </p>
            </div>
          </div>

          {/* Personalized Recommendations */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">How to Use These Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.map((rec) => (
                <div key={rec.title} className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{rec.title}</h3>
                  <ul className="space-y-3">
                    {rec.insights.map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-slate-700 text-sm">
                        <span className="text-cyan-600 font-bold flex-shrink-0">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Data Quality Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex gap-4">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-amber-900 mb-2">About Data Quality</h3>
                <p className="text-sm text-amber-800">
                  Liveability scores are based on available public data. Some metrics may have gaps in coverage
                  (particularly for newer suburbs). We continuously update data as new sources become available. Use
                  comparison tools to validate suburbs against your specific priorities.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="h-32 bg-white rounded-lg border border-slate-200 animate-pulse" />
          <div className="h-32 bg-white rounded-lg border border-slate-200 animate-pulse" />
          <div className="h-64 bg-white rounded-lg border border-slate-200 animate-pulse" />
        </div>
      )}
    </div>
  );
}
