# Melbourne Liveability Data Science Guide

Complete documentation for data science workflows, validation, monitoring, and analysis tools.

## Overview

This guide covers the new data science infrastructure added to the Melbourne Liveability project:

- **Configuration Management** — Centralized settings for scoring, validation, and monitoring
- **Data Validation** — Automated quality checks and coverage reporting
- **Model Monitoring** — Score change detection and anomaly detection
- **Testing Framework** — Unit tests and data contracts
- **Analysis Notebooks** — Exploratory analysis and sensitivity testing
- **Interactive Dashboard** — Real-time data exploration and visualization
- **Data Archiving** — Versioning and reproducibility

---

## 1. Configuration Management

### Overview

All configurable parameters are now centralized in `config.yaml` instead of hardcoded throughout the codebase.

### File: `config.yaml`

Located at the project root. Key sections:

```yaml
scoring:
  weights:          # Metric weights (sum to 1.0)
  score_range:      # Normalization range [0, 100]
  fill_strategy:    # How to handle missing values
  decimal_places:   # Rounding precision

ingestion:
  crime:            # Crime data config
  transport:        # Transport data config
  schools:          # School data config
  greenspace:       # Green space data config
  property:         # Property price data config

validation:
  outlier_std_threshold:    # Z-score for outlier detection
  max_missing_pct:          # Max allowed missing data
  min_suburbs:              # Minimum suburbs for valid run

monitoring:
  track_changes:            # Enable score change detection
  change_threshold_pct:     # Flag changes > 5%
  detect_anomalies:         # Enable anomaly detection
  anomaly_z_score:          # Z-score threshold

archiving:
  enabled:                  # Enable data archiving
  archive_raw_data:         # Archive input files
  keep_snapshots:           # Keep processed data snapshots

reproducibility:
  random_seed: 42           # Fixed seed for reproducibility
```

### Usage

```python
from ingestion.config import get_config

config = get_config()

# Get specific values
weights = config.get_weights()
threshold = config.get_change_threshold_pct()

# Access nested values with dot notation
min_coverage = config.get("ingestion.crime.min_coverage_pct")

# Get entire config
full_config = config.all()
```

**Benefits:**
- ✓ Change parameters without editing code
- ✓ Version config separately from code
- ✓ Different configs for dev/prod
- ✓ Clear audit trail of weight changes

---

## 2. Data Validation

### Overview

Automated validation checks at each stage of the pipeline to catch data issues early.

### Module: `ingestion/validation.py`

#### DataValidator Class

Validates data at three stages:

1. **Metric-Level Validation** — Check individual data sources
2. **Raw Metrics Validation** — Check combined metrics before scoring
3. **Scores Validation** — Check computed scores

#### Example Usage

```python
from ingestion.validation import DataValidator

validator = DataValidator()

# Validate crime data
is_valid, report = validator.validate_metric_data(crime_df, 'crime')

if is_valid:
    print("✓ Crime data passed validation")
else:
    print(f"✗ Issues found: {report['errors']}")
    
# Check coverage
coverage_pct = report['coverage_pct']
if coverage_pct < 90:
    print(f"⚠ Warning: Only {coverage_pct}% coverage")

# Save validation report
validator.save_validation_report()
validator.print_summary()
```

#### Checks Performed

**Data Coverage:**
- % of non-null values per metric
- Suburbs with all-null metrics flagged

**Outlier Detection:**
- Z-score method (default threshold: 3σ)
- Outliers reported by column

**Value Range Validation:**
- Crime rate: 0–500 per 100k
- House prices: 100k–5M AUD
- Green space: 0–100%
- School scores: 0–1300 ICSEA

**Column/Type Checks:**
- Expected columns present
- No duplicate suburb records

**Example Output:**

