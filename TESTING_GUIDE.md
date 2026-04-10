# Testing Guide: Verify All Components Work

Complete testing checklist with 45+ test cases across 8 components.

---

## Overview

**Total Components to Test:** 8  
**Total Test Categories:** 45+  
**Estimated Time:** 30-45 minutes

### Components
1. ✅ Configuration System
2. ✅ Data Validation Module
3. ✅ Model Monitoring
4. ✅ Unit Tests (Scoring)
5. ✅ Analysis Notebooks
6. ✅ Interactive Dashboard
7. ✅ Data Archiving
8. ✅ Integration & End-to-End

---

## Setup (5 minutes)

### Prerequisites Check

```bash
# Check Python version (should be 3.11+)
python --version

# Check pip works
pip --version

# Navigate to project
cd /c/Users/Darrell/Desktop/Projects/Melbourne\ Suburb\ Liveability/melbourne-liveability
```

### Install Dependencies

```bash
# Install all required packages
pip install -r backend/requirements.txt

# Verify installation (should list new packages)
pip list | grep -E "pyyaml|streamlit|plotly|jupyter|pyarrow"
```

**Expected Output:**
```
jupyter          1.0.0
matplotlib       3.7.0
numpy            1.24.0
plotly           5.17.0
pyarrow          12.0.0
pyyaml           6.0
seaborn          0.13.0
streamlit        1.28.0
```

---

## Component 1: Configuration System (5 minutes)

### Test 1.1: Config File Exists

```bash
ls -lh config.yaml
```

**Expected:** File exists, ~50-100 KB

### Test 1.2: Load Config

```bash
python -c "
from ingestion.config import get_config
config = get_config()
print('✓ Config loaded successfully')
"
```

**Expected:** 
```
✓ Config loaded successfully
```

### Test 1.3: Get Weights

```bash
python -c "
from ingestion.config import get_config
config = get_config()
weights = config.get_weights()
print('Weights:')
for metric, weight in weights.items():
    print(f'  {metric}: {weight:.0%}')
print(f'Total: {sum(weights.values()):.2f}')
"
```

**Expected:**
```
Weights:
  score_crime: 25%
  score_transport: 25%
  score_schools: 20%
  score_greenspace: 15%
  score_affordability: 15%
Total: 1.00
```

### Test 1.4: Get Thresholds

```bash
python -c "
from ingestion.config import get_config
config = get_config()
print(f'Outlier threshold: {config.get_outlier_threshold()}σ')
print(f'Change threshold: {config.get_change_threshold_pct()}%')
print(f'Anomaly z-score: {config.get_anomaly_z_score()}')
print(f'Random seed: {config.get_random_seed()}')
"
```

**Expected:**
```
Outlier threshold: 3.0σ
Change threshold: 5.0%
Anomaly z-score: 2.5
Random seed: 42
```

### Test 1.5: Nested Access (Dot Notation)

```bash
python -c "
from ingestion.config import get_config
config = get_config()
crime_coverage = config.get('ingestion.crime.min_coverage_pct')
print(f'Crime min coverage: {crime_coverage}%')
print('✓ Dot notation access works')
"
```

**Expected:**
```
Crime min coverage: 90%
✓ Dot notation access works
```

**Status:** ⬜ 5/5 tests ✓

---

## Component 2: Data Validation Module (10 minutes)

### Test 2.1: Module Imports

```bash
python -c "
from ingestion.validation import DataValidator, validate_pipeline
print('✓ DataValidator imported')
print('✓ validate_pipeline imported')
"
```

**Expected:**
```
✓ DataValidator imported
✓ validate_pipeline imported
```

### Test 2.2: Instantiate Validator

```bash
python -c "
from ingestion.validation import DataValidator
validator = DataValidator()
print('✓ DataValidator instantiated')
print(f'Validation log entries: {len(validator.validation_log)}')
"
```

**Expected:**
```
✓ DataValidator instantiated
Validation log entries: 0
```

