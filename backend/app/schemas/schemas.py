from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# ----------------- AUTH & USER -----------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class UserBase(BaseModel):
    email: str
    username: str
    full_name: str
    role: str
    phone: Optional[str] = None
    contractor_id: Optional[str] = None
    mine_id: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: str
    created_at: datetime
    mine_name: Optional[str] = None
    contractor_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- SUBSIDIARY & MINE -----------------
class SubsidiaryOut(BaseModel):
    id: str
    name: str
    code: str
    headquarters: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MineBase(BaseModel):
    name: str
    code: str
    subsidiary_id: str
    state: str
    district: str
    latitude: float
    longitude: float
    production_capacity_mtpa: float = 2.5
    mine_type: str = "Opencast"
    manager_name: Optional[str] = None
    status: str = "OPERATIONAL"

class MineCreate(MineBase):
    pass

class MineOut(MineBase):
    id: str
    created_at: datetime
    subsidiary_name: Optional[str] = None
    compliance_score: Optional[float] = 88.0
    risk_level: Optional[str] = "LOW"
    open_violations_count: Optional[int] = 0
    active_contractors_count: Optional[int] = 0
    workers_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

# ----------------- CONTRACTOR & CONTRACTS -----------------
class ContractorBase(BaseModel):
    company_name: str
    reg_number: str
    gstin: Optional[str] = None
    pan: Optional[str] = None
    contact_person: str
    email: str
    phone: str
    address: Optional[str] = None
    license_category: str = "Heavy Earth Moving & Extraction"
    license_expiry: Optional[datetime] = None

class ContractorCreate(ContractorBase):
    pass

class ContractorOut(ContractorBase):
    id: str
    compliance_score: float
    risk_level: str
    is_active: bool
    created_at: datetime
    active_contracts_count: Optional[int] = 0
    pending_actions_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class ContractRequirementOut(BaseModel):
    id: str
    contract_id: str
    title: str
    regulation_code: str
    category: str
    due_date: datetime
    status: str
    verification_status: str
    document_id: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ContractOut(BaseModel):
    id: str
    contract_number: str
    contractor_id: str
    contractor_name: Optional[str] = None
    mine_id: str
    mine_name: Optional[str] = None
    title: str
    scope_of_work: Optional[str] = None
    start_date: datetime
    end_date: datetime
    value_inr_crores: float
    status: str
    requirements: List[ContractRequirementOut] = []

    model_config = ConfigDict(from_attributes=True)

# ----------------- WORKER, ATTENDANCE, MEDICAL -----------------
class AttendanceCreate(BaseModel):
    worker_id: str
    date: datetime
    status: str = "PRESENT"
    shift: str = "Morning"

class AttendanceOut(AttendanceCreate):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MedicalRecordCreate(BaseModel):
    worker_id: str
    examination_date: datetime
    expiry_date: datetime
    examining_doctor: str
    hospital_name: str
    fitness_status: str = "FIT"
    audiometry_result: str = "NORMAL"
    chest_xray_result: str = "CLEAR (NO PNEUMOCONIOSIS)"
    certificate_number: str

class MedicalRecordOut(MedicalRecordCreate):
    id: str
    is_expired: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkerBase(BaseModel):
    contractor_id: Optional[str] = None
    mine_id: str
    worker_code: str
    first_name: str
    last_name: str
    designation: str
    joining_date: datetime
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    is_active: bool = True

class WorkerCreate(WorkerBase):
    pass

class WorkerVerify(BaseModel):
    compliance_status: str = "COMPLIANT"
    medical_fitness_status: Optional[str] = None
    remarks: Optional[str] = None

class WorkerVerifyRequest(BaseModel):
    decision: str  # VERIFIED, REJECTED, CORRECTION_REQUIRED
    notes: Optional[str] = None

class WorkerOut(WorkerBase):
    id: str
    medical_fitness_status: str
    medical_expiry_date: Optional[datetime] = None
    compliance_status: str
    verification_status: str = "VERIFIED"
    training_status: str = "CERTIFIED"
    verified_by_name: Optional[str] = None
    verification_notes: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    contractor_name: Optional[str] = None
    mine_name: Optional[str] = None
    is_medical_expired: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)

# ----------------- FIELD INSPECTIONS & EVIDENCE -----------------
class ChecklistItemIn(BaseModel):
    item_key: str
    category: str
    item_title: str
    is_compliant: bool
    remarks: Optional[str] = None

class ChecklistItemOut(ChecklistItemIn):
    id: str
    severity_weight: int

    model_config = ConfigDict(from_attributes=True)

class ObservationIn(BaseModel):
    title: str
    description: str
    category: str = "Safety"
    severity: str = "HIGH"
    requires_action: bool = True

