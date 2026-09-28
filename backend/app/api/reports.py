import os
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, Form, Body, Request
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Report, ReportReview, Inspection, User, UserRole
from app.schemas.schemas import (
    ReportOut, ReportCreateFromInspection, ReportFinalizeRequest, CorporateReviewRequest, ReportResubmitRequest,
    ReportRemarksRequest, ReportReviewOut
)
from app.services.report_service import ReportService
from app.services.workflow_service import WorkflowService
from app.services.ai_service import AIService
from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/reports", tags=["Reports"])

def _to_report_out(r: Report) -> ReportOut:
    item = ReportOut.model_validate(r)
    item.mine_name = r.mine.name if r.mine else None
    item.created_by_name = r.created_by.full_name if getattr(r, 'created_by', None) else None
    item.corporate_reviewer_name = r.corporate_reviewer.full_name if getattr(r, 'corporate_reviewer', None) else None
    return item

@router.get("", response_model=List[ReportOut])
def list_reports(
    mine_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Report)

    # Role-based scoping
    if current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id:
        q = q.filter(Report.mine_id == current_user.mine_id)
    elif current_user.role in [UserRole.CONTRACTOR.value, UserRole.WORKER_OFFICER.value, UserRole.FIELD_OFFICER.value]:
        # Only Mine Manager and Corporate Management have reports access
        raise HTTPException(status_code=403, detail="Reports access is restricted to Mine Manager and Corporate Management")

    if mine_id and current_user.role == UserRole.CORPORATE.value:
        q = q.filter(Report.mine_id == mine_id)
    if status:
        q = q.filter(Report.approval_status == status)

    reports = q.order_by(Report.generated_at.desc()).all()
    return [_to_report_out(r) for r in reports]

@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")

    if current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id and r.mine_id != current_user.mine_id:
        raise HTTPException(status_code=403, detail="Access denied: Report belongs to another mine")
    if current_user.role in [UserRole.CONTRACTOR.value, UserRole.WORKER_OFFICER.value, UserRole.FIELD_OFFICER.value]:
        raise HTTPException(status_code=403, detail="Reports access is restricted to Mine Manager and Corporate Management")

    return _to_report_out(r)