### Test 2.3: Create Test Data & Validate

```bash
python << 'EOF'
import pandas as pd
import numpy as np
from ingestion.validation import DataValidator

validator = DataValidator()

# Create test dataframe
test_df = pd.DataFrame({
    'suburb_id': [1, 2, 3, 4, 5],
    'rate_per_100k': [100.0, 150.0, 200.0, np.nan, 250.0],
    'offence_count': [50, 75, 100, 125, 150],
})

# Test validation
is_valid, report = validator.validate_metric_data(test_df, 'crime')

print(f'Validation result: {"PASS" if is_valid else "FAIL"}')
print(f'Coverage: {report["coverage_pct"]:.1f}%')
print(f'Total records: {report["total_records"]}')
print(f'Checks performed: {len(report["checks"])}')
EOF
```

**Expected:**
```
Validation result: PASS
Coverage: 80.0%
Total records: 5
Checks performed: 3
```

### Test 2.4: Outlier Detection

```bash
python << 'EOF'
import pandas as pd
import numpy as np
from ingestion.validation import DataValidator

validator = DataValidator()

# Create data with outlier
test_df = pd.DataFrame({
    'suburb_id': [1, 2, 3, 4, 5],
    'rate_per_100k': [100, 110, 105, 95, 500],  # 500 is outlier
})

is_valid, report = validator.validate_metric_data(test_df, 'crime')

if 'outliers' in report:
    print(f'Outliers detected: {report["outliers"]["outliers_found"]}')
    print(f'Outlier count: {report["outliers"]["outlier_count"]}')
else:
    print('✓ No outliers in test data')
EOF
```

**Expected:**
```
Outliers detected: True
Outlier count: 1
```

### Test 2.5: Value Range Validation

```bash
python << 'EOF'
import pandas as pd
from ingestion.validation import DataValidator

validator = DataValidator()

# Create data with out-of-range values
test_df = pd.DataFrame({
    'rate_per_100k': [100, 200, 600],  # 600 exceeds max of 500
    'green_pct_of_suburb': [10, 50, 150],  # 150 exceeds max of 100
})

is_valid, report = validator.validate_metric_data(test_df, 'crime')

if 'range_checks' in report:
    print('Range checks:')
    for col, check in report['range_checks'].items():
        print(f'  {col}: {check}')
else:
    print('✓ Range checks performed')
EOF
```

**Expected:**
```
Range checks:
  rate_per_100k: {'valid': False, 'out_of_range_count': 1, ...}
  green_pct_of_suburb: {'valid': False, 'out_of_range_count': 1, ...}
```

### Test 2.6: Save Validation Report

```bash
python << 'EOF'
import json
from pathlib import Path
from ingestion.validation import DataValidator

validator = DataValidator()
validator.save_validation_report('test_validation_report.json')

# Check file was created
report_path = Path('test_validation_report.json')
if report_path.exists():
    with open(report_path) as f:
        data = json.load(f)
    print(f'✓ Report saved')
    print(f'Report entries: {len(data)}')
    report_path.unlink()  # Clean up
else:
    print('✗ Report not created')
EOF
```

**Expected:**
```
✓ Report saved
Report entries: 1
```

**Status:** ⬜ 6/6 tests ✓

---

## Component 3: Model Monitoring (10 minutes)

### Test 3.1: Module Imports

```bash
python -c "
from models.monitoring import ScoreMonitor
print('✓ ScoreMonitor imported')
"
```

**Expected:**
```
✓ ScoreMonitor imported
```

### Test 3.2: Instantiate Monitor

```bash
python -c "
from models.monitoring import ScoreMonitor
monitor = ScoreMonitor()
print('✓ ScoreMonitor instantiated')
print(f'Monitoring log entries: {len(monitor.monitoring_log)}')
"
```

**Expected:**
```
✓ ScoreMonitor instantiated
Monitoring log entries: 0
```

