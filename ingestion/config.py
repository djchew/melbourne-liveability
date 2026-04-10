"""
Configuration loader for Melbourne Liveability project.
Loads config.yaml and provides type-safe access to configuration.
"""
import os
import yaml
from pathlib import Path
from typing import Any, Dict, Optional


class ConfigLoader:
    """Load and cache configuration from config.yaml."""

    _instance: Optional["ConfigLoader"] = None
    _config: Dict[str, Any] = {}

    def __new__(cls):
        """Singleton pattern for configuration."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Load config.yaml if not already loaded."""
        if not self._config:
            config_path = Path(__file__).parent.parent / "config.yaml"
            if not config_path.exists():
                raise FileNotFoundError(f"config.yaml not found at {config_path}")

            with open(config_path, "r") as f:
                self._config = yaml.safe_load(f) or {}

    def get(self, key: str, default: Any = None) -> Any:
        """Get a config value using dot notation. E.g., 'scoring.weights.crime'."""
        keys = key.split(".")
        value = self._config
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                return default
        return value if value is not None else default

    def get_weights(self) -> Dict[str, float]:
        """Get scoring weights."""
        return self.get("scoring.weights", {})

    def get_fill_strategy(self) -> str:
        """Get missing value fill strategy."""
        return self.get("ingestion.crime.fill_strategy", "median")

    def get_score_range(self) -> tuple:
        """Get score normalization range."""
        range_list = self.get("scoring.score_range", [0, 100])
        return tuple(range_list)

    def get_decimal_places(self) -> int:
        """Get decimal places for rounding scores."""
        return self.get("scoring.decimal_places", 2)

    def get_min_coverage_pct(self, metric: str) -> float:
        """Get minimum data coverage percentage for a metric."""
        return self.get(f"ingestion.{metric}.min_coverage_pct", 50)

    def get_data_source_url(self, metric: str) -> str:
        """Get data source URL for a metric."""
        return self.get(f"ingestion.{metric}.data_source_url", "")

    def get_outlier_threshold(self) -> float:
        """Get outlier detection threshold (sigma)."""
        return self.get("validation.outlier_std_threshold", 3.0)

    def get_change_threshold_pct(self) -> float:
        """Get score change detection threshold (percentage)."""
        return self.get("monitoring.change_threshold_pct", 5.0)

    def get_anomaly_z_score(self) -> float:
        """Get z-score threshold for anomaly detection."""
        return self.get("monitoring.anomaly_z_score", 2.5)

    def get_random_seed(self) -> int:
        """Get random seed for reproducibility."""
        return self.get("reproducibility.random_seed", 42)

    def all(self) -> Dict[str, Any]:
        """Get entire configuration dictionary."""
        return self._config


def get_config() -> ConfigLoader:
    """Get singleton config instance."""
    return ConfigLoader()
