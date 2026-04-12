"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import MapGL, { NavigationControl, Source, Layer } from "react-map-gl/maplibre";
import { getSuburb, SuburbScore } from "@/lib/api";
import "maplibre-gl/dist/maplibre-gl.css";

const INITIAL_VIEW = {
  longitude: 144.9631,
  latitude: -37.8136,
  zoom: 10.5,
  pitch: 0,
  bearing: 0,
};

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const METRICS = [
  { key: "score_crime",        label: "Safety",      abbr: "Safety"  },
  { key: "score_transport",    label: "Transport",   abbr: "Transit" },
  { key: "score_schools",      label: "Schools",     abbr: "Schools" },
  { key: "score_greenspace",   label: "Green space", abbr: "Green"   },
  { key: "score_affordability",label: "Affordability",abbr: "Price"  },
];

const DEFAULT_WEIGHTS: Record<string, number> = {
  score_crime: 25,
  score_transport: 25,
  score_schools: 20,
  score_greenspace: 15,
  score_affordability: 15,
};

interface Props {
  onSuburbSelect: (suburb: SuburbScore) => void;
  activeMetrics: string[];
  activeBand: string | null;
  onMetricsChange: (metrics: string[]) => void;
  onBandChange: (band: string | null) => void;
}

export default function SuburbMap({
  onSuburbSelect,
  activeMetrics,
  activeBand,
  onMetricsChange,
  onBandChange,
}: Props) {
  const [geojson, setGeojson] = useState<{ type: string; features: any[] } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; score: number | null; flipX: boolean; flipY: boolean } | null>(null);
  const [overFilterCard, setOverFilterCard] = useState(false);
  const [cursor, setCursor] = useState("grab");
  const [firstLabelId, setFirstLabelId] = useState<string | undefined>(undefined);
  const [showWeights, setShowWeights] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>({ ...DEFAULT_WEIGHTS });

  const isComposite = activeMetrics.length > 1;

  // Normalise weights of active metrics so they sum to 100
  const normalisedWeights = useMemo(() => {
    if (!isComposite) return {};
    const activeWeights = activeMetrics.reduce((acc, m) => {
      acc[m] = weights[m] ?? 20;
      return acc;
    }, {} as Record<string, number>);
    const total = Object.values(activeWeights).reduce((a, b) => a + b, 0);
    if (total === 0) return activeWeights;
    return Object.fromEntries(
      Object.entries(activeWeights).map(([k, v]) => [k, v / total])
    );
  }, [activeMetrics, weights, isComposite]);

  // Inject composite score into each feature
  const activeGeojson = useMemo(() => {
    if (!geojson) return null;
    if (!isComposite) return geojson;

    const features = geojson.features.map((f) => {
      const props = f.properties;
      let weightedSum = 0;
      let weightUsed = 0;
      for (const m of activeMetrics) {
        const val = props[m];
        if (val !== null && val !== undefined) {
          weightedSum += val * normalisedWeights[m];
          weightUsed += normalisedWeights[m];
        }
      }
      const composite = weightUsed > 0 ? weightedSum / weightUsed : null;
      return { ...f, properties: { ...props, score_composite: composite } };
    });

    return { ...geojson, features };
  }, [geojson, activeMetrics, normalisedWeights, isComposite]);

  const activeKey = isComposite ? "score_composite" : (activeMetrics[0] ?? "score_crime");

  const colorExpr: any = useMemo(() => [
    "case",
    ["==", ["get", activeKey], null],  "#475569",
    [">=", ["get", activeKey], 80],    "#06b6d4",
    [">=", ["get", activeKey], 65],    "#22c55e",
    [">=", ["get", activeKey], 50],    "#eab308",
    [">=", ["get", activeKey], 35],    "#f97316",
    "#ef4444",
  ], [activeKey]);

  const opacityExpr: any = useMemo(() => {
    if (!activeBand) return 0.4;
    const bandRanges: Record<string, [number, number]> = {
      "A": [80, 100], "B": [65, 79], "C": [50, 64], "D": [35, 49], "F": [0, 34],
    };
    const [min, max] = bandRanges[activeBand] || [0, 100];
    return [
      "case",
      ["&&", [">=", ["get", activeKey], min], ["<=", ["get", activeKey], max]],
      0.5,
      0.15,
    ];
  }, [activeBand, activeKey]);

  useEffect(() => {
    fetch("/api/suburbs/geojson")
      .then((r) => r.json())
      .then(setGeojson)
      .catch(console.error);
  }, []);

  const handleClick = useCallback(async (e: any) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const suburb_id = feature.properties?.suburb_id;
    if (!suburb_id) return;
    const detail = await getSuburb(suburb_id);
    onSuburbSelect(detail);
  }, [onSuburbSelect]);

  const handleMapLoad = useCallback((e: any) => {
    const map = e.target;
    const firstSymbol = map.getStyle().layers.find((l: any) => l.type === "symbol");
    if (firstSymbol) setFirstLabelId(firstSymbol.id);
  }, []);

  const handleMouseMove = useCallback((e: any) => {
    const feature = e.features?.[0];
    if (feature) {
      setCursor("pointer");
      const x = e.point.x;
      const y = e.point.y;
      // Flip tooltip right→left when near the left-side filter card (within 280px from left)
      // Flip tooltip up when near the bottom (within 100px from bottom)
      const mapEl = e.target?.getCanvas?.();
      const mapHeight = mapEl?.clientHeight ?? window.innerHeight;
      setTooltip({
        x,
        y,
        name: (feature.properties?.name ?? "").replace(/ \(Vic\.\)/, ""),
        score: feature.properties?.[activeKey] ?? null,
        flipX: x < 280,
        flipY: y > mapHeight - 100,
      });
    } else {
      setCursor("grab");
      setTooltip(null);
    }
  }, [activeKey]);

  const handleMetricClick = (key: string) => {
    const isActive = activeMetrics.includes(key);
    // Always keep at least one metric selected
    if (isActive && activeMetrics.length === 1) return;
    const next = isActive ? activeMetrics.filter((m) => m !== key) : [...activeMetrics, key];
    onMetricsChange(next);
  };

  const tooltipLabel = isComposite
    ? "Composite"
    : METRICS.find((m) => m.key === activeMetrics[0])?.label ?? "Score";

  const totalWeight = activeMetrics
    .filter((m) => m !== "score_total")
    .reduce((sum, m) => sum + (weights[m] ?? 20), 0);

  return (
    <div className="relative w-full h-full bg-slate-100" style={{ cursor }}>
      <MapGL
        initialViewState={INITIAL_VIEW}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        interactiveLayerIds={["suburb-fills"]}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setCursor("grab"); setTooltip(null); }}
        onLoad={handleMapLoad}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {activeGeojson && (
          <Source id="suburbs-geo" type="geojson" data={activeGeojson}>
            <Layer
              id="suburb-fills"
              type="fill"
              beforeId={firstLabelId}
              paint={{ "fill-color": colorExpr, "fill-opacity": opacityExpr }}
            />
            <Layer
              id="suburb-borders"
              type="line"
              beforeId={firstLabelId}
              paint={{ "line-color": "#94a3b8", "line-width": 0.8, "line-opacity": 0.6 }}
            />
          </Source>
        )}
      </MapGL>

      {/* Hover tooltip */}
      {tooltip && !overFilterCard && (
        <div
          className="absolute pointer-events-none z-20 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg"
          style={{
            left: tooltip.flipX ? undefined : tooltip.x + 12,
            right: tooltip.flipX ? `calc(100% - ${tooltip.x - 12}px)` : undefined,
            top: tooltip.flipY ? undefined : tooltip.y - 12,
            bottom: tooltip.flipY ? `calc(100% - ${tooltip.y + 12}px)` : undefined,
          }}
        >
          <p className="text-sm font-semibold text-slate-900">{tooltip.name}</p>
          <p className="text-xs text-slate-500">
            {tooltipLabel}:{" "}
            <span className="text-slate-700 font-medium">
              {tooltip.score != null ? Number(tooltip.score).toFixed(1) : "—"}
            </span>
          </p>
        </div>
      )}

      {/* Controls and legend */}
      <div
        className="absolute bottom-6 left-6 z-30 bg-white/95 border border-slate-200 rounded-xl shadow-md overflow-hidden max-w-[220px]"
        onMouseEnter={() => setOverFilterCard(true)}
        onMouseLeave={() => setOverFilterCard(false)}
      >
        {/* Metric tabs */}
        <div className="border-b border-slate-200 p-2 flex flex-wrap gap-1">
          {METRICS.map(({ key, abbr }) => {
            const isActive = activeMetrics.includes(key);
            return (
              <button
                key={key}
                onClick={() => handleMetricClick(key)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isActive ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {abbr}
              </button>
            );
          })}
        </div>

        {/* Composite weight controls */}
        {isComposite && (
          <div className="border-b border-slate-200">
            <button
              onClick={() => setShowWeights(!showWeights)}
              className="w-full px-3 py-2 text-xs text-left flex items-center justify-between text-cyan-700 font-medium hover:bg-cyan-50 transition-colors"
            >
              <span>Weights</span>
              <span className="text-slate-400">{showWeights ? "▲" : "▼"}</span>
            </button>

            {showWeights && (
              <div className="px-3 pb-3 space-y-2.5">
                {activeMetrics.map((m) => {
                  const metric = METRICS.find((x) => x.key === m);
                  if (!metric) return null;
                  const w = weights[m] ?? 20;
                  const pct = totalWeight > 0 ? Math.round((w / totalWeight) * 100) : 0;
                  return (
                    <div key={m}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-600">{metric.abbr}</span>
                        <span className="text-xs font-medium text-cyan-700">{pct}%</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={w}
                        onChange={(e) =>
                          setWeights((prev) => ({ ...prev, [m]: Number(e.target.value) }))
                        }
                        className="w-full h-1.5 accent-cyan-600"
                      />
                    </div>
                  );
                })}
                <button
                  onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Reset defaults
                </button>
              </div>
            )}
          </div>
        )}

        {/* Score band legend */}
        <div className="px-3 py-2.5 text-xs space-y-1.5">
          <p className="font-semibold text-slate-600 mb-1.5">Bands</p>
          {[
            { label: "A (80–100)", color: "bg-cyan-500", band: "A" },
            { label: "B (65–79)", color: "bg-green-500", band: "B" },
            { label: "C (50–64)", color: "bg-amber-400", band: "C" },
            { label: "D (35–49)", color: "bg-orange-500", band: "D" },
            { label: "F (0–34)",  color: "bg-red-500",   band: "F" },
          ].map(({ label, color, band }) => (
            <button
              key={band}
              onClick={() => onBandChange(activeBand === band ? null : band)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                activeBand === band ? "bg-slate-100" : "hover:bg-slate-50"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
              <span className={activeBand === band ? "text-slate-900 font-medium" : "text-slate-500"}>
                {label}
              </span>
              {activeBand === band && <span className="ml-auto text-cyan-600">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}