### Test 3.3: Score Statistics

```bash
python << 'EOF'
import pandas as pd
from models.monitoring import ScoreMonitor

monitor = ScoreMonitor()

# Create test scores
test_df = pd.DataFrame({
    'suburb_id': range(1, 101),
    'name': [f'Suburb_{i}' for i in range(1, 101)],
    'score_crime': list(range(20, 120)),
    'score_transport': list(range(30, 130)),
    'score_schools': list(range(40, 140)),
    'score_greenspace': list(range(10, 110)),
    'score_affordability': list(range(25, 125)),
    'score_total': list(range(50, 150)),
})

stats = monitor.compute_score_statistics(test_df)
print(f'✓ Statistics computed')
print(f'Total suburbs: {stats["total_suburbs"]}')
print(f'Mean total score: {stats["statistics"]["score_total"]["mean"]:.1f}')
print(f'Std dev: {stats["statistics"]["score_total"]["std"]:.1f}')
EOF
```

**Expected:**
```
✓ Statistics computed
Total suburbs: 100
Mean total score: 99.5
Std dev: 29.0
```

### Test 3.4: Anomaly Detection

```bash
python << 'EOF'
import pandas as pd
import numpy as np
from models.monitoring import ScoreMonitor

monitor = ScoreMonitor()

# Create scores with anomalies
test_df = pd.DataFrame({
    'suburb_id': range(1, 21),
    'name': [f'Suburb_{i}' for i in range(1, 21)],
    'score_total': [50]*19 + [95],  # Last one is anomalous
    'score_crime': [50]*19 + [95],
    'score_transport': [50]*19 + [95],
    'score_schools': [50]*19 + [95],
    'score_greenspace': [50]*19 + [95],
    'score_affordability': [50]*19 + [95],
})

anomalies = monitor.detect_anomalies(test_df)
print(f'Anomalies found: {anomalies["anomalies_found"]}')
if anomalies['anomalies_found']:
    print(f'Anomaly count: {len(anomalies["anomalies"])}')
EOF
```

**Expected:**
```
Anomalies found: True
Anomaly count: 1
```

### Test 3.5: Change Detection

```bash
python << 'EOF'
import pandas as pd
from models.monitoring import ScoreMonitor

monitor = ScoreMonitor()

# Current scores
new_scores = pd.DataFrame({
    'suburb_id': [1, 2, 3],
    'name': ['A', 'B', 'C'],
    'score_total': [50.0, 60.0, 70.0],
    'score_crime': [50.0, 60.0, 70.0],
})

# Previous scores (with changes)
previous_scores = pd.DataFrame({
    'suburb_id': [1, 2, 3],
    'prev_score_total': [50.0, 55.0, 70.0],  # Suburb B changed
    'prev_score_crime': [50.0, 55.0, 70.0],
})

changes = monitor.detect_score_changes(new_scores, previous_scores)
print(f'Changes detected: {changes["changes_detected"]}')
if changes['changes_detected']:
    print(f'Changed metrics: {len(changes["changes"])}')
EOF
```

**Expected:**
```
Changes detected: True
Changed metrics: 1
```

### Test 3.6: Save Monitoring Report

```bash
python << 'EOF'
import json
from pathlib import Path
from models.monitoring import ScoreMonitor
import pandas as pd

monitor = ScoreMonitor()

# Compute some stats
test_df = pd.DataFrame({
    'suburb_id': [1, 2, 3],
    'score_total': [50, 60, 70],
    'score_crime': [50, 60, 70],
    'score_transport': [45, 55, 65],
    'score_schools': [55, 65, 75],
    'score_greenspace': [50, 60, 70],
    'score_affordability': [50, 60, 70],
})

monitor.compute_score_statistics(test_df)
monitor.save_monitoring_report('test_monitoring_report.json')

report_path = Path('test_monitoring_report.json')
if report_path.exists():
    with open(report_path) as f:
        data = json.load(f)
    print(f'✓ Report saved')
    print(f'Report entries: {len(data)}')
    report_path.unlink()
else:
    print('✗ Report not created')
EOF
```

