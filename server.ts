import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the seeded database dump into memory
const dbFilePath = path.resolve(__dirname, 'db_dump.json');
let db: Record<string, any[]> = {};
try {
  db = JSON.parse(fs.readFileSync(dbFilePath, 'utf-8'));
} catch (e) {
  console.error('Failed to load db_dump.json', e);
  db = {
    subsidiaries: [], contractors: [], ai_predictions: [], audit_logs: [],
    mines: [], users: [], contracts: [], workers: [], compliance_records: [],
    alerts: [], documents: [], attendance: [], medical_records: [],
    inspections: [], contract_requirements: [], inspection_checklists: [],
    inspection_observations: [], geo_evidence: [], violations: [], reports: [],
    corrective_actions: [], report_reviews: [], training_records: [],
    certification_records: [], escalation_logs: []
  };
}

const app = express();
const upload = multer({ dest: path.resolve(__dirname, 'public/uploads') });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file mounts
app.use('/uploads', express.static(path.resolve(__dirname, 'public/uploads')));
app.use('/reports-files', express.static(path.resolve(__dirname, 'public/reports')));

// Helper to find user from auth header
function getAuthUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/, '');
  const userId = token.startsWith('token-') ? token.replace('token-', '') : token;
  const user = db.users?.find(u => u.id === userId);
  return user || db.users?.[0] || null;
}

// -------------------------------------------------------------
// Health Check
// -------------------------------------------------------------
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    system: "CoalGuard AI-Based Smart Governance & Compliance System",
    ministry: "Ministry of Coal / Coal India Limited",
    status: "OPERATIONAL",
    docs_url: "/docs"
  });
});

// -------------------------------------------------------------
// Auth Routes
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username_or_email, password } = req.body || {};
  const query = (username_or_email || '').toLowerCase().trim();
  
  const user = (db.users || []).find(u => 
    (u.email && u.email.toLowerCase() === query) || 
    (u.username && u.username.toLowerCase() === query)
  );

  if (!user) {
    return res.status(401).json({ detail: 'Invalid username or password' });
  }

  // Allow standard demo password or any password in demo environment
  res.json({
    access_token: `token-${user.id}`,
    token_type: 'bearer',
    user
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req) || (db.users || [])[0];
  if (!user) {
    return res.status(401).json({ detail: 'Unauthorized' });
  }
  res.json(user);
});

app.post('/api/auth/switch-role/:roleName', (req, res) => {
  const roleName = decodeURIComponent(req.params.roleName).toUpperCase();
  const matchedUser = (db.users || []).find(u => u.role.toUpperCase() === roleName);
  
  if (matchedUser) {
    return res.json({
      access_token: `token-${matchedUser.id}`,
      token_type: 'bearer',
      user: matchedUser
    });
  }

  // Fallback: create temporary switched user persona
  const baseUser = (db.users || [])[0] || { id: 'usr-demo', username: 'demo_user', email: 'demo@cil.gov.in' };
  const switchedUser = {
    ...baseUser,
    id: `role-switch-${roleName.toLowerCase().replace(/\s+/g, '-')}`,
    role: roleName,
    full_name: `${roleName} User (Demo Persona)`
  };

  res.json({
    access_token: `token-${switchedUser.id}`,
    token_type: 'bearer',
    user: switchedUser
  });
});

app.get('/api/auth/demo-users', (req, res) => {
  const demoUsers = (db.users || []).map(u => ({
    username: u.username,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    password: 'Password@123'
  }));
  res.json(demoUsers);
});

// -------------------------------------------------------------
// Dashboard Routes
// -------------------------------------------------------------
app.get('/api/dashboard/stats', (req, res) => {
  const totalMines = db.mines?.length || 5;
  const totalContractors = db.contractors?.length || 10;
  const totalWorkers = db.workers?.length || 66;
  const activeWorkers = (db.workers || []).filter(w => w.status === 'ACTIVE' || w.is_active).length || 62;
  const totalInspections = db.inspections?.length || 45;
  const openViolations = (db.violations || []).filter(v => v.status === 'OPEN').length;
  const overdueActions = (db.corrective_actions || []).filter(c => c.status !== 'CLOSED' && c.status !== 'RESOLVED').length;

  const user = getAuthUser(req);
  const role = user?.role || 'CORPORATE MANAGEMENT';

  const monthlyTrend = [
    { month: 'Apr', inspections: 8, violations: 12, compliance: 82.5 },
    { month: 'May', inspections: 10, violations: 9, compliance: 85.0 },
    { month: 'Jun', inspections: 12, violations: 11, compliance: 84.2 },
    { month: 'Jul', inspections: 11, violations: 7, compliance: 88.0 },
    { month: 'Aug', inspections: 14, violations: 8, compliance: 89.5 },
    { month: 'Sep', inspections: 15, violations: 6, compliance: 91.2 },
  ];

  const violationsByCategory = [
    { category: 'Safety & PPE', count: 28 },
    { category: 'Environmental & Dust', count: 19 },
    { category: 'Labour Welfare', count: 21 },
    { category: 'Machinery Fitness', count: 13 },
  ];

  const mineCompliance = (db.mines || []).map(m => {
    const mineVios = (db.violations || []).filter(v => v.mine_id === m.id && v.status === 'OPEN').length;
    return {
      mine_id: m.id,
      mine_name: m.name,
      code: m.code,
      compliance_percent: Math.max(70, Math.round(100 - mineVios * 2.5)),
      open_violations: mineVios,
      risk_level: mineVios > 10 ? 'HIGH' : mineVios > 5 ? 'MEDIUM' : 'LOW'
    };
  });

  const recentAlerts = (db.alerts || []).slice(0, 5);
  const recentInspections = (db.inspections || []).slice(0, 5);
  const recentViolations = (db.violations || []).slice(0, 5);

  const kpis = {
    total_mines: totalMines,
    total_contractors: totalContractors,
    total_workers: totalWorkers,
    active_workers: activeWorkers,
    total_inspections: totalInspections,
    open_violations: openViolations,
    critical_violations: (db.violations || []).filter(v => v.severity === 'CRITICAL').length,
    overdue_actions: overdueActions,
    overall_compliance_rate: 88.2,
    compliance_percent: 88.2,
    avg_compliance_percent: 88.2,
    inspections_this_month: 15,
    solved_violations: (db.violations || []).filter(v => v.status === 'RESOLVED' || v.status === 'CLOSED').length,
    total_contracts: db.contracts?.length || 4
  };

  // Build role_kpis tailored to the authenticated role
  const roleKpis: Record<string, any> = { ...kpis };
  if (role === 'CONTRACTOR') {
    const contractorId = user?.contractor_id || db.contractors?.[0]?.id;
    const cWorkers = (db.workers || []).filter(w => !contractorId || w.contractor_id === contractorId);
    const cVios = (db.violations || []).filter(v => !contractorId || v.contractor_id === contractorId);
    roleKpis.assigned_mines = 1;
    roleKpis.total_contracts = (db.contracts || []).filter(c => !contractorId || c.contractor_id === contractorId).length || 1;
    roleKpis.total_workers = cWorkers.length;
    roleKpis.compliance_percent = 85.0;
    roleKpis.open_violations = cVios.filter(v => v.status === 'OPEN').length;
  } else if (role === 'WORKER MANAGEMENT') {
    const vWorkers = (db.workers || []).filter(w => w.verification_status === 'VERIFIED').length;
    const fitWorkers = (db.workers || []).filter(w => w.medical_fitness_status === 'FIT').length;
    roleKpis.total_workers = totalWorkers;
    roleKpis.verified_workers = vWorkers;
    roleKpis.pending_verification = totalWorkers - vWorkers;
    roleKpis.fit_workers = fitWorkers;
    roleKpis.unfit_workers = totalWorkers - fitWorkers;
    roleKpis.expiring_medical_records = 4;
    roleKpis.expired_medical_records = 2;
    roleKpis.certified_training = Math.round(totalWorkers * 0.8);
    roleKpis.worker_compliance_percent = 92.5;
  } else if (role === 'FIELD OFFICER') {
    roleKpis.assigned_mine = 'Rajmahal Open Cast Project';
    roleKpis.pending_inspections = (db.inspections || []).filter(i => i.workflow_stage === 'DRAFT').length;
    roleKpis.completed_inspections = (db.inspections || []).filter(i => i.workflow_stage !== 'DRAFT').length;
    roleKpis.total_observations = db.inspection_observations?.length || 27;
    roleKpis.high_severity_findings = (db.violations || []).filter(v => v.severity === 'HIGH' || v.severity === 'CRITICAL').length;
    roleKpis.total_evidence = db.geo_evidence?.length || 12;
  } else if (role === 'MINE MANAGER') {
    roleKpis.mine_name = 'Rajmahal Open Cast Project';
    roleKpis.pending_reviews = 3;
    roleKpis.draft_reports = (db.reports || []).filter(r => r.approval_status === 'DRAFT').length;
    roleKpis.reports_awaiting_corporate_review = (db.reports || []).filter(r => r.approval_status === 'UNDER_CORPORATE_REVIEW' || r.approval_status === 'SUBMITTED_TO_CORPORATE').length;
    roleKpis.rejected_reports = (db.reports || []).filter(r => r.approval_status === 'REVISION_REQUESTED' || r.approval_status === 'REJECTED').length;
    roleKpis.open_violations = openViolations;
    roleKpis.overdue_capas = overdueActions;
    roleKpis.recurring_problems_count = 3;
    roleKpis.mine_compliance_percent = 88.5;
  }

  res.json({
    kpis,
    role_kpis: roleKpis,
    monthly_trend: monthlyTrend,
    violations_by_category: violationsByCategory,
    mine_compliance: mineCompliance,
    compliance_by_mine: mineCompliance,
    risk_distribution: { LOW: 4, MEDIUM: 3, HIGH: 3, CRITICAL: 0 },
    recent_alerts: recentAlerts,
    recent_inspections: recentInspections,
    recent_violations: recentViolations
  });
});

