"""
Property price ingestion — DFFH Housing Dataset / data.vic.gov.au
Source: https://www.dffh.vic.gov.au/housing-data-and-research
Download: Median house/unit prices by suburb CSV
"""
import pandas as pd
from base import get_db_connection, inbound_path, processed_path


def load_raw() -> pd.DataFrame:
    path = inbound_path("property_prices.csv")
    if not path.exists():
        raise FileNotFoundError(
            f"Expected property data at {path}\n"
            "Download from: https://www.dffh.vic.gov.au/housing-data-and-research"
        )
    return pd.read_csv(path)


def transform(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and normalise property price data."""
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    # TODO: adapt column names to actual download format
    df = df.rename(columns={
        "suburb": "suburb_name",
        "median_house_price": "median_house_price",
        "median_unit_price": "median_unit_price",
        "year": "year",
    })
    df["suburb_name"] = df["suburb_name"].str.strip().str.title()
    df["median_house_price"] = pd.to_numeric(df["median_house_price"], errors="coerce")
    df["median_unit_price"] = pd.to_numeric(df["median_unit_price"], errors="coerce")
    return df.dropna(subset=["suburb_name", "year"])


def load_to_db(df: pd.DataFrame):
    conn = get_db_connection()
    cur = conn.cursor()
    for _, row in df.iterrows():
        cur.execute(
            """
            INSERT INTO property_prices (suburb_id, year, median_house_price, median_unit_price)
            SELECT s.id, %s, %s, %s
            FROM suburbs s WHERE LOWER(s.name) = LOWER(%s)
            ON CONFLICT DO NOTHING
            """,
            (row["year"], row.get("median_house_price"), row.get("median_unit_price"), row["suburb_name"]),
        )
    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded {len(df)} property price records.")


if __name__ == "__main__":
    df = load_raw()
    df = transform(df)
    df.to_csv(processed_path("property_prices_clean.csv"), index=False)
    load_to_db(df)