```
============================================================
DATA VALIDATION SUMMARY
============================================================

CRIME ✓ PASS
  Coverage: 99.7%

TRANSPORT ✓ PASS
  Coverage: 100.0%

SCHOOLS ✗ FAIL
  Coverage: 66.4%
  ⚠ Coverage 66.4% below minimum 90%

GREENSPACE ✓ PASS
  Coverage: 100.0%
  ⚠ Outliers detected: 5 records

PROPERTY ✗ FAIL
  Coverage: 65.8%
  ✗ Coverage 65.8% below minimum 90%
```

---

## 3. Model Monitoring

### Overview

Automatically detect score changes and anomalies across scoring runs to identify data drift.

### Module: `models/monitoring.py`

#### ScoreMonitor Class

Provides three monitoring capabilities:

##### 1. Score Change Detection

Identifies suburbs where scores changed significantly:

```python
from models.monitoring import ScoreMonitor

monitor = ScoreMonitor()

# Fetch previous run scores
previous_scores = monitor.fetch_previous_scores()

# Detect changes (default threshold: 5%)
changes_report = monitor.detect_score_changes(new_scores, previous_scores)

if changes_report['changes_detected']:
    for change in changes_report['changes']:
        print(f"{change['metric']}: {change['suburbs_changed']} suburbs changed")
        for suburb in change['details'][:3]:
            print(f"  {suburb['name']}: {suburb['pct_change']:.1f}% change")
```

**Output Example:**

```
score_crime: 12 suburbs changed
  Canterbury: 8.5% change
  Hawthorn: 7.2% change
  Northcote: 6.8% change
```

##### 2. Anomaly Detection

Identifies unusual suburbs using z-score method:

```python
# Detect anomalies (default threshold: 2.5σ)
anomalies = monitor.detect_anomalies(new_scores)

if anomalies['anomalies_found']:
    for anom in anomalies['anomalies']:
        print(f"{anom['metric']}: {anom['anomaly_count']} anomalies")
```

##### 3. Score Statistics

Compute summary statistics:

```python
stats = monitor.compute_score_statistics(scores_df)

print(f"Mean score: {stats['statistics']['score_total']['mean']:.1f}")
print(f"Std dev: {stats['statistics']['score_total']['std']:.1f}")
```

#### Integration in Scoring Pipeline

Update `models/scoring.py` to include monitoring:

```python
from models.monitoring import ScoreMonitor

def main():
    df = fetch_raw_metrics()
    df = compute_scores(df)
    save_scores(df)
    
    # NEW: Monitor changes
    monitor = ScoreMonitor()
    previous = monitor.fetch_previous_scores()
    monitor.detect_score_changes(df, previous)
    monitor.detect_anomalies(df)
    monitor.compute_score_statistics(df)
    monitor.save_monitoring_report()
    monitor.print_summary()
```

---

## 4. Testing Framework

### Unit Tests

Located in `tests/test_scoring.py`. Tests cover:

- **Weight calculations** — Weights sum to 1.0
- **Normalization** — MinMaxScaler produces [0, 100]
- **Inversions** — Crime/price inversions work correctly
- **Edge cases** — All nulls, single value, identical scores
- **Data contracts** — Expected table structure

#### Running Tests

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test
python -m pytest tests/test_scoring.py::TestScoringLogic::test_weights_sum_to_one -v

# Run with coverage
python -m pytest tests/ --cov=models --cov=ingestion
```

#### Example Test

```python
def test_crime_score_inversion(self):
    """Test that higher crime = lower score."""
    crime_data = np.array([[50], [100], [150]])
    scaler = MinMaxScaler(feature_range=(0, 100))
    normalized = scaler.fit_transform(crime_data)
    inverted = 100 - normalized
    
    # Higher crime should have lower score
    self.assertLess(inverted[2][0], inverted[0][0])
