"""
Crime data ingestion — Crime Statistics Agency Victoria
Source: https://www.crimestatistics.vic.gov.au/crime-statistics/latest-victorian-crime-data/download-data
File: Data_Tables_LGA_Recorded_Offences_Year_Ending_December_2025.xlsx

Uses two sheets:
  - Table 01: LGA-level total offence count + rate per 100k (for scoring)
  - Table 03: Suburb-level offence counts by offence type (for detail)
"""
import pandas as pd
from base import get_db_connection, inbound_path, processed_path

CRIME_FILE = "Data_Tables_LGA_Recorded_Offences_Year_Ending_December_2025.xlsx"


def load_lga_totals() -> pd.DataFrame:
    """Load LGA-level total offences + rate per 100k from Table 01."""
    path = inbound_path(CRIME_FILE)
    if not path.exists():
        raise FileNotFoundError(f"Expected crime data at {path}")

    df = pd.read_excel(path, sheet_name="Table 01")
    # Columns: Year, Year ending, Police Region, Local Government Area, Offence Count, Rate per 100,000 population
    df.columns = df.columns.str.strip()
    df["Local Government Area"] = df["Local Government Area"].str.strip()
    print(f"LGA totals loaded: {len(df)} rows")
    print(f"Sample LGAs: {df['Local Government Area'].head(10).tolist()}")
    return df


def load_suburb_offences() -> pd.DataFrame:
    """Load suburb-level offence counts from Table 03."""
    path = inbound_path(CRIME_FILE)
    df = pd.read_excel(path, sheet_name="Table 03")
    df.columns = df.columns.str.strip()
    df["Suburb/Town Name"] = df["Suburb/Town Name"].str.strip()
    df["Local Government Area"] = df["Local Government Area"].str.strip()
    print(f"Suburb offences loaded: {len(df)} rows")
    return df


def aggregate_suburb_crimes(df: pd.DataFrame) -> pd.DataFrame:
    """Sum all offence counts per suburb to get total offences per suburb."""
    grouped = df.groupby(["Local Government Area", "Suburb/Town Name", "Postcode"]).agg(
        offence_count=("Offence Count", "sum")
    ).reset_index()
    grouped.columns = ["lga", "suburb_name", "postcode", "offence_count"]
    grouped["suburb_name"] = grouped["suburb_name"].str.title()
    grouped["lga"] = grouped["lga"].str.strip()
    print(f"Aggregated to {len(grouped)} suburb totals")
    return grouped


def load_to_db(suburb_crimes: pd.DataFrame, lga_totals: pd.DataFrame):
    """Insert crime stats into the database, matching suburbs by name."""
    conn = get_db_connection()
    cur = conn.cursor()

    # Build LGA rate lookup: LGA name -> rate per 100k
    lga_rates = {}
    for _, row in lga_totals.iterrows():
        lga_name = row["Local Government Area"].strip()
        lga_rates[lga_name.lower()] = row["Rate per 100,000 population"]

    loaded = 0
    for _, row in suburb_crimes.iterrows():
        # Get rate from the LGA this suburb belongs to
        lga_key = row["lga"].lower()
        rate = lga_rates.get(lga_key)

        cur.execute(
            """
            INSERT INTO crime_stats (suburb_id, year, offence_count, rate_per_100k)
            SELECT s.id, %s, %s, %s
            FROM suburbs s
            WHERE LOWER(REPLACE(s.name, ' (Vic.)', '')) = LOWER(%s)
            LIMIT 1
            """,
            (2025, int(row["offence_count"]), rate, row["suburb_name"]),
        )
        if cur.rowcount > 0:
            loaded += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded crime data for {loaded}/{len(suburb_crimes)} suburbs.")


if __name__ == "__main__":
    lga_totals = load_lga_totals()
    suburb_df = load_suburb_offences()
    suburb_crimes = aggregate_suburb_crimes(suburb_df)

    # Save processed data
    suburb_crimes.to_csv(processed_path("crime_stats_clean.csv"), index=False)

    load_to_db(suburb_crimes, lga_totals)
