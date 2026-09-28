from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import AuditLog, User, UserRole
from app.schemas.schemas import AuditLogOut
from app.api.deps import require_roles

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail"])

@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    entity: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.CORPORATE.value, UserRole.MINE_MANAGER.value]))
):
    q = db.query(AuditLog)
    if entity:
        q = q.filter(AuditLog.entity.ilike(f"%{entity}%"))
    if role:
        q = q.filter(AuditLog.role == role)
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))

    return q.order_by(AuditLog.timestamp.desc()).limit(100).all()

