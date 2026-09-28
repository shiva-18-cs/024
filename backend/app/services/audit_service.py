from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.entities import AuditLog

def log_audit_action(
    db: Session,
    username: str,
    role: str,
    action: str,
    entity: str,
    entity_id: Optional[str] = None,
    previous_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    ip_address: str = "127.0.0.1"
):
    log_entry = AuditLog(
        user_id=user_id,
        username=username,
        role=role,
        action=action,
        entity=entity,
        entity_id=entity_id,
        previous_value=previous_value,
        new_value=new_value,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
    return log_entry
