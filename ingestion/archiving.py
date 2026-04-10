"""
Data archiving and versioning module.
Manages snapshots of raw and processed data for reproducibility and audit trails.
"""
import shutil
import json
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Optional
import hashlib
from ingestion.config import get_config


class DataArchiver:
    """Archive and version data for reproducibility."""

    def __init__(self):
        self.config = get_config()
        self.archive_dir = Path(self.config.get("archiving.archive_dir", "data/archive"))
        self.snapshot_dir = Path(self.config.get("archiving.snapshot_dir", "data/processed/snapshots"))
        self.archive_enabled = self.config.get("archiving.enabled", True)

        if self.archive_enabled:
            self.archive_dir.mkdir(parents=True, exist_ok=True)
            self.snapshot_dir.mkdir(parents=True, exist_ok=True)

    def archive_raw_data(self, metric_name: str, source_file: Path, metadata: dict = None) -> Optional[str]:
        """
        Archive raw data file with metadata.
        Returns archive path if successful.
        """
        if not self.archive_enabled:
            return None

        timestamp = datetime.now().isoformat().replace(':', '-')
        metric_dir = self.archive_dir / metric_name / timestamp

        try:
            metric_dir.mkdir(parents=True, exist_ok=True)

            # Copy the raw data file
            if source_file.exists():
                dest_file = metric_dir / source_file.name
                shutil.copy2(source_file, dest_file)
                file_hash = self._compute_hash(dest_file)

                # Save metadata
                archive_metadata = {
                    "timestamp": timestamp,
                    "metric": metric_name,
                    "source_file": str(source_file),
                    "archive_file": str(dest_file),
                    "file_hash": file_hash,
                    "file_size_bytes": dest_file.stat().st_size,
                    "custom_metadata": metadata or {},
                }

                metadata_file = metric_dir / "metadata.json"
                with open(metadata_file, "w") as f:
                    json.dump(archive_metadata, f, indent=2)

                print(f"✓ Archived {metric_name} to {dest_file}")
                return str(dest_file)

        except Exception as e:
            print(f"✗ Failed to archive {metric_name}: {e}")
            return None

    def snapshot_processed_data(self, data_type: str, df: pd.DataFrame) -> Optional[str]:
        """
        Create a snapshot of processed data.
        Returns snapshot path if successful.
        """
        if not self.archive_enabled or not isinstance(df, pd.DataFrame):
            return None

        timestamp = datetime.now().isoformat().replace(':', '-')
        snapshot_path = self.snapshot_dir / f"{data_type}_{timestamp}.parquet"

        try:
            snapshot_path.parent.mkdir(parents=True, exist_ok=True)
            df.to_parquet(snapshot_path, index=False)

            # Save metadata
            snapshot_metadata = {
                "timestamp": timestamp,
                "data_type": data_type,
                "snapshot_file": str(snapshot_path),
                "rows": len(df),
                "columns": list(df.columns),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "file_hash": self._compute_hash(snapshot_path),
            }

            metadata_file = snapshot_path.parent / f"{snapshot_path.stem}_metadata.json"
            with open(metadata_file, "w") as f:
                json.dump(snapshot_metadata, f, indent=2, default=str)

            print(f"✓ Snapshot created: {snapshot_path}")
            return str(snapshot_path)

        except Exception as e:
            print(f"✗ Failed to snapshot {data_type}: {e}")
            return None

    def get_archive_history(self, metric_name: str) -> list:
        """Get list of archived files for a metric."""
        metric_archive = self.archive_dir / metric_name
        if not metric_archive.exists():
            return []

        history = []
        for timestamp_dir in sorted(metric_archive.iterdir(), reverse=True):
            if timestamp_dir.is_dir():
                metadata_file = timestamp_dir / "metadata.json"
                if metadata_file.exists():
                    with open(metadata_file, "r") as f:
                        metadata = json.load(f)
                        history.append(metadata)

        return history

    def get_latest_snapshot(self, data_type: str) -> Optional[pd.DataFrame]:
        """Load the most recent snapshot of processed data."""
        if not self.snapshot_dir.exists():
            return None

        parquet_files = sorted(
            self.snapshot_dir.glob(f"{data_type}_*.parquet"),
            reverse=True
        )

        if parquet_files:
            try:
                return pd.read_parquet(parquet_files[0])
            except Exception as e:
                print(f"Failed to load snapshot: {e}")
                return None

        return None

    def cleanup_old_archives(self, days_to_keep: int = 90):
        """Remove archives older than specified days."""
        if not self.archive_enabled:
            return

        cutoff_date = datetime.now().timestamp() - (days_to_keep * 86400)
        cleaned_count = 0

        for metric_dir in self.archive_dir.iterdir():
            if metric_dir.is_dir():
                for timestamp_dir in metric_dir.iterdir():
                    if timestamp_dir.is_dir():
                        if timestamp_dir.stat().st_mtime < cutoff_date:
                            try:
                                shutil.rmtree(timestamp_dir)
                                cleaned_count += 1
                            except Exception as e:
                                print(f"Failed to clean {timestamp_dir}: {e}")

        if cleaned_count > 0:
            print(f"✓ Cleaned {cleaned_count} old archives (older than {days_to_keep} days)")

    def get_archive_statistics(self) -> dict:
        """Get statistics about archived data."""
        stats = {
            "archive_dir": str(self.archive_dir),
            "snapshot_dir": str(self.snapshot_dir),
            "metrics_archived": 0,
            "total_versions": 0,
            "total_size_bytes": 0,
            "by_metric": {},
        }

        if self.archive_dir.exists():
            for metric_dir in self.archive_dir.iterdir():
                if metric_dir.is_dir():
                    versions = list(metric_dir.iterdir())
                    stats["metrics_archived"] += 1
                    stats["total_versions"] += len(versions)

                    metric_name = metric_dir.name
                    metric_size = sum(
                        f.stat().st_size for f in metric_dir.rglob("*") if f.is_file()
                    )
                    stats["total_size_bytes"] += metric_size
                    stats["by_metric"][metric_name] = {
                        "versions": len(versions),
                        "size_bytes": metric_size,
                        "latest": str(sorted(versions, reverse=True)[0]) if versions else None,
                    }

        return stats

    @staticmethod
    def _compute_hash(filepath: Path, algorithm: str = "md5") -> str:
        """Compute hash of a file for integrity checking."""
        hash_obj = hashlib.new(algorithm)
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_obj.update(chunk)
        return hash_obj.hexdigest()


def print_archive_report():
    """Print a report of the current archive state."""
    archiver = DataArchiver()
    stats = archiver.get_archive_statistics()

    print("\n" + "=" * 60)
    print("DATA ARCHIVE REPORT")
    print("=" * 60)
    print(f"\nArchive Location: {stats['archive_dir']}")
    print(f"Snapshot Location: {stats['snapshot_dir']}")
    print(f"\nMetrics Archived: {stats['metrics_archived']}")
    print(f"Total Versions: {stats['total_versions']}")
    print(f"Total Size: {stats['total_size_bytes'] / (1024*1024):.1f} MB")

    if stats["by_metric"]:
        print(f"\nBy Metric:")
        for metric, info in stats["by_metric"].items():
            print(f"  {metric:20} - {info['versions']:3} versions, {info['size_bytes'] / 1024:.1f} KB, Latest: {info['latest']}")

    print("\n" + "=" * 60)
