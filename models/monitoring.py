"""
Model monitoring and change tracking for Melbourne Liveability scores.
Detects score changes, anomalies, and tracks version history.
"""
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
import json
from typing import Dict, List, Tuple
from ingestion.base import get_db_connection
from ingestion.config import get_config


class ScoreMonitor:
    """Monitor score changes and detect anomalies."""

    def __init__(self):
        self.config = get_config()
        self.monitoring_log = []

    def fetch_previous_scores(self) -> pd.DataFrame:
        """Fetch the most recent previously computed scores from the database."""
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
                SELECT suburb_id, score_crime, score_transport, score_schools,
                       score_greenspace, score_affordability, score_total, computed_at
                FROM liveability_scores
                ORDER BY computed_at DESC
                LIMIT 1
            """)
            # Get all suburbs from the previous run
            cur.execute("""
                SELECT suburb_id, score_crime, score_transport, score_schools,
                       score_greenspace, score_affordability, score_total
                FROM liveability_scores
            """)
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
            cur.close()
            conn.close()

            if not rows:
                return pd.DataFrame()

            df = pd.DataFrame(rows, columns=columns)
            df = df.rename(columns={col: f"prev_{col}" for col in columns if col != "suburb_id"})
            return df
        except Exception as e:
            print(f"Warning: Could not fetch previous scores: {e}")
            return pd.DataFrame()

    def detect_score_changes(self, new_scores: pd.DataFrame, previous_scores: pd.DataFrame) -> Dict:
        """
        Detect and report significant score changes.
        Returns report of suburbs with major score shifts.
        """
        if previous_scores.empty:
            return {"changes_detected": False, "previous_run_unavailable": True, "changes": []}

        # Merge new and previous
        merged = new_scores.merge(previous_scores, on="suburb_id", how="inner")
        if merged.empty:
            return {"changes_detected": False, "no_matching_suburbs": True, "changes": []}

        change_threshold = self.config.get_change_threshold_pct() / 100.0
        changes = []

        score_cols = ["score_crime", "score_transport", "score_schools", "score_greenspace", "score_affordability", "score_total"]

        for col in score_cols:
            if col in merged.columns and f"prev_{col}" in merged.columns:
                # Calculate percentage change
                prev_vals = merged[f"prev_{col}"]
                new_vals = merged[col]
                # Avoid division by zero
                pct_change = np.where(
                    prev_vals != 0,
                    np.abs((new_vals - prev_vals) / prev_vals),
                    0
                )

                significant = pct_change > change_threshold
                if significant.any():
                    changed_suburbs = merged[significant][["suburb_id", "name", col, f"prev_{col}"]].copy()
                    changed_suburbs["pct_change"] = pct_change[significant] * 100

                    changes.append({
                        "metric": col,
                        "threshold_pct": self.config.get_change_threshold_pct(),
                        "suburbs_changed": int(significant.sum()),
                        "details": changed_suburbs.to_dict(orient="records"),
                    })

        report = {
            "timestamp": datetime.now().isoformat(),
            "changes_detected": len(changes) > 0,
            "total_changes": len(changes),
            "changes": changes,
        }

        self.monitoring_log.append(report)
        return report

    def detect_anomalies(self, scores: pd.DataFrame) -> Dict:
        """
        Detect anomalous suburbs using z-score method.
        """
        report = {
            "timestamp": datetime.now().isoformat(),
            "anomalies_found": False,
            "anomalies": [],
        }

        threshold = self.config.get_anomaly_z_score()
        score_cols = ["score_crime", "score_transport", "score_schools", "score_greenspace", "score_affordability", "score_total"]

        for col in score_cols:
            if col not in scores.columns:
                continue

            # Calculate z-scores
            mean = scores[col].mean()
            std = scores[col].std()
            if std == 0:
                continue

            z_scores = np.abs((scores[col] - mean) / std)
            anomalous = z_scores > threshold

            if anomalous.any():
                anomaly_suburbs = scores[anomalous][["suburb_id", "name", col]].copy()
                anomaly_suburbs["z_score"] = z_scores[anomalous]
                report["anomalies_found"] = True

                report["anomalies"].append({
                    "metric": col,
                    "threshold_z": threshold,
                    "anomaly_count": int(anomalous.sum()),
                    "details": anomaly_suburbs.to_dict(orient="records"),
                })

        self.monitoring_log.append(report)
        return report

    def compute_score_statistics(self, scores: pd.DataFrame) -> Dict:
        """Compute summary statistics for scores."""
        stats = {
            "timestamp": datetime.now().isoformat(),
            "total_suburbs": len(scores),
            "statistics": {},
        }

        score_cols = ["score_crime", "score_transport", "score_schools", "score_greenspace", "score_affordability", "score_total"]

        for col in score_cols:
            if col in scores.columns:
                stats["statistics"][col] = {
                    "mean": round(float(scores[col].mean()), 2),
                    "median": round(float(scores[col].median()), 2),
                    "std": round(float(scores[col].std()), 2),
                    "min": round(float(scores[col].min()), 2),
                    "max": round(float(scores[col].max()), 2),
                    "q25": round(float(scores[col].quantile(0.25)), 2),
                    "q75": round(float(scores[col].quantile(0.75)), 2),
                }

        self.monitoring_log.append(stats)
        return stats

    def save_monitoring_report(self, filepath: str = "data/processed/monitoring_report.json"):
        """Save monitoring log to JSON file."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, "w") as f:
            json.dump(self.monitoring_log, f, indent=2, default=str)
        print(f"Monitoring report saved to {filepath}")

    def print_summary(self):
        """Print summary of monitoring checks."""
        print("\n" + "=" * 60)
        print("SCORE MONITORING SUMMARY")
        print("=" * 60)

        for entry in self.monitoring_log:
            if "changes" in entry:
                print(f"\nScore Changes ({entry['timestamp']}):")
                if entry["changes_detected"]:
                    for change in entry["changes"]:
                        print(f"  {change['metric']}: {change['suburbs_changed']} suburbs changed")
                        for suburb in change["details"][:3]:  # Show top 3
                            print(f"    - {suburb.get('name', 'Unknown')}: {suburb['pct_change']:.1f}% change")
                else:
                    print("  No significant changes detected")

            elif "anomalies" in entry:
                print(f"\nAnomalies ({entry['timestamp']}):")
                if entry["anomalies_found"]:
                    for anom in entry["anomalies"]:
                        print(f"  {anom['metric']}: {anom['anomaly_count']} anomalies")
                        for suburb in anom["details"][:2]:  # Show top 2
                            print(f"    - {suburb.get('name', 'Unknown')}: z-score {suburb['z_score']:.2f}")
                else:
                    print("  No anomalies detected")

            elif "statistics" in entry:
                print(f"\nScore Statistics ({entry['timestamp']}):")
                print(f"  Total suburbs: {entry['total_suburbs']}")
                if "score_total" in entry["statistics"]:
                    stats = entry["statistics"]["score_total"]
                    print(f"  Overall liveability: mean={stats['mean']}, std={stats['std']}, range=[{stats['min']}, {stats['max']}]")

        print("\n" + "=" * 60)
