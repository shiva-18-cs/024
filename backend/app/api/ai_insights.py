from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import AIPrediction, Mine, Contractor
from app.schemas.schemas import AIPredictionOut
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI & Machine Learning"])

@router.get("/predictions", response_model=List[AIPredictionOut])
def list_ai_predictions(
    target_type: Optional[str] = Query(None),
    is_anomaly: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(AIPrediction)
    if target_type:
        q = q.filter(AIPrediction.target_type == target_type)
    if is_anomaly is not None:
        q = q.filter(AIPrediction.is_anomaly == is_anomaly)
    
    return q.order_by(AIPrediction.risk_score.desc()).all()

@router.get("/anomalies", response_model=List[AIPredictionOut])
def list_anomalies(db: Session = Depends(get_db)):
    return db.query(AIPrediction).filter(AIPrediction.is_anomaly == True).all()

@router.get("/mine-risk/{mine_id}")
def get_mine_risk_assessment(mine_id: str, db: Session = Depends(get_db)):
    result = AIService.get_mine_risk_summary(db, mine_id)
    if not result:
        raise HTTPException(status_code=404, detail="Mine not found")
    return result
