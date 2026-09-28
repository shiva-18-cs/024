from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Mine, Inspection, InspectionObservation, GeoEvidence, Violation,
    CorrectiveAction, Document, Contract, Contractor, User, UserRole
)
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
    General Role-Scoped GIS Hotspot Engine for Corporate Management & Mine Managers.
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
        
        lat = insp.latitude if insp and insp.latitude else (mine.latitude if mine else 23.75)
        lng = insp.longitude if insp and insp.longitude else (mine.longitude if mine else 86.42)
        
        offset_idx = hash(v.id) % 5
        lat_offset = (offset_idx - 2) * 0.0012
        lng_offset = (offset_idx - 2) * 0.0015

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


@router.get("/contractor")
def get_contractor_gis(
    mine_id: Optional[str] = Query(None),
    contract_id: Optional[str] = Query(None),
    compliance_status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    violation_status: Optional[str] = Query(None),
    capa_status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Dedicated Contractor-Scoped GIS Spatial Analysis API:
    Restricted strictly to the authenticated contractor's authorized mines, contracts,
    violations, overdue CAPAs, and geo-tagged inspection evidence.
    """
    if current_user.role not in [UserRole.CONTRACTOR.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Access denied: Contractor GIS is restricted to Contractors")

    c_id = current_user.contractor_id
    if not c_id and current_user.role == UserRole.CONTRACTOR.value:
        raise HTTPException(status_code=403, detail="No contractor entity linked to this account")

    now = datetime.now(timezone.utc)
    in_30_days = now.replace(day=min(28, now.day)) if False else (now + datetime.resolution * 0) # calculate 30 days
    from datetime import timedelta
    in_30_days = now + timedelta(days=30)

    # 1. Fetch Contractor Entity & Contracts
    contracts_query = db.query(Contract)
    if c_id:
        contracts_query = contracts_query.filter(Contract.contractor_id == c_id)
    if contract_id and contract_id != "ALL":
        contracts_query = contracts_query.filter(Contract.id == contract_id)

    contractor_contracts = contracts_query.all()
    contract_mine_ids = list(set([c.mine_id for c in contractor_contracts if c.mine_id]))
    if current_user.mine_id and current_user.mine_id not in contract_mine_ids:
        contract_mine_ids.append(current_user.mine_id)

    # 2. Filter Mines
    mine_query = db.query(Mine).filter(Mine.id.in_(contract_mine_ids))
    if mine_id and mine_id != "ALL":
        mine_query = mine_query.filter(Mine.id == mine_id)

    mines = mine_query.all()

    # 3. Fetch Contractor Documents for Expiry Warnings
    docs_query = db.query(Document)
    if c_id:
        docs_query = docs_query.filter(Document.contractor_id == c_id)
    contractor_docs = docs_query.all()
    expired_docs = [d for d in contractor_docs if d.status == "EXPIRED" or (d.expiry_date and (d.expiry_date.replace(tzinfo=timezone.utc) if d.expiry_date.tzinfo is None else d.expiry_date) < now)]
    expiring_docs = [d for d in contractor_docs if d.expiry_date and (d.expiry_date.replace(tzinfo=timezone.utc) if d.expiry_date.tzinfo is None else d.expiry_date) >= now and (d.expiry_date.replace(tzinfo=timezone.utc) if d.expiry_date.tzinfo is None else d.expiry_date) <= in_30_days]

    mine_features = []
    total_open_vios_all = 0
    total_overdue_capas_all = 0
    compliant_mines_count = 0
    attention_mines_count = 0

    for m in mines:
        m_contracts = [c for c in contractor_contracts if c.mine_id == m.id]
        
        # Violations in this mine for this contractor
        vio_q = db.query(Violation).filter(Violation.mine_id == m.id)
        if c_id:
            vio_q = vio_q.filter(Violation.contractor_id == c_id)
        if severity and severity != "ALL":
            vio_q = vio_q.filter(Violation.severity == severity)
        if violation_status and violation_status != "ALL":
            vio_q = vio_q.filter(Violation.status == violation_status)
        
        m_vios = vio_q.all()
        open_vios = [v for v in m_vios if v.status == "OPEN"]
        solved_vios = [v for v in m_vios if v.status in ["RESOLVED", "CLOSED"]]
        high_crit_vios = [v for v in m_vios if v.severity in ["HIGH", "CRITICAL"]]

        # Corrective Actions in this mine for this contractor
        capa_q = db.query(CorrectiveAction).filter(CorrectiveAction.mine_id == m.id)
        if c_id:
            capa_q = capa_q.filter(CorrectiveAction.contractor_id == c_id)
        if capa_status and capa_status != "ALL":
            capa_q = capa_q.filter(CorrectiveAction.status == capa_status)

        m_capas = capa_q.all()
        overdue_capas = [
            ca for ca in m_capas
            if ca.status not in ["RESOLVED", "CLOSED"]
            and (ca.due_date.replace(tzinfo=timezone.utc) if ca.due_date.tzinfo is None else ca.due_date) < now
        ]

        total_open_vios_all += len(open_vios)
        total_overdue_capas_all += len(overdue_capas)

        # Recent Inspections
        m_insps = db.query(Inspection).filter(
            Inspection.mine_id == m.id,
            (Inspection.contractor_id == c_id) | (Inspection.contractor_id.is_(None))
        ).order_by(Inspection.inspection_date.desc()).limit(5).all()

        latest_insp_date = m_insps[0].inspection_date.isoformat() if m_insps and m_insps[0].inspection_date else None
        
        # Determine Compliance Score & Status Color
        # GREEN = Compliant, ORANGE = Attention Required, RED = Violation/High-Risk/Overdue
        has_red_condition = len(high_crit_vios) > 0 or len(overdue_capas) > 0 or len(open_vios) >= 3
        has_orange_condition = len(open_vios) > 0 or len(expired_docs) > 0 or len(expiring_docs) > 0

        if has_red_condition:
            status_color = "RED"
            risk_status = "HIGH_RISK"
            attention_mines_count += 1
        elif has_orange_condition:
            status_color = "ORANGE"
            risk_status = "ATTENTION_REQUIRED"
            attention_mines_count += 1
        else:
            status_color = "GREEN"
            risk_status = "COMPLIANT"
            compliant_mines_count += 1

        # Apply compliance status filter if provided
        if compliance_status and compliance_status != "ALL":
            if compliance_status == "COMPLIANT" and status_color != "GREEN":
                continue
            if compliance_status == "ATTENTION_REQUIRED" and status_color != "ORANGE":
                continue
            if compliance_status == "HIGH_RISK" and status_color != "RED":
                continue

        # Warning messages
        warnings = []
        if overdue_capas:
            warnings.append(f"{len(overdue_capas)} corrective action(s) overdue beyond statutory SLA.")
        if high_crit_vios:
            warnings.append(f"{len(high_crit_vios)} high/critical severity statutory violation(s) active.")
        if expired_docs:
            warnings.append(f"{len(expired_docs)} contractor statutory document(s) currently expired.")
        if expiring_docs:
            warnings.append(f"{len(expiring_docs)} statutory document(s) expiring within 30 days.")

        # Geo-evidence photos for this mine
        mine_evidence_photos = []
        for insp in m_insps:
            if insp.evidence:
                for ev in insp.evidence:
                    mine_evidence_photos.append({
                        "id": ev.id,
                        "caption": ev.caption or f"Field Evidence at {m.name}",
                        "file_path": ev.file_path,
                        "latitude": ev.latitude or m.latitude,
                        "longitude": ev.longitude or m.longitude,
                        "captured_at": ev.captured_at.isoformat() if ev.captured_at else None,
                        "inspection_number": insp.inspection_number
                    })

        mine_features.append({
            "type": "Feature",
            "properties": {
                "entity_type": "CONTRACTOR_MINE",
                "id": m.id,
                "mine_name": m.name,
                "mine_code": m.code,
                "subsidiary": m.subsidiary.name if m.subsidiary else "CIL",
                "state": m.state,
                "district": m.district,
                "manager_name": m.manager_name,
                "contract_count": len(m_contracts),
                "active_contract_count": sum(1 for c in m_contracts if c.status == "ACTIVE"),
                "active_contracts": [
                    {
                        "id": c.id,
                        "contract_number": c.contract_number,
                        "title": c.title,
                        "status": c.status,
                        "start_date": c.start_date.isoformat() if c.start_date else None,
                        "end_date": c.end_date.isoformat() if c.end_date else None,
                        "value_inr_crores": c.value_inr_crores
                    }
                    for c in m_contracts
                ],
                "compliance_percentage": round(88.0 - (len(open_vios) * 4.0) - (len(overdue_capas) * 6.0), 1),
                "open_violations": len(open_vios),
                "solved_violations": len(solved_vios),
                "high_critical_violations": len(high_crit_vios),
                "overdue_capas": len(overdue_capas),
                "total_inspections": len(m_insps),
                "latest_inspection_date": latest_insp_date,
                "status_color": status_color,
                "risk_status": risk_status,
                "warnings": warnings,
                "recent_inspections": [
                    {
                        "id": i.id,
                        "inspection_number": i.inspection_number,
                        "inspection_date": i.inspection_date.isoformat() if i.inspection_date else None,
                        "compliance_score": i.compliance_score,
                        "risk_level": i.risk_level,
                        "workflow_stage": i.workflow_stage
                    }
                    for i in m_insps
                ],
                "evidence_photos": mine_evidence_photos[:6]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [m.longitude, m.latitude]
            }
        })

    # 4. Return Contractor-Specific Hotspots for Violations / CAPAs
    contractor_hotspots = []
    accessible_mine_ids = [m.id for m in mines]
    vio_hotspots_q = db.query(Violation).filter(Violation.mine_id.in_(accessible_mine_ids))
    if c_id:
        vio_hotspots_q = vio_hotspots_q.filter(Violation.contractor_id == c_id)
    if severity and severity != "ALL":
        vio_hotspots_q = vio_hotspots_q.filter(Violation.severity == severity)
    if violation_status and violation_status != "ALL":
        vio_hotspots_q = vio_hotspots_q.filter(Violation.status == violation_status)

    contractor_vios = vio_hotspots_q.all()
    for v in contractor_vios:
        insp = v.inspection
        m = v.mine
        lat = insp.latitude if (insp and insp.latitude) else (m.latitude if m else 23.75)
        lng = insp.longitude if (insp and insp.longitude) else (m.longitude if m else 86.42)
        
        offset_idx = hash(v.id) % 5
        lat_offset = (offset_idx - 2) * 0.0011
        lng_offset = (offset_idx - 2) * 0.0014

        linked_capa = None
        if v.corrective_actions:
            ca = v.corrective_actions[0]
            is_overdue = ca.status not in ["RESOLVED", "CLOSED"] and (ca.due_date.replace(tzinfo=timezone.utc) if ca.due_date.tzinfo is None else ca.due_date) < now
            linked_capa = {
                "id": ca.id,
                "action_code": ca.action_code,
                "title": ca.title,
                "status": ca.status,
                "priority": ca.priority,
                "due_date": ca.due_date.isoformat() if ca.due_date else None,
                "is_overdue": is_overdue
            }

        photos = []
        if insp and insp.evidence:
            for ev in insp.evidence:
                photos.append({
                    "id": ev.id,
                    "caption": ev.caption or "Site Photographic Proof",
                    "file_path": ev.file_path,
                    "latitude": ev.latitude or lat,
                    "longitude": ev.longitude or lng,
                    "captured_at": ev.captured_at.isoformat() if ev.captured_at else None
                })

        contractor_hotspots.append({
            "type": "Feature",
            "properties": {
                "entity_type": "CONTRACTOR_HOTSPOT",
                "id": v.id,
                "violation_code": v.violation_code,
                "mine_id": v.mine_id,
                "mine_name": m.name if m else "Mine Site",
                "hazard_title": v.title,
                "hazard_category": v.category,
                "severity": v.severity,
                "status": v.status,
                "regulation_reference": v.regulation_reference or "DGMS Statutory Standard",
                "description": v.description,
                "inspection_number": insp.inspection_number if insp else None,
                "inspection_date": insp.inspection_date.isoformat() if (insp and insp.inspection_date) else v.detected_at.isoformat(),
                "linked_capa": linked_capa,
                "evidence_photos": photos,
                "created_at": v.detected_at.isoformat()
            },
            "geometry": {
                "type": "Point",
                "coordinates": [round(lng + lng_offset, 6), round(lat + lat_offset, 6)]
            }
        })

    return {
        "summary": {
            "total_mines": len(mines),
            "compliant_mines": compliant_mines_count,
            "attention_mines": attention_mines_count,
            "open_violations": total_open_vios_all,
            "overdue_capas": total_overdue_capas_all,
            "total_contracts": len(contractor_contracts)
        },
        "mines": mine_features,
        "hotspots": contractor_hotspots,
        "contractor_id": c_id,
        "contractor_name": current_user.contractor.company_name if current_user.contractor else "Authorized Contractor"
    }


@router.get("/field-officer")
def get_field_officer_gis(
    mine_id: Optional[str] = Query(None),
    inspection_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    violation_type: Optional[str] = Query(None),
    violation_status: Optional[str] = Query(None),
    is_recurring: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Dedicated Field Officer GIS Analysis API:
    Strictly focuses on Field Inspections, Geo-Tagged Findings, Photo Evidence,
    and High-Risk/Recurring Hotspots across the officer's authorized mines.
    """
    if current_user.role not in [UserRole.FIELD_OFFICER.value, UserRole.MINE_MANAGER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Access denied: Field Officer GIS is restricted to Inspection Officers")

    # 1. Scope Assigned Mines
    mine_query = db.query(Mine)
    if current_user.role == UserRole.FIELD_OFFICER.value and current_user.mine_id:
        mine_query = mine_query.filter(Mine.id == current_user.mine_id)
    elif current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id:
        mine_query = mine_query.filter(Mine.id == current_user.mine_id)
    elif mine_id and mine_id != "ALL":
        mine_query = mine_query.filter(Mine.id == mine_id)

    mines = mine_query.all()
    accessible_mine_ids = [m.id for m in mines]

    # 2. Query Field Inspections
    insp_query = db.query(Inspection).filter(Inspection.mine_id.in_(accessible_mine_ids))
    if inspection_id and inspection_id != "ALL":
        insp_query = insp_query.filter(Inspection.id == inspection_id)

    inspections = insp_query.order_by(Inspection.inspection_date.desc()).all()

    # 3. Find Repetitive Violations in these mines to flag recurring status
    all_mine_vios = db.query(Violation).filter(Violation.mine_id.in_(accessible_mine_ids)).all()
    vio_counts: Dict[str, int] = {}
    for v in all_mine_vios:
        vio_counts[v.title.strip()] = vio_counts.get(v.title.strip(), 0) + 1

    # 4. Formulate Inspection Features & Finding Hotspots
    inspection_features = []
    finding_hotspots = []
    
    total_findings_count = 0
    high_crit_findings_count = 0
    recurring_findings_count = 0
    geo_tagged_insps_count = 0

    for insp in inspections:
        m = insp.mine
        has_geo = bool(insp.evidence or (insp.latitude and insp.longitude))
        if has_geo:
            geo_tagged_insps_count += 1

        # Photo evidence
        evidence_list = []
        for ev in insp.evidence:
            evidence_list.append({
                "id": ev.id,
                "caption": ev.caption or "Field Photo Evidence",
                "file_path": ev.file_path,
                "latitude": ev.latitude or insp.latitude,
                "longitude": ev.longitude or insp.longitude,
                "captured_at": ev.captured_at.isoformat() if ev.captured_at else None
            })

        # Observations
        obs_list = [
            {
                "id": o.id,
                "title": o.title,
                "category": o.category,
                "severity": o.severity,
                "description": o.description,
                "requires_action": o.requires_action
            }
            for o in insp.observations
        ]

        # Inspection Violation Hotspots
        insp_vios = insp.violations
        for v in insp_vios:
            is_rec = (vio_counts.get(v.title.strip(), 0) >= 2) or (v.status == "RECURRING")
            
            # Apply filters
            if severity and severity != "ALL" and v.severity != severity:
                continue
            if violation_type and violation_type != "ALL" and v.category != violation_type:
                continue
            if violation_status and violation_status != "ALL" and v.status != violation_status:
                continue
            if is_recurring and is_recurring != "ALL":
                filter_rec_bool = is_recurring.lower() in ("true", "1", "yes")
                if is_rec != filter_rec_bool:
                    continue

            total_findings_count += 1
            if v.severity in ["HIGH", "CRITICAL"]:
                high_crit_findings_count += 1
            if is_rec:
                recurring_findings_count += 1

            offset_idx = hash(v.id) % 5
            lat_offset = (offset_idx - 2) * 0.0012
            lng_offset = (offset_idx - 2) * 0.0015

            finding_lat = insp.latitude + lat_offset if insp.latitude else (m.latitude if m else 23.75)
            finding_lng = insp.longitude + lng_offset if insp.longitude else (m.longitude if m else 86.42)

            linked_capa = None
            if v.corrective_actions:
                ca = v.corrective_actions[0]
                linked_capa = {
                    "id": ca.id,
                    "action_code": ca.action_code,
                    "title": ca.title,
                    "status": ca.status,
                    "priority": ca.priority,
                    "due_date": ca.due_date.isoformat() if ca.due_date else None,
                    "assigned_to": ca.assigned_to
                }

            finding_hotspots.append({
                "type": "Feature",
                "properties": {
                    "entity_type": "FIELD_FINDING_HOTSPOT",
                    "id": v.id,
                    "violation_code": v.violation_code,
                    "inspection_id": insp.id,
                    "inspection_number": insp.inspection_number,
                    "inspection_date": insp.inspection_date.isoformat() if insp.inspection_date else None,
                    "mine_id": insp.mine_id,
                    "mine_name": m.name if m else "Mine Sector",
                    "location_tag": insp.location_tag,
                    "finding_title": v.title,
                    "finding_category": v.category,
                    "severity": v.severity,
                    "status": v.status,
                    "is_recurring": is_rec,
                    "recurrence_count": vio_counts.get(v.title.strip(), 1),
                    "regulation_reference": v.regulation_reference or "CMR 2017 DGMS Standard",
                    "description": v.description,
                    "inspector_name": insp.officer.full_name if insp.officer else "Field Safety Inspector",
                    "contractor_name": v.contractor.company_name if v.contractor else (insp.contractor.company_name if insp.contractor else "Direct Operations"),
                    "evidence_photos": evidence_list,
                    "linked_capa": linked_capa,
                    "created_at": v.detected_at.isoformat() if v.detected_at else None
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(finding_lng, 6), round(finding_lat, 6)]
                }
            })

        inspection_features.append({
            "type": "Feature",
            "properties": {
                "entity_type": "FIELD_INSPECTION",
                "id": insp.id,
                "inspection_number": insp.inspection_number,
                "mine_id": insp.mine_id,
                "mine_name": m.name if m else "Mine",
                "inspection_type": insp.inspection_type,
                "inspection_date": insp.inspection_date.isoformat() if insp.inspection_date else None,
                "location_tag": insp.location_tag,
                "risk_level": insp.risk_level,
                "compliance_score": insp.compliance_score,
                "workflow_stage": insp.workflow_stage,
                "summary": insp.summary,
                "evidence_count": len(evidence_list),
                "observations_count": len(obs_list),
                "violations_count": len(insp_vios),
                "observations": obs_list,
                "evidence_photos": evidence_list
            },
            "geometry": {
                "type": "Point",
                "coordinates": [insp.longitude, insp.latitude]
            }
        })

    # Summary Cards
    summary = {
        "assigned_mines": len(mines),
        "total_inspections": len(inspections),
        "geo_tagged_inspections": geo_tagged_insps_count,
        "open_findings": total_findings_count,
        "high_critical_findings": high_crit_findings_count,
        "recurring_findings": recurring_findings_count
    }

    return {
        "summary": summary,
        "mines": [
            {
                "type": "Feature",
                "properties": {
                    "entity_type": "ASSIGNED_MINE",
                    "id": m.id,
                    "name": m.name,
                    "code": m.code,
                    "state": m.state,
                    "district": m.district,
                    "manager_name": m.manager_name,
                    "production_mtpa": m.production_capacity_mtpa
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [m.longitude, m.latitude]
                }
            }
            for m in mines
        ],
        "inspections": inspection_features,
        "hotspots": finding_hotspots,
        "total_hotspots": len(finding_hotspots)
    }
