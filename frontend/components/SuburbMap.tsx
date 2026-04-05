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

// Google Maps-like style with clear labels
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const METRICS = [
  { key: "score_total", label: "Total", abbr: "Total" },
  { key: "score_crime", label: "Safety", abbr: "Safety" },
  { key: "score_transport", label: "Transport", abbr: "Transit" },
  { key: "score_schools", label: "Schools", abbr: "Schools" },
  { key: "score_greenspace", label: "Green space", abbr: "Green" },
  { key: "score_affordability", label: "Affordability", abbr: "Price" },
];

interface Props {
  onSuburbSelect: (suburb: SuburbScore) => void;
  activeMetric: string;
  activeBand: string | null;
  onMetricChange: (metric: string) => void;
  onBandChange: (band: string | null) => void;
}

export default function SuburbMap({
  onSuburbSelect,
  activeMetric,
  activeBand,
  onMetricChange,
  onBandChange,
}: Props) {
  const [geojson, setGeojson] = useState<{ type: string; features: any[] } | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    score: number | null;
  } | null>(null);
  const [cursor, setCursor] = useState("grab");
  // ID of the first symbol (label) layer in the basemap — our fills render below it
  const [firstLabelId, setFirstLabelId] = useState<string | undefined>(undefined);

  // Build dynamic color expression based on activeMetric
  const colorExpr = useMemo(() => {
    const metricKey = activeMetric;
    const expr: any = [
      "case",
      ["==", ["get", metricKey], null],
      "#475569",
      [">=", ["get", metricKey], 80],
      "#06b6d4",
      [">=", ["get", metricKey], 65],
      "#22c55e",
      [">=", ["get", metricKey], 50],
      "#eab308",
      [">=", ["get", metricKey], 35],
      "#f97316",
      "#ef4444",
    ];
    return expr;
  }, [activeMetric]);

  // Build dynamic opacity expression for band filtering
  const opacityExpr: any = useMemo(() => {
    if (!activeBand) return 0.4;
    const metricKey = activeMetric;
    const bandRanges: { [key: string]: [number, number] } = {
      "A": [80, 100],
      "B": [65, 79],
      "C": [50, 64],
      "D": [35, 49],
      "F": [0, 34],
    };
    const [min, max] = bandRanges[activeBand] || [0, 100];
    return [
      "case",
      [
        "&&",
        [">=", ["get", metricKey], min],
        ["<=", ["get", metricKey], max],
      ],
      0.5,
      0.15,
    ];
  }, [activeBand, activeMetric]);

  useEffect(() => {
    fetch("/api/suburbs/geojson")
      .then((r) => r.json())
      .then(setGeojson)
      .catch(console.error);
  }, []);

  const handleClick = useCallback(
    async (e: any) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const suburb_id = feature.properties?.suburb_id;
      if (!suburb_id) return;
      const detail = await getSuburb(suburb_id);
      onSuburbSelect(detail);
    },
    [onSuburbSelect]
  );

  const handleMapLoad = useCallback((e: any) => {
    const map = e.target;
    const firstSymbol = map.getStyle().layers.find((l: any) => l.type === "symbol");
    if (firstSymbol) setFirstLabelId(firstSymbol.id);
  }, []);

  const handleMouseMove = useCallback((e: any) => {
    const feature = e.features?.[0];
    if (feature) {
      setCursor("pointer");
      setTooltip({
        x: e.point.x,
        y: e.point.y,
        name: (feature.properties?.name ?? "").replace(/ \(Vic\.\)/, ""),
        score: feature.properties?.score_total ?? null,
      });
    } else {
      setCursor("grab");
      setTooltip(null);
    }
  }, []);

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

        {geojson && (
          <Source id="suburbs-geo" type="geojson" data={geojson}>
            <Layer
              id="suburb-fills"
              type="fill"
              beforeId={firstLabelId}
              paint={{
                "fill-color": colorExpr,
                "fill-opacity": opacityExpr,
              }}
            />
            <Layer
              id="suburb-borders"
              type="line"
              beforeId={firstLabelId}
              paint={{
                "line-color": "#94a3b8",
                "line-width": 0.8,
                "line-opacity": 0.6,
              }}
            />
          </Source>
        )}
      </MapGL>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 12 }}
        >
          <p className="text-sm font-semibold text-slate-900">{tooltip.name}</p>
          <p className="text-xs text-slate-500">
            Score:{" "}
            <span className="text-slate-700 font-medium">
              {tooltip.score != null ? Number(tooltip.score).toFixed(1) : "—"}
            </span>
          </p>
        </div>
      )}

      {/* Controls and legend */}
      <div className="absolute bottom-6 left-6 bg-white/95 border border-slate-200 rounded-xl shadow-md overflow-hidden">
        {/* Metric tabs */}
        <div className="border-b border-slate-200 p-2 flex flex-wrap gap-1">
          {METRICS.map(({ key, abbr }) => (
            <button
              key={key}
              onClick={() => onMetricChange(key)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                activeMetric === key
                  ? "bg-cyan-100 text-cyan-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {abbr}
            </button>
          ))}
        </div>

        {/* Score band legend */}
        <div className="px-3 py-2.5 text-xs space-y-1.5">
          <p className="font-semibold text-slate-600 mb-1.5">Bands</p>
          {[
            { label: "A (80–100)", color: "bg-cyan-500", band: "A" },
            { label: "B (65–79)", color: "bg-green-500", band: "B" },
            { label: "C (50–64)", color: "bg-amber-400", band: "C" },
            { label: "D (35–49)", color: "bg-orange-500", band: "D" },
            { label: "F (0–34)", color: "bg-red-500", band: "F" },
          ].map(({ label, color, band }) => (
            <button
              key={band}
              onClick={() => onBandChange(activeBand === band ? null : band)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                activeBand === band
                  ? "bg-slate-100"
                  : "hover:bg-slate-50"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
              <span className={activeBand === band ? "text-slate-900 font-medium" : "text-slate-500"}>
                {label}
              </span>
              {activeBand === band && (
                <span className="ml-auto text-cyan-600">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
