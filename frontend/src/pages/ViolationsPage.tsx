import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Filter, Plus, Wrench, CheckCircle } from 'lucide-react';
import { violations as violationsApi, correctiveActions as caApi } from '../services/api';
import { SectionCard, StatusBadge, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';
import { formatDateTime } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

export default function ViolationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [violationList, setViolationList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // CAPA Issuance Modal
  const [showCapaModal, setShowCapaModal] = useState(false);
  const [capaForm, setCapaForm] = useState({
    title: '',
    description: '',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    assigned_to: 'Contractor Site In-Charge'
  });
  const [issuing, setIssuing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const isMineManager = user?.role === 'MINE MANAGER' || user?.role === 'CORPORATE MANAGEMENT';

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filterSeverity) params.severity = filterSeverity;
    if (filterStatus) params.status = filterStatus;
    setLoading(true);
    violationsApi.list(params).then((data: any) => {
      setViolationList(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filterSeverity, filterStatus]);

  const counts = {
    CRITICAL: violationList.filter(v => v.severity === 'CRITICAL').length,
    HIGH: violationList.filter(v => v.severity === 'HIGH').length,
    OPEN: violationList.filter(v => v.status === 'OPEN').length,
    RESOLVED: violationList.filter(v => v.status === 'RESOLVED').length,
  };

  const openCapaModal = (v: any) => {
    setSelected(v);
    setCapaForm({
      title: `Remediation Directive: ${v.title}`,
      description: `Mandatory rectification of violation (${v.violation_code}): ${v.description}. Strict compliance under DGMS regulation reference: ${v.regulation_reference}.`,
      priority: v.severity || 'HIGH',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      assigned_to: v.contractor_name ? `${v.contractor_name} Site In-Charge` : 'Contractor Site In-Charge'
    });
    setShowCapaModal(true);
  };

  const handleIssueCapa = async () => {
    if (!selected) return;
    setIssuing(true);
    try {
      await caApi.create({
        violation_id: selected.id,
        mine_id: selected.mine_id,
        contractor_id: selected.contractor_id,
        title: capaForm.title,
        description: capaForm.description,
        priority: capaForm.priority,
        due_date: new Date(capaForm.due_date).toISOString(),
        assigned_to: capaForm.assigned_to
      });
      setShowCapaModal(false);
      setSuccessMsg(`CAPA successfully issued for violation ${selected.violation_code}!`);
      // Update violation status in local state to IN_CORRECTION
      setViolationList(prev => prev.map(v => v.id === selected.id ? { ...v, status: 'IN_CORRECTION' } : v));
      if (selected) setSelected((s: any) => ({ ...s, status: 'IN_CORRECTION' }));
    } catch (e: any) {
      alert('Failed to issue CAPA: ' + e.message);
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Violation Register</h1>
          <p className="text-coal-500 text-sm mt-0.5">Statutory compliance violations & corrective action assignment</p>
        </div>
        <div className="flex gap-2">
          <select className="form-select text-sm w-36" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
          </select>
          <select className="form-select text-sm w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_CORRECTION">IN CORRECTION</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-900/30 border border-emerald-800/60 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
            <CheckCircle size={16} className="text-emerald-400" />
            {successMsg}
          </div>
          <button onClick={() => navigate('/corrective-actions')} className="text-xs text-cil-light underline font-semibold">
            View in CAPA Manager →
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'CRITICAL', value: counts.CRITICAL, color: 'text-red-400 bg-red-900/20 border-red-800/40' },
          { label: 'HIGH Risk', value: counts.HIGH, color: 'text-orange-400 bg-orange-900/20 border-orange-800/40' },
          { label: 'Open', value: counts.OPEN, color: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/40' },
          { label: 'Resolved', value: counts.RESOLVED, color: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/40' },
        ].map(s => (
          <div key={s.label} className={`kpi-card border ${s.color}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? <LoadingState /> : violationList.length === 0 ? <EmptyState message="No violations found" /> : (
        <div className="section-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Violation</th>
                <th>Category</th>
                <th>Mine</th>
                <th>Contractor</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {violationList.map(v => (
                <tr key={v.id} className="cursor-pointer" onClick={() => setSelected(v)}>
                  <td className="font-mono text-[10px] text-coal-500">{v.violation_code}</td>
                  <td>
                    <div className="text-sm font-semibold text-coal-200 max-w-[220px] truncate">{v.title}</div>
                    <div className="text-[10px] text-coal-600 truncate max-w-[220px]">{v.regulation_reference}</div>
                  </td>
                  <td className="text-xs text-coal-400">{v.category}</td>
                  <td className="text-xs text-coal-400">{v.mine_name}</td>
                  <td className="text-xs text-coal-400">{v.contractor_name || '—'}</td>
                  <td><StatusBadge status={v.severity} /></td>
                  <td><StatusBadge status={v.status} /></td>
                  <td>
                    {isMineManager && v.status === 'OPEN' ? (
                      <button
                        onClick={e => { e.stopPropagation(); openCapaModal(v); }}
                        className="btn-primary text-xs py-1 px-2.5"
                      >
                        <Wrench size={12} /> Issue CAPA
                      </button>
                    ) : (
                      <span className="text-[11px] text-coal-500">{v.status === 'RESOLVED' ? 'Resolved' : 'In Correction'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Violation Detail Modal */}
      <Modal open={!!selected && !showCapaModal} onClose={() => setSelected(null)} title={selected?.violation_code || 'Violation'} size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.severity} />
                <StatusBadge status={selected.status} />
              </div>
              {isMineManager && selected.status === 'OPEN' && (
                <button
                  onClick={() => openCapaModal(selected)}
                  className="btn-primary text-xs py-1 px-3"
                >
                  <Wrench size={13} /> Issue CAPA
                </button>
              )}
            </div>
            <h3 className="text-base font-bold text-white">{selected.title}</h3>
            <div className="bg-coal-800/60 rounded-xl p-4 space-y-2 text-sm">
              <div><span className="text-coal-500 text-xs">Statutory Reference:</span><p className="text-coal-200 mt-0.5">{selected.regulation_reference}</p></div>
              <div><span className="text-coal-500 text-xs">Description:</span><p className="text-coal-200 mt-0.5">{selected.description}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-coal-500 text-xs">Mine:</span><p className="text-coal-200">{selected.mine_name}</p></div>
                <div><span className="text-coal-500 text-xs">Contractor:</span><p className="text-coal-200">{selected.contractor_name || '—'}</p></div>
                <div><span className="text-coal-500 text-xs">Detected:</span><p className="text-coal-200">{formatDateTime(selected.detected_at)}</p></div>
                {selected.resolved_at && <div><span className="text-coal-500 text-xs">Resolved:</span><p className="text-coal-200">{formatDateTime(selected.resolved_at)}</p></div>}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Issue CAPA Direct Modal */}
      <Modal open={showCapaModal} onClose={() => setShowCapaModal(false)} title={`Issue CAPA: ${selected?.violation_code || ''}`} size="md">
        <div className="space-y-4">
          <div className="text-xs text-coal-400 bg-coal-800/40 p-3 rounded-lg">
            <strong>Target Violation:</strong> {selected?.title} ({selected?.mine_name})
          </div>
          <div>
            <label className="form-label">Action / Directive Title</label>
            <input
              type="text"
              className="form-input text-xs"
              value={capaForm.title}
              onChange={e => setCapaForm({ ...capaForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Corrective Directive Description</label>
            <textarea
              className="form-input text-xs"
              rows={3}
              value={capaForm.description}
              onChange={e => setCapaForm({ ...capaForm, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Priority</label>
              <select
                className="form-select text-xs"
                value={capaForm.priority}
                onChange={e => setCapaForm({ ...capaForm, priority: e.target.value })}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div>
              <label className="form-label">Remediation Deadline</label>
              <input
                type="date"
                className="form-input text-xs"
                value={capaForm.due_date}
                onChange={e => setCapaForm({ ...capaForm, due_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Assignee</label>
            <input
              type="text"
              className="form-input text-xs"
              value={capaForm.assigned_to}
              onChange={e => setCapaForm({ ...capaForm, assigned_to: e.target.value })}
            />
          </div>
          <div className="flex gap-2 justify-end pt-3 border-t border-coal-800">
            <button onClick={() => setShowCapaModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleIssueCapa} disabled={issuing} className="btn-primary text-xs">
              <Plus size={14} /> Assign CAPA to Contractor
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
