import json
import os
import shutil
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import (
    Worker, Attendance, MedicalRecord, Mine, Contractor, User, UserRole, Alert,
    TrainingRecord, CertificationRecord
)
from app.schemas.schemas import (
    WorkerOut, WorkerCreate, AttendanceOut, AttendanceCreate,
    MedicalRecordOut, MedicalRecordCreate, WorkerVerifyRequest,
    TrainingRecordOut, TrainingRecordIn, TrainingVerifyRequest,
    CertificationRecordOut, CertificationRecordIn, CertificationVerifyRequest,
    CertificationExtractedFieldsUpdate, CertificationUploadResponse
)
from app.api.deps import get_current_user
from app.services.audit_service import log_audit_action
from app.services.ocr_service import OCRService

router = APIRouter(prefix="/workers", tags=["Workers"])

UPLOAD_DIR = Path("uploads/certifications")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _recalculate_worker_compliance(worker: Worker, db: Session) -> str:
    """
    Deterministic Worker Overall Compliance Calculation:
    - ALL REQUIRED CERTIFICATIONS VALID + MEDICAL VALID + REQUIRED TRAINING VALID -> COMPLIANT
    - ANY REQUIRED CERTIFICATE EXPIRED -> NON_COMPLIANT
    - CERTIFICATE EXPIRING SOON -> EXPIRING_SOON
    - MISSING REQUIRED DOCUMENT -> DOCUMENTATION_INCOMPLETE
    - PENDING HUMAN VERIFICATION -> VERIFICATION_PENDING
    """
    now = datetime.now(timezone.utc)
    
    # 1. Check Medical
    if not worker.medical_expiry_date:
        return "DOCUMENTATION_INCOMPLETE"
    
    med_exp = worker.medical_expiry_date
    if med_exp.tzinfo is None:
        med_exp = med_exp.replace(tzinfo=timezone.utc)
        
    if med_exp < now or worker.medical_fitness_status in ["UNFIT", "EXPIRED"]:
        return "NON_COMPLIANT"
    
    # 2. Check Certifications
    certs = db.query(CertificationRecord).filter(CertificationRecord.worker_id == worker.id).all()
    if not certs:
        # Check designation: Operators/Blasters require certificates
        if any(role in worker.designation.lower() for role in ["operator", "blaster", "overman", "electrician"]):
            return "DOCUMENTATION_INCOMPLETE"
    
    has_pending = False
    has_expiring_soon = False

    for c in certs:
        if c.verification_status == "REJECTED":
            return "NON_COMPLIANT"
        if c.verification_status in ["PENDING", "NEEDS_CLARIFICATION"]:
            has_pending = True
            
        if c.expiry_date:
            c_exp = c.expiry_date
            if c_exp.tzinfo is None:
                c_exp = c_exp.replace(tzinfo=timezone.utc)
            if c_exp < now:
                return "NON_COMPLIANT"
            elif c_exp <= now + timedelta(days=30):
                has_expiring_soon = True

    # 3. Check Training
    trainings = db.query(TrainingRecord).filter(TrainingRecord.worker_id == worker.id).all()
    for t in trainings:
        if t.verification_status == "REJECTED":
            return "NON_COMPLIANT"
        if t.expiry_date:
            t_exp = t.expiry_date
            if t_exp.tzinfo is None:
                t_exp = t_exp.replace(tzinfo=timezone.utc)
            if t_exp < now:
                return "NON_COMPLIANT"
            elif t_exp <= now + timedelta(days=30):
                has_expiring_soon = True

    if has_pending:
        return "VERIFICATION_PENDING"
    if has_expiring_soon:
        return "EXPIRING_SOON"

    return "COMPLIANT"


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


