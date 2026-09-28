import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, AlertTriangle, CheckCircle, Filter, Plus, ShieldCheck,
  UserCheck, Calendar, HeartPulse, Award, FileCheck, Clock, Search
} from 'lucide-react';
import { workers as workersApi, mines as minesApi, contractors as contractorsApi } from '../services/api';
import { SectionCard, StatusBadge, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';
import { formatDate } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

export default function WorkersPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'workers';

  const [activeTab, setActiveTab] = useState(currentTab);
  const [workerList, setWorkerList] = useState<any[]>([]);
  const [trainingList, setTrainingList] = useState<any[]>([]);
  const [certList, setCertList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [medicals, setMedicals] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [workerTrainings, setWorkerTrainings] = useState<any[]>([]);
  const [workerCerts, setWorkerCerts] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('ALL');

  // Register Worker Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [minesList, setMinesList] = useState<any[]>([]);
  const [contractorsList, setContractorsList] = useState<any[]>([]);
  const [newWorker, setNewWorker] = useState({
    worker_code: '',
    first_name: '',
    last_name: '',
    designation: 'Dumper Operator',
    mine_id: '',
    contractor_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    blood_group: 'O+',
    emergency_contact: '+91 98000 00000',
  });
  const [registering, setRegistering] = useState(false);

  // Add Training Modal
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false);
  const [newTraining, setNewTraining] = useState({
    worker_id: '',
    training_type: 'INITIAL_SAFETY',
    training_name: 'DGMS Vocational Safety Training (VTC)',
    training_status: 'COMPLETED',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    certificate_ref: 'VTC-DGMS-2026-001',
  });
  const [savingTraining, setSavingTraining] = useState(false);

  // Add Certification Modal
  const [showAddCertModal, setShowAddCertModal] = useState(false);
  const [newCert, setNewCert] = useState({
    worker_id: '',
    certification_type: 'HEMM_OPERATOR',
    certification_name: 'DGMS Competency Certificate (Dumper/Excavator)',
    certificate_ref: 'DGMS-CERT-9941',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 730 * 24 * 3600 * 1000).toISOString().split('T')[0],
  });
  const [savingCert, setSavingCert] = useState(false);

  // Verification States (for Worker Management / Corporate)
  const [verifyStatus, setVerifyStatus] = useState('COMPLIANT');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Verify Training/Cert Modal
  const [verifyingItem, setVerifyingItem] = useState<{ type: 'TRAINING' | 'CERT'; item: any } | null>(null);
  const [itemDecision, setItemDecision] = useState('VERIFIED');
  const [itemNotes, setItemNotes] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  const isContractor = user?.role === 'CONTRACTOR';
  const isWorkerOfficer = user?.role === 'WORKER MANAGEMENT' || user?.role === 'CORPORATE MANAGEMENT';

  useEffect(() => {
    const tab = searchParams.get('tab') || 'workers';
    setActiveTab(tab);
  }, [searchParams]);

  const setTab = (tab: string) => {
    setActiveTab(tab);
    setSearchParams(tab === 'workers' ? {} : { tab });
  };

  const fetchAllData = () => {
    setLoading(true);
    Promise.all([
      workersApi.list(),
      workersApi.trainings().catch(() => []),
      workersApi.certifications().catch(() => []),
    ]).then(([wList, tList, cList]: any) => {
      setWorkerList(wList || []);
      setTrainingList(tList || []);
      setCertList(cList || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAllData();
    Promise.all([minesApi.list(), contractorsApi.list()]).then(([mn, cont]: any) => {
      setMinesList(mn || []);
      setContractorsList(cont || []);
    }).catch(() => {});
  }, []);

  const openWorker = async (w: any) => {
    setSelected(w);
    setVerifyStatus(w.verification_status === 'VERIFIED' ? 'COMPLIANT' : 'UNDER_REVIEW');
    setVerifyNotes('');
    try {
      const [med, att, wTrain, wCert] = await Promise.all([
        workersApi.medicals(w.id).catch(() => []),
        workersApi.attendance(w.id).catch(() => []),
        workersApi.workerTrainings(w.id).catch(() => []),
        workersApi.workerCertifications(w.id).catch(() => []),
      ]);
      setMedicals(med as any[] || []);
      setAttendance(att as any[] || []);
      setWorkerTrainings(wTrain as any[] || []);
      setWorkerCerts(wCert as any[] || []);
    } catch {
      setMedicals([]);
      setAttendance([]);
      setWorkerTrainings([]);
      setWorkerCerts([]);
    }
  };

  const handleRegisterWorker = async () => {
    if (!newWorker.first_name || !newWorker.last_name || !newWorker.worker_code || !newWorker.mine_id) {
      alert('Please fill all required fields');
      return;
    }
    setRegistering(true);
    try {
      const payload = {
        ...newWorker,
        joining_date: new Date(newWorker.joining_date).toISOString(),
        contractor_id: isContractor ? user?.contractor_id : (newWorker.contractor_id || contractorsList[0]?.id)
      };
      const created: any = await workersApi.create(payload);
      setWorkerList(prev => [created, ...prev]);
      setShowRegisterModal(false);
      setNewWorker({
        worker_code: '',
        first_name: '',
        last_name: '',
        designation: 'Dumper Operator',
        mine_id: '',
        contractor_id: '',
        joining_date: new Date().toISOString().split('T')[0],
        blood_group: 'O+',
        emergency_contact: '+91 98000 00000',
      });
    } catch (e: any) { alert(e.message); }
    finally { setRegistering(false); }
  };

  const handleVerifyWorker = async (decision: string) => {
    if (!selected) return;
    setVerifying(true);
    try {
      const updated: any = await workersApi.verify(selected.id, {
        decision,
        notes: verifyNotes || `Worker record marked ${decision} by ${user?.full_name}`
      });
      setWorkerList(prev => prev.map(w => w.id === selected.id ? updated : w));
      setSelected(updated);
    } catch (e: any) { alert(e.message); }
    finally { setVerifying(false); }
  };

  const handleAddTraining = async () => {
    if (!newTraining.worker_id || !newTraining.training_name) {
      alert('Please select worker and enter training name');
      return;
    }
    setSavingTraining(true);
    try {
      const res: any = await workersApi.addTraining({
        ...newTraining,
        issue_date: new Date(newTraining.issue_date).toISOString(),
        expiry_date: newTraining.expiry_date ? new Date(newTraining.expiry_date).toISOString() : null,
      });
      setTrainingList(prev => [res, ...prev]);
      setShowAddTrainingModal(false);
      fetchAllData();
    } catch (e: any) { alert(e.message); }
    finally { setSavingTraining(false); }
  };

  const handleAddCert = async () => {
    if (!newCert.worker_id || !newCert.certification_name) {
      alert('Please select worker and enter certification details');
      return;
    }
    setSavingCert(true);
    try {
      const res: any = await workersApi.addCertification({
        ...newCert,
        issue_date: new Date(newCert.issue_date).toISOString(),
        expiry_date: newCert.expiry_date ? new Date(newCert.expiry_date).toISOString() : null,
      });
      setCertList(prev => [res, ...prev]);
      setShowAddCertModal(false);
      fetchAllData();
    } catch (e: any) { alert(e.message); }
    finally { setSavingCert(false); }
  };

  const handleItemVerify = async () => {
    if (!verifyingItem) return;
    setSubmittingVerify(true);
    try {
      if (verifyingItem.type === 'TRAINING') {
        const updated = await workersApi.verifyTraining(verifyingItem.item.id, {
          decision: itemDecision,
          notes: itemNotes,
        });
        setTrainingList(prev => prev.map(t => t.id === verifyingItem.item.id ? updated : t));
      } else {
        const updated = await workersApi.verifyCertification(verifyingItem.item.id, {
          decision: itemDecision,
          notes: itemNotes,
        });
        setCertList(prev => prev.map(c => c.id === verifyingItem.item.id ? updated : c));
      }
      setVerifyingItem(null);
      setItemNotes('');
    } catch (e: any) { alert(e.message); }
    finally { setSubmittingVerify(false); }
  };

  // Expiry calculation helper
  const getExpiryStatus = (dateStr: string | null) => {
    if (!dateStr) return { status: 'NO_EXPIRY', label: 'No Expiry', color: 'text-coal-400' };
    const exp = new Date(dateStr).getTime();
    const now = Date.now();
    const in30Days = now + 30 * 24 * 3600 * 1000;
    if (exp < now) return { status: 'EXPIRED', label: 'Expired', color: 'text-red-400' };
    if (exp <= in30Days) return { status: 'EXPIRING_SOON', label: 'Expiring Soon', color: 'text-amber-400' };
    return { status: 'VALID', label: 'Valid', color: 'text-emerald-400' };
  };

  // Unified Expiries List
  const unifiedExpiries = [
    ...workerList.filter(w => w.medical_expiry_date).map(w => ({
      id: `med-${w.id}`,
      category: 'MEDICAL_FITNESS',
      title: `Form O PME: ${w.first_name} ${w.last_name}`,
      worker_name: `${w.first_name} ${w.last_name}`,
      worker_code: w.worker_code,
      expiry_date: w.medical_expiry_date,
      status: getExpiryStatus(w.medical_expiry_date).status,
      ref: 'DGMS Form O'
    })),
    ...trainingList.filter(t => t.expiry_date).map(t => ({
      id: `trn-${t.id}`,
      category: 'TRAINING',
      title: t.training_name,
      worker_name: t.worker_id,
      worker_code: 'TRAINING',
      expiry_date: t.expiry_date,
      status: getExpiryStatus(t.expiry_date).status,
      ref: t.certificate_ref || 'VTC'
    })),
    ...certList.filter(c => c.expiry_date).map(c => ({
      id: `crt-${c.id}`,
      category: 'CERTIFICATION',
      title: c.certification_name,
      worker_name: c.worker_id,
      worker_code: 'CERTIFICATE',
      expiry_date: c.expiry_date,
      status: getExpiryStatus(c.expiry_date).status,
      ref: c.certificate_ref || 'DGMS'
    }))
  ];

  const filteredWorkers = workerList.filter(w => {
    if (filterType === 'EXPIRED') return w.is_medical_expired;
    if (filterType === 'PENDING') return w.verification_status === 'PENDING' || !w.verification_status;
    if (filterType === 'NON_COMPLIANT') return w.compliance_status === 'NON_COMPLIANT';
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Workforce Governance & Statutory Credentials</h1>
          <p className="text-coal-500 text-sm mt-0.5">
            Form O Medical Fitness, DGMS VTC Safety Training & Competency Certifications
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(isContractor || isWorkerOfficer) && (
            <>
              <button
                onClick={() => {
                  const codeSuffix = Math.floor(100 + Math.random() * 900);
                  setNewWorker(w => ({
                    ...w,
                    worker_code: `WRK-CIL-${codeSuffix}`,
                    mine_id: user?.mine_id || minesList[0]?.id || '',
                    contractor_id: user?.contractor_id || contractorsList[0]?.id || ''
                  }));
                  setShowRegisterModal(true);
                }}
                className="btn-primary text-xs"
              >
                <Plus size={14} /> Register Worker
              </button>
              <button
                onClick={() => {
                  setNewTraining(t => ({ ...t, worker_id: workerList[0]?.id || '' }));
                  setShowAddTrainingModal(true);
                }}
                className="btn-secondary text-xs"
              >
                <Award size={14} /> Add Training
              </button>
              <button
                onClick={() => {
                  setNewCert(c => ({ ...c, worker_id: workerList[0]?.id || '' }));
                  setShowAddCertModal(true);
                }}
                className="btn-secondary text-xs"
              >
                <FileCheck size={14} /> Add Certification
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-coal-800 gap-1 overflow-x-auto pb-px">
        {[
          { id: 'workers', label: 'Workforce Roster', icon: Users, count: workerList.length },
          { id: 'medical', label: 'Medical Fitness (Form O)', icon: HeartPulse, count: workerList.filter(w => w.is_medical_expired).length, badgeColor: 'bg-red-500/20 text-red-400' },
          { id: 'training', label: 'Statutory Training', icon: Award, count: trainingList.length },
          { id: 'certifications', label: 'Competency Certifications', icon: FileCheck, count: certList.length },
          { id: 'expiries', label: 'Expiry Tracking', icon: Clock, count: unifiedExpiries.filter(e => e.status === 'EXPIRED' || e.status === 'EXPIRING_SOON').length, badgeColor: 'bg-amber-500/20 text-amber-400' },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-cil-blue text-white bg-coal-800/60'
                  : 'border-transparent text-coal-400 hover:text-coal-200 hover:bg-coal-800/30'
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${t.badgeColor || 'bg-coal-800 text-coal-400'}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: WORKFORCE ROSTER */}
      {activeTab === 'workers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
              {[
                { label: 'Total Workers', value: workerList.length, color: 'text-white' },
                { label: 'Verified & Active', value: workerList.filter(w => w.verification_status === 'VERIFIED' || w.is_active).length, color: 'text-emerald-400' },
                { label: 'Expired PME (Form O)', value: workerList.filter(w => w.is_medical_expired).length, color: 'text-red-400' },
                { label: 'Pending Verification', value: workerList.filter(w => w.verification_status === 'PENDING' || !w.verification_status).length, color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className="kpi-card">
                  <div className="text-xs text-coal-500 uppercase font-semibold">{s.label}</div>
                  <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <select
              className="form-select text-xs w-48"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="ALL">All Workers</option>
              <option value="EXPIRED">Expired PME (Form O)</option>
              <option value="PENDING">Pending Verification</option>
              <option value="NON_COMPLIANT">Non-Compliant</option>
            </select>
          </div>

          {loading ? <LoadingState message="Loading workforce..." /> : filteredWorkers.length === 0 ? <EmptyState message="No workers matching filter" /> : (
            <div className="section-card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Worker Code</th>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>Contractor / Mine</th>
                    <th>Medical Fitness (Form O)</th>
                    <th>Verification Status</th>
                    <th>Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map(w => (
                    <tr key={w.id} className="cursor-pointer hover:bg-coal-800/40" onClick={() => openWorker(w)}>
                      <td className="font-mono text-xs text-coal-400">{w.worker_code}</td>
                      <td>
                        <span className="font-semibold text-coal-200">{w.first_name} {w.last_name}</span>
                      </td>
                      <td className="text-coal-400 text-xs">{w.designation}</td>
                      <td>
                        <div className="text-xs text-coal-300">{w.contractor_name || 'Direct Contractor'}</div>
                        <div className="text-[10px] text-coal-500">{w.mine_name}</div>
                      </td>
                      <td>
                        <StatusBadge status={w.is_medical_expired ? 'EXPIRED' : (w.medical_fitness_status || 'FIT')} />
                        <div className={`text-[10px] mt-0.5 ${w.is_medical_expired ? 'text-red-400 font-bold' : 'text-coal-500'}`}>
                          {w.medical_expiry_date ? `PME: ${formatDate(w.medical_expiry_date)}` : 'No PME Recorded'}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={w.verification_status || 'PENDING'} />
                      </td>
                      <td>
                        <StatusBadge status={w.compliance_status || 'COMPLIANT'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEDICAL FITNESS */}
      {activeTab === 'medical' && (
        <div className="space-y-4">
          <div className="bg-coal-800/30 border border-coal-700/60 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-lg">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Mines Rule 29B — Form O Medical Governance</h3>
                <p className="text-xs text-coal-400">
                  Workers must undergo statutory Periodical Medical Examination (PME) every 3–5 years depending on age and DGMS regulations.
                </p>
              </div>
            </div>
          </div>

          <div className="section-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker Code</th>
                  <th>Full Name</th>
                  <th>Designation</th>
                  <th>Examination Date</th>
                  <th>PME Expiry Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {workerList.map(w => {
                  const expInfo = getExpiryStatus(w.medical_expiry_date);
                  return (
                    <tr key={w.id}>
                      <td className="font-mono text-xs text-coal-400">{w.worker_code}</td>
                      <td className="font-semibold text-coal-200">{w.first_name} {w.last_name}</td>
                      <td className="text-xs text-coal-400">{w.designation}</td>
                      <td className="text-xs text-coal-300">{w.medical_expiry_date ? formatDate(w.medical_expiry_date) : 'Pending Exam'}</td>
                      <td className="text-xs">
                        <span className={`font-semibold ${expInfo.color}`}>
                          {w.medical_expiry_date ? formatDate(w.medical_expiry_date) : '—'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={expInfo.status} />
                      </td>
                      <td>
                        <button onClick={() => openWorker(w)} className="text-xs text-cil-blue hover:underline">
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STATUTORY TRAINING */}
      {activeTab === 'training' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">DGMS Mines Vocational Training Rules Records</h2>
              <p className="text-xs text-coal-400">Vocational Training Centers (VTC), refresher safety training, and statutory gas testing</p>
            </div>
            {(isContractor || isWorkerOfficer) && (
              <button
                onClick={() => {
                  setNewTraining(t => ({ ...t, worker_id: workerList[0]?.id || '' }));
                  setShowAddTrainingModal(true);
                }}
                className="btn-primary text-xs"
              >
                <Plus size={14} /> Add Training Record
              </button>
            )}
          </div>

          {trainingList.length === 0 ? (
            <EmptyState message="No training records registered yet" />
          ) : (
            <div className="section-card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Training Name</th>
                    <th>Type</th>
                    <th>Worker ID</th>
                    <th>Issue Date</th>
                    <th>Expiry Date</th>
                    <th>Certificate Ref</th>
                    <th>Verification</th>
                    {isWorkerOfficer && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {trainingList.map(t => {
                    const exp = getExpiryStatus(t.expiry_date);
                    return (
                      <tr key={t.id}>
                        <td className="font-semibold text-coal-200">{t.training_name}</td>
                        <td className="text-xs text-coal-400">{t.training_type}</td>
                        <td className="font-mono text-xs text-coal-300">{t.worker_id?.slice(0, 8)}...</td>
                        <td className="text-xs text-coal-400">{formatDate(t.issue_date)}</td>
                        <td className="text-xs">
                          <span className={exp.color}>{t.expiry_date ? formatDate(t.expiry_date) : 'Perpetual'}</span>
                        </td>
                        <td className="font-mono text-xs text-coal-400">{t.certificate_ref || '—'}</td>
                        <td>
                          <StatusBadge status={t.verification_status || 'PENDING'} />
                        </td>
                        {isWorkerOfficer && (
                          <td>
                            <button
                              onClick={() => {
                                setVerifyingItem({ type: 'TRAINING', item: t });
                                setItemDecision(t.verification_status === 'VERIFIED' ? 'VERIFIED' : 'VERIFIED');
                              }}
                              className="text-xs text-teal-400 hover:text-teal-300 underline"
                            >
                              Verify
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CERTIFICATIONS */}
      {activeTab === 'certifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Statutory Competency Certifications</h2>
              <p className="text-xs text-coal-400">DGMS Blaster Certificates, HEMM Heavy Equipment Licenses, First Aid & Gas Testing</p>
            </div>
            {(isContractor || isWorkerOfficer) && (
              <button
                onClick={() => {
                  setNewCert(c => ({ ...c, worker_id: workerList[0]?.id || '' }));
                  setShowAddCertModal(true);
                }}
                className="btn-primary text-xs"
              >
                <Plus size={14} /> Add Certification
              </button>
            )}
          </div>

          {certList.length === 0 ? (
            <EmptyState message="No competency certifications found" />
          ) : (
            <div className="section-card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Certification Name</th>
                    <th>Type</th>
                    <th>Worker ID</th>
                    <th>Certificate Number</th>
                    <th>Issue Date</th>
                    <th>Expiry Date</th>
                    <th>Verification</th>
                    {isWorkerOfficer && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {certList.map(c => {
                    const exp = getExpiryStatus(c.expiry_date);
                    return (
                      <tr key={c.id}>
                        <td className="font-semibold text-coal-200">{c.certification_name}</td>
                        <td className="text-xs text-coal-400">{c.certification_type}</td>
                        <td className="font-mono text-xs text-coal-300">{c.worker_id?.slice(0, 8)}...</td>
                        <td className="font-mono text-xs text-coal-300">{c.certificate_ref}</td>
                        <td className="text-xs text-coal-400">{formatDate(c.issue_date)}</td>
                        <td className="text-xs">
                          <span className={exp.color}>{c.expiry_date ? formatDate(c.expiry_date) : 'Permanent'}</span>
                        </td>
                        <td>
                          <StatusBadge status={c.verification_status || 'PENDING'} />
                        </td>
                        {isWorkerOfficer && (
                          <td>
                            <button
                              onClick={() => {
                                setVerifyingItem({ type: 'CERT', item: c });
                                setItemDecision(c.verification_status === 'VERIFIED' ? 'VERIFIED' : 'VERIFIED');
                              }}
                              className="text-xs text-teal-400 hover:text-teal-300 underline"
                            >
                              Verify
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: STATUTORY EXPIRY TRACKING */}
      {activeTab === 'expiries' && (
        <div className="space-y-4">
          <div className="bg-coal-800/40 border border-coal-700/60 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Central Statutory Expiry & Recertification Matrix</h3>
                <p className="text-xs text-coal-400">
                  Real-time detection of expired credentials and upcoming expiries (within 30 days) across Medical, Training & Certifications.
                </p>
              </div>
            </div>
          </div>

          <div className="section-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Compliance Stream</th>
                  <th>Title / Credential</th>
                  <th>Worker / Entity</th>
                  <th>Statutory Reference</th>
                  <th>Expiry Date</th>
                  <th>Expiry Status</th>
                </tr>
              </thead>
              <tbody>
                {unifiedExpiries.map(item => (
                  <tr key={item.id}>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.category === 'MEDICAL_FITNESS' ? 'bg-red-500/20 text-red-300' :
                        item.category === 'TRAINING' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        {item.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="font-semibold text-coal-200">{item.title}</td>
                    <td className="text-xs text-coal-300">{item.worker_name} ({item.worker_code})</td>
                    <td className="font-mono text-xs text-coal-400">{item.ref}</td>
                    <td className="text-xs">{item.expiry_date ? formatDate(item.expiry_date) : '—'}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Worker Detail & Verification Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected?.first_name} ${selected?.last_name}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-coal-800">
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.verification_status || 'PENDING'} />
                <StatusBadge status={selected.compliance_status || 'COMPLIANT'} />
                {selected.is_medical_expired && <StatusBadge status="EXPIRED" />}
              </div>
              <span className="font-mono text-xs text-coal-400">{selected.worker_code}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm bg-coal-800/40 rounded-xl p-4">
              {[
                ['Full Name', `${selected.first_name} ${selected.last_name}`],
                ['Designation', selected.designation],
                ['Mine Site', selected.mine_name],
                ['Contractor Agency', selected.contractor_name || 'Direct'],
                ['Blood Group', selected.blood_group],
                ['Joining Date', formatDate(selected.joining_date)],
                ['Emergency Contact', selected.emergency_contact || '—'],
                ['Medical Fitness Status', selected.medical_fitness_status || 'FIT'],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <div className="text-[10px] text-coal-500 uppercase font-semibold">{k}</div>
                  <div className="text-coal-200 text-sm mt-0.5">{v || '—'}</div>
                </div>
              ))}
            </div>

            {selected.is_medical_expired && (
              <div className="bg-red-950/40 border border-red-800/60 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 mt-0.5" />
                <div>
                  <div className="text-red-300 font-bold text-xs">Statutory Form O Periodical Medical Examination (PME) Expired!</div>
                  <p className="text-red-400/90 text-xs mt-0.5">
                    DGMS rules strictly prohibit deployment of workers with expired medicals. Worker must undergo mandatory re-examination.
                  </p>
                </div>
              </div>
            )}

            {/* Medical Records */}
            <div>
              <div className="text-xs font-bold text-coal-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <HeartPulse size={14} className="text-cil-blue" />
                Statutory Medical & Fitness History
              </div>
              {medicals.length === 0 ? (
                <div className="text-xs text-coal-500 bg-coal-800/30 p-3 rounded-lg">No medical records on file.</div>
              ) : (
                <div className="space-y-2">
                  {medicals.map((m: any) => (
                    <div key={m.id} className="bg-coal-800/60 border border-coal-700/50 rounded-lg p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-coal-200">{m.certificate_number}</span>
                        <StatusBadge status={m.is_expired ? 'EXPIRED' : m.fitness_status} />
                      </div>
                      <div className="text-[11px] text-coal-400 mt-1">
                        Examined: {formatDate(m.examination_date)} • Valid Until: <strong>{formatDate(m.expiry_date)}</strong>
                      </div>
                      <div className="text-[10px] text-coal-500 mt-0.5">
                        Hospital: {m.hospital_name} • Doctor: {m.examining_doctor}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trainings for this Worker */}
            <div>
              <div className="text-xs font-bold text-coal-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Award size={14} className="text-amber-400" />
                Safety & Vocational Trainings
              </div>
              {workerTrainings.length === 0 ? (
                <div className="text-xs text-coal-500 bg-coal-800/30 p-3 rounded-lg">No training records on file.</div>
              ) : (
                <div className="space-y-2">
                  {workerTrainings.map((t: any) => (
                    <div key={t.id} className="bg-coal-800/60 border border-coal-700/50 rounded-lg p-2.5 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-coal-200">{t.training_name}</div>
                        <div className="text-[10px] text-coal-400">{t.training_type} • Ref: {t.certificate_ref || '—'}</div>
                      </div>
                      <StatusBadge status={t.verification_status || 'PENDING'} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certifications for this Worker */}
            <div>
              <div className="text-xs font-bold text-coal-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileCheck size={14} className="text-teal-400" />
                Competency Certifications
              </div>
              {workerCerts.length === 0 ? (
                <div className="text-xs text-coal-500 bg-coal-800/30 p-3 rounded-lg">No certifications on file.</div>
              ) : (
                <div className="space-y-2">
                  {workerCerts.map((c: any) => (
                    <div key={c.id} className="bg-coal-800/60 border border-coal-700/50 rounded-lg p-2.5 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-coal-200">{c.certification_name}</div>
                        <div className="text-[10px] text-coal-400">{c.certification_type} • Lic: {c.certificate_ref}</div>
                      </div>
                      <StatusBadge status={c.verification_status || 'PENDING'} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* WORKER MANAGEMENT VERIFICATION GATEWAY */}
            {isWorkerOfficer && (
              <div className="border-t border-coal-800 pt-4 space-y-3">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                  <UserCheck size={14} /> Worker Management Verification Actions
                </div>
                <p className="text-xs text-coal-400">
                  Review contractor's worker submission, statutory fitness, and training credentials.
                </p>
                <textarea
                  className="form-input text-xs"
                  rows={2}
                  value={verifyNotes}
                  onChange={e => setVerifyNotes(e.target.value)}
                  placeholder="Officer verification notes (e.g. Form O verified, DGMS training verified)..."
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleVerifyWorker('VERIFIED')}
                    disabled={verifying}
                    className="btn-success justify-center text-xs"
                  >
                    <CheckCircle size={14} /> Verify & Approve Worker
                  </button>
                  <button
                    onClick={() => handleVerifyWorker('REJECTED')}
                    disabled={verifying}
                    className="btn-danger justify-center text-xs"
                  >
                    <AlertTriangle size={14} /> Flag Deficiencies (Reject)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Verify Training / Certification Modal */}
      <Modal
        open={!!verifyingItem}
        onClose={() => setVerifyingItem(null)}
        title={`Verify ${verifyingItem?.type === 'TRAINING' ? 'Training Record' : 'Certification'}`}
        size="sm"
      >
        {verifyingItem && (
          <div className="space-y-3">
            <p className="text-xs text-coal-300">
              Confirm or reject the validity of <strong>{verifyingItem.item.training_name || verifyingItem.item.certification_name}</strong>.
            </p>
            <div>
              <label className="form-label text-xs">Decision</label>
              <select
                className="form-select text-xs"
                value={itemDecision}
                onChange={e => setItemDecision(e.target.value)}
              >
                <option value="VERIFIED">Verified & Valid</option>
                <option value="REJECTED">Rejected / Invalid</option>
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Verification Notes</label>
              <textarea
                className="form-input text-xs"
                rows={2}
                value={itemNotes}
                onChange={e => setItemNotes(e.target.value)}
                placeholder="Certificate verified with DGMS / VTC record..."
              />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-coal-800">
              <button onClick={() => setVerifyingItem(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button onClick={handleItemVerify} disabled={submittingVerify} className="btn-primary text-xs">
                Submit Decision
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Training Modal */}
      <Modal open={showAddTrainingModal} onClose={() => setShowAddTrainingModal(false)} title="Record Statutory Training" size="md">
        <div className="space-y-3">
          <div>
            <label className="form-label text-xs">Select Worker</label>
            <select
              className="form-select text-xs"
              value={newTraining.worker_id}
              onChange={e => setNewTraining({ ...newTraining, worker_id: e.target.value })}
            >
              {workerList.map(w => (
                <option key={w.id} value={w.id}>
                  {w.first_name} {w.last_name} ({w.worker_code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Training Type</label>
              <select
                className="form-select text-xs"
                value={newTraining.training_type}
                onChange={e => setNewTraining({ ...newTraining, training_type: e.target.value })}
              >
                <option value="INITIAL_SAFETY">Initial Safety VTC</option>
                <option value="REFRESHER">Refresher Safety</option>
                <option value="SPECIALIZED">HEMM Operator Specialization</option>
                <option value="GAS_TESTING">Gas Testing & Ventilation</option>
                <option value="FIRST_AID">St. John First Aid</option>
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Training Course Name</label>
              <input
                type="text"
                className="form-input text-xs"
                value={newTraining.training_name}
                onChange={e => setNewTraining({ ...newTraining, training_name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Issue Date</label>
              <input
                type="date"
                className="form-input text-xs"
                value={newTraining.issue_date}
                onChange={e => setNewTraining({ ...newTraining, issue_date: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label text-xs">Expiry Date</label>
              <input
                type="date"
                className="form-input text-xs"
                value={newTraining.expiry_date}
                onChange={e => setNewTraining({ ...newTraining, expiry_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="form-label text-xs">Certificate / Reference No.</label>
            <input
              type="text"
              className="form-input text-xs"
              value={newTraining.certificate_ref}
              onChange={e => setNewTraining({ ...newTraining, certificate_ref: e.target.value })}
            />
          </div>
          <div className="flex gap-2 justify-end pt-3 border-t border-coal-800">
            <button onClick={() => setShowAddTrainingModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleAddTraining} disabled={savingTraining} className="btn-primary text-xs">
              Save Training Record
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Certification Modal */}
      <Modal open={showAddCertModal} onClose={() => setShowAddCertModal(false)} title="Record Competency Certification" size="md">
        <div className="space-y-3">
          <div>
            <label className="form-label text-xs">Select Worker</label>
            <select
              className="form-select text-xs"
              value={newCert.worker_id}
              onChange={e => setNewCert({ ...newCert, worker_id: e.target.value })}
            >
              {workerList.map(w => (
                <option key={w.id} value={w.id}>
                  {w.first_name} {w.last_name} ({w.worker_code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Certification Type</label>
              <select
                className="form-select text-xs"
                value={newCert.certification_type}
                onChange={e => setNewCert({ ...newCert, certification_type: e.target.value })}
              >
                <option value="HEMM_OPERATOR">HEMM Operator License</option>
                <option value="DGMS_BLASTER">DGMS Blaster Certificate</option>
                <option value="FIRST_AID">Certified First Aider</option>
                <option value="ELECTRICAL_SUPERVISOR">Electrical Supervisor Certificate</option>
                <option value="MINE_SURVEYOR">Mine Surveyor Certificate</option>
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Certification Name</label>
              <input
                type="text"
                className="form-input text-xs"
                value={newCert.certification_name}
                onChange={e => setNewCert({ ...newCert, certification_name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Certificate Number / ID</label>
              <input
                type="text"
                className="form-input text-xs"
                value={newCert.certificate_ref}
                onChange={e => setNewCert({ ...newCert, certificate_ref: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label text-xs">Expiry Date</label>
              <input
                type="date"
                className="form-input text-xs"
                value={newCert.expiry_date}
                onChange={e => setNewCert({ ...newCert, expiry_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-3 border-t border-coal-800">
            <button onClick={() => setShowAddCertModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleAddCert} disabled={savingCert} className="btn-primary text-xs">
              Save Certification
            </button>
          </div>
        </div>
      </Modal>

      {/* Register Worker Modal */}
      <Modal open={showRegisterModal} onClose={() => setShowRegisterModal(false)} title="Register Worker" size="md">
        <div className="space-y-3">
          <p className="text-xs text-coal-400">
            Submit worker details for statutory onboarding and medical compliance verification.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">First Name</label>
              <input
                type="text"
                className="form-input text-xs"
                placeholder="Ramesh"
                value={newWorker.first_name}
                onChange={e => setNewWorker({ ...newWorker, first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label text-xs">Last Name</label>
              <input
                type="text"
                className="form-input text-xs"
                placeholder="Kumar"
                value={newWorker.last_name}
                onChange={e => setNewWorker({ ...newWorker, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Worker ID / Code</label>
              <input
                type="text"
                className="form-input text-xs"
                value={newWorker.worker_code}
                onChange={e => setNewWorker({ ...newWorker, worker_code: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label text-xs">Designation</label>
              <select
                className="form-select text-xs"
                value={newWorker.designation}
                onChange={e => setNewWorker({ ...newWorker, designation: e.target.value })}
              >
                <option value="Dumper Operator">Dumper Operator</option>
                <option value="Blaster">DGMS Certified Blaster</option>
                <option value="HEMM Mechanic">HEMM Mechanic</option>
                <option value="Electrician">Substation Electrician</option>
                <option value="Loader Operator">Wheel Loader Operator</option>
                <option value="Surveyor">Mine Surveyor</option>
                <option value="General Labour">General Pit Labour</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Assigned Mine</label>
              <select
                className="form-select text-xs"
                value={newWorker.mine_id}
                onChange={e => setNewWorker({ ...newWorker, mine_id: e.target.value })}
              >
                <option value="">Select Mine...</option>
                {minesList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Contractor</label>
              {isContractor ? (
                <input
                  type="text"
                  className="form-input text-xs opacity-75"
                  disabled
                  value={user?.contractor_name || 'My Contractor Agency'}
                />
              ) : (
                <select
                  className="form-select text-xs"
                  value={newWorker.contractor_id}
                  onChange={e => setNewWorker({ ...newWorker, contractor_id: e.target.value })}
                >
                  <option value="">Select Contractor...</option>
                  {contractorsList.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label text-xs">Joining Date</label>
              <input
                type="date"
                className="form-input text-xs"
                value={newWorker.joining_date}
                onChange={e => setNewWorker({ ...newWorker, joining_date: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label text-xs">Blood Group</label>
              <select
                className="form-select text-xs"
                value={newWorker.blood_group}
                onChange={e => setNewWorker({ ...newWorker, blood_group: e.target.value })}
              >
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Emergency Phone</label>
              <input
                type="text"
                className="form-input text-xs"
                value={newWorker.emergency_contact}
                onChange={e => setNewWorker({ ...newWorker, emergency_contact: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-coal-800">
            <button onClick={() => setShowRegisterModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleRegisterWorker} disabled={registering} className="btn-primary text-xs">
              <Plus size={14} /> Submit Worker Registration
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