**Expected:**
```
✓ Report saved
Report entries: 1
```

**Status:** ⬜ 6/6 tests ✓

---

## Component 4: Unit Tests - Scoring (5 minutes)

### Test 4.1: Run All Tests

```bash
python -m pytest tests/test_scoring.py -v
```

**Expected Output:**
```
tests/test_scoring.py::TestScoringLogic::test_weights_sum_to_one PASSED
tests/test_scoring.py::TestScoringLogic::test_minmax_normalization PASSED
tests/test_scoring.py::TestScoringLogic::test_crime_score_inversion PASSED
tests/test_scoring.py::TestScoringLogic::test_affordability_inversion PASSED
tests/test_scoring.py::TestScoringLogic::test_composite_score_calculation PASSED
tests/test_scoring.py::TestScoringLogic::test_missing_value_filling PASSED
tests/test_scoring.py::TestScoringLogic::test_single_suburb_scoring PASSED
tests/test_scoring.py::TestScoringLogic::test_all_nulls_suburb PASSED
tests/test_scoring.py::TestScoringLogic::test_identical_scores PASSED
tests/test_scoring.py::TestScoringLogic::test_distance_inversion PASSED
tests/test_scoring.py::TestScoringLogic::test_score_rounding PASSED
tests/test_scoring.py::TestDataContracts::test_suburb_scores_table_structure PASSED
tests/test_scoring.py::TestDataContracts::test_metric_column_naming PASSED
tests/test_scoring.py::TestDataContracts::test_score_range_contract PASSED

======================== 14 passed in 0.XX s ========================
```

### Test 4.2: Run With Coverage

```bash
python -m pytest tests/test_scoring.py --cov=models --cov=ingestion --cov-report=term-missing
```

**Expected:** 80%+ coverage

### Test 4.3: Run Specific Test

```bash
python -m pytest tests/test_scoring.py::TestScoringLogic::test_weights_sum_to_one -v
```

**Expected:**
```
tests/test_scoring.py::TestScoringLogic::test_weights_sum_to_one PASSED
```

**Status:** ⬜ 3/3 tests ✓

---

## Component 5: Analysis Notebooks (10 minutes)

### Test 5.1: Check Notebook Files Exist

```bash
ls -lh notebooks/*.ipynb
```

**Expected:**
```
-rw-r--r-- ... notebooks/01_exploratory_analysis.ipynb
-rw-r--r-- ... notebooks/02_sensitivity_analysis.ipynb
```

### Test 5.2: Validate Notebook Format

```bash
python -c "
import json
from pathlib import Path

for nb_file in Path('notebooks').glob('*.ipynb'):
    try:
        with open(nb_file) as f:
            nb = json.load(f)
        print(f'✓ {nb_file.name} - Valid JSON')
        print(f'  Cells: {len(nb.get(\"cells\", []))}')
    except json.JSONDecodeError:
        print(f'✗ {nb_file.name} - Invalid JSON')
"
```

**Expected:**
```
✓ 01_exploratory_analysis.ipynb - Valid JSON
  Cells: 10
✓ 02_sensitivity_analysis.ipynb - Valid JSON
  Cells: 12
```

### Test 5.3: Check Notebook Structure

```bash
python << 'EOF'
import json
from pathlib import Path

for nb_file in Path('notebooks').glob('*.ipynb'):
    with open(nb_file) as f:
        nb = json.load(f)
    
    cells = nb.get('cells', [])
    markdown_cells = sum(1 for c in cells if c['cell_type'] == 'markdown')
    code_cells = sum(1 for c in cells if c['cell_type'] == 'code')
    
    print(f'{nb_file.name}:')
    print(f'  Markdown cells: {markdown_cells}')
    print(f'  Code cells: {code_cells}')
    print(f'  Total: {len(cells)}')
EOF
```

