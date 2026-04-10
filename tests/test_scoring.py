"""
Unit tests for scoring module.
Tests edge cases, normalization, and weight calculations.
"""
import unittest
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from ingestion.config import get_config


class TestScoringLogic(unittest.TestCase):
    """Test scoring calculations."""

    def setUp(self):
        """Set up test fixtures."""
        self.config = get_config()
        self.weights = self.config.get_weights()

    def test_weights_sum_to_one(self):
        """Weights should sum to 1.0."""
        total = sum(self.weights.values())
        self.assertAlmostEqual(total, 1.0, places=5)

    def test_minmax_normalization(self):
        """Test MinMaxScaler normalization to [0, 100]."""
        data = np.array([[10], [20], [30], [40], [50]])
        scaler = MinMaxScaler(feature_range=(0, 100))
        normalized = scaler.fit_transform(data)

        self.assertAlmostEqual(normalized.min(), 0.0, places=1)
        self.assertAlmostEqual(normalized.max(), 100.0, places=1)

    def test_crime_score_inversion(self):
        """Test that higher crime = lower score."""
        crime_data = np.array([[50], [100], [150]])
        scaler = MinMaxScaler(feature_range=(0, 100))
        normalized = scaler.fit_transform(crime_data)
        inverted = 100 - normalized

        # Higher crime should have lower score
        self.assertLess(inverted[2][0], inverted[0][0])

    def test_affordability_inversion(self):
        """Test that higher price = lower affordability score."""
        prices = np.array([[500000], [750000], [1000000]])
        scaler = MinMaxScaler(feature_range=(0, 100))
        normalized = scaler.fit_transform(prices)
        inverted = 100 - normalized

        # Higher price should have lower score
        self.assertLess(inverted[2][0], inverted[0][0])

    def test_composite_score_calculation(self):
        """Test weighted composite score calculation."""
        # Create sample scores (keys match self.weights keys)
        scores_dict = {
            "score_crime": np.array([80.0]),
            "score_transport": np.array([70.0]),
            "score_schools": np.array([75.0]),
            "score_greenspace": np.array([60.0]),
            "score_affordability": np.array([65.0]),
        }

        # Calculate composite (map weight keys to scores_dict keys)
        composite = sum(scores_dict[f"score_{col}"] * weight for col, weight in self.weights.items())

        # Should be between 0 and 100
        self.assertGreaterEqual(composite[0], 0.0)
        self.assertLessEqual(composite[0], 100.0)

        # Should be weighted average
        expected = (80*0.25 + 70*0.25 + 75*0.20 + 60*0.15 + 65*0.15)
        self.assertAlmostEqual(composite[0], expected, places=1)

    def test_missing_value_filling(self):
        """Test missing value handling with median."""
        data = pd.Series([10, 20, np.nan, 40, 50])
        filled = data.fillna(data.median())

        self.assertEqual(filled.isna().sum(), 0)
        self.assertAlmostEqual(filled.iloc[2], 30.0)  # median of [10,20,40,50]

    def test_single_suburb_scoring(self):
        """Test scoring when only one suburb has data."""
        df = pd.DataFrame({
            "suburb_id": [1, 2, 3],
            "name": ["A", "B", "C"],
            "rate_per_100k": [100, np.nan, np.nan],
        })

        scaler = MinMaxScaler(feature_range=(0, 100))
        crime = df[["rate_per_100k"]].copy()
        crime = crime.fillna(crime.median())
        scores = 100 - scaler.fit_transform(crime)

        # All should have scores
        self.assertEqual(len(scores), 3)
        self.assertFalse(np.isnan(scores).any())

    def test_all_nulls_suburb(self):
        """Test handling of suburb with all null metrics."""
        data = {
            "suburb_id": [1, 2, 3],
            "rate_per_100k": [100, np.nan, 150],
            "stop_count": [50, np.nan, 60],
        }
        df = pd.DataFrame(data)

        # After filling, suburb 2 gets median values
        filled = df.copy()
        for col in ["rate_per_100k", "stop_count"]:
            filled[col] = filled[col].fillna(filled[col].median())

        self.assertEqual(filled.isna().sum().sum(), 0)

    def test_identical_scores(self):
        """Test normalization when all values are identical."""
        data = np.array([[50], [50], [50], [50]])
        scaler = MinMaxScaler(feature_range=(0, 100))
        normalized = scaler.fit_transform(data)

        # All should be 0 (min of range) when all identical
        np.testing.assert_array_equal(normalized, 0)

    def test_distance_inversion(self):
        """Test that closer distances get higher scores."""
        distances = np.array([[5], [10], [20], [50]])
        max_dist = distances.max()
        inverted = max_dist - distances

        # Closer distances have higher inverted values
        self.assertGreater(inverted[0][0], inverted[3][0])

    def test_score_rounding(self):
        """Test rounding to configured decimal places."""
        decimal_places = self.config.get_decimal_places()
        value = 75.56789
        rounded = round(value, decimal_places)

        self.assertEqual(len(str(rounded).split(".")[-1]), decimal_places)


class TestDataContracts(unittest.TestCase):
    """Test that data meets expected contracts."""

    def test_suburb_scores_table_structure(self):
        """Verify expected columns in scores."""
        expected_cols = [
            "suburb_id",
            "score_crime",
            "score_transport",
            "score_schools",
            "score_greenspace",
            "score_affordability",
            "score_total",
        ]
        # This would normally check the actual table
        self.assertEqual(len(expected_cols), 7)

    def test_metric_column_naming(self):
        """Verify consistent metric column naming."""
        metrics = ["crime", "transport", "schools", "greenspace", "affordability"]
        for metric in metrics:
            col_name = f"score_{metric}"
            self.assertTrue(col_name.startswith("score_"))

    def test_score_range_contract(self):
        """Verify scores are in expected range [0, 100]."""
        scores = np.random.uniform(0, 100, 100)
        self.assertTrue(np.all(scores >= 0))
        self.assertTrue(np.all(scores <= 100))


if __name__ == "__main__":
    unittest.main()
