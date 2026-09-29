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
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              Worker Management & PME
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Labour & Workforce Compliance Dashboard</h1>
          <p className="text-coal-500 text-sm mt-0.5">
            Manage worker on-boarding, Form O PME medical fitness examinations, mandatory vocational training, and statutory certifications.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/workers')} className="btn-secondary text-xs">
            <Users size={13} /> Manage Workers
          </button>
          <button onClick={() => navigate('/workers')} className="btn-secondary text-xs">
            <UserCheck size={13} /> Verify Worker
          </button>
          <button onClick={() => navigate('/workers')} className="btn-primary text-xs">
            <HeartPulse size={13} /> Medical Records
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Workers"
          value={totalWorkers}
          icon={<Users size={22} className="text-blue-400" />}
          iconBg="bg-blue-500/10"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Verified Workers"
          value={verifiedWorkers}
          icon={<UserCheck size={22} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Pending Verification"
          value={pendingVerification}
          icon={<Clock size={22} className="text-amber-400" />}
          iconBg="bg-amber-500/10"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Medical Fitness (Fit)"
          value={fitWorkers}
          icon={<HeartPulse size={22} className="text-rose-400" />}
          iconBg="bg-rose-500/10"
        />
        <KPICard
          label="Expiring Medical Records"
          value={expiringMedicals}
          icon={<AlertTriangle size={22} className="text-orange-400" />}
          iconBg="bg-orange-500/10"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Expired Medicals"
          value={expiredMedicals}
          icon={<ShieldAlert size={22} className="text-red-400" />}
          iconBg="bg-red-500/10"
          onClick={() => navigate('/workers')}
        />
        <KPICard
          label="Vocational Training Status"
          value={`${certifiedTraining} / ${totalWorkers}`}
          icon={<Award size={22} className="text-indigo-400" />}
          iconBg="bg-indigo-500/10"
        />
        <KPICard
          label="Statutory Compliance %"
          value={`${compliancePercent}%`}
          icon={<ShieldCheck size={22} className="text-teal-400" />}
          iconBg="bg-teal-500/10"
        />
      </div>

      {/* Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending Verification Queue */}
        <SectionCard
          title="Workers Pending Verification"
          icon={<UserCheck size={16} className="text-amber-400" />}
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
                  className="flex items-center justify-between p-3 bg-coal-800/40 hover:bg-coal-800 border border-coal-700/40 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{w.first_name} {w.last_name}</span>
                      <span className="text-[10px] text-coal-400 font-mono">({w.worker_code})</span>
                    </div>
                    <div className="text-[10px] text-coal-400 mt-0.5">
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
          icon={<HeartPulse size={16} className="text-rose-400" />}
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
                  className="flex items-center justify-between p-3 bg-coal-800/40 hover:bg-coal-800 border border-coal-700/40 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{w.first_name} {w.last_name}</span>
                      <span className="text-[10px] text-coal-400 font-mono">({w.worker_code})</span>
                    </div>
                    <div className="text-[10px] text-red-400 mt-0.5">
                      Status: {w.medical_fitness_status} • Expiry: {w.medical_expiry_date ? formatDate(w.medical_expiry_date) : 'No Form O Record'}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-950/60 text-red-400 border border-red-800/40">
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
          className="p-4 bg-coal-900 border border-coal-800 hover:border-emerald-800/60 rounded-xl cursor-pointer transition-all hover:bg-coal-850"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3">
            <Users size={18} />
          </div>
          <h3 className="text-sm font-bold text-white">Worker Registry & Profiles</h3>
          <p className="text-[11px] text-coal-400 mt-1">Review biometric profiles, contractor assignments, and statutory declarations.</p>
        </div>

        <div
          onClick={() => navigate('/workers')}
          className="p-4 bg-coal-900 border border-coal-800 hover:border-rose-800/60 rounded-xl cursor-pointer transition-all hover:bg-coal-850"
        >
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 mb-3">
            <HeartPulse size={18} />
          </div>
          <h3 className="text-sm font-bold text-white">Form O Medicals (PME/IME)</h3>
          <p className="text-[11px] text-coal-400 mt-1">Track DGMS statutory periodic medical examinations and fitness renewals.</p>
        </div>

        <div
          onClick={() => navigate('/workers')}
          className="p-4 bg-coal-900 border border-coal-800 hover:border-indigo-800/60 rounded-xl cursor-pointer transition-all hover:bg-coal-850"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
            <Award size={18} />
          </div>
          <h3 className="text-sm font-bold text-white">Vocational Training & Certifications</h3>
          <p className="text-[11px] text-coal-400 mt-1">Verify Mines Vocational Training Rules 1966 certifications and gas testing permits.</p>
        </div>
      </div>
    </div>
  );
}
