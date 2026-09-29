import { useState, useEffect } from 'react';
import { Wrench, CheckCircle, AlertTriangle, Clock, Plus, ShieldCheck, XCircle, FileText, ArrowRight } from 'lucide-react';
import { correctiveActions as caApi, mines as minesApi, contractors as contractorsApi, violations as violationsApi } from '../services/api';
import { SectionCard, StatusBadge, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';
import { formatDate, formatDateTime } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

export default function CorrectiveActionsPage() {
  const { user } = useAuth();
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Issue CAPA Modal State (for Mine Manager)
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [minesList, setMinesList] = useState<any[]>([]);
  const [contractorsList, setContractorsList] = useState<any[]>([]);
  const [violationsList, setViolationsList] = useState<any[]>([]);
  const [newCapa, setNewCapa] = useState({
    mine_id: '',
    contractor_id: '',
    violation_id: '',
    title: '',
    description: '',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    assigned_to: 'Contractor Site In-Charge'
  });

  const isContractor = user?.role === 'CONTRACTOR';
  const isFieldOfficer = user?.role === 'FIELD OFFICER' || user?.role === 'CORPORATE MANAGEMENT';
  const isMineManager = user?.role === 'MINE MANAGER' || user?.role === 'CORPORATE MANAGEMENT';

  const loadData = () => {
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    setLoading(true);
    caApi.list(params).then((data: any) => {
      setActions(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    if (isMineManager) {
      Promise.all([
        minesApi.list(),
        contractorsApi.list(),
        violationsApi.list({ status: 'OPEN' })
      ]).then(([mn, cont, vio]: any) => {
        setMinesList(mn || []);
        setContractorsList(cont || []);
        setViolationsList(vio || []);
      }).catch(() => {});
    }
  }, [filterStatus]);

  // Contractor submits proof
  const handleResolve = async () => {
    if (!resolveNotes) return;
    setSubmitting(true);
    try {
      const updated: any = await caApi.resolve(selected.id, {
        resolution_notes: resolveNotes,
        evidence_file_name: evidenceFileName || 'remedy_proof_photo.jpg'
      });
      setActions(prev => prev.map(a => a.id === selected.id ? updated : a));
      setSelected(updated);
      setResolveNotes('');
      setEvidenceFileName('');
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  // Field Officer verifies: FIXED or NOT FIXED
  const handleVerify = async (approved: boolean) => {
    if (!verifyNotes) return;
    setSubmitting(true);
    try {
      const updated: any = await caApi.verify(selected.id, {
        approved,
        verification_notes: verifyNotes
      });
      setActions(prev => prev.map(a => a.id === selected.id ? updated : a));
      setSelected(updated);
      setVerifyNotes('');
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  // Mine Manager formally closes CAPA (ONLY IF FIXED/VERIFIED)
  const handleClose = async () => {
    if (!closureNotes) return;
    setSubmitting(true);
    try {
      const updated: any = await caApi.close(selected.id, {
        closure_notes: closureNotes
      });
      setActions(prev => prev.map(a => a.id === selected.id ? updated : a));
      setSelected(updated);
      setClosureNotes('');
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  // Mine Manager issues a new CAPA
  const handleCreateCapa = async () => {
    if (!newCapa.mine_id || !newCapa.contractor_id || !newCapa.title || !newCapa.description) {
      alert('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const created: any = await caApi.create({
        ...newCapa,
        due_date: new Date(newCapa.due_date).toISOString()
      });
      setActions(prev => [created, ...prev]);
      setShowIssueModal(false);
      setNewCapa({
        mine_id: '',
        contractor_id: '',
        violation_id: '',
        title: '',
        description: '',
        priority: 'HIGH',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        assigned_to: 'Contractor Site In-Charge'
      });
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const priorityColor = (p: string) => {
    if (p === 'CRITICAL') return 'text-red-700';
    if (p === 'HIGH') return 'text-orange-700';
    if (p === 'MEDIUM') return 'text-amber-700';
    return 'text-slate-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              Closed-Loop Remediation
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Corrective Action Management (CAPA)</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Strict 3-party closed loop: Mine Manager Issues → Contractor Fixes & Submits Proof → Field Officer Verifies → Mine Manager Closes
          </p>
        </div>
        <div className="flex gap-2">
          {isMineManager && (
            <button onClick={() => setShowIssueModal(true)} className="btn-primary text-xs">
              <Plus size={14} /> Issue New CAPA
            </button>
          )}
          <select className="form-select text-xs w-44" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ACTION_REQUIRED">ACTION REQUIRED</option>
            <option value="UNDER_VERIFICATION">UNDER VERIFICATION</option>
            <option value="FIXED">FIXED (VERIFIED)</option>
            <option value="NOT_FIXED">NOT FIXED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="OVERDUE">OVERDUE</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Action Required', count: actions.filter(a => ['OPEN', 'ASSIGNED', 'ACTION_REQUIRED', 'IN_PROGRESS', 'NOT_FIXED'].includes(a.status)).length, text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Under Verification', count: actions.filter(a => a.status === 'UNDER_VERIFICATION' || a.status === 'PROOF_SUBMITTED').length, text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Verified (Fixed)', count: actions.filter(a => a.status === 'FIXED' || a.status === 'VERIFIED').length, text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Closed', count: actions.filter(a => a.status === 'CLOSED' || a.status === 'RESOLVED').length, text: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
          { label: 'Overdue', count: actions.filter(a => a.is_overdue).length, text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
        ].map(s => (
          <div key={s.label} className={`bg-white border rounded-lg p-3.5 shadow-card ${s.border}`}>
            <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.text}`}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? <LoadingState /> : actions.length === 0 ? <EmptyState message="No corrective actions found" /> : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CAPA Code</th>
                  <th>Directive / Issue</th>
                  <th>Mine</th>
                  <th>Contractor</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action Needed</th>
                </tr>
              </thead>
              <tbody>
                {actions.map(a => (
                  <tr key={a.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => {
                    setSelected(a);
                    setResolveNotes('');
                    setVerifyNotes('');
                    setClosureNotes('');
                  }}>
                    <td className="font-mono text-xs font-bold text-blue-700">{a.action_code}</td>
                    <td>
                      <div className="text-xs font-bold text-slate-900 max-w-[240px] truncate">{a.title}</div>
                      {a.violation_title && <div className="text-[11px] text-slate-500 truncate max-w-[240px]">Ref: {a.violation_title}</div>}
                    </td>
                    <td className="text-xs text-slate-600">{a.mine_name}</td>
                    <td className="text-xs text-slate-600 font-medium">{a.contractor_name}</td>
                    <td><span className={`text-xs font-bold ${priorityColor(a.priority)}`}>{a.priority}</span></td>
                    <td>
                      <div className={`text-xs font-medium ${a.is_overdue ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                        {formatDate(a.due_date)}
                        {a.is_overdue && <span className="block text-[10px] text-red-700 font-bold">⚠ OVERDUE</span>}
                      </div>
                    </td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-xs font-semibold">
                      {['OPEN', 'ASSIGNED', 'ACTION_REQUIRED', 'IN_PROGRESS', 'NOT_FIXED'].includes(a.status) && (
                        <span className="text-amber-700">Contractor Fix Pending</span>
                      )}
                      {['UNDER_VERIFICATION', 'PROOF_SUBMITTED'].includes(a.status) && (
                        <span className="text-blue-700">Field Officer Check</span>
                      )}
                      {['FIXED', 'VERIFIED'].includes(a.status) && (
                        <span className="text-emerald-700">Mine Mgr Closure Ready</span>
                      )}
                      {['CLOSED', 'RESOLVED'].includes(a.status) && (
                        <span className="text-slate-400">Fully Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail & Action Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.action_code || 'CAPA Detail'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.status} />
                <StatusBadge status={selected.priority} />
                {selected.is_overdue && <StatusBadge status="OVERDUE" />}
              </div>
              <div className="text-xs text-slate-500">
                Due: <strong className={selected.is_overdue ? 'text-red-700' : 'text-slate-800'}>{formatDate(selected.due_date)}</strong>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{selected.title}</h3>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">{selected.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              {[
                ['Mine', selected.mine_name],
                ['Responsible Contractor', selected.contractor_name],
                ['Assigned In-Charge', selected.assigned_to],
                ['Associated Violation', selected.violation_title || 'Direct Statutory Directive'],
                ['Created At', formatDateTime(selected.created_at)],
                ['Resolution Status', selected.status],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">{k}</div>
                  <div className="text-slate-800 font-medium mt-0.5">{v || '—'}</div>
                </div>
              ))}
            </div>

            {/* Contractor Submitted Resolution Proof View */}
            {selected.resolution_notes && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-blue-900">🛠 Contractor Action Taken & Proof</span>
                  {selected.resolved_at && <span className="text-[10px] text-slate-500 font-mono">Submitted: {formatDateTime(selected.resolved_at)}</span>}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{selected.resolution_notes}</p>
                {selected.resolution_evidence_file && (
                  <div className="mt-2 text-xs text-blue-800 flex items-center gap-1.5 bg-blue-100/70 px-2.5 py-1 rounded w-fit font-medium">
                    <FileText size={13} /> Attached Proof: <strong>{selected.resolution_evidence_file}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Field Officer Verification Notes View */}
            {selected.verification_notes && (
              <div className={`rounded-lg p-3.5 border ${selected.status === 'NOT_FIXED' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${selected.status === 'NOT_FIXED' ? 'text-red-800' : 'text-emerald-800'}`}>
                    🕵 Field Officer Verification Verdict: {selected.verification_decision || (selected.status === 'NOT_FIXED' ? 'NOT FIXED' : 'FIXED')}
                  </span>
                  {selected.verified_at && <span className="text-[10px] text-slate-500 font-mono">{formatDateTime(selected.verified_at)}</span>}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{selected.verification_notes}</p>
                {selected.verified_by_name && (
                  <div className="text-[10px] text-slate-500 mt-1">Verified by: {selected.verified_by_name}</div>
                )}
              </div>
            )}

            {/* Mine Manager Formal Closure Notes View */}
            {selected.status === 'CLOSED' && selected.closure_notes && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-teal-800">🏛 Mine Manager Final Closure Sign-off</span>
                  {selected.closed_at && <span className="text-[10px] text-slate-500 font-mono">{formatDateTime(selected.closed_at)}</span>}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{selected.closure_notes}</p>
                {selected.closed_by_name && (
                  <div className="text-[10px] text-slate-500 mt-1">Signed off by: {selected.closed_by_name}</div>
                )}
              </div>
            )}

            {/* ----------------- ACTION GATEWAY BY ROLE ----------------- */}

            {/* 1. CONTRACTOR ACTION: Submit Proof */}
            {['OPEN', 'ASSIGNED', 'ACTION_REQUIRED', 'IN_PROGRESS', 'NOT_FIXED'].includes(selected.status) && isContractor && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                  Step 2: Contractor Fix & Proof Submission
                </div>
                <p className="text-xs text-slate-500">
                  Document the physical correction taken on site and provide evidence for Field Officer inspection.
                </p>
                <textarea
                  className="form-input text-xs"
                  rows={3}
                  value={resolveNotes}
                  onChange={e => setResolveNotes(e.target.value)}
                  placeholder="Detail the corrective actions executed on site (e.g. berm rebuilt to 2.7m height with heavy grader)..."
                />
                <input
                  type="text"
                  className="form-input text-xs"
                  value={evidenceFileName}
                  onChange={e => setEvidenceFileName(e.target.value)}
                  placeholder="Proof file reference (e.g., berm_reconstructed_sector2b.jpg)"
                />
                <button
                  onClick={handleResolve}
                  disabled={submitting || !resolveNotes}
                  className="btn-primary w-full justify-center text-xs"
                >
                  <CheckCircle size={14} /> Submit for Field Officer Verification
                </button>
              </div>
            )}

            {/* 2. FIELD OFFICER ACTION: Verify Proof -> FIXED or NOT FIXED */}
            {['UNDER_VERIFICATION', 'PROOF_SUBMITTED'].includes(selected.status) && isFieldOfficer && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                  Step 3: Field Officer Physical Verification
                </div>
                <p className="text-xs text-slate-500">
                  Inspect the site to confirm whether the Contractor has properly rectified the violation.
                </p>
                <textarea
                  className="form-input text-xs"
                  rows={2}
                  value={verifyNotes}
                  onChange={e => setVerifyNotes(e.target.value)}
                  placeholder="Enter field inspection observations regarding the contractor's fix..."
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleVerify(true)}
                    disabled={submitting || !verifyNotes}
                    className="btn-success justify-center text-xs"
                  >
                    <CheckCircle size={14} /> Mark as FIXED
                  </button>
                  <button
                    onClick={() => handleVerify(false)}
                    disabled={submitting || !verifyNotes}
                    className="btn-danger justify-center text-xs"
                  >
                    <XCircle size={14} /> Mark as NOT FIXED
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  Note: Marking FIXED forwards the verified CAPA to the Mine Manager for final closure. Marking NOT FIXED returns it to the Contractor.
                </p>
              </div>
            )}

            {/* 3. MINE MANAGER ACTION: Close Verified CAPA */}
            {['FIXED', 'VERIFIED'].includes(selected.status) && isMineManager && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  Step 4: Mine Manager Final Closure
                </div>
                <p className="text-xs text-slate-500">
                  The Field Officer has verified that the issue is FIXED. You may now formally close this CAPA and resolve the violation.
                </p>
                <textarea
                  className="form-input text-xs"
                  rows={2}
                  value={closureNotes}
                  onChange={e => setClosureNotes(e.target.value)}
                  placeholder="Mine Manager final governance comments and closure certification..."
                />
                <button
                  onClick={handleClose}
                  disabled={submitting || !closureNotes}
                  className="btn-success w-full justify-center text-xs"
                >
                  <ShieldCheck size={14} /> Formally Close CAPA & Resolve Violation
                </button>
              </div>
            )}

            {/* Governance Rule Banner for Mine Manager if not yet verified */}
            {!['FIXED', 'VERIFIED', 'CLOSED'].includes(selected.status) && isMineManager && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle size={15} className="text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Closure Protected:</strong> Under CIL governance rules, the Mine Manager can only close a CAPA after on-site Field Officer verification confirms the issue is <strong>FIXED</strong>.
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Mine Manager Issue CAPA Modal */}
      <Modal open={showIssueModal} onClose={() => setShowIssueModal(false)} title="Issue Corrective Action (CAPA)" size="lg">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Mine Managers issue CAPAs to contractors for observed violations, setting statutory directives and remediation deadlines.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Mine</label>
              <select
                className="form-select text-xs"
                value={newCapa.mine_id}
                onChange={e => setNewCapa({ ...newCapa, mine_id: e.target.value })}
              >
                <option value="">Select Mine...</option>
                {minesList.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Responsible Contractor</label>
              <select
                className="form-select text-xs"
                value={newCapa.contractor_id}
                onChange={e => setNewCapa({ ...newCapa, contractor_id: e.target.value })}
              >
                <option value="">Select Contractor...</option>
                {contractorsList.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Linked Violation (Optional)</label>
            <select
              className="form-select text-xs"
              value={newCapa.violation_id}
              onChange={e => {
                const vioId = e.target.value;
                const v = violationsList.find(x => x.id === vioId);
                setNewCapa({
                  ...newCapa,
                  violation_id: vioId,
                  title: v ? `Rectification for: ${v.title}` : newCapa.title,
                  priority: v?.severity || newCapa.priority,
                  mine_id: v?.mine_id || newCapa.mine_id,
                  contractor_id: v?.contractor_id || newCapa.contractor_id
                });
              }}
            >
              <option value="">Select an Open Violation...</option>
              {violationsList.map(v => (
                <option key={v.id} value={v.id}>
                  [{v.severity}] {v.violation_code} — {v.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Action / Directive Title</label>
            <input
              type="text"
              className="form-input text-xs"
              placeholder="e.g., Immediate Reconstruction of Haul Road Earthen Berm to 2.7m"
              value={newCapa.title}
              onChange={e => setNewCapa({ ...newCapa, title: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Directive Description</label>
            <textarea
              className="form-input text-xs"
              rows={3}
              placeholder="Detailed statutory mandate, DGMS circular citations, and required engineering controls..."
              value={newCapa.description}
              onChange={e => setNewCapa({ ...newCapa, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Priority</label>
              <select
                className="form-select text-xs"
                value={newCapa.priority}
                onChange={e => setNewCapa({ ...newCapa, priority: e.target.value })}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div>
              <label className="form-label">Deadline (Due Date)</label>
              <input
                type="date"
                className="form-input text-xs"
                value={newCapa.due_date}
                onChange={e => setNewCapa({ ...newCapa, due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Assignee</label>
              <input
                type="text"
                className="form-input text-xs"
                value={newCapa.assigned_to}
                onChange={e => setNewCapa({ ...newCapa, assigned_to: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-slate-200">
            <button onClick={() => setShowIssueModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleCreateCapa} disabled={submitting} className="btn-primary text-xs">
              <Plus size={14} /> Issue & Assign CAPA
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
