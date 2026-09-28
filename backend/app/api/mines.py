from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Mine, Subsidiary, User
from app.schemas.schemas import MineOut, MineCreate, SubsidiaryOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/mines", tags=["Mines"])

@router.get("/subsidiaries", response_model=List[SubsidiaryOut])
def get_subsidiaries(db: Session = Depends(get_db)):
    return db.query(Subsidiary).all()

@router.get("", response_model=List[MineOut])
def list_mines(db: Session = Depends(get_db)):
    mines = db.query(Mine).all()
    results = []
    for m in mines:
        item = MineOut.model_validate(m)
        item.subsidiary_name = m.subsidiary.name if m.subsidiary else None
        item.open_violations_count = sum(1 for v in m.violations if v.status == "OPEN")
        item.active_contractors_count = len(set(c.contractor_id for c in m.contracts if c.status == "ACTIVE"))
        item.workers_count = len(m.workers)
        
        m_insps = [i for i in m.inspections]
        if m_insps:
            item.compliance_score = round(sum(i.compliance_score for i in m_insps) / len(m_insps), 1)
        else:
            item.compliance_score = 88.0
        
        if item.compliance_score >= 85:
            item.risk_level = "LOW"
        elif item.compliance_score >= 70:
            item.risk_level = "MEDIUM"
        else:
            item.risk_level = "HIGH"

        results.append(item)
    return results

@router.get("/{mine_id}", response_model=MineOut)
def get_mine(mine_id: str, db: Session = Depends(get_db)):
    m = db.query(Mine).filter(Mine.id == mine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mine not found")
    
    item = MineOut.model_validate(m)
    item.subsidiary_name = m.subsidiary.name if m.subsidiary else None
    item.open_violations_count = sum(1 for v in m.violations if v.status == "OPEN")
    item.active_contractors_count = len(set(c.contractor_id for c in m.contracts if c.status == "ACTIVE"))
    item.workers_count = len(m.workers)
    return item

@router.post("", response_model=MineOut)
def create_mine(payload: MineCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Mine).filter(Mine.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mine code already exists")
    
    mine = Mine(**payload.model_dump())
    db.add(mine)
    db.commit()
    db.refresh(mine)
    item = MineOut.model_validate(mine)
    if mine.subsidiary:
        item.subsidiary_name = mine.subsidiary.name
    return item
