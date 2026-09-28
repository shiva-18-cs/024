const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('coalguard_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = localStorage.getItem('coalguard_token');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    // Global 401 handler: stale or invalid token → force re-login
    if (res.status === 401) {
      localStorage.removeItem('coalguard_token');
      localStorage.removeItem('coalguard_user');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
    const err = await res.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

async function uploadFile(path: string, formData: FormData): Promise<any> {
  const url = `${API_BASE}${path}`;
  const token = localStorage.getItem('coalguard_token');
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload error' }));
    throw new Error(err.detail || `Upload failed HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const auth = {
  login: (data: { username_or_email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
  switchRole: (roleName: string) =>
    request(`/auth/switch-role/${encodeURIComponent(roleName)}`, { method: 'POST' }),
  demoUsers: () => request('/auth/demo-users'),
};

// Dashboard
export const dashboard = {
  stats: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/dashboard/stats${qs}`);
  },
};

// Mines
export const mines = {
  list: () => request('/mines'),
  get: (id: string) => request(`/mines/${id}`),
  subsidiaries: () => request('/mines/subsidiaries'),
};

// Contractors
export const contractors = {
  list: () => request('/contractors'),
  get: (id: string) => request(`/contractors/${id}`),
  profile: (id: string) => request(`/contractors/${id}/profile`),
  myDashboard: () => request('/contractors/me/dashboard'),
  evaluate: (id: string) => request(`/contractors/${id}/evaluate`),
  contracts: (id: string) => request(`/contractors/${id}/contracts`),
  requirements: (id: string) => request(`/contractors/${id}/requirements`),
};

// Workers
export const workers = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/workers${qs}`);
  },
  get: (id: string) => request(`/workers/${id}`),
  create: (data: any) => request('/workers', { method: 'POST', body: JSON.stringify(data) }),
  verify: (id: string, data: any) => request(`/workers/${id}/verify`, { method: 'POST', body: JSON.stringify(data) }),
  attendance: (id: string) => request(`/workers/${id}/attendance`),
  medicals: (id: string) => request(`/workers/${id}/medical`),
  addMedical: (data: any) => request('/workers/medical', { method: 'POST', body: JSON.stringify(data) }),
  trainings: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/workers/training${qs}`);
  },
  workerTrainings: (workerId: string) => request(`/workers/${workerId}/training`),
  addTraining: (data: any) => request('/workers/training', { method: 'POST', body: JSON.stringify(data) }),
  verifyTraining: (id: string, data: { decision: string; notes?: string }) =>
    request(`/workers/training/${id}/verify`, { method: 'POST', body: JSON.stringify(data) }),
  certifications: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/workers/certifications${qs}`);
  },
  getCertification: (id: string) => request(`/workers/certifications/${id}`),
  workerCertifications: (workerId: string) => request(`/workers/${workerId}/certifications`),
  addCertification: (data: any) => request('/workers/certifications', { method: 'POST', body: JSON.stringify(data) }),
  uploadAndOcrCertification: (form: FormData) => uploadFile('/workers/certifications/upload-and-ocr', form),
  updateExtractedFields: (id: string, data: any) =>
    request(`/workers/certifications/${id}/extracted-fields`, { method: 'PUT', body: JSON.stringify(data) }),
  verifyCertification: (id: string, data: { decision: string; notes?: string }) =>
    request(`/workers/certifications/${id}/verify`, { method: 'POST', body: JSON.stringify(data) }),
  expiryTracking: (thresholdDays = 30) => request(`/workers/expiry-tracking?threshold_days=${thresholdDays}`),
  downloadCertificationUrl: (id: string) => `${API_BASE}/workers/certifications/${id}/download`,
};

// Inspections
export const inspections = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/inspections${qs}`);
  },
  get: (id: string) => request(`/inspections/${id}`),
  create: (data: any) => request('/inspections', { method: 'POST', body: JSON.stringify(data) }),
  submit: (id: string) => request(`/inspections/${id}/submit`, { method: 'POST' }),
  managerReview: (id: string, form: FormData) => uploadFile(`/inspections/${id}/manager-review`, form),
  uploadEvidence: (id: string, form: FormData) => uploadFile(`/inspections/${id}/evidence`, form),
};