```

---

## 5. Analysis Notebooks

Two Jupyter notebooks for exploratory analysis.

### Notebook 1: `notebooks/01_exploratory_analysis.ipynb`

Comprehensive exploratory data analysis:

- **Data Coverage** — % completeness by metric
- **Distributions** — Histograms of raw metrics
- **Correlations** — Heatmap of metric relationships
- **Score Distribution** — Histogram + box plot of liveability scores
- **Top/Bottom Suburbs** — Ranking analysis

**Run:**

```bash
jupyter notebook notebooks/01_exploratory_analysis.ipynb
```

**Key Insights Generated:**
- Which metrics have best/worst coverage
- Correlation structure (e.g., price ↔ schools?)
- Score distribution shape and outliers
- Top/bottom performers by metric

### Notebook 2: `notebooks/02_sensitivity_analysis.ipynb`

Sensitivity analysis for weight optimization:

- **Weight Perturbation** — Test ±10% weight changes
- **Metric Importance** — Zero-out analysis
- **Ranking Stability** — Top suburbs affected by weight changes
- **Recommendations** — Evidence-based weight suggestions

**Run:**

```bash
jupyter notebook notebooks/02_sensitivity_analysis.ipynb
```

**Output:**
- Impact of each weight change on rankings
- Which metrics are most influential
- Recommended weight adjustments
- Stability of top performers

**Example Finding:**

```
Sensitivity Analysis Summary:

1. Most Influential Metrics:
   - Transport        - 8.3 rank positions
   - Crime            - 7.9 rank positions
   - Affordability    - 6.2 rank positions

2. Weight Recommendations:
   - Current weights are moderately stable
   - Top suburbs remain consistent with ±10% changes
   - Consider increasing affordability weight (currently 15%)
```

---

## 6. Interactive Dashboard

### Overview

Real-time data exploration dashboard built with Streamlit.

### File: `dashboard/app.py`

#### Features

| Tab | Description |
|-----|-------------|
| **Overview** | Summary stats, score distribution, top 10 suburbs |
| **Score Analysis** | Component score breakdowns, weights, statistics |
| **Suburb Comparison** | Multi-select radar charts, detailed comparison tables |
| **Metrics** | Individual metric analysis and correlation plots |
| **System Health** | Data coverage, quality metrics, last run timestamp |

#### Running the Dashboard

```bash
cd dashboard
streamlit run app.py
```

Opens at `http://localhost:8501`

#### Key Visualizations

**Overview Tab:**
```
┌─────────────────────────────────────┐
│ Total Suburbs: 673   Mean: 52.3     │
│ Median: 51.8         Std Dev: 12.4  │
│                                     │
│ [Score Distribution Histogram]      │
│ [Top 10 Suburbs Table]              │
└─────────────────────────────────────┘
```

**Suburb Comparison Tab:**
```
Select multiple suburbs → Radar chart showing:
  - Crime (0-100)
  - Transport (0-100)
  - Schools (0-100)
  - Green Space (0-100)
  - Affordability (0-100)
```

**System Health Tab:**
```
Data Coverage by Metric:
  Crime:        99.7% ✓
  Transport:   100.0% ✓
  Schools:      66.4% ⚠ (below 90% target)
  Green Space: 100.0% ✓
  Property:     65.8% ⚠ (below 90% target)
```

#### Customization

Modify styling in dashboard/app.py:

```python
# Custom CSS
st.markdown("""
    <style>
        .metric-box { background-color: #f0f2f6; }
    </style>
""", unsafe_allow_html=True)
```

#### Performance Optimization

- Data loaded with `@st.cache_data` decorator
- Caching expires automatically
- Clear cache with Ctrl+R in streamlit

---

## 7. Data Archiving & Versioning

### Overview

Automatic archiving of raw and processed data for audit trails and reproducibility.

### Module: `ingestion/archiving.py`

#### Features

- **Raw Data Archiving** — Archive source files with metadata
- **Snapshot Creation** — Version processed data (parquet format)
- **Integrity Checking** — MD5 hash of all files
- **Cleanup Policies** — Automatic retention management
- **Archive Statistics** — Report on stored data

#### Usage

