# Melbourne Liveability Index

An interactive web application for exploring and comparing liveability scores across Greater Melbourne suburbs. The index combines five key metrics—safety, transport accessibility, school quality, green space, and housing affordability—into a composite score displayed on an intuitive choropleth map.

## Features

- **Choropleth map visualization** — Suburb boundaries colored by liveability score (cyan = high, red = low)
- **Interactive search** — Autocomplete search to quickly find and compare suburbs
- **Detailed breakdowns** — View per-category scores (Safety, Transport, Schools, Green Space, Affordability) with visual progress bars and icons
- **Hover tooltips** — Quick preview of suburb names and scores while exploring the map
- **Responsive design** — Light, modern UI optimized for desktop and tablet

## Tech Stack

**Backend:**
- FastAPI (Python web framework)
- PostgreSQL on Neon.tech
- SQLAlchemy ORM
- Uvicorn ASGI server

**Frontend:**
- Next.js 15 with React 19
- TypeScript
- Tailwind CSS (light theme)
- MapLibre GL (interactive maps)
- Recharts (data visualization)

**Data Processing:**
- Pandas & GeoPandas (spatial data manipulation)
- Scikit-learn (MinMaxScaler normalization)
- SQLAlchemy (batch data loading)

## Data Sources

| Metric | Source | Records |
|--------|--------|---------|
| Safety | Crime Statistics Agency Victoria | 669 suburbs |
| Transport | PTV GTFS (train/tram/bus) | 673 suburbs |
| Schools | ACARA My School (ICSEA scores) | 447 suburbs |
| Green Space | OpenStreetMap (parks via Overpass API) | 673 suburbs |
| Property | DFFH Property Data | 443 suburbs |

**Scoring:** Each metric is normalized to 0–100 via MinMaxScaler, then weighted composite:
- Safety: 25%
- Transport: 25%
- Schools: 20%
- Green space: 15%
- Affordability: 15%

## Project Structure

```
melbourne-liveability/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app & CORS setup
│   │   ├── database.py          # Neon PostgreSQL connection
│   │   ├── schemas.py           # Pydantic models (SuburbScore, SuburbSummary)
│   │   └── routers/
│   │       └── suburbs.py       # GET /suburbs/, GET /suburbs/{id}, GET /suburbs/geojson
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── layout.tsx           # Root layout with header
│   │   ├── page.tsx             # Main page (map + sidebar)
│   │   └── globals.css          # Global styles & animations
│   ├── components/
│   │   ├── SuburbMap.tsx        # MapLibre choropleth with Voyager basemap
│   │   ├── SuburbCard.tsx       # Sidebar detail panel
│   │   ├── SearchBar.tsx        # Autocomplete search component
│   │   └── ScoreBreakdown.tsx   # (Legacy) Radar chart
│   ├── lib/
│   │   └── api.ts              # Fetch wrapper & scoreToColor utility
│   └── package.json
├── ingestion/
│   ├── base.py                 # DB connection & path utilities
│   ├── suburbs.py              # ABS SAL boundary loading
│   ├── crime.py                # Crime Statistics Agency Victoria
│   ├── schools.py              # ACARA My School aggregation
│   ├── transport.py            # PTV GTFS spatial joins
│   ├── greenspace.py           # OpenStreetMap parks
│   └── property.py             # DFFH property prices
├── models/
│   └── scoring.py              # MinMaxScaler liveability calculation
└── db/
    └── schema.sql              # PostgreSQL schema (suburbs, scores, metrics)
```

## Setup & Running

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (Neon.tech recommended)

### Backend Setup

1. **Create virtual environment:**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   ```

2. **Install dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Configure database:**
   - Create a PostgreSQL database (e.g., on Neon.tech)
   - Update `backend/app/database.py` with your connection string
   - Run migrations: `python -m db.schema`

4. **Start server:**
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   ```
   Server runs on `http://127.0.0.1:8000`

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```
   App runs on `http://localhost:3000`

### Data Ingestion

Run ingestion scripts in order:
```bash
cd ingestion
python suburbs.py       # Load suburb boundaries
python crime.py         # Load crime stats
python schools.py       # Load school scores
python transport.py     # Load transport metrics
python greenspace.py    # Load green space data
python property.py      # Load property prices
cd ../models
python scoring.py       # Calculate composite scores
```