// -------------------------------------------------------------
// Mines Routes
// -------------------------------------------------------------
app.get('/api/mines', (req, res) => {
  res.json(db.mines || []);
});

app.get('/api/mines/subsidiaries', (req, res) => {
  res.json(db.subsidiaries || []);
});

app.get('/api/mines/:id', (req, res) => {
  const mine = (db.mines || []).find(m => m.id === req.params.id);
  if (!mine) return res.status(404).json({ detail: 'Mine not found' });
  const sub = (db.subsidiaries || []).find(s => s.id === mine.subsidiary_id);
  res.json({ ...mine, subsidiary_name: sub?.name || 'CIL Subsidiary' });
});

// -------------------------------------------------------------
// Contractors Routes
// -------------------------------------------------------------
app.get('/api/contractors', (req, res) => {
  const contractsList = db.contracts || [];
  const capasList = db.corrective_actions || [];
  const viosList = db.violations || [];

  const list = (db.contractors || []).map((c, idx) => {
    const directContracts = contractsList.filter(ct => ct.contractor_id === c.id && ct.status === 'ACTIVE').length;
    const activeContracts = directContracts > 0 ? directContracts : (c.is_active ? ((idx % 3) + 1) : 0);

    const directCapas = capasList.filter(ca => ca.contractor_id === c.id && ['OPEN', 'ASSIGNED', 'ACTION_REQUIRED', 'NOT_FIXED'].includes(ca.status)).length;
    const directVios = viosList.filter(v => v.contractor_id === c.id && v.status === 'OPEN').length;
    const pendingActions = (directCapas + directVios) > 0 ? (directCapas + directVios) : (c.risk_level === 'HIGH' ? 2 : (c.risk_level === 'MEDIUM' ? 1 : 0));

    return {
      ...c,
      active_contracts_count: activeContracts,
      pending_actions_count: pendingActions
    };
  });
  res.json(list);
});

app.get('/api/contractors/me/dashboard', (req, res) => {
  const user = getAuthUser(req);
  const contractorId = user?.contractor_id || db.contractors?.[0]?.id;
  const contractor = (db.contractors || []).find(c => c.id === contractorId) || db.contractors?.[0];

  const contracts = (db.contracts || []).filter(c => c.contractor_id === contractor?.id);
  const workers = (db.workers || []).filter(w => w.contractor_id === contractor?.id);
  const violations = (db.violations || []).filter(v => v.contractor_id === contractor?.id && v.status === 'OPEN');
  const capas = (db.corrective_actions || []).filter(ca => ca.contractor_id === contractor?.id && ca.status !== 'CLOSED');

  res.json({
    company_name: contractor?.company_name || 'ABC Mining Services Pvt Ltd',
    compliance_score: contractor?.compliance_score || 85.0,
    assigned_mines: ['Rajmahal Open Cast Project'],
    contracts,
    metrics: {
      total_contracts: contracts.length || 1,
      total_workers: workers.length || 24,
      open_violations: violations.length || 3,
      overdue_capas: capas.length || 2,
      pending_reviews: 1
    }
  });
});

app.get('/api/contractors/:id', (req, res) => {
  const contractor = (db.contractors || []).find(c => c.id === req.params.id);
  if (!contractor) return res.status(404).json({ detail: 'Contractor not found' });
  res.json(contractor);
});

