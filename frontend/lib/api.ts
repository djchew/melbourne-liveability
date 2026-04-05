const BASE = "/api";

export interface SuburbSummary {
  suburb_id: number;
  name: string;
  score_total: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface SuburbScore extends SuburbSummary {
  score_crime: number | null;
  score_transport: number | null;
  score_schools: number | null;
  score_greenspace: number | null;
  score_affordability: number | null;
  geometry: string | null;
  description: string | null;
}

export async function getSuburbs(): Promise<SuburbSummary[]> {
  const res = await fetch(`${BASE}/suburbs/`);
  if (!res.ok) throw new Error("Failed to fetch suburbs");
  return res.json();
}

export async function getSuburb(id: number): Promise<SuburbScore> {
  const res = await fetch(`${BASE}/suburbs/${id}`);
  if (!res.ok) throw new Error("Failed to fetch suburb");
  return res.json();
}

/** Map a 0–100 score to a hex colour for the choropleth. */
export function scoreToColor(score: number | null): [number, number, number, number] {
  if (score === null) return [71, 85, 105, 180]; // slate-600, semi-transparent
  if (score >= 80) return [6, 182, 212, 200];    // cyan
  if (score >= 65) return [34, 197, 94, 200];    // green
  if (score >= 50) return [234, 179, 8, 200];    // yellow
  if (score >= 35) return [249, 115, 22, 200];   // orange
  return [239, 68, 68, 200];                      // red
}
