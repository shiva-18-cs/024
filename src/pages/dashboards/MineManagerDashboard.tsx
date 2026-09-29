import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, ClipboardList, FileText, AlertTriangle, Wrench,
  Brain, CheckCircle, XCircle, ArrowRight, Clock, RefreshCw, Eye
} from 'lucide-react';
import { dashboard, reports as reportsApi, violations as violationsApi } from '../../services/api';
import { KPICard, SectionCard, StatusBadge, ComplianceBar, LoadingState, EmptyState } from '../../components/ui/UIComponents';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatDateTime, getReportStatusLabel } from '../../utils/helpers';

export default function MineManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [violationsList, setViolationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboard.stats(),
      reportsApi.list().catch(() => []),
      violationsApi.list({ status: 'OPEN' }).catch(() => [])
    ]).then(([statsData, reportsData, viosData]: any) => {
      setStats(statsData);
      setReportsList(reportsData || []);
      setViolationsList(viosData || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState message="Loading Mine Operations & Governance Dashboard..." />;
  }

  const rKpis = stats?.role_kpis || {};
  const kpis = stats?.kpis || {};

  const mineName = rKpis.mine_name || user?.mine_name || 'Rajmahal Open Cast Project';
  const pendingReviews = rKpis.pending_reviews ?? rKpis.inspections_pending_report ?? 0;
  const draftReports = rKpis.draft_reports ?? reportsList.filter(r => r.approval_status === 'DRAFT').length;
  const awaitingCorpReview = rKpis.reports_awaiting_corporate_review ?? rKpis.reports_under_review ?? reportsList.filter(r => r.approval_status === 'UNDER_CORPORATE_REVIEW').length;
  const rejectedReports = rKpis.rejected_reports ?? reportsList.filter(r => r.approval_status === 'REJECTED').length;
  const openViolations = rKpis.open_violations ?? kpis.open_violations ?? 0;
  const overdueCapas = rKpis.overdue_capas ?? kpis.overdue_actions ?? 0;
  const highRiskCases = rKpis.high_risk_cases ?? 0;
  const recurringProblems = rKpis.recurring_problems_count ?? rKpis.recurring_problems ?? 2;
  const mineCompliance = rKpis.mine_compliance_percent ?? kpis.compliance_percent ?? 88.0;

  const rejectedList = reportsList.filter(r => r.approval_status === 'REJECTED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 uppercase tracking-wide">
              Mine Manager Station
            </span>
            <span className="text-xs text-slate-500 font-medium">⛏️ {mineName}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Mine Operations & Governance Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Review Field Officer inspections, validate AI risk assessments, compile statutory compliance reports, and issue CAPAs.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/inspections')} className="btn-secondary text-xs">
            <ClipboardList size={14} /> Review Inspections
          </button>
          <button onClick={() => navigate('/reports')} className="btn-secondary text-xs">
            <FileText size={14} /> View Reports
          </button>
          <button onClick={() => navigate('/ai-insights')} className="btn-primary text-xs">
            <Brain size={14} /> Review AI Risk
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Pending Inspection Reviews"
          value={pendingReviews}
          icon={<ClipboardList size={22} className="text-amber-700" />}
          iconBg="bg-amber-50"
          onClick={() => navigate('/inspections')}
        />
        <KPICard
          label="Draft Reports"
          value={draftReports}
          icon={<FileText size={22} className="text-blue-700" />}
          iconBg="bg-blue-50"
          onClick={() => navigate('/reports')}
        />
        <KPICard
          label="Awaiting Corporate Review"
          value={awaitingCorpReview}
          icon={<Clock size={22} className="text-sky-700" />}
          iconBg="bg-sky-50"
          onClick={() => navigate('/reports')}
        />
        <KPICard
          label="Rejected Reports (Feedback)"
          value={rejectedReports}
          icon={<XCircle size={22} className="text-rose-700" />}
          iconBg="bg-rose-50"
          onClick={() => navigate('/reports')}
        />
        <KPICard
          label="Open Violations"
          value={openViolations}
          icon={<AlertTriangle size={22} className="text-red-700" />}
          iconBg="bg-red-50"
          onClick={() => navigate('/violations')}
        />
        <KPICard
          label="Overdue CAPAs"
          value={overdueCapas}
          icon={<Wrench size={22} className="text-orange-700" />}
          iconBg="bg-orange-50"
          onClick={() => navigate('/corrective-actions')}
        />
        <KPICard
          label="High Risk Violations"
          value={highRiskCases}
          icon={<Brain size={22} className="text-purple-700" />}
          iconBg="bg-purple-50"
          onClick={() => navigate('/ai-insights')}
        />
        <KPICard
          label="Recurring Patterns"
          value={recurringProblems}
          icon={<AlertTriangle size={22} className="text-yellow-700" />}
          iconBg="bg-yellow-50"
          onClick={() => navigate('/violations')}
        />
      </div>

      {/* Rejected Reports / Corporate Feedback Alert */}
      {rejectedList.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <AlertTriangle size={16} />
              Corporate Management Revision Requests ({rejectedList.length})
            </div>
            <button onClick={() => navigate('/reports')} className="text-xs text-rose-700 hover:text-rose-900 underline font-semibold">
              View in Reports
            </button>
          </div>
          <div className="space-y-2">
            {rejectedList.map(r => (
              <div key={r.id} className="p-3 bg-white rounded-md border border-rose-200 flex items-start justify-between shadow-xs">
                <div>
                  <div className="text-xs font-bold text-slate-900">{r.report_number} — {r.report_title}</div>
                  <div className="text-xs text-rose-700 mt-1 font-mono">
                    Feedback: {r.rejection_feedback || 'Revision requested on safety and CAPA action deadlines.'}
                  </div>
                </div>
                <button onClick={() => navigate('/reports')} className="btn-secondary text-xs">
                  Revise & Resubmit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Operations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Mine Compliance Reports */}
        <SectionCard
          title="Mine Statutory Reports Overview"
          icon={<FileText size={16} className="text-blue-700" />}
          actions={
            <button onClick={() => navigate('/reports')} className="btn-ghost text-xs">
              All Reports <ArrowRight size={12} />
            </button>
          }
        >
          {reportsList.length === 0 ? (
            <EmptyState message="No compliance reports generated yet for this mine." />
          ) : (
            <div className="space-y-2">
              {reportsList.slice(0, 5).map(r => (
                <div
                  key={r.id}
                  onClick={() => navigate('/reports')}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-slate-500 font-bold">{r.report_number}</span>
                    <p className="text-xs font-bold text-slate-800 truncate">{r.report_title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{formatDateTime(r.generated_at)}</p>
                  </div>
                  <StatusBadge status={getReportStatusLabel(r.approval_status)} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Priority Open Violations */}
        <SectionCard
          title="Priority Open Violations Requiring Action"
          icon={<AlertTriangle size={16} className="text-amber-600" />}
          actions={
            <button onClick={() => navigate('/violations')} className="btn-ghost text-xs">
              All Violations <ArrowRight size={12} />
            </button>
          }
        >
          {violationsList.length === 0 ? (
            <EmptyState message="No open violations logged for this mine." />
          ) : (
            <div className="space-y-2">
              {violationsList.slice(0, 5).map(v => (
                <div
                  key={v.id}
                  onClick={() => navigate('/violations')}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono font-bold">
                        {v.category}
                      </span>
                      <StatusBadge status={v.severity} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate">{v.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Contractor: {v.contractor_name || 'Direct Operations'}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/corrective-actions'); }}
                    className="btn-secondary text-xs flex-shrink-0"
                  >
                    Issue CAPA
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