// Violations
export const violations = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/violations${qs}`);
  },
  get: (id: string) => request(`/violations/${id}`),
};

// Corrective Actions
export const correctiveActions = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/corrective-actions${qs}`);
  },
  get: (id: string) => request(`/corrective-actions/${id}`),
  create: (data: any) => request('/corrective-actions', { method: 'POST', body: JSON.stringify(data) }),
  resolve: (id: string, data: any) =>
    request(`/corrective-actions/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) }),
  verify: (id: string, data: any) =>
    request(`/corrective-actions/${id}/verify`, { method: 'POST', body: JSON.stringify(data) }),
  close: (id: string, data: any) =>
    request(`/corrective-actions/${id}/close`, { method: 'POST', body: JSON.stringify(data) }),
};

// AI Insights
export const aiInsights = {
  predictions: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/ai/predictions${qs}`);
  },
  anomalies: () => request('/ai/anomalies'),
  mineRisk: (id: string) => request(`/ai/mine-risk/${id}`),
};

// Documents
export const documents = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/documents${qs}`);
  },
  upload: (form: FormData) => uploadFile('/documents/upload', form),
  ocr: (id: string) => request(`/documents/${id}/ocr`, { method: 'POST' }),
};

// Reports
export const reports = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/reports${qs}`);
  },
  get: (id: string) => request(`/reports/${id}`),
  createDraft: (data: { inspection_id: string; report_title?: string; manager_remarks?: string }) =>
    request('/reports/create-from-inspection', { method: 'POST', body: JSON.stringify(data) }),
  runAiAnalysis: (id: string) => request(`/reports/${id}/ai-risk-analysis`, { method: 'POST' }),
  saveRemarks: (id: string, manager_remarks: string) =>
    request(`/reports/${id}/remarks`, { method: 'POST', body: JSON.stringify({ manager_remarks }) }),
  finalize: (id: string, manager_remarks?: string) =>
    request(`/reports/${id}/finalize`, { method: 'POST', body: JSON.stringify({ manager_remarks }) }),
  submitToCorporate: (id: string) => request(`/reports/${id}/submit-to-corporate`, { method: 'POST' }),
  corporateReview: (id: string, data: { approve: boolean; notes: string }) =>
    request(`/reports/${id}/corporate-review`, { method: 'POST', body: JSON.stringify(data) }),
  resubmit: (id: string, data: { revision_notes: string }) =>
    request(`/reports/${id}/resubmit`, { method: 'POST', body: JSON.stringify(data) }),
  history: (id: string) => request(`/reports/${id}/history`),
  downloadUrl: (id: string, format: string) => `${API_BASE}/reports/${id}/download/${format}`,
};

// Alerts
export const alerts = {
  list: () => request('/alerts'),
  markRead: (id: string) => request(`/alerts/${id}/read`, { method: 'POST' }),
};

// Governance (Escalations & Recurring Problems)
export const governance = {
  escalations: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/governance/escalations${qs}`);
  },
  recurringProblems: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/governance/recurring-problems${qs}`);
  },
};

// GIS
export const gis = {
  features: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/gis/features${qs}`);
  },
  contractor: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/gis/contractor${qs}`);
  },
  fieldOfficer: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/gis/field-officer${qs}`);
  },
};

// Audit Logs
export const auditLogs = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/audit-logs${qs}`);
  },
};

// Users
export const users = {
  list: () => request('/users'),
};

export default {
  auth, dashboard, mines, contractors, workers, inspections, violations,
  correctiveActions, aiInsights, documents, reports, alerts, governance, gis, auditLogs, users,
};
