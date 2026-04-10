from pydantic import BaseModel
from typing import Optional


class SuburbScore(BaseModel):
    suburb_id: int
    name: str
    score_crime: Optional[float]
    score_transport: Optional[float]
    score_schools: Optional[float]
    score_greenspace: Optional[float]
    score_affordability: Optional[float]
    score_total: Optional[float]
    latitude: Optional[float]
    longitude: Optional[float]
    geometry: Optional[str]
    description: Optional[str]
    median_house_price: Optional[int]

    class Config:
        from_attributes = True


class SuburbSummary(BaseModel):
    suburb_id: int
    name: str
    score_total: Optional[float]
    score_crime: Optional[float]
    score_transport: Optional[float]
    score_schools: Optional[float]
    score_greenspace: Optional[float]
    score_affordability: Optional[float]
    latitude: Optional[float]
    longitude: Optional[float]
    median_house_price: Optional[int]

    class Config:
        from_attributes = True
