"use client";

import { useEffect, useState, useMemo } from "react";
import StatCard from "@/components/analytics/StatCard";
import AnalyticsNav from "@/components/analytics/AnalyticsNav";
import { X, Plus, ChevronDown } from "lucide-react";

interface SuburbData {
  name: string;
  score_total: number;
  score_crime: number | null;
  score_transport: number | null;
  score_schools: number | null;
  score_greenspace: number | null;
  score_affordability: number | null;
}

export default function ComparisonPage() {
  const [allSuburbs, setAllSuburbs] = useState<SuburbData[]>([]);
  const [selectedSuburbs, setSelectedSuburbs] = useState<SuburbData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/suburbs");
        if (!response.ok) throw new Error("Failed to fetch data");
        const suburbs = await response.json();
        setAllSuburbs(suburbs);
        // Pre-select top 3 suburbs by default
        const topThree = [...suburbs]
          .sort((a, b) => b.score_total - a.score_total)
          .slice(0, 3);
        setSelectedSuburbs(topThree);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const availableSuburbs = useMemo(() => {
    return allSuburbs
      .filter(
        (s) => !selectedSuburbs.some((sel) => sel.name === s.name) &&
          s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.score_total - a.score_total)
      .slice(0, 10);
  }, [allSuburbs, selectedSuburbs, searchQuery]);

  const addSuburb = (suburb: SuburbData) => {
    setSelectedSuburbs([...selectedSuburbs, suburb]);
    setSearchQuery("");
  };

  const removeSuburb = (name: string) => {
    setSelectedSuburbs(selectedSuburbs.filter((s) => s.name !== name));
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Compare Suburbs</h1>
        <p className="text-slate-600">Select up to 5 suburbs to compare liveability metrics</p>
      </div>

      {/* Navigation */}
      <AnalyticsNav />

      {!loading && (
        <>
          {/* Suburb Selection */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Selected Suburbs</h2>

            {selectedSuburbs.length === 0 ? (
              <p className="text-slate-500 text-sm">Select suburbs to begin comparison</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedSuburbs.map((suburb) => (
                  <div
                    key={suburb.name}
                    className="flex items-center gap-2 px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-lg"
                  >
                    <span className="text-sm font-medium text-slate-900">{suburb.name}</span>
                    <button
                      onClick={() => removeSuburb(suburb.name)}
                      className="text-cyan-600 hover:text-cyan-700 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedSuburbs.length < 5 && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Plus size={16} />
                  Add Suburb
                  <ChevronDown size={16} className={`transition-transform ${showDropdown ? "rotate-180" : ""}`} />
                </button>

                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                    <div className="p-3 border-b border-slate-200">
                      <input
                        type="text"
                        placeholder="Search suburbs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {availableSuburbs.length > 0 ? (
                        availableSuburbs.map((suburb) => (
                          <button
                            key={suburb.name}
                            onClick={() => addSuburb(suburb)}
                            className="w-full text-left px-4 py-2 hover:bg-cyan-50 transition-colors flex justify-between items-center"
                          >
                            <span className="text-sm font-medium text-slate-900">{suburb.name}</span>
                            <span className="text-xs text-slate-500">{suburb.score_total.toFixed(1)}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-500">No suburbs found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comparison Grid */}
          {selectedSuburbs.length > 0 && (
            <>
              {/* Overall Scores */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Overall Liveability Scores</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {selectedSuburbs.map((suburb) => (
                    <div
                      key={suburb.name}
                      className="bg-white rounded-lg border border-slate-200 p-4 text-center hover:shadow-md transition-shadow"
                    >
                      <p className="text-sm font-medium text-slate-600 mb-2 truncate">{suburb.name}</p>
                      <p className="text-3xl font-bold text-cyan-700">{suburb.score_total.toFixed(1)}</p>
                      <div className="w-full bg-slate-200 rounded-full h-1 mt-3"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Metrics Table */}
              <div className="bg-white rounded-lg border border-slate-200 p-6 overflow-x-auto">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Detailed Metrics</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left px-4 py-2 font-semibold text-slate-900">Metric</th>
                      {selectedSuburbs.map((suburb) => (
                        <th
                          key={suburb.name}
                          className="text-right px-4 py-2 font-semibold text-slate-900 whitespace-nowrap"
                        >
                          {suburb.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">Crime Safety Score</td>
                      {selectedSuburbs.map((suburb) => (
                        <td key={suburb.name} className="text-right px-4 py-3 text-slate-700">
                          {suburb.score_crime != null ? suburb.score_crime.toFixed(1) : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">Transport Connectivity Score</td>
                      {selectedSuburbs.map((suburb) => (
                        <td key={suburb.name} className="text-right px-4 py-3 text-slate-700">
                          {suburb.score_transport != null ? suburb.score_transport.toFixed(1) : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">School Quality Score</td>
                      {selectedSuburbs.map((suburb) => (
                        <td key={suburb.name} className="text-right px-4 py-3 text-slate-700">
                          {suburb.score_schools != null ? suburb.score_schools.toFixed(1) : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">Green Space Score</td>
                      {selectedSuburbs.map((suburb) => (
                        <td key={suburb.name} className="text-right px-4 py-3 text-slate-700">
                          {suburb.score_greenspace != null ? suburb.score_greenspace.toFixed(1) : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">Affordability Score</td>
                      {selectedSuburbs.map((suburb) => (
                        <td key={suburb.name} className="text-right px-4 py-3 text-slate-700">
                          {suburb.score_affordability != null
                            ? suburb.score_affordability.toFixed(1)
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="h-32 bg-white rounded-lg border border-slate-200 animate-pulse" />
          <div className="h-64 bg-white rounded-lg border border-slate-200 animate-pulse" />
        </div>
      )}
    </div>
  );
}
