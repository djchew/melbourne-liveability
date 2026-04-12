# Melbourne Liveability Index

A web app for exploring how liveable different Melbourne suburbs are. Combines five metrics (safety, transport, schools, parks, housing costs) into a single score shown on an interactive map.

## What you can do

- **Map view** - See all suburbs colored by liveability score (cyan = good, red = not so good)
- **Search & compare** - Find suburbs and see how they stack up
- **Breakdowns** - Check individual scores for safety, transport, schools, green space, and affordability
- **Analytics** - Dive into the data with different views (overview, metrics, comparisons, insights)

## Tech

**Backend:** FastAPI, PostgreSQL (Neon), SQLAlchemy  
**Frontend:** Next.js 15, React 19, TypeScript, Tailwind, MapLibre GL, Recharts & Victory  
**Data:** Pandas, GeoPandas, Scikit-learn  

### Pages

- `/` - The main map
- `/analytics` - Dashboard with top suburbs and key metrics
- `/analytics/metrics` - Look at metric distributions
- `/analytics/insights` - See what's changed and find anomalies
- `/analytics/comparison` - Put suburbs side-by-side

## Data

**Sources:**
- Safety - Crime Statistics Agency Victoria
- Transport - PTV GTFS (how many stops nearby)
- Schools - ACARA My School (ICSEA scores)
- Green Space - OpenStreetMap
- Property - DFFH house prices

Each metric gets normalized 0-100, then combined with these weights:
- Safety: 25%
- Transport: 25%
- Schools: 20%
- Green space: 15%
- Affordability: 15%

## Getting started

### Prerequisites
Python 3.11+, Node.js 18+, PostgreSQL

### Backend

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows

pip install -r backend/requirements.txt

# Set up DB with your connection string
# Edit: backend/app/database.py

uvicorn backend.app.main:app --reload --port 8000
```

Backend runs on http://127.0.0.1:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs on http://localhost:3000

### Load the data

```bash
cd ingestion
python suburbs.py
python crime.py
python schools.py
python transport.py
python greenspace.py
python property.py

cd ../models
python scoring.py
```

## API

| Path | What it returns |
|------|---|
| `GET /suburbs/` | All suburbs + scores |
| `GET /suburbs/{id}` | One suburb, full breakdown |
| `GET /suburbs/geojson` | GeoJSON for the map |

## Architecture

Data flows: config → validation → scoring → monitoring → archive

Config lives in `config.yaml`. Weights, thresholds, and strategies are all configurable now.

## Project layout

```
├── backend/          # FastAPI + DB stuff
├── frontend/         # Next.js + React
│   └── analytics/    # Dashboard pages
├── ingestion/        # Data loading scripts
├── models/           # Scoring logic
├── tests/            # Unit tests
├── notebooks/        # Analysis & exploration
├── dashboard/        # Streamlit thing
└── data/             # Raw + processed data
```

## Notes

- Suburb polygons stored as GeoJSON in the DB
- Using the most recent year of data available
- Transport scores = how many stops are within each suburb
- Green space areas calculated in MGA Zone 55 (meters, not lat/long)
- Data validation runs automatically before scoring
- Changes and anomalies get flagged after each run

## More info

See [DATA_SCIENCE_GUIDE.md](DATA_SCIENCE_GUIDE.md) and [QUICKSTART_ANALYSIS.md](QUICKSTART_ANALYSIS.md) for deeper dives.

## License

MIT
