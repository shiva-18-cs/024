from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.entities import (
    Worker, Attendance, MedicalRecord, Mine, Contractor, User, UserRole, Alert,
    TrainingRecord, CertificationRecord
)
from app.schemas.schemas import (
    WorkerOut, WorkerCreate, AttendanceOut, AttendanceCreate,
    MedicalRecordOut, MedicalRecordCreate, WorkerVerifyRequest,
    TrainingRecordOut, TrainingRecordIn, TrainingVerifyRequest,
    CertificationRecordOut, CertificationRecordIn, CertificationVerifyRequest
)
from app.api.deps import get_current_user
from app.services.audit_service import log_audit_action

router = APIRouter(prefix="/workers", tags=["Workers"])

def _to_worker_out(w: Worker, now: datetime) -> WorkerOut:
    out = WorkerOut.model_validate(w)
    out.mine_name = w.mine.name if w.mine else None
    out.contractor_name = w.contractor.company_name if w.contractor else None
    if w.medical_expiry_date:
        exp = w.medical_expiry_date
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        out.is_medical_expired = exp < now
    else:
        out.is_medical_expired = False
    return out

# 1. LIST WORKERS
@router.get("", response_model=List[WorkerOut])
def list_workers(
    mine_id: Optional[str] = Query(None),
    contractor_id: Optional[str] = Query(None),
    medical_status: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    q = db.query(Worker)

    # Role-based access control
    if current_user.role == UserRole.CONTRACTOR.value:
        q = q.filter(Worker.contractor_id == current_user.contractor_id)
    elif current_user.role in [UserRole.FIELD_OFFICER.value, UserRole.MINE_MANAGER.value]:
        q = q.filter(Worker.mine_id == current_user.mine_id)
    if mine_id and current_user.role in [UserRole.CORPORATE.value, UserRole.WORKER_OFFICER.value]:
        q = q.filter(Worker.mine_id == mine_id)
    if contractor_id and current_user.role != UserRole.CONTRACTOR.value:
        q = q.filter(Worker.contractor_id == contractor_id)
    if medical_status:
        q = q.filter(Worker.medical_fitness_status == medical_status)
    if verification_status:
        q = q.filter(Worker.verification_status == verification_status)

    workers = q.order_by(Worker.created_at.desc()).all()
    return [_to_worker_out(w, now) for w in workers]

# 2. CREATE WORKER
@router.post("", response_model=WorkerOut)
def create_worker(
    payload: WorkerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contractor_id = payload.contractor_id
    if current_user.role == UserRole.CONTRACTOR.value:
        contractor_id = current_user.contractor_id
        if not contractor_id:
            raise HTTPException(status_code=400, detail="Contractor account has no associated company")

    if not contractor_id:
        raise HTTPException(status_code=400, detail="Contractor ID is required")

    existing = db.query(Worker).filter(Worker.worker_code == payload.worker_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Worker code already exists")

    worker_dict = payload.model_dump()
    worker_dict["contractor_id"] = contractor_id
    worker_dict["verification_status"] = "PENDING"

    worker = Worker(**worker_dict)
    db.add(worker)

    alert = Alert(
        title="New Worker Registration Pending Review",
        message=f"Contractor submitted new worker: {worker.first_name} {worker.last_name} ({worker.worker_code}, {worker.designation}). Verification required.",
        alert_type="NEW_WORKER_REGISTERED",
        severity="MEDIUM",
        escalation_level=1,
        mine_id=worker.mine_id,
        contractor_id=worker.contractor_id
    )
    db.add(alert)
    db.commit()
    db.refresh(worker)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="WORKER_REGISTERED",
        entity="Worker",
        entity_id=worker.id,
        new_value={"worker_code": worker.worker_code, "name": f"{worker.first_name} {worker.last_name}", "contractor_id": worker.contractor_id}
    )

    return _to_worker_out(worker, datetime.now(timezone.utc))

# 3. ATTENDANCE (POST)
@router.post("/attendance", response_model=AttendanceOut)
def mark_attendance(
    payload: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = Attendance(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return AttendanceOut.model_validate(record)

# 4. MEDICAL (POST)
@router.post("/medical", response_model=MedicalRecordOut)
def add_medical_record(
    payload: MedicalRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    is_exp = payload.expiry_date < now
    record = MedicalRecord(**payload.model_dump(), is_expired=is_exp)
    db.add(record)

    worker = db.query(Worker).filter(Worker.id == payload.worker_id).first()
    if worker:
        worker.medical_expiry_date = payload.expiry_date
        worker.medical_fitness_status = "EXPIRED" if is_exp else payload.fitness_status
        if is_exp:
            worker.compliance_status = "NON_COMPLIANT"

    db.commit()
    db.refresh(record)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="WORKER_PME_RECORDED",
        entity="MedicalRecord",
        entity_id=record.id,
        new_value={"worker_id": record.worker_id, "fitness_status": record.fitness_status, "is_expired": is_exp}
    )

    return MedicalRecordOut.model_validate(record)

# 5. TRAINING (GLOBAL / STATIC ROUTES)
@router.get("/training/all", response_model=List[TrainingRecordOut])
@router.get("/training", response_model=List[TrainingRecordOut])
def list_training_records(
    worker_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(TrainingRecord)
    if worker_id:
        q = q.filter(TrainingRecord.worker_id == worker_id)
    if status:
        q = q.filter(TrainingRecord.verification_status == status)

    records = q.order_by(TrainingRecord.created_at.desc()).all()
    results = []
    for r in records:
        item = TrainingRecordOut.model_validate(r)
        item.verified_by_name = r.verified_by.full_name if r.verified_by else None
        results.append(item)
    return results

@router.post("/training", response_model=TrainingRecordOut)
def add_training_record(
    payload: TrainingRecordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    w = db.query(Worker).filter(Worker.id == payload.worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")

    record = TrainingRecord(
        worker_id=payload.worker_id,
        training_type=payload.training_type,
        training_name=payload.training_name,
        training_status=payload.training_status,
        issue_date=payload.issue_date,
        expiry_date=payload.expiry_date,
        certificate_ref=payload.certificate_ref,
        verification_status="PENDING"
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="TRAINING_RECORD_ADDED",
        entity="TrainingRecord",
        entity_id=record.id,
        new_value={"worker_id": record.worker_id, "training_name": record.training_name}
    )

    item = TrainingRecordOut.model_validate(record)
    item.verified_by_name = None
    return item

@router.post("/training/{training_id}/verify", response_model=TrainingRecordOut)
def verify_training_record(
    training_id: str,
    payload: TrainingVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.WORKER_OFFICER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Worker Management officers can verify training records")

    record = db.query(TrainingRecord).filter(TrainingRecord.id == training_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Training record not found")

    now = datetime.now(timezone.utc)
    record.verification_status = payload.decision
    record.verified_by_id = current_user.id
    record.verified_at = now
    record.verification_notes = payload.notes
    db.commit()
    db.refresh(record)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="TRAINING_VERIFIED",
        entity="TrainingRecord",
        entity_id=record.id,
        new_value={"verification_status": record.verification_status, "notes": record.verification_notes}
    )

    item = TrainingRecordOut.model_validate(record)
    item.verified_by_name = current_user.full_name
    return item

# 6. CERTIFICATIONS (GLOBAL / STATIC ROUTES)
@router.get("/certifications/all", response_model=List[CertificationRecordOut])
@router.get("/certifications", response_model=List[CertificationRecordOut])
def list_certification_records(
    worker_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(CertificationRecord)
    if worker_id:
        q = q.filter(CertificationRecord.worker_id == worker_id)
    if status:
        q = q.filter(CertificationRecord.verification_status == status)

    records = q.order_by(CertificationRecord.created_at.desc()).all()
    results = []
    for r in records:
        item = CertificationRecordOut.model_validate(r)
        item.verified_by_name = r.verified_by.full_name if r.verified_by else None
        results.append(item)
    return results

@router.post("/certifications", response_model=CertificationRecordOut)
def add_certification_record(
    payload: CertificationRecordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    w = db.query(Worker).filter(Worker.id == payload.worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")

    record = CertificationRecord(
        worker_id=payload.worker_id,
        certification_type=payload.certification_type,
        certification_name=payload.certification_name,
        certificate_ref=payload.certificate_ref,
        issue_date=payload.issue_date,
        expiry_date=payload.expiry_date,
        verification_status="PENDING"
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="CERTIFICATION_RECORD_ADDED",
        entity="CertificationRecord",
        entity_id=record.id,
        new_value={"worker_id": record.worker_id, "certification_name": record.certification_name}
    )

    item = CertificationRecordOut.model_validate(record)
    item.verified_by_name = None
    return item

@router.post("/certifications/{cert_id}/verify", response_model=CertificationRecordOut)
def verify_certification_record(
    cert_id: str,
    payload: CertificationVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.WORKER_OFFICER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Worker Management officers can verify certification records")

    record = db.query(CertificationRecord).filter(CertificationRecord.id == cert_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Certification record not found")

    now = datetime.now(timezone.utc)
    record.verification_status = payload.decision
    record.verified_by_id = current_user.id
    record.verified_at = now
    record.verification_notes = payload.notes
    db.commit()
    db.refresh(record)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="CERTIFICATION_VERIFIED",
        entity="CertificationRecord",
        entity_id=record.id,
        new_value={"verification_status": record.verification_status, "notes": record.verification_notes}
    )

    item = CertificationRecordOut.model_validate(record)
    item.verified_by_name = current_user.full_name
    return item

# 7. WORKER SPECIFIC / PARAMETERIZED ROUTES
@router.get("/{worker_id}", response_model=WorkerOut)
def get_worker(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")

    if current_user.role == UserRole.CONTRACTOR.value and w.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: Worker belongs to another contractor")

    return _to_worker_out(w, datetime.now(timezone.utc))

@router.post("/{worker_id}/verify", response_model=WorkerOut)
def verify_worker_record(
    worker_id: str,
    payload: WorkerVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.WORKER_OFFICER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Worker Management officer can verify worker records")

    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")

    now = datetime.now(timezone.utc)
    w.verification_status = payload.decision
    w.verified_by_id = current_user.id
    w.verified_at = now
    w.verification_notes = payload.notes or ""

    if payload.decision == "VERIFIED":
        w.compliance_status = "COMPLIANT"
    elif payload.decision == "REJECTED":
        w.compliance_status = "NON_COMPLIANT"

    db.commit()
    db.refresh(w)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="WORKER_VERIFICATION_COMPLETED",
        entity="Worker",
        entity_id=w.id,
        new_value={"verification_status": w.verification_status, "notes": w.verification_notes}
    )

    return _to_worker_out(w, now)

@router.get("/{worker_id}/attendance", response_model=List[AttendanceOut])
def get_worker_attendance(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")
    if current_user.role == UserRole.CONTRACTOR.value and w.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    records = db.query(Attendance).filter(Attendance.worker_id == worker_id).order_by(Attendance.date.desc()).all()
    return [AttendanceOut.model_validate(r) for r in records]

@router.get("/{worker_id}/medical", response_model=List[MedicalRecordOut])
def get_worker_medical_records(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")
    if current_user.role == UserRole.CONTRACTOR.value and w.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    records = db.query(MedicalRecord).filter(MedicalRecord.worker_id == worker_id).order_by(MedicalRecord.examination_date.desc()).all()
    return [MedicalRecordOut.model_validate(r) for r in records]

@router.get("/{worker_id}/training", response_model=List[TrainingRecordOut])
def get_worker_training_records(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")
    if current_user.role == UserRole.CONTRACTOR.value and w.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    records = db.query(TrainingRecord).filter(TrainingRecord.worker_id == worker_id).order_by(TrainingRecord.issue_date.desc()).all()
    results = []
    for r in records:
        item = TrainingRecordOut.model_validate(r)
        item.verified_by_name = r.verified_by.full_name if r.verified_by else None
        results.append(item)
    return results

@router.get("/{worker_id}/certifications", response_model=List[CertificationRecordOut])
def get_worker_certification_records(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")
    if current_user.role == UserRole.CONTRACTOR.value and w.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    records = db.query(CertificationRecord).filter(CertificationRecord.worker_id == worker_id).order_by(CertificationRecord.issue_date.desc()).all()
    results = []
    for r in records:
        item = CertificationRecordOut.model_validate(r)
        item.verified_by_name = r.verified_by.full_name if r.verified_by else None
        results.append(item)
    return results
