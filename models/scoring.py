"""
Liveability scoring model.
Reads cleaned data from the DB, computes a composite score per suburb,
and writes results to the liveability_scores table.

Weights (must sum to 1.0):
  - Safety (crime)      25%
  - Transport           25%
  - Schools             20%
  - Green space         15%
  - Affordability       15%
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from ingestion.base import get_db_connection

WEIGHTS = {
    "score_crime": 0.25,
    "score_transport": 0.25,
    "score_schools": 0.20,
    "score_greenspace": 0.15,
    "score_affordability": 0.15,
}


def fetch_raw_metrics() -> pd.DataFrame:
    """Pull the latest metrics for all suburbs into a single DataFrame."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            s.id AS suburb_id,
            s.name,
            cs.offence_count,
            cs.rate_per_100k,
            ts.stop_count,
            ts.nearest_train_km,
            ts.nearest_tram_km,
            ts.nearest_bus_km,
            ss.avg_icsea_score,
            ss.school_count,
            gs.green_pct_of_suburb,
            gs.park_count,
            gs.nearest_park_km,
            pp.median_house_price
        FROM suburbs s
        LEFT JOIN crime_stats cs ON cs.suburb_id = s.id
        LEFT JOIN transport_scores ts ON ts.suburb_id = s.id
        LEFT JOIN school_scores ss ON ss.suburb_id = s.id
        LEFT JOIN greenspace_scores gs ON gs.suburb_id = s.id
        LEFT JOIN property_prices pp ON pp.suburb_id = s.id
    """)
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    cur.close()
    conn.close()

    df = pd.DataFrame(rows, columns=columns)
    print(f"Fetched metrics for {len(df)} suburbs")
    print(f"Data coverage:")
    print(f"  Crime:     {df['rate_per_100k'].notna().sum()}/{len(df)}")
    print(f"  Transport: {df['stop_count'].notna().sum()}/{len(df)}")
    print(f"  Schools:   {df['avg_icsea_score'].notna().sum()}/{len(df)}")
    print(f"  Green:     {df['green_pct_of_suburb'].notna().sum()}/{len(df)}")
    print(f"  Property:  {df['median_house_price'].notna().sum()}/{len(df)}")
    return df


def compute_scores(df: pd.DataFrame) -> pd.DataFrame:
    """Normalise raw metrics to 0–100 scores and compute weighted total."""
    scaler = MinMaxScaler(feature_range=(0, 100))

    # Crime: invert so lower crime = higher score. Fill missing with median.
    crime = df[["rate_per_100k"]].copy()
    crime = crime.fillna(crime.median())
    df["score_crime"] = 100 - scaler.fit_transform(crime)

    # Transport: composite of stop count + proximity to train/tram/bus
    # Invert distances (closer = better), then combine with stop count
    transport = df[["stop_count", "nearest_train_km", "nearest_tram_km", "nearest_bus_km"]].copy()
    transport = transport.fillna({"stop_count": 0, "nearest_train_km": 50, "nearest_tram_km": 50, "nearest_bus_km": 50})
    # Invert distances: max distance - actual distance
    for col in ["nearest_train_km", "nearest_tram_km", "nearest_bus_km"]:
        transport[col] = transport[col].max() - transport[col]
    # Normalise each component then average
    for col in transport.columns:
        transport[col] = scaler.fit_transform(transport[[col]])
    df["score_transport"] = transport.mean(axis=1)

    # Schools: higher ICSEA = higher score. Fill missing with median.
    schools = df[["avg_icsea_score"]].copy()
    schools = schools.fillna(schools.median())
    df["score_schools"] = scaler.fit_transform(schools)

    # Green space: higher green % = higher score
    green = df[["green_pct_of_suburb"]].copy()
    green = green.fillna(0)
    df["score_greenspace"] = scaler.fit_transform(green)

    # Affordability: invert so lower price = higher score. Fill missing with median.
    price = df[["median_house_price"]].copy()
    price = price.fillna(price.median())
    df["score_affordability"] = 100 - scaler.fit_transform(price)

    # Weighted composite
    df["score_total"] = sum(df[col] * weight for col, weight in WEIGHTS.items())

    return df


def save_scores(df: pd.DataFrame):
    """Upsert computed scores into liveability_scores."""
    conn = get_db_connection()
    cur = conn.cursor()
    for _, row in df.iterrows():
        cur.execute(
            """
            INSERT INTO liveability_scores
                (suburb_id, score_crime, score_transport, score_schools, score_greenspace, score_affordability, score_total)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (suburb_id) DO UPDATE SET
                score_crime = EXCLUDED.score_crime,
                score_transport = EXCLUDED.score_transport,
                score_schools = EXCLUDED.score_schools,
                score_greenspace = EXCLUDED.score_greenspace,
                score_affordability = EXCLUDED.score_affordability,
                score_total = EXCLUDED.score_total,
                computed_at = NOW()
            """,
            (
                int(row["suburb_id"]),
                round(float(row["score_crime"]), 2),
                round(float(row["score_transport"]), 2),
                round(float(row["score_schools"]), 2),
                round(float(row["score_greenspace"]), 2),
                round(float(row["score_affordability"]), 2),
                round(float(row["score_total"]), 2),
            ),
        )
    conn.commit()
    cur.close()
    conn.close()
    print(f"Saved liveability scores for {len(df)} suburbs.")


if __name__ == "__main__":
    df = fetch_raw_metrics()
    df = compute_scores(df)
    save_scores(df)
    print("\nTop 20 most liveable suburbs:")
    print(df[["name", "score_total", "score_crime", "score_transport", "score_schools", "score_greenspace", "score_affordability"]]
          .sort_values("score_total", ascending=False)
          .head(20)
          .to_string(index=False))
    print("\nBottom 10:")
    print(df[["name", "score_total"]].sort_values("score_total").head(10).to_string(index=False))