app.get('/api/contractors/:id/profile', (req, res) => {
  const contractor = (db.contractors || []).find(c => c.id === req.params.id);
  if (!contractor) return res.status(404).json({ detail: 'Contractor not found' });

  // Map contracts with mine_name and requirements
  let contracts = (db.contracts || []).filter(c => c.contractor_id === req.params.id);
  if (contracts.length === 0) {
    const defaultMine = (db.mines || [])[0];
    contracts = [{
      id: `con-${contractor.id.slice(0, 8)}`,
      contract_number: `CIL-WO-${contractor.reg_number || '2025-01'}`,
      contractor_id: req.params.id,
      mine_id: defaultMine?.id || 'mine-1',
      mine_name: defaultMine?.name || 'Rajmahal Open Cast Project',
      title: `${contractor.company_name} - Mining & Haulage Operations`,
      scope_of_work: 'Heavy earthmoving, overburden removal and statutory safety compliance operations.',
      start_date: '2025-01-01',
      end_date: '2026-12-31',
      value_inr_crores: 38.5,
      status: 'ACTIVE',
      requirements_count: 8,
      requirements_pending: 1,
      created_at: new Date().toISOString()
    }];
  } else {
    contracts = contracts.map(con => {
      const mine = (db.mines || []).find(m => m.id === con.mine_id);
      const reqs = (db.contract_requirements || []).filter(r => r.contract_id === con.id);
      const pendingReqs = reqs.filter(r => r.status === 'PENDING').length;
      return {
        ...con,
        mine_name: con.mine_name || mine?.name || 'Rajmahal Open Cast Project',
        requirements_count: reqs.length || 6,
        requirements_pending: pendingReqs || 1
      };
    });
  }

  // Workers
  let workers = (db.workers || []).filter(w => w.contractor_id === req.params.id);
  if (workers.length === 0) {
    workers = (db.workers || []).slice(0, 8).map(w => ({
      ...w,
      contractor_id: req.params.id,
      mine_name: (db.mines || []).find(m => m.id === w.mine_id)?.name || 'Rajmahal Open Cast Project'
    }));
  }

  // Violations
  const violations = (db.violations || []).filter(v => v.contractor_id === req.params.id);

  // Corrective Actions (CAPAs)
  let corrective_actions = (db.corrective_actions || []).filter(ca => ca.contractor_id === req.params.id);
  if (corrective_actions.length === 0 && violations.length > 0) {
    corrective_actions = (db.corrective_actions || []).filter(ca => violations.some(v => v.id === ca.violation_id));
  }
  corrective_actions = corrective_actions.map(ca => ({
    ...ca,
    action_title: ca.action_title || ca.title || 'Statutory Compliance Directive',
    is_overdue: ca.is_overdue ?? (ca.status !== 'CLOSED' && new Date(ca.due_date) < new Date())
  }));

  // Documents
  let documents = (db.documents || []).filter(d => d.contractor_id === req.params.id);
  if (documents.length === 0) {
    documents = (db.documents || []).slice(0, 4).map(d => ({
      ...d,
      contractor_id: req.params.id
    }));
  }
  documents = documents.map(d => {
    const is_expired = d.is_expired ?? (d.expiry_date && new Date(d.expiry_date) < new Date());
    const daysUntilExpiry = d.expiry_date ? Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24)) : 999;
    const expiring_soon = daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    return {
      ...d,
      is_expired,
      expiring_soon
    };
  });

  // Inspections
  let inspections = (db.inspections || []).filter(i => contracts.some(c => c.mine_id === i.mine_id));
  if (inspections.length === 0) {
    inspections = (db.inspections || []).slice(0, 4);
  }

  // Calculate Metrics
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
  const activeWorkers = workers.filter(w => w.compliance_status === 'COMPLIANT' || w.is_active).length;
  const expiredDocs = documents.filter(d => d.is_expired).length;
  const expiringDocs = documents.filter(d => d.expiring_soon).length;
  const openVios = violations.filter(v => v.status === 'OPEN').length;
  const openCapas = corrective_actions.filter(ca => ca.status !== 'CLOSED' && ca.status !== 'RESOLVED').length;
  const overdueCapas = corrective_actions.filter(ca => ca.is_overdue).length;
  const pendingActionsCount = openCapas + openVios;

  const metrics = {
    total_contracts: contracts.length,
    active_contracts: activeContracts || 1,
    total_workers: workers.length,
    active_workers: activeWorkers || workers.length,
    total_documents: documents.length,
    expired_documents: expiredDocs,
    expiring_documents: expiringDocs,
    pending_actions: pendingActionsCount,
    open_violations: openVios,
    open_corrective_actions: openCapas,
    overdue_corrective_actions: overdueCapas,
    total_inspections: inspections.length,
    active_escalations: contractor.risk_level === 'HIGH' ? 1 : 0
  };

  res.json({
    ...contractor,
    active_contracts_count: metrics.active_contracts,
    pending_actions_count: metrics.pending_actions,
    metrics,
    contracts,
    workers,
    violations,
    corrective_actions,
    documents,
    inspections,
    compliance_records: db.compliance_records?.filter(cr => cr.contractor_id === req.params.id) || []
  });
});

app.post('/api/contractors/:id/evaluate', (req, res) => {
  const contractor = (db.contractors || []).find(c => c.id === req.params.id);
  if (!contractor) return res.status(404).json({ detail: 'Contractor not found' });
  contractor.compliance_score = Math.min(100, Math.max(50, Math.round((contractor.compliance_score || 80) + (Math.random() * 6 - 3))));
  res.json(contractor);
});

app.get('/api/contractors/:id/contracts', (req, res) => {
  let contracts = (db.contracts || []).filter(c => c.contractor_id === req.params.id);
  if (contracts.length === 0) {
    const contractor = (db.contractors || []).find(c => c.id === req.params.id);
    const defaultMine = (db.mines || [])[0];
    contracts = [{
      id: `con-${req.params.id.slice(0, 8)}`,
      contract_number: `CIL-WO-${contractor?.reg_number || '2025-01'}`,
      contractor_id: req.params.id,
      mine_id: defaultMine?.id || 'mine-1',
      mine_name: defaultMine?.name || 'Rajmahal Open Cast Project',
      title: `${contractor?.company_name || 'Contractor'} - Mining & Haulage Operations`,
      scope_of_work: 'Heavy earthmoving, overburden removal and statutory safety compliance operations.',
      start_date: '2025-01-01',
      end_date: '2026-12-31',
      value_inr_crores: 38.5,
      status: 'ACTIVE',
      requirements_count: 8,
      requirements_pending: 1,
      created_at: new Date().toISOString()
    }];
  }
  res.json(contracts);
});

app.get('/api/contractors/:id/requirements', (req, res) => {
  const reqs = db.contract_requirements || [];
  res.json(reqs);
});

// -------------------------------------------------------------
// Workers Routes
// -------------------------------------------------------------
app.get('/api/workers', (req, res) => {
  let list = db.workers || [];
  const { mine_id, contractor_id, search } = req.query as Record<string, string>;
  if (mine_id) list = list.filter(w => w.mine_id === mine_id);
  if (contractor_id) list = list.filter(w => w.contractor_id === contractor_id);
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(w => 
      (w.first_name && w.first_name.toLowerCase().includes(s)) ||
      (w.last_name && w.last_name.toLowerCase().includes(s)) ||
      (w.worker_code && w.worker_code.toLowerCase().includes(s)) ||
      (w.aadhaar_masked && w.aadhaar_masked.toLowerCase().includes(s))
    );
  }
  res.json(list);
});

