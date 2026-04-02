"""
Public transport ingestion — PTV GTFS feeds
Source: https://discover.data.vic.gov.au/dataset/gtfs-schedule
Files: data/inbound/1/google_transit.zip (train)
       data/inbound/2/google_transit.zip (metro bus)
       data/inbound/3/google_transit.zip (tram)

Spatial joins stops to suburb boundaries to compute per-suburb transport metrics.
"""
import zipfile
import io
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from base import get_db_connection, inbound_path, processed_path

# GTFS feeds: folder -> transport mode
FEEDS = {
    "1": "train",
    "2": "bus",
    "3": "tram",
}


def load_stops_from_feed(folder: str, mode: str) -> pd.DataFrame:
    """Extract stops from a GTFS google_transit.zip."""
    zip_path = inbound_path(folder) / "google_transit.zip"
    if not zip_path.exists():
        print(f"WARNING: {zip_path} not found, skipping {mode}")
        return pd.DataFrame()

    with zipfile.ZipFile(zip_path) as z:
        with z.open("stops.txt") as f:
            df = pd.read_csv(io.TextIOWrapper(f, encoding="utf-8-sig"))

    df.columns = df.columns.str.strip()
    df = df[["stop_id", "stop_name", "stop_lat", "stop_lon"]].dropna()
    df["mode"] = mode
    print(f"  {mode}: {len(df)} stops")
    return df


def load_all_stops() -> pd.DataFrame:
    """Load and combine stops from all GTFS feeds."""
    print("Loading GTFS stops...")
    frames = []
    for folder, mode in FEEDS.items():
        df = load_stops_from_feed(folder, mode)
        if not df.empty:
            frames.append(df)
    all_stops = pd.concat(frames, ignore_index=True)
    print(f"Total stops loaded: {len(all_stops)}")
    return all_stops


def load_suburb_boundaries() -> gpd.GeoDataFrame:
    """Load suburb boundaries from the database."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, geometry FROM suburbs WHERE geometry IS NOT NULL")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    import json
    from shapely.geometry import shape

    records = []
    for row in rows:
        try:
            geom = shape(json.loads(row[2]))
            records.append({"suburb_id": row[0], "name": row[1], "geometry": geom})
        except Exception:
            continue

    gdf = gpd.GeoDataFrame(records, geometry="geometry", crs="EPSG:4326")
    print(f"Loaded {len(gdf)} suburb boundaries from DB")
    return gdf


def compute_transport_scores(stops: pd.DataFrame, suburbs: gpd.GeoDataFrame) -> pd.DataFrame:
    """Spatial join stops to suburbs and compute per-suburb transport metrics."""
    # Convert stops to GeoDataFrame
    stops_gdf = gpd.GeoDataFrame(
        stops,
        geometry=[Point(lon, lat) for lon, lat in zip(stops["stop_lon"], stops["stop_lat"])],
        crs="EPSG:4326",
    )

    # Spatial join: which suburb does each stop fall in?
    print("Performing spatial join...")
    joined = gpd.sjoin(stops_gdf, suburbs[["suburb_id", "geometry"]], how="inner", predicate="within")

    # Aggregate per suburb
    per_suburb = joined.groupby("suburb_id").agg(
        stop_count=("stop_id", "count"),
        train_stops=("mode", lambda x: (x == "train").sum()),
        tram_stops=("mode", lambda x: (x == "tram").sum()),
        bus_stops=("mode", lambda x: (x == "bus").sum()),
    ).reset_index()

    # Compute nearest distance to each mode per suburb (using suburb centroids)
    suburb_centroids = suburbs[["suburb_id", "geometry"]].copy()
    suburb_centroids["centroid"] = suburb_centroids.geometry.centroid

    train_stops = stops_gdf[stops_gdf["mode"] == "train"]
    tram_stops = stops_gdf[stops_gdf["mode"] == "tram"]
    bus_stops = stops_gdf[stops_gdf["mode"] == "bus"]

    nearest = []
    for _, sub in suburb_centroids.iterrows():
        c = sub["centroid"]
        record = {"suburb_id": sub["suburb_id"]}

        for label, mode_stops in [("train", train_stops), ("tram", tram_stops), ("bus", bus_stops)]:
            if len(mode_stops) > 0:
                dists = mode_stops.geometry.distance(c)
                # Rough conversion: 1 degree ≈ 111 km at Melbourne's latitude
                record[f"nearest_{label}_km"] = round(dists.min() * 111, 2)
            else:
                record[f"nearest_{label}_km"] = None

        nearest.append(record)

    nearest_df = pd.DataFrame(nearest)
    result = per_suburb.merge(nearest_df, on="suburb_id", how="outer")

    # Fill suburbs with no stops
    result["stop_count"] = result["stop_count"].fillna(0).astype(int)

    print(f"Transport scores computed for {len(result)} suburbs")
    return result


def load_to_db(df: pd.DataFrame):
    conn = get_db_connection()
    cur = conn.cursor()
    loaded = 0
    for _, row in df.iterrows():
        cur.execute(
            """
            INSERT INTO transport_scores (suburb_id, stop_count, nearest_train_km, nearest_tram_km, nearest_bus_km)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                int(row["suburb_id"]),
                int(row["stop_count"]),
                row.get("nearest_train_km"),
                row.get("nearest_tram_km"),
                row.get("nearest_bus_km"),
            ),
        )
        loaded += 1
    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded transport data for {loaded} suburbs.")


if __name__ == "__main__":
    stops = load_all_stops()
    suburbs = load_suburb_boundaries()
    scores = compute_transport_scores(stops, suburbs)
    scores.to_csv(processed_path("transport_scores.csv"), index=False)
    load_to_db(scores)
