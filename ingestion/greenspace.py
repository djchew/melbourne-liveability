"""
Green space ingestion — OpenStreetMap via Overpass API
Fetches parks, reserves, and green areas within Greater Melbourne bounding box.
"""
import requests
import json
import pandas as pd
from base import get_db_connection, inbound_path, processed_path

# Greater Melbourne bounding box (south, west, north, east)
MELBOURNE_BBOX = "-38.5, 144.4, -37.4, 145.8"

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

OVERPASS_QUERY = f"""
[out:json][timeout:60];
(
  way["leisure"="park"]({MELBOURNE_BBOX});
  way["leisure"="nature_reserve"]({MELBOURNE_BBOX});
  way["landuse"="grass"]({MELBOURNE_BBOX});
  way["landuse"="recreation_ground"]({MELBOURNE_BBOX});
);
out body;
>;
out skel qt;
"""


def fetch_from_osm() -> dict:
    """Download green space data from Overpass API."""
    print("Fetching green space data from OpenStreetMap...")
    response = requests.post(OVERPASS_URL, data={"data": OVERPASS_QUERY}, timeout=120)
    response.raise_for_status()
    data = response.json()
    out_path = inbound_path("greenspace_osm.json")
    with open(out_path, "w") as f:
        json.dump(data, f)
    print(f"Saved {len(data.get('elements', []))} elements to {out_path}")
    return data


def transform(data: dict) -> pd.DataFrame:
    """Extract park names and rough centroids from OSM response."""
    records = []
    for el in data.get("elements", []):
        if el.get("type") == "way":
            tags = el.get("tags", {})
            records.append({
                "osm_id": el["id"],
                "name": tags.get("name", "Unknown Park"),
                "leisure": tags.get("leisure", tags.get("landuse", "")),
            })
    return pd.DataFrame(records)


if __name__ == "__main__":
    data = fetch_from_osm()
    df = transform(data)
    df.to_csv(processed_path("greenspace_clean.csv"), index=False)
    print(f"Processed {len(df)} green space features.")