def _to_certification_out(c: CertificationRecord, now: datetime) -> CertificationRecordOut:
    out = CertificationRecordOut.model_validate(c)
    if c.worker:
        out.worker_name = f"{c.worker.first_name} {c.worker.last_name}"
        out.worker_code = c.worker.worker_code
        out.mine_name = c.worker.mine.name if c.worker.mine else None
        out.contractor_name = c.worker.contractor.company_name if c.worker.contractor else None
    
    if c.verified_by:
        out.verified_by_name = c.verified_by.full_name or c.verified_by.username
    
    # Calculate days remaining & expiry status
    if c.expiry_date:
        exp = c.expiry_date
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        diff = (exp - now).days
        out.days_remaining = diff
        out.is_expired = diff < 0
        out.is_expiring_soon = 0 <= diff <= 30
    else:
        out.days_remaining = 9999
        out.is_expired = False
        out.is_expiring_soon = False
        
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
    worker_dict["compliance_status"] = "DOCUMENTATION_INCOMPLETE"

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


# 3. EXPIRY TRACKING ENDPOINT
@router.get("/expiry-tracking")
def get_expiry_tracking(
    threshold_days: int = Query(30),
    mine_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    threshold_date = now + timedelta(days=threshold_days)

    q = db.query(CertificationRecord).join(Worker)
    if current_user.role == UserRole.CONTRACTOR.value:
        q = q.filter(Worker.contractor_id == current_user.contractor_id)
    elif current_user.role in [UserRole.FIELD_OFFICER.value, UserRole.MINE_MANAGER.value]:
        q = q.filter(Worker.mine_id == current_user.mine_id)
    elif mine_id:
        q = q.filter(Worker.mine_id == mine_id)

    all_certs = q.all()

    valid_list = []
    expiring_soon_list = []
    expired_list = []

    for c in all_certs:
        item = _to_certification_out(c, now)
        if c.expiry_date:
            exp = c.expiry_date
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < now:
                expired_list.append(item)
            elif exp <= threshold_date:
                expiring_soon_list.append(item)
            else:
                valid_list.append(item)
        else:
            valid_list.append(item)

    return {
        "summary": {
            "total_tracked": len(all_certs),
            "valid_count": len(valid_list),
            "expiring_soon_count": len(expiring_soon_list),
            "expired_count": len(expired_list),
            "threshold_days": threshold_days
        },
        "expiring_soon": expiring_soon_list,
        "expired": expired_list,
        "valid": valid_list
    }


# 4. CERTIFICATIONS UPLOAD & OCR
@router.post("/certifications/upload-and-ocr", response_model=CertificationUploadResponse)
async def upload_and_ocr_certification(
    file: UploadFile = File(...),
    worker_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in OCRService.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Allowed: PDF, JPG, JPEG, PNG, TIFF, TIF, WEBP."
        )

    # Save uploaded file
    safe_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{Path(file.filename).name}"
    file_path = UPLOAD_DIR / safe_name

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Contextual worker lookup if available
    worker_context = None
    if worker_id:
        w = db.query(Worker).filter(Worker.id == worker_id).first()
        if w:
            worker_context = {
                "name": f"{w.first_name} {w.last_name}",
                "worker_id": w.id,
                "worker_code": w.worker_code
            }

    # Run Multi-Format OCR Pipeline
    ocr_result = OCRService.process_certification_document(str(file_path), worker_context)

    return CertificationUploadResponse(
        filename=safe_name,
        file_type=ocr_result["file_type"],
        file_size=ocr_result["file_size"],
        file_url=f"/api/workers/certifications/file/{safe_name}",
        ocr_status=ocr_result["ocr_status"],
        ocr_confidence=ocr_result["ocr_confidence"],
        extracted_fields=ocr_result["extracted_fields"],
        raw_text=ocr_result["raw_text"],
        system_status=ocr_result["system_status"]
    )


# 5. LIST CERTIFICATIONS
@router.get("/certifications/all", response_model=List[CertificationRecordOut])
@router.get("/certifications", response_model=List[CertificationRecordOut])
def list_certification_records(
    worker_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    mine_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    q = db.query(CertificationRecord).join(Worker)

    if current_user.role == UserRole.CONTRACTOR.value:
        q = q.filter(Worker.contractor_id == current_user.contractor_id)
    elif current_user.role in [UserRole.FIELD_OFFICER.value, UserRole.MINE_MANAGER.value]:
        q = q.filter(Worker.mine_id == current_user.mine_id)
    elif mine_id:
        q = q.filter(Worker.mine_id == mine_id)

    if worker_id:
        q = q.filter(CertificationRecord.worker_id == worker_id)
    if status:
        q = q.filter(CertificationRecord.verification_status == status)

    records = q.order_by(CertificationRecord.created_at.desc()).all()
    return [_to_certification_out(r, now) for r in records]


# 6. GET SINGLE CERTIFICATION DETAILS
@router.get("/certifications/{cert_id}", response_model=CertificationRecordOut)
def get_certification_detail(
    cert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(CertificationRecord).filter(CertificationRecord.id == cert_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Certification record not found")

    if current_user.role == UserRole.CONTRACTOR.value and c.worker.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: Certificate belongs to another contractor")

    return _to_certification_out(c, datetime.now(timezone.utc))


# 7. ADD CERTIFICATION
@router.post("/certifications", response_model=CertificationRecordOut)
def add_certification_record(
    payload: CertificationRecordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    w = db.query(Worker).filter(Worker.id == payload.worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # Initial metadata structure
    meta = {
        "worker_name": {"value": f"{w.first_name} {w.last_name}", "confidence": 95.0, "status": "DETECTED"},
        "worker_id": {"value": w.worker_code, "confidence": 95.0, "status": "DETECTED"},
        "certification_name": {"value": payload.certification_name, "confidence": 94.0, "status": "DETECTED"},
        "certification_type": {"value": payload.certification_type, "confidence": 92.0, "status": "DETECTED"},
        "certificate_number": {"value": payload.certificate_ref, "confidence": 96.0, "status": "DETECTED"},
        "issuing_authority": {"value": payload.issuing_authority or "Directorate General of Mines Safety (DGMS)", "confidence": 91.0, "status": "DETECTED"},
        "issue_date": {"value": payload.issue_date.strftime("%Y-%m-%d"), "confidence": 95.0, "status": "DETECTED"},
        "expiry_date": {"value": payload.expiry_date.strftime("%Y-%m-%d") if payload.expiry_date else "Perpetual (No Expiry)", "confidence": 95.0, "status": "DETECTED"},
        "training_date": {"value": None, "confidence": 0.0, "status": "NOT_DETECTED"},
        "medical_fitness_date": {"value": None, "confidence": 0.0, "status": "NOT_DETECTED"},
        "validity_period": {"value": "Statutory Validity", "confidence": 90.0, "status": "DETECTED"}
    }

    hist = [
        {
            "timestamp": now_iso,
            "verifier_name": current_user.full_name or current_user.username,
            "decision": "SUBMITTED",
            "notes": "Statutory certification document uploaded and registered for verification."
        }
    ]

    record = CertificationRecord(
        worker_id=payload.worker_id,
        certification_type=payload.certification_type,
        certification_name=payload.certification_name,
        certificate_ref=payload.certificate_ref,
        issuing_authority=payload.issuing_authority or "Directorate General of Mines Safety (DGMS)",
        issue_date=payload.issue_date,
        expiry_date=payload.expiry_date,
        document_file=payload.document_file,
        file_name=payload.file_name or f"{payload.certificate_ref.replace('/', '_')}.pdf",
        file_type=payload.file_type or "PDF",
        file_size=payload.file_size or 142850,
        ocr_status="COMPLETED",
        ocr_confidence=93.5,
        extracted_metadata=json.dumps(meta),
        status="PENDING_VERIFICATION",
        verification_status="PENDING",
        verification_history=json.dumps(hist)
    )
    db.add(record)
    
    # Recalculate worker compliance
    w.compliance_status = _recalculate_worker_compliance(w, db)
    
    db.commit()
    db.refresh(record)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="CERTIFICATION_RECORD_ADDED",
        entity="CertificationRecord",
        entity_id=record.id,
        new_value={
            "worker_id": record.worker_id,
            "certification_name": record.certification_name,
            "certificate_ref": record.certificate_ref
        }
    )

    return _to_certification_out(record, now)


# 8. UPDATE EXTRACTED FIELDS (MANUAL CORRECTION BEFORE FINAL VERIFICATION)
@router.put("/certifications/{cert_id}/extracted-fields", response_model=CertificationRecordOut)
def update_certification_extracted_fields(
    cert_id: str,
    payload: CertificationExtractedFieldsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(CertificationRecord).filter(CertificationRecord.id == cert_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Certification record not found")

    if current_user.role == UserRole.CONTRACTOR.value and c.worker.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        meta = json.loads(c.extracted_metadata or "{}")
    except Exception:
        meta = {}

    if payload.certificate_number:
        c.certificate_ref = payload.certificate_number
        meta["certificate_number"] = {"value": payload.certificate_number, "confidence": 100.0, "status": "MANUAL_EDITED"}
    if payload.certification_name:
        c.certification_name = payload.certification_name
        meta["certification_name"] = {"value": payload.certification_name, "confidence": 100.0, "status": "MANUAL_EDITED"}
    if payload.certification_type:
        c.certification_type = payload.certification_type
        meta["certification_type"] = {"value": payload.certification_type, "confidence": 100.0, "status": "MANUAL_EDITED"}
    if payload.issuing_authority:
        c.issuing_authority = payload.issuing_authority
        meta["issuing_authority"] = {"value": payload.issuing_authority, "confidence": 100.0, "status": "MANUAL_EDITED"}
    if payload.issue_date:
        try:
            c.issue_date = datetime.strptime(payload.issue_date[:10], "%Y-%m-%d")
            meta["issue_date"] = {"value": payload.issue_date[:10], "confidence": 100.0, "status": "MANUAL_EDITED"}
        except Exception:
            pass
    if payload.expiry_date:
        if payload.expiry_date.lower().startswith("perp"):
            c.expiry_date = None
            meta["expiry_date"] = {"value": "Perpetual (No Expiry)", "confidence": 100.0, "status": "MANUAL_EDITED"}
        else:
            try:
                c.expiry_date = datetime.strptime(payload.expiry_date[:10], "%Y-%m-%d")
                meta["expiry_date"] = {"value": payload.expiry_date[:10], "confidence": 100.0, "status": "MANUAL_EDITED"}
            except Exception:
                pass

    c.extracted_metadata = json.dumps(meta)
    
    # Recalculate worker compliance
    c.worker.compliance_status = _recalculate_worker_compliance(c.worker, db)
    
    db.commit()
    db.refresh(c)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="CERTIFICATION_FIELDS_EDITED",
        entity="CertificationRecord",
        entity_id=c.id,
        new_value=payload.model_dump(exclude_unset=True)
    )

    return _to_certification_out(c, datetime.now(timezone.utc))


# 9. VERIFY CERTIFICATION DECISION (VERIFIED, REJECTED, NEEDS_CLARIFICATION)
@router.post("/certifications/{cert_id}/verify", response_model=CertificationRecordOut)
def verify_certification_record(
    cert_id: str,
    payload: CertificationVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # RBAC: Only Worker Officers and Corporate officers can verify
    if current_user.role not in [UserRole.WORKER_OFFICER.value, UserRole.CORPORATE.value]:
        raise HTTPException(
            status_code=403, 
            detail="Forbidden: Only authorized Worker Management officers can verify statutory certifications."
        )

    # Validate decision value
    valid_decisions = ["VERIFIED", "REJECTED", "NEEDS_CLARIFICATION"]
    if payload.decision not in valid_decisions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision '{payload.decision}'. Allowed: {valid_decisions}"
        )

    # Mandatory notes validation for REJECTED and NEEDS_CLARIFICATION
    if payload.decision in ["REJECTED", "NEEDS_CLARIFICATION"] and (not payload.notes or len(payload.notes.strip()) < 3):
        raise HTTPException(
            status_code=400,
            detail=f"Verification notes are mandatory when decision is '{payload.decision}'."
        )

    c = db.query(CertificationRecord).filter(CertificationRecord.id == cert_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Certification record not found")

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # Append to verification history
    try:
        hist = json.loads(c.verification_history or "[]")
    except Exception:
        hist = []

    decision_label = {
        "VERIFIED": "Verified & Valid",
        "REJECTED": "Rejected / Invalid",
        "NEEDS_CLARIFICATION": "Needs Clarification"
    }.get(payload.decision, payload.decision)

    hist_entry = {
        "timestamp": now_iso,
        "verifier_name": current_user.full_name or current_user.username,
        "verifier_id": current_user.id,
        "decision": payload.decision,
        "decision_label": decision_label,
        "notes": payload.notes or "Statutory verification decision confirmed."
    }
    hist.append(hist_entry)

    c.verification_status = payload.decision
    c.status = payload.decision
    c.verified_by_id = current_user.id
    c.verified_at = now
    c.verification_notes = payload.notes or ""
    c.verification_history = json.dumps(hist)

    # Recalculate worker compliance
    c.worker.compliance_status = _recalculate_worker_compliance(c.worker, db)

    db.commit()
    db.refresh(c)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="CERTIFICATION_VERIFIED",
        entity="CertificationRecord",
        entity_id=c.id,
        new_value={
            "decision": payload.decision,
            "verifier": current_user.username,
            "notes": payload.notes,
            "worker_compliance_status": c.worker.compliance_status
        }
    )

    return _to_certification_out(c, now)


# 10. DOWNLOAD/SERVE CERTIFICATION DOCUMENT
@router.get("/certifications/{cert_id}/download")
def download_certification_document(
    cert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(CertificationRecord).filter(CertificationRecord.id == cert_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Certification record not found")

    if current_user.role == UserRole.CONTRACTOR.value and c.worker.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    file_path = None
    if c.document_file and os.path.exists(c.document_file):
        file_path = c.document_file
    elif c.file_name:
        candidate = UPLOAD_DIR / c.file_name
        if candidate.exists():
            file_path = str(candidate)

    if not file_path or not os.path.exists(file_path):
        # Generate on-the-fly downloadable certificate summary file
        safe_cert_name = (c.certificate_ref or "cert").replace("/", "_")
        dummy_file = UPLOAD_DIR / f"{safe_cert_name}_statutory_record.txt"
        with open(dummy_file, "w", encoding="utf-8") as f:
            f.write(f"COALGUARD STATUTORY COMPETENCY RECORD\n")
            f.write(f"----------------------------------------\n")
            f.write(f"Certificate Name: {c.certification_name}\n")
            f.write(f"Certificate Type: {c.certification_type}\n")
            f.write(f"Certificate No:   {c.certificate_ref}\n")
            f.write(f"Issuing Authority: {c.issuing_authority}\n")
            f.write(f"Worker:           {c.worker.first_name} {c.worker.last_name} ({c.worker.worker_code})\n")
            f.write(f"Issue Date:       {c.issue_date}\n")
            f.write(f"Expiry Date:      {c.expiry_date or 'Perpetual'}\n")
            f.write(f"Status:           {c.verification_status}\n")
        file_path = str(dummy_file)

    return FileResponse(
        path=file_path,
        filename=c.file_name or f"{c.certificate_ref.replace('/', '_')}.pdf",
        media_type="application/octet-stream"
    )


# 11. FILE SERVING ROUTE
@router.get("/certifications/file/{filename}")
def serve_uploaded_file(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target = UPLOAD_DIR / filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(target), filename=filename)


# 12. ATTENDANCE & MEDICAL
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
        worker.compliance_status = _recalculate_worker_compliance(worker, db)

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


# 13. TRAINING RECORDS
@router.get("/training/all", response_model=List[TrainingRecordOut])
@router.get("/training", response_model=List[TrainingRecordOut])
def list_training_records(
    worker_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    mine_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(TrainingRecord).join(Worker)
    if current_user.role == UserRole.CONTRACTOR.value:
        q = q.filter(Worker.contractor_id == current_user.contractor_id)
    elif current_user.role in [UserRole.FIELD_OFFICER.value, UserRole.MINE_MANAGER.value]:
        q = q.filter(Worker.mine_id == current_user.mine_id)
    elif mine_id:
        q = q.filter(Worker.mine_id == mine_id)

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
    w.compliance_status = _recalculate_worker_compliance(w, db)
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
    
    record.worker.compliance_status = _recalculate_worker_compliance(record.worker, db)

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


# 14. WORKER SPECIFIC / PARAMETERIZED ROUTES
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
        w.compliance_status = _recalculate_worker_compliance(w, db)
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

    now = datetime.now(timezone.utc)
    records = db.query(CertificationRecord).filter(CertificationRecord.worker_id == worker_id).order_by(CertificationRecord.issue_date.desc()).all()
    return [_to_certification_out(r, now) for r in records]

