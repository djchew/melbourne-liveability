"use client";

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { SuburbScore } from "@/lib/api";

interface Props {
  suburb: SuburbScore;
}

const CATEGORIES = [
  { key: "score_crime",        label: "Safety" },
  { key: "score_transport",    label: "Transport" },
  { key: "score_schools",      label: "Schools" },
  { key: "score_greenspace",   label: "Green Space" },
  { key: "score_affordability",label: "Affordability" },
] as const;

export default function ScoreBreakdown({ suburb }: Props) {
  const data = CATEGORIES.map(({ key, label }) => ({
    subject: label,
    value: suburb[key] ?? 0,
    fullMark: 100,
  }));

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <PolarGrid stroke="#cbd5e1" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={suburb.name}
            dataKey="value"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }}
            labelStyle={{ color: "#0f172a", fontWeight: 600 }}
            itemStyle={{ color: "#475569" }}
            formatter={(v: number) => [v.toFixed(1), "Score"]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
