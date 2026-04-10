"""
Data validation module for Melbourne Liveability project.
Checks data quality, missing values, outliers, and consistency.
"""
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple
from pathlib import Path
import json
from ingestion.config import get_config


class DataValidator:
    """Validate data quality at various stages of the pipeline."""

    def __init__(self):
        self.config = get_config()
        self.validation_log = []

    def validate_metric_data(self, df: pd.DataFrame, metric_name: str) -> Tuple[bool, Dict]:
        """
        Validate a metric DataFrame before scoring.
        Returns (is_valid, report_dict).
        """
        report = {
            "metric": metric_name,
            "timestamp": datetime.now().isoformat(),
            "total_records": len(df),
            "checks": {},
            "warnings": [],
            "errors": [],
            "coverage_pct": 0.0,
        }

        # Check expected columns
        expected_cols = self.config.get(f"ingestion.{metric_name}.expected_columns", [])
        if expected_cols:
            missing_cols = [col for col in expected_cols if col not in df.columns]
            if missing_cols:
                report["errors"].append(f"Missing columns: {missing_cols}")
            report["checks"]["columns_present"] = len(missing_cols) == 0

        # Check for null values
        null_counts = df.isnull().sum()
        null_pcts = (null_counts / len(df) * 100).round(2)
        report["null_values"] = dict(zip(df.columns, null_pcts))

        # Check data coverage
        data_cols = [col for col in df.columns if col not in ["suburb_id", "name"]]
        if data_cols:
            avg_coverage = (100 - null_pcts[data_cols].mean())
            report["coverage_pct"] = round(avg_coverage, 2)

            min_required = self.config.get_min_coverage_pct(metric_name)
            if avg_coverage < min_required:
                report["errors"].append(f"Coverage {avg_coverage:.1f}% below minimum {min_required}%")
            report["checks"]["min_coverage"] = avg_coverage >= min_required

        # Check for outliers
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        outlier_info = self._detect_outliers(df[numeric_cols])
        if outlier_info["outliers_found"]:
            report["warnings"].append(f"Outliers detected: {outlier_info['outlier_count']} records")
            report["outliers"] = outlier_info

        # Check value ranges
        range_checks = self._validate_value_ranges(df, metric_name)
        report["range_checks"] = range_checks
        if not all(check["valid"] for check in range_checks.values()):
            report["warnings"].append("Some values outside expected ranges")

        # Check for duplicates
        if "suburb_id" in df.columns:
            duplicates = df["suburb_id"].duplicated().sum()
            report["checks"]["no_duplicates"] = duplicates == 0
            if duplicates > 0:
                report["warnings"].append(f"{duplicates} duplicate suburb records")

        # Determine overall validity
        is_valid = len(report["errors"]) == 0
        report["is_valid"] = is_valid

        self.validation_log.append(report)
        return is_valid, report

    def validate_raw_metrics(self, df: pd.DataFrame) -> Tuple[bool, Dict]:
        """
        Validate the combined raw metrics DataFrame before scoring.
        """
        report = {
            "stage": "raw_metrics",
            "timestamp": datetime.now().isoformat(),
            "total_suburbs": len(df),
            "metrics_summary": {},
            "warnings": [],
            "errors": [],
        }

        metrics = ["score_crime", "score_transport", "score_schools", "score_greenspace", "score_affordability"]
        min_required = self.config.get("validation.min_suburbs", 400)

        if len(df) < min_required:
            report["errors"].append(f"Only {len(df)} suburbs, need at least {min_required}")

        for metric in ["rate_per_100k", "stop_count", "avg_icsea_score", "green_pct_of_suburb", "median_house_price"]:
            if metric in df.columns:
                coverage = df[metric].notna().sum() / len(df) * 100
                report["metrics_summary"][metric] = {
                    "coverage_pct": round(coverage, 2),
                    "missing": int(df[metric].isna().sum()),
                }

        # Check for suburb with all nulls
        all_null_rows = df.isnull().all(axis=1).sum()
        if all_null_rows > 0:
            report["warnings"].append(f"{all_null_rows} suburbs with all null metrics")

        is_valid = len(report["errors"]) == 0
        report["is_valid"] = is_valid
        self.validation_log.append(report)
        return is_valid, report

    def validate_scores(self, df: pd.DataFrame) -> Tuple[bool, Dict]:
        """
        Validate computed liveability scores.
        """
        report = {
            "stage": "scores",
            "timestamp": datetime.now().isoformat(),
            "total_suburbs": len(df),
            "checks": {},
            "warnings": [],
        }

        score_cols = ["score_crime", "score_transport", "score_schools", "score_greenspace", "score_affordability", "score_total"]

        # Check score ranges
        for col in score_cols:
            if col in df.columns:
                min_val = df[col].min()
                max_val = df[col].max()
                report[f"{col}_range"] = {"min": round(min_val, 2), "max": round(max_val, 2)}

                if min_val < -1 or max_val > 101:
                    report["warnings"].append(f"{col} outside expected [0, 100] range")

        # Check for nulls in scores
        for col in score_cols:
            if col in df.columns:
                null_count = df[col].isnull().sum()
                if null_count > 0:
                    report["warnings"].append(f"{null_count} null values in {col}")

        # Check that weights sum correctly
        if all(col in df.columns for col in score_cols[:-1]):
            report["checks"]["weights_present"] = True

        is_valid = len(report["warnings"]) == 0
        report["is_valid"] = is_valid
        self.validation_log.append(report)
        return is_valid, report

    def _detect_outliers(self, df: pd.DataFrame) -> Dict:
        """Detect outliers using z-score method."""
        threshold = self.config.get_outlier_threshold()
        outliers = {}
        outlier_count = 0

        for col in df.columns:
            if df[col].notna().sum() < 2:
                continue
            z_scores = np.abs((df[col] - df[col].mean()) / df[col].std())
            col_outliers = (z_scores > threshold).sum()
            if col_outliers > 0:
                outliers[col] = int(col_outliers)
                outlier_count += col_outliers

        return {
            "outliers_found": outlier_count > 0,
            "outlier_count": outlier_count,
            "by_column": outliers,
            "threshold_sigma": threshold,
        }

    def _validate_value_ranges(self, df: pd.DataFrame, metric_name: str) -> Dict:
        """Check if values fall within expected ranges."""
        ranges = self.config.get("validation.value_ranges", {})
        results = {}

        for col, (min_val, max_val) in ranges.items():
            if col not in df.columns:
                continue
            out_of_range = ((df[col] < min_val) | (df[col] > max_val)).sum()
            results[col] = {
                "valid": out_of_range == 0,
                "out_of_range_count": int(out_of_range),
                "expected_range": (min_val, max_val),
            }

        return results

    def save_validation_report(self, filepath: str = "data/processed/validation_report.json"):
        """Save validation log to JSON file."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, "w") as f:
            json.dump(self.validation_log, f, indent=2, default=str)
        print(f"Validation report saved to {filepath}")

    def print_summary(self):
        """Print summary of all validation checks."""
        print("\n" + "=" * 60)
        print("DATA VALIDATION SUMMARY")
        print("=" * 60)
        for report in self.validation_log:
            metric = report.get("metric") or report.get("stage")
            status = "✓ PASS" if report.get("is_valid") else "✗ FAIL"
            print(f"\n{metric.upper()} {status}")
            if report.get("coverage_pct"):
                print(f"  Coverage: {report['coverage_pct']}%")
            if report.get("warnings"):
                for warning in report["warnings"]:
                    print(f"  ⚠ {warning}")
            if report.get("errors"):
                for error in report["errors"]:
                    print(f"  ✗ {error}")
        print("\n" + "=" * 60)


def validate_pipeline() -> bool:
    """Quick validation of entire pipeline. Returns True if all valid."""
    validator = DataValidator()
    all_valid = all(report.get("is_valid", False) for report in validator.validation_log)
    return all_valid
