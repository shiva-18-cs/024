from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Alert, Worker, MedicalRecord, TrainingRecord, CertificationRecord, User, UserRole
from app.schemas.schemas import AlertOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/alerts", tags=["Alerts & Escalations"])

def _sync_statutory_expiry_alerts(db: Session):
    now = datetime.now(timezone.utc)
    in_30_days = now + timedelta(days=30)

    # 1. Medical Expiries
    workers_expiring = db.query(Worker).filter(Worker.medical_expiry_date.isnot(None)).all()
    for w in workers_expiring:
        w_exp = w.medical_expiry_date
        if w_exp.tzinfo is None:
            w_exp = w_exp.replace(tzinfo=timezone.utc)
        
        if w_exp < now:
            title = f"Medical Fitness Expired: {w.first_name} {w.last_name}"
            exists = db.query(Alert).filter(Alert.title == title).first()
            if not exists:
                db.add(Alert(
                    title=title,
                    message=f"Statutory Form O medical fitness examination expired on {w_exp.strftime('%Y-%m-%d')} for worker {w.worker_code}. DGMS compliance requires immediate re-examination.",
                    alert_type="MEDICAL_EXPIRED",
                    severity="HIGH",
                    escalation_level=2,
                    mine_id=w.mine_id,
                    contractor_id=w.contractor_id
                ))
        elif w_exp <= in_30_days:
            title = f"Medical Expiring Soon: {w.first_name} {w.last_name}"
            exists = db.query(Alert).filter(Alert.title == title).first()
            if not exists:
                db.add(Alert(
                    title=title,
                    message=f"Form O medical fitness for worker {w.worker_code} expires on {w_exp.strftime('%Y-%m-%d')}. Schedule periodical medical examination.",
                    alert_type="MEDICAL_EXPIRING_SOON",
                    severity="MEDIUM",
                    escalation_level=1,
                    mine_id=w.mine_id,
                    contractor_id=w.contractor_id
                ))

    # 2. Training Expiries
    trainings = db.query(TrainingRecord).filter(TrainingRecord.expiry_date.isnot(None)).all()
    for t in trainings:
        t_exp = t.expiry_date
        if t_exp.tzinfo is None:
            t_exp = t_exp.replace(tzinfo=timezone.utc)
        worker = db.query(Worker).filter(Worker.id == t.worker_id).first()
        w_name = f"{worker.first_name} {worker.last_name}" if worker else "Worker"
        m_id = worker.mine_id if worker else None
        c_id = worker.contractor_id if worker else None

        if t_exp < now:
            title = f"Training Expired: {t.training_name} - {w_name}"
            exists = db.query(Alert).filter(Alert.title == title).first()
            if not exists:
                db.add(Alert(
                    title=title,
                    message=f"Mandatory statutory training '{t.training_name}' for {w_name} expired on {t_exp.strftime('%Y-%m-%d')}.",
                    alert_type="TRAINING_EXPIRED",
                    severity="HIGH",
                    escalation_level=2,
                    mine_id=m_id,
                    contractor_id=c_id
                ))
        elif t_exp <= in_30_days:
            title = f"Training Expiring Soon: {t.training_name} - {w_name}"
            exists = db.query(Alert).filter(Alert.title == title).first()
            if not exists:
                db.add(Alert(
                    title=title,
                    message=f"Mandatory safety training '{t.training_name}' for {w_name} will expire on {t_exp.strftime('%Y-%m-%d')}.",
                    alert_type="TRAINING_EXPIRING_SOON",
                    severity="MEDIUM",
                    escalation_level=1,
                    mine_id=m_id,
                    contractor_id=c_id
                ))

    # 3. Certification Expiries
    certs = db.query(CertificationRecord).filter(CertificationRecord.expiry_date.isnot(None)).all()
    for c in certs:
        c_exp = c.expiry_date
        if c_exp.tzinfo is None:
            c_exp = c_exp.replace(tzinfo=timezone.utc)
        worker = db.query(Worker).filter(Worker.id == c.worker_id).first()
        w_name = f"{worker.first_name} {worker.last_name}" if worker else "Worker"
        m_id = worker.mine_id if worker else None
        c_id = worker.contractor_id if worker else None

        if c_exp < now:
            title = f"Certification Expired: {c.certification_name} - {w_name}"
            exists = db.query(Alert).filter(Alert.title == title).first()
            if not exists:
                db.add(Alert(
                    title=title,
                    message=f"Statutory competence certificate '{c.certification_name}' for {w_name} expired on {c_exp.strftime('%Y-%m-%d')}.",
                    alert_type="CERTIFICATION_EXPIRED",
                    severity="CRITICAL",
                    escalation_level=3,
                    mine_id=m_id,
                    contractor_id=c_id
                ))
        elif c_exp <= in_30_days:
            title = f"Certification Expiring Soon: {c.certification_name} - {w_name}"
            exists = db.query(Alert).filter(Alert.title == title).first()
            if not exists:
                db.add(Alert(
                    title=title,
                    message=f"Statutory certificate '{c.certification_name}' for {w_name} will expire on {c_exp.strftime('%Y-%m-%d')}.",
                    alert_type="CERTIFICATION_EXPIRING_SOON",
                    severity="HIGH",
                    escalation_level=2,
                    mine_id=m_id,
                    contractor_id=c_id
                ))

    db.commit()

@router.get("", response_model=List[AlertOut])
def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        _sync_statutory_expiry_alerts(db)
    except Exception:
        db.rollback()

    q = db.query(Alert)
    if current_user.role == UserRole.CONTRACTOR.value and current_user.contractor_id:
        q = q.filter((Alert.contractor_id == current_user.contractor_id) | (Alert.contractor_id.is_(None)))
    elif current_user.role in [UserRole.MINE_MANAGER.value, UserRole.FIELD_OFFICER.value] and current_user.mine_id:
        q = q.filter((Alert.mine_id == current_user.mine_id) | (Alert.mine_id.is_(None)))

    return q.order_by(Alert.escalation_level.desc(), Alert.created_at.desc()).all()

@router.post("/{alert_id}/read")
def mark_read(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"status": "success", "alert_id": alert_id}
