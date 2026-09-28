from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Mine, Inspection, GeoEvidence, Violation, CorrectiveAction, User, UserRole
from app.api.deps import get_current_user

router = APIRouter(prefix="/gis", tags=["GIS & Geo-Spatial"])

@router.get("/features")
@router.get("/hotspots")
def get_gis_features(
    mine_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Role-Scoped GIS Hotspot Engine:
    Generates dynamic spatial hotspots from actual database inspections, violations, and geo-evidence.
    - CONTRACTOR: Scoped to their assigned mine & contract work areas.
    - FIELD_OFFICER: Scoped to authorized inspection sectors.
    - MINE_MANAGER: Scoped to their full mine operations & hazards.
    - CORPORATE: Cross-mine spatial intelligence with multi-parameter filtering.
    """
    # 1. Scope Mines by Role
    mine_query = db.query(Mine)
    if current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id:
        mine_query = mine_query.filter(Mine.id == current_user.mine_id)
    elif current_user.role == UserRole.FIELD_OFFICER.value and current_user.mine_id:
        mine_query = mine_query.filter(Mine.id == current_user.mine_id)
    elif current_user.role == UserRole.CONTRACTOR.value:
        if current_user.mine_id:
            mine_query = mine_query.filter(Mine.id == current_user.mine_id)
        elif current_user.contractor_id:
            mine_ids = [c.mine_id for c in current_user.contractor.contracts] if current_user.contractor else []
            mine_query = mine_query.filter(Mine.id.in_(mine_ids))
    elif mine_id and current_user.role == UserRole.CORPORATE.value:
        mine_query = mine_query.filter(Mine.id == mine_id)

    accessible_mines = mine_query.all()
    accessible_mine_ids = [m.id for m in accessible_mines]

    mine_features = []
    for m in accessible_mines:
        open_v = sum(1 for v in m.violations if v.status == "OPEN")
        m_insps = [i for i in m.inspections]
        score = round(sum(i.compliance_score for i in m_insps) / max(1, len(m_insps)), 1) if m_insps else 85.0
        risk = "CRITICAL" if score < 60 else ("HIGH" if score < 75 else ("MEDIUM" if score < 85 else "LOW"))

        mine_features.append({
            "type": "Feature",
            "properties": {
                "entity_type": "MINE",
                "id": m.id,
                "name": m.name,
                "code": m.code,
                "subsidiary": m.subsidiary.name if m.subsidiary else "CIL",
                "state": m.state,
                "district": m.district,
                "compliance_score": score,
                "risk_level": risk,
                "open_violations": open_v,
                "production_mtpa": m.production_capacity_mtpa,
                "manager": m.manager_name,
                "assigned_contractors": list(set(c.contractor.company_name for c in m.contracts if c.contractor))
            },
            "geometry": {
                "type": "Point",
                "coordinates": [m.longitude, m.latitude]
            }
        })

    # 2. Scope Violations / Hazards as Dynamic Hotspots
    vio_query = db.query(Violation).filter(Violation.mine_id.in_(accessible_mine_ids))
    if current_user.role == UserRole.CONTRACTOR.value and current_user.contractor_id:
        vio_query = vio_query.filter(Violation.contractor_id == current_user.contractor_id)
    if severity and severity != "ALL":
        vio_query = vio_query.filter(Violation.severity == severity)
    if status and status != "ALL":
        vio_query = vio_query.filter(Violation.status == status)

    violations = vio_query.order_by(Violation.detected_at.desc()).all()
    hotspot_features = []

    for v in violations:
        insp = v.inspection
        mine = v.mine
        
        # Determine precise GPS coordinate from inspection or geo-evidence or mine fallback
        lat = insp.latitude if insp and insp.latitude else (mine.latitude if mine else 23.75)
        lng = insp.longitude if insp and insp.longitude else (mine.longitude if mine else 86.42)
        
        # Add slight spatial offset if multiple violations in same inspection to prevent direct overlap
        offset_idx = hash(v.id) % 5
        lat_offset = (offset_idx - 2) * 0.0012
        lng_offset = (offset_idx - 2) * 0.0015

        # Linked Evidence Photos
        evidence_list = []
        if insp and insp.evidence:
            for ev in insp.evidence:
                evidence_list.append({
                    "id": ev.id,
                    "caption": ev.caption or "On-Site Field Evidence",
                    "file_path": ev.file_path,
                    "latitude": ev.latitude or lat,
                    "longitude": ev.longitude or lng,
                    "captured_at": ev.captured_at.isoformat() if ev.captured_at else None
                })

        # Linked CAPA
        linked_capa = None
        if v.corrective_actions:
            ca = v.corrective_actions[0]
            linked_capa = {
                "id": ca.id,
                "action_code": ca.action_code,
                "title": ca.title,
                "status": ca.status,
                "due_date": ca.due_date.isoformat() if ca.due_date else None,
                "priority": ca.priority
            }

        # Linked Report
        linked_report = None
        if insp and insp.reports:
            rep = insp.reports[0]
            linked_report = {
                "id": rep.id,
                "report_number": rep.report_number,
                "report_title": rep.report_title,
                "approval_status": rep.approval_status
            }

        hotspot_features.append({
            "type": "Feature",
            "properties": {
                "entity_type": "HOTSPOT",
                "id": v.id,
                "violation_code": v.violation_code,
                "mine_id": v.mine_id,
                "mine_name": mine.name if mine else "Assigned Mine",
                "location_tag": insp.location_tag if insp else "Main Haulage Corridor",
                "hazard_title": v.title,
                "hazard_category": v.category,
                "severity": v.severity,
                "status": v.status,
                "regulation_reference": v.regulation_reference or "DGMS Coal Mines Regulations 2017",
                "description": v.description,
                "inspection_id": insp.id if insp else None,
                "inspection_number": insp.inspection_number if insp else None,
                "inspection_date": insp.inspection_date.isoformat() if (insp and insp.inspection_date) else v.detected_at.isoformat(),
                "inspector_name": insp.officer.full_name if (insp and insp.officer) else "Field Safety Officer",
                "contractor_id": v.contractor_id,
                "contractor_name": v.contractor.company_name if v.contractor else (insp.contractor.company_name if (insp and insp.contractor) else "Direct Operations"),
                "evidence_photos": evidence_list,
                "linked_capa": linked_capa,
                "linked_report": linked_report,
                "created_at": v.detected_at.isoformat()
            },
            "geometry": {
                "type": "Point",
                "coordinates": [round(lng + lng_offset, 6), round(lat + lat_offset, 6)]
            }
        })

    return {
        "mines": mine_features,
        "hotspots": hotspot_features,
        "total_hotspots": len(hotspot_features),
        "user_role": current_user.role,
        "accessible_mines_count": len(accessible_mines)
    }
