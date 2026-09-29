import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, FileText, Users, ShieldCheck, AlertTriangle,
  Wrench, TrendingUp, Activity, Brain, Bell, CheckCircle, Clock,
  ArrowRight, ShieldAlert, Sparkles, Map
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { dashboard, reports as reportsApi } from '../../services/api';
import { KPICard, SectionCard, StatusBadge, ComplianceBar, LoadingState, EmptyState } from '../../components/ui/UIComponents';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../utils/helpers';

export default function CorporateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboard.stats(),
      reportsApi.list({ status: 'UNDER_CORPORATE_REVIEW' }).catch(() => [])
    ]).then(([statsData, reportsData]: any) => {
      setStats(statsData);
      setPendingReports(reportsData || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState message="Loading Corporate Governance & Cross-Mine Dashboard..." />;
  }

  const rKpis = stats?.role_kpis || {};
  const kpis = stats?.kpis || {};
  const monthlyTrend = stats?.monthly_trend || [];
  const violationsByCat = stats?.violations_by_category || [];
  const mineCompliance = stats?.mine_compliance || [];
  const recentAlerts = stats?.recent_alerts || [];

  const totalMines = rKpis.total_mines ?? kpis.total_mines ?? 5;
  const totalContracts = rKpis.total_contracts ?? kpis.total_contracts ?? 10;
  const overallCompliance = rKpis.overall_compliance ?? rKpis.compliance_percent ?? kpis.avg_compliance_percent ?? 87.5;
  const openViolations = rKpis.open_violations ?? kpis.open_violations ?? 0;
  const solvedViolations = rKpis.solved_violations ?? kpis.solved_violations ?? 12;
  const unsolvedViolations = rKpis.unsolved_violations ?? kpis.unsolved_violations ?? openViolations;
  const overdueIssues = rKpis.overdue_issues ?? rKpis.overdue_actions ?? kpis.overdue_actions ?? 0;
  const escalatedIssues = rKpis.escalated_issues ?? rKpis.escalations ?? kpis.escalations ?? 0;
  const highRiskCases = rKpis.high_risk_cases ?? kpis.high_risk_cases ?? 0;
  const recurringProblems = rKpis.recurring_problems ?? kpis.recurring_problems ?? 2;
  const reportsAwaitingApproval = rKpis.reports_awaiting_approval ?? rKpis.reports_pending_review ?? pendingReports.length;

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-coal-800 border border-coal-700 rounded-xl px-4 py-3 shadow-xl">
          <p className="text-coal-300 text-xs font-semibold mb-2">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-xs" style={{ color: p.color }}>
              {p.name}: <strong>{p.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">
              Corporate Governance HQ • Coal India Limited
            </span>
            <span className="text-xs text-coal-400 font-medium">Cross-Mine Oversight</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Corporate Management & Governance Dashboard</h1>
          <p className="text-coal-500 text-sm mt-0.5">
            Real-time cross-mine compliance aggregation, statutory sign-offs, high-risk surveillance, and systemic escalations.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/reports')} className="btn-primary text-xs">
            <FileText size={13} /> Review Reports ({reportsAwaitingApproval})
          </button>
          <button onClick={() => navigate('/violations')} className="btn-secondary text-xs">
            <AlertTriangle size={13} /> Violations
          </button>
          <button onClick={() => navigate('/alerts')} className="btn-secondary text-xs">
            <Bell size={13} /> Escalations
          </button>
          <button onClick={() => navigate('/ai-insights')} className="btn-secondary text-xs">
            <Brain size={13} /> Risk Analysis
          </button>
          <button onClick={() => navigate('/gis')} className="btn-secondary text-xs">
            <Map size={13} /> GIS Analytics
          </button>
        </div>
      </div>

      {/* KPI Grid (11 Required Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPICard
          label="Total Mines"
          value={totalMines}
          icon={<Building2 size={20} className="text-blue-400" />}
          iconBg="bg-blue-500/10"
          onClick={() => navigate('/mines')}
        />
        <KPICard
          label="TOTAL CONTRACTS"
          value={totalContracts}
          icon={<FileText size={20} className="text-teal-400" />}
          iconBg="bg-teal-500/10"
          onClick={() => navigate('/contractors')}
        />
        <KPICard
          label="Overall Compliance"
          value={`${overallCompliance}%`}
          icon={<ShieldCheck size={20} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
        />
        <KPICard
          label="Open Violations"
          value={openViolations}
          icon={<AlertTriangle size={20} className="text-red-400" />}
          iconBg="bg-red-500/10"
          onClick={() => navigate('/violations')}
        />
        <KPICard
          label="Solved Violations"
          value={solvedViolations}
          icon={<CheckCircle size={20} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
        />
        <KPICard
          label="Unsolved Violations"
          value={unsolvedViolations}
          icon={<ShieldAlert size={20} className="text-rose-400" />}
          iconBg="bg-rose-500/10"
          onClick={() => navigate('/violations')}
        />
        <KPICard
          label="Overdue Issues"
          value={overdueIssues}
          icon={<Clock size={20} className="text-orange-400" />}
          iconBg="bg-orange-500/10"
          onClick={() => navigate('/corrective-actions')}
        />
        <KPICard
          label="Escalated Issues"
          value={escalatedIssues}
          icon={<Bell size={20} className="text-amber-400" />}
          iconBg="bg-amber-500/10"
          onClick={() => navigate('/alerts')}
        />
        <KPICard
          label="High Risk Cases"
          value={highRiskCases}
          icon={<Brain size={20} className="text-purple-400" />}
          iconBg="bg-purple-500/10"
          onClick={() => navigate('/ai-insights')}
        />
        <KPICard
          label="Recurring Problems"
          value={recurringProblems}
          icon={<AlertTriangle size={20} className="text-yellow-400" />}
          iconBg="bg-yellow-500/10"
          onClick={() => navigate('/violations')}
        />
        <KPICard
          label="Reports Awaiting Approval"
          value={reportsAwaitingApproval}
          icon={<Clock size={20} className="text-sky-400" />}
          iconBg="bg-sky-500/10"
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* Reports Pending Review Alert Banner */}
      {reportsAwaitingApproval > 0 && (
        <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {reportsAwaitingApproval} Regulatory Compliance Reports Awaiting Corporate Sign-Off
              </div>
              <p className="text-xs text-coal-400 mt-0.5">
                Statutory monthly reports submitted by Mine Managers require final corporate governance approval.
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/reports')} className="btn-primary text-xs">
            Review Reports Now <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Compliance Trend Area Chart */}
        <SectionCard
          title="Cross-Mine Compliance & Violations Trend"
          icon={<TrendingUp size={16} />}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="corpColorCompliance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="corpColorViolations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
              <Area type="monotone" dataKey="compliance" stroke="#0284c7" fill="url(#corpColorCompliance)" name="Compliance %" strokeWidth={2} dot={{ fill: '#0284c7', r: 3 }} />
              <Area type="monotone" dataKey="violations" stroke="#ef4444" fill="url(#corpColorViolations)" name="Violations" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Violations by Category Pie */}
        <SectionCard title="Violations by Category" icon={<AlertTriangle size={16} />}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={violationsByCat}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {violationsByCat.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Mine Compliance & Cross-Mine Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Mine-wise Compliance */}
        <SectionCard
          title="Subsidiary & Mine Compliance Rankings"
          icon={<Building2 size={16} />}
          actions={<button onClick={() => navigate('/mines')} className="btn-ghost text-xs">View All Mines</button>}
        >
          <div className="space-y-3">
            {mineCompliance.slice(0, 5).map((mine: any) => (
              <div
                key={mine.mine_id}
                className="flex items-center gap-3 cursor-pointer hover:bg-coal-800/30 rounded-lg p-2 -mx-2 transition-colors"
                onClick={() => navigate('/mines')}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-coal-200 truncate">{mine.mine_name}</span>
                    <StatusBadge status={mine.risk_level} />
                  </div>
                  <ComplianceBar score={mine.score} />
                </div>
                <div className="text-right text-xs text-coal-500 whitespace-nowrap w-16">
                  {mine.open_violations} open
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Systemic Alerts & Escalations */}
        <SectionCard
          title="Active Systemic Alerts & Escalations"
          icon={<Bell size={16} />}
          actions={<button onClick={() => navigate('/alerts')} className="btn-ghost text-xs">All Alerts</button>}
        >
          <div className="space-y-2">
            {recentAlerts.length === 0 ? (
              <EmptyState message="No active systemic alerts." />
            ) : (
              recentAlerts.map((alert: any) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-coal-800/50 rounded-xl border border-coal-800">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    alert.severity === 'CRITICAL' ? 'bg-red-500' :
                    alert.severity === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-coal-200 truncate">{alert.title}</p>
                    <p className="text-[10px] text-coal-500 mt-0.5 line-clamp-1">{alert.message}</p>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
                    alert.severity === 'CRITICAL' ? 'bg-red-900/50 text-red-300' :
                    alert.severity === 'HIGH' ? 'bg-orange-900/50 text-orange-300' : 'bg-yellow-900/50 text-yellow-300'
                  }`}>
                    L{alert.escalation_level}
                  </span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
