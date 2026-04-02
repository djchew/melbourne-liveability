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
from sklearn.preprocessing import MinMaxScaler
from ingestion.base import get_db_connection

WEIGHTS = {
    "score_crime": 0.25,
    "score_transport": 0.25,
    "score_schools": 0.20,
    "score_greenspace": 0.15,
    "score_affordability": 0.15,
}


def fetch_raw_metrics(conn) -> pd.DataFrame:
    """Pull the latest metrics for all suburbs into a single DataFrame."""
    query = """
        SELECT
            s.id AS suburb_id,
            s.name,
            cs.rate_per_100k,
            ts.stop_count,
            ts.services_per_day,
            ss.avg_icsea_score,
            gs.green_pct_of_suburb,
            pp.median_house_price
        FROM suburbs s
        LEFT JOIN crime_stats cs ON cs.suburb_id = s.id
        LEFT JOIN transport_scores ts ON ts.suburb_id = s.id
        LEFT JOIN school_scores ss ON ss.suburb_id = s.id
        LEFT JOIN greenspace_scores gs ON gs.suburb_id = s.id
        LEFT JOIN property_prices pp ON pp.suburb_id = s.id
        WHERE cs.year = (SELECT MAX(year) FROM crime_stats)
          AND pp.year = (SELECT MAX(year) FROM property_prices)
    """
    return pd.read_sql(query, conn)


def compute_scores(df: pd.DataFrame) -> pd.DataFrame:
    """Normalise raw metrics to 0–100 scores and compute weighted total."""
    scaler = MinMaxScaler(feature_range=(0, 100))

    # Crime: invert so lower crime rate = higher score
    df["score_crime"] = 100 - scaler.fit_transform(df[["rate_per_100k"]])

    # Transport: more stops + services = higher score
    df["score_transport"] = scaler.fit_transform(
        df[["stop_count", "services_per_day"]].fillna(0).mean(axis=1).values.reshape(-1, 1)
    )

    # Schools: higher ICSEA = higher score
    df["score_schools"] = scaler.fit_transform(df[["avg_icsea_score"]].fillna(df["avg_icsea_score"].median()))

    # Green space: higher green % = higher score
    df["score_greenspace"] = scaler.fit_transform(df[["green_pct_of_suburb"]].fillna(0))

    # Affordability: invert so lower price = higher score
    df["score_affordability"] = 100 - scaler.fit_transform(df[["median_house_price"]].fillna(df["median_house_price"].median()))

    # Weighted composite
    df["score_total"] = sum(df[col] * weight for col, weight in WEIGHTS.items())

    return df


def save_scores(df: pd.DataFrame, conn):
    """Upsert computed scores into liveability_scores."""
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
                round(row["score_crime"], 2),
                round(row["score_transport"], 2),
                round(row["score_schools"], 2),
                round(row["score_greenspace"], 2),
                round(row["score_affordability"], 2),
                round(row["score_total"], 2),
            ),
        )
    conn.commit()
    cur.close()
    print(f"Saved liveability scores for {len(df)} suburbs.")


if __name__ == "__main__":
    conn = get_db_connection()
    df = fetch_raw_metrics(conn)
    df = compute_scores(df)
    save_scores(df, conn)
    conn.close()
    print(df[["name", "score_total"]].sort_values("score_total", ascending=False).head(20).to_string(index=False))
