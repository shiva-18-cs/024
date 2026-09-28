from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import (
    Mine, Contractor, Worker, Inspection, Violation, CorrectiveAction,
    Document, ContractRequirement, RiskLevel, ComplianceStatus, ActionStatus, Alert
)

class ComplianceEngine:
    """
    Transparent, rule-based deterministic compliance evaluation engine
    for Coal India / Ministry of Coal governance.
    """

    @classmethod
    def evaluate_inspection(cls, db: Session, inspection: Inspection) -> Dict[str, Any]:
        """
        Evaluate an inspection's checklists and observations to compute
        compliance score, detect violations, and recommend actions.
        """
        base_score = 100.0
        deductions = 0.0
        reasons: List[str] = []
        violations_to_raise: List[Dict[str, Any]] = []
        recommended_actions: List[Dict[str, Any]] = []

        # 1. Checklist item failures
        failed_items = [item for item in inspection.checklists if not item.is_compliant]
        for item in failed_items:
            weight = item.severity_weight or 10
            deductions += weight
            reasons.append(f"Failed checklist item: '{item.item_title}' (-{weight} pts)")
            violations_to_raise.append({
                "title": f"Non-Compliance: {item.item_title}",
                "category": item.category or "Safety",
                "severity": RiskLevel.HIGH.value if weight >= 10 else RiskLevel.MEDIUM.value,
                "regulation_reference": f"DGMS Coal Mines Regulations / Checklist item {item.item_key}",
                "description": f"Field observation recorded: {item.remarks or 'Inspection checklist criterion failed.'}"
            })
            recommended_actions.append({
                "title": f"Rectify {item.item_title}",
                "description": f"Immediate rectification required at {inspection.location_tag}. Comply with {item.category} standards.",
                "priority": "HIGH" if weight >= 10 else "MEDIUM",
                "due_days": 3 if weight >= 10 else 7
            })

        # 2. Check for observations marked as high severity
        severe_obs = [obs for obs in inspection.observations if obs.severity in ["HIGH", "CRITICAL"]]
        for obs in severe_obs:
            deductions += 15.0
            reasons.append(f"Severe observation detected: '{obs.title}' (-15 pts)")
            violations_to_raise.append({
                "title": f"Critical Observation: {obs.title}",
                "category": obs.category,
                "severity": RiskLevel.CRITICAL.value if obs.severity == "CRITICAL" else RiskLevel.HIGH.value,
                "regulation_reference": "DGMS Safety Code Section 112",
                "description": obs.description
            })
            recommended_actions.append({
                "title": f"Mitigate hazard: {obs.title}",
                "description": f"Enforce safety controls: {obs.description}",
                "priority": "CRITICAL" if obs.severity == "CRITICAL" else "HIGH",
                "due_days": 2 if obs.severity == "CRITICAL" else 5
            })

        # 3. Check contractor active workers at this mine for expired medicals
        if inspection.contractor_id:
            expired_workers = db.query(Worker).filter(
                Worker.contractor_id == inspection.contractor_id,
                Worker.mine_id == inspection.mine_id,
                Worker.is_active == True,
                Worker.medical_expiry_date < datetime.now(timezone.utc)
            ).all()

            if expired_workers:
                worker_count = len(expired_workers)
                deductions += (10.0 * worker_count)
                names = ", ".join([f"{w.first_name} {w.last_name}" for w in expired_workers[:3]])
                reasons.append(f"{worker_count} active worker(s) have expired medical fitness certificates ({names}) (-{10*worker_count} pts)")
                violations_to_raise.append({
                    "title": "Active Workers with Expired Medical Fitness Certificates",
                    "category": "Labour & Health Compliance",
                    "severity": RiskLevel.HIGH.value,
                    "regulation_reference": "Mines Rules 1955 Rule 29B (Initial & Periodical Medical Examination)",
                    "description": f"Identified {worker_count} active contractor workers on-site with expired Form O medical examinations."
                })
                recommended_actions.append({
                    "title": "Schedule Periodical Medical Examination (PME)",
                    "description": f"Stand down expired workers until re-certified by CIL-empaneled medical board.",
                    "priority": "HIGH",
                    "due_days": 3
                })

            # 4. Check for overdue contractor documents
            expired_docs = db.query(Document).filter(
                Document.contractor_id == inspection.contractor_id,
                Document.expiry_date != None,
                Document.expiry_date < datetime.now(timezone.utc)
            ).all()

            if expired_docs:
                deductions += 15.0
                doc_names = ", ".join([d.doc_category for d in expired_docs[:2]])
                reasons.append(f"Expired compliance documents on file: {doc_names} (-15 pts)")
                violations_to_raise.append({
                    "title": "Expired Mandatory Compliance Documentation",
                    "category": "Contractor Statutory Compliance",
                    "severity": RiskLevel.HIGH.value,
                    "regulation_reference": "Contract Labour (Regulation & Abolition) Act / Mines Act 1952",
                    "description": f"Contractor documentation is past statutory validity: {doc_names}."
                })
                recommended_actions.append({
                    "title": "Upload Validated Statutory Certificates",
                    "description": f"Re-upload renewed licenses/certificates for {doc_names}.",
                    "priority": "HIGH",
                    "due_days": 5
                })

        final_score = max(0.0, min(100.0, base_score - deductions))

        # Risk Level assignment rule
        if final_score >= 85.0:
            risk_level = RiskLevel.LOW.value
        elif final_score >= 70.0:
            risk_level = RiskLevel.MEDIUM.value
        elif final_score >= 50.0:
            risk_level = RiskLevel.HIGH.value
        else:
            risk_level = RiskLevel.CRITICAL.value

        return {
            "compliance_score": round(final_score, 1),
            "risk_level": risk_level,
            "deductions": deductions,
            "factors": reasons if reasons else ["All evaluated checklist items and statutory records are compliant."],
            "violations": violations_to_raise,
            "recommended_actions": recommended_actions
        }

    @classmethod
    def evaluate_contractor_profile(cls, db: Session, contractor_id: str) -> Dict[str, Any]:
        """
        Evaluate full contractor compliance posture across all contracts, documents, and workers.
        """
        contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
        if not contractor:
            return {}

        now = datetime.now(timezone.utc)
        issues = []
        score = 100.0

        # Check license expiry
        if contractor.license_expiry and contractor.license_expiry < now:
            score -= 30.0
            issues.append("Operating license has expired.")

        # Check workers medical fitness
        total_workers = db.query(Worker).filter(Worker.contractor_id == contractor_id).count()
        expired_med = db.query(Worker).filter(
            Worker.contractor_id == contractor_id,
            Worker.medical_expiry_date < now
        ).count()
        if expired_med > 0:
            penalty = min(30.0, expired_med * 5.0)
            score -= penalty
            issues.append(f"{expired_med} of {total_workers} workers have expired medical certificates.")

        # Check open violations
        open_violations = db.query(Violation).filter(
            Violation.contractor_id == contractor_id,
            Violation.status == "OPEN"
        ).count()
        if open_violations > 0:
            penalty = min(25.0, open_violations * 8.0)
            score -= penalty
            issues.append(f"{open_violations} unresolved compliance violation(s).")

        # Check overdue corrective actions
        overdue_actions = db.query(CorrectiveAction).filter(
            CorrectiveAction.contractor_id == contractor_id,
            CorrectiveAction.status.in_([ActionStatus.OPEN.value, ActionStatus.ASSIGNED.value, ActionStatus.IN_PROGRESS.value]),
            CorrectiveAction.due_date < now
        ).count()
        if overdue_actions > 0:
            penalty = min(20.0, overdue_actions * 10.0)
            score -= penalty
            issues.append(f"{overdue_actions} corrective action(s) are overdue past deadline.")

        final_score = max(10.0, round(score, 1))
        risk_level = RiskLevel.LOW.value
        if final_score < 55.0:
            risk_level = RiskLevel.CRITICAL.value
        elif final_score < 70.0:
            risk_level = RiskLevel.HIGH.value
        elif final_score < 85.0:
            risk_level = RiskLevel.MEDIUM.value

        contractor.compliance_score = final_score
        contractor.risk_level = risk_level
        db.commit()

        return {
            "contractor_id": contractor_id,
            "company_name": contractor.company_name,
            "compliance_score": final_score,
            "risk_level": risk_level,
            "issues": issues if issues else ["No outstanding violations or expired records."]
        }
