import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat, FileText, AlertTriangle, CheckCircle, ChevronRight, ExternalLink, Upload, Users, Wrench, ShieldCheck } from 'lucide-react';
import { contractors as contractorsApi, documents as docsApi, correctiveActions as caApi } from '../services/api';
import { SectionCard, StatusBadge, ComplianceBar, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';
import { formatDate } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

export default function ContractorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contractorList, setContractorList] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Contractor Self-Service State
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

  const openContractor = async (c: any) => {
    setSelected(c);
    try {
      const reqs: any = await contractorsApi.requirements(c.id);
      setRequirements(reqs || []);
    } catch { setRequirements([]); }
  };

  const runEvaluation = async (id: string) => {
    const result: any = await contractorsApi.evaluate(id);
    setContractorList(prev => prev.map(c => c.id === id ? { ...c, compliance_score: result.compliance_score, risk_level: result.risk_level } : c));
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, ...result }));
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
          <button onClick={() => setUploadSuccess('')} className="text-xs text-coal-400">✕</button>
        </div>
      )}

      {/* Contractor Role Top Card */}
      {isContractor && myCompany && (
        <div className="bg-gradient-to-r from-coal-900 via-coal-900 to-teal-950/40 border border-coal-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm">
                  🏭
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">{myCompany.company_name}</h2>
                  <p className="text-xs text-coal-400">Reg: {myCompany.reg_number} • GSTIN: {myCompany.gstin || '20AAACB1234F1Z5'}</p>
                </div>
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
            {[
              ['License Category', myCompany.license_category || 'Heavy Earth Moving Machinery (HEMM)'],
              ['Contact Person', myCompany.contact_person],
              ['Email / Phone', `${myCompany.email} • ${myCompany.phone}`],
              ['License Expiry', formatDate(myCompany.license_expiry)],
            ].map(([k, v]) => (
              <div key={k as string}>
                <div className="text-[10px] text-coal-500 uppercase font-semibold">{k}</div>
                <div className="text-xs text-coal-200 mt-0.5 truncate">{v || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contractor Quick Actions: CAPA Action Required Banner */}
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
            View & Submit Proof →
          </button>
        </div>
      )}

      {/* All Contractors Table */}
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
                <tr key={c.id} className="cursor-pointer hover:bg-coal-800/40" onClick={() => openContractor(c)}>
                  <td>
                    <div className="font-semibold text-coal-100">{c.company_name}</div>
                    <div className="text-[10px] text-coal-500">{c.contact_person} • {c.email}</div>
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
                    <button
                      className="btn-ghost"
                      onClick={e => { e.stopPropagation(); runEvaluation(c.id); }}
                      title="Run AI Compliance Evaluation"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contractor Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.company_name || ''} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['GST Number', selected.gstin],
                ['PAN', selected.pan],
                ['Contact', selected.contact_person],
                ['Email', selected.email],
                ['Phone', selected.phone],
                ['License Category', selected.license_category],
                ['License Expiry', formatDate(selected.license_expiry)],
                ['Compliance Score', `${selected.compliance_score}%`],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <div className="text-[10px] text-coal-500 uppercase font-semibold">{k}</div>
                  <div className="text-coal-200 mt-0.5 text-sm">{v || '—'}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="form-label mb-3">Overall Compliance Health</div>
              <ComplianceBar score={selected.compliance_score} />
            </div>

            {requirements.length > 0 && (
              <div>
                <div className="form-label mb-2">Contract Requirements & Statutory Clearances</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {requirements.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between bg-coal-800/50 rounded-lg px-3 py-2.5">
                      <div>
                        <div className="text-xs font-semibold text-coal-200">{r.title}</div>
                        <div className="text-[10px] text-coal-500">{r.regulation_code} • Due: {formatDate(r.due_date)}</div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Upload Document Modal */}
      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Statutory Document / License" size="md">
        <div className="space-y-4">
          <p className="text-xs text-coal-400">
            Upload contract licenses, DGMS statutory approvals, or environmental clearances. The AI OCR engine extracts metadata and verifies validity.
          </p>
          <div>
            <label className="form-label">Document Category</label>
            <select
              className="form-select text-xs"
              value={uploadCategory}
              onChange={e => setUploadCategory(e.target.value)}
            >
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
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={e => setUploadFile(e.target.files?.[0] || null)}
              className="form-input text-xs"
            />
          </div>
          <div className="flex gap-2 justify-end pt-3 border-t border-coal-800">
            <button onClick={() => setShowUploadModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleUploadDoc} disabled={uploading || !uploadFile} className="btn-primary text-xs">
              <Upload size={14} /> {uploading ? 'Processing OCR...' : 'Upload & Verify Document'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
