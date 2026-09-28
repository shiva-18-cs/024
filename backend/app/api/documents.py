import os
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Document, User, UserRole
from app.services.ocr_service import OCRService
from app.services.audit_service import log_audit_action
from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/documents", tags=["Document Management & OCR"])

@router.get("")
def list_documents(
    contractor_id: Optional[str] = Query(None),
    doc_category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Document)

    # Tenant Data Isolation: Contractor only sees their own documents
    if current_user.role == UserRole.CONTRACTOR.value:
        if current_user.contractor_id:
            q = q.filter(Document.contractor_id == current_user.contractor_id)
        else:
            return []
    elif contractor_id:
        q = q.filter(Document.contractor_id == contractor_id)

    if doc_category:
        q = q.filter(Document.doc_category.ilike(f"%{doc_category}%"))

    docs = q.order_by(Document.created_at.desc()).all()
    res = []
    for d in docs:
        res.append({
            "id": d.id,
            "file_name": d.file_name,
            "doc_category": d.doc_category,
            "contractor_id": d.contractor_id,
            "contractor_name": d.contractor.company_name if d.contractor else None,
            "status": d.status,
            "ocr_status": d.ocr_status,
            "ocr_confidence": d.ocr_confidence,
            "manual_verification_required": d.manual_verification_required,
            "issue_date": d.issue_date.isoformat() if d.issue_date else None,
            "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
            "extracted_metadata": d.extracted_metadata,
            "created_at": d.created_at.isoformat()
        })
    return res

@router.get("/{document_id}")
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Tenant Data Isolation: Verify ownership
    if current_user.role == UserRole.CONTRACTOR.value and doc.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: Document belongs to another contractor")

    return {
        "id": doc.id,
        "file_name": doc.file_name,
        "doc_category": doc.doc_category,
        "contractor_id": doc.contractor_id,
        "contractor_name": doc.contractor.company_name if doc.contractor else None,
        "status": doc.status,
        "ocr_status": doc.ocr_status,
        "ocr_confidence": doc.ocr_confidence,
        "manual_verification_required": doc.manual_verification_required,
        "issue_date": doc.issue_date.isoformat() if doc.issue_date else None,
        "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
        "extracted_metadata": doc.extracted_metadata,
        "created_at": doc.created_at.isoformat()
    }

@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Tenant Data Isolation: Verify ownership
    if current_user.role == UserRole.CONTRACTOR.value and doc.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: Document belongs to another contractor")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk")

    return FileResponse(path=doc.file_path, filename=doc.file_name)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_category: str = Form("Safety Certificate"),
    contractor_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Tenant Data Isolation: Ensure contractor upload is bound to authenticated contractor
    if current_user.role == UserRole.CONTRACTOR.value:
        contractor_id = current_user.contractor_id
        if not contractor_id:
            raise HTTPException(status_code=400, detail="Contractor account has no associated company")

    file_bytes = await file.read()
    dest_path = f"{settings.UPLOAD_DIR}/{file.filename}"
    with open(dest_path, "wb") as f:
        f.write(file_bytes)

    # Run OCR pipeline
    ocr_res = OCRService.process_document(dest_path, doc_category=doc_category)

    ext = file.filename.split(".")[-1].upper() if "." in file.filename else "PDF"
    doc = Document(
        contractor_id=contractor_id,
        uploaded_by_id=current_user.id,
        file_name=file.filename,
        file_path=dest_path,
        file_type=ext,
        doc_category=ocr_res.get("classified_category", doc_category),
        status="COMPLIANT" if not ocr_res.get("is_expired") else "EXPIRED",
        ocr_status="PROCESSED",
        ocr_confidence=ocr_res.get("ocr_confidence", 85.0),
        manual_verification_required=ocr_res.get("manual_verification_required", False),
        extracted_metadata=ocr_res.get("extracted_fields", {})
    )

    if ocr_res.get("parsed_expiry"):
        try:
            doc.expiry_date = datetime.fromisoformat(ocr_res["parsed_expiry"])
        except Exception:
            pass

    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_audit_action(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="DOCUMENT_UPLOADED_AND_DIGITIZED",
        entity="Document",
        entity_id=doc.id,
        new_value={"ocr_confidence": doc.ocr_confidence, "category": doc.doc_category}
    )

    return {
        "id": doc.id,
        "file_name": doc.file_name,
        "category": doc.doc_category,
        "ocr_confidence": doc.ocr_confidence,
        "manual_verification_required": doc.manual_verification_required,
        "extracted_fields": doc.extracted_metadata,
        "status": doc.status
    }

@router.post("/{document_id}/ocr")
def trigger_ocr(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Tenant Data Isolation: Verify ownership
    if current_user.role == UserRole.CONTRACTOR.value and doc.contractor_id != current_user.contractor_id:
        raise HTTPException(status_code=403, detail="Access denied: Document belongs to another contractor")

    ocr_res = OCRService.process_document(doc.file_path, doc_category=doc.doc_category)
    doc.ocr_confidence = ocr_res.get("ocr_confidence", 85.0)
    doc.manual_verification_required = ocr_res.get("manual_verification_required", False)
    doc.extracted_metadata = ocr_res.get("extracted_fields", {})
    doc.ocr_status = "PROCESSED"
    db.commit()
    db.refresh(doc)

    return {
        "document_id": doc.id,
        "ocr_confidence": doc.ocr_confidence,
        "manual_verification_required": doc.manual_verification_required,
        "extracted_metadata": doc.extracted_metadata
    }
