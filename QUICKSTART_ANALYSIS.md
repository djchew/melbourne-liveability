# Quick Start: Data Science Workflows

Fast reference guide for common data science tasks.

## 1. Run Full Pipeline with Validation & Monitoring

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run scoring with all checks
python models/scoring.py

# View reports
cat data/processed/validation_report.json    # Data quality checks
cat data/processed/monitoring_report.json    # Score changes & anomalies
```

## 2. Check Data Quality

```bash
python -c "
from ingestion.validation import DataValidator
from models.scoring import fetch_raw_metrics

df = fetch_raw_metrics()
validator = DataValidator()
validator.validate_raw_metrics(df)
validator.print_summary()
"
```

## 3. View Archive Statistics

```bash
python -c "
from ingestion.archiving import print_archive_report
print_archive_report()
"
```

## 4. Explore Data in Notebooks

```bash
# Start Jupyter
jupyter notebook

# Open notebooks/01_exploratory_analysis.ipynb
# Run cells for:
#  - Data coverage analysis
#  - Score distributions
#  - Metric correlations
#  - Top/bottom suburbs
```

## 5. Sensitivity Analysis

```bash
# Open notebooks/02_sensitivity_analysis.ipynb
# Tests impact of weight changes on rankings
# Identifies most important metrics
# Recommends weight adjustments
```

## 6. Launch Interactive Dashboard

```bash
cd dashboard
streamlit run app.py

# Opens at http://localhost:8501
# Features:
#  - Overview tab: summary stats & distributions
#  - Score analysis: component breakdown
#  - Suburb comparison: radar charts
#  - Metrics: individual metric analysis
#  - System health: data quality metrics
```

## 7. Run Tests

```bash
# All tests
python -m pytest tests/ -v

# Specific test
python -m pytest tests/test_scoring.py::TestScoringLogic::test_weights_sum_to_one -v

# With coverage
python -m pytest tests/ --cov=models --cov=ingestion
```

## 8. Modify Weights

**Before:** Edit code in `models/scoring.py`
**Now:** Edit `config.yaml`

```yaml
# config.yaml
scoring:
  weights:
    score_crime: 0.30        # Changed from 0.25
    score_transport: 0.25
    score_schools: 0.15      # Changed from 0.20
    score_greenspace: 0.15
    score_affordability: 0.15
```

Then run:
```bash
python models/scoring.py  # Uses new weights automatically
```

## 9. Archive Data

```python
from ingestion.archiving import DataArchiver

archiver = DataArchiver()

# Archive raw data
archiver.archive_raw_data(
    metric_name="crime",
    source_file=Path("data/inbound/crime_2024.csv"),
    metadata={"year": 2024}
)

# Create processed data snapshot
archiver.snapshot_processed_data("raw_metrics", df)

# Get history
history = archiver.get_archive_history("crime")
print(f"{len(history)} versions archived")

# Cleanup old archives (keep 90 days)
archiver.cleanup_old_archives(days_to_keep=90)
```

## 10. Load from Previous Snapshot

```python
from ingestion.archiving import DataArchiver

archiver = DataArchiver()
df = archiver.get_latest_snapshot("raw_metrics")
print(f"Loaded snapshot with {len(df)} suburbs")
```

---

## File Structure

```
melbourne-liveability/
├── config.yaml                        # ← NEW: All configuration
├── DATA_SCIENCE_GUIDE.md             # ← NEW: Complete guide
├── QUICKSTART_ANALYSIS.md            # ← NEW: This file
│
├── ingestion/
│   ├── config.py                     # ← NEW: Config loader
│   ├── validation.py                 # ← NEW: Data validation
│   ├── archiving.py                  # ← NEW: Data archiving
│   └── [existing modules]
│
├── models/
│   ├── monitoring.py                 # ← NEW: Score monitoring
│   └── scoring.py                    # Enhanced with validation
│
├── tests/
│   ├── test_scoring.py              # ← NEW: Unit tests
│   └── __init__.py
│
├── notebooks/
│   ├── 01_exploratory_analysis.ipynb       # ← NEW
│   └── 02_sensitivity_analysis.ipynb       # ← NEW
│
├── dashboard/
│   ├── app.py                       # ← NEW: Streamlit dashboard
│   └── __init__.py
│
├── data/
│   ├── archive/                     # ← NEW: Archived raw data
│   └── processed/
│       ├── snapshots/               # ← NEW: Processed data versions
│       ├── validation_report.json   # ← NEW: Data quality report
│       └── monitoring_report.json   # ← NEW: Score changes report
```

---

## Configuration Hierarchy

```
1. config.yaml (highest priority)
2. Environment variables (can override config.yaml)
3. Hardcoded defaults (fallback)
```

Example:

```python
from ingestion.config import get_config
config = get_config()

# Reads from config.yaml
weights = config.get_weights()

# Or access specific values
crime_weight = config.get("scoring.weights.score_crime")
```

---

## Performance Tips

| Task | Tip |
|------|-----|
| Dashboard slow? | Clear cache: Ctrl+R in Streamlit |
| Data loading slow? | Use parquet snapshots instead of CSV |
| Archive growing large? | Run cleanup: `archiver.cleanup_old_archives(30)` |
| Tests taking too long? | Run specific test file: `pytest tests/test_scoring.py -v` |

---

## Key Metrics & Thresholds

From `config.yaml`:

```yaml
validation:
  outlier_std_threshold: 3.0          # Flag values > 3 std devs from mean
  max_missing_pct: 40                 # Fail if >40% data missing
  min_suburbs: 400                    # Fail if <400 suburbs
  
  value_ranges:
    rate_per_100k: [0, 500]           # Crime rate bounds
    stop_count: [0, 1000]             # Transit stops
    avg_icsea_score: [0, 1300]        # School scores
    green_pct_of_suburb: [0, 100]     # Green space %
    median_house_price: [100000, 5000000]  # Housing price AUD

monitoring:
  change_threshold_pct: 5             # Flag score changes > 5%
  anomaly_z_score: 2.5                # Flag z-scores > 2.5
```

---

## Common Commands

```bash
# Full pipeline
python models/scoring.py

# Quick data check
python -m ingestion.validation

# Dashboard
streamlit run dashboard/app.py

# Jupyter notebooks
jupyter notebook

# Run all tests
python -m pytest tests/ -v

# View archive
python -c "from ingestion.archiving import print_archive_report; print_archive_report()"

# Check configuration
python -c "from ingestion.config import get_config; import json; print(json.dumps(get_config().all(), indent=2))"
```

---

## When to Use Each Tool

| Tool | When | Example |
|------|------|---------|
| **Config** | Before running pipeline | Change weights |
| **Validation** | After ingestion | Check data quality |
| **Monitoring** | After scoring | Detect score drift |
| **Tests** | Before deployment | Verify scoring logic |
| **Notebooks** | Exploratory analysis | Understand distributions |
| **Dashboard** | Daily check-in | Verify everything looks normal |
| **Archiving** | After successful run | Keep audit trail |

---

## Next Steps

1. ✅ **Install dependencies** — `pip install -r backend/requirements.txt`
2. ✅ **Run full pipeline** — `python models/scoring.py`
3. ✅ **Check validation** — View `data/processed/validation_report.json`
4. ✅ **Launch dashboard** — `streamlit run dashboard/app.py`
5. ✅ **Explore notebooks** — `jupyter notebook notebooks/`
6. ✅ **Read guide** — `DATA_SCIENCE_GUIDE.md` for details

Enjoy! 🚀
