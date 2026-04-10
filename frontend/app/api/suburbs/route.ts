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
    const response = await fetch(`${BACKEND_URL}/suburbs/`, {
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

    const data = await response.json();

    // Return data as-is with placeholder null values for metric fields
    const transformedData = data.map((suburb: any) => ({
      name: suburb.name,
      score_total: suburb.score_total || 0,
      rate_per_100k: null,
      stop_count: null,
      avg_icsea_score: null,
      green_pct_of_suburb: null,
      median_house_price: null,
    }));

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
