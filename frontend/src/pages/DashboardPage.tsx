import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, HardHat, Users, ClipboardList, AlertTriangle,
  Wrench, TrendingUp, Activity, ShieldCheck, Eye, ArrowRight,
  Brain, Bell, FileText, CheckCircle
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { dashboard } from '../services/api';
import { KPICard, SectionCard, StatusBadge, ComplianceBar, LoadingState } from '../components/ui/UIComponents';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime, getRiskBadgeClass } from '../utils/helpers';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboard.stats().then((data: any) => {
      setStats(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 skeleton rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  const kpis = stats?.kpis || {};
  const monthlyTrend = stats?.monthly_trend || [];
  const violationsByCat = stats?.violations_by_category || [];
  const mineCompliance = stats?.mine_compliance || [];
  const contractorStats = stats?.contractor_stats || [];
  const recentAlerts = stats?.recent_alerts || [];

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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {user?.role === 'CORPORATE MANAGEMENT' ? 'Corporate Governance Dashboard' :
             user?.role === 'MINE MANAGER' ? 'Mine Operations Dashboard' :
             user?.role === 'FIELD OFFICER' ? 'Field Operations Dashboard' :
             user?.role === 'CONTRACTOR' ? 'Contractor Compliance Dashboard' :
             'CoalGuard — Governance & Compliance Dashboard'}
          </h1>
          <p className="text-coal-500 text-sm mt-0.5">
            Coal India Limited • Real-time Statutory Compliance Monitoring System
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-coal-900 border border-coal-700 rounded-lg text-xs text-coal-400">
            <Activity size={12} className="text-emerald-400" />
            Live • {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {user?.role === 'FIELD OFFICER' && (
            <button onClick={() => navigate('/inspections')} className="btn-primary text-sm">
              <ClipboardList size={15} /> New Inspection
            </button>
          )}
          {user?.role === 'CONTRACTOR' && (
            <button onClick={() => navigate('/corrective-actions')} className="btn-primary text-sm">
              <Wrench size={15} /> View Assigned CAPAs
            </button>
          )}
          {user?.role === 'MINE MANAGER' && (
            <button onClick={() => navigate('/corrective-actions')} className="btn-primary text-sm">
              <Wrench size={15} /> Issue / Manage CAPAs
            </button>
          )}
          {user?.role === 'WORKER MANAGEMENT' && (
            <button onClick={() => navigate('/workers')} className="btn-primary text-sm">
              <Users size={15} /> Verify Worker Records
            </button>
          )}
          {user?.role === 'CORPORATE MANAGEMENT' && (
            <button onClick={() => navigate('/reports')} className="btn-primary text-sm">
              <FileText size={15} /> Review Statutory Reports
            </button>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Mines"
          value={kpis.total_mines ?? 5}
          icon={<Building2 size={22} className="text-blue-400" />}
          iconBg="bg-blue-500/10"
          onClick={() => navigate('/mines')}
        />
        <KPICard
          label="Active Contractors"
          value={kpis.active_contractors ?? 10}
          icon={<HardHat size={22} className="text-amber-400" />}
          iconBg="bg-amber-500/10"
          onClick={() => navigate('/contractors')}
        />
        <KPICard
          label="Total Workers"
          value={kpis.total_workers ?? 52}
          icon={<Users size={22} className="text-violet-400" />}
          iconBg="bg-violet-500/10"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Compliance %"
          value={`${kpis.avg_compliance_percent ?? 87.5}%`}
          icon={<ShieldCheck size={22} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
          delta={2.5}
        />
        <KPICard
          label="Open Violations"
          value={kpis.open_violations ?? 7}
          icon={<AlertTriangle size={22} className="text-red-400" />}
          iconBg="bg-red-500/10"
          onClick={() => navigate('/violations')}
        />
        <KPICard
          label="High Risk Cases"
          value={kpis.high_risk_cases ?? 4}
          icon={<Brain size={22} className="text-orange-400" />}
          iconBg="bg-orange-500/10"
          onClick={() => navigate('/ai-insights')}
        />
        <KPICard
          label="Overdue Actions"
          value={kpis.overdue_actions ?? 2}
          icon={<Wrench size={22} className="text-red-400" />}
          iconBg="bg-red-500/10"
          onClick={() => navigate('/corrective-actions')}
        />
        <KPICard
          label="Inspections"
          value={kpis.total_inspections ?? 20}
          icon={<ClipboardList size={22} className="text-sky-400" />}
          iconBg="bg-sky-500/10"
          onClick={() => navigate('/inspections')}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Compliance Trend Area Chart */}
        <SectionCard
          title="Compliance & Violations Trend"
          icon={<TrendingUp size={16} />}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
              <Area type="monotone" dataKey="compliance" stroke="#0284c7" fill="url(#colorCompliance)" name="Compliance %" strokeWidth={2} dot={{ fill: '#0284c7', r: 3 }} />
              <Area type="monotone" dataKey="violations" stroke="#ef4444" fill="url(#colorViolations)" name="Violations" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
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
                innerRadius={60}
                outerRadius={90}
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

      {/* Mine Compliance & Contractor Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Mine-wise Compliance Bar */}
        <SectionCard
          title="Mine-wise Compliance Scores"
          icon={<Building2 size={16} />}
          actions={<button onClick={() => navigate('/mines')} className="btn-ghost text-xs">View All</button>}
        >
          <div className="space-y-3">
            {mineCompliance.slice(0, 5).map((mine: any) => (
              <div key={mine.mine_id} className="flex items-center gap-3 cursor-pointer hover:bg-coal-800/30 rounded-lg p-2 -mx-2 transition-colors"
                onClick={() => navigate('/mines')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-coal-200 truncate">{mine.mine_name}</span>
                    <StatusBadge status={mine.risk_level} />
                  </div>
                  <ComplianceBar score={mine.score} />
                </div>
                <div className="text-right text-xs text-coal-500 whitespace-nowrap w-12">
                  {mine.open_violations} vio.
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Recent Alerts */}
        <SectionCard
          title="Active Alerts & Escalations"
          icon={<Bell size={16} />}
          actions={<button onClick={() => navigate('/alerts')} className="btn-ghost text-xs">View All</button>}
        >
          <div className="space-y-2">
            {recentAlerts.length === 0 ? (
              <div className="text-center py-8 text-coal-600 text-sm">No active alerts</div>
            ) : recentAlerts.map((alert: any) => (
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
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Workflow Status Summary */}
      <SectionCard
        title="Governance Workflow Status"
        icon={<Activity size={16} />}
        actions={<button onClick={() => navigate('/inspections')} className="btn-ghost text-xs">Inspect All</button>}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Under MM Review', count: 3, color: 'bg-yellow-500/10 border-yellow-800/40 text-yellow-300' },
            { label: 'Corporate Review', count: 2, color: 'bg-sky-500/10 border-sky-800/40 text-sky-300' },
            { label: 'Violations Flagged', count: 4, color: 'bg-red-500/10 border-red-800/40 text-red-300' },
            { label: 'Approved', count: 11, color: 'bg-emerald-500/10 border-emerald-800/40 text-emerald-300' },
            { label: 'Re-submission', count: 0, color: 'bg-violet-500/10 border-violet-800/40 text-violet-300' },
          ].map(w => (
            <div key={w.label} className={`border rounded-xl p-3 text-center ${w.color}`}>
              <div className="text-2xl font-bold">{w.count}</div>
              <div className="text-[10px] font-medium mt-1 opacity-80">{w.label}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
