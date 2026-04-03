"use client";

import { useEffect, useState, useCallback } from "react";
import MapGL, { NavigationControl } from "react-map-gl/maplibre";
import { ScatterplotLayer } from "@deck.gl/layers";
import { DeckGL } from "@deck.gl/react";
import { getSuburbs, getSuburb, scoreToColor, SuburbSummary, SuburbScore } from "@/lib/api";
import "maplibre-gl/dist/maplibre-gl.css";

const INITIAL_VIEW = {
  longitude: 144.9631,
  latitude: -37.8136,
  zoom: 10.5,
  pitch: 0,
  bearing: 0,
};

// Smooth dark style with clear labels
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface Props {
  onSuburbSelect: (suburb: SuburbScore) => void;
}

export default function SuburbMap({ onSuburbSelect }: Props) {
  const [suburbs, setSuburbs] = useState<SuburbSummary[]>([]);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    suburb: SuburbSummary;
  } | null>(null);

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
    new ScatterplotLayer<SuburbSummary>({
      id: "suburbs",
      data: suburbs.filter((s) => s.latitude && s.longitude),
      getPosition: (d) => [d.longitude!, d.latitude!],
      getRadius: 500,
      radiusMinPixels: 5,
      radiusMaxPixels: 18,
      getFillColor: (d) => scoreToColor(d.score_total),
      getLineColor: [255, 255, 255, 50],
      lineWidthMinPixels: 1,
      stroked: true,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 80],
      onClick: (info) => info.object && handleClick(info),
      onHover: (info) => {
        if (info.object) {
          setTooltip({ x: info.x, y: info.y, suburb: info.object });
        } else {
          setTooltip(null);
        }
      },
    }),
  ];

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW}
      controller
      layers={layers}
      getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
    >
      <MapGL
        mapStyle={MAP_STYLE}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
      </MapGL>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 bg-surface-card/95 backdrop-blur border border-surface-border rounded-lg px-3 py-2 shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 12 }}
        >
          <p className="text-sm font-semibold text-white">
            {tooltip.suburb.name.replace(/ \(Vic\.\)/, "")}
          </p>
          <p className="text-xs text-slate-400">
            Score:{" "}
            <span className="text-slate-200 font-medium">
              {tooltip.suburb.score_total?.toFixed(1) ?? "—"}
            </span>
          </p>
        </div>
      )}

      {/* Score legend */}
      <div className="absolute bottom-6 left-6 bg-surface-card/90 backdrop-blur border border-surface-border rounded-xl p-4 text-xs space-y-1.5">
        <p className="font-semibold text-slate-300 mb-2">Liveability score</p>
        {[
          ["80–100", "bg-cyan-400"],
          ["65–79", "bg-green-500"],
          ["50–64", "bg-yellow-400"],
          ["35–49", "bg-orange-500"],
          ["0–34", "bg-red-500"],
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
