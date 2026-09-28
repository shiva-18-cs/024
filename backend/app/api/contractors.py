from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Contractor, Contract, ContractRequirement, Document, User, UserRole, ActionStatus, Worker,
    CorrectiveAction, Violation, Inspection, AuditLog, EscalationLog
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


@router.get("/{contractor_id}/profile")
def get_contractor_full_profile(
    contractor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Full integrated Contractor Profile for Corporate Management.
    Returns all data: basic info, contracts, workers, documents (with OCR),
    inspections, violations, corrective actions, escalations, and audit trail.
    RBAC: Contractor can only view their own profile.
    """
    # Tenant isolation: contractors can only view own profile
    if current_user.role == UserRole.CONTRACTOR.value and contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot view other contractor profiles")

    c = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contractor not found")

    now = datetime.now(timezone.utc)

    # ── Contracts ──────────────────────────────────────────────────────────────
    contracts_q = db.query(Contract).filter(Contract.contractor_id == contractor_id).all()
    contracts_data = []
    for con in contracts_q:
        reqs = db.query(ContractRequirement).filter(ContractRequirement.contract_id == con.id).all()
        contracts_data.append({
            "id": con.id,
            "contract_number": con.contract_number,
            "title": con.title,
            "mine_name": con.mine.name if con.mine else None,
            "scope_of_work": con.scope_of_work,
            "start_date": con.start_date.isoformat() if con.start_date else None,
            "end_date": con.end_date.isoformat() if con.end_date else None,
            "value_inr_crores": con.value_inr_crores,
            "status": con.status,
            "requirements_count": len(reqs),
            "requirements_pending": sum(1 for r in reqs if r.status not in ["COMPLIANT", "VERIFIED"]),
        })

    # ── Workers ────────────────────────────────────────────────────────────────
    workers_q = db.query(Worker).filter(Worker.contractor_id == contractor_id).all()
    workers_data = [{
        "id": w.id,
        "worker_code": w.worker_code,
        "name": f"{w.first_name} {w.last_name}",
        "designation": w.designation,
        "mine_name": w.mine.name if w.mine else None,
        "is_active": w.is_active,
        "compliance_status": w.compliance_status,
        "verification_status": w.verification_status,
        "medical_fitness_status": w.medical_fitness_status,
        "training_status": w.training_status,
        "joining_date": w.joining_date.isoformat() if w.joining_date else None,
    } for w in workers_q]

    # ── Documents (with OCR) ───────────────────────────────────────────────────
    docs_q = db.query(Document).filter(Document.contractor_id == contractor_id).order_by(Document.created_at.desc()).all()
    docs_data = []
    for d in docs_q:
        is_expired = d.expiry_date and d.expiry_date.replace(tzinfo=timezone.utc) < now
        expiring_soon = (
            not is_expired and d.expiry_date and
            (d.expiry_date.replace(tzinfo=timezone.utc) - now).days <= 30
        )
        docs_data.append({
            "id": d.id,
            "file_name": d.file_name,
            "doc_category": d.doc_category,
            "file_type": d.file_type,
            "status": d.status,
            "ocr_status": d.ocr_status,
            "ocr_confidence": d.ocr_confidence,
            "issue_date": d.issue_date.isoformat() if d.issue_date else None,
            "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
            "is_expired": is_expired,
            "expiring_soon": expiring_soon,
            "manual_verification_required": d.manual_verification_required,
            "extracted_metadata": d.extracted_metadata or {},
            "uploaded_by": d.uploaded_by.full_name if d.uploaded_by else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    # ── Inspections ────────────────────────────────────────────────────────────
    inspections_q = db.query(Inspection).filter(Inspection.contractor_id == contractor_id)\
        .order_by(Inspection.inspection_date.desc()).limit(20).all()
    inspections_data = [{
        "id": i.id,
        "inspection_number": i.inspection_number,
        "inspection_type": i.inspection_type,
        "mine_name": i.mine.name if i.mine else None,
        "officer_name": i.officer.full_name if i.officer else None,
        "inspection_date": i.inspection_date.isoformat() if i.inspection_date else None,
        "location_tag": i.location_tag,
        "risk_level": i.risk_level,
        "compliance_score": i.compliance_score,
        "workflow_stage": i.workflow_stage,
        "violations_count": len(i.violations),
    } for i in inspections_q]

    # ── Violations ─────────────────────────────────────────────────────────────
    violations_q = db.query(Violation).filter(Violation.contractor_id == contractor_id)\
        .order_by(Violation.detected_at.desc()).limit(20).all()
    violations_data = [{
        "id": v.id,
        "violation_code": v.violation_code,
        "title": v.title,
        "category": v.category,
        "severity": v.severity,
        "regulation_reference": v.regulation_reference,
        "status": v.status,
        "mine_name": v.mine.name if v.mine else None,
        "detected_at": v.detected_at.isoformat() if v.detected_at else None,
        "resolved_at": v.resolved_at.isoformat() if v.resolved_at else None,
        "corrective_actions_count": len(v.corrective_actions),
    } for v in violations_q]

    # ── Corrective Actions ─────────────────────────────────────────────────────
    capas_q = db.query(CorrectiveAction).filter(CorrectiveAction.contractor_id == contractor_id)\
        .order_by(CorrectiveAction.created_at.desc()).limit(20).all()
    capas_data = [{
        "id": ca.id,
        "action_code": ca.action_code,
        "title": ca.title,
        "priority": ca.priority,
        "status": ca.status,
        "due_date": ca.due_date.isoformat() if ca.due_date else None,
        "assigned_to": ca.assigned_to,
        "is_overdue": ca.due_date and ca.due_date.replace(tzinfo=timezone.utc) < now and ca.status not in ["RESOLVED", "CLOSED"],
        "resolved_at": ca.resolved_at.isoformat() if ca.resolved_at else None,
        "violation_title": ca.violation.title if ca.violation else None,
    } for ca in capas_q]

    # ── Escalations ────────────────────────────────────────────────────────────
    escalations_q = db.query(EscalationLog).filter(EscalationLog.contractor_id == contractor_id)\
        .order_by(EscalationLog.created_at.desc()).limit(15).all()
    escalations_data = [{
        "id": e.id,
        "escalation_level": e.escalation_level,
        "event_type": e.event_type,
        "reason": e.reason,
        "status": e.status,
        "created_by": e.created_by.full_name if e.created_by else "System",
        "created_at": e.created_at.isoformat() if e.created_at else None,
    } for e in escalations_q]

    # ── Audit Trail ────────────────────────────────────────────────────────────
    audit_q = db.query(AuditLog).filter(
        (AuditLog.entity_id == contractor_id) |
        (AuditLog.entity == "Contractor")
    ).order_by(AuditLog.timestamp.desc()).limit(30).all()
    audit_data = [{
        "id": a.id,
        "username": a.username,
        "role": a.role,
        "action": a.action,
        "entity": a.entity,
        "timestamp": a.timestamp.isoformat() if a.timestamp else None,
    } for a in audit_q]

    # ── Metrics Summary ────────────────────────────────────────────────────────
    active_contracts = sum(1 for con in contracts_q if con.status == "ACTIVE")
    open_capas = sum(1 for ca in capas_q if ca.status not in ["RESOLVED", "CLOSED"])
    overdue_capas = sum(
        1 for ca in capas_q
        if ca.due_date and ca.due_date.replace(tzinfo=timezone.utc) < now
        and ca.status not in ["RESOLVED", "CLOSED"]
    )
    open_violations = sum(1 for v in violations_q if v.status == "OPEN")
    expired_docs_count = sum(1 for d in docs_data if d["is_expired"])
    expiring_docs_count = sum(1 for d in docs_data if d["expiring_soon"])

    # Pending actions = open CAPAs + open violations
    pending_actions = open_capas + open_violations

    return {
        # ── Identity ──
        "id": c.id,
        "company_name": c.company_name,
        "reg_number": c.reg_number,
        "gstin": c.gstin,
        "pan": c.pan,
        "contact_person": c.contact_person,
        "email": c.email,
        "phone": c.phone,
        "address": c.address,
        "license_category": c.license_category,
        "license_expiry": c.license_expiry.isoformat() if c.license_expiry else None,
        "is_active": c.is_active,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        # ── Compliance ──
        "compliance_score": c.compliance_score,
        "risk_level": c.risk_level,
        # ── Summary Metrics ──
        "metrics": {
            "total_workers": len(workers_q),
            "active_workers": sum(1 for w in workers_q if w.is_active),
            "compliant_workers": sum(1 for w in workers_q if w.compliance_status == "COMPLIANT"),
            "total_contracts": len(contracts_q),
            "active_contracts": active_contracts,
            "total_documents": len(docs_q),
            "expired_documents": sum(1 for d in docs_data if d["is_expired"]),
            "expiring_documents": sum(1 for d in docs_data if d["expiring_soon"]),
            "total_inspections": len(inspections_q),
            "open_violations": open_violations,
            "open_corrective_actions": open_capas,
            "overdue_corrective_actions": overdue_capas,
            "pending_actions": pending_actions,
            "active_escalations": sum(1 for e in escalations_data if e["status"] == "ACTIVE"),
        },
        # ── Full Data ──
        "contracts": contracts_data,
        "workers": workers_data,
        "documents": docs_data,
        "inspections": inspections_data,
        "violations": violations_data,
        "corrective_actions": capas_data,
        "escalations": escalations_data,
        "audit_trail": audit_data,
    }
