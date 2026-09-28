import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, MapPin, AlertTriangle, Camera,
  CheckCircle, ArrowRight, Clock, ShieldAlert, Eye
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
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
              Field Officer Operations
            </span>
            <span className="text-xs text-coal-400 font-medium">📍 {assignedMine}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Field Inspections & Audits Dashboard</h1>
          <p className="text-coal-500 text-sm mt-0.5">
            Conduct on-site inspections, log safety checklist items, capture geo-tagged evidence, and trigger AI risk evaluations.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/inspections')} className="btn-primary text-xs">
            <Plus size={14} /> Start Inspection
          </button>
          <button onClick={() => navigate('/inspections')} className="btn-secondary text-xs">
            <ClipboardList size={13} /> My Inspections
          </button>
          <button onClick={() => navigate('/inspections')} className="btn-secondary text-xs">
            <Camera size={13} /> Inspection Evidence
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          label="Assigned Mine"
          value={assignedMine.split(' ')[0]}
          icon={<MapPin size={20} className="text-blue-400" />}
          iconBg="bg-blue-500/10"
        />
        <KPICard
          label="Pending / Draft"
          value={pendingInspections}
          icon={<Clock size={20} className="text-amber-400" />}
          iconBg="bg-amber-500/10"
          onClick={() => navigate('/inspections')}
        />
        <KPICard
          label="Submitted Audits"
          value={completedInspections}
          icon={<CheckCircle size={20} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
          onClick={() => navigate('/inspections')}
        />
        <KPICard
          label="Open Findings"
          value={totalFindings}
          icon={<AlertTriangle size={20} className="text-orange-400" />}
          iconBg="bg-orange-500/10"
        />
        <KPICard
          label="High Severity"
          value={highSeverityFindings}
          icon={<ShieldAlert size={20} className="text-red-400" />}
          iconBg="bg-red-500/10"
        />
        <KPICard
          label="Geo Evidence Photos"
          value={totalEvidence}
          icon={<Camera size={20} className="text-cyan-400" />}
          iconBg="bg-cyan-500/10"
        />
      </div>

      {/* Recent Inspections Table */}
      <SectionCard
        title="My Recent Field Inspections"
        icon={<ClipboardList size={16} className="text-amber-400" />}
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
                    className="cursor-pointer hover:bg-coal-800/40"
                  >
                    <td className="font-mono text-xs text-coal-400 font-semibold">{insp.inspection_number}</td>
                    <td className="text-xs text-coal-200">{insp.location_tag || 'Main Pit'}</td>
                    <td className="text-xs text-coal-300">{insp.inspection_type}</td>
                    <td className="text-xs text-coal-500">{formatDateTime(insp.inspection_date)}</td>
                    <td>
                      <div className="w-20">
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
      <div className="bg-coal-900 border border-coal-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">
          Field Officer Standard Statutory Checklist & Protocol
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-coal-400">
          <div className="bg-coal-800/40 rounded-lg p-3 border border-coal-700/30">
            <div className="text-white font-semibold mb-1">1. DGMS Regulation 115</div>
            <p>Ensure haul road berm height is at least equal to largest tyre radius operating on the bench.</p>
          </div>
          <div className="bg-coal-800/40 rounded-lg p-3 border border-coal-700/30">
            <div className="text-white font-semibold mb-1">2. Auto Visual Warning (AVRA)</div>
            <p>Verify audible audio-visual reverse alarm functional on all heavy earthmoving machinery.</p>
          </div>
          <div className="bg-coal-800/40 rounded-lg p-3 border border-coal-700/30">
            <div className="text-white font-semibold mb-1">3. Environmental Dust Suppression</div>
            <p>Confirm operational water mist tankers and bowsers deployed along active hauling corridors.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