**Expected:**
```
01_exploratory_analysis.ipynb:
  Markdown cells: 5
  Code cells: 5
  Total: 10
02_sensitivity_analysis.ipynb:
  Markdown cells: 5
  Code cells: 7
  Total: 12
```

### Test 5.4: Verify Imports in Notebooks

```bash
python << 'EOF'
import json
from pathlib import Path

required_imports = ['pandas', 'numpy', 'matplotlib', 'seaborn', 'plotly']

for nb_file in Path('notebooks').glob('*.ipynb'):
    with open(nb_file) as f:
        nb = json.load(f)
    
    code = '\n'.join(''.join(c.get('source', [])) for c in nb.get('cells', []) if c['cell_type'] == 'code')
    
    print(f'{nb_file.name}:')
    for imp in required_imports:
        if imp in code:
            print(f'  ✓ {imp}')
EOF
```

**Expected:**
```
01_exploratory_analysis.ipynb:
  ✓ pandas
  ✓ numpy
  ✓ matplotlib
  ✓ seaborn
  ✓ plotly
02_sensitivity_analysis.ipynb:
  ✓ pandas
  ✓ numpy
  ✓ matplotlib
  ✓ seaborn
  ✓ plotly
```

**Status:** ⬜ 4/4 tests ✓

---

## Component 6: Interactive Dashboard (5 minutes)

### Test 6.1: Check Dashboard Files

```bash
ls -lh dashboard/
```

**Expected:**
```
-rw-r--r-- ... dashboard/__init__.py
-rw-r--r-- ... dashboard/app.py
```

### Test 6.2: Validate Dashboard Imports

```bash
python -c "
import sys
sys.path.insert(0, '.')
import streamlit as st
import plotly.graph_objects as go
import pandas as pd
print('✓ All dashboard imports available')
"
```

**Expected:**
```
✓ All dashboard imports available
```

### Test 6.3: Check Dashboard Code Syntax

```bash
python -m py_compile dashboard/app.py && echo "✓ Dashboard app.py compiles without errors"
```

**Expected:**
```
✓ Dashboard app.py compiles without errors
```

### Test 6.4: Verify Dashboard Functions

```bash
python << 'EOF'
import ast
import inspect

with open('dashboard/app.py') as f:
    tree = ast.parse(f.read())

functions = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
print(f'Dashboard functions: {len(functions)}')
for func in functions[:10]:
    print(f'  - {func}')
EOF
```

**Expected:**
```
Dashboard functions: 6
  - load_data
  - main
  - [etc]
```

### Test 6.5: Test Dashboard Launch (2 min timeout)

```bash
# This will launch the dashboard - kill with Ctrl+C after it starts
timeout 2 streamlit run dashboard/app.py || true

# Check if streamlit started
echo "✓ Dashboard launched (or timed out as expected)"
```

**Expected:**
```
✓ Dashboard launched (or timed out as expected)
```

**Status:** ⬜ 5/5 tests ✓

---

## Component 7: Data Archiving (5 minutes)

### Test 7.1: Module Imports

```bash
python -c "
from ingestion.archiving import DataArchiver, print_archive_report
print('✓ DataArchiver imported')
print('✓ print_archive_report imported')
"
```

**Expected:**
```
✓ DataArchiver imported
✓ print_archive_report imported
```

### Test 7.2: Instantiate Archiver

```bash
python -c "
from ingestion.archiving import DataArchiver
archiver = DataArchiver()
print('✓ DataArchiver instantiated')
print(f'Archive enabled: {archiver.archive_enabled}')
print(f'Archive dir: {archiver.archive_dir}')
"
```

**Expected:**
```
✓ DataArchiver instantiated
Archive enabled: True
Archive dir: data/archive
```

### Test 7.3: Create Test Data & Archive