```python
from ingestion.archiving import DataArchiver

archiver = DataArchiver()

# Archive raw data
archive_path = archiver.archive_raw_data(
    metric_name="crime",
    source_file=Path("data/inbound/crime_2024.csv"),
    metadata={"year": 2024, "source": "Crime Stats Agency"}
)

# Create snapshot of processed data
snapshot_path = archiver.snapshot_processed_data("raw_metrics", df)

# Get archive history
history = archiver.get_archive_history("crime")
print(f"{len(history)} versions of crime data archived")

# Load latest snapshot
df = archiver.get_latest_snapshot("raw_metrics")

# Cleanup old archives (keep only 90 days)
archiver.cleanup_old_archives(days_to_keep=90)

# Print statistics
from ingestion.archiving import print_archive_report
print_archive_report()
```

#### Output Example

```
============================================================
DATA ARCHIVE REPORT
============================================================

Archive Location: data/archive
Snapshot Location: data/processed/snapshots

Metrics Archived: 5
Total Versions: 127
Total Size: 45.3 MB

By Metric:
  crime                -  31 versions, 8.4 MB, Latest: 2024-04-10T10:30
  transport            -  28 versions, 12.1 MB, Latest: 2024-04-10T10:25
  schools              -  26 versions, 6.2 MB, Latest: 2024-04-10T10:20
  greenspace           -  22 versions, 11.8 MB, Latest: 2024-04-10T10:15
  property             -  20 versions, 6.8 MB, Latest: 2024-04-10T10:10

============================================================
```

#### File Structure

```
data/
├── archive/
│   ├── crime/
│   │   ├── 2024-04-10T10-30-15/
│   │   │   ├── crime_2024.csv
│   │   │   └── metadata.json
│   │   └── 2024-04-09T10-30-15/
│   │       └── ...
│   ├── transport/
│   └── ...
│
└── processed/
    └── snapshots/
        ├── raw_metrics_2024-04-10T10-30-15.parquet
        ├── raw_metrics_2024-04-10T10-30-15_metadata.json
        └── ...
```

#### Metadata Examples

**Raw Data Archive:**
```json
{
  "timestamp": "2024-04-10T10:30:15.123456",
  "metric": "crime",
  "source_file": "data/inbound/crime_2024.csv",
  "archive_file": "data/archive/crime/2024-04-10T10-30-15/crime_2024.csv",
  "file_hash": "a1b2c3d4e5f6...",
  "file_size_bytes": 245821,
  "custom_metadata": {
    "year": 2024,
    "source": "Crime Statistics Agency Victoria",
    "rows": 673
  }
}
```

**Processed Data Snapshot:**
```json
{
  "timestamp": "2024-04-10T10:30:15.123456",
  "data_type": "raw_metrics",
  "snapshot_file": "data/processed/snapshots/raw_metrics_2024-04-10T10-30-15.parquet",
  "rows": 673,
  "columns": ["suburb_id", "name", "rate_per_100k", ...],
  "file_hash": "x9y8z7w6v5u4...",
  "dtypes": {
    "suburb_id": "int64",
    "rate_per_100k": "float64"
  }
}
```

---

## 8. Integration Guide

### Complete Workflow

Update `models/scoring.py` to use all new tools:

