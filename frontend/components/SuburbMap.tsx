"use client";

import { useEffect, useState, useCallback } from "react";
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

// MapLibre expression: colour each polygon by its score_total value
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCORE_COLOR_EXPR: any = [
  "case",
  ["==", ["get", "score_total"], null], "#475569",
  [">=", ["get", "score_total"], 80], "#06b6d4",
  [">=", ["get", "score_total"], 65], "#22c55e",
  [">=", ["get", "score_total"], 50], "#eab308",
  [">=", ["get", "score_total"], 35], "#f97316",
  "#ef4444",
];

interface Props {
  onSuburbSelect: (suburb: SuburbScore) => void;
}

export default function SuburbMap({ onSuburbSelect }: Props) {
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
                "fill-color": SCORE_COLOR_EXPR,
                "fill-opacity": 0.25,
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

      {/* Score legend */}
      <div className="absolute bottom-6 left-6 bg-white/95 border border-slate-200 rounded-xl px-3 py-2.5 text-xs shadow-md space-y-1.5">
        <p className="font-semibold text-slate-600 mb-1.5">Liveability</p>
        {[
          ["High (80–100)", "bg-cyan-500"],
          ["Good (65–79)",  "bg-green-500"],
          ["Mid  (50–64)",  "bg-amber-400"],
          ["Low  (35–49)",  "bg-orange-500"],
          ["Poor (0–34)",   "bg-red-500"],
        ].map(([label, cls]) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
            <span className="text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
