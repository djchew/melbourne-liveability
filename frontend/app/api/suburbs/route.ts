import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface BackendSuburbData {
  suburb_id: number;
  name: string;
  score_total: number | null;
  score_crime: number | null;
  score_transport: number | null;
  score_schools: number | null;
  score_greenspace: number | null;
  score_affordability: number | null;
  latitude?: number;
  longitude?: number;
}

interface AnalyticsSuburbData {
  name: string;
  score_total: number;
  rate_per_100k: number | null;
  stop_count: number | null;
  avg_icsea_score: number | null;
  green_pct_of_suburb: number | null;
  median_house_price: number | null;
}

export async function GET(request: NextRequest) {
  try {
    // Fetch from Python backend geojson endpoint (includes all score components)
    const response = await fetch(`${BACKEND_URL}/suburbs/geojson`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Backend error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch suburbs from backend' },
        { status: response.status }
      );
    }

    const geojsonData = await response.json();

    // Extract suburbs from GeoJSON features
    const transformedData: AnalyticsSuburbData[] = geojsonData.features
      .map((feature: any) => {
        const props = feature.properties;

        // Denormalize scores back to approximate raw metric values
        // These are educated estimates based on typical value ranges

        // Crime rate: scores inversely, typical range 0-3000 per 100k
        const rate_per_100k = props.score_crime != null
          ? (100 - props.score_crime) * 30
          : null;

        // Transport stops: scores normally, typical range 0-200 stops
        const stop_count = props.score_transport != null
          ? Math.round((props.score_transport / 100) * 200)
          : null;

        // School ICSEA: scores normally, typical range 900-1200
        const avg_icsea_score = props.score_schools != null
          ? 900 + (props.score_schools / 100) * 300
          : null;

        // Green space %: scores normally, typical range 0-100%
        const green_pct_of_suburb = props.score_greenspace != null
          ? (props.score_greenspace / 100) * 100
          : null;

        // House price: scores inversely, typical range $300k-$2M
        const median_house_price = props.score_affordability != null
          ? 2000000 - (props.score_affordability / 100) * 1700000
          : null;

        return {
          name: props.name,
          score_total: props.score_total || 0,
          rate_per_100k,
          stop_count,
          avg_icsea_score,
          green_pct_of_suburb,
          median_house_price,
        };
      })
      .filter((s) => s.name);

    // No caching to ensure fresh data
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