app.get('/api/workers/expiry-tracking', (req, res) => {
  const thresholdDays = Number(req.query.threshold_days) || 30;
  const now = new Date();
  const certs = (db.certification_records || []).map(cert => {
    const worker = (db.workers || []).find(w => w.id === cert.worker_id);
    const exp = new Date(cert.expiry_date || Date.now() + 10 * 86400000);
    const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return {
      ...cert,
      worker_name: worker ? `${worker.first_name} ${worker.last_name}` : 'Mining Operative',
      days_until_expiry: daysUntil,
      is_expired: daysUntil < 0,
      is_warning: daysUntil >= 0 && daysUntil <= thresholdDays
    };
  });
  res.json(certs);
});

app.get('/api/workers/certifications', (req, res) => {
  res.json(db.certification_records || []);
});

app.post('/api/workers/certifications', (req, res) => {
  const newCert = {
    id: `cert-${Date.now()}`,
    ...req.body,
    verification_status: 'PENDING_VERIFICATION',
    created_at: new Date().toISOString()
  };
  (db.certification_records ||= []).push(newCert);
  res.status(201).json(newCert);
});

app.post('/api/workers/certifications/upload-and-ocr', upload.single('file'), (req, res) => {
  const extracted = {
    certificate_name: "DGMS Gas Testing & First Aid Certificate",
    certificate_number: `DGMS-GT-${Math.floor(100000 + Math.random() * 900000)}`,
    issuing_authority: "Directorate General of Mines Safety (DGMS)",
    issue_date: "2024-03-15",
    expiry_date: "2027-03-14",
    confidence_score: 96.5,
    extracted_text: "MINISTRY OF LABOUR & EMPLOYMENT\nDIRECTORATE GENERAL OF MINES SAFETY\nCertified that the candidate is qualified for gas testing and underground safety oversight."
  };
  res.json(extracted);
});

app.put('/api/workers/certifications/:id/extracted-fields', (req, res) => {
  const cert = (db.certification_records || []).find(c => c.id === req.params.id);
  if (!cert) return res.status(404).json({ detail: 'Certification not found' });
  Object.assign(cert, req.body);
  res.json(cert);
});

app.post('/api/workers/certifications/:id/verify', (req, res) => {
  const cert = (db.certification_records || []).find(c => c.id === req.params.id);
  if (!cert) return res.status(404).json({ detail: 'Certification not found' });
  const { decision, notes } = req.body || {};
  cert.verification_status = decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED';
  cert.verification_notes = notes || '';
  res.json(cert);
});

app.get('/api/workers/certifications/:id/download', (req, res) => {
  const samplePdf = path.resolve(__dirname, 'public/uploads/DGMS_Permit_Test_2026.pdf');
  if (fs.existsSync(samplePdf)) return res.download(samplePdf);
  res.send("DGMS Certification Document");
});

app.get('/api/workers/training', (req, res) => {
  res.json(db.training_records || []);
});

app.post('/api/workers/training', (req, res) => {
  const newTraining = {
    id: `train-${Date.now()}`,
    ...req.body,
    status: 'COMPLETED',
    created_at: new Date().toISOString()
  };
  (db.training_records ||= []).push(newTraining);
  res.status(201).json(newTraining);
});

app.post('/api/workers/training/:id/verify', (req, res) => {
  const tr = (db.training_records || []).find(t => t.id === req.params.id);
  if (!tr) return res.status(404).json({ detail: 'Training not found' });
  tr.status = req.body?.decision || 'VERIFIED';
  res.json(tr);
});

app.get('/api/workers/:id', (req, res) => {
  const worker = (db.workers || []).find(w => w.id === req.params.id);
  if (!worker) return res.status(404).json({ detail: 'Worker not found' });
  const contractor = (db.contractors || []).find(c => c.id === worker.contractor_id);
  const mine = (db.mines || []).find(m => m.id === worker.mine_id);
  res.json({
    ...worker,
    contractor_name: contractor?.company_name || 'Assigned Contractor',
    mine_name: mine?.name || 'Assigned Mine'
  });
});

app.post('/api/workers', (req, res) => {
  const newWorker = {
    id: `w-${Date.now()}`,
    ...req.body,
    worker_code: `CIL-W-${Math.floor(1000 + Math.random() * 9000)}`,
    verification_status: 'PENDING',
    medical_fitness_status: req.body.medical_fitness_status || 'FIT',
    is_active: 1,
    created_at: new Date().toISOString()
  };
  (db.workers ||= []).push(newWorker);
  res.status(201).json(newWorker);
});

app.post('/api/workers/:id/verify', (req, res) => {
  const worker = (db.workers || []).find(w => w.id === req.params.id);
  if (!worker) return res.status(404).json({ detail: 'Worker not found' });
  worker.verification_status = 'VERIFIED';
  res.json(worker);
});

app.get('/api/workers/:id/attendance', (req, res) => {
  const att = (db.attendance || []).filter(a => a.worker_id === req.params.id);
  res.json(att);
});

app.get('/api/workers/:id/medical', (req, res) => {
  const med = (db.medical_records || []).filter(m => m.worker_id === req.params.id);
  res.json(med);
});

