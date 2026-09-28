from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Violation, CorrectiveAction, User, UserRole, ActionStatus
from app.schemas.schemas import ViolationOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/violations", tags=["Violations"])

def _compute_violation_status(v: Violation, db: Session, now: datetime) -> str:
    """
    Computes precise status: OPEN, SOLVED, UNSOLVED, OVERDUE, ESCALATED, RECURRING.
    """
    # Check linked corrective actions
    capas = v.corrective_actions or []
    has_closed_capa = any(c.status in ["RESOLVED", "CLOSED"] for c in capas)
    has_not_fixed_capa = any(c.verification_decision == "NOT_FIXED" for c in capas)
    has_overdue_capa = any(
        c.status not in ["RESOLVED", "CLOSED"] and
        (c.due_date.replace(tzinfo=timezone.utc) if c.due_date.tzinfo is None else c.due_date) < now
        for c in capas
    )

    if has_closed_capa:
        return "SOLVED"
    if has_overdue_capa:
        return "OVERDUE"
    if has_not_fixed_capa:
        return "UNSOLVED"

    # Check recurring in same mine
    same_vios = db.query(Violation).filter(
        Violation.mine_id == v.mine_id,
        Violation.title == v.title
    ).count()
    if same_vios > 1:
        return "RECURRING"

    if v.severity == "CRITICAL":
        return "ESCALATED"

    if v.status in ["RESOLVED", "CLOSED", "SOLVED"]:
        return "SOLVED"

    return "OPEN"

def _to_violation_out(v: Violation, db: Session, now: datetime) -> ViolationOut:
    computed_status = _compute_violation_status(v, db, now)
    item = ViolationOut.model_validate(v)
    item.status = computed_status
    item.mine_name = v.mine.name if v.mine else None
    item.contractor_name = v.contractor.company_name if v.contractor else None
    return item

@router.get("/summary")
def get_violations_summary(
    mine_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns counts by the 6 business statuses:
    OPEN, SOLVED, UNSOLVED, OVERDUE, ESCALATED, RECURRING.
    """
    now = datetime.now(timezone.utc)
    q = db.query(Violation)

    if current_user.role == UserRole.CONTRACTOR.value:
        if current_user.contractor_id:
            q = q.filter(Violation.contractor_id == current_user.contractor_id)
        else:
            return {"OPEN": 0, "SOLVED": 0, "UNSOLVED": 0, "OVERDUE": 0, "ESCALATED": 0, "RECURRING": 0, "TOTAL": 0}
    elif current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id:
        q = q.filter(Violation.mine_id == current_user.mine_id)
    elif mine_id and current_user.role == UserRole.CORPORATE.value:
        q = q.filter(Violation.mine_id == mine_id)

    violations = q.all()
    counts = {
        "OPEN": 0,
        "SOLVED": 0,
        "UNSOLVED": 0,
        "OVERDUE": 0,
        "ESCALATED": 0,
        "RECURRING": 0,
        "TOTAL": len(violations)
    }

    for v in violations:
        st = _compute_violation_status(v, db, now)
        counts[st] = counts.get(st, 0) + 1

    return counts

@router.get("", response_model=List[ViolationOut])
def list_violations(
    mine_id: Optional[str] = Query(None),
    contractor_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    q = db.query(Violation)

    # Role scoping
    if current_user.role == UserRole.CONTRACTOR.value:
        if current_user.contractor_id:
            q = q.filter(Violation.contractor_id == current_user.contractor_id)
        else:
            return []
    elif current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id:
        q = q.filter(Violation.mine_id == current_user.mine_id)
    elif current_user.role == UserRole.FIELD_OFFICER.value and current_user.mine_id:
        q = q.filter(Violation.mine_id == current_user.mine_id)

    if mine_id and current_user.role == UserRole.CORPORATE.value:
        q = q.filter(Violation.mine_id == mine_id)
    if contractor_id:
        q = q.filter(Violation.contractor_id == contractor_id)
    if category:
        q = q.filter(Violation.category.ilike(f"%{category}%"))
    if severity:
        q = q.filter(Violation.severity == severity)

    violations = q.order_by(Violation.detected_at.desc()).all()
    results = [_to_violation_out(v, db, now) for v in violations]

    # Filter by computed status if requested
    if status:
        results = [r for r in results if r.status == status]

    return results

@router.get("/{violation_id}", response_model=ViolationOut)
def get_violation(
    violation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")

    if current_user.role == UserRole.CONTRACTOR.value and v.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id and v.mine_id != current_user.mine_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return _to_violation_out(v, db, datetime.now(timezone.utc))
