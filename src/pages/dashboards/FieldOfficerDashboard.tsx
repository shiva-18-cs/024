import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, MapPin, AlertTriangle, Camera,
  CheckCircle, ArrowRight, Clock, ShieldAlert, Eye, Map
} from 'lucide-react';
import { dashboard, inspections as inspectionsApi } from '../../services/api';
import { KPICard, SectionCard, StatusBadge, ComplianceBar, LoadingState, EmptyState } from '../../components/ui/UIComponents';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime, getWorkflowStageLabel } from '../../utils/helpers';

export default function FieldOfficerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [myInspections, setMyInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboard.stats(),
      inspectionsApi.list().catch(() => [])
    ]).then(([statsData, inspData]: any) => {
      setStats(statsData);
      setMyInspections(inspData || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState message="Loading Field Operations Dashboard..." />;
  }

  const rKpis = stats?.role_kpis || {};
  const kpis = stats?.kpis || {};

  const assignedMine = rKpis.assigned_mine || user?.mine_name || 'Rajmahal Open Cast Project';
  const pendingInspections = rKpis.pending_inspections ?? rKpis.draft_inspections ?? myInspections.filter(i => i.workflow_stage === 'DRAFT').length;
  const completedInspections = rKpis.completed_inspections ?? rKpis.submitted_inspections ?? myInspections.filter(i => i.workflow_stage !== 'DRAFT').length;
  const totalFindings = rKpis.total_observations ?? rKpis.open_findings ?? 0;
  const highSeverityFindings = rKpis.high_severity_findings ?? 0;
  const totalEvidence = rKpis.total_evidence ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide">
              Field Officer Operations
            </span>
            <span className="text-xs text-slate-500 font-medium">📍 {assignedMine}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Field Inspections & Audits Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Conduct on-site inspections, log safety checklist items, capture geo-tagged evidence, and trigger AI risk evaluations.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/field-officer/gis')} className="btn-secondary text-xs">
            <Map size={14} /> GIS Analysis
          </button>
          <button onClick={() => navigate('/inspections')} className="btn-primary text-xs">
            <Plus size={14} /> Start Inspection
          </button>
          <button onClick={() => navigate('/inspections')} className="btn-secondary text-xs">
            <ClipboardList size={14} /> My Inspections
          </button>
          <button onClick={() => navigate('/inspections')} className="btn-secondary text-xs">
            <Camera size={14} /> Inspection Evidence
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          label="Assigned Mine"
          value={assignedMine.split(' ')[0]}
          icon={<MapPin size={20} className="text-blue-700" />}
          iconBg="bg-blue-50"
        />
        <KPICard
          label="Pending / Draft"
          value={pendingInspections}
          icon={<Clock size={20} className="text-amber-700" />}
          iconBg="bg-amber-50"
          onClick={() => navigate('/inspections')}
        />
        <KPICard
          label="Submitted Audits"
          value={completedInspections}
          icon={<CheckCircle size={20} className="text-emerald-700" />}
          iconBg="bg-emerald-50"
          onClick={() => navigate('/inspections')}
        />
        <KPICard
          label="Open Findings"
          value={totalFindings}
          icon={<AlertTriangle size={20} className="text-orange-700" />}
          iconBg="bg-orange-50"
        />
        <KPICard
          label="High Severity"
          value={highSeverityFindings}
          icon={<ShieldAlert size={20} className="text-red-700" />}
          iconBg="bg-red-50"
        />
        <KPICard
          label="Geo Evidence Photos"
          value={totalEvidence}
          icon={<Camera size={20} className="text-teal-700" />}
          iconBg="bg-teal-50"
        />
      </div>

      {/* Recent Inspections Table */}
      <SectionCard
        title="My Recent Field Inspections"
        icon={<ClipboardList size={16} className="text-blue-700" />}
        actions={
          <button onClick={() => navigate('/inspections')} className="btn-ghost text-xs">
            View All Inspections <ArrowRight size={12} />
          </button>
        }
      >
        {myInspections.length === 0 ? (
          <EmptyState message="No field inspections recorded yet. Start your first on-site audit." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Inspection Ref</th>
                  <th>Location / Tag</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Compliance</th>
                  <th>AI Risk</th>
                  <th>Workflow Stage</th>
                </tr>
              </thead>
              <tbody>
                {myInspections.slice(0, 6).map(insp => (
                  <tr
                    key={insp.id}
                    onClick={() => navigate('/inspections')}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="font-mono text-xs text-blue-700 font-bold">{insp.inspection_number}</td>
                    <td className="text-xs text-slate-800 font-medium">{insp.location_tag || 'Main Pit'}</td>
                    <td className="text-xs text-slate-600">{insp.inspection_type}</td>
                    <td className="text-xs text-slate-500">{formatDateTime(insp.inspection_date)}</td>
                    <td>
                      <div className="w-24">
                        <ComplianceBar score={insp.compliance_score} />
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={insp.ai_risk_category || insp.risk_level} />
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
      </SectionCard>

      {/* Inspection Field Protocol Guidance */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-card">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          Field Officer Standard Statutory Checklist & Protocol
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <div className="text-slate-900 font-bold mb-1">1. DGMS Regulation 115</div>
            <p className="leading-relaxed">Ensure haul road berm height is at least equal to largest tyre radius operating on the bench.</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <div className="text-slate-900 font-bold mb-1">2. Auto Visual Warning (AVRA)</div>
            <p className="leading-relaxed">Verify audible audio-visual reverse alarm functional on all heavy earthmoving machinery.</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <div className="text-slate-900 font-bold mb-1">3. Environmental Dust Suppression</div>
            <p className="leading-relaxed">Confirm operational water mist tankers and bowsers deployed along active hauling corridors.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
