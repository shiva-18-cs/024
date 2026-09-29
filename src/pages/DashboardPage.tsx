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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              Compliance Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {user?.role === 'CORPORATE MANAGEMENT' ? 'Corporate Governance Dashboard' :
             user?.role === 'MINE MANAGER' ? 'Mine Operations Dashboard' :
             user?.role === 'FIELD OFFICER' ? 'Field Operations Dashboard' :
             user?.role === 'CONTRACTOR' ? 'Contractor Compliance Dashboard' :
             'CoalGuard — Governance & Compliance Dashboard'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Coal India Limited • Real-time Statutory Compliance Monitoring System
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 shadow-xs">
            <Activity size={14} className="text-emerald-600" />
            <span className="font-medium">Live • {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {user?.role === 'FIELD OFFICER' && (
            <button onClick={() => navigate('/inspections')} className="btn-primary text-xs">
              <ClipboardList size={14} /> New Inspection
            </button>
          )}
          {user?.role === 'CONTRACTOR' && (
            <button onClick={() => navigate('/corrective-actions')} className="btn-primary text-xs">
              <Wrench size={14} /> View Assigned CAPAs
            </button>
          )}
          {user?.role === 'MINE MANAGER' && (
            <button onClick={() => navigate('/corrective-actions')} className="btn-primary text-xs">
              <Wrench size={14} /> Issue / Manage CAPAs
            </button>
          )}
          {user?.role === 'WORKER MANAGEMENT' && (
            <button onClick={() => navigate('/workers')} className="btn-primary text-xs">
              <Users size={14} /> Verify Worker Records
            </button>
          )}
          {user?.role === 'CORPORATE MANAGEMENT' && (
            <button onClick={() => navigate('/reports')} className="btn-primary text-xs">
              <FileText size={14} /> Review Statutory Reports
            </button>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Mines"
          value={kpis.total_mines ?? 5}
          icon={<Building2 size={22} className="text-blue-700" />}
          iconBg="bg-blue-50"
          onClick={() => navigate('/mines')}
        />
        <KPICard
          label="Active Contractors"
          value={kpis.active_contractors ?? 10}
          icon={<HardHat size={22} className="text-amber-700" />}
          iconBg="bg-amber-50"
          onClick={() => navigate('/contractors')}
        />
        <KPICard
          label="Total Workers"
          value={kpis.total_workers ?? 52}
          icon={<Users size={22} className="text-purple-700" />}
          iconBg="bg-purple-50"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Compliance %"
          value={`${kpis.avg_compliance_percent ?? 87.5}%`}
          icon={<ShieldCheck size={22} className="text-emerald-700" />}
          iconBg="bg-emerald-50"
          delta={2.5}
        />
        <KPICard
          label="Open Violations"
          value={kpis.open_violations ?? 7}
          icon={<AlertTriangle size={22} className="text-red-700" />}
          iconBg="bg-red-50"
          onClick={() => navigate('/violations')}
        />
        <KPICard
          label="High Risk Cases"
          value={kpis.high_risk_cases ?? 4}
          icon={<Brain size={22} className="text-orange-700" />}
          iconBg="bg-orange-50"
          onClick={() => navigate('/ai-insights')}
        />
        <KPICard
          label="Overdue Actions"
          value={kpis.overdue_actions ?? 2}
          icon={<Wrench size={22} className="text-rose-700" />}
          iconBg="bg-rose-50"
          onClick={() => navigate('/corrective-actions')}
        />
        <KPICard
          label="Inspections"
          value={kpis.total_inspections ?? 20}
          icon={<ClipboardList size={22} className="text-sky-700" />}
          iconBg="bg-sky-50"
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
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#475569', fontSize: 11, paddingTop: '10px' }} />
              <Area type="monotone" dataKey="compliance" stroke="#2563eb" fill="url(#colorCompliance)" name="Compliance %" strokeWidth={2} dot={{ fill: '#2563eb', r: 3 }} />
              <Area type="monotone" dataKey="violations" stroke="#ef4444" fill="url(#colorViolations)" name="Violations" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
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
                innerRadius={60}
                outerRadius={90}
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

      {/* Mine Compliance & Contractor Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Mine-wise Compliance Bar */}
        <SectionCard
          title="Mine-wise Compliance Scores"
          icon={<Building2 size={16} />}
          actions={<button onClick={() => navigate('/mines')} className="btn-ghost text-xs">View All</button>}
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
              <div className="text-center py-8 text-slate-400 text-sm">No active alerts</div>
            ) : recentAlerts.map((alert: any) => (
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
            { label: 'Under MM Review', count: 3, bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
            { label: 'Corporate Review', count: 2, bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
            { label: 'Violations Flagged', count: 4, bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
            { label: 'Approved', count: 11, bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
            { label: 'Re-submission', count: 0, bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
          ].map(w => (
            <div key={w.label} className={`border rounded-lg p-3 text-center ${w.bg} ${w.border}`}>
              <div className={`text-2xl font-bold ${w.text}`}>{w.count}</div>
              <div className={`text-[11px] font-semibold mt-1 opacity-90 ${w.text}`}>{w.label}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
