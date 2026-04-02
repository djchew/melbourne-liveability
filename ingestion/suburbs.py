"""
Suburb seed data — Australian Bureau of Statistics (ABS) suburb boundaries
Source: https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/digital-boundary-files
Download: SAL_2021_AUST_GDA2020_SHP.zip (Shapefile)
         LGA_2021_AUST_GDA2020_SHP.zip (Shapefile — for LGA names)
"""
import json
import geopandas as gpd
from shapely.geometry import box
from base import get_db_connection, inbound_path


# Greater Melbourne bounding box (generous)
# South-west to north-east: roughly Geelong to Pakenham, Sunbury to Mornington
MELBOURNE_BBOX = box(144.4, -38.5, 146.0, -37.4)


def load_sal() -> gpd.GeoDataFrame:
    """Load SAL boundaries from ABS Shapefile."""
    shp = inbound_path("SAL_2021_AUST_GDA2020.shp")
    gpkg = inbound_path("SAL_2021_AUST_GDA2020.gpkg")

    if shp.exists():
        print(f"Reading Shapefile: {shp}")
        return gpd.read_file(shp)
    elif gpkg.exists():
        print(f"Reading GeoPackage: {gpkg}")
        return gpd.read_file(gpkg)
    else:
        raise FileNotFoundError(
            f"Expected ABS SAL file at:\n  {shp}\n  or {gpkg}\n"
            "Download SAL_2021_AUST_GDA2020_SHP.zip from:\n"
            "https://www.abs.gov.au/statistics/standards/"
            "australian-statistical-geography-standard-asgs-edition-3/"
            "jul2021-jun2026/access-and-downloads/digital-boundary-files"
        )


def load_lga() -> gpd.GeoDataFrame:
    """Load LGA boundaries from ABS Shapefile for spatial join."""
    shp = inbound_path("LGA_2021_AUST_GDA2020.shp")
    if not shp.exists():
        print("WARNING: LGA shapefile not found — LGA column will be null.")
        print(f"  Expected at: {shp}")
        return None
    print(f"Reading LGA Shapefile: {shp}")
    return gpd.read_file(shp)


def filter_melbourne(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Filter to Greater Melbourne suburbs using Victoria state code + bounding box."""
    vic = gdf[gdf["STE_CODE21"] == "2"].copy()
    print(f"Victorian suburbs: {len(vic)}")

    vic = vic[vic.geometry.notna()].copy()

    vic["_centroid"] = vic.geometry.centroid
    melb = vic[vic["_centroid"].within(MELBOURNE_BBOX)].copy()
    melb = melb.drop(columns=["_centroid"])

    print(f"Greater Melbourne suburbs (bounding box filter): {len(melb)}")
    return melb


def join_lga(sal: gpd.GeoDataFrame, lga: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Spatial join: assign each suburb to its LGA based on centroid containment."""
    sal = sal.copy()
    sal["_centroid_geom"] = sal.geometry.centroid
    centroid_gdf = sal.set_geometry("_centroid_geom")

    joined = gpd.sjoin(centroid_gdf, lga[["LGA_NAME21", "geometry"]], how="left", predicate="within")

    sal["LGA_NAME21"] = joined["LGA_NAME21"].values
    sal = sal.drop(columns=["_centroid_geom"])

    matched = sal["LGA_NAME21"].notna().sum()
    print(f"LGA matched: {matched}/{len(sal)} suburbs")
    return sal


def transform(gdf: gpd.GeoDataFrame) -> list[dict]:
    """Extract suburb name, LGA, centroid, and GeoJSON geometry."""
    suburbs = []
    for _, row in gdf.iterrows():
        if row.geometry is None:
            continue

        name = row.get("SAL_NAME21", "Unknown")
        centroid = row.geometry.centroid
        lga = row.get("LGA_NAME21", None)

        suburbs.append({
            "name": name.title() if isinstance(name, str) else name,
            "postcode": None,
            "lga": lga,
            "latitude": round(centroid.y, 6),
            "longitude": round(centroid.x, 6),
            "geometry": json.dumps(row.geometry.__geo_interface__),
        })
    return suburbs


def load_to_db(suburbs: list[dict]):
    conn = get_db_connection()
    cur = conn.cursor()
    # Clear existing data so we can re-run cleanly
    cur.execute("DELETE FROM suburbs")
    for s in suburbs:
        cur.execute(
            """
            INSERT INTO suburbs (name, postcode, lga, latitude, longitude, geometry)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (s["name"], s["postcode"], s["lga"], s["latitude"], s["longitude"], s["geometry"]),
        )
    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded {len(suburbs)} Melbourne suburbs to database.")


if __name__ == "__main__":
    gdf = load_sal()
    print(f"Loaded {len(gdf)} total suburbs from ABS file")
    gdf = filter_melbourne(gdf)

    lga = load_lga()
    if lga is not None:
        gdf = join_lga(gdf, lga)

    suburbs = transform(gdf)
    print(f"Sample: {[(s['name'], s['lga']) for s in suburbs[:5]]}")
    load_to_db(suburbs)