```python
"""
Enhanced scoring with validation, monitoring, and archiving.
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from ingestion.base import get_db_connection
from ingestion.config import get_config
from ingestion.validation import DataValidator
from ingestion.archiving import DataArchiver
from models.monitoring import ScoreMonitor

def main():
    config = get_config()
    validator = DataValidator()
    archiver = DataArchiver()
    monitor = ScoreMonitor()
    
    # Set random seed for reproducibility
    np.random.seed(config.get_random_seed())
    
    print("=" * 60)
    print("MELBOURNE LIVEABILITY SCORING PIPELINE")
    print("=" * 60)
    
    # 1. FETCH DATA
    print("\n[1/6] Fetching raw metrics...")
    df = fetch_raw_metrics()
    
    # 2. VALIDATE
    print("\n[2/6] Validating data...")
    is_valid, report = validator.validate_raw_metrics(df)
    if not is_valid:
        print("⚠ Validation warnings detected")
    
    # 3. ARCHIVE RAW SNAPSHOT
    print("\n[3/6] Archiving data...")
    archiver.snapshot_processed_data("raw_metrics", df)
    
    # 4. COMPUTE SCORES
    print("\n[4/6] Computing scores...")
    df = compute_scores(df)
    
    # 5. VALIDATE SCORES
    print("\n[5/6] Validating scores...")
    validator.validate_scores(df)
    
    # 6. MONITOR CHANGES
    print("\n[6/6] Monitoring score changes...")
    previous = monitor.fetch_previous_scores()
    monitor.detect_score_changes(df, previous)
    monitor.detect_anomalies(df)
    monitor.compute_score_statistics(df)
    
    # SAVE ALL
    print("\nSaving results...")
    save_scores(df)
    archiver.snapshot_processed_data("computed_scores", df)
    validator.save_validation_report()
    monitor.save_monitoring_report()
    
    # PRINT SUMMARIES
    validator.print_summary()
    monitor.print_summary()
    
    print("\n✓ Pipeline completed successfully\n")

if __name__ == "__main__":
    main()
```

### Running the Complete Pipeline

```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Run ingestion and scoring
python models/scoring.py

# 3. View validation & monitoring reports
cat data/processed/validation_report.json
cat data/processed/monitoring_report.json

# 4. Run tests
python -m pytest tests/ -v

# 5. Launch dashboard
streamlit run dashboard/app.py

# 6. Explore in Jupyter
jupyter notebook notebooks/
```

---

## 9. Best Practices

### Configuration Management
- ✓ Always update `config.yaml` for weight changes, not code
- ✓ Version control `config.yaml` separately
- ✓ Document why weights changed in commit messages

### Data Validation
- ✓ Always validate before and after major changes
- ✓ Set minimum coverage thresholds based on your requirements
- ✓ Archive validation reports for audit trail

### Monitoring
- ✓ Review monitoring reports after each run
- ✓ Investigate sudden score changes (likely data issue)
- ✓ Track anomalies for potential data quality problems

### Testing
- ✓ Run tests before deploying scoring changes
- ✓ Add tests for new metrics or weight schemes
- ✓ Maintain >80% code coverage in scoring module

### Reproducibility
- ✓ Always set random seeds (handled in config)
- ✓ Archive raw data before processing
- ✓ Keep snapshot of scores at key milestones
- ✓ Document data source versions and update dates

### Performance
- ✓ Use parquet format for large data snapshots
- ✓ Cache expensive computations
- ✓ Archive old data periodically (90-day default)

---

## 10. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **High validation failure rate** | Check data source for schema changes |
| **Sudden score changes** | Check monitoring report; investigate data drift |
| **Dashboard is slow** | Clear cache (Ctrl+R) or reduce date range |
| **Archive growing too large** | Run cleanup: `archiver.cleanup_old_archives(30)` |
| **Tests failing** | Check numpy/sklearn versions in requirements |

### Debug Commands

```bash
# Check data coverage
python -c "
from ingestion.validation import DataValidator
from models.scoring import fetch_raw_metrics
df = fetch_raw_metrics()
validator = DataValidator()
validator.validate_raw_metrics(df)
validator.print_summary()
"

# View archive statistics
python -c "
from ingestion.archiving import print_archive_report
print_archive_report()
"

# Check config
python -c "
from ingestion.config import get_config
import json
config = get_config()
print(json.dumps(config.all(), indent=2))
"
```

---

## Summary

This data science infrastructure provides:

✅ **Centralized Configuration** — All parameters in one place
✅ **Automated Validation** — Catch data issues early
✅ **Change Tracking** — Monitor score stability
✅ **Comprehensive Testing** — Verify scoring logic
✅ **Interactive Analysis** — Dashboard for exploration
✅ **Reproducibility** — Archive data and versions
✅ **Clear Documentation** — This guide!

For questions or improvements, see the project README.
