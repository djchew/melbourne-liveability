"""
Public transport ingestion — PTV GTFS feed
Source: https://www.ptv.vic.gov.au/footer/data-and-reporting/datasets/gtfs/
Download: GTFS zip (stops.txt, routes.txt, stop_times.txt)
"""
import pandas as pd
import zipfile
from base import get_db_connection, inbound_path, processed_path


def load_stops() -> pd.DataFrame:
    """Extract stops from the PTV GTFS zip."""
    zip_path = inbound_path("gtfs_metro.zip")
    if not zip_path.exists():
        raise FileNotFoundError(
            f"Expected GTFS zip at {zip_path}\n"
            "Download from: https://www.ptv.vic.gov.au/footer/data-and-reporting/datasets/gtfs/"
        )
    with zipfile.ZipFile(zip_path) as z:
        with z.open("stops.txt") as f:
            return pd.read_csv(f)


def transform(stops: pd.DataFrame) -> pd.DataFrame:
    """Keep relevant columns."""
    return stops[["stop_id", "stop_name", "stop_lat", "stop_lon"]].dropna()


def load_to_db(stops: pd.DataFrame):
    """
    TODO: spatially join stops to suburb boundaries to compute per-suburb
    transport metrics (stop count, service frequency, nearest train/tram/bus).
    Requires suburb geometry data to be loaded first.
    """
    print(f"Loaded {len(stops)} stops — spatial join not yet implemented.")


if __name__ == "__main__":
    stops = load_stops()
    stops = transform(stops)
    stops.to_csv(processed_path("transport_stops.csv"), index=False)
    load_to_db(stops)
