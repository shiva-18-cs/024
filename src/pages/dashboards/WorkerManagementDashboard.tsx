import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, Clock, HeartPulse, ShieldAlert,
  Award, FileCheck, ArrowRight, UserPlus, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { dashboard, workers as workersApi } from '../../services/api';
import { KPICard, SectionCard, StatusBadge, ComplianceBar, LoadingState, EmptyState } from '../../components/ui/UIComponents';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/helpers';

export default function WorkerManagementDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboard.stats(),
      workersApi.list().catch(() => [])
    ]).then(([statsData, workersData]: any) => {
      setStats(statsData);
      setWorkersList(workersData || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState message="Loading Worker & Labour Compliance Dashboard..." />;
  }

  const rKpis = stats?.role_kpis || {};
  const kpis = stats?.kpis || {};

  const totalWorkers = rKpis.total_workers ?? kpis.total_workers ?? workersList.length;
  const verifiedWorkers = rKpis.verified_workers ?? workersList.filter(w => w.verification_status === 'VERIFIED').length;
  const pendingVerification = rKpis.pending_verification ?? workersList.filter(w => w.verification_status === 'PENDING').length;
  const fitWorkers = rKpis.fit_workers ?? workersList.filter(w => w.medical_fitness_status === 'FIT').length;
  const unfitWorkers = rKpis.unfit_workers ?? workersList.filter(w => w.medical_fitness_status !== 'FIT').length;
  const expiringMedicals = rKpis.expiring_medical_records ?? rKpis.expiring_documents ?? 0;
  const expiredMedicals = rKpis.expired_medical_records ?? rKpis.expired_documents ?? 0;
  const certifiedTraining = rKpis.certified_training ?? workersList.filter(w => w.training_status === 'CERTIFIED').length;
  const compliancePercent = rKpis.worker_compliance_percent ?? 92.5;

  const pendingWorkers = workersList.filter(w => w.verification_status === 'PENDING');
  const medicalAlerts = workersList.filter(w => w.is_medical_expired || w.medical_fitness_status !== 'FIT');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
              Worker Management & PME
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Labour & Workforce Compliance Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage worker on-boarding, Form O PME medical fitness examinations, mandatory vocational training, and statutory certifications.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/workers')} className="btn-secondary text-xs">
            <Users size={14} /> Manage Workers
          </button>
          <button onClick={() => navigate('/workers')} className="btn-secondary text-xs">
            <UserCheck size={14} /> Verify Worker
          </button>
          <button onClick={() => navigate('/workers')} className="btn-primary text-xs">
            <HeartPulse size={14} /> Medical Records
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Workers"
          value={totalWorkers}
          icon={<Users size={22} className="text-blue-700" />}
          iconBg="bg-blue-50"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Verified Workers"
          value={verifiedWorkers}
          icon={<UserCheck size={22} className="text-emerald-700" />}
          iconBg="bg-emerald-50"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Pending Verification"
          value={pendingVerification}
          icon={<Clock size={22} className="text-amber-700" />}
          iconBg="bg-amber-50"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Medical Fitness (Fit)"
          value={fitWorkers}
          icon={<HeartPulse size={22} className="text-rose-700" />}
          iconBg="bg-rose-50"
        />
        <KPICard
          label="Expiring Medical Records"
          value={expiringMedicals}
          icon={<AlertTriangle size={22} className="text-orange-700" />}
          iconBg="bg-orange-50"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Expired Medicals"
          value={expiredMedicals}
          icon={<ShieldAlert size={22} className="text-red-700" />}
          iconBg="bg-red-50"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Vocational Training Status"
          value={`${certifiedTraining} / ${totalWorkers}`}
          icon={<Award size={22} className="text-purple-700" />}
          iconBg="bg-purple-50"
        />
        <KPICard
          label="Statutory Compliance %"
          value={`${compliancePercent}%`}
          icon={<ShieldCheck size={22} className="text-teal-700" />}
          iconBg="bg-teal-50"
        />
      </div>

      {/* Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending Verification Queue */}
        <SectionCard
          title="Workers Pending Verification"
          icon={<UserCheck size={16} className="text-amber-700" />}
          actions={
            <button onClick={() => navigate('/workers')} className="btn-ghost text-xs">
              View All <ArrowRight size={12} />
            </button>
          }
        >
          {pendingWorkers.length === 0 ? (
            <EmptyState message="All registered workers are verified and active." />
          ) : (
            <div className="space-y-2">
              {pendingWorkers.slice(0, 5).map(w => (
                <div
                  key={w.id}
                  onClick={() => navigate('/workers')}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{w.first_name} {w.last_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-bold">({w.worker_code})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {w.designation} • {w.contractor_name || 'Direct'} • Mine: {w.mine_name || 'Assigned'}
                    </div>
                  </div>
                  <StatusBadge status="PENDING" />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Medical / Fitness Attention */}
        <SectionCard
          title="Medical & PME Fitness Watchlist"
          icon={<HeartPulse size={16} className="text-rose-700" />}
          actions={
            <button onClick={() => navigate('/workers')} className="btn-ghost text-xs">
              View All <ArrowRight size={12} />
            </button>
          }
        >
          {medicalAlerts.length === 0 ? (
            <EmptyState message="All workers have valid Form O medical fitness certifications." />
          ) : (
            <div className="space-y-2">
              {medicalAlerts.slice(0, 5).map(w => (
                <div
                  key={w.id}
                  onClick={() => navigate('/workers')}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{w.first_name} {w.last_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-bold">({w.worker_code})</span>
                    </div>
                    <div className="text-[11px] text-red-700 font-medium mt-0.5">
                      Status: {w.medical_fitness_status} • Expiry: {w.medical_expiry_date ? formatDate(w.medical_expiry_date) : 'No Form O Record'}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-50 text-red-700 border border-red-200">
                    Attention
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/workers')}
          className="p-5 bg-white border border-slate-200 hover:border-emerald-300 rounded-lg shadow-card cursor-pointer transition-all hover:shadow-card-hover"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3">
            <Users size={20} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Worker Registry & Profiles</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">Review biometric profiles, contractor assignments, and statutory declarations.</p>
        </div>

        <div
          onClick={() => navigate('/workers')}
          className="p-5 bg-white border border-slate-200 hover:border-rose-300 rounded-lg shadow-card cursor-pointer transition-all hover:shadow-card-hover"
        >
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 mb-3">
            <HeartPulse size={20} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Form O Medicals (PME/IME)</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">Track DGMS statutory periodic medical examinations and fitness renewals.</p>
        </div>

        <div
          onClick={() => navigate('/workers')}
          className="p-5 bg-white border border-slate-200 hover:border-purple-300 rounded-lg shadow-card cursor-pointer transition-all hover:shadow-card-hover"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 mb-3">
            <Award size={20} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Vocational Training & Certifications</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">Verify Mines Vocational Training Rules 1966 certifications and gas testing permits.</p>
        </div>
      </div>
    </div>
  );
}
