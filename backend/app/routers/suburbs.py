from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from ..database import get_db
from ..schemas import SuburbScore, SuburbSummary

router = APIRouter(prefix="/suburbs", tags=["suburbs"])


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
            s.id AS suburb_id, s.name, s.latitude, s.longitude, s.geometry,
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
