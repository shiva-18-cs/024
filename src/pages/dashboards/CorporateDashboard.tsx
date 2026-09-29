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

  // Fallback demo data for charts when API returns empty
  const DEMO_MONTHLY_TREND = [
    { month: 'Apr', compliance: 82, violations: 14 },
    { month: 'May', compliance: 84, violations: 12 },
    { month: 'Jun', compliance: 80, violations: 17 },
    { month: 'Jul', compliance: 86, violations: 9 },
    { month: 'Aug', compliance: 88, violations: 7 },
    { month: 'Sep', compliance: 87, violations: 8 },
  ];
  const DEMO_VIOLATIONS_BY_CAT = [
    { category: 'Safety', count: 18 },
    { category: 'Environmental', count: 11 },
    { category: 'Labour', count: 9 },
    { category: 'Equipment', count: 6 },
    { category: 'Contractor', count: 4 },
  ];
  const DEMO_MINE_COMPLIANCE = [
    { mine_id: 'ecl-1', mine_name: 'Rajmahal OCP', score: 88, open_violations: 3, risk_level: 'LOW' },
    { mine_id: 'ecl-2', mine_name: 'Jharna Opencast', score: 74, open_violations: 7, risk_level: 'MEDIUM' },
    { mine_id: 'bcc-1', mine_name: 'Barora Colliery', score: 91, open_violations: 1, risk_level: 'LOW' },
    { mine_id: 'ecl-3', mine_name: 'Mugma OCP', score: 62, open_violations: 12, risk_level: 'HIGH' },
    { mine_id: 'bcc-2', mine_name: 'Sijua Area', score: 85, open_violations: 4, risk_level: 'LOW' },
  ];
  const DEMO_ALERTS = [
    { id: 'a1', title: 'Overdue CAPA — Mugma OCP', message: 'Corrective action deadline passed by 7 days for berm height violation.', severity: 'CRITICAL', escalation_level: 3 },
    { id: 'a2', title: 'Recurring Safety Violation Pattern', message: 'AVRA alarm non-compliance reported across 3 consecutive inspections at Rajmahal.', severity: 'HIGH', escalation_level: 2 },
    { id: 'a3', title: 'Labour Compliance Below Threshold', message: 'PME medical compliance at Jharna Opencast dropped to 71% — threshold is 90%.', severity: 'HIGH', escalation_level: 2 },
  ];

  const rawMonthlyTrend = stats?.monthly_trend || [];
  const rawViolationsByCat = stats?.violations_by_category || [];
  const rawMineCompliance = stats?.mine_compliance || [];
  const rawAlerts = stats?.recent_alerts || [];

  const monthlyTrend = rawMonthlyTrend.length > 0 ? rawMonthlyTrend : DEMO_MONTHLY_TREND;
  const violationsByCat = rawViolationsByCat.length > 0 ? rawViolationsByCat : DEMO_VIOLATIONS_BY_CAT;
  const mineCompliance = rawMineCompliance.length > 0 ? rawMineCompliance : DEMO_MINE_COMPLIANCE;
  const recentAlerts = rawAlerts.length > 0 ? rawAlerts : DEMO_ALERTS;

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

  const COLORS = ['#ef4444', '#f59e0b', '#2563eb', '#10b981', '#8b5cf6'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-slate-700 text-xs font-bold mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-xs font-medium flex items-center justify-between gap-4" style={{ color: p.color }}>
              <span>{p.name}:</span>
              <span className="font-bold font-mono">{p.value}</span>
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
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              Corporate Governance HQ • Coal India Limited
            </span>
            <span className="text-xs text-slate-500 font-medium">Cross-Mine Oversight</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Corporate Management & Governance Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time cross-mine compliance aggregation, statutory sign-offs, high-risk surveillance, and systemic escalations.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/reports')} className="btn-primary text-xs">
            <FileText size={14} /> Review Reports ({reportsAwaitingApproval})
          </button>
          <button onClick={() => navigate('/violations')} className="btn-secondary text-xs">
            <AlertTriangle size={14} /> Violations
          </button>
          <button onClick={() => navigate('/alerts')} className="btn-secondary text-xs">
            <Bell size={14} /> Escalations
          </button>
          <button onClick={() => navigate('/ai-insights')} className="btn-secondary text-xs">
            <Brain size={14} /> Risk Analysis
          </button>
          <button onClick={() => navigate('/gis')} className="btn-secondary text-xs">
            <Map size={14} /> GIS Analytics
          </button>
        </div>
      </div>

      {/* KPI Grid (11 Required Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPICard
          label="Total Mines"
          value={totalMines}
          icon={<Building2 size={20} className="text-blue-700" />}
          iconBg="bg-blue-50"
          onClick={() => navigate('/mines')}
        />
        <KPICard
          label="TOTAL CONTRACTS"
          value={totalContracts}
          icon={<FileText size={20} className="text-teal-700" />}
          iconBg="bg-teal-50"
          onClick={() => navigate('/contractors')}
        />
        <KPICard
          label="Overall Compliance"
          value={`${overallCompliance}%`}
          icon={<ShieldCheck size={20} className="text-emerald-700" />}
          iconBg="bg-emerald-50"
        />
        <KPICard
          label="Open Violations"
          value={openViolations}
          icon={<AlertTriangle size={20} className="text-red-700" />}
          iconBg="bg-red-50"
          onClick={() => navigate('/violations')}
        />
        <KPICard
          label="Solved Violations"
          value={solvedViolations}
          icon={<CheckCircle size={20} className="text-emerald-700" />}
          iconBg="bg-emerald-50"
        />
        <KPICard
          label="Unsolved Violations"
          value={unsolvedViolations}
          icon={<ShieldAlert size={20} className="text-rose-700" />}
          iconBg="bg-rose-50"
          onClick={() => navigate('/violations')}
        />
        <KPICard
          label="Overdue Issues"
          value={overdueIssues}
          icon={<Clock size={20} className="text-orange-700" />}
          iconBg="bg-orange-50"
          onClick={() => navigate('/corrective-actions')}
        />
        <KPICard
          label="Escalated Issues"
          value={escalatedIssues}
          icon={<Bell size={20} className="text-amber-700" />}
          iconBg="bg-amber-50"
          onClick={() => navigate('/alerts')}
        />
        <KPICard
          label="High Risk Cases"
          value={highRiskCases}
          icon={<Brain size={20} className="text-purple-700" />}
          iconBg="bg-purple-50"
          onClick={() => navigate('/ai-insights')}
        />
        <KPICard
          label="Recurring Problems"
          value={recurringProblems}
          icon={<AlertTriangle size={20} className="text-yellow-700" />}
          iconBg="bg-yellow-50"
          onClick={() => navigate('/violations')}
        />
        <KPICard
          label="Reports Awaiting Approval"
          value={reportsAwaitingApproval}
          icon={<Clock size={20} className="text-blue-700" />}
          iconBg="bg-blue-50"
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* Reports Pending Review Alert Banner */}
      {reportsAwaitingApproval > 0 && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {reportsAwaitingApproval} Regulatory Compliance Reports Awaiting Corporate Sign-Off
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Statutory monthly reports submitted by Mine Managers require final corporate governance approval.
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/reports')} className="btn-primary text-xs">
            Review Reports Now <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Compliance Analytics Section */}
      <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
        <TrendingUp size={15} className="text-blue-600" />
        <h2 className="text-sm font-bold text-slate-800">Compliance Analytics & Mine Performance</h2>
        {(rawMonthlyTrend.length === 0 || rawViolationsByCat.length === 0) && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">Demo Data</span>
        )}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Compliance Trend Area Chart */}
        <SectionCard
          title="Cross-Mine Compliance & Violations Trend"
          icon={<TrendingUp size={16} />}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="corpColorCompliance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="corpColorViolations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#475569', fontSize: 11, paddingTop: '10px' }} />
              <Area type="monotone" dataKey="compliance" stroke="#2563eb" fill="url(#corpColorCompliance)" name="Compliance %" strokeWidth={2} dot={{ fill: '#2563eb', r: 3 }} />
              <Area type="monotone" dataKey="violations" stroke="#ef4444" fill="url(#corpColorViolations)" name="Violations" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Violations by Category Pie */}
        <SectionCard title="Violations by Category" icon={<AlertTriangle size={16} />}>
          <ResponsiveContainer width="100%" height={240}>
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
              <Legend wrapperStyle={{ color: '#475569', fontSize: 11 }} />
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
          <div className="divide-y divide-slate-100">
            {mineCompliance.slice(0, 5).map((mine: any) => (
              <div
                key={mine.mine_id}
                className="py-3 px-2 flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-md transition-colors"
                onClick={() => navigate('/mines')}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-800 truncate">{mine.mine_name}</span>
                    <StatusBadge status={mine.risk_level} />
                  </div>
                  <ComplianceBar score={mine.score} />
                </div>
                <div className="text-right text-xs font-semibold text-slate-500 whitespace-nowrap w-16">
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
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    alert.severity === 'CRITICAL' ? 'bg-red-600' :
                    alert.severity === 'HIGH' ? 'bg-orange-500' : 'bg-amber-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{alert.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{alert.message}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border flex-shrink-0 ${
                    alert.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                    alert.severity === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-amber-50 text-amber-700 border-amber-200'
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
