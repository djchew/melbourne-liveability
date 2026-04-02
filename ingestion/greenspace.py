"""
Green space ingestion — OpenStreetMap via Overpass API
Fetches parks, reserves, and green areas within Greater Melbourne,
then spatial joins to suburb boundaries to compute per-suburb green space metrics.
"""
import requests
import json
import pandas as pd
import geopandas as gpd
from shapely.geometry import shape, Point
from shapely.ops import unary_union
from base import get_db_connection, inbound_path, processed_path

# Greater Melbourne bounding box (south, west, north, east)
MELBOURNE_BBOX = "-38.5,144.4,-37.4,146.0"

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Query for green space polygons — using 'out geom' to get full geometry
OVERPASS_QUERY = f"""
[out:json][timeout:180];
(
  way["leisure"="park"]({MELBOURNE_BBOX});
  way["leisure"="nature_reserve"]({MELBOURNE_BBOX});
  way["leisure"="garden"]({MELBOURNE_BBOX});
  way["landuse"="grass"]({MELBOURNE_BBOX});
  way["landuse"="recreation_ground"]({MELBOURNE_BBOX});
  way["landuse"="forest"]({MELBOURNE_BBOX});
  relation["leisure"="park"]({MELBOURNE_BBOX});
  relation["leisure"="nature_reserve"]({MELBOURNE_BBOX});
);
out geom;
"""


def fetch_from_osm() -> dict:
    """Download green space data from Overpass API (or load from cache)."""
    cache = inbound_path("greenspace_osm.json")

    if cache.exists():
        print(f"Loading cached OSM data from {cache}")
        with open(cache) as f:
            return json.load(f)

    print("Fetching green space data from OpenStreetMap (this may take a few minutes)...")
    response = requests.post(OVERPASS_URL, data={"data": OVERPASS_QUERY}, timeout=300)
    response.raise_for_status()
    data = response.json()

    with open(cache, "w") as f:
        json.dump(data, f)
    print(f"Saved {len(data.get('elements', []))} elements to {cache}")
    return data


def build_geometries(data: dict) -> gpd.GeoDataFrame:
    """Convert Overpass JSON elements into a GeoDataFrame of polygons."""
    from shapely.geometry import Polygon

    features = []
    for el in data.get("elements", []):
        if el.get("type") == "way" and "geometry" in el:
            coords = [(p["lon"], p["lat"]) for p in el["geometry"]]
            if len(coords) >= 4:
                try:
                    poly = Polygon(coords)
                    if poly.is_valid and poly.area > 0:
                        features.append({
                            "osm_id": el["id"],
                            "name": el.get("tags", {}).get("name", ""),
                            "geometry": poly,
                        })
                except Exception:
                    continue

    print(f"Built {len(features)} valid green space polygons")
    return gpd.GeoDataFrame(features, geometry="geometry", crs="EPSG:4326")


def load_suburb_boundaries() -> gpd.GeoDataFrame:
    """Load suburb boundaries from the database."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, geometry, latitude, longitude FROM suburbs WHERE geometry IS NOT NULL")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    records = []
    for row in rows:
        try:
            geom = shape(json.loads(row[2]))
            records.append({"suburb_id": row[0], "name": row[1], "geometry": geom})
        except Exception:
            continue

    gdf = gpd.GeoDataFrame(records, geometry="geometry", crs="EPSG:4326")
    print(f"Loaded {len(gdf)} suburb boundaries")
    return gdf


def compute_greenspace_scores(parks: gpd.GeoDataFrame, suburbs: gpd.GeoDataFrame) -> pd.DataFrame:
    """Compute per-suburb green space metrics via spatial overlay."""
    # Project to a metre-based CRS for accurate area calculations (MGA Zone 55 covers Melbourne)
    parks_proj = parks.to_crs(epsg=28355)
    suburbs_proj = suburbs.to_crs(epsg=28355)

    results = []
    print("Computing green space per suburb...")

    for _, sub in suburbs_proj.iterrows():
        sub_geom = sub.geometry

        # Find parks that intersect this suburb
        intersecting = parks_proj[parks_proj.geometry.intersects(sub_geom)]

        if len(intersecting) > 0:
            # Clip parks to suburb boundary and compute area
            clipped = intersecting.geometry.intersection(sub_geom)
            green_area = clipped.area.sum()  # in square metres
            park_count = len(intersecting)
        else:
            green_area = 0
            park_count = 0

        suburb_area = sub_geom.area  # in square metres
        green_pct = round((green_area / suburb_area) * 100, 2) if suburb_area > 0 else 0

        # Nearest park distance from suburb centroid
        centroid = sub_geom.centroid
        if len(parks_proj) > 0:
            nearest_dist = parks_proj.geometry.distance(centroid).min()
            nearest_park_km = round(nearest_dist / 1000, 2)
        else:
            nearest_park_km = None

        results.append({
            "suburb_id": sub["suburb_id"],
            "park_count": park_count,
            "total_green_area_sqm": round(green_area, 2),
            "green_pct_of_suburb": green_pct,
            "nearest_park_km": nearest_park_km,
        })

    df = pd.DataFrame(results)
    print(f"Green space scores computed for {len(df)} suburbs")
    print(f"Avg green %: {df['green_pct_of_suburb'].mean():.1f}%")
    return df


def load_to_db(df: pd.DataFrame):
    conn = get_db_connection()
    cur = conn.cursor()
    loaded = 0
    for _, row in df.iterrows():
        cur.execute(
            """
            INSERT INTO greenspace_scores (suburb_id, park_count, total_green_area_sqm, green_pct_of_suburb, nearest_park_km)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                int(row["suburb_id"]),
                int(row["park_count"]),
                float(row["total_green_area_sqm"]),
                float(row["green_pct_of_suburb"]),
                row["nearest_park_km"],
            ),
        )
        loaded += 1
    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded green space data for {loaded} suburbs.")


if __name__ == "__main__":
    data = fetch_from_osm()
    parks = build_geometries(data)
    suburbs = load_suburb_boundaries()
    scores = compute_greenspace_scores(parks, suburbs)
    scores.to_csv(processed_path("greenspace_scores.csv"), index=False)
    load_to_db(scores)