## API Endpoints

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/suburbs/` | GET | List of all suburbs with total score |
| `/suburbs/{id}` | GET | Single suburb with full score breakdown |
| `/suburbs/geojson` | GET | GeoJSON FeatureCollection for choropleth rendering |

## Design Decisions

- **Choropleth over dots** — Shows the full spatial distribution of liveability across the city; cleaner than individual markers
- **Light theme** — Complements the Carto Voyager map basemap (light, readable labels)
- **Score normalization** — MinMaxScaler ensures each metric contributes equally despite different scales (crime per 100k vs. % green space)
- **Backend-driven GeoJSON** — Server returns pre-computed geometries; frontend just renders them (efficient for 600+ suburbs)
- **Hover-first UX** — Tooltips and search for discovery; click sidebar for detail view

## Data Science Infrastructure

**NEW:** Complete data science toolkit for analysis, validation, and monitoring:

- **Configuration Management** — Centralized `config.yaml` for all parameters
- **Data Validation** — Automated quality checks and coverage reporting
- **Model Monitoring** — Score change detection and anomaly flagging
- **Testing Framework** — Unit tests for scoring logic and edge cases
- **Analysis Notebooks** — Exploratory analysis and sensitivity testing
- **Interactive Dashboard** — Real-time data exploration (Streamlit)
- **Data Archiving** — Version control for raw and processed data

### Quick Start

```bash
# Run full pipeline with validation & monitoring
python models/scoring.py

# Launch interactive dashboard
streamlit run dashboard/app.py

# Explore in Jupyter notebooks
jupyter notebook notebooks/

# Run tests
python -m pytest tests/ -v
```

**Learn more:** Read [DATA_SCIENCE_GUIDE.md](DATA_SCIENCE_GUIDE.md) and [QUICKSTART_ANALYSIS.md](QUICKSTART_ANALYSIS.md)

## Architecture Changes

### Before
- Weights hardcoded in `models/scoring.py`
- No validation checks
- Manual data quality verification
- Difficult to reproduce runs
- No change detection

### After
```
config.yaml → validation.py → scoring.py → monitoring.py → archiving.py
   ↓              ↓              ↓             ↓              ↓
weights      data checks    compute      track changes    version data
             coverage       scores       detect drift      audit trail
```

## New Files

```
melbourne-liveability/
├── config.yaml                              # Scoring weights, validation thresholds
├── DATA_SCIENCE_GUIDE.md                   # Complete documentation
├── QUICKSTART_ANALYSIS.md                  # Quick reference
│
├── ingestion/
│   ├── config.py                           # Configuration loader
│   ├── validation.py                       # Data quality checks
│   └── archiving.py                        # Data versioning
│
├── models/
│   └── monitoring.py                       # Score monitoring
│
├── tests/
│   └── test_scoring.py                     # Unit tests
│
├── notebooks/
│   ├── 01_exploratory_analysis.ipynb       # EDA
│   └── 02_sensitivity_analysis.ipynb       # Weight sensitivity
│
├── dashboard/
│   └── app.py                              # Streamlit dashboard
│
└── data/
    ├── archive/                            # Raw data versions
    └── processed/
        ├── snapshots/                      # Processed data versions
        ├── validation_report.json          # Data quality report
        └── monitoring_report.json          # Score changes report
```

## Updated Dependencies

Added for data science workflows:
- `pyyaml` — Configuration management
- `streamlit` — Interactive dashboard
- `plotly` — Data visualization
- `jupyter` — Notebooks
- `matplotlib` + `seaborn` — Statistical plots
- `pyarrow` — Efficient data archiving

See [backend/requirements.txt](backend/requirements.txt)

## Notes

- Suburb boundary polygons stored as GeoJSON TEXT in the database
- Property prices and crime stats are year-based; currently using most recent year available
- Transport scores computed via spatial joins (which stops fall within suburb boundaries)
- Green space areas calculated in MGA Zone 55 projection (metres) for accuracy
- **NEW:** All weights, validation thresholds, and fill strategies now configurable in `config.yaml`
- **NEW:** Data validation runs automatically before scoring
- **NEW:** Score changes and anomalies detected and reported after each run
- **NEW:** Raw and processed data archived for reproducibility

## License

MIT

---

For questions or contributions, open an issue or PR.

### Data Science Resources
- 📖 [Data Science Guide](DATA_SCIENCE_GUIDE.md) — Complete documentation
- ⚡ [Quick Start](QUICKSTART_ANALYSIS.md) — Common tasks
- 📊 [Dashboard](dashboard/) — Interactive exploration
- 📓 [Notebooks](notebooks/) — Analysis and sensitivity testing
