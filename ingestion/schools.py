"""
School data ingestion — ACARA My School
Source: https://www.acara.edu.au/contact-us/acara-data-access
Files: School Profile 2025.xlsx, School Location 2025.xlsx
"""
import pandas as pd
from base import get_db_connection, inbound_path, processed_path


def load_and_merge() -> pd.DataFrame:
    """Load school profile and location data, merge, and filter to Victoria."""
    profile_path = inbound_path("School Profile 2025.xlsx")
    location_path = inbound_path("School Location 2025.xlsx")

    if not profile_path.exists():
        raise FileNotFoundError(f"Expected school profile at {profile_path}")
    if not location_path.exists():
        raise FileNotFoundError(f"Expected school locations at {location_path}")

    print("Loading school profile...")
    profile = pd.read_excel(profile_path, sheet_name="SchoolProfile 2025")
    print("Loading school locations...")
    location = pd.read_excel(location_path, sheet_name="SchoolLocations 2025")

    # Merge on ACARA SML ID
    df = profile.merge(
        location[["ACARA SML ID", "Latitude", "Longitude", "Local Government Area Name"]],
        on="ACARA SML ID",
        how="left",
    )

    # Filter to Victoria only
    df = df[df["State"] == "VIC"].copy()
    print(f"Victorian schools: {len(df)}")

    return df


def transform(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate school metrics per suburb."""
    df["Suburb"] = df["Suburb"].str.strip().str.title()
    df["ICSEA"] = pd.to_numeric(df["ICSEA"], errors="coerce")

    # Classify school type
    df["is_primary"] = df["School Type"].str.lower().isin(["primary", "special"])
    df["is_secondary"] = df["School Type"].str.lower().isin(["secondary", "combined"])

    grouped = df.groupby("Suburb").agg(
        school_count=("ACARA SML ID", "count"),
        avg_icsea_score=("ICSEA", "mean"),
        primary_count=("is_primary", "sum"),
        secondary_count=("is_secondary", "sum"),
    ).reset_index()

    grouped["avg_icsea_score"] = grouped["avg_icsea_score"].round(1)
    grouped = grouped.rename(columns={"Suburb": "suburb_name"})

    print(f"Aggregated to {len(grouped)} suburbs with schools")
    print(f"ICSEA range: {grouped['avg_icsea_score'].min()} – {grouped['avg_icsea_score'].max()}")
    return grouped


def load_to_db(df: pd.DataFrame):
    conn = get_db_connection()
    cur = conn.cursor()
    loaded = 0
    for _, row in df.iterrows():
        cur.execute(
            """
            INSERT INTO school_scores (suburb_id, school_count, avg_icsea_score, primary_count, secondary_count)
            SELECT s.id, %s, %s, %s, %s
            FROM suburbs s
            WHERE LOWER(REPLACE(s.name, ' (Vic.)', '')) = LOWER(%s)
            LIMIT 1
            """,
            (
                int(row["school_count"]),
                float(row["avg_icsea_score"]) if pd.notna(row["avg_icsea_score"]) else None,
                int(row["primary_count"]),
                int(row["secondary_count"]),
                row["suburb_name"],
            ),
        )
        if cur.rowcount > 0:
            loaded += 1
    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded school data for {loaded}/{len(df)} suburbs.")


if __name__ == "__main__":
    df = load_and_merge()
    grouped = transform(df)
    grouped.to_csv(processed_path("schools_clean.csv"), index=False)
    load_to_db(grouped)
