import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class UserRole(str, Enum):
    CORPORATE = "CORPORATE MANAGEMENT"
    MINE_MANAGER = "MINE MANAGER"
    FIELD_OFFICER = "FIELD OFFICER"
    CONTRACTOR = "CONTRACTOR"
    WORKER_OFFICER = "WORKER MANAGEMENT"

class InspectionType(str, Enum):
    SAFETY = "Safety"
    ENVIRONMENT = "Environment"
    CONTRACTOR_COMPLIANCE = "Contractor Compliance"
    LABOUR_COMPLIANCE = "Labour Compliance"
    EQUIPMENT = "Equipment"
    GENERAL = "General Inspection"

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ComplianceStatus(str, Enum):
    COMPLIANT = "COMPLIANT"
    NON_COMPLIANT = "NON_COMPLIANT"
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER REVIEW"
    EXPIRED = "EXPIRED"

class ActionStatus(str, Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    PROOF_SUBMITTED = "PROOF_SUBMITTED"
    UNDER_VERIFICATION = "UNDER_VERIFICATION"
    FIXED = "FIXED"
    VERIFIED = "VERIFIED"
    NOT_FIXED = "NOT_FIXED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    OVERDUE = "OVERDUE"

class WorkflowStage(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_MINE_MANAGER_REVIEW = "UNDER_MINE_MANAGER_REVIEW"
    MM_VALIDATED = "MM_VALIDATED"
    MM_REJECTED = "MM_REJECTED"
    AUTOMATED_REPORT_GENERATED = "AUTOMATED_REPORT_GENERATED"
    UNDER_CORPORATE_REVIEW = "UNDER_CORPORATE_REVIEW"
    CORP_APPROVED = "CORP_APPROVED"
    CORP_REJECTED = "CORP_REJECTED"
    VIOLATIONS_FLAGGED = "VIOLATIONS_FLAGGED"
    RE_SUBMITTED = "RE_SUBMITTED"
    RE_VERIFIED = "RE_VERIFIED"

class ReportStatus(str, Enum):
    DRAFT = "DRAFT"
    AI_ANALYSIS = "AI_ANALYSIS"
    MINE_MANAGER_REVIEW = "MINE_MANAGER_REVIEW"
    FINALIZED = "FINALIZED"
    UNDER_CORPORATE_REVIEW = "UNDER_CORPORATE_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RESUBMITTED = "RESUBMITTED"



class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(120), unique=True, index=True, nullable=False)
    username = Column(String(80), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.CORPORATE.value)
    phone = Column(String(30), nullable=True)
    is_active = Column(Boolean, default=True)
    contractor_id = Column(String(36), ForeignKey("contractors.id", ondelete="SET NULL"), nullable=True)
    mine_id = Column(String(36), ForeignKey("mines.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    contractor = relationship("Contractor", back_populates="users", foreign_keys=[contractor_id])
    mine = relationship("Mine", back_populates="users", foreign_keys=[mine_id])

class Subsidiary(Base):
    __tablename__ = "subsidiaries"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(150), nullable=False, unique=True)
    code = Column(String(30), nullable=False, unique=True)
    headquarters = Column(String(150), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    mines = relationship("Mine", back_populates="subsidiary")

class Mine(Base):
    __tablename__ = "mines"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    subsidiary_id = Column(String(36), ForeignKey("subsidiaries.id"), nullable=False)
    name = Column(String(150), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    state = Column(String(80), nullable=False)
    district = Column(String(80), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    production_capacity_mtpa = Column(Float, default=2.5)
    mine_type = Column(String(50), default="Opencast")  # Opencast / Underground
    manager_name = Column(String(120), nullable=True)
    status = Column(String(50), default="OPERATIONAL")
    created_at = Column(DateTime, default=utc_now)

    subsidiary = relationship("Subsidiary", back_populates="mines")
    users = relationship("User", back_populates="mine", foreign_keys=[User.mine_id])
    contracts = relationship("Contract", back_populates="mine")
    workers = relationship("Worker", back_populates="mine")
    inspections = relationship("Inspection", back_populates="mine")
    violations = relationship("Violation", back_populates="mine")
    compliance_records = relationship("ComplianceRecord", back_populates="mine")

class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    company_name = Column(String(150), nullable=False)
    reg_number = Column(String(80), unique=True, nullable=False)
    gstin = Column(String(50), nullable=True)
    pan = Column(String(20), nullable=True)
    contact_person = Column(String(100), nullable=False)
    email = Column(String(120), nullable=False)
    phone = Column(String(30), nullable=False)
    address = Column(Text, nullable=True)
    license_category = Column(String(100), default="Heavy Earth Moving & Extraction")
    license_expiry = Column(DateTime, nullable=True)
    compliance_score = Column(Float, default=85.0)
    risk_level = Column(String(30), default=RiskLevel.LOW.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    users = relationship("User", back_populates="contractor", foreign_keys=[User.contractor_id])
    contracts = relationship("Contract", back_populates="contractor")
    workers = relationship("Worker", back_populates="contractor")
    documents = relationship("Document", back_populates="contractor")
    corrective_actions = relationship("CorrectiveAction", back_populates="contractor")

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    contract_number = Column(String(80), unique=True, nullable=False)
    contractor_id = Column(String(36), ForeignKey("contractors.id"), nullable=False)
    mine_id = Column(String(36), ForeignKey("mines.id"), nullable=False)
    title = Column(String(200), nullable=False)
    scope_of_work = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    value_inr_crores = Column(Float, default=12.5)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=utc_now)

    contractor = relationship("Contractor", back_populates="contracts")
    mine = relationship("Mine", back_populates="contracts")
    requirements = relationship("ContractRequirement", back_populates="contract")

class ContractRequirement(Base):
    __tablename__ = "contract_requirements"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    contract_id = Column(String(36), ForeignKey("contracts.id"), nullable=False)
    title = Column(String(200), nullable=False)
    regulation_code = Column(String(80), nullable=False)  # e.g., DGMS-1957, Mines Act 1952, CPCB-Air-2024
    category = Column(String(80), nullable=False)  # Safety, Environmental, Labour, Statutory
    due_date = Column(DateTime, nullable=False)
    status = Column(String(50), default=ComplianceStatus.PENDING.value)
    verification_status = Column(String(50), default="UNVERIFIED")
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    contract = relationship("Contract", back_populates="requirements")
    document = relationship("Document")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    contractor_id = Column(String(36), ForeignKey("contractors.id"), nullable=True)
    uploaded_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # PDF, PNG, JPG, XLSX
    doc_category = Column(String(100), nullable=False)  # Safety Certificate, Environmental Clearance, Medical Fitness, etc.
    issue_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    status = Column(String(50), default=ComplianceStatus.UNDER_REVIEW.value)
    ocr_status = Column(String(50), default="PENDING")  # PENDING, PROCESSED, FAILED
    ocr_confidence = Column(Float, default=0.0)
    manual_verification_required = Column(Boolean, default=False)
    extracted_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)

    contractor = relationship("Contractor", back_populates="documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])

class Worker(Base):
    __tablename__ = "workers"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    contractor_id = Column(String(36), ForeignKey("contractors.id"), nullable=False)
    mine_id = Column(String(36), ForeignKey("mines.id"), nullable=False)
    worker_code = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    designation = Column(String(100), nullable=False)  # Dumper Operator, Blaster, Electrician, Loader, Surveyor
    joining_date = Column(DateTime, nullable=False)
    blood_group = Column(String(10), nullable=True)
    emergency_contact = Column(String(30), nullable=True)
    is_active = Column(Boolean, default=True)
    medical_fitness_status = Column(String(50), default="FIT")
    medical_expiry_date = Column(DateTime, nullable=True)
    compliance_status = Column(String(50), default=ComplianceStatus.COMPLIANT.value)
    verification_status = Column(String(50), default="VERIFIED")  # PENDING, VERIFIED, REJECTED, CORRECTION_REQUIRED
    training_status = Column(String(50), default="CERTIFIED")  # CERTIFIED, EXPIRING_SOON, EXPIRED, PENDING
    verified_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    contractor = relationship("Contractor", back_populates="workers")
    mine = relationship("Mine", back_populates="workers")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    attendance_records = relationship("Attendance", back_populates="worker", cascade="all, delete-orphan")
    medical_records = relationship("MedicalRecord", back_populates="worker", cascade="all, delete-orphan")
    training_records = relationship("TrainingRecord", back_populates="worker", cascade="all, delete-orphan")
    certification_records = relationship("CertificationRecord", back_populates="worker", cascade="all, delete-orphan")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    worker_id = Column(String(36), ForeignKey("workers.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    status = Column(String(30), default="PRESENT")  # PRESENT, ABSENT, LEAVE
    shift = Column(String(20), default="Morning")  # Morning, Afternoon, Night
    in_time = Column(String(10), nullable=True)
    out_time = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    worker = relationship("Worker", back_populates="attendance_records")

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    worker_id = Column(String(36), ForeignKey("workers.id"), nullable=False)
    examination_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    examining_doctor = Column(String(120), nullable=False)
    hospital_name = Column(String(150), nullable=False)
    fitness_status = Column(String(50), default="FIT")  # FIT, UNFIT, TEMPORARILY_UNFIT
    audiometry_result = Column(String(50), default="NORMAL")
    chest_xray_result = Column(String(50), default="CLEAR (NO PNEUMOCONIOSIS)")
    certificate_number = Column(String(80), nullable=False)
    certificate_file = Column(String(255), nullable=True)
    is_expired = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    worker = relationship("Worker", back_populates="medical_records")

class TrainingRecord(Base):
    __tablename__ = "training_records"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    worker_id = Column(String(36), ForeignKey("workers.id"), nullable=False)
    training_type = Column(String(80), nullable=False)  # Vocational Training, Refresher, Safety Induction, First Aid
    training_name = Column(String(150), nullable=False)
    training_status = Column(String(50), default="VALID")  # VALID, EXPIRING_SOON, EXPIRED, PENDING
    issue_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    certificate_ref = Column(String(100), nullable=True)
    verification_status = Column(String(50), default="VERIFIED")  # VERIFIED, PENDING, REJECTED
    verified_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    worker = relationship("Worker", back_populates="training_records")
    verified_by = relationship("User", foreign_keys=[verified_by_id])

class CertificationRecord(Base):
    __tablename__ = "certification_records"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    worker_id = Column(String(36), ForeignKey("workers.id"), nullable=False)
    certification_type = Column(String(80), nullable=False)  # DGMS Gas Testing, Blaster Certificate, Overman Certificate, HEMM Operator Permit
    certification_name = Column(String(150), nullable=False)
    certificate_ref = Column(String(100), nullable=False)
    issue_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    verification_status = Column(String(50), default="VERIFIED")  # VERIFIED, PENDING, REJECTED
    verified_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    worker = relationship("Worker", back_populates="certification_records")
    verified_by = relationship("User", foreign_keys=[verified_by_id])


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    inspection_number = Column(String(80), unique=True, nullable=False)
    mine_id = Column(String(36), ForeignKey("mines.id"), nullable=False)
    contractor_id = Column(String(36), ForeignKey("contractors.id"), nullable=True)
    officer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    inspection_type = Column(String(50), default=InspectionType.SAFETY.value)
    inspection_date = Column(DateTime, default=utc_now)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_tag = Column(String(150), default="Pit Area / Haul Road")
    risk_level = Column(String(30), default=RiskLevel.LOW.value)
    compliance_score = Column(Float, default=90.0)
    workflow_stage = Column(String(50), default=WorkflowStage.SUBMITTED.value)
    summary = Column(Text, nullable=True)
    ai_risk_score = Column(Float, nullable=True)
    ai_risk_category = Column(String(30), nullable=True)
    ai_factors = Column(JSON, default=list)
    manager_review_notes = Column(Text, nullable=True)
    manager_reviewed_at = Column(DateTime, nullable=True)
    corporate_review_notes = Column(Text, nullable=True)
    corporate_reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    mine = relationship("Mine", back_populates="inspections")
    contractor = relationship("Contractor")
    officer = relationship("User", foreign_keys=[officer_id])
    checklists = relationship("InspectionChecklist", back_populates="inspection", cascade="all, delete-orphan")
    observations = relationship("InspectionObservation", back_populates="inspection", cascade="all, delete-orphan")
    evidence = relationship("GeoEvidence", back_populates="inspection", cascade="all, delete-orphan")
    violations = relationship("Violation", back_populates="inspection")
    reports = relationship("Report", back_populates="inspection")

class InspectionChecklist(Base):
    __tablename__ = "inspection_checklists"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    inspection_id = Column(String(36), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    item_key = Column(String(100), nullable=False)
    category = Column(String(80), nullable=False)
    item_title = Column(String(255), nullable=False)
    is_compliant = Column(Boolean, default=True)
    severity_weight = Column(Integer, default=5)
    remarks = Column(Text, nullable=True)

    inspection = relationship("Inspection", back_populates="checklists")

class InspectionObservation(Base):
    __tablename__ = "inspection_observations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    inspection_id = Column(String(36), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(80), default="Safety")
    severity = Column(String(30), default="HIGH")
    requires_action = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    inspection = relationship("Inspection", back_populates="observations")

class GeoEvidence(Base):
    __tablename__ = "geo_evidence"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    inspection_id = Column(String(36), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    caption = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    captured_at = Column(DateTime, default=utc_now)
    officer_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    inspection = relationship("Inspection", back_populates="evidence")

class ComplianceRecord(Base):
    __tablename__ = "compliance_records"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    mine_id = Column(String(36), ForeignKey("mines.id"), nullable=False)
    contractor_id = Column(String(36), ForeignKey("contractors.id"), nullable=True)
    record_date = Column(DateTime, default=utc_now)
    safety_score = Column(Float, default=85.0)
    environmental_score = Column(Float, default=90.0)
    labour_score = Column(Float, default=88.0)
    statutory_score = Column(Float, default=92.0)
    overall_score = Column(Float, default=88.5)
    risk_level = Column(String(30), default=RiskLevel.LOW.value)
    evaluation_breakdown = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)

    mine = relationship("Mine", back_populates="compliance_records")
    contractor = relationship("Contractor")

class Violation(Base):
    __tablename__ = "violations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    violation_code = Column(String(80), unique=True, nullable=False)
    mine_id = Column(String(36), ForeignKey("mines.id"), nullable=False)
    contractor_id = Column(String(36), ForeignKey("contractors.id"), nullable=True)
    inspection_id = Column(String(36), ForeignKey("inspections.id"), nullable=True)
    title = Column(String(255), nullable=False)
    category = Column(String(80), nullable=False)  # Safety, Environmental, Labour, Document Expiry
    severity = Column(String(30), default=RiskLevel.HIGH.value)
    regulation_reference = Column(String(150), default="DGMS Circular / Coal Mines Regulations 2017")
    description = Column(Text, nullable=False)
    status = Column(String(50), default="OPEN")  # OPEN, IN_CORRECTION, RESOLVED
    detected_at = Column(DateTime, default=utc_now)
    resolved_at = Column(DateTime, nullable=True)

    mine = relationship("Mine", back_populates="violations")
    contractor = relationship("Contractor")
    inspection = relationship("Inspection", back_populates="violations")
    corrective_actions = relationship("CorrectiveAction", back_populates="violation")

class CorrectiveAction(Base):
    __tablename__ = "corrective_actions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    action_code = Column(String(80), unique=True, nullable=False)
    violation_id = Column(String(36), ForeignKey("violations.id"), nullable=False)
    contractor_id = Column(String(36), ForeignKey("contractors.id"), nullable=False)
    mine_id = Column(String(36), ForeignKey("mines.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(30), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    due_date = Column(DateTime, nullable=False)
    status = Column(String(50), default=ActionStatus.OPEN.value)
    assigned_to = Column(String(120), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolution_evidence_file = Column(String(255), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    verified_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verification_decision = Column(String(30), nullable=True)  # FIXED, NOT_FIXED
    closed_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    closed_at = Column(DateTime, nullable=True)
    closure_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    violation = relationship("Violation", back_populates="corrective_actions")
    contractor = relationship("Contractor", back_populates="corrective_actions")
    mine = relationship("Mine")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    closed_by = relationship("User", foreign_keys=[closed_by_id])

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    report_number = Column(String(80), unique=True, nullable=False)
    inspection_id = Column(String(36), ForeignKey("inspections.id"), nullable=False)
    mine_id = Column(String(36), ForeignKey("mines.id"), nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    report_title = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=True)
    generated_at = Column(DateTime, default=utc_now)
    finalized_at = Column(DateTime, nullable=True)
    approval_status = Column(String(50), default="DRAFT")
    manager_remarks = Column(Text, nullable=True)
    rejection_feedback = Column(Text, nullable=True)
    report_data = Column(JSON, default=dict)
    ai_risk_score = Column(Float, nullable=True)
    ai_explanation = Column(Text, nullable=True)
    corporate_reviewed_at = Column(DateTime, nullable=True)
    corporate_reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    inspection = relationship("Inspection", back_populates="reports")
    mine = relationship("Mine")
    created_by = relationship("User", foreign_keys=[created_by_id])
    corporate_reviewer = relationship("User", foreign_keys=[corporate_reviewer_id])
    reviews = relationship("ReportReview", back_populates="report", cascade="all, delete-orphan")


class ReportReview(Base):
    __tablename__ = "report_reviews"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role_level = Column(String(50), nullable=False)  # MINE MANAGER, CORPORATE MANAGEMENT
    decision = Column(String(30), nullable=False)  # APPROVED, REJECTED, CHANGES_REQUESTED
    comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=utc_now)

    report = relationship("Report", back_populates="reviews")
    reviewer = relationship("User")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    alert_type = Column(String(80), nullable=False)  # DOCUMENT_EXPIRY, CRITICAL_VIOLATION, ACTION_OVERDUE, HIGH_RISK_AI
    severity = Column(String(30), default=RiskLevel.HIGH.value)
    escalation_level = Column(Integer, default=1)  # 1: Officer, 2: Mine Manager, 3: Corporate
    mine_id = Column(String(36), ForeignKey("mines.id"), nullable=True)
    contractor_id = Column(String(36), ForeignKey("contractors.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    is_escalated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    mine = relationship("Mine")
    contractor = relationship("Contractor")

class EscalationLog(Base):
    __tablename__ = "escalation_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    alert_id = Column(String(36), ForeignKey("alerts.id", ondelete="SET NULL"), nullable=True)
    action_id = Column(String(36), ForeignKey("corrective_actions.id", ondelete="SET NULL"), nullable=True)
    violation_id = Column(String(36), ForeignKey("violations.id", ondelete="SET NULL"), nullable=True)
    mine_id = Column(String(36), ForeignKey("mines.id", ondelete="SET NULL"), nullable=True)
    contractor_id = Column(String(36), ForeignKey("contractors.id", ondelete="SET NULL"), nullable=True)
    escalation_level = Column(Integer, default=1)  # 1: Field Officer, 2: Mine Manager, 3: Corporate
    event_type = Column(String(50), default="ESCALATED")  # CREATED, LEVEL_CHANGED, ACKNOWLEDGED, RESOLVED
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, ACKNOWLEDGED, RESOLVED
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    mine = relationship("Mine")
    contractor = relationship("Contractor")
    action = relationship("CorrectiveAction")
    violation = relationship("Violation")
    created_by = relationship("User", foreign_keys=[created_by_id])


class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    target_type = Column(String(50), nullable=False)  # MINE, CONTRACTOR, INSPECTION
    target_id = Column(String(36), nullable=False)
    risk_score = Column(Float, nullable=False)  # 0 to 100
    risk_category = Column(String(30), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    confidence = Column(Float, default=0.92)
    contributing_factors = Column(JSON, default=list)
    explanation = Column(Text, nullable=False)
    is_anomaly = Column(Boolean, default=False)
    anomaly_details = Column(JSON, default=dict)
    recommended_actions = Column(JSON, default=list)
    prediction_timestamp = Column(DateTime, default=utc_now)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), nullable=True)
    username = Column(String(80), nullable=False)
    role = Column(String(50), nullable=False)
    action = Column(String(120), nullable=False)
    entity = Column(String(80), nullable=False)
    entity_id = Column(String(36), nullable=True)
    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    timestamp = Column(DateTime, default=utc_now)
