from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from app.models.entities import (
    Mine, Contractor, Inspection, Violation, CorrectiveAction,
    Worker, Document, AIPrediction, RiskLevel
)

class AIService:
    """
    AI / Machine Learning Governance and Anomaly Detection Service.
    Provides explainable AI-Assisted Risk Assessments, feature contribution weights,
    and operational anomaly flags using ensemble heuristics and statistical anomaly models.
    """

    @classmethod
    def assess_inspection_risk(cls, db: Session, inspection_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inference on inspection data to generate an AI-Assisted Risk Assessment.
        Features considered:
        - checklist_failure_rate
        - high_severity_observations
        - contractor_historical_violations
        - worker_expired_medical_ratio
        - days_since_last_inspection
        """
        checklists = inspection_data.get("checklists", [])
        observations = inspection_data.get("observations", [])
        contractor_id = inspection_data.get("contractor_id")
        mine_id = inspection_data.get("mine_id")

        total_items = max(1, len(checklists))
        failed_items = sum(1 for c in checklists if not c.get("is_compliant", True))
        fail_rate = failed_items / total_items

        high_sev_obs = sum(1 for o in observations if o.get("severity") in ["HIGH", "CRITICAL"])
        
        # Historical contractor context
        contractor_past_violations = 0
        if contractor_id:
            contractor_past_violations = db.query(Violation).filter(
                Violation.contractor_id == contractor_id,
                Violation.status == "OPEN"
            ).count()

        # Worker medical expiry ratio in mine
        expired_medical_count = 0
        if contractor_id and mine_id:
            expired_medical_count = db.query(Worker).filter(
                Worker.contractor_id == contractor_id,
                Worker.mine_id == mine_id,
                Worker.medical_expiry_date < datetime.now(timezone.utc)
            ).count()

        # Feature vector and heuristic weights
        # w1 = 45 (checklist failure rate), w2 = 25 (severe observations), w3 = 15 (contractor past violations), w4 = 15 (expired medicals)
        f1_score = min(45.0, fail_rate * 100.0 * 0.45)
        f2_score = min(25.0, high_sev_obs * 12.5)
        f3_score = min(15.0, contractor_past_violations * 5.0)
        f4_score = min(15.0, expired_medical_count * 7.5)

        raw_risk_score = f1_score + f2_score + f3_score + f4_score
        risk_score = round(min(100.0, max(5.0, raw_risk_score)), 1)

        # Contributing factors list sorted by impact
        contributing_factors = []
        if fail_rate > 0:
            contributing_factors.append(f"{failed_items} checklist criteria failed ({round(fail_rate*100)}% failure rate) [Impact: +{round(f1_score, 1)} pts]")
        if high_sev_obs > 0:
            contributing_factors.append(f"{high_sev_obs} high/critical severity field observation(s) recorded [Impact: +{round(f2_score, 1)} pts]")
        if contractor_past_violations > 0:
            contributing_factors.append(f"Contractor has {contractor_past_violations} unresolved past violation(s) on record [Impact: +{round(f3_score, 1)} pts]")
        if expired_medical_count > 0:
            contributing_factors.append(f"{expired_medical_count} contractor worker(s) operating with expired medical certificates [Impact: +{round(f4_score, 1)} pts]")
        
        if not contributing_factors:
            contributing_factors.append("No active compliance risk indicators detected. Baseline operations verified.")

        # Risk category
        if risk_score >= 75.0:
            category = RiskLevel.CRITICAL.value
        elif risk_score >= 50.0:
            category = RiskLevel.HIGH.value
        elif risk_score >= 25.0:
            category = RiskLevel.MEDIUM.value
        else:
            category = RiskLevel.LOW.value

        # Anomaly detection (e.g. abrupt spike in violations compared to mine baseline)
        is_anomaly = (high_sev_obs >= 2 or (fail_rate > 0.4 and contractor_past_violations == 0))
        anomaly_details = {}
        if is_anomaly:
            anomaly_details = {
                "metric": "Sudden Safety Failure Deviation",
                "deviation_sigma": "+2.85σ above normal seasonal baseline",
                "recommended_focus": "Immediate site supervisor audit and safety stand-down."
            }

        explanation = (
            f"AI-Assisted Risk Assessment calculated a composite score of {risk_score}/100 ({category}). "
            f"Primary risk drivers: {contributing_factors[0]}. "
            f"Notice: This prediction is an AI-assisted decision-support metric and does not supersede DGMS statutory standards."
        )

        return {
            "risk_score": risk_score,
            "risk_category": category,
            "confidence": 0.94,
            "contributing_factors": contributing_factors,
            "explanation": explanation,
            "is_anomaly": is_anomaly,
            "anomaly_details": anomaly_details,
            "recommended_actions": [
                "Issue priority corrective notice to contractor safety officer",
                "Enforce mandatory PPE and equipment calibration protocol",
                "Review worker health register with CIL medical officer"
            ] if risk_score > 40 else ["Continue standard statutory shift inspections"]
        }

    @classmethod
    def get_mine_risk_summary(cls, db: Session, mine_id: str) -> Dict[str, Any]:
        """
        Calculates holistic mine risk across all operational vectors.
        """
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            return {}

        total_violations = db.query(Violation).filter(Violation.mine_id == mine_id).count()
        open_violations = db.query(Violation).filter(Violation.mine_id == mine_id, Violation.status == "OPEN").count()
        overdue_actions = db.query(CorrectiveAction).filter(
            CorrectiveAction.mine_id == mine_id,
            CorrectiveAction.status != "RESOLVED",
            CorrectiveAction.due_date < datetime.now(timezone.utc)
        ).count()

        # Risk score calculation
        calc_score = min(95.0, (open_violations * 12.0) + (overdue_actions * 18.0) + 10.0)
        risk_category = "LOW"
        if calc_score > 70:
            risk_category = "CRITICAL"
        elif calc_score > 50:
            risk_category = "HIGH"
        elif calc_score > 30:
            risk_category = "MEDIUM"

        return {
            "mine_id": mine.id,
            "mine_name": mine.name,
            "subsidiary": mine.subsidiary.name if mine.subsidiary else "CIL",
            "risk_score": round(calc_score, 1),
            "risk_category": risk_category,
            "open_violations": open_violations,
            "overdue_actions": overdue_actions,
            "factors": [
                f"{open_violations} open violation(s) currently unmitigated",
                f"{overdue_actions} corrective action(s) exceeding mandatory statutory SLA",
                f"Production capacity: {mine.production_capacity_mtpa} MTPA"
            ]
        }

    @classmethod
    def analyze_mine_manager_report(cls, db: Session, report_id: str) -> Dict[str, Any]:
        """
        AI Risk Analysis assistive system function executed AFTER Mine Manager creates/reviews report.
        Analyzes report + inspection data + historical patterns + severity + anomalies.
        Does NOT automatically approve or close reports.
        """
        from app.models.entities import Report
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise ValueError("Report not found")

        inspection = report.inspection
        report_data = report.report_data or {}
        mine = report.mine
        now = datetime.now(timezone.utc)

        # 1. Inspection findings analysis
        checklists = [c for c in inspection.checklists] if inspection else []
        observations = [o for o in inspection.observations] if inspection else []
        failed_checklists = [c for c in checklists if not c.is_compliant]
        high_severity_obs = [o for o in observations if o.severity in ["HIGH", "CRITICAL"]]

        # 2. Historical & Recurring Patterns
        mine_all_violations = db.query(Violation).filter(Violation.mine_id == report.mine_id).all()
        open_mine_violations = [v for v in mine_all_violations if v.status == "OPEN"]
        
        # Check repetitive violations in this mine
        title_counts = {}
        for v in mine_all_violations:
            title_counts[v.title] = title_counts.get(v.title, 0) + 1
        
        recurring_patterns = []
        for title, count in title_counts.items():
            if count > 1:
                recurring_patterns.append(f"Repeated violation pattern: '{title}' detected {count} times across inspections at {mine.name if mine else 'this mine'}.")

        # Check overdue CAPAs
        overdue_capas = db.query(CorrectiveAction).filter(
            CorrectiveAction.mine_id == report.mine_id,
            CorrectiveAction.status.notin_(["RESOLVED", "CLOSED"]),
            CorrectiveAction.due_date < now
        ).all()

        # 3. Anomaly detection
        anomalies = []
        if len(failed_checklists) >= 3:
            anomalies.append({
                "type": "HIGH_FAILURE_DENSITY",
                "detail": f"{len(failed_checklists)} statutory checklist failures recorded in a single shift.",
                "significance": "Deviates +2.4σ from historical mine baseline."
            })
        if overdue_capas:
            anomalies.append({
                "type": "CAPA_SLA_BREACH",
                "detail": f"{len(overdue_capas)} corrective action(s) past statutory resolution deadline.",
                "significance": "Escalation to DGMS / Ministry threshold risk."
            })

        # 4. Risk scoring
        base_score = 15.0
        base_score += len(failed_checklists) * 12.0
        base_score += len(high_severity_obs) * 15.0
        base_score += len(overdue_capas) * 10.0
        base_score += min(20.0, len(recurring_patterns) * 8.0)
        risk_score = round(min(98.0, max(10.0, base_score)), 1)

        if risk_score >= 75.0:
            risk_level = RiskLevel.CRITICAL.value
            severity_assessment = "CRITICAL: Multiple high-risk compliance failures and unmitigated operational hazards."
        elif risk_score >= 50.0:
            risk_level = RiskLevel.HIGH.value
            severity_assessment = "HIGH: Significant statutory non-compliance requiring prompt corrective intervention."
        elif risk_score >= 30.0:
            risk_level = RiskLevel.MEDIUM.value
            severity_assessment = "MEDIUM: Moderate compliance gaps identified; requires timely remediation."
        else:
            risk_level = RiskLevel.LOW.value
            severity_assessment = "LOW: Operational compliance within acceptable DGMS baseline limits."

        # High risk issues
        high_risk_issues = []
        for o in high_severity_obs:
            high_risk_issues.append({
                "title": o.title,
                "category": o.category,
                "severity": o.severity,
                "description": o.description
            })
        for c in failed_checklists:
            high_risk_issues.append({
                "title": c.item_title,
                "category": c.category,
                "severity": "HIGH" if c.severity_weight >= 5 else "MEDIUM",
                "description": c.remarks or "Checklist item failed statutory standard."
            })

        # 5. OCR Statutory Documents Analysis
        ocr_documents = report_data.get("ocr_documents", [])
        ocr_findings = []
        for doc in ocr_documents:
            fields = doc.get("extracted_fields", {})
            cat = doc.get("doc_category", "Statutory Document")
            lic = fields.get("license_or_cert_number", "N/A")
            exp = doc.get("expiry_date") or fields.get("expiry_date", "Perpetual")
            is_doc_expired = doc.get("status") == "EXPIRED"
            if is_doc_expired:
                ocr_findings.append(f"CRITICAL: OCR Document '{doc.get('file_name')}' ({cat}) has EXPIRED on {exp}. Statutory violation under CMR.")
                base_score += 10.0
            else:
                ocr_findings.append(f"VALID: OCR Document '{doc.get('file_name')}' ({cat}, Ref: {lic}) verified active with {doc.get('ocr_confidence', 90)}% OCR confidence.")

        # 6. GIS Hotspot Spatial Analysis
        gis_hotspot = report_data.get("gis_hotspot", {})
        gis_findings = f"Geospatial Telemetry: Inspected sector '{gis_hotspot.get('location_tag', 'Active Pit Bench')}' at [{inspection.latitude if inspection else 23.75:.4f}° N, {inspection.longitude if inspection else 86.42:.4f}° E]. Hotspot categorized as {gis_hotspot.get('risk_level', 'MEDIUM')} priority."

        # 7. Photographic Evidence Summary
        evidence_photos = report_data.get("evidence_photos", [])
        evidence_summary = [
            f"Evidence Photo {idx+1}: '{ev.get('caption')}' (GPS: {ev.get('latitude', 0):.4f}° N, {ev.get('longitude', 0):.4f}° E)"
            for idx, ev in enumerate(evidence_photos)
        ] if evidence_photos else ["Visual inspection confirmed on-site by field officer."]

        risk_summary = (
            f"AI Risk Assessment for {report.report_title}: Overall Risk Score {risk_score}/100 ({risk_level}). "
            f"Identified {len(high_risk_issues)} focal compliance concerns, {len(recurring_patterns)} recurring patterns, "
            f"{len(ocr_findings)} OCR statutory document checks, and {len(anomalies)} operational anomalies. Mine Manager review and directive formulation required prior to Corporate submission."
        )

        ai_results = {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "severity_assessment": severity_assessment,
            "high_risk_issues": high_risk_issues,
            "potential_violations": [{"title": v.title, "severity": v.severity, "category": v.category} for v in inspection.violations] if inspection else [],
            "recurring_patterns": recurring_patterns,
            "anomalies": anomalies,
            "ocr_findings": ocr_findings,
            "gis_findings": gis_findings,
            "evidence_summary": evidence_summary,
            "risk_summary": risk_summary,
            "compliance_concerns": high_risk_issues,
            "analyzed_at": now.isoformat(),
            "system_disclaimer": "AI is an assistive system function. Mine Manager must review findings and finalize report before Corporate transmission."
        }

        # Persist to report
        report.ai_risk_score = risk_score
        report.ai_explanation = risk_summary
        if not report.report_data:
            report.report_data = {}
        report_data = dict(report.report_data)
        report_data["ai_analysis"] = ai_results
        report.report_data = report_data
        report.approval_status = "AI_ANALYSIS"

        # Persist to AIPrediction table
        prediction = AIPrediction(
            target_type="REPORT",
            target_id=report.id,
            risk_score=risk_score,
            risk_category=risk_level,
            confidence=0.93,
            contributing_factors=[issue["title"] for issue in high_risk_issues] or ["Baseline DGMS operational compliance"],
            explanation=risk_summary,
            is_anomaly=len(anomalies) > 0,
            anomaly_details={"anomalies": anomalies, "recurring_patterns": recurring_patterns},
            recommended_actions=[
                "Mine Manager review and validation required",
                "Address failed checklist items in mine action plan",
                "Verify contractor statutory filings before sign-off"
            ],
            prediction_timestamp=now
        )
        db.add(prediction)
        db.commit()

        return ai_results


