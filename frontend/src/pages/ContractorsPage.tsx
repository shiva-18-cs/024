import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Upload, Users, Wrench, Eye, Building2, RefreshCw,
  AlertCircle, Shield, Activity, Clock, AlertTriangle, X, FileText, ClipboardList
} from 'lucide-react';
import { contractors as contractorsApi, documents as docsApi, correctiveActions as caApi } from '../services/api';
import { StatusBadge, ComplianceBar, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';
import { formatDate } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color = 'teal', icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: any;
}) {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-500/10 text-teal-400 border-teal-700/40',
    red: 'bg-red-500/10 text-red-400 border-red-700/40',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-700/40',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-700/40',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-700/40',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-700/40',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colorMap[color] || colorMap.teal}`}>
      {Icon && <Icon size={16} className="mb-1 opacity-70" />}
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase font-semibold opacity-70 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] opacity-50 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick, badge }: {
  label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
        active ? 'bg-teal-600 text-white' : 'text-coal-400 hover:text-white hover:bg-coal-800'
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
          active ? 'bg-white/20' : 'bg-red-500/30 text-red-300'
        }`}>{badge}</span>
      )}
    </button>
  );
}

// ─── Contractor Detail Modal ──────────────────────────────────────────────────
function ContractorDetailModal({ contractorId, onClose }: { contractorId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    contractorsApi.profile(contractorId)
      .then((d: any) => { setProfile(d); setLoading(false); })
      .catch((e: any) => { setError(e.message || 'Failed to load profile'); setLoading(false); });
  }, [contractorId]);

  const tabs = [
    { id: 'overview',    label: 'Overview' },
    { id: 'contracts',   label: 'Contracts',   badge: profile?.metrics?.active_contracts },
    { id: 'workers',     label: 'Workers',     badge: profile?.metrics?.total_workers },
    { id: 'documents',   label: 'Documents',   badge: profile?.metrics?.expired_documents || 0 },
    { id: 'inspections', label: 'Inspections', badge: profile?.metrics?.total_inspections },
    { id: 'violations',  label: 'Violations',  badge: profile?.metrics?.open_violations },
    { id: 'capas',       label: 'CAPAs',       badge: profile?.metrics?.open_corrective_actions },
    { id: 'audit',       label: 'Audit Trail' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-coal-950 border border-coal-800 rounded-2xl w-full max-w-5xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-coal-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {loading ? 'Loading...' : profile?.company_name || 'Contractor Profile'}
              </div>
              {profile && (
                <div className="text-xs text-coal-400 flex items-center gap-2">
                  Reg: {profile.reg_number}
                  <StatusBadge status={profile.is_active ? 'ACTIVE' : 'INACTIVE'} />
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="p-12"><LoadingState /></div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-sm">{error}</div>
        ) : profile ? (
          <>
            {/* Tabs */}
            <div className="flex flex-wrap gap-1 px-6 py-3 border-b border-coal-800 bg-coal-900/50">
              {tabs.map(t => (
                <TabBtn key={t.id} label={t.label} active={activeTab === t.id}
                  onClick={() => setActiveTab(t.id)} badge={t.badge} />
              ))}
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {([
                      ['Company', profile.company_name],
                      ['Registration No.', profile.reg_number],
                      ['GSTIN', profile.gstin],
                      ['PAN', profile.pan],
                      ['Contact Person', profile.contact_person],
                      ['Email', profile.email],
                      ['Phone', profile.phone],
                      ['License Category', profile.license_category],
                      ['License Expiry', formatDate(profile.license_expiry)],
                      ['Address', profile.address],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="bg-coal-900 rounded-xl px-3 py-2.5">
                        <div className="text-[10px] text-coal-500 uppercase font-semibold">{k}</div>
                        <div className="text-coal-200 mt-0.5 text-xs truncate">{v || '—'}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-coal-900 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-coal-300">Overall Compliance Score</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-emerald-400">{profile.compliance_score}%</span>
                        <StatusBadge status={profile.risk_level} />
                      </div>
                    </div>
                    <ComplianceBar score={profile.compliance_score} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard icon={Users}        label="Total Workers"      value={profile.metrics.total_workers}           color="blue"    sub={`${profile.metrics.active_workers} active`} />
                    <MetricCard icon={FileText}      label="Total Documents"    value={profile.metrics.total_documents}         color="teal"    sub={`${profile.metrics.expired_documents} expired`} />
                    <MetricCard icon={ClipboardList} label="Active Contracts"   value={profile.metrics.active_contracts}        color="emerald" sub={`${profile.metrics.total_contracts} total`} />
                    <MetricCard icon={AlertCircle}   label="Pending Actions"    value={profile.metrics.pending_actions}         color={profile.metrics.pending_actions > 0 ? 'red' : 'emerald'} />
                    <MetricCard icon={Shield}        label="Open Violations"    value={profile.metrics.open_violations}         color={profile.metrics.open_violations > 0 ? 'red' : 'emerald'} />
                    <MetricCard icon={Wrench}        label="Open CAPAs"         value={profile.metrics.open_corrective_actions} color={profile.metrics.open_corrective_actions > 0 ? 'amber' : 'emerald'} sub={`${profile.metrics.overdue_corrective_actions} overdue`} />
                    <MetricCard icon={Activity}      label="Total Inspections"  value={profile.metrics.total_inspections}       color="purple" />
                    <MetricCard icon={AlertTriangle} label="Active Escalations" value={profile.metrics.active_escalations}      color={profile.metrics.active_escalations > 0 ? 'red' : 'teal'} />
                  </div>

                  {profile.metrics.expiring_documents > 0 && (
                    <div className="bg-amber-950/40 border border-amber-700/50 rounded-xl px-4 py-3 flex items-center gap-3">
                      <Clock size={16} className="text-amber-400 shrink-0" />
                      <span className="text-xs text-amber-300">
                        <strong>{profile.metrics.expiring_documents}</strong> document(s) expiring within 30 days. Review the Documents tab.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* CONTRACTS */}
              {activeTab === 'contracts' && (
                <div className="space-y-2">
                  {profile.contracts.length === 0
                    ? <EmptyState message="No contracts found" />
                    : profile.contracts.map((con: any) => (
                      <div key={con.id} className="bg-coal-900 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-coal-500">{con.contract_number}</span>
                            <StatusBadge status={con.status} />
                          </div>
                          <div className="text-sm font-semibold text-coal-100 mt-0.5 truncate">{con.title}</div>
                          <div className="text-xs text-coal-400 mt-0.5">
                            {con.mine_name} &bull; Rs.{con.value_inr_crores}Cr &bull; {formatDate(con.start_date)} to {formatDate(con.end_date)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-coal-400">{con.requirements_count} requirements</div>
                          {con.requirements_pending > 0 && (
                            <div className="text-xs text-amber-400 font-semibold">{con.requirements_pending} pending</div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* WORKERS */}
              {activeTab === 'workers' && (
                <div className="overflow-x-auto">
                  {profile.workers.length === 0
                    ? <EmptyState message="No workers found" />
                    : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Code</th><th>Name</th><th>Designation</th><th>Mine</th>
                            <th>Compliance</th><th>Verification</th><th>Medical</th><th>Training</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.workers.map((w: any) => (
                            <tr key={w.id}>
                              <td className="font-mono text-xs text-coal-400">{w.worker_code}</td>
                              <td className="font-semibold text-coal-100">{w.name}</td>
                              <td className="text-xs text-coal-300">{w.designation}</td>
                              <td className="text-xs text-coal-400">{w.mine_name || '—'}</td>
                              <td><StatusBadge status={w.compliance_status} /></td>
                              <td><StatusBadge status={w.verification_status} /></td>
                              <td><StatusBadge status={w.medical_fitness_status} /></td>
                              <td><StatusBadge status={w.training_status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                </div>
              )}

              {/* DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-2">
                  {profile.documents.length === 0
                    ? <EmptyState message="No documents uploaded" />
                    : profile.documents.map((d: any) => (
                      <div key={d.id} className={`rounded-xl border px-4 py-3 space-y-2 ${
                        d.is_expired ? 'border-red-700/50 bg-red-950/20'
                        : d.expiring_soon ? 'border-amber-700/50 bg-amber-950/20'
                        : 'border-coal-800 bg-coal-900'
                      }`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-coal-100">{d.file_name}</span>
                              <span className="text-[10px] bg-coal-800 text-coal-400 px-2 py-0.5 rounded">{d.doc_category}</span>
                              {d.is_expired && <span className="text-[10px] bg-red-900/60 text-red-300 px-2 py-0.5 rounded font-bold">EXPIRED</span>}
                              {d.expiring_soon && !d.is_expired && <span className="text-[10px] bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded font-bold">EXPIRING SOON</span>}
                            </div>
                            <div className="text-[10px] text-coal-500 mt-0.5 flex gap-3 flex-wrap">
                              <span>OCR: <span className={d.ocr_status === 'PROCESSED' ? 'text-emerald-400' : 'text-amber-400'}>{d.ocr_status}</span></span>
                              {d.ocr_confidence > 0 && <span>Confidence: {d.ocr_confidence.toFixed(0)}%</span>}
                              {d.uploaded_by && <span>By: {d.uploaded_by}</span>}
                              <span>Uploaded: {formatDate(d.created_at)}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <StatusBadge status={d.status} />
                            <div className="text-[10px] text-coal-500 mt-1">
                              {d.issue_date && <div>Issued: {formatDate(d.issue_date)}</div>}
                              {d.expiry_date && <div>Expires: {formatDate(d.expiry_date)}</div>}
                            </div>
                          </div>
                        </div>
                        {d.extracted_metadata && Object.keys(d.extracted_metadata).length > 0 && (
                          <details className="text-[10px] bg-coal-800/50 rounded-lg px-3 py-2">
                            <summary className="cursor-pointer text-coal-400 font-semibold select-none">OCR Extracted Fields</summary>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                              {Object.entries(d.extracted_metadata).map(([k, v]) => (
                                <div key={k}>
                                  <span className="text-coal-500">{k}: </span>
                                  <span className="text-coal-300">{String(v) || '—'}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                        {d.manual_verification_required && (
                          <div className="text-[10px] text-amber-400 flex items-center gap-1">
                            <AlertTriangle size={11} /> Manual verification required
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* INSPECTIONS */}
              {activeTab === 'inspections' && (
                <div className="overflow-x-auto">
                  {profile.inspections.length === 0
                    ? <EmptyState message="No inspections recorded for this contractor" />
                    : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Number</th><th>Type</th><th>Mine</th><th>Officer</th>
                            <th>Date</th><th>Risk</th><th>Score</th><th>Stage</th><th>Violations</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.inspections.map((i: any) => (
                            <tr key={i.id}>
                              <td className="font-mono text-xs text-coal-400">{i.inspection_number}</td>
                              <td className="text-xs text-coal-300">{i.inspection_type}</td>
                              <td className="text-xs text-coal-400">{i.mine_name}</td>
                              <td className="text-xs text-coal-400">{i.officer_name}</td>
                              <td className="text-xs text-coal-400">{formatDate(i.inspection_date)}</td>
                              <td><StatusBadge status={i.risk_level} /></td>
                              <td className="text-emerald-400 font-bold text-xs">{i.compliance_score}%</td>
                              <td><StatusBadge status={i.workflow_stage.replace(/_/g, ' ')} /></td>
                              <td className={`text-center font-bold text-xs ${i.violations_count > 0 ? 'text-red-400' : 'text-coal-500'}`}>
                                {i.violations_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                </div>
              )}

              {/* VIOLATIONS */}
              {activeTab === 'violations' && (
                <div className="space-y-2">
                  {profile.violations.length === 0
                    ? <EmptyState message="No violations on record" />
                    : profile.violations.map((v: any) => (
                      <div key={v.id} className={`rounded-xl border px-4 py-3 ${
                        v.status === 'OPEN' ? 'border-red-700/50 bg-red-950/20' : 'border-coal-800 bg-coal-900'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] text-coal-500">{v.violation_code}</span>
                              <StatusBadge status={v.severity} />
                              <StatusBadge status={v.status} />
                            </div>
                            <div className="text-sm font-semibold text-coal-100 mt-1">{v.title}</div>
                            <div className="text-[10px] text-coal-500 mt-1">
                              {v.category} &bull; {v.regulation_reference} &bull; {v.mine_name}
                            </div>
                          </div>
                          <div className="text-right shrink-0 text-[10px] text-coal-500">
                            <div>Detected: {formatDate(v.detected_at)}</div>
                            {v.resolved_at && <div>Resolved: {formatDate(v.resolved_at)}</div>}
                            <div>{v.corrective_actions_count} CAPA(s)</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* CAPAS */}
              {activeTab === 'capas' && (
                <div className="space-y-2">
                  {profile.corrective_actions.length === 0
                    ? <EmptyState message="No corrective actions assigned" />
                    : profile.corrective_actions.map((ca: any) => (
                      <div key={ca.id} className={`rounded-xl border px-4 py-3 ${
                        ca.is_overdue ? 'border-red-700/50 bg-red-950/20'
                        : (ca.status === 'RESOLVED' || ca.status === 'CLOSED') ? 'border-emerald-700/30 bg-emerald-950/10'
                        : 'border-coal-800 bg-coal-900'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] text-coal-500">{ca.action_code}</span>
                              <StatusBadge status={ca.priority} />
                              <StatusBadge status={ca.status} />
                              {ca.is_overdue && (
                                <span className="text-[10px] bg-red-900/60 text-red-300 px-2 py-0.5 rounded font-bold">OVERDUE</span>
                              )}
                            </div>
                            <div className="text-sm font-semibold text-coal-100 mt-1">{ca.title}</div>
                            {ca.violation_title && (
                              <div className="text-[10px] text-coal-500 mt-0.5">Violation: {ca.violation_title}</div>
                            )}
                            {ca.assigned_to && (
                              <div className="text-[10px] text-coal-400 mt-0.5">Assigned to: {ca.assigned_to}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0 text-[10px] text-coal-500">
                            <div>Due: <span className={ca.is_overdue ? 'text-red-400 font-bold' : ''}>{formatDate(ca.due_date)}</span></div>
                            {ca.resolved_at && <div>Resolved: {formatDate(ca.resolved_at)}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* AUDIT TRAIL */}
              {activeTab === 'audit' && (
                <div className="space-y-1.5">
                  {profile.audit_trail.length === 0
                    ? <EmptyState message="No audit events recorded" />
                    : profile.audit_trail.map((a: any) => (
                      <div key={a.id} className="flex items-start gap-3 bg-coal-900 rounded-lg px-3 py-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-coal-200">
                            <span className="font-semibold text-teal-400">{a.username}</span>
                            <span className="text-coal-500 mx-1.5">({a.role})</span>
                            {a.action}
                          </div>
                          <div className="text-[10px] text-coal-600 mt-0.5">
                            {a.entity} &bull; {formatDate(a.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContractorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contractorList, setContractorList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [myDocs, setMyDocs] = useState<any[]>([]);
  const [myCapas, setMyCapas] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Safety Certificate');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');

  const isContractor = user?.role === 'CONTRACTOR';

  useEffect(() => {
    contractorsApi.list().then((data: any) => {
      setContractorList(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));

    if (isContractor) {
      docsApi.list().then((d: any) => setMyDocs(d || [])).catch(() => {});
      caApi.list().then((c: any) => setMyCapas(c || [])).catch(() => {});
    }
  }, [isContractor]);

  const runEvaluation = async (id: string) => {
    try {
      const result: any = await contractorsApi.evaluate(id);
      setContractorList(prev =>
        prev.map(c => c.id === id ? { ...c, compliance_score: result.compliance_score, risk_level: result.risk_level } : c)
      );
    } catch { /* ignore */ }
  };

  const handleUploadDoc = async () => {
    if (!uploadFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', uploadFile);
    fd.append('doc_category', uploadCategory);
    if (user?.contractor_id) fd.append('contractor_id', user.contractor_id);
    try {
      const res: any = await docsApi.upload(fd);
      setMyDocs(prev => [res, ...prev]);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadSuccess(`Document '${res.file_name}' uploaded and processed via OCR! Status: ${res.status}`);
    } catch (e: any) {
      alert('Upload failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const myCompany = isContractor
    ? contractorList.find(c => c.id === user?.contractor_id || c.company_name === user?.contractor_name) || contractorList[0]
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isContractor ? 'Contractor Agency Workspace' : 'Contractor Management'}
          </h1>
          <p className="text-coal-500 text-sm mt-0.5">
            {isContractor
              ? 'Statutory document uploads, worker onboarding, compliance tracking & assigned CAPA remediation'
              : `${contractorList.length} registered contractor agencies across Coal India subsidiaries`}
          </p>
        </div>
        {isContractor && (
          <div className="flex gap-2">
            <button onClick={() => setShowUploadModal(true)} className="btn-primary text-xs">
              <Upload size={14} /> Upload License / Statutory Doc
            </button>
            <button onClick={() => navigate('/workers')} className="btn-secondary text-xs">
              <Users size={14} /> Manage Workers
            </button>
          </div>
        )}
      </div>

      {uploadSuccess && (
        <div className="bg-emerald-900/30 border border-emerald-800/60 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-300 text-sm">
            <CheckCircle size={16} className="text-emerald-400" />
            {uploadSuccess}
          </div>
          <button onClick={() => setUploadSuccess('')} className="text-xs text-coal-400">x</button>
        </div>
      )}

      {/* Contractor Self-View Card */}
      {isContractor && myCompany && (
        <div className="bg-gradient-to-r from-coal-900 via-coal-900 to-teal-950/40 border border-coal-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm">H</span>
              <div>
                <h2 className="text-lg font-bold text-white">{myCompany.company_name}</h2>
                <p className="text-xs text-coal-400">Reg: {myCompany.reg_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-coal-500 uppercase font-semibold">Compliance Rating</div>
                <div className="text-xl font-bold text-emerald-400">{myCompany.compliance_score}%</div>
              </div>
              <StatusBadge status={myCompany.risk_level || 'LOW'} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-coal-800/70">
            {([
              ['License Category', myCompany.license_category || 'HEMM'],
              ['Contact Person', myCompany.contact_person],
              ['Email', myCompany.email],
              ['License Expiry', formatDate(myCompany.license_expiry)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] text-coal-500 uppercase font-semibold">{k}</div>
                <div className="text-xs text-coal-200 mt-0.5 truncate">{v || '—'}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setDetailId(myCompany.id)}
            className="btn-ghost text-xs w-full flex items-center justify-center gap-1.5 border border-coal-700/50 rounded-lg py-2"
          >
            <Eye size={13} /> View My Full Compliance Profile
          </button>
        </div>
      )}

      {/* CAPA Banner */}
      {isContractor && myCapas.filter(c => ['OPEN', 'ASSIGNED', 'ACTION_REQUIRED', 'NOT_FIXED'].includes(c.status)).length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wrench size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-300">
                Action Required: {myCapas.filter(c => ['OPEN', 'ASSIGNED', 'ACTION_REQUIRED', 'NOT_FIXED'].includes(c.status)).length} Corrective Action(s) Assigned
              </div>
              <p className="text-xs text-coal-400 mt-0.5">
                Review assigned CAPAs, execute on-site fixes, and upload resolution proof for Field Officer verification.
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/corrective-actions')} className="btn-primary text-xs whitespace-nowrap">
            View and Submit Proof
          </button>
        </div>
      )}

      {/* Contractors Table */}
      {loading ? <LoadingState /> : (
        <div className="section-card overflow-hidden">
          <div className="px-5 py-3 border-b border-coal-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Registered Contractor Agencies</h3>
            <span className="text-xs text-coal-500">{contractorList.length} total</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Company / Agency</th>
                <th>Reg. Number</th>
                <th>Compliance Score</th>
                <th>Risk Level</th>
                <th>Active Contracts</th>
                <th>Pending Actions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contractorList.map(c => (
                <tr key={c.id} className="hover:bg-coal-800/30">
                  <td>
                    <div className="font-semibold text-coal-100">{c.company_name}</div>
                    <div className="text-[10px] text-coal-500">{c.contact_person} &bull; {c.email}</div>
                  </td>
                  <td className="text-coal-400 font-mono text-xs">{c.reg_number}</td>
                  <td>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <ComplianceBar score={c.compliance_score} />
                    </div>
                  </td>
                  <td><StatusBadge status={c.risk_level} /></td>
                  <td className="text-center text-coal-300">{c.active_contracts_count}</td>
                  <td className="text-center">
                    <span className={c.pending_actions_count > 0 ? 'text-red-400 font-bold' : 'text-coal-500'}>
                      {c.pending_actions_count}
                    </span>
                  </td>
                  <td><StatusBadge status={c.is_active ? 'ACTIVE' : 'INACTIVE'} /></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        id={`view-contractor-${c.id}`}
                        className="btn-primary text-xs py-1 px-2 flex items-center gap-1"
                        onClick={() => setDetailId(c.id)}
                        title="View Full Contractor Profile"
                      >
                        <Eye size={12} /> View
                      </button>
                      <button
                        className="btn-ghost p-1.5"
                        onClick={() => runEvaluation(c.id)}
                        title="Run AI Compliance Evaluation"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Detail Modal */}
      {detailId && (
        <ContractorDetailModal contractorId={detailId} onClose={() => setDetailId(null)} />
      )}

      {/* Upload Modal */}
      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Statutory Document / License" size="md">
        <div className="space-y-4">
          <p className="text-xs text-coal-400">
            Upload contract licenses, DGMS statutory approvals, or environmental clearances. The AI OCR engine extracts metadata and verifies validity.
          </p>
          <div>
            <label className="form-label">Document Category</label>
            <select className="form-select text-xs" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
              <option value="Safety Certificate">Safety Certificate</option>
              <option value="DGMS Blasting License">DGMS Blasting License</option>
              <option value="Environmental Clearance">Environmental Clearance (MoEFCC)</option>
              <option value="Worker Insurance Policy">Worker Insurance Policy (Form B)</option>
              <option value="Equipment Fitness Certificate">Equipment Fitness Certificate</option>
              <option value="Contractor Registration License">Contractor Registration License</option>
            </select>
          </div>
          <div>
            <label className="form-label">Select File (PDF, PNG, JPG)</label>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg"
              onChange={e => setUploadFile(e.target.files?.[0] || null)} className="form-input text-xs" />
          </div>
          <div className="flex gap-2 justify-end pt-3 border-t border-coal-800">
            <button onClick={() => setShowUploadModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleUploadDoc} disabled={uploading || !uploadFile} className="btn-primary text-xs">
              <Upload size={14} /> {uploading ? 'Processing OCR...' : 'Upload and Verify Document'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