class ObservationOut(ObservationIn):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class GeoEvidenceOut(BaseModel):
    id: str
    inspection_id: str
    file_name: str
    file_path: str
    caption: Optional[str] = None
    latitude: float
    longitude: float
    captured_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InspectionCreate(BaseModel):
    mine_id: str
    contractor_id: Optional[str] = None
    inspection_type: str = "Safety"
    latitude: float
    longitude: float
    location_tag: str = "Pit Sector A / Haulage Ramp"
    summary: Optional[str] = None
    checklists: List[ChecklistItemIn] = []
    observations: List[ObservationIn] = []

class InspectionOut(BaseModel):
    id: str
    inspection_number: str
    mine_id: str
    mine_name: Optional[str] = None
    contractor_id: Optional[str] = None
    contractor_name: Optional[str] = None
    officer_id: str
    officer_name: Optional[str] = None
    inspection_type: str
    inspection_date: datetime
    latitude: float
    longitude: float
    location_tag: str
    risk_level: str
    compliance_score: float
    workflow_stage: str
    summary: Optional[str] = None
    ai_risk_score: Optional[float] = None
    ai_risk_category: Optional[str] = None
    ai_factors: List[str] = []
    manager_review_notes: Optional[str] = None
    corporate_review_notes: Optional[str] = None
    checklists: List[ChecklistItemOut] = []
    observations: List[ObservationOut] = []
    evidence: List[GeoEvidenceOut] = []

    model_config = ConfigDict(from_attributes=True)

# ----------------- WORKFLOW ACTIONS -----------------
class WorkflowActionRequest(BaseModel):
    action: str  # MM_VALIDATE, MM_REJECT, CORP_APPROVE, CORP_REJECT, RESUBMIT
    notes: Optional[str] = None
    raise_violation: Optional[bool] = False
    violation_title: Optional[str] = None
    violation_category: Optional[str] = None
    corrective_action_description: Optional[str] = None
    due_days: Optional[int] = 7

# ----------------- VIOLATIONS & CORRECTIVE ACTIONS -----------------
class ViolationOut(BaseModel):
    id: str
    violation_code: str
    mine_id: str
    mine_name: Optional[str] = None
    contractor_id: Optional[str] = None
    contractor_name: Optional[str] = None
    inspection_id: Optional[str] = None
    title: str
    category: str
    severity: str
    regulation_reference: str
    description: str
    status: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CorrectiveActionCreate(BaseModel):
    violation_id: str
    contractor_id: str
    mine_id: str
    title: str
    description: str
    priority: str = "HIGH"
    due_date: datetime
    assigned_to: Optional[str] = "Contractor Site In-Charge"

class CorrectiveActionOut(BaseModel):
    id: str
    action_code: str
    violation_id: str
    violation_title: Optional[str] = None
    contractor_id: str
    contractor_name: Optional[str] = None
    mine_id: str
    mine_name: Optional[str] = None
    title: str
    description: str
    priority: str
    due_date: datetime
    status: str
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolution_evidence_file: Optional[str] = None
    resolved_at: Optional[datetime] = None
    verified_by_name: Optional[str] = None
    verification_notes: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_decision: Optional[str] = None
    closed_by_name: Optional[str] = None
    closed_at: Optional[datetime] = None
    closure_notes: Optional[str] = None
    is_overdue: Optional[bool] = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CorrectiveActionResolve(BaseModel):
    resolution_notes: str
    evidence_file_name: Optional[str] = None

class CorrectiveActionVerify(BaseModel):
    approved: bool  # True for FIXED, False for NOT_FIXED
    verification_notes: str

class CorrectiveActionClose(BaseModel):
    closure_notes: str

# ----------------- AI RISK PREDICTIONS & ANOMALIES -----------------
class AIPredictionOut(BaseModel):
    id: str
    target_type: str
    target_id: str
    risk_score: float
    risk_category: str
    confidence: float
    contributing_factors: List[str]
    explanation: str
    is_anomaly: bool
    anomaly_details: Dict[str, Any]
    recommended_actions: List[str]
    prediction_timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- OCR DOCUMENT INTELLIGENCE -----------------
class OCRResult(BaseModel):
    document_id: str
    file_name: str
    doc_category: str
    extracted_fields: Dict[str, Any]
    ocr_confidence: float
    manual_verification_required: bool
    status: str
    rules_evaluation: Dict[str, Any]

# ----------------- REPORTS -----------------
class ReportCreateFromInspection(BaseModel):
    inspection_id: str
    report_title: Optional[str] = None
    manager_remarks: Optional[str] = None