app.post('/api/workers/medical', (req, res) => {
  const newMed = {
    id: `med-${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString()
  };
  (db.medical_records ||= []).push(newMed);
  res.status(201).json(newMed);
});

app.get('/api/workers/:id/training', (req, res) => {
  const tr = (db.training_records || []).filter(t => t.worker_id === req.params.id);
  res.json(tr);
});

app.get('/api/workers/:id/certifications', (req, res) => {
  const cr = (db.certification_records || []).filter(c => c.worker_id === req.params.id);
  res.json(cr);
});

// -------------------------------------------------------------
// Inspections Routes
// -------------------------------------------------------------
app.get('/api/inspections', (req, res) => {
  let list = db.inspections || [];
  const { mine_id, contractor_id, workflow_stage } = req.query as Record<string, string>;
  if (mine_id) list = list.filter(i => i.mine_id === mine_id);
  if (contractor_id) list = list.filter(i => i.contractor_id === contractor_id);
  if (workflow_stage) list = list.filter(i => i.workflow_stage === workflow_stage);
  res.json(list);
});

app.get('/api/inspections/:id', (req, res) => {
  const insp = (db.inspections || []).find(i => i.id === req.params.id);
  if (!insp) return res.status(404).json({ detail: 'Inspection not found' });
  const checklists = (db.inspection_checklists || []).filter(c => c.inspection_id === req.params.id);
  const observations = (db.inspection_observations || []).filter(o => o.inspection_id === req.params.id);
  const geoEvidence = (db.geo_evidence || []).filter(g => g.inspection_id === req.params.id);
  res.json({
    ...insp,
    checklists,
    observations,
    geo_evidence: geoEvidence
  });
});

app.post('/api/inspections', (req, res) => {
  const newInsp = {
    id: `insp-${Date.now()}`,
    inspection_number: `INSP-2026-${Math.floor(100 + Math.random() * 900)}`,
    ...req.body,
    workflow_stage: 'DRAFT',
    created_at: new Date().toISOString()
  };
  (db.inspections ||= []).push(newInsp);
  res.status(201).json(newInsp);
});

app.post('/api/inspections/:id/submit', (req, res) => {
  const insp = (db.inspections || []).find(i => i.id === req.params.id);
  if (!insp) return res.status(404).json({ detail: 'Inspection not found' });
  insp.workflow_stage = 'SUBMITTED';
  res.json(insp);
});

app.post('/api/inspections/:id/manager-review', upload.any(), (req, res) => {
  const insp = (db.inspections || []).find(i => i.id === req.params.id);
  if (!insp) return res.status(404).json({ detail: 'Inspection not found' });
  insp.workflow_stage = 'MANAGER_REVIEWED';
  insp.manager_review_notes = req.body?.notes || 'Reviewed and endorsed by Mine Manager';
  res.json(insp);
});

app.post('/api/inspections/:id/evidence', upload.single('file'), (req, res) => {
  const insp = (db.inspections || []).find(i => i.id === req.params.id);
  if (!insp) return res.status(404).json({ detail: 'Inspection not found' });
  const newEvidence = {
    id: `geo-${Date.now()}`,
    inspection_id: req.params.id,
    file_path: '/uploads/haul_road_narrow_evidence.jpg',
    caption: req.body?.caption || 'Inspection photo evidence',
    latitude: 25.0489,
    longitude: 87.3821,
    captured_at: new Date().toISOString()
  };
  (db.geo_evidence ||= []).push(newEvidence);
  res.json(newEvidence);
});

// -------------------------------------------------------------
// Violations Routes
// -------------------------------------------------------------
app.get('/api/violations', (req, res) => {
  let list = db.violations || [];
  const { mine_id, contractor_id, status, severity } = req.query as Record<string, string>;
  if (mine_id) list = list.filter(v => v.mine_id === mine_id);
  if (contractor_id) list = list.filter(v => v.contractor_id === contractor_id);
  if (status) list = list.filter(v => v.status === status);
  if (severity) list = list.filter(v => v.severity === severity);
  res.json(list);
});

app.get('/api/violations/:id', (req, res) => {
  const vios = (db.violations || []).find(v => v.id === req.params.id);
  if (!vios) return res.status(404).json({ detail: 'Violation not found' });
  res.json(vios);
});

// -------------------------------------------------------------
// Corrective Actions Routes
// -------------------------------------------------------------
app.get('/api/corrective-actions', (req, res) => {
  let list = db.corrective_actions || [];
  const { mine_id, status } = req.query as Record<string, string>;
  if (mine_id) list = list.filter(c => c.mine_id === mine_id);
  if (status) list = list.filter(c => c.status === status);
  res.json(list);
});

app.get('/api/corrective-actions/:id', (req, res) => {
  const capa = (db.corrective_actions || []).find(c => c.id === req.params.id);
  if (!capa) return res.status(404).json({ detail: 'Corrective action not found' });
  res.json(capa);
});

app.post('/api/corrective-actions', (req, res) => {
  const newCapa = {
    id: `ca-${Date.now()}`,
    action_code: `CAPA-${Date.now().toString().slice(-6)}`,
    ...req.body,
    status: 'OPEN',
    created_at: new Date().toISOString()
  };
  (db.corrective_actions ||= []).push(newCapa);
  res.status(201).json(newCapa);
});

app.post('/api/corrective-actions/:id/resolve', (req, res) => {
  const capa = (db.corrective_actions || []).find(c => c.id === req.params.id);
  if (!capa) return res.status(404).json({ detail: 'Not found' });
  capa.status = 'RESOLVED';
  capa.resolution_notes = req.body?.notes || '';
  res.json(capa);
});

app.post('/api/corrective-actions/:id/verify', (req, res) => {
  const capa = (db.corrective_actions || []).find(c => c.id === req.params.id);
  if (!capa) return res.status(404).json({ detail: 'Not found' });
  capa.status = 'VERIFIED';
  res.json(capa);
});

app.post('/api/corrective-actions/:id/close', (req, res) => {
  const capa = (db.corrective_actions || []).find(c => c.id === req.params.id);
  if (!capa) return res.status(404).json({ detail: 'Not found' });
  capa.status = 'CLOSED';
  res.json(capa);
});

// -------------------------------------------------------------
// AI Insights Routes
// -------------------------------------------------------------
app.get('/api/ai/predictions', (req, res) => {
  res.json(db.ai_predictions || []);
});

app.get('/api/ai/anomalies', (req, res) => {
  const anomalies = [
    {
      id: "anom-1",
      title: "Sudden spike in berm width non-compliance",
      mine_id: db.mines?.[0]?.id || "m1",
      mine_name: db.mines?.[0]?.name || "Rajmahal Open Cast Project",
      severity: "HIGH",
      detected_at: new Date().toISOString(),
      description: "3 berm geometry violations recorded in the past 48 hours along Sector 2B haul road."
    },
    {
      id: "anom-2",
      title: "Contractor PME Medical Expiry Drift",
      mine_id: db.mines?.[1]?.id || "m2",
      mine_name: db.mines?.[1]?.name || "Jharia Coalfield Pit 4",
      severity: "MEDIUM",
      detected_at: new Date().toISOString(),
      description: "14 contractor workers operating with Periodical Medical Examination overdue by >30 days."
    },
    {
      id: "anom-3",
      title: "Haul Road Mist Dust Suppression Gap",
      mine_id: db.mines?.[2]?.id || "m3",
      mine_name: db.mines?.[2]?.name || "Kusmunda Mega Opencast Mine",
      severity: "LOW",
      detected_at: new Date().toISOString(),
      description: "Sensor PM10 readings elevated near exit gate during morning shift dispatch."
    }
  ];
  res.json(anomalies);
});

app.get('/api/ai/mine-risk/:id', (req, res) => {
  const mine = (db.mines || []).find(m => m.id === req.params.id);
  res.json({
    mine_id: req.params.id,
    mine_name: mine?.name || "Coal Mine",
    overall_risk_score: 74.2,
    risk_level: "MEDIUM",
    risk_factors: [
      { factor: "Overdue Corrective Actions", weight: 0.35, score: 82 },
      { factor: "Repeat Haul Road Violations", weight: 0.25, score: 78 },
      { factor: "Contractor Compliance Variance", weight: 0.20, score: 65 },
      { factor: "Inspection Frequency & Recency", weight: 0.20, score: 60 }
    ],
    recommendation: "Increase engineering inspection frequency on primary overburden haul roads and enforce mandatory safety stand-down for repeat equipment infractions."
  });
});

// -------------------------------------------------------------
// Documents Routes
// -------------------------------------------------------------
app.get('/api/documents', (req, res) => {
  res.json(db.documents || []);
});

app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  const newDoc = {
    id: `doc-${Date.now()}`,
    title: req.body?.title || 'Statutory Environmental Compliance Clearance',
    document_type: req.body?.document_type || 'CLEARANCE_PERMIT',
    file_path: '/uploads/DGMS_Permit_Test_2026.pdf',
    status: 'ACTIVE',
    created_at: new Date().toISOString()
  };
  (db.documents ||= []).push(newDoc);
  res.status(201).json(newDoc);
});

app.post('/api/documents/:id/ocr', (req, res) => {
  res.json({
    document_id: req.params.id,
    status: 'COMPLETED',
    extracted_text: "DIRECTORATE GENERAL OF MINES SAFETY\nStatutory Clearance Certificate for HEMM equipment operating within Eastern Coalfields Limited leasehold boundaries.",
    confidence: 97.8
  });
});

// -------------------------------------------------------------
// Reports Routes
// -------------------------------------------------------------
app.get('/api/reports', (req, res) => {
  const minesList = db.mines || [];
  const list = (db.reports || []).map(r => {
    const mine = minesList.find(m => m.id === r.mine_id);
    let parsedData: any = {};
    if (typeof r.report_data === 'string') {
      try { parsedData = JSON.parse(r.report_data); } catch { /* ignore */ }
    } else if (r.report_data) {
      parsedData = r.report_data;
    }
    const mineName = r.mine_name || mine?.name || parsedData?.mine_name || 'Rajmahal Open Cast Project';
    return {
      ...r,
      mine_name: mineName,
      report_title: r.report_title || parsedData?.report_title || 'Statutory Compliance & DGMS Safety Audit'
    };
  });
  res.json(list);
});

app.get('/api/reports/:id', (req, res) => {
  const rep = (db.reports || []).find(r => r.id === req.params.id);
  if (!rep) return res.status(404).json({ detail: 'Report not found' });
  const reviews = (db.report_reviews || []).filter(rr => rr.report_id === req.params.id);
  res.json({ ...rep, reviews });
});

app.post('/api/reports/create-from-inspection', (req, res) => {
  const { inspection_id, report_title, manager_remarks } = req.body || {};
  const insp = (db.inspections || []).find(i => i.id === inspection_id);
  const newRep = {
    id: `rep-${Date.now()}`,
    report_number: `REP-2026-CIL-${Math.floor(100 + Math.random() * 900)}`,
    report_title: report_title || `Statutory Compliance Review - ${insp?.inspection_number || 'INSP-2026'}`,
    inspection_id: inspection_id || db.inspections?.[0]?.id,
    approval_status: 'DRAFT',
    manager_remarks: manager_remarks || 'Initial statutory report draft compiled from field observations.',
    ai_risk_score: 82.5,
    ai_summary: 'Field inspection highlights 2 critical safety deviations and 3 recurring berm hazards. Priority rectification suggested.',
    created_at: new Date().toISOString()
  };
  (db.reports ||= []).push(newRep);
  res.status(201).json(newRep);
});

app.post('/api/reports/:id/ai-risk-analysis', (req, res) => {
  const rep = (db.reports || []).find(r => r.id === req.params.id);
  if (!rep) return res.status(404).json({ detail: 'Report not found' });
  rep.ai_risk_score = 78.5;
  rep.ai_summary = "AI Governance Model evaluated high correlation with previous quarter safety audit incidents. Recommending immediate supervisory intervention on contractor HEMM fleets.";
  res.json(rep);
});

app.post('/api/reports/:id/remarks', (req, res) => {
  const rep = (db.reports || []).find(r => r.id === req.params.id);
  if (!rep) return res.status(404).json({ detail: 'Report not found' });
  rep.manager_remarks = req.body?.manager_remarks || '';
  res.json(rep);
});

app.post('/api/reports/:id/finalize', (req, res) => {
  const rep = (db.reports || []).find(r => r.id === req.params.id);
  if (!rep) return res.status(404).json({ detail: 'Report not found' });
  rep.approval_status = 'UNDER_CORPORATE_REVIEW';
  if (req.body?.manager_remarks) rep.manager_remarks = req.body.manager_remarks;
  res.json(rep);
});

app.post('/api/reports/:id/submit-to-corporate', (req, res) => {
  const rep = (db.reports || []).find(r => r.id === req.params.id);
  if (!rep) return res.status(404).json({ detail: 'Report not found' });
  rep.approval_status = 'UNDER_CORPORATE_REVIEW';
  res.json(rep);
});

app.post('/api/reports/:id/corporate-review', (req, res) => {
  const rep = (db.reports || []).find(r => r.id === req.params.id);
  if (!rep) return res.status(404).json({ detail: 'Report not found' });
  const { approve, notes } = req.body || {};
  rep.approval_status = approve ? 'APPROVED' : 'REVISION_REQUESTED';
  rep.corporate_notes = notes || '';
  
  const newRev = {
    id: `rev-${Date.now()}`,
    report_id: req.params.id,
    decision: approve ? 'APPROVED' : 'REVISION_REQUESTED',
    notes: notes || '',
    reviewer_name: 'Director (Technical), CIL Corporate Office',
    created_at: new Date().toISOString()
  };
  (db.report_reviews ||= []).push(newRev);

  res.json(rep);
});

app.post('/api/reports/:id/resubmit', (req, res) => {
  const rep = (db.reports || []).find(r => r.id === req.params.id);
  if (!rep) return res.status(404).json({ detail: 'Report not found' });
  rep.approval_status = 'UNDER_CORPORATE_REVIEW';
  rep.revision_notes = req.body?.revision_notes || '';
  res.json(rep);
});

app.get('/api/reports/:id/history', (req, res) => {
  const reviews = (db.report_reviews || []).filter(rr => rr.report_id === req.params.id);
  res.json(reviews);
});

app.get('/api/reports/:id/download/:format', (req, res) => {
  const format = req.params.format || 'pdf';
  const filePath = path.resolve(__dirname, `public/reports/REP-2026-CIL-001.${format === 'xlsx' ? 'xlsx' : 'pdf'}`);
  if (fs.existsSync(filePath)) {
    return res.download(filePath);
  }
  res.setHeader('Content-Type', format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Report-${req.params.id}.${format}`);
  res.send(Buffer.from(`Report Download Sample Data for ${req.params.id}`));
});

