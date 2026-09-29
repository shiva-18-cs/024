import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, MapPin, CheckCircle, AlertTriangle, Send, Loader, Camera, Wrench, FileText, ShieldAlert, Brain, Image as ImageIcon } from 'lucide-react';
import { inspections as inspectionsApi, mines as minesApi, contractors as contractorsApi } from '../services/api';
import { SectionCard, StatusBadge, ComplianceBar, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';
import { formatDateTime, getWorkflowStageLabel } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

const SAFETY_CHECKLIST = [
  { item_key: 'CHK-SAF-01', category: 'Safety', item_title: 'Haul road berm height >= tyre height (DGMS Reg 115)' },
  { item_key: 'CHK-SAF-02', category: 'Safety', item_title: 'Reverse horn (AVRA) functional on all HEMM' },
  { item_key: 'CHK-ENV-01', category: 'Environmental', item_title: 'Dust suppression mist / bowser operational' },
  { item_key: 'CHK-LAB-01', category: 'Labour Compliance', item_title: 'Valid Form O PME medical certificates verified' },
  { item_key: 'CHK-PPE-01', category: 'Personal Safety', item_title: 'Full PPE compliance - hard hat, fluorescent jacket' },
  { item_key: 'CHK-EXP-01', category: 'Statutory', item_title: 'DGMS licensed Blaster present at all explosive operations' },
  { item_key: 'CHK-FIRE-01', category: 'Fire Safety', item_title: 'Fire extinguishers charged and accessible on equipment' },
];

const WORKFLOW_STAGES = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_MINE_MANAGER_REVIEW', label: 'Mine Manager Review' },
  { key: 'VIOLATIONS_FLAGGED', label: 'Violations Flagged' },
  { key: 'MM_VALIDATED', label: 'MM Validated' },
  { key: 'UNDER_CORPORATE_REVIEW', label: 'Corporate Review' },
  { key: 'CORP_APPROVED', label: 'Corporate Approved' },
];