@router.post("/create-from-inspection", response_model=ReportOut)
def create_report_from_inspection(
    payload: ReportCreateFromInspection,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mine Manager creates Official Mine Report from submitted Field Officer inspection.
    Initial Status: DRAFT.
    """
    if current_user.role not in [UserRole.MINE_MANAGER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Mine Manager can create official mine reports")

    inspection = db.query(Inspection).filter(Inspection.id == payload.inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    if current_user.role == UserRole.MINE_MANAGER.value and current_user.mine_id and inspection.mine_id != current_user.mine_id:
        raise HTTPException(status_code=403, detail="Cannot create report for another mine")

    try:
        report = WorkflowService.create_mine_manager_report(
            db=db,
            inspection_id=payload.inspection_id,
            manager=current_user,
            report_title=payload.report_title,
            manager_remarks=payload.manager_remarks
        )
        return _to_report_out(report)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{report_id}/ai-risk-analysis")
def run_report_ai_analysis(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mine Manager runs AI Risk Analysis on draft/reviewed report.
    Assists in detecting risk, patterns, severity, anomalies.
    """
    if current_user.role not in [UserRole.MINE_MANAGER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Mine Manager can run AI risk analysis on reports")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    try:
        results = AIService.analyze_mine_manager_report(db, report_id)
        db.refresh(report)
        return {
            "report_id": report_id,
            "status": report.approval_status,
            "ai_results": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{report_id}/remarks", response_model=ReportOut)
def update_report_remarks(
    report_id: str,
    payload: ReportRemarksRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mine Manager adds or updates review remarks on report draft before finalization.
    """
    if current_user.role not in [UserRole.MINE_MANAGER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Mine Manager can update report review remarks")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.manager_remarks = payload.manager_remarks
    db.commit()
    db.refresh(report)
    return _to_report_out(report)

@router.post("/{report_id}/finalize", response_model=ReportOut)
def finalize_report_endpoint(
    report_id: str,
    payload: Optional[ReportFinalizeRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mine Manager finalizes report with remarks.
    Validates AI analysis has been run.
    Status transitions to FINALIZED.
    """
    if current_user.role not in [UserRole.MINE_MANAGER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Mine Manager can finalize reports")

    try:
        remarks = payload.manager_remarks if payload else None
        report = WorkflowService.finalize_mine_manager_report(db, report_id, current_user, remarks)
        return _to_report_out(report)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{report_id}/submit-to-corporate", response_model=ReportOut)
def submit_to_corporate_endpoint(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mine Manager submits finalized report to Corporate Management for review.
    Status transitions to UNDER_CORPORATE_REVIEW.
    """
    if current_user.role not in [UserRole.MINE_MANAGER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Mine Manager can submit reports to Corporate")

    try:
        report = WorkflowService.submit_report_to_corporate(db, report_id, current_user)
        return _to_report_out(report)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{report_id}/history", response_model=List[ReportReviewOut])
def get_report_review_history(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit review and decision history for a statutory report.
    """
    if current_user.role not in [UserRole.MINE_MANAGER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Access denied")

    reviews = db.query(ReportReview).filter(ReportReview.report_id == report_id).order_by(ReportReview.reviewed_at.desc()).all()
    results = []
    for rev in reviews:
        item = ReportReviewOut.model_validate(rev)
        item.reviewer_name = rev.reviewer.full_name if rev.reviewer else "Statutory Authority"
        results.append(item)
    return results

@router.post("/{report_id}/corporate-review")
async def corporate_review_endpoint(
    report_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Corporate Management Final Governance Sign-off.
    Approves the statutory report or Rejects with MANDATORY feedback for Mine Manager revision.
    """
    if current_user.role != UserRole.CORPORATE.value:
        raise HTTPException(status_code=403, detail="Only Corporate Management can perform statutory review and approve/reject reports")

    content_type = request.headers.get("content-type", "")
    is_approve = None
    review_notes = ""

    if "application/json" in content_type:
        try:
            data = await request.json()
            is_approve = data.get("approve")
            review_notes = data.get("notes") or ""
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
    else:
        form_data = await request.form()
        if "approve" in form_data:
            val = form_data.get("approve")
            is_approve = str(val).lower() in ("true", "1", "yes")
        if "notes" in form_data:
            review_notes = form_data.get("notes") or ""

    if is_approve is None and "approve" in request.query_params:
        val = request.query_params.get("approve")
        is_approve = str(val).lower() in ("true", "1", "yes")
        if "notes" in request.query_params:
            review_notes = request.query_params.get("notes") or ""

    if is_approve is None:
        raise HTTPException(status_code=400, detail="Approval decision ('approve' boolean) is required")

    if not is_approve and (not review_notes or not review_notes.strip()):
        raise HTTPException(status_code=400, detail="Rejection reason and feedback is mandatory when rejecting a report")

    try:
        return WorkflowService.corporate_review(db, report_id, current_user, is_approve, review_notes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{report_id}/resubmit", response_model=ReportOut)
def resubmit_report_endpoint(
    report_id: str,
    payload: ReportResubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mine Manager revises rejected report and resubmits to Corporate Management.
    """
    if current_user.role not in [UserRole.MINE_MANAGER.value, UserRole.CORPORATE.value]:
        raise HTTPException(status_code=403, detail="Only Mine Manager can revise and resubmit reports")

    try:
        report = WorkflowService.resubmit_report(db, report_id, current_user, payload.revision_notes)
        return _to_report_out(report)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{report_id}/download/{file_format}")
def download_report(report_id: str, file_format: str, db: Session = Depends(get_db)):
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")

    fmt = file_format.lower()
    if fmt == "pdf":
        if r.file_path and os.path.exists(r.file_path):
            return FileResponse(r.file_path, media_type="application/pdf", filename=f"{r.report_number}.pdf")
        pdf_path = f"{settings.REPORTS_DIR}/{r.report_number}.pdf"
        ReportService.generate_pdf(r.report_data or {}, pdf_path)
        r.file_path = pdf_path
        db.commit()
        return FileResponse(pdf_path, media_type="application/pdf", filename=f"{r.report_number}.pdf")
    
    elif fmt == "xlsx":
        xlsx_path = f"{settings.REPORTS_DIR}/{r.report_number}.xlsx"
        checklists = (r.report_data or {}).get("checklists", [{"Item": "General Compliance", "Status": "OK"}])
        ReportService.generate_excel(checklists, xlsx_path, title=r.report_number)
        return FileResponse(xlsx_path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=f"{r.report_number}.xlsx")

    elif fmt == "csv":
        csv_path = f"{settings.REPORTS_DIR}/{r.report_number}.csv"
        checklists = (r.report_data or {}).get("checklists", [{"Item": "General Compliance", "Status": "OK"}])
        ReportService.generate_csv(checklists, csv_path)
        return FileResponse(csv_path, media_type="text/csv", filename=f"{r.report_number}.csv")

    elif fmt == "json":
        import json
        content = json.dumps(r.report_data or {}, indent=2)
        return Response(content=content, media_type="application/json", headers={"Content-Disposition": f"attachment; filename={r.report_number}.json"})

    raise HTTPException(status_code=400, detail="Invalid format. Supported formats: pdf, xlsx, csv, json")

