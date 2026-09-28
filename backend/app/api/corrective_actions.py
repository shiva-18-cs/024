from typing import List, Optional
from datetime import datetime, timezone
import random
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import CorrectiveAction, Violation, User, UserRole, ActionStatus, Alert
from app.schemas.schemas import (
    CorrectiveActionOut, CorrectiveActionCreate, CorrectiveActionResolve, CorrectiveActionVerify, CorrectiveActionClose
)
from app.services.audit_service import log_audit_action
from app.api.deps import get_current_user

router = APIRouter(prefix="/corrective-actions", tags=["Corrective Actions"])

def _to_out(a: CorrectiveAction, now: datetime) -> CorrectiveActionOut:
    item = CorrectiveActionOut.model_validate(a)
    item.violation_title = a.violation.title if a.violation else None
    item.contractor_name = a.contractor.company_name if a.contractor else None
    item.mine_name = a.mine.name if a.mine else None
    item.verified_by_name = a.verified_by.full_name if a.verified_by else None
    item.closed_by_name = a.closed_by.full_name if getattr(a, 'closed_by', None) else None
    due = a.due_date.replace(tzinfo=timezone.utc) if a.due_date and a.due_date.tzinfo is None else a.due_date
    item.is_overdue = bool(a.status not in [ActionStatus.CLOSED.value, ActionStatus.RESOLVED.value] and due is not None and due < now)
    return item