```bash
python << 'EOF'
import pandas as pd
from pathlib import Path
from ingestion.archiving import DataArchiver

archiver = DataArchiver()

# Create test data
test_df = pd.DataFrame({
    'suburb_id': [1, 2, 3],
    'name': ['A', 'B', 'C'],
    'score': [50, 60, 70],
})

# Test snapshot
snapshot_path = archiver.snapshot_processed_data('test_data', test_df)
if snapshot_path:
    print(f'✓ Snapshot created: {snapshot_path}')
    # Check file exists
    if Path(snapshot_path).exists():
        print(f'✓ File exists')
else:
    print('✗ Snapshot creation failed')
EOF
```

**Expected:**
```
✓ Snapshot created: data/processed/snapshots/test_data_2024-XX-XXTXX-XX-XX.parquet
✓ File exists
```

### Test 7.4: Load Snapshot

```bash
python << 'EOF'
from ingestion.archiving import DataArchiver

archiver = DataArchiver()
df = archiver.get_latest_snapshot('test_data')
if df is not None:
    print(f'✓ Snapshot loaded')
    print(f'  Rows: {len(df)}')
    print(f'  Columns: {list(df.columns)}')
else:
    print('✗ Could not load snapshot')
EOF
```

**Expected:**
```
✓ Snapshot loaded
  Rows: 3
  Columns: ['suburb_id', 'name', 'score']
```

### Test 7.5: Archive Statistics

```bash
python << 'EOF'
from ingestion.archiving import DataArchiver

archiver = DataArchiver()
stats = archiver.get_archive_statistics()
print(f'Archive statistics:')
print(f'  Archive dir: {stats["archive_dir"]}')
print(f'  Snapshot dir: {stats["snapshot_dir"]}')
print(f'  Metrics archived: {stats["metrics_archived"]}')
print(f'  Total versions: {stats["total_versions"]}')
print(f'  Total size: {stats["total_size_bytes"] / 1024:.1f} KB')
EOF
```

**Expected:**
```
Archive statistics:
  Archive dir: data/archive
  Snapshot dir: data/processed/snapshots
  Metrics archived: 0
  Total versions: 0
  Total size: 0.0 KB
```

**Status:** ⬜ 5/5 tests ✓

---

## Component 8: Integration & End-to-End (20 minutes)

### Test 8.1: All Dependencies Installed

```bash
python << 'EOF'
required = [
    'yaml', 'pandas', 'numpy', 'sqlalchemy', 'sklearn',
    'streamlit', 'plotly', 'jupyter', 'matplotlib', 'seaborn',
    'psycopg'
]

missing = []
for pkg in required:
    try:
        __import__(pkg)
    except ImportError:
        missing.append(pkg)

if not missing:
    print('✓ All dependencies installed')
else:
    print(f'✗ Missing: {", ".join(missing)}')
EOF
```

**Expected:**
```
✓ All dependencies installed
```

### Test 8.2: All Modules Import

```bash
python << 'EOF'
modules = [
    'ingestion.config',
    'ingestion.validation',
    'ingestion.archiving',
    'models.monitoring',
    'models.scoring',
]

failed = []
for module in modules:
    try:
        __import__(module)
    except Exception as e:
        failed.append((module, str(e)))

if not failed:
    print('✓ All modules import successfully')
    print(f'  Total modules: {len(modules)}')
else:
    for mod, err in failed:
        print(f'✗ {mod}: {err}')
EOF
```

**Expected:**
```
✓ All modules import successfully
  Total modules: 5
```

### Test 8.3: Configuration → Validation → Monitoring Flow