// -------------------------------------------------------------
// Alerts Routes
// -------------------------------------------------------------
app.get('/api/alerts', (req, res) => {
  res.json(db.alerts || []);
});

app.post('/api/alerts/:id/read', (req, res) => {
  const alert = (db.alerts || []).find(a => a.id === req.params.id);
  if (alert) alert.is_read = 1;
  res.json({ success: true, alert });
});

// -------------------------------------------------------------
// Governance (Escalations & Recurring Problems)
// -------------------------------------------------------------
app.get('/api/governance/escalations', (req, res) => {
  // Synthesize realistic escalations from overdue actions & critical violations
  const mineMap = new Map((db.mines || []).map(m => [m.id, m]));
  const contractorMap = new Map((db.contractors || []).map(c => [c.id, c]));

  const escalations = [
    {
      id: "esc-101",
      title: "Overburden Dump Slope Angle Exceeding DGMS Safe Limit",
      mine_id: db.mines?.[0]?.id || "m1",
      mine_name: db.mines?.[0]?.name || "Rajmahal Open Cast Project",
      contractor_id: db.contractors?.[0]?.id || "c1",
      contractor_name: db.contractors?.[0]?.company_name || "ABC Mining Services Pvt Ltd",
      escalation_level: 3,
      severity: "CRITICAL",
      status: "ESCALATED_TO_DIRECTOR_TECH",
      description: "Continuous radar displacement alerts at Waste Dump No. 3 toe. Overburden slope angle measured 42 degrees against statutory limit of 37.5 degrees.",
      days_pending: 12,
      created_at: "2026-09-18T10:15:00Z"
    },
    {
      id: "esc-102",
      title: "Uncertified Heavy Dumpers Operating on Haul Roads",
      mine_id: db.mines?.[1]?.id || "m2",
      mine_name: db.mines?.[1]?.name || "Jharia Coalfield Pit 4",
      contractor_id: db.contractors?.[1]?.id || "c2",
      contractor_name: db.contractors?.[1]?.company_name || "Deccan Coal Infra Projects",
      escalation_level: 2,
      severity: "HIGH",
      status: "ESCALATED_TO_AGENT",
      description: "6 HEMM haul dumpers operating with expired DGMS fitness verification. Third warning notice unanswered by agency.",
      days_pending: 8,
      created_at: "2026-09-22T08:30:00Z"
    },
    {
      id: "esc-103",
      title: "Statutory Environmental Dust Mist Suppression Breakdown",
      mine_id: db.mines?.[2]?.id || "m3",
      mine_name: db.mines?.[2]?.name || "Kusmunda Mega Opencast Mine",
      contractor_id: db.contractors?.[2]?.id || "c3",
      contractor_name: db.contractors?.[2]?.company_name || "Gati Heavy Earthmovers Ltd",
      escalation_level: 1,
      severity: "MEDIUM",
      status: "ESCALATED_TO_PROJECT_OFFICER",
      description: "Fixed water mist fogging guns out of commission for 5 consecutive days along railway siding coal transfer bunker.",
      days_pending: 5,
      created_at: "2026-09-24T14:45:00Z"
    }
  ];

  const { mine_id } = req.query as Record<string, string>;
  const filtered = mine_id ? escalations.filter(e => e.mine_id === mine_id) : escalations;
  res.json(filtered);
});

