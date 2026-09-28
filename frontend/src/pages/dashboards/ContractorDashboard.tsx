import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, FileText, Users, ShieldCheck, AlertTriangle,
  Wrench, Upload, UserPlus, Eye, ArrowRight, Bell, CheckCircle, Clock
} from 'lucide-react';
import { dashboard, correctiveActions as caApi, violations as viosApi } from '../../services/api';
import { KPICard, SectionCard, StatusBadge, ComplianceBar, LoadingState, EmptyState } from '../../components/ui/UIComponents';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatDateTime } from '../../utils/helpers';

export default function ContractorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [capasList, setCapasList] = useState<any[]>([]);
  const [violationsList, setViolationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboard.stats(),
      caApi.list().catch(() => []),
      viosApi.list({ status: 'OPEN' }).catch(() => [])
    ]).then(([statsData, capasData, viosData]: any) => {
      setStats(statsData);
      setCapasList(capasData || []);
      setViolationsList(viosData || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState message="Loading Contractor Compliance Dashboard..." />;
  }

  const rKpis = stats?.role_kpis || {};
  const kpis = stats?.kpis || {};
  const recentAlerts = stats?.recent_alerts || [];

  const totalMines = rKpis.assigned_mines ?? rKpis.total_mines ?? kpis.total_mines ?? 1;
  const totalContracts = rKpis.total_contracts ?? rKpis.my_contracts ?? kpis.total_contracts ?? 1;
  const totalWorkers = rKpis.total_workers ?? kpis.total_workers ?? 0;
  const complianceScore = rKpis.compliance_percent ?? rKpis.compliance_score ?? kpis.compliance_percent ?? 85.0;
  const openViolations = rKpis.open_violations ?? rKpis.assigned_violations ?? kpis.open_violations ?? 0;
  const highRiskCases = rKpis.high_risk_cases ?? 0;
  const overdueActions = rKpis.overdue_actions ?? rKpis.overdue_capas ?? kpis.overdue_actions ?? 0;
  const totalInspections = rKpis.total_inspections ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase">
              Contractor Portal
            </span>
            {user?.contractor_name && (
              <span className="text-xs text-coal-400 font-medium">🏭 {user.contractor_name}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Contractor Compliance Dashboard</h1>
          <p className="text-coal-500 text-sm mt-0.5">
            Monitor contractor obligations, worker statutory compliance, assigned violations, and CAPA resolution proofs.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/documents')} className="btn-secondary text-xs">
            <Upload size={13} /> Upload Documents
          </button>
          <button onClick={() => navigate('/workers')} className="btn-secondary text-xs">
            <UserPlus size={13} /> Register Workers
          </button>
          <button onClick={() => navigate('/corrective-actions')} className="btn-primary text-xs">
            <Wrench size={13} /> Submit CAPA Proof
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Mines"
          value={totalMines}
          icon={<Building2 size={22} className="text-blue-400" />}
          iconBg="bg-blue-500/10"
        />
        {/* Strictly TOTAL CONTRACTS label */}
        <KPICard
          label="TOTAL CONTRACTS"
          value={totalContracts}
          icon={<FileText size={22} className="text-teal-400" />}
          iconBg="bg-teal-500/10"
        />
        <KPICard
          label="Total Workers"
          value={totalWorkers}
          icon={<Users size={22} className="text-violet-400" />}
          iconBg="bg-violet-500/10"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Compliance %"
          value={`${complianceScore}%`}
          icon={<ShieldCheck size={22} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
        />
        <KPICard
          label="Open Violations"
          value={openViolations}
          icon={<AlertTriangle size={22} className="text-red-400" />}
          iconBg="bg-red-500/10"
          onClick={() => navigate('/violations')}
        />
        <KPICard
          label="High Risk Cases"
          value={highRiskCases}
          icon={<AlertTriangle size={22} className="text-amber-400" />}
          iconBg="bg-amber-500/10"
        />
        <KPICard
          label="Overdue Actions"
          value={overdueActions}
          icon={<Clock size={22} className="text-rose-400" />}
          iconBg="bg-rose-500/10"
          onClick={() => navigate('/corrective-actions')}
        />
        <KPICard
          label="Contractor Inspections"
          value={totalInspections}
          icon={<CheckCircle size={22} className="text-sky-400" />}
          iconBg="bg-sky-500/10"
        />
      </div>

      {/* Main Content Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Assigned Corrective Actions */}
        <SectionCard
          title="Assigned Corrective Actions (CAPAs)"
          icon={<Wrench size={16} className="text-cil-blue" />}
          actions={
            <button onClick={() => navigate('/corrective-actions')} className="btn-ghost text-xs">
              View All <ArrowRight size={12} />
            </button>
          }
        >
          {capasList.length === 0 ? (
            <EmptyState message="No pending corrective actions assigned." />
          ) : (
            <div className="space-y-3">
              {capasList.slice(0, 5).map(ca => (
                <div
                  key={ca.id}
                  onClick={() => navigate('/corrective-actions')}
                  className="flex items-center justify-between p-3 bg-coal-800/40 hover:bg-coal-800/80 border border-coal-700/50 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-coal-400 font-semibold">{ca.action_code}</span>
                      <StatusBadge status={ca.priority} />
                    </div>
                    <p className="text-xs font-medium text-coal-200 truncate">{ca.title}</p>
                    <p className="text-[10px] text-coal-500 mt-0.5">Due: {formatDate(ca.due_date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadge status={ca.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Assigned Violations */}
        <SectionCard
          title="Assigned Statutory Violations"
          icon={<AlertTriangle size={16} className="text-amber-400" />}
          actions={
            <button onClick={() => navigate('/violations')} className="btn-ghost text-xs">
              View All <ArrowRight size={12} />
            </button>
          }
        >
          {violationsList.length === 0 ? (
            <EmptyState message="No open statutory violations logged against your contracts." />
          ) : (
            <div className="space-y-3">
              {violationsList.slice(0, 5).map(v => (
                <div
                  key={v.id}
                  onClick={() => navigate('/violations')}
                  className="flex items-center justify-between p-3 bg-coal-800/40 hover:bg-coal-800/80 border border-coal-700/50 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-coal-700 text-coal-300 font-mono">
                        {v.category}
                      </span>
                      <StatusBadge status={v.severity} />
                    </div>
                    <p className="text-xs font-medium text-coal-200 truncate">{v.title}</p>
                    <p className="text-[10px] text-coal-500 mt-0.5">Ref: {v.regulation_reference || 'DGMS / CMR'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadge status={v.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Notifications & Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard
          title="Active Contractor Alerts"
          icon={<Bell size={16} className="text-yellow-400" />}
          className="lg:col-span-2"
          actions={
            <button onClick={() => navigate('/alerts')} className="btn-ghost text-xs">
              All Alerts <ArrowRight size={12} />
            </button>
          }
        >
          {recentAlerts.length === 0 ? (
            <EmptyState message="No active alerts for this contractor." />
          ) : (
            <div className="space-y-2">
              {recentAlerts.slice(0, 4).map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 p-3 bg-coal-800/50 rounded-xl border border-coal-800">
                  <div className="w-2 h-2 rounded-full mt-1.5 bg-yellow-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-coal-200 truncate">{a.title}</p>
                    <p className="text-[10px] text-coal-400 mt-0.5 line-clamp-1">{a.message}</p>
                  </div>
                  <span className="text-[9px] text-coal-500 font-mono">{formatDateTime(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Quick Operations Panel */}
        <SectionCard title="Quick Contractor Actions" icon={<CheckCircle size={16} className="text-emerald-400" />}>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/documents')}
              className="w-full flex items-center justify-between p-3 bg-coal-800/60 hover:bg-coal-800 border border-coal-700/40 rounded-xl text-left transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-white">Upload Statutory Docs</div>
                <div className="text-[10px] text-coal-400">License, insurance, environmental permits</div>
              </div>
              <ArrowRight size={14} className="text-coal-400" />
            </button>

            <button
              onClick={() => navigate('/workers')}
              className="w-full flex items-center justify-between p-3 bg-coal-800/60 hover:bg-coal-800 border border-coal-700/40 rounded-xl text-left transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-white">Register / Manage Workers</div>
                <div className="text-[10px] text-coal-400">Add deployed workforce & certificates</div>
              </div>
              <ArrowRight size={14} className="text-coal-400" />
            </button>

            <button
              onClick={() => navigate('/corrective-actions')}
              className="w-full flex items-center justify-between p-3 bg-coal-800/60 hover:bg-coal-800 border border-coal-700/40 rounded-xl text-left transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-white">Submit Corrective Proof</div>
                <div className="text-[10px] text-coal-400">Upload photos & notes for verification</div>
              </div>
              <ArrowRight size={14} className="text-coal-400" />
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
