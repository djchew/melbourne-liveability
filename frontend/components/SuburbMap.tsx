"use client";

import { useEffect, useState, useCallback } from "react";
import Map from "react-map-gl/maplibre";
import { GeoJsonLayer } from "@deck.gl/layers";
import { DeckGL } from "@deck.gl/react";
import { getSuburbs, getSuburb, scoreToColor, SuburbSummary, SuburbScore } from "@/lib/api";
import "maplibre-gl/dist/maplibre-gl.css";

const INITIAL_VIEW = {
  longitude: 144.9631,
  latitude: -37.8136,
  zoom: 10,
  pitch: 30,
  bearing: 0,
};

interface Props {
  onSuburbSelect: (suburb: SuburbScore) => void;
}

export default function SuburbMap({ onSuburbSelect }: Props) {
  const [suburbs, setSuburbs] = useState<SuburbSummary[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    getSuburbs().then(setSuburbs).catch(console.error);
  }, []);

  const handleClick = useCallback(
    async (info: { object?: SuburbSummary }) => {
      if (!info.object) return;
      const detail = await getSuburb(info.object.suburb_id);
      onSuburbSelect(detail);
    },
    [onSuburbSelect]
  );

  const layers = [
    new GeoJsonLayer({
      id: "suburbs",
      // GeoJSON is stored per-suburb in the DB; here we build a FeatureCollection
      data: suburbs
        .filter((s) => s.latitude && s.longitude)
        .map((s) => ({
          type: "Feature" as const,
          geometry: { type: "Point", coordinates: [s.longitude!, s.latitude!] },
          properties: s,
        })),
      pointRadiusMinPixels: 6,
      pointRadiusMaxPixels: 20,
      getPointRadius: 800,
      getFillColor: (f: { properties: SuburbSummary }) =>
        scoreToColor(f.properties.score_total),
      getLineColor: [255, 255, 255, 80],
      lineWidthMinPixels: 1,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 60],
      onClick: (info: { object?: { properties: SuburbSummary } }) =>
        info.object && handleClick({ object: info.object.properties }),
      onHover: (info: { object?: { properties: SuburbSummary } }) =>
        setHoveredId(info.object?.properties.suburb_id ?? null),
    }),
  ];

  return (
    <DeckGL initialViewState={INITIAL_VIEW} controller layers={layers}>
      <Map
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        attributionControl={false}
      />

      {/* Score legend */}
      <div className="absolute bottom-6 left-6 bg-surface-card/90 backdrop-blur border border-surface-border rounded-xl p-4 text-xs space-y-1.5">
        <p className="font-semibold text-slate-300 mb-2">Liveability score</p>
        {[
          ["80–100", "bg-cyan-400"],
          ["65–79", "bg-green-500"],
          ["50–64", "bg-yellow-400"],
          ["35–49", "bg-orange-500"],
          ["0–34",  "bg-red-500"],
        ].map(([label, cls]) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${cls}`} />
            <span className="text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </DeckGL>
  );
}
