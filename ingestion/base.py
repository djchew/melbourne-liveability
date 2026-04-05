"""
Base utilities for all ingestion scripts.
"""
import os
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

load_dotenv()

INBOUND_DIR = Path(__file__).parent.parent / "data" / "inbound"
PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"


def get_db_connection():
    """Return a psycopg2 connection using DATABASE_URL from .env."""
    url = os.environ["DATABASE_URL"]
    return psycopg2.connect(url)


def inbound_path(filename: str) -> Path:
    """Return the full path for a file in data/inbound/."""
    return INBOUND_DIR / filename


def processed_path(filename: str) -> Path:
    """Return the full path for a file in data/processed/."""
    return PROCESSED_DIR / filename