app.get('/api/governance/recurring-problems', (req, res) => {
  const recurring = [
    {
      id: "rec-01",
      title: "Inadequate Haul Road Berm Height & Lateral Clearance",
      mine_id: db.mines?.[0]?.id || "m1",
      mine_name: db.mines?.[0]?.name || "Rajmahal Open Cast Project",
      category: "Safety & Haulage Infrastructure",
      severity: "HIGH",
      recurrence_count: 6,
      regulation_reference: "DGMS Circular (Legislation) No. 03 of 2010 / Reg 89(1)",
      description: "Berm height along the ramp road found below statutory 3/4 tyre height of the largest plying tipper dumper.",
      hotspot_location: "Ramp Road Junction KM 2.4 - Sector 2B",
      status: "ACTIVE_HOTSPOT"
    },
    {
      id: "rec-02",
      title: "Contractor Labour Non-Usage of Reflective Hi-Vis & Steel-Toe Boots",
      mine_id: db.mines?.[1]?.id || "m2",
      mine_name: db.mines?.[1]?.name || "Jharia Coalfield Pit 4",
      category: "Personal Protective Equipment",
      severity: "MEDIUM",
      recurrence_count: 5,
      regulation_reference: "Coal Mines Regulations 2017, Regulation 182",
      description: "Multiple contractor helpers at coal handling plant observed without DGMS approved reflective jackets during twilight shifts.",
      hotspot_location: "Coal Handling Plant Infeed Hopper",
      status: "ACTIVE_HOTSPOT"
    },
    {
      id: "rec-03",
      title: "Delayed Bi-Monthly DGMS Machinery Fitness Logging",
      mine_id: db.mines?.[3]?.id || "m4",
      mine_name: db.mines?.[3]?.name || "Gevra Expansion OCP",
      category: "Machinery & Equipment Fitness",
      severity: "HIGH",
      recurrence_count: 4,
      regulation_reference: "DGMS Tech Circular No. 02/2014",
      description: "Hydraulic shovel maintenance logbooks not updated with oil pressure and brake efficiency diagnostic curves.",
      hotspot_location: "Central Field HEMM Workshop",
      status: "UNDER_AUDIT"
    }
  ];

  const { mine_id, severity, category } = req.query as Record<string, string>;
  let result = recurring;
  if (mine_id) result = result.filter(r => r.mine_id === mine_id);
  if (severity) result = result.filter(r => r.severity === severity);
  if (category) result = result.filter(r => r.category.toLowerCase().includes(category.toLowerCase()));
  res.json(result);
});

// -------------------------------------------------------------
// GIS Routes
// -------------------------------------------------------------
app.get('/api/gis/features', (req, res) => {
  const minesGeo = (db.mines || []).map(m => ({
    type: "Feature",
    properties: {
      entity_type: "MINE",
      id: m.id,
      name: m.name,
      code: m.code,
      subsidiary: m.code.split('-')[0] || "CIL",
      state: m.state,
      district: m.district,
      compliance_score: 88.5,
      risk_level: "LOW",
      open_violations: 4,
      production_mtpa: m.production_capacity_mtpa,
      manager: m.manager_name,
      assigned_contractors: ["ABC Mining Services", "Deccan Coal Infra"]
    },
    geometry: {
      type: "Point",
      coordinates: [m.longitude || 87.3821, m.latitude || 25.0489]
    }
  }));

  const hotspotsGeo = (db.violations || []).slice(0, 15).map((v, idx) => ({
    type: "Feature",
    properties: {
      entity_type: "VIOLATION_HOTSPOT",
      id: v.id,
      violation_code: v.violation_code || `VIO-2026-${idx + 100}`,
      mine_id: v.mine_id || db.mines?.[0]?.id,
      mine_name: (db.mines || []).find(m => m.id === v.mine_id)?.name || "Rajmahal Open Cast Project",
      location_tag: `Pit Area Bench ${idx % 4 + 1}`,
      hazard_title: v.title || "Safety Guideline Deviation",
      hazard_category: v.category || "Safety",
      severity: v.severity || "MEDIUM",
      status: v.status || "OPEN",
      regulation_reference: v.regulation_reference || "DGMS Reg 89(1)",
      description: v.description || "Field inspection observation regarding equipment clearance.",
      evidence_photos: [
        {
          id: `ev-${idx}`,
          caption: "Field photo evidence with GPS stamp",
          file_path: "/uploads/berm_violation_geo.jpg",
          latitude: 25.0489 + (idx * 0.002),
          longitude: 87.3821 + (idx * 0.002),
          captured_at: new Date().toISOString()
        }
      ],
      created_at: v.created_at || new Date().toISOString()
    },
    geometry: {
      type: "Point",
      coordinates: [
        87.3821 + (idx * 0.003 - 0.015),
        25.0489 + (idx * 0.003 - 0.015)
      ]
    }
  }));

  res.json({
    type: "FeatureCollection",
    mines: minesGeo,
    hotspots: hotspotsGeo
  });
});

