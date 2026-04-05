import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from ..database import get_db
from ..schemas import SuburbScore, SuburbSummary

router = APIRouter(prefix="/suburbs", tags=["suburbs"])


@router.get("/geojson")
def get_suburbs_geojson(db: Session = Depends(get_db)):
    """Return all suburbs as a GeoJSON FeatureCollection for choropleth rendering."""
    result = db.execute(text("""
        SELECT s.id AS suburb_id, s.name, s.geometry,
               ls.score_total, ls.score_crime, ls.score_transport,
               ls.score_schools, ls.score_greenspace, ls.score_affordability
        FROM suburbs s
        LEFT JOIN liveability_scores ls ON ls.suburb_id = s.id
        WHERE s.geometry IS NOT NULL
    """))
    features = []
    for row in result:
        d = dict(row._mapping)
        try:
            geom = json.loads(d["geometry"])
        except (TypeError, json.JSONDecodeError):
            continue
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "suburb_id": d["suburb_id"],
                "name": d["name"],
                "score_total": float(d["score_total"]) if d["score_total"] is not None else None,
                "score_crime": float(d["score_crime"]) if d["score_crime"] is not None else None,
                "score_transport": float(d["score_transport"]) if d["score_transport"] is not None else None,
                "score_schools": float(d["score_schools"]) if d["score_schools"] is not None else None,
                "score_greenspace": float(d["score_greenspace"]) if d["score_greenspace"] is not None else None,
                "score_affordability": float(d["score_affordability"]) if d["score_affordability"] is not None else None,
            },
        })
    return JSONResponse({"type": "FeatureCollection", "features": features})


@router.get("/", response_model=List[SuburbSummary])
def list_suburbs(db: Session = Depends(get_db)):
    """Return all suburbs with their total liveability score — used to populate the map."""
    result = db.execute(text("""
        SELECT s.id AS suburb_id, s.name, ls.score_total, s.latitude, s.longitude
        FROM suburbs s
        LEFT JOIN liveability_scores ls ON ls.suburb_id = s.id
        ORDER BY ls.score_total DESC NULLS LAST
    """))
    return [dict(row._mapping) for row in result]


@router.get("/{suburb_id}", response_model=SuburbScore)
def get_suburb(suburb_id: int, db: Session = Depends(get_db)):
    """Return full score breakdown for a single suburb."""
    result = db.execute(text("""
        SELECT
            s.id AS suburb_id, s.name, s.latitude, s.longitude, s.geometry, s.description,
            ls.score_crime, ls.score_transport, ls.score_schools,
            ls.score_greenspace, ls.score_affordability, ls.score_total
        FROM suburbs s
        LEFT JOIN liveability_scores ls ON ls.suburb_id = s.id
        WHERE s.id = :suburb_id
    """), {"suburb_id": suburb_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Suburb not found")
    return dict(row._mapping)