export default function InspectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inspectionList, setInspectionList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [minesList, setMinesList] = useState<any[]>([]);
  const [contractorsList, setContractorsList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceCaption, setEvidenceCaption] = useState('Field Inspection Geo-Tagged Evidence');
  const [mmNotes, setMmNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const [formData, setFormData] = useState({
    mine_id: '',
    contractor_id: '',
    inspection_type: 'Safety',
    location_tag: '',
    latitude: 25.0489,
    longitude: 87.3821,
    summary: '',
  });
  const [checklist, setChecklist] = useState(
    SAFETY_CHECKLIST.map(c => ({ ...c, is_compliant: true, remarks: '' }))
  );
  const [observations, setObservations] = useState([
    { title: '', description: '', category: 'Safety', severity: 'HIGH', requires_action: true }
  ]);

  const isFieldOfficer = user?.role === 'FIELD OFFICER';
  const isMineManager = user?.role === 'MINE MANAGER';

  useEffect(() => {
    Promise.all([
      inspectionsApi.list(),
      minesApi.list(),
      contractorsApi.list()
    ]).then(([insp, mn, cont]: any) => {
      setInspectionList(insp || []);
      setMinesList(mn || []);
      setContractorsList(cont || []);
      setLoading(false);
    }).catch(() => setLoading(false));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setFormData(f => ({
          ...f,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
      });
    }
  }, []);

  const openDetail = async (insp: any) => {
    setSelected(insp);
    setMmNotes('');
    setLoadingDetail(true);
    try {
      const full: any = await inspectionsApi.get(insp.id);
      setSelected(full);
    } catch {
      // keep partial data
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateInspection = async () => {
    if (!formData.mine_id || !formData.location_tag) {
      alert('Please select a mine and enter location tag.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        checklists: checklist,
        observations: observations.filter(o => o.title)
      };
      const newInsp: any = await inspectionsApi.create(payload);

      if (evidenceFile) {
        const ef = new FormData();
        ef.append('file', evidenceFile);
        ef.append('caption', evidenceCaption);
        ef.append('latitude', formData.latitude.toString());
        ef.append('longitude', formData.longitude.toString());
        await inspectionsApi.uploadEvidence(newInsp.id, ef).catch(() => {});
      }

      setInspectionList(prev => [newInsp, ...prev]);
      setShowForm(false);
      setEvidenceFile(null);

      const result: any = await inspectionsApi.submit(newInsp.id);
      setInspectionList(prev => prev.map(i => i.id === newInsp.id ? {
        ...i,
        workflow_stage: result.workflow_stage,
        compliance_score: result.compliance_score,
        risk_level: result.risk_level,
        ai_risk_score: result.ai_risk_score,
        ai_risk_category: result.ai_risk_category
      } : i));

      setSubmitMsg(`Inspection submitted! AI Risk: ${result.ai_risk_category || result.risk_level} (${result.compliance_score}% Compliance)`);
    } catch (e: any) {
      alert('Failed: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManagerReview = async (dataIsOk: boolean) => {
    if (!selected) return;
    setReviewing(true);
    try {
      const fd = new FormData();
      fd.append('data_is_ok', dataIsOk ? 'true' : 'false');
      fd.append('notes', mmNotes || (dataIsOk ? 'Validated under Coal Mines Regulations 2017' : 'Returned for correction'));
      const res: any = await inspectionsApi.managerReview(selected.id, fd);
      setInspectionList(prev => prev.map(i => i.id === selected.id ? { ...i, workflow_stage: res.workflow_stage } : i));
      setSelected((s: any) => ({ ...s, workflow_stage: res.workflow_stage }));
      setMmNotes('');
      alert(dataIsOk ? 'Inspection validated! Report routed to Corporate.' : 'Inspection returned for correction.');
    } catch (e: any) {
      alert('Review failed: ' + e.message);
    } finally {
      setReviewing(false);
    }
  };

  const stageOrder = WORKFLOW_STAGES.map(s => s.key);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              DGMS Field Inspection
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Field Inspections & On-Site Audits</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Field Officer inspects & records violations with photos &rarr; AI Risk Engine analyzes severity &rarr; Mine Manager reviews & issues CAPA
          </p>
        </div>
        {isFieldOfficer && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <Plus size={16} /> New Field Inspection
          </button>
        )}
      </div>

      {submitMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 text-sm font-semibold">
            <CheckCircle size={15} className="text-emerald-600" />
            {submitMsg}
          </div>
          <button onClick={() => setSubmitMsg('')} className="text-xs text-slate-400 hover:text-slate-600">x</button>
        </div>
      )}

      {loading ? <LoadingState /> : (
        <div className="section-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Inspection Ref</th>
                <th>Mine</th>
                <th>Contractor</th>
                <th>Type</th>
                <th>Inspector</th>
                <th>Date</th>
                <th>Compliance</th>
                <th>AI Risk</th>
                <th>Workflow Stage</th>
              </tr>
            </thead>
            <tbody>
              {inspectionList.length === 0 ? (
                <tr><td colSpan={9}><EmptyState message="No inspections found" /></td></tr>
              ) : inspectionList.map(insp => (
                <tr key={insp.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => openDetail(insp)}>
                  <td className="font-mono text-xs text-blue-700 font-bold">{insp.inspection_number}</td>
                  <td className="text-slate-800 text-sm font-medium">{insp.mine_name}</td>
                  <td className="text-slate-500 text-xs">{insp.contractor_name || 'Direct / Multi'}</td>
                  <td className="text-xs text-slate-600">{insp.inspection_type}</td>
                  <td className="text-xs text-slate-500">{insp.officer_name || 'Field Officer'}</td>
                  <td className="text-xs text-slate-500">{formatDateTime(insp.inspection_date)}</td>
                  <td>
                    <div className="w-24">
                      <ComplianceBar score={insp.compliance_score ?? 0} />
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={insp.ai_risk_category || insp.risk_level || 'LOW'} />
                  </td>
                  <td>
                    <StatusBadge status={getWorkflowStageLabel(insp.workflow_stage)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Inspection Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Conduct New Field Inspection" size="lg">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Record observations, verify statutory checklists, register violations, and upload geo-tagged photo evidence.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Mine / Site</label>
              <select
                className="form-select text-xs"
                value={formData.mine_id}
                onChange={e => setFormData({ ...formData, mine_id: e.target.value })}
              >
                <option value="">Select Mine...</option>
                {minesList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Contractor (Optional)</label>
              <select
                className="form-select text-xs"
                value={formData.contractor_id}
                onChange={e => setFormData({ ...formData, contractor_id: e.target.value })}
              >
                <option value="">Direct Operations / Select Contractor...</option>
                {contractorsList.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Inspection Type</label>
              <select
                className="form-select text-xs"
                value={formData.inspection_type}
                onChange={e => setFormData({ ...formData, inspection_type: e.target.value })}
              >
                <option value="Safety">Safety Audit</option>
                <option value="Environment">Environmental Compliance</option>
                <option value="Contractor Compliance">Contractor Compliance</option>
                <option value="Labour Compliance">Labour & Health (PME)</option>
                <option value="Equipment">Equipment Fitness</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Location / Tag</label>
              <input
                type="text"
                className="form-input text-xs"
                placeholder="e.g. Sector 2B Main Pit Face & Haulage Ramp"
                value={formData.location_tag}
                onChange={e => setFormData({ ...formData, location_tag: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
            <div className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <Camera size={14} className="text-blue-600" />
              On-Site Photo Evidence & Geo-Tagging
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setEvidenceFile(e.target.files?.[0] || null)}
                  className="form-input text-xs"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Photo caption..."
                  value={evidenceCaption}
                  onChange={e => setEvidenceCaption(e.target.value)}
                  className="form-input text-xs"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="form-label mb-2">Statutory Inspection Checklist</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {checklist.map((item, idx) => (
                <div key={item.item_key} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
                  <input
                    type="checkbox"
                    id={`chk-${idx}`}
                    checked={item.is_compliant}
                    onChange={e => setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, is_compliant: e.target.checked } : c))}
                    className="accent-blue-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor={`chk-${idx}`} className="text-xs text-slate-700 cursor-pointer font-medium">{item.item_title}</label>
                    <div className="text-[9px] text-slate-400">{item.category}</div>
                  </div>
                  {!item.is_compliant && (
                    <input
                      className="form-input text-xs py-1 w-48"
                      placeholder="Violation remarks..."
                      value={item.remarks}
                      onChange={e => setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, remarks: e.target.value } : c))}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label">Identified Violations / Observations</label>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setObservations(prev => [...prev, { title: '', description: '', category: 'Safety', severity: 'HIGH', requires_action: true }])}
              >
                + Add Observation
              </button>
            </div>
            {observations.map((obs, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 mb-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <input
                  className="form-input text-xs"
                  placeholder="Violation Title"
                  value={obs.title}
                  onChange={e => setObservations(prev => prev.map((o, j) => j === i ? { ...o, title: e.target.value } : o))}
                />
                <select
                  className="form-select text-xs"
                  value={obs.severity}
                  onChange={e => setObservations(prev => prev.map((o, j) => j === i ? { ...o, severity: e.target.value } : o))}
                >
                  <option value="LOW">LOW Severity</option>
                  <option value="MEDIUM">MEDIUM Severity</option>
                  <option value="HIGH">HIGH Severity</option>
                  <option value="CRITICAL">CRITICAL Severity</option>
                </select>
                <textarea
                  className="form-input text-xs col-span-2"
                  rows={2}
                  placeholder="Describe violation and exact location..."
                  value={obs.description}
                  onChange={e => setObservations(prev => prev.map((o, j) => j === i ? { ...o, description: e.target.value } : o))}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleCreateInspection} disabled={submitting} className="btn-primary text-xs">
              {submitting ? <><Loader size={14} className="animate-spin" /> Submitting...</> : <><Send size={14} /> Submit Inspection Report</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* Inspection Detail Modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setLoadingDetail(false); }} title={selected?.inspection_number || 'Inspection Detail'} size="lg">
        {selected && (
          <div className="space-y-4">
            {/* Status header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={getWorkflowStageLabel(selected.workflow_stage)} />
                <StatusBadge status={selected.ai_risk_category || selected.risk_level || 'LOW'} />
                {selected.inspection_type && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase">
                    {selected.inspection_type}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">Score: <strong className="text-slate-900">{selected.compliance_score ?? 'N/A'}%</strong></span>
            </div>

            {loadingDetail && (
              <div className="flex items-center gap-2 text-xs text-blue-600 animate-pulse">
                <Loader size={13} className="animate-spin" /> Loading full inspection details with evidence & findings...
              </div>
            )}

            {/* Core info */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 border border-slate-200 rounded-xl p-4">
              {[
                ['Mine', selected.mine_name],
                ['Contractor', selected.contractor_name || 'Direct Operations'],
                ['Field Inspector', selected.officer_name || 'Field Officer'],
                ['Inspection Type', selected.inspection_type],
                ['Inspection Date', formatDateTime(selected.inspection_date)],
                ['Location Tag', selected.location_tag || '—'],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">{k}</div>
                  <div className="text-slate-800 text-sm mt-0.5 font-medium">{v}</div>
                </div>
              ))}
            </div>

            {/* Workflow Stage Progress Tracker */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
              <div className="text-xs font-bold text-violet-800 mb-2 flex items-center gap-1.5">
                <ShieldAlert size={13} /> Workflow Stage Progress
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {WORKFLOW_STAGES.map((stage, idx) => {
                  const currentIdx = stageOrder.indexOf(selected.workflow_stage);
                  const thisIdx = stageOrder.indexOf(stage.key);
                  const isPast = thisIdx < currentIdx;
                  const isCurrent = stage.key === selected.workflow_stage;
                  return (
                    <div key={stage.key} className="flex items-center gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border whitespace-nowrap ${
                        isCurrent ? 'bg-violet-600 text-white border-violet-600' :
                        isPast ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                        {isCurrent ? '► ' : isPast ? '✓ ' : ''}{stage.label}
                      </span>
                      {idx < WORKFLOW_STAGES.length - 1 && <span className="text-slate-300 text-xs">›</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Risk Assessment */}
            {(selected.ai_risk_score !== undefined || selected.ai_risk_category || selected.risk_level) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                    <Brain size={13} /> AI-Assisted Risk Engine Analysis
                  </span>
                  {selected.ai_risk_score !== undefined && (
                    <span className="text-base font-bold text-slate-900">{selected.ai_risk_score}/100 Risk Index</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={selected.ai_risk_category || selected.risk_level || 'LOW'} />
                  {selected.compliance_score !== undefined && (
                    <span className="text-xs text-slate-600">Compliance Score: <strong>{selected.compliance_score}%</strong></span>
                  )}
                </div>
                {(selected.ai_factors || []).length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {(selected.ai_factors || []).map((f: string, i: number) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                        <span className="text-red-500">•</span> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] text-slate-500 mt-2 italic">
                  AI assists with risk/severity synthesis. Mine Manager decides regulatory corrective action.
                </p>
              </div>
            )}

            {/* Findings / Violations */}
            {selected.observations && selected.observations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-orange-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Findings & Violations ({selected.observations.length})
                  </h4>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {selected.observations.map((obs: any, i: number) => (
                    <div key={obs.id || i} className={`p-3 rounded-lg border text-xs ${
                      obs.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                      obs.severity === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                      obs.severity === 'MEDIUM' ? 'bg-amber-50 border-amber-200' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-bold text-slate-900">{obs.title}</div>
                          {obs.description && (
                            <p className="text-slate-600 mt-0.5 leading-relaxed">{obs.description}</p>
                          )}
                        </div>
                        <StatusBadge status={obs.severity || 'MEDIUM'} />
                      </div>
                      {obs.category && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          Category: <span className="font-semibold">{obs.category}</span>
                          {obs.requires_action && <span className="ml-2 text-red-600 font-bold">• Action Required</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Photos */}
            {selected.evidence && selected.evidence.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Camera size={14} className="text-teal-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Geo-Tagged Evidence ({selected.evidence.length} photo{selected.evidence.length !== 1 ? 's' : ''})
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {selected.evidence.map((ev: any, i: number) => (
                    <div key={ev.id || i} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      {ev.file_path ? (
                        <img src={ev.file_path} alt={ev.caption || 'Evidence'} className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 bg-slate-100 flex flex-col items-center justify-center">
                          <ImageIcon size={24} className="text-slate-400" />
                          <span className="text-[10px] text-slate-400 mt-1">Photo on file</span>
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-[11px] font-semibold text-slate-800 truncate">{ev.caption || 'Photo Evidence'}</p>
                        {ev.latitude && ev.longitude && (
                          <p className="text-[10px] text-slate-500 flex items-center gap-0.5 mt-0.5">
                            <MapPin size={9} /> {Number(ev.latitude).toFixed(4)}, {Number(ev.longitude).toFixed(4)}
                          </p>
                        )}
                        {ev.captured_at && (
                          <p className="text-[10px] text-slate-400">{formatDateTime(ev.captured_at)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklists */}
            {selected.checklists && selected.checklists.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={13} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Checklist Observations</span>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {selected.checklists.map((c: any) => (
                    <div key={c.id || c.item_key} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${c.is_compliant ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <span>{c.is_compliant ? '✅' : '❌'}</span>
                      <div className="flex-1">
                        <div className="text-slate-800 font-medium">{c.item_title}</div>
                        {c.remarks && <div className="text-[10px] text-red-600 mt-0.5">{c.remarks}</div>}
                      </div>
                      <span className="text-[9px] text-slate-400">{c.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mine Manager Review Gateway */}
            {isMineManager && selected.workflow_stage === 'UNDER_MINE_MANAGER_REVIEW' && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="text-xs font-bold text-violet-700 uppercase tracking-wide">
                  Mine Manager Review & CAPA Decision Gateway
                </div>
                <p className="text-xs text-slate-500">
                  Validate the field officer's inspection data to generate the statutory compliance PDF report, or issue CAPAs for flagged violations.
                </p>
                <textarea
                  className="form-input text-xs"
                  rows={2}
                  value={mmNotes}
                  onChange={e => setMmNotes(e.target.value)}
                  placeholder="Mine Manager validation remarks and statutory instructions..."
                />
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleManagerReview(true)}
                    disabled={reviewing}
                    className="btn-success text-xs"
                  >
                    <CheckCircle size={14} /> Validate & Generate Official Report
                  </button>
                  <button
                    onClick={() => navigate('/corrective-actions')}
                    className="btn-primary text-xs"
                  >
                    <Wrench size={14} /> Issue CAPA for Violations
                  </button>
                  <button
                    onClick={() => handleManagerReview(false)}
                    disabled={reviewing}
                    className="btn-danger text-xs"
                  >
                    Return for Correction
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
