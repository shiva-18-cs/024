from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Inspection, InspectionChecklist, InspectionObservation, GeoEvidence, User, UserRole, Mine, Contractor, WorkflowStage
)
from app.schemas.schemas import (
    InspectionOut, InspectionCreate, GeoEvidenceOut
)
from app.services.workflow_service import WorkflowService
from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/inspections", tags=["Inspections"])

@router.get("", response_model=List[InspectionOut])
def list_inspections(
    mine_id: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    inspection_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Inspection)

    # Role-based scoping
    if current_user.role == UserRole.CONTRACTOR.value:
        if current_user.contractor_id:
            q = q.filter(Inspection.contractor_id == current_user.contractor_id)
        else:
            return []
    elif current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id:
        q = q.filter(Inspection.mine_id == current_user.mine_id)
    elif current_user.role == UserRole.FIELD_OFFICER.value and current_user.mine_id:
        q = q.filter(Inspection.mine_id == current_user.mine_id)

    if mine_id and current_user.role == UserRole.CORPORATE.value:
        q = q.filter(Inspection.mine_id == mine_id)
    if stage:
        q = q.filter(Inspection.workflow_stage == stage)
    if inspection_type:
        q = q.filter(Inspection.inspection_type == inspection_type)

    inspections = q.order_by(Inspection.inspection_date.desc()).all()
    results = []
    for insp in inspections:
        item = InspectionOut.model_validate(insp)
        item.mine_name = insp.mine.name if insp.mine else None
        item.contractor_name = insp.contractor.company_name if insp.contractor else None
        item.officer_name = insp.officer.full_name if insp.officer else None
        results.append(item)
    return results

@router.get("/{inspection_id}", response_model=InspectionOut)
def get_inspection(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")

    if current_user.role == UserRole.CONTRACTOR.value and insp.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: Inspection belongs to another contractor")
    if current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id and insp.mine_id != current_user.mine_id:
        raise HTTPException(status_code=403, detail="Access denied: Inspection belongs to another mine")
    
    item = InspectionOut.model_validate(insp)
    item.mine_name = insp.mine.name if insp.mine else None
    item.contractor_name = insp.contractor.company_name if insp.contractor else None
    item.officer_name = insp.officer.full_name if insp.officer else None
    return item

@router.post("", response_model=InspectionOut)
def create_inspection(
    payload: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Field Officer conducts and logs field inspection.
    """
    if current_user.role not in [UserRole.FIELD_OFFICER.value, UserRole.MINE_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Only Field Officer can conduct field inspections")

    mine = db.query(Mine).filter(Mine.id == payload.mine_id).first()
    if not mine:
        raise HTTPException(status_code=404, detail="Mine not found")

    now = datetime.now(timezone.utc)
    insp_count = db.query(Inspection).count() + 1
    insp_number = f"INSP-{mine.code[:3]}-{now.strftime('%y%m%d')}-{insp_count:03d}"

    inspection = Inspection(
        inspection_number=insp_number,
        mine_id=payload.mine_id,
        contractor_id=payload.contractor_id,
        officer_id=current_user.id,
        inspection_type=payload.inspection_type,
        inspection_date=now,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_tag=payload.location_tag,
        summary=payload.summary,
        workflow_stage=WorkflowStage.DRAFT.value
    )
    db.add(inspection)
    db.flush()

    for chk in payload.checklists:
        db.add(InspectionChecklist(
            inspection_id=inspection.id,
            item_key=chk.item_key,
            category=chk.category,
            item_title=chk.item_title,
            is_compliant=chk.is_compliant,
            remarks=chk.remarks
        ))

    for obs in payload.observations:
        db.add(InspectionObservation(
            inspection_id=inspection.id,
            title=obs.title,
            description=obs.description,
            category=obs.category,
            severity=obs.severity,
            requires_action=obs.requires_action
        ))

    db.commit()
    db.refresh(inspection)

    item = InspectionOut.model_validate(inspection)
    item.mine_name = inspection.mine.name
    item.contractor_name = inspection.contractor.company_name if inspection.contractor else None
    item.officer_name = current_user.full_name
    return item

@router.post("/{inspection_id}/submit")
def submit_inspection_endpoint(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits the field inspection to the Mine Manager.
    Automatically runs Compliance Rules and AI-Assisted Risk Assessment.
    """
    if current_user.role not in [UserRole.FIELD_OFFICER.value, UserRole.MINE_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Only Field Officer can submit field inspections")

    return WorkflowService.submit_inspection(db, inspection_id, current_user)

@router.post("/{inspection_id}/manager-review")
def manager_review_endpoint(
    inspection_id: str,
    data_is_ok: bool = Form(...),
    notes: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mine Manager decision gateway:
    If data_is_ok == True: Generates Automated Compliance Report (PDF) and routes to Corporate Review.
    If data_is_ok == False: Rejects inspection back for corrective action / re-submission.
    """
    if current_user.role not in [UserRole.MINE_MANAGER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Mine Manager can review and validate inspections")

    return WorkflowService.mine_manager_review(db, inspection_id, current_user, data_is_ok, notes)

@router.post("/{inspection_id}/evidence", response_model=GeoEvidenceOut)
async def upload_evidence(
    inspection_id: str,
    caption: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.FIELD_OFFICER.value, UserRole.MINE_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Only Field Officer can upload inspection evidence")

    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")

    file_bytes = await file.read()
    dest_path = f"{settings.UPLOAD_DIR}/{file.filename}"
    with open(dest_path, "wb") as f:
        f.write(file_bytes)

    evidence = GeoEvidence(
        inspection_id=inspection_id,
        file_name=file.filename,
        file_path=dest_path,
        caption=caption,
        latitude=latitude,
        longitude=longitude,
        captured_at=datetime.now(timezone.utc),
        officer_id=current_user.id
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return GeoEvidenceOut.model_validate(evidence)
