"""
Property price ingestion — Victorian Property Sales Report
Source: https://discover.data.vic.gov.au/dataset/victorian-property-sales-report-median-house-by-suburb
File: median-house-q2-2025.xls
"""
import pandas as pd
from base import get_db_connection, inbound_path, processed_path

PROPERTY_FILE = "median-house-q2-2025.xls"


def load_raw() -> pd.DataFrame:
    """Load the messy Excel file and extract suburb + latest median price."""
    path = inbound_path(PROPERTY_FILE)
    if not path.exists():
        raise FileNotFoundError(f"Expected property data at {path}")

    df = pd.read_excel(path, sheet_name="Sheet1", header=None)

    # The header rows are messy (merged cells). The actual data starts after
    # rows with NaN in column 0. Find the first row with a suburb name.
    # Suburb names are uppercase strings in column 0.
    data_rows = []
    for i, row in df.iterrows():
        val = row[0]
        if isinstance(val, str) and val.strip().isupper() and val.strip() not in ("", "LOCALITY"):
            data_rows.append(i)

    if not data_rows:
        raise ValueError("Could not find data rows in property spreadsheet")

    # Slice to data rows only
    data = df.iloc[data_rows].copy()

    # Based on inspection:
    # Col 0: Locality (suburb name)
    # Col 9: Apr-Jun 2025 median price (most recent quarter)
    # Col 7: Jan-Mar 2025 median price
    # Col 11: No. of Sales (most recent quarter)
    data = data[[0, 7, 9, 11]].copy()
    data.columns = ["suburb_name", "median_prev_quarter", "median_house_price", "num_sales"]

    # Clean suburb names
    data["suburb_name"] = data["suburb_name"].str.strip().str.title()

    # Convert prices to numeric (some cells have '^' or other markers)
    data["median_house_price"] = pd.to_numeric(data["median_house_price"], errors="coerce")
    data["median_prev_quarter"] = pd.to_numeric(data["median_prev_quarter"], errors="coerce")
    data["num_sales"] = pd.to_numeric(data["num_sales"], errors="coerce")

    # Drop rows with no price data
    data = data.dropna(subset=["median_house_price"])

    print(f"Loaded {len(data)} suburbs with property data")
    print(f"Price range: ${data['median_house_price'].min():,.0f} – ${data['median_house_price'].max():,.0f}")
    return data


def load_to_db(df: pd.DataFrame):
    conn = get_db_connection()
    cur = conn.cursor()
    loaded = 0
    for _, row in df.iterrows():
        cur.execute(
            """
            INSERT INTO property_prices (suburb_id, year, median_house_price, median_unit_price)
            SELECT s.id, %s, %s, NULL
            FROM suburbs s
            WHERE LOWER(REPLACE(s.name, ' (Vic.)', '')) = LOWER(%s)
            LIMIT 1
            """,
            (2025, int(row["median_house_price"]), row["suburb_name"]),
        )
        if cur.rowcount > 0:
            loaded += 1
    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded property data for {loaded}/{len(df)} suburbs.")


if __name__ == "__main__":
    df = load_raw()
    df.to_csv(processed_path("property_prices_clean.csv"), index=False)
    load_to_db(df)
