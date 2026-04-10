import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface SuburbScore {
  name: string;
  score_total: number;
  score_crime: number | null;
  score_transport: number | null;
  score_schools: number | null;
  score_greenspace: number | null;
  score_affordability: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/suburbs/geojson`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch suburbs from backend' },
        { status: response.status }
      );
    }

    const geojsonData = await response.json();

    // Extract suburbs from GeoJSON features and return scores directly
    const transformedData: SuburbScore[] = geojsonData.features
      .map((feature: any) => ({
        name: feature.properties.name,
        score_total: feature.properties.score_total || 0,
        score_crime: feature.properties.score_crime || null,
        score_transport: feature.properties.score_transport || null,
        score_schools: feature.properties.score_schools || null,
        score_greenspace: feature.properties.score_greenspace || null,
        score_affordability: feature.properties.score_affordability || null,
      }))
      .filter((s: SuburbScore) => s.name);

    return NextResponse.json(transformedData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