class ReportFinalizeRequest(BaseModel):
    manager_remarks: Optional[str] = None

class CorporateReviewRequest(BaseModel):
    approve: bool
    notes: str

class ReportResubmitRequest(BaseModel):
    revision_notes: str

class ReportOut(BaseModel):
    id: str
    report_number: str
    inspection_id: str
    mine_id: str
    mine_name: Optional[str] = None
    report_title: str
    file_path: Optional[str] = None
    generated_at: datetime
    finalized_at: Optional[datetime] = None
    approval_status: str
    ai_risk_score: Optional[float] = None
    ai_explanation: Optional[str] = None
    manager_remarks: Optional[str] = None
    rejection_feedback: Optional[str] = None
    corporate_reviewed_at: Optional[datetime] = None
    corporate_reviewer_name: Optional[str] = None
    created_by_name: Optional[str] = None
    report_data: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)

class ReportRemarksRequest(BaseModel):
    manager_remarks: str

class ReportReviewOut(BaseModel):
    id: str
    report_id: str
    reviewer_id: str
    reviewer_name: Optional[str] = None
    role_level: str
    decision: str
    comments: Optional[str] = None
    reviewed_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- TRAINING & CERTIFICATIONS -----------------
class TrainingRecordIn(BaseModel):
    worker_id: str
    training_type: str = "Vocational Training"
    training_name: str
    training_status: str = "VALID"
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    certificate_ref: Optional[str] = None
    document_file: Optional[str] = None
    file_name: Optional[str] = None

class TrainingRecordOut(TrainingRecordIn):
    id: str
    verification_status: str
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    ocr_status: Optional[str] = "COMPLETED"
    extracted_metadata: Optional[str] = "{}"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TrainingVerifyRequest(BaseModel):
    decision: str  # VERIFIED, REJECTED, NEEDS_CLARIFICATION
    notes: Optional[str] = None

class CertificationRecordIn(BaseModel):
    worker_id: str
    certification_type: str = "DGMS Gas Testing"
    certification_name: str
    certificate_ref: str
    issuing_authority: Optional[str] = "Directorate General of Mines Safety (DGMS)"
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    document_file: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None

class CertificationExtractedFieldsUpdate(BaseModel):
    worker_name: Optional[str] = None
    worker_id: Optional[str] = None
    certification_name: Optional[str] = None
    certification_type: Optional[str] = None
    certificate_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    training_date: Optional[str] = None
    medical_fitness_date: Optional[str] = None
    validity_period: Optional[str] = None

class CertificationRecordOut(BaseModel):
    id: str
    worker_id: str
    worker_name: Optional[str] = None
    worker_code: Optional[str] = None
    contractor_name: Optional[str] = None
    mine_name: Optional[str] = None
    certification_type: str
    certification_name: str
    certificate_ref: str
    issuing_authority: Optional[str] = "Directorate General of Mines Safety (DGMS)"
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    document_file: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    ocr_status: Optional[str] = "COMPLETED"
    ocr_text: Optional[str] = None
    ocr_confidence: Optional[float] = 92.5
    extracted_metadata: Optional[str] = "{}"
    status: Optional[str] = "VERIFIED"
    verification_status: str
    verified_by_id: Optional[str] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    verification_history: Optional[str] = "[]"
    days_remaining: Optional[int] = None
    is_expired: Optional[bool] = False
    is_expiring_soon: Optional[bool] = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CertificationVerifyRequest(BaseModel):
    decision: str  # VERIFIED, REJECTED, NEEDS_CLARIFICATION
    notes: Optional[str] = None

class CertificationUploadResponse(BaseModel):
    filename: str
    file_type: str
    file_size: int
    file_url: str
    ocr_status: str
    ocr_confidence: float
    extracted_fields: Dict[str, Any]
    raw_text: Optional[str] = None
    system_status: str

# ----------------- ALERTS, ESCALATIONS & AUDIT -----------------
class AlertOut(BaseModel):
    id: str
    title: str
    message: str
    alert_type: str
    severity: str
    escalation_level: int
    mine_id: Optional[str] = None
    contractor_id: Optional[str] = None
    is_read: bool
    is_escalated: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EscalationLogOut(BaseModel):
    id: str
    alert_id: Optional[str] = None
    action_id: Optional[str] = None
    violation_id: Optional[str] = None
    mine_id: Optional[str] = None
    mine_name: Optional[str] = None
    contractor_id: Optional[str] = None
    contractor_name: Optional[str] = None
    escalation_level: int
    event_type: str
    reason: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AuditLogOut(BaseModel):
    id: str
    username: str
    role: str
    action: str
    entity: str
    entity_id: Optional[str] = None
    previous_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    ip_address: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