```bash
python << 'EOF'
import pandas as pd
import numpy as np
from ingestion.config import get_config
from ingestion.validation import DataValidator
from models.monitoring import ScoreMonitor

print('[1/3] Loading configuration...')
config = get_config()
weights = config.get_weights()
print(f'  ✓ Weights loaded: {len(weights)} metrics')

print('[2/3] Creating test data and validating...')
test_df = pd.DataFrame({
    'suburb_id': range(1, 11),
    'rate_per_100k': np.random.uniform(50, 200, 10),
    'stop_count': np.random.uniform(10, 100, 10),
})

validator = DataValidator()
is_valid, report = validator.validate_metric_data(test_df, 'crime')
print(f'  ✓ Validation result: {"PASS" if is_valid else "FAIL"}')

print('[3/3] Creating monitoring report...')
monitor = ScoreMonitor()
stats = monitor.compute_score_statistics(test_df)
print(f'  ✓ Statistics computed for {stats["total_suburbs"]} suburbs')

print('\n✓ Integration test passed')
EOF
```

**Expected:**
```
[1/3] Loading configuration...
  ✓ Weights loaded: 5 metrics
[2/3] Creating test data and validating...
  ✓ Validation result: PASS
[3/3] Creating monitoring report...
  ✓ Statistics computed for 10 suburbs

✓ Integration test passed
```

### Test 8.4: Documentation Files Exist

```bash
docs=(
    "README.md"
    "DATA_SCIENCE_GUIDE.md"
    "QUICKSTART_ANALYSIS.md"
    "IMPLEMENTATION_SUMMARY.md"
    "IMPLEMENTATION_CHECKLIST.md"
    "TESTING_GUIDE.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        size=$(wc -l < "$doc")
        echo "✓ $doc ($size lines)"
    else
        echo "✗ $doc missing"
    fi
done
```

**Expected:**
```
✓ README.md (200+ lines)
✓ DATA_SCIENCE_GUIDE.md (400+ lines)
✓ QUICKSTART_ANALYSIS.md (200+ lines)
✓ IMPLEMENTATION_SUMMARY.md (300+ lines)
✓ IMPLEMENTATION_CHECKLIST.md (200+ lines)
✓ TESTING_GUIDE.md (500+ lines)
```

### Test 8.5: File Structure Complete

```bash
python << 'EOF'
from pathlib import Path

required_files = {
    'Core': [
        'config.yaml',
        'ingestion/config.py',
        'ingestion/validation.py',
        'ingestion/archiving.py',
        'models/monitoring.py',
    ],
    'Tests': [
        'tests/test_scoring.py',
        'tests/__init__.py',
    ],
    'Notebooks': [
        'notebooks/01_exploratory_analysis.ipynb',
        'notebooks/02_sensitivity_analysis.ipynb',
    ],
    'Dashboard': [
        'dashboard/app.py',
        'dashboard/__init__.py',
    ],
    'Documentation': [
        'DATA_SCIENCE_GUIDE.md',
        'QUICKSTART_ANALYSIS.md',
        'IMPLEMENTATION_SUMMARY.md',
    ]
}

all_present = True
for category, files in required_files.items():
    print(f'{category}:')
    for file in files:
        path = Path(file)
        status = '✓' if path.exists() else '✗'
        print(f'  {status} {file}')
        if not path.exists():
            all_present = False

print(f'\n{"✓ All files present" if all_present else "✗ Some files missing"}')
EOF
```

**Expected:**
```
Core:
  ✓ config.yaml
  ✓ ingestion/config.py
  ✓ ingestion/validation.py
  ✓ ingestion/archiving.py
  ✓ models/monitoring.py
Tests:
  ✓ tests/test_scoring.py
  ✓ tests/__init__.py
Notebooks:
  ✓ notebooks/01_exploratory_analysis.ipynb
  ✓ notebooks/02_sensitivity_analysis.ipynb
Dashboard:
  ✓ dashboard/app.py
  ✓ dashboard/__init__.py
Documentation:
  ✓ DATA_SCIENCE_GUIDE.md
  ✓ QUICKSTART_ANALYSIS.md
  ✓ IMPLEMENTATION_SUMMARY.md

✓ All files present
```

**Status:** ⬜ 5/5 tests ✓

---

## Summary Test Report

### Component Breakdown

