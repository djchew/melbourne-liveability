"""
School data ingestion — ACARA My School / data.vic.gov.au
Source: https://www.acara.edu.au/contact-us/acara-data-access
Download: School profile CSV with ICSEA scores and locations
"""
import pandas as pd
from base import get_db_connection, inbound_path, processed_path


def load_raw() -> pd.DataFrame:
    path = inbound_path("schools.csv")
    if not path.exists():
        raise FileNotFoundError(
            f"Expected schools data at {path}\n"
            "Download from: https://www.acara.edu.au/contact-us/acara-data-access"
        )
    return pd.read_csv(path)


def transform(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate school metrics per suburb."""
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    # TODO: adapt to actual column names from ACARA download
    df = df.rename(columns={
        "suburb": "suburb_name",
        "icsea_value": "icsea_score",
        "school_type": "school_type",
    })
    df["suburb_name"] = df["suburb_name"].str.strip().str.title()
    grouped = df.groupby("suburb_name").agg(
        school_count=("icsea_score", "count"),
        avg_icsea_score=("icsea_score", "mean"),
        primary_count=("school_type", lambda x: (x.str.lower() == "primary").sum()),
        secondary_count=("school_type", lambda x: (x.str.lower() == "secondary").sum()),
    ).reset_index()
    return grouped


def load_to_db(df: pd.DataFrame):
    conn = get_db_connection()
    cur = conn.cursor()
    for _, row in df.iterrows():
        cur.execute(
            """
            INSERT INTO school_scores (suburb_id, school_count, avg_icsea_score, primary_count, secondary_count)
            SELECT s.id, %s, %s, %s, %s
            FROM suburbs s WHERE LOWER(s.name) = LOWER(%s)
            ON CONFLICT DO NOTHING
            """,
            (row["school_count"], row["avg_icsea_score"], row["primary_count"], row["secondary_count"], row["suburb_name"]),
        )
    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded school data for {len(df)} suburbs.")


if __name__ == "__main__":
    df = load_raw()
    df = transform(df)
    df.to_csv(processed_path("schools_clean.csv"), index=False)
    load_to_db(df)
