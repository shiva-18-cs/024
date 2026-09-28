from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Contractor, Contract, ContractRequirement, Document, User, UserRole, ActionStatus, Worker, CorrectiveAction, Violation, Inspection
)
from app.schemas.schemas import (
    ContractorOut, ContractorCreate, ContractOut, ContractRequirementOut
)
from app.services.compliance_engine import ComplianceEngine
from app.api.deps import get_current_user

router = APIRouter(prefix="/contractors", tags=["Contractors"])

@router.get("/me/dashboard")
def get_my_contractor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Dedicated Tenant-Isolated Contractor Dashboard API.
    Derives contractor identity strictly from authenticated JWT/user.
    """
    if current_user.role != UserRole.CONTRACTOR.value or not current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Only authenticated Contractors can access this dashboard")

    c_id = current_user.contractor_id
    contractor = db.query(Contractor).filter(Contractor.id == c_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor company not found")

    now = datetime.now(timezone.utc)
    c_workers = db.query(Worker).filter(Worker.contractor_id == c_id)
    c_docs = db.query(Document).filter(Document.contractor_id == c_id)
    c_contracts = db.query(Contract).filter(Contract.contractor_id == c_id)
    c_capas = db.query(CorrectiveAction).filter(CorrectiveAction.contractor_id == c_id)
    c_vios = db.query(Violation).filter(Violation.contractor_id == c_id)
    c_insps = db.query(Inspection).filter(Inspection.contractor_id == c_id)

    assigned_mines = list(set([con.mine.name for con in c_contracts.all() if con.mine]))
    if not assigned_mines and current_user.mine:
        assigned_mines = [current_user.mine.name]

    return {
        "contractor_id": contractor.id,
        "company_name": contractor.company_name,
        "registration_number": contractor.reg_number,
        "license_category": contractor.license_category,
        "compliance_score": contractor.compliance_score,
        "risk_level": contractor.risk_level,
        "assigned_mines": assigned_mines,
        "metrics": {
            "total_workers": c_workers.count(),
            "active_workers": c_workers.filter(Worker.is_active == True).count(),
            "pending_worker_verifications": c_workers.filter(Worker.verification_status == "PENDING").count(),
            "verified_workers": c_workers.filter(Worker.verification_status == "VERIFIED").count(),
            "total_documents": c_docs.count(),
            "expiring_documents": c_docs.filter(Document.expiry_date >= now, Document.expiry_date <= now.replace(year=now.year+1)).count(),
            "expired_documents": c_docs.filter(Document.status == "EXPIRED").count(),
            "total_contracts": c_contracts.count(),
            "active_contracts": c_contracts.filter(Contract.status == "ACTIVE").count(),
            "open_corrective_actions": c_capas.filter(CorrectiveAction.status.notin_(["RESOLVED", "CLOSED"])).count(),
            "resolved_corrective_actions": c_capas.filter(CorrectiveAction.status.in_(["RESOLVED", "CLOSED"])).count(),
            "overdue_corrective_actions": c_capas.filter(CorrectiveAction.due_date < now, CorrectiveAction.status.notin_(["RESOLVED", "CLOSED"])).count(),
            "open_violations": c_vios.filter(Violation.status == "OPEN").count(),
            "total_inspections": c_insps.count()
        }
    }

@router.get("", response_model=List[ContractorOut])
def list_contractors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Contractor)
    # If contractor role, only return their own profile
    if current_user.role == UserRole.CONTRACTOR.value:
        if current_user.contractor_id:
            q = q.filter(Contractor.id == current_user.contractor_id)
        else:
            return []

    contractors = q.all()
    results = []
    for c in contractors:
        item = ContractorOut.model_validate(c)
        item.active_contracts_count = sum(1 for con in c.contracts if con.status == "ACTIVE")
        item.pending_actions_count = sum(
            1 for ca in c.corrective_actions
            if ca.status in [ActionStatus.OPEN.value, ActionStatus.ASSIGNED.value, ActionStatus.IN_PROGRESS.value]
        )
        results.append(item)
    return results

@router.get("/{contractor_id}", response_model=ContractorOut)
def get_contractor(
    contractor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Tenant Data Isolation
    if current_user.role == UserRole.CONTRACTOR.value and contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot view other contractor profiles")

    c = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contractor not found")
    
    item = ContractorOut.model_validate(c)
    item.active_contracts_count = sum(1 for con in c.contracts if con.status == "ACTIVE")
    item.pending_actions_count = sum(
        1 for ca in c.corrective_actions
        if ca.status in [ActionStatus.OPEN.value, ActionStatus.ASSIGNED.value, ActionStatus.IN_PROGRESS.value]
    )
    return item

@router.get("/{contractor_id}/evaluate")
def evaluate_contractor_posture(
    contractor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Tenant Data Isolation
    if current_user.role == UserRole.CONTRACTOR.value and contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot evaluate other contractor profiles")

    result = ComplianceEngine.evaluate_contractor_profile(db, contractor_id)
    if not result:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return result

@router.get("/{contractor_id}/contracts", response_model=List[ContractOut])
def get_contractor_contracts(
    contractor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Tenant Data Isolation
    if current_user.role == UserRole.CONTRACTOR.value and contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot view other contractor contracts")

    contracts = db.query(Contract).filter(Contract.contractor_id == contractor_id).all()
    res = []
    for c in contracts:
        out = ContractOut.model_validate(c)
        out.contractor_name = c.contractor.company_name if c.contractor else None
        out.mine_name = c.mine.name if c.mine else None
        res.append(out)
    return res

@router.get("/{contractor_id}/requirements", response_model=List[ContractRequirementOut])
def get_contractor_requirements(
    contractor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Tenant Data Isolation
    if current_user.role == UserRole.CONTRACTOR.value and contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot view other contractor requirements")

    contracts = db.query(Contract).filter(Contract.contractor_id == contractor_id).all()
    contract_ids = [c.id for c in contracts]
    reqs = db.query(ContractRequirement).filter(ContractRequirement.contract_id.in_(contract_ids)).all()
    return [ContractRequirementOut.model_validate(r) for r in reqs]

@router.post("", response_model=ContractorOut)
def create_contractor(
    payload: ContractorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.CORPORATE.value:
        raise HTTPException(status_code=403, detail="Only Corporate Management can create contractor profiles")

    existing = db.query(Contractor).filter(Contractor.reg_number == payload.reg_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Registration number already exists")
    
    contractor = Contractor(**payload.model_dump())
    db.add(contractor)
    db.commit()
    db.refresh(contractor)
    return ContractorOut.model_validate(contractor)