@router.get("", response_model=List[CorrectiveActionOut])
def list_corrective_actions(
    mine_id: Optional[str] = Query(None),
    contractor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    q = db.query(CorrectiveAction)

    # Strict role data isolation
    if current_user.role == UserRole.CONTRACTOR.value:
        if not current_user.contractor_id:
            return []
        q = q.filter(CorrectiveAction.contractor_id == current_user.contractor_id)
    elif current_user.role == UserRole.MINE_MANAGER.value:
        if current_user.mine_id:
            q = q.filter(CorrectiveAction.mine_id == current_user.mine_id)
    elif current_user.role == UserRole.FIELD_OFFICER.value:
        if current_user.mine_id:
            q = q.filter(CorrectiveAction.mine_id == current_user.mine_id)
    elif current_user.role == UserRole.WORKER_OFFICER.value:
        # Worker Management has no CAPA duties
        return []
    # Corporate sees all, but can filter by query params
    if mine_id and current_user.role == UserRole.CORPORATE.value:
        q = q.filter(CorrectiveAction.mine_id == mine_id)
    if contractor_id and current_user.role != UserRole.CONTRACTOR.value:
        q = q.filter(CorrectiveAction.contractor_id == contractor_id)
    if status:
        q = q.filter(CorrectiveAction.status == status)
    if priority:
        q = q.filter(CorrectiveAction.priority == priority)

    actions = q.order_by(CorrectiveAction.due_date.asc()).all()
    return [_to_out(a, now) for a in actions]

@router.get("/{action_id}", response_model=CorrectiveActionOut)
def get_action(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    a = db.query(CorrectiveAction).filter(CorrectiveAction.id == action_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Corrective action not found")
    
    # Permission check
    if current_user.role == UserRole.CONTRACTOR.value and a.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: CAPA belongs to another contractor")
    if current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id and a.mine_id != current_user.mine_id:
        raise HTTPException(status_code=403, detail="Access denied: CAPA belongs to another mine")
    if current_user.role == UserRole.WORKER_OFFICER.value:
        raise HTTPException(status_code=403, detail="Access denied for Worker Management")

    return _to_out(a, datetime.now(timezone.utc))

@router.post("", response_model=CorrectiveActionOut)
def create_action(
    payload: CorrectiveActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Issue CAPA: Only Mine Manager (or Corporate) can create and assign CAPA to a Contractor.
    """
    if current_user.role not in [UserRole.MINE_MANAGER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Mine Manager can issue and assign CAPAs")

    violation = db.query(Violation).filter(Violation.id == payload.violation_id).first()
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")

    now = datetime.now(timezone.utc)
    act_code = f"CAPA-{now.strftime('%y%m%d')}-{random.randint(1000, 9999)}"

    action = CorrectiveAction(
        action_code=act_code,
        violation_id=payload.violation_id,
        contractor_id=payload.contractor_id,
        mine_id=payload.mine_id or current_user.mine_id or violation.mine_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        due_date=payload.due_date,
        status=ActionStatus.ACTION_REQUIRED.value,
        assigned_to=payload.assigned_to or "Contractor Site In-Charge"
    )
    db.add(action)

    # Notify contractor of newly assigned CAPA
    alert = Alert(
        title=f"New CAPA Assigned: {action.action_code}",
        message=f"A corrective action has been issued for violation '{violation.title}'. Deadline: {action.due_date.strftime('%Y-%m-%d')}.",
        alert_type="ACTION_ASSIGNED",
        severity=action.priority,
        escalation_level=1,
        mine_id=action.mine_id,
        contractor_id=action.contractor_id
    )
    db.add(alert)
    db.commit()
    db.refresh(action)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="CAPA_ISSUED_AND_ASSIGNED",
        entity="CorrectiveAction",
        entity_id=action.id,
        new_value={"action_code": action.action_code, "contractor_id": action.contractor_id, "due_date": action.due_date.isoformat()}
    )

    return _to_out(action, now)

@router.post("/{action_id}/resolve", response_model=CorrectiveActionOut)
def resolve_action(
    action_id: str,
    payload: CorrectiveActionResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Contractor fixes issue and submits proof for Field Officer verification.
    """
    if current_user.role != UserRole.CONTRACTOR.value and current_user.role != UserRole.MINE_MANAGER.value:
        raise HTTPException(status_code=403, detail="Only assigned Contractor can submit corrective action proof")

    a = db.query(CorrectiveAction).filter(CorrectiveAction.id == action_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Corrective action not found")
    
    if current_user.role == UserRole.CONTRACTOR.value and a.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="You can only submit proof for your own assigned CAPAs")

    now = datetime.now(timezone.utc)
    a.status = ActionStatus.UNDER_VERIFICATION.value
    a.resolution_notes = payload.resolution_notes
    a.resolution_evidence_file = payload.evidence_file_name or "resolution_evidence.jpg"
    a.resolved_at = now
    
    # Notify Field Officer and Mine Manager that proof has been submitted
    alert = Alert(
        title=f"CAPA Proof Submitted: {a.action_code}",
        message=f"Contractor submitted corrective action proof for '{a.title}'. Field verification required.",
        alert_type="CAPA_PROOF_SUBMITTED",
        severity=a.priority,
        escalation_level=1,
        mine_id=a.mine_id,
        contractor_id=a.contractor_id
    )
    db.add(alert)
    db.commit()
    db.refresh(a)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="CAPA_PROOF_SUBMITTED_FOR_VERIFICATION",
        entity="CorrectiveAction",
        entity_id=a.id,
        new_value={"resolution_notes": a.resolution_notes, "status": a.status}
    )

    return _to_out(a, now)

@router.post("/{action_id}/verify", response_model=CorrectiveActionOut)
def verify_action(
    action_id: str,
    payload: CorrectiveActionVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Field Officer Verifies Contractor's proof: Marks FIXED or NOT FIXED.
    Field Officer CANNOT close the CAPA.
    """
    if current_user.role != UserRole.FIELD_OFFICER.value and current_user.role != UserRole.MINE_MANAGER.value:
        raise HTTPException(status_code=403, detail="Only Field Officer can perform field proof verification")

    a = db.query(CorrectiveAction).filter(CorrectiveAction.id == action_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Corrective action not found")

    if a.status not in [ActionStatus.UNDER_VERIFICATION.value, ActionStatus.PROOF_SUBMITTED.value, ActionStatus.ACTION_REQUIRED.value]:
        raise HTTPException(status_code=400, detail=f"Cannot verify CAPA in '{a.status}' status. Proof must be submitted first.")

    now = datetime.now(timezone.utc)
    a.verified_by_id = current_user.id
    a.verified_at = now
    a.verification_notes = payload.verification_notes

    if payload.approved:
        a.status = ActionStatus.FIXED.value
        a.verification_decision = "FIXED"
        # Alert Mine Manager to review and formally close CAPA
        alert = Alert(
            title=f"CAPA Verified FIXED by Field Officer: {a.action_code}",
            message=f"Field Officer verified '{a.title}' as FIXED. Mine Manager closure pending.",
            alert_type="CAPA_VERIFIED_FIXED",
            severity="LOW",
            escalation_level=2,
            mine_id=a.mine_id
        )
        db.add(alert)
    else:
        a.status = ActionStatus.ACTION_REQUIRED.value
        a.verification_decision = "NOT_FIXED"
        # Alert Contractor to fix again
        alert = Alert(
            title=f"CAPA Verification Rejected (NOT FIXED): {a.action_code}",
            message=f"Field Officer rejected corrective proof: {payload.verification_notes}. Action required again.",
            alert_type="CAPA_REJECTED",
            severity="HIGH",
            escalation_level=1,
            mine_id=a.mine_id,
            contractor_id=a.contractor_id
        )
        db.add(alert)

    db.commit()
    db.refresh(a)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="CAPA_VERIFIED_FIXED" if payload.approved else "CAPA_VERIFIED_NOT_FIXED",
        entity="CorrectiveAction",
        entity_id=a.id,
        new_value={"decision": a.verification_decision, "status": a.status, "notes": payload.verification_notes}
    )

    return _to_out(a, now)

@router.post("/{action_id}/close", response_model=CorrectiveActionOut)
def close_action(
    action_id: str,
    payload: CorrectiveActionClose,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mine Manager Formal Closure:
    Mine Manager can close CAPA ONLY after successful Field Officer verification (status FIXED or VERIFIED).
    """
    if current_user.role not in [UserRole.MINE_MANAGER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Mine Manager can close verified CAPAs")

    a = db.query(CorrectiveAction).filter(CorrectiveAction.id == action_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Corrective action not found")

    if current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id and a.mine_id != current_user.mine_id:
        raise HTTPException(status_code=403, detail="You can only close CAPAs for your own mine")

    # Strict business rule enforcement: cannot close without verification
    if a.status not in [ActionStatus.FIXED.value, ActionStatus.VERIFIED.value]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot close CAPA in '{a.status}' status. It must be verified as FIXED by Field Officer first."
        )

    now = datetime.now(timezone.utc)
    a.status = ActionStatus.CLOSED.value
    a.closed_by_id = current_user.id
    a.closed_at = now
    a.closure_notes = payload.closure_notes

    # Mark associated violation as RESOLVED
    if a.violation:
        a.violation.status = "RESOLVED"
        a.violation.resolved_at = now

    alert = Alert(
        title=f"CAPA Closed: {a.action_code}",
        message=f"Mine Manager approved final closure for '{a.title}'. Directive completed.",
        alert_type="CAPA_CLOSED",
        severity="LOW",
        escalation_level=1,
        mine_id=a.mine_id,
        contractor_id=a.contractor_id
    )
    db.add(alert)
    db.commit()
    db.refresh(a)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="CAPA_CLOSED_BY_MINE_MANAGER",
        entity="CorrectiveAction",
        entity_id=a.id,
        new_value={"status": a.status, "closure_notes": payload.closure_notes}
    )

    return _to_out(a, now)
