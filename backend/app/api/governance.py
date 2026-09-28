from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Mine, Violation, CorrectiveAction, Alert, Inspection, Report, User, UserRole, ActionStatus, EscalationLog
)
from app.services.audit_service import log_audit_action
from app.api.deps import get_current_user

router = APIRouter(prefix="/governance", tags=["Governance"])

@router.get("/escalations")
def get_escalations(
    mine_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Returns active escalations across mines.
    Available to Corporate Management (all mines) and Mine Manager (their mine).
    """
    if current_user.role not in [UserRole.CORPORATE.value, UserRole.MINE_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Escalations are only accessible to Mine Manager and Corporate Management")

    now = datetime.now(timezone.utc)
    target_mine_id = mine_id
    if current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id:
        target_mine_id = current_user.mine_id

    # 1. Critical and escalated alerts
    q_alerts = db.query(Alert).filter(Alert.is_read == False)
    if target_mine_id:
        q_alerts = q_alerts.filter(Alert.mine_id == target_mine_id)
    alerts = q_alerts.order_by(Alert.escalation_level.desc(), Alert.created_at.desc()).all()

    # 2. Overdue CAPAs
    q_actions = db.query(CorrectiveAction).filter(
        CorrectiveAction.status.notin_([ActionStatus.RESOLVED.value, ActionStatus.CLOSED.value]),
        CorrectiveAction.due_date < now
    )
    if target_mine_id:
        q_actions = q_actions.filter(CorrectiveAction.mine_id == target_mine_id)
    overdue_actions = q_actions.all()

    # 3. High severity open violations
    q_vios = db.query(Violation).filter(
        Violation.status == "OPEN",
        Violation.severity.in_(["HIGH", "CRITICAL"])
    )
    if target_mine_id:
        q_vios = q_vios.filter(Violation.mine_id == target_mine_id)
    critical_vios = q_vios.all()

    escalations = []

    # Map overdue actions into escalation items
    for act in overdue_actions:
        mine_name = act.mine.name if act.mine else "Coal Mine"
        days_late = (now - (act.due_date.replace(tzinfo=timezone.utc) if act.due_date.tzinfo is None else act.due_date)).days
        escalations.append({
            "id": f"ESC-ACT-{act.id[:8]}",
            "type": "OVERDUE_CAPA",
            "title": f"Overdue Corrective Directive: {act.title}",
            "severity": "CRITICAL" if days_late > 7 else "HIGH",
            "escalation_level": 3 if days_late > 7 else 2,
            "mine_id": act.mine_id,
            "mine_name": mine_name,
            "contractor_name": act.contractor.company_name if act.contractor else None,
            "days_overdue": max(1, days_late),
            "description": f"Mandatory mitigation SLA exceeded by {days_late} day(s). Action: {act.description}",
            "status": "ESCALATED",
            "responsible_party": act.assigned_to or "Contractor Site In-Charge",
            "created_at": act.created_at.isoformat() if act.created_at else now.isoformat()
        })

    # Map alerts into escalation items
    for a in alerts:
        if a.escalation_level >= 2 or a.is_escalated:
            escalations.append({
                "id": f"ESC-ALT-{a.id[:8]}",
                "type": a.alert_type,
                "title": a.title,
                "severity": a.severity,
                "escalation_level": a.escalation_level,
                "mine_id": a.mine_id,
                "mine_name": a.mine.name if a.mine else "General",
                "contractor_name": a.contractor.company_name if a.contractor else None,
                "days_overdue": None,
                "description": a.message,
                "status": "ACTIVE_ESCALATION",
                "responsible_party": "Mine Manager / Statutory Safety Head",
                "created_at": a.created_at.isoformat() if a.created_at else now.isoformat()
            })

    # Map unresolved high violations
    for v in critical_vios:
        mine_name = v.mine.name if v.mine else "Coal Mine"
        escalations.append({
            "id": f"ESC-VIO-{v.id[:8]}",
            "type": "CRITICAL_VIOLATION",
            "title": f"Unmitigated {v.severity} Hazard: {v.title}",
            "severity": v.severity,
            "escalation_level": 2 if v.severity == "HIGH" else 3,
            "mine_id": v.mine_id,
            "mine_name": mine_name,
            "contractor_name": v.contractor.company_name if v.contractor else None,
            "days_overdue": None,
            "description": v.description,
            "status": "PENDING_RESOLUTION",
            "responsible_party": "Contractor In-Charge & Safety Inspector",
            "created_at": v.detected_at.isoformat() if v.detected_at else now.isoformat()
        })

    # Sort escalations by level descending
    escalations.sort(key=lambda x: x["escalation_level"], reverse=True)
    return escalations

@router.get("/recurring-problems")
def get_recurring_problems(
    mine_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Identifies repetitive/recurring problems across mines and inspections strictly from database.
    Available to Corporate Management (all mines) and Mine Manager (their mine).
    """
    if current_user.role not in [UserRole.CORPORATE.value, UserRole.MINE_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Recurring problem analytics are restricted to Mine Manager and Corporate Management")

    target_mine_id = mine_id
    if current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id:
        target_mine_id = current_user.mine_id

    q = db.query(Violation)
    if target_mine_id:
        q = q.filter(Violation.mine_id == target_mine_id)
    if severity:
        q = q.filter(Violation.severity == severity)
    if category:
        q = q.filter(Violation.category == category)
    if status:
        q = q.filter(Violation.status == status)

    violations = q.all()

    # Group by title / regulation reference
    grouped: Dict[str, List[Violation]] = {}
    for v in violations:
        key = v.title.strip()
        grouped.setdefault(key, []).append(v)

    recurring = []
    for title, v_list in grouped.items():
        count = len(v_list)
        latest = sorted(v_list, key=lambda x: x.detected_at, reverse=True)[0]
        earliest = sorted(v_list, key=lambda x: x.detected_at)[0]
        mine_names = list(set([v.mine.name for v in v_list if v.mine]))
        
        # Consider recurring if multiple occurrences OR flagged recurring in status
        is_repetitive = count >= 2 or any(v.status == "RECURRING" for v in v_list) or latest.severity in ["HIGH", "CRITICAL"]

        if is_repetitive:
            recurring.append({
                "id": f"REC-{latest.id[:8]}",
                "title": title,
                "category": latest.category,
                "severity": latest.severity,
                "occurrence_count": count,
                "affected_mines": mine_names or ["Open Cast Project"],
                "regulation_reference": latest.regulation_reference,
                "status": "RECURRING_FLAGGED" if count >= 2 else latest.status,
                "first_detected": earliest.detected_at.isoformat() if earliest.detected_at else datetime.now(timezone.utc).isoformat(),
                "last_detected": latest.detected_at.isoformat() if latest.detected_at else datetime.now(timezone.utc).isoformat(),
                "resolution_history": [
                    {
                        "violation_code": v.violation_code,
                        "status": v.status,
                        "detected_at": v.detected_at.isoformat() if v.detected_at else None,
                        "resolved_at": v.resolved_at.isoformat() if v.resolved_at else None
                    }
                    for v in v_list
                ],
                "recommended_intervention": (
                    "Mandatory DGMS Special Audit and Engineering Review"
                    if latest.severity in ["HIGH", "CRITICAL"]
                    else "Standard Operating Procedure Retraining & Shift Briefing"
                )
            })

    return sorted(recurring, key=lambda x: (x["severity"] == "CRITICAL", x["occurrence_count"]), reverse=True)