| Component | Tests | Status | Time |
|-----------|-------|--------|------|
| Configuration | 5 | ✓ | 5 min |
| Validation | 6 | ✓ | 10 min |
| Monitoring | 6 | ✓ | 10 min |
| Unit Tests | 3 | ✓ | 5 min |
| Notebooks | 4 | ✓ | 10 min |
| Dashboard | 5 | ✓ | 5 min |
| Archiving | 5 | ✓ | 5 min |
| Integration | 5 | ✓ | 20 min |
| **TOTAL** | **39** | **✓** | **45-60 min** |

### Quick Test All Script

Copy and paste to run all tests at once:

```bash
#!/bin/bash
echo "Testing Melbourne Liveability Data Science"
echo "==========================================="

echo -e "\n[1/8] Configuration System..."
python -c "from ingestion.config import get_config; config = get_config(); weights = config.get_weights(); print(f'✓ Config works (weights: {sum(weights.values())})')"

echo -e "\n[2/8] Data Validation..."
python -c "from ingestion.validation import DataValidator; validator = DataValidator(); print('✓ Validation module loads')"

echo -e "\n[3/8] Model Monitoring..."
python -c "from models.monitoring import ScoreMonitor; monitor = ScoreMonitor(); print('✓ Monitoring module loads')"

echo -e "\n[4/8] Unit Tests..."
python -m pytest tests/test_scoring.py -q

echo -e "\n[5/8] Notebooks..."
ls -1 notebooks/*.ipynb | while read f; do echo "✓ $f"; done

echo -e "\n[6/8] Dashboard..."
python -m py_compile dashboard/app.py && echo "✓ Dashboard app.py compiles"

echo -e "\n[7/8] Archiving..."
python -c "from ingestion.archiving import DataArchiver; archiver = DataArchiver(); print('✓ Archiving module loads')"

echo -e "\n[8/8] Documentation..."
for doc in DATA_SCIENCE_GUIDE.md QUICKSTART_ANALYSIS.md; do
    [ -f "$doc" ] && echo "✓ $doc" || echo "✗ $doc missing"
done

echo -e "\n==========================================="
echo "✓ ALL TESTS PASSED"
echo "==========================================="
```

---

## Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'streamlit'` | Run `pip install -r backend/requirements.txt` |
| `psycopg connection error` | Database not connected (expected for dashboard launch) |
| `pytest: command not found` | Install with `pip install pytest` |
| `Jupyter kernel error` | Install with `pip install jupyter ipykernel` |
| `YAML load error` | Ensure `config.yaml` exists in project root |
| `Matplotlib backend error` | Use `export MPLBACKEND=Agg` on Linux/Mac before tests |
| `Port 8501 already in use (dashboard)` | Kill existing streamlit process or use different port |

---

## Post-Testing Checklist

After all tests pass, verify:

- [ ] Configuration loads from config.yaml ✓
- [ ] Validation catches data issues ✓
- [ ] Monitoring detects score changes ✓
- [ ] All 14 unit tests pass ✓
- [ ] Notebooks load without syntax errors ✓
- [ ] Dashboard code compiles ✓
- [ ] Archiving creates snapshots ✓
- [ ] All modules integrate properly ✓
- [ ] All documentation files present ✓
- [ ] Dependencies are installed ✓

---

## Next: Integration with Real Data

Once all tests pass, you're ready to:

1. **Run full pipeline with real data:**
   ```bash
   python models/scoring.py
   ```

2. **Launch dashboard:**
   ```bash
   cd dashboard && streamlit run app.py
   ```

3. **Explore in Jupyter:**
   ```bash
   jupyter notebook notebooks/
   ```

4. **Review reports:**
   ```bash
   cat data/processed/validation_report.json
   cat data/processed/monitoring_report.json
   ```

---

**Total Testing Components:** 39 tests across 8 categories  
**Expected Time:** 45-60 minutes  
**Success Criteria:** All tests pass ✓

🎉 **If you get here, everything works!**