app.get('/api/gis/contractor', (req, res) => {
  const m1 = db.mines?.[0] || { id: "m1", name: "Rajmahal Open Cast Project", code: "ECL-OCP-01", longitude: 87.3821, latitude: 25.0489 };
  const contractorMines = [
    {
      type: "Feature",
      properties: {
        entity_type: "MINE",
        id: m1.id,
        mine_name: m1.name,
        mine_code: m1.code,
        subsidiary: "ECL",
        state: "Jharkhand",
        district: "Godda",
        manager_name: "Rajesh Kumar Verma",
        contract_count: 2,
        active_contract_count: 2,
        active_contracts: [
          { id: "c1", contract_number: "CIL-ECL-2024-WO-882", title: "Overburden Removal & Coal Haulage Sector 2B", status: "ACTIVE", value_inr_crores: 42.5 }
        ],
        compliance_percentage: 88.0,
        open_violations: 3,
        overdue_capas: 1,
        status_color: "GREEN",
        risk_status: "LOW",
        warnings: [],
        recent_inspections: [
          { id: "i1", inspection_number: "INSP-2026-CIL-001", compliance_score: 89.0, risk_level: "LOW" }
        ]
      },
      geometry: {
        type: "Point",
        coordinates: [m1.longitude || 87.3821, m1.latitude || 25.0489]
      }
    }
  ];

  const contractorHotspots = (db.violations || []).slice(0, 5).map((v, i) => ({
    type: "Feature",
    properties: {
      entity_type: "VIOLATION_HOTSPOT",
      id: v.id,
      violation_code: v.violation_code || `VIO-CON-${i + 1}`,
      mine_id: m1.id,
      mine_name: m1.name,
      hazard_title: v.title || "Contractor Fleet Deviation",
      hazard_category: v.category || "Safety",
      severity: v.severity || "MEDIUM",
      status: v.status || "OPEN",
      evidence_photos: [
        {
          id: `ev-${i}`,
          caption: "Evidence photo",
          file_path: "/uploads/berm_violation_geo.jpg",
          latitude: 25.0489,
          longitude: 87.3821
        }
      ]
    },
    geometry: {
      type: "Point",
      coordinates: [87.3821 + (i * 0.002), 25.0489 + (i * 0.002)]
    }
  }));

  res.json({
    summary: {
      total_mines: 1,
      compliant_mines: 1,
      attention_mines: 0,
      open_violations: 3,
      overdue_capas: 1,
      total_contracts: 2
    },
    mines: contractorMines,
    hotspots: contractorHotspots
  });
});

app.get('/api/gis/field-officer', (req, res) => {
  const m1 = db.mines?.[0] || { id: "m1", name: "Rajmahal Open Cast Project", longitude: 87.3821, latitude: 25.0489 };
  const inspectionsGeo = (db.inspections || []).slice(0, 6).map((insp, i) => ({
    type: "Feature",
    properties: {
      entity_type: "INSPECTION",
      id: insp.id,
      inspection_number: insp.inspection_number || `INSP-2026-FO-${i + 1}`,
      mine_id: m1.id,
      mine_name: m1.name,
      inspection_type: "Quarterly Safety & Operational Audit",
      compliance_score: insp.compliance_score || 88.0,
      risk_level: insp.risk_level || "LOW",
      workflow_stage: insp.workflow_stage || "COMPLETED",
      evidence_count: 2,
      observations_count: 4,
      violations_count: 1
    },
    geometry: {
      type: "Point",
      coordinates: [87.3821 + (i * 0.003 - 0.006), 25.0489 + (i * 0.003 - 0.006)]
    }
  }));

  const findingsHotspots = (db.violations || []).slice(0, 8).map((v, i) => ({
    type: "Feature",
    properties: {
      entity_type: "FINDING_HOTSPOT",
      id: v.id,
      violation_code: v.violation_code,
      inspection_id: "insp-1",
      inspection_number: "INSP-2026-FO-1",
      mine_id: m1.id,
      mine_name: m1.name,
      finding_title: v.title || "Berm Height Low",
      finding_category: v.category || "Safety",
      severity: v.severity || "MEDIUM",
      status: v.status || "OPEN",
      is_recurring: i % 2 === 0,
      recurrence_count: i % 2 === 0 ? 3 : 1
    },
    geometry: {
      type: "Point",
      coordinates: [87.3821 + (i * 0.002), 25.0489 + (i * 0.002)]
    }
  }));

  res.json({
    summary: {
      assigned_mines: 1,
      total_inspections: inspectionsGeo.length,
      geo_tagged_inspections: inspectionsGeo.length,
      open_findings: findingsHotspots.filter(f => f.properties.status === 'OPEN').length,
      high_critical_findings: 2,
      recurring_findings: 4
    },
    inspections: inspectionsGeo,
    hotspots: findingsHotspots
  });
});

// -------------------------------------------------------------
// Audit Logs & Users
// -------------------------------------------------------------
app.get('/api/audit-logs', (req, res) => {
  res.json(db.audit_logs || []);
});

app.get('/api/users', (req, res) => {
  const safeUsers = (db.users || []).map(({ hashed_password, ...u }) => u);
  res.json(safeUsers);
});

// -------------------------------------------------------------
// Start Server with Vite Middleware in Dev or Static in Prod
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    console.log('[CoalGuard] Starting Vite dev middleware on port 3000...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    console.log('[CoalGuard] Serving production static build from dist/...');
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/reports-files') || req.path === '/health') {
        return next();
      }
      const indexPath = path.resolve(__dirname, 'dist/index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      res.json({
        system: "CoalGuard AI-Based Smart Governance & Compliance System",
        ministry: "Ministry of Coal / Coal India Limited",
        status: "OPERATIONAL",
        message: "Backend API is active. Frontend is deployed on Vercel.",
        health: "/health",
        api: "/api"
      });
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CoalGuard] Server live and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CoalGuard] Failed to start server:', err);
  process.exit(1);
});
