"""
Crime data ingestion — Crime Statistics Agency Victoria
Source: https://www.crimestatistics.vic.gov.au/crime-statistics/latest-victorian-crime-data/download-data
Download: LGA or suburb-level offence data (Excel/CSV)
"""
import pandas as pd
from base import get_db_connection, inbound_path, processed_path


def load_raw() -> pd.DataFrame:
    """Load raw crime CSV downloaded from data.vic.gov.au."""
    path = inbound_path("crime_stats.csv")
    if not path.exists():
        raise FileNotFoundError(
            f"Expected crime data at {path}\n"
            "Download from: https://www.crimestatistics.vic.gov.au"
        )
    return pd.read_csv(path)


def transform(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and normalise raw crime data."""
    # TODO: adapt column names to match actual download format
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    df = df.rename(columns={
        "suburb_town": "suburb_name",
        "offence_count": "offence_count",
        "year": "year",
    })
    df = df[["suburb_name", "year", "offence_count"]].dropna()
    df["suburb_name"] = df["suburb_name"].str.strip().str.title()
    return df


def load_to_db(df: pd.DataFrame):
    """Upsert crime stats into the database."""
    conn = get_db_connection()
    cur = conn.cursor()
    for _, row in df.iterrows():
        cur.execute(
            """
            INSERT INTO crime_stats (suburb_id, year, offence_count)
            SELECT s.id, %s, %s
            FROM suburbs s WHERE LOWER(s.name) = LOWER(%s)
            ON CONFLICT DO NOTHING
            """,
            (row["year"], row["offence_count"], row["suburb_name"]),
        )
    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded {len(df)} crime records.")


if __name__ == "__main__":
    df = load_raw()
    df = transform(df)
    df.to_csv(processed_path("crime_stats_clean.csv"), index=False)
    load_to_db(df)
