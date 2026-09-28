import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import (
    Inspection, Report, ReportReview, Violation, CorrectiveAction,
    WorkflowStage, RiskLevel, ActionStatus, Alert, User, UserRole
)
from app.services.compliance_engine import ComplianceEngine
from app.services.ai_service import AIService
from app.services.report_service import ReportService
from app.services.audit_service import log_audit_action
from app.core.config import settings

class WorkflowService:
    """
    Closed-loop governance state machine for CIL / Ministry of Coal:
    Field Officer -> Submit -> Mine Manager Review -> Auto Report & AI ->
    Corporate Review -> Violation -> Corrective Action -> Re-submission -> Re-verification -> Approval
    """

    @classmethod
    def submit_inspection(cls, db: Session, inspection_id: str, officer: User) -> Dict[str, Any]:
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            raise ValueError("Inspection not found")

        # Evaluate compliance rules
        compliance_eval = ComplianceEngine.evaluate_inspection(db, inspection)
        inspection.compliance_score = compliance_eval["compliance_score"]
        inspection.risk_level = compliance_eval["risk_level"]

        # Run AI Risk & Anomaly Assessment
        ai_eval = AIService.assess_inspection_risk(db, {
            "mine_id": inspection.mine_id,
            "contractor_id": inspection.contractor_id,
            "checklists": [{"is_compliant": c.is_compliant} for c in inspection.checklists],
            "observations": [{"severity": o.severity} for o in inspection.observations]
        })
        inspection.ai_risk_score = ai_eval["risk_score"]
        inspection.ai_risk_category = ai_eval["risk_category"]
        inspection.ai_factors = ai_eval["contributing_factors"]
        inspection.workflow_stage = WorkflowStage.UNDER_MINE_MANAGER_REVIEW.value

        # Auto-create violations and recommended corrective actions if score < 85 or critical items
        for vio_data in compliance_eval["violations"]:
            v_code = f"VIO-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
            # Check if violation already exists for this inspection
            existing_vio = db.query(Violation).filter(
                Violation.inspection_id == inspection.id,
                Violation.title == vio_data["title"]
            ).first()
            if not existing_vio:
                violation = Violation(
                    violation_code=v_code,
                    mine_id=inspection.mine_id,
                    contractor_id=inspection.contractor_id,
                    inspection_id=inspection.id,
                    title=vio_data["title"],
                    category=vio_data["category"],
                    severity=vio_data["severity"],
                    regulation_reference=vio_data["regulation_reference"],
                    description=vio_data["description"],
                    status="OPEN"
                )
                db.add(violation)
                db.flush()

                # Automatically trigger level 1/2 Alert
                alert = Alert(
                    title=f"Statutory Violation Detected: {violation.title}",
                    message=f"Inspection {inspection.inspection_number} triggered {violation.severity} violation at {inspection.mine.name}.",
                    alert_type="CRITICAL_VIOLATION" if violation.severity in ["HIGH", "CRITICAL"] else "COMPLIANCE_WARNING",
                    severity=violation.severity,
                    escalation_level=2 if violation.severity in ["HIGH", "CRITICAL"] else 1,
                    mine_id=inspection.mine_id,
                    contractor_id=inspection.contractor_id
                )
                db.add(alert)

                # Create associated corrective action
                act_code = f"CAPA-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
                ca = CorrectiveAction(
                    action_code=act_code,
                    violation_id=violation.id,
                    contractor_id=inspection.contractor_id or (inspection.mine.contracts[0].contractor_id if inspection.mine.contracts else "cont-01"),
                    mine_id=inspection.mine_id,
                    title=f"Corrective Directive for: {violation.title}",
                    description=f"Direct mitigation required under DGMS regulations: {violation.description}",
                    priority=violation.severity,
                    due_date=datetime.now(timezone.utc) + timedelta(days=7),
                    status=ActionStatus.ASSIGNED.value,
                    assigned_to="Contractor Site In-Charge"
                )
                db.add(ca)

        db.commit()

        log_audit_action(
            db=db,
            username=officer.username,
            role=officer.role,
            action="INSPECTION_SUBMITTED",
            entity="Inspection",
            entity_id=inspection.id,
            new_value={"status": inspection.workflow_stage, "score": inspection.compliance_score}
        )

        return {
            "inspection_id": inspection.id,
            "workflow_stage": inspection.workflow_stage,
            "compliance_score": inspection.compliance_score,
            "risk_level": inspection.risk_level,
            "ai_risk_score": inspection.ai_risk_score,
            "ai_risk_category": inspection.ai_risk_category
        }

    @classmethod
    def create_mine_manager_report(
        cls,
        db: Session,
        inspection_id: str,
        manager: User,
        report_title: Optional[str] = None,
        manager_remarks: Optional[str] = None
    ) -> Report:
        """
        Step: Mine Manager receives Field Officer submitted inspection and creates Official Mine Report.
        Status starts as DRAFT.
        """
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            raise ValueError("Inspection not found")

        now = datetime.now(timezone.utc)
        rep_num = f"REP-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        title = report_title or f"Official Statutory Mine Report - {inspection.mine.name}"

        # Retrieve linked photo evidence
        evidence_photos = []
        if inspection.evidence:
            for ev in inspection.evidence:
                evidence_photos.append({
                    "id": ev.id,
                    "caption": ev.caption or "On-Site Field Evidence Photo",
                    "file_path": ev.file_path,
                    "latitude": ev.latitude or inspection.latitude,
                    "longitude": ev.longitude or inspection.longitude,
                    "captured_at": ev.captured_at.isoformat() if ev.captured_at else now.isoformat()
                })

        # Retrieve relevant OCR-extracted statutory documents from DB
        from app.models.entities import Document
        ocr_doc_query = db.query(Document)
        if inspection.contractor_id:
            ocr_doc_query = ocr_doc_query.filter(Document.contractor_id == inspection.contractor_id)
        
        ocr_docs = ocr_doc_query.limit(5).all()
        ocr_extracted_data = []
        for d in ocr_docs:
            ocr_extracted_data.append({
                "id": d.id,
                "file_name": d.file_name,
                "doc_category": d.doc_category,
                "ocr_confidence": d.ocr_confidence,
                "ocr_status": d.ocr_status,
                "status": d.status,
                "extracted_fields": d.extracted_metadata or {},
                "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None
            })

        report_data_payload = {
            "report_number": rep_num,
            "inspection_number": inspection.inspection_number,
            "inspection_date": inspection.inspection_date.isoformat() if inspection.inspection_date else now.isoformat(),
            "mine_id": inspection.mine_id,
            "mine_name": inspection.mine.name,
            "mine_code": inspection.mine.code,
            "subsidiary": inspection.mine.subsidiary.name if inspection.mine.subsidiary else "CIL",
            "contractor_name": inspection.contractor.company_name if inspection.contractor else "Direct Operations",
            "contractor_id": inspection.contractor_id,
            "officer_name": inspection.officer.full_name if inspection.officer else "Field Inspector",
            "inspection_type": inspection.inspection_type,
            "latitude": inspection.latitude,
            "longitude": inspection.longitude,
            "location_tag": inspection.location_tag or "Main Pit Working Bench",
            "compliance_score": inspection.compliance_score,
            "evidence_photos": evidence_photos,
            "ocr_documents": ocr_extracted_data,
            "gis_hotspot": {
                "latitude": inspection.latitude,
                "longitude": inspection.longitude,
                "location_tag": inspection.location_tag or "Sector 4B Active Bench",
                "risk_level": inspection.risk_level or "MEDIUM"
            },
            "checklists": [
                {"item_title": c.item_title, "category": c.category, "is_compliant": c.is_compliant, "remarks": c.remarks}
                for c in inspection.checklists
            ],
            "observations": [
                {"title": o.title, "category": o.category, "severity": o.severity, "description": o.description}
                for o in inspection.observations
            ],
            "violations": [
                {"violation_code": v.violation_code, "category": v.category, "severity": v.severity, "title": v.title, "description": v.description, "status": v.status}
                for v in inspection.violations
            ]
        }

        report = Report(
            report_number=rep_num,
            inspection_id=inspection.id,
            mine_id=inspection.mine_id,
            created_by_id=manager.id,
            report_title=title,
            approval_status="DRAFT",
            manager_remarks=manager_remarks or "Initial report drafted following field inspection.",
            report_data=report_data_payload,
            generated_at=now
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        log_audit_action(
            db=db,
            username=manager.username,
            role=manager.role,
            action="REPORT_DRAFTED",
            entity="Report",
            entity_id=report.id,
            new_value={"report_number": rep_num, "inspection_id": inspection.id}
        )

        return report

    @classmethod
    def finalize_mine_manager_report(
        cls,
        db: Session,
        report_id: str,
        manager: User,
        manager_remarks: Optional[str] = None
    ) -> Report:
        """
        Step 4: Mine Manager finalizes report with remarks.
        Status becomes FINALIZED. (Does not automatically submit to Corporate).
        """
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise ValueError("Report not found")

        now = datetime.now(timezone.utc)
        if manager_remarks:
            report.manager_remarks = manager_remarks
        report.finalized_at = now
        report.approval_status = "FINALIZED"

        # Generate official statutory PDF file
        pdf_file_path = f"{settings.REPORTS_DIR}/{report.report_number}.pdf"
        try:
            ReportService.generate_pdf(report.report_data or {}, pdf_file_path)
            report.file_path = pdf_file_path
        except Exception as e:
            print(f"PDF generation notice: {e}")

        # Record Review Entry by Mine Manager
        review_entry = ReportReview(
            report_id=report.id,
            reviewer_id=manager.id,
            role_level="MINE MANAGER",
            decision="FINALIZED",
            comments=report.manager_remarks or "Report finalized by Mine Manager."
        )
        db.add(review_entry)
        db.commit()
        db.refresh(report)

        log_audit_action(
            db=db,
            username=manager.username,
            role=manager.role,
            action="REPORT_FINALIZED",
            entity="Report",
            entity_id=report.id,
            new_value={"approval_status": report.approval_status, "finalized_at": now.isoformat()}
        )

        return report

    @classmethod
    def submit_report_to_corporate(
        cls,
        db: Session,
        report_id: str,
        manager: User
    ) -> Report:
        """
        Step 5: Mine Manager submits finalized report to Corporate Management.
        Status transitions to UNDER_CORPORATE_REVIEW.
        """
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise ValueError("Report not found")

        now = datetime.now(timezone.utc)
        report.approval_status = "UNDER_CORPORATE_REVIEW"

        # Update linked inspection stage
        if report.inspection:
            report.inspection.workflow_stage = WorkflowStage.UNDER_CORPORATE_REVIEW.value

        # Record Corporate Submission Entry
        review_entry = ReportReview(
            report_id=report.id,
            reviewer_id=manager.id,
            role_level="MINE MANAGER",
            decision="SUBMITTED_TO_CORPORATE",
            comments=f"Statutory report {report.report_number} submitted for Corporate Governance review."
        )
        db.add(review_entry)

        # Notify Corporate Management
        alert = Alert(
            title=f"Statutory Mine Report Awaiting Corporate Review: {report.report_number}",
            message=f"Mine Manager submitted statutory compliance report for {report.mine.name if report.mine else 'Mine'}. Corporate sign-off required.",
            alert_type="REPORT_SUBMITTED_FOR_REVIEW",
            severity="HIGH" if (report.ai_risk_score or 0) >= 50 else "MEDIUM",
            escalation_level=2,
            mine_id=report.mine_id
        )
        db.add(alert)
        db.commit()
        db.refresh(report)

        log_audit_action(
            db=db,
            username=manager.username,
            role=manager.role,
            action="REPORT_SUBMITTED_TO_CORPORATE",
            entity="Report",
            entity_id=report.id,
            new_value={"approval_status": report.approval_status, "submitted_at": now.isoformat()}
        )

        return report


    @classmethod
    def mine_manager_review(
        cls,
        db: Session,
        inspection_id: str,
        manager: User,
        data_is_ok: bool,
        notes: str
    ) -> Dict[str, Any]:
        """
        Backward compatible endpoint: Mine Manager validates field inspection data.
        """
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            raise ValueError("Inspection not found")

        inspection.manager_review_notes = notes
        inspection.manager_reviewed_at = datetime.now(timezone.utc)

        if data_is_ok:
            # Create official Report and finalize
            report = cls.create_mine_manager_report(db, inspection_id, manager, manager_remarks=notes)
            # Run AI analysis
            AIService.analyze_mine_manager_report(db, report.id)
            # Finalize report
            cls.finalize_mine_manager_report(db, report.id, manager, manager_remarks=notes)
        else:
            inspection.workflow_stage = WorkflowStage.MM_REJECTED.value
            alert = Alert(
                title="Inspection Data Rejected by Mine Manager",
                message=f"Mine Manager returned inspection {inspection.inspection_number}: {notes}",
                alert_type="INSPECTION_REJECTED",
                severity="MEDIUM",
                escalation_level=1,
                mine_id=inspection.mine_id
            )
            db.add(alert)
            db.commit()

        log_audit_action(
            db=db,
            username=manager.username,
            role=manager.role,
            action="MINE_MANAGER_VALIDATION",
            entity="Inspection",
            entity_id=inspection.id,
            new_value={"decision": "OK" if data_is_ok else "REJECTED", "notes": notes}
        )

        return {
            "inspection_id": inspection.id,
            "workflow_stage": inspection.workflow_stage,
            "data_is_ok": data_is_ok
        }

    @classmethod
    def corporate_review(
        cls,
        db: Session,
        report_id: str,
        corporate_user: User,
        approve: bool,
        notes: str
    ) -> Dict[str, Any]:
        """
        Corporate Management Final Governance Gateway:
        If approve: Stamp official seal, mark APPROVED, notify Mine Manager.
        If reject: MANDATORY feedback/reason required! Marks REJECTED, sends feedback to Mine Manager for revision.
        """
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise ValueError("Report not found")

        if not approve and (not notes or not notes.strip()):
            raise ValueError("Corporate Management must provide a specific rejection reason and feedback.")

        now = datetime.now(timezone.utc)
        report.corporate_reviewed_at = now
        report.corporate_reviewer_id = corporate_user.id
        inspection = report.inspection
        if inspection:
            inspection.corporate_review_notes = notes
            inspection.corporate_reviewed_at = now

        if approve:
            report.approval_status = "APPROVED"
            decision_text = "APPROVED"
            if inspection:
                inspection.workflow_stage = WorkflowStage.CORP_APPROVED.value

            # Alert to Mine Manager
            alert = Alert(
                title=f"Report {report.report_number} APPROVED by Corporate Management",
                message=f"Corporate Management approved statutory report for {report.mine.name if report.mine else 'Mine'}. Remarks: {notes}",
                alert_type="REPORT_APPROVED",
                severity="LOW",
                escalation_level=1,
                mine_id=report.mine_id
            )
            db.add(alert)
        else:
            report.approval_status = "REJECTED"
            report.rejection_feedback = notes.strip()
            decision_text = "REJECTED"
            if inspection:
                inspection.workflow_stage = WorkflowStage.VIOLATIONS_FLAGGED.value

            # Create Corporate Rejection Alert for Mine Manager
            alert = Alert(
                title=f"Report {report.report_number} REJECTED by Corporate Management",
                message=f"Corporate Management returned report with revision directives: {notes.strip()}",
                alert_type="CORPORATE_REPORT_REJECTED",
                severity="CRITICAL",
                escalation_level=2,
                mine_id=report.mine_id,
                contractor_id=inspection.contractor_id if inspection else None,
                is_escalated=True
            )
            db.add(alert)

        # Record Corporate Review entry
        review_entry = ReportReview(
            report_id=report.id,
            reviewer_id=corporate_user.id,
            role_level="CORPORATE MANAGEMENT",
            decision=decision_text,
            comments=notes
        )
        db.add(review_entry)
        db.commit()

        log_audit_action(
            db=db,
            username=corporate_user.username,
            role=corporate_user.role,
            action="CORPORATE_REVIEW_DECISION",
            entity="Report",
            entity_id=report.id,
            new_value={"approval_status": report.approval_status, "decision": decision_text, "notes": notes}
        )

        return {
            "report_id": report.id,
            "approval_status": report.approval_status,
            "decision": decision_text,
            "rejection_feedback": report.rejection_feedback if not approve else None,
            "workflow_stage": inspection.workflow_stage if inspection else report.approval_status
        }

    @classmethod
    def resubmit_report(
        cls,
        db: Session,
        report_id: str,
        manager: User,
        revision_notes: str
    ) -> Report:
        """
        Step: Mine Manager revises previously rejected report based on Corporate feedback and resubmits.
        Status becomes UNDER_CORPORATE_REVIEW (resubmitted).
        """
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise ValueError("Report not found")

        now = datetime.now(timezone.utc)
        report.approval_status = "UNDER_CORPORATE_REVIEW"
        report.manager_remarks = f"REVISION ({now.strftime('%d-%b-%Y')}) by {manager.full_name}: {revision_notes}\n\n[Previous Remarks]: {report.manager_remarks or ''}"
        
        # Notify Corporate
        alert = Alert(
            title=f"Report Resubmitted for Corporate Review: {report.report_number}",
            message=f"Mine Manager addressed rejection directives and resubmitted report. Revisions: {revision_notes}",
            alert_type="REPORT_RESUBMITTED",
            severity="HIGH",
            escalation_level=2,
            mine_id=report.mine_id
        )
        db.add(alert)
        db.commit()
        db.refresh(report)

        log_audit_action(
            db=db,
            username=manager.username,
            role=manager.role,
            action="REPORT_RESUBMITTED_AFTER_REVISION",
            entity="Report",
            entity_id=report.id,
            new_value={"approval_status": report.approval_status, "revision_notes": revision_notes}
        )

        return report

