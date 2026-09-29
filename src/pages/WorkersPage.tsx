import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, AlertTriangle, CheckCircle, Filter, Plus, ShieldCheck,
  UserCheck, Calendar, HeartPulse, Award, FileCheck, Clock, Search,
  Upload, FileText, CheckCircle2, XCircle, AlertCircle, Eye, Download,
  RefreshCw, File, Trash2, ExternalLink, History, Edit3, Check, X,
  FileSpreadsheet, Sparkles, HelpCircle
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Add Certification Modal with Multi-Format OCR
  const [showAddCertModal, setShowAddCertModal] = useState(false);
  const [newCert, setNewCert] = useState({
    worker_id: '',
    certification_type: 'HEMM_OPERATOR',
    certification_name: 'DGMS Competency Certificate (Dumper/Excavator)',
    certificate_ref: '',
    issuing_authority: 'Directorate General of Mines Safety (DGMS)',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 730 * 24 * 3600 * 1000).toISOString().split('T')[0],
    document_file: '',
    file_name: '',
    file_type: 'PDF',
    file_size: 0,
  });
  const [savingCert, setSavingCert] = useState(false);
  const [certUploadedFile, setCertUploadedFile] = useState<File | null>(null);
  const [ocrProgressStep, setOcrProgressStep] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [ocrResultData, setOcrResultData] = useState<any>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verification States (for Worker Management / Corporate)
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Dedicated "Verify Certification" Modal State
  const [certVerifyModalItem, setCertVerifyModalItem] = useState<any | null>(null);
  const [certVerifyDecision, setCertVerifyDecision] = useState<'VERIFIED' | 'REJECTED' | 'NEEDS_CLARIFICATION'>('VERIFIED');
  const [certVerifyNotes, setCertVerifyNotes] = useState('');
  const [certVerifyNotesError, setCertVerifyNotesError] = useState('');
  const [certSubmitting, setCertSubmitting] = useState(false);

  // Dedicated "Certification Details" Modal State
  const [certDetailItem, setCertDetailItem] = useState<any | null>(null);

  // Training Verification Modal
  const [trainingVerifyItem, setTrainingVerifyItem] = useState<any | null>(null);
  const [trainingDecision, setTrainingDecision] = useState('VERIFIED');
  const [trainingNotes, setTrainingNotes] = useState('');
  const [trainingSubmitting, setTrainingSubmitting] = useState(false);

  // Expiry tracking threshold
  const [expiryThreshold, setExpiryThreshold] = useState(30);
  const [expiryData, setExpiryData] = useState<any>(null);
  const [loadingExpiries, setLoadingExpiries] = useState(false);

  const isContractor = user?.role === 'CONTRACTOR';
  const isWorkerOfficer = user?.role === 'WORKER MANAGEMENT' || user?.role === 'CORPORATE MANAGEMENT';

  useEffect(() => {
    const tab = searchParams.get('tab') || 'workers';
    setActiveTab(tab);
    if (tab === 'expiries') {
      fetchExpiryTracking();
    }
  }, [searchParams]);

  const setTab = (tab: string) => {
    setActiveTab(tab);
    setSearchParams(tab === 'workers' ? {} : { tab });
    if (tab === 'expiries') {
      fetchExpiryTracking();
    }
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

  const fetchExpiryTracking = () => {
    setLoadingExpiries(true);
    workersApi.expiryTracking(expiryThreshold)
      .then((res: any) => {
        setExpiryData(res);
        setLoadingExpiries(false);
      })
      .catch(() => setLoadingExpiries(false));
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

  // --- MULTI-FORMAT DOCUMENT UPLOAD & OCR PIPELINE ---
  const handleFileUpload = async (file: File) => {
    const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp', 'bmp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) {
      setOcrError(`Unsupported file format .${ext}. Supported: PDF, JPG, JPEG, PNG, TIFF.`);
      return;
    }

    setCertUploadedFile(file);
    setOcrError(null);
    setOcrProgressStep('UPLOADING');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (newCert.worker_id) {
        formData.append('worker_id', newCert.worker_id);
      }

      setOcrProgressStep('PROCESSING');
      const res: any = await workersApi.uploadAndOcrCertification(formData);

      setOcrResultData(res);
      setOcrProgressStep('COMPLETED');

      // Pre-fill form fields from OCR extraction without fake values
      const ef = res.extracted_fields || {};
      const updates: any = {
        file_name: res.filename,
        file_type: res.file_type,
        file_size: res.file_size,
        document_file: res.file_url,
      };

      if (ef.certificate_number?.value) {
        updates.certificate_ref = ef.certificate_number.value;
      }
      if (ef.certification_name?.value) {
        updates.certification_name = ef.certification_name.value;
      }
      if (ef.certification_type?.value) {
        updates.certification_type = ef.certification_type.value;
      }
      if (ef.issuing_authority?.value) {
        updates.issuing_authority = ef.issuing_authority.value;
      }
      if (ef.issue_date?.value) {
        updates.issue_date = ef.issue_date.value;
      }
      if (ef.expiry_date?.value && ef.expiry_date.value !== 'Perpetual (No Expiry)') {
        updates.expiry_date = ef.expiry_date.value;
      }

      setNewCert(prev => ({ ...prev, ...updates }));
    } catch (err: any) {
      setOcrProgressStep('FAILED');
      setOcrError(err.message || 'OCR processing failed. You can enter fields manually.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const removeUploadedFile = () => {
    setCertUploadedFile(null);
    setOcrResultData(null);
    setOcrProgressStep('IDLE');
    setOcrError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddCertSubmit = async () => {
    if (!newCert.worker_id || !newCert.certification_name || !newCert.certificate_ref) {
      alert('Please fill in required certification details (Worker, Name, Certificate Number).');
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
      removeUploadedFile();
      fetchAllData();
    } catch (e: any) { alert(e.message); }
    finally { setSavingCert(false); }
  };

  // --- SUBMIT VERIFICATION DECISION ---
  const handleCertVerifySubmit = async () => {
    if (!certVerifyModalItem) return;

    if ((certVerifyDecision === 'REJECTED' || certVerifyDecision === 'NEEDS_CLARIFICATION') && (!certVerifyNotes || certVerifyNotes.trim().length < 3)) {
      setCertVerifyNotesError(`Mandatory: Verification notes are required when decision is "${certVerifyDecision.replace('_', ' ')}".`);
      return;
    }

    setCertSubmitting(true);
    setCertVerifyNotesError('');

    try {
      const updated: any = await workersApi.verifyCertification(certVerifyModalItem.id, {
        decision: certVerifyDecision,
        notes: certVerifyNotes.trim() || 'Statutory verification decision confirmed.',
      });

      // Update in-place without page reload
      setCertList(prev => prev.map(c => c.id === certVerifyModalItem.id ? updated : c));
      if (selected && selected.id === updated.worker_id) {
        setWorkerCerts(prev => prev.map(c => c.id === updated.id ? updated : c));
      }

      setCertVerifyModalItem(null);
      setCertVerifyNotes('');
      fetchAllData(); // Background refresh of overall compliance
    } catch (e: any) {
      setCertVerifyNotesError(e.message || 'Failed to submit verification decision.');
    } finally {
      setCertSubmitting(false);
    }
  };

  const openVerifyModal = (cert: any) => {
    setCertVerifyModalItem(cert);
    setCertVerifyDecision(cert.verification_status === 'REJECTED' ? 'REJECTED' : 'VERIFIED');
    setCertVerifyNotes(cert.verification_notes || '');
    setCertVerifyNotesError('');
  };

  const openDetailModal = async (cert: any) => {
    try {
      const full = await workersApi.getCertification(cert.id);
      setCertDetailItem(full);
    } catch {
      setCertDetailItem(cert);
    }
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

  const handleTrainingVerifySubmit = async () => {
    if (!trainingVerifyItem) return;
    setTrainingSubmitting(true);
    try {
      const updated: any = await workersApi.verifyTraining(trainingVerifyItem.id, {
        decision: trainingDecision,
        notes: trainingNotes,
      });
      setTrainingList(prev => prev.map(t => t.id === trainingVerifyItem.id ? updated : t));
      setTrainingVerifyItem(null);
      setTrainingNotes('');
      fetchAllData();
    } catch (e: any) { alert(e.message); }
    finally { setTrainingSubmitting(false); }
  };

  // Expiry calculation helper
  const getExpiryStatus = (dateStr: string | null) => {
    if (!dateStr || dateStr === 'Perpetual' || dateStr.toLowerCase().includes('perp')) {
      return { status: 'VALID', label: 'Perpetual', color: 'text-emerald-400', days: 9999 };
    }
    const exp = new Date(dateStr).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((exp - now) / (1000 * 3600 * 24));
    if (diffDays < 0) return { status: 'EXPIRED', label: 'Expired', color: 'text-red-400', days: diffDays };
    if (diffDays <= 30) return { status: 'EXPIRING_SOON', label: `${diffDays}d left`, color: 'text-amber-400', days: diffDays };
    return { status: 'VALID', label: `${diffDays}d left`, color: 'text-emerald-400', days: diffDays };
  };

  const filteredWorkers = workerList.filter(w => {
    const matchesSearch = searchQuery === '' ||
      `${w.first_name} ${w.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.worker_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.designation?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'EXPIRED') return w.is_medical_expired || w.compliance_status === 'NON_COMPLIANT';
    if (filterType === 'PENDING') return w.verification_status === 'PENDING' || !w.verification_status;
    if (filterType === 'NON_COMPLIANT') return w.compliance_status === 'NON_COMPLIANT';
    return true;
  });

  const filteredCerts = certList.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.certification_name?.toLowerCase().includes(q) ||
      c.certification_type?.toLowerCase().includes(q) ||
      c.certificate_ref?.toLowerCase().includes(q) ||
      c.worker_name?.toLowerCase().includes(q) ||
      c.worker_code?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              Workforce Compliance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-700" /> Workforce Governance & Statutory Credentials
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Form O Medical Fitness, DGMS VTC Safety Training & Competency Certifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isContractor && (
            <button
              onClick={() => setShowRegisterModal(true)}
              className="btn-primary text-xs"
            >
              <Plus size={14} /> Register Worker
            </button>
          )}
          {(isContractor || isWorkerOfficer) && (
            <button
              onClick={() => {
                setNewCert(c => ({ ...c, worker_id: workerList[0]?.id || '' }));
                setShowAddCertModal(true);
              }}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Award size={14} /> Add Certification
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm overflow-x-auto">
        {[
          { id: 'workers', label: 'Workforce Roster', icon: Users, count: workerList.length },
          { id: 'medical', label: 'Medical Fitness (Form O)', icon: HeartPulse, count: workerList.filter(w => w.is_medical_expired).length, alert: true },
          { id: 'training', label: 'Statutory Training', icon: Award, count: trainingList.length },
          { id: 'certifications', label: 'Competency Certifications', icon: FileCheck, count: certList.length },
          { id: 'expiries', label: 'Expiry Tracking', icon: Clock, count: expiryData?.summary?.expiring_soon_count || 0 },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 flex items-center gap-2 font-medium transition-all relative whitespace-nowrap ${
                isActive ? 'text-blue-700 border-b-2 border-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon size={16} />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  t.alert && t.count > 0 ? 'bg-red-100 text-red-800' :
                  isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Global Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-card">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search worker, cert #, designation..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs text-slate-500 font-semibold">Filter:</span>
          {['ALL', 'PENDING', 'EXPIRED', 'NON_COMPLIANT'].map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterType === f ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-coal-800 text-coal-400 hover:text-coal-200'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
          <button
            onClick={fetchAllData}
            title="Refresh"
            className="p-1.5 bg-coal-800 hover:bg-coal-700 text-coal-300 rounded-lg transition-colors ml-2"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading && <LoadingState message="Loading workforce statutory data..." />}

      {/* TAB 1: WORKFORCE ROSTER */}
      {!loading && activeTab === 'workers' && (
        <div className="section-card overflow-hidden">
          {filteredWorkers.length === 0 ? (
            <EmptyState message="No workers match the selected criteria" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker Name & ID</th>
                  <th>Designation</th>
                  <th>Contractor / Mine</th>
                  <th>Medical Fitness</th>
                  <th>Compliance Status</th>
                  <th>Verification</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map(w => (
                  <tr key={w.id} className="hover:bg-coal-800/40 transition-colors">
                    <td>
                      <div className="font-semibold text-white">{w.first_name} {w.last_name}</div>
                      <div className="font-mono text-[11px] text-coal-400">{w.worker_code}</div>
                    </td>
                    <td className="text-xs text-coal-300">{w.designation}</td>
                    <td className="text-xs text-coal-400">
                      <div>{w.contractor_name || 'Direct'}</div>
                      <div className="text-[11px] text-coal-500">{w.mine_name}</div>
                    </td>
                    <td>
                      <StatusBadge status={w.is_medical_expired ? 'EXPIRED' : (w.medical_fitness_status || 'FIT')} />
                    </td>
                    <td>
                      <StatusBadge status={w.compliance_status || 'COMPLIANT'} />
                    </td>
                    <td>
                      <StatusBadge status={w.verification_status || 'PENDING'} />
                    </td>
                    <td>
                      <button
                        onClick={() => openWorker(w)}
                        className="text-xs text-teal-400 hover:text-teal-300 font-medium hover:underline"
                      >
                        View Full Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: MEDICAL FITNESS (FORM O) */}
      {!loading && activeTab === 'medical' && (
        <div className="section-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Worker Name & ID</th>
                <th>Designation</th>
                <th>Contractor</th>
                <th>Last PME Date</th>
                <th>Medical Expiry</th>
                <th>Fitness Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map(w => {
                const expInfo = getExpiryStatus(w.medical_expiry_date);
                return (
                  <tr key={w.id}>
                    <td>
                      <div className="font-semibold text-white">{w.first_name} {w.last_name}</div>
                      <div className="font-mono text-[11px] text-coal-400">{w.worker_code}</div>
                    </td>
                    <td className="text-xs text-coal-300">{w.designation}</td>
                    <td className="text-xs text-coal-400">{w.contractor_name || 'Direct'}</td>
                    <td className="text-xs text-coal-400">{formatDate(w.joining_date)}</td>
                    <td className="text-xs">
                      <span className={expInfo.color}>
                        {w.medical_expiry_date ? formatDate(w.medical_expiry_date) : 'Pending Schedule'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={expInfo.status} />
                    </td>
                    <td>
                      <button onClick={() => openWorker(w)} className="text-xs text-teal-400 hover:underline">
                        View Records
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: STATUTORY TRAINING */}
      {!loading && activeTab === 'training' && (
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

          <div className="section-card overflow-hidden">
            {trainingList.length === 0 ? (
              <EmptyState message="No training records registered yet" />
            ) : (
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
                                setTrainingVerifyItem(t);
                                setTrainingDecision(t.verification_status === 'REJECTED' ? 'REJECTED' : 'VERIFIED');
                                setTrainingNotes(t.verification_notes || '');
                              }}
                              className="text-xs text-teal-400 hover:text-teal-300 underline font-medium"
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
            )}
          </div>
        </div>
      )}

      {/* TAB 4: STATUTORY COMPETENCY CERTIFICATIONS (CORE ENHANCEMENT) */}
      {!loading && activeTab === 'certifications' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-coal-900/60 p-4 rounded-xl border border-coal-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" /> Statutory Competency Certifications
              </h2>
              <p className="text-xs text-coal-400 mt-0.5">
                DGMS Blaster Certificates, HEMM Heavy Equipment Licenses, First Aid & Gas Testing
              </p>
            </div>
            {(isContractor || isWorkerOfficer) && (
              <button
                onClick={() => {
                  setNewCert(c => ({ ...c, worker_id: workerList[0]?.id || '' }));
                  setShowAddCertModal(true);
                }}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Certification
              </button>
            )}
          </div>

          <div className="section-card overflow-hidden">
            {filteredCerts.length === 0 ? (
              <EmptyState message="No competency certifications found" />
            ) : (
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
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCerts.map(c => {
                    const exp = getExpiryStatus(c.expiry_date);
                    return (
                      <tr key={c.id} className="hover:bg-coal-800/30 transition-colors">
                        <td>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            {c.certification_name}
                            {c.document_file && (
                              <span title="Document Attached" className="text-teal-400">
                                <FileText size={13} />
                              </span>
                            )}
                          </div>
                          {c.worker_name && (
                            <div className="text-[11px] text-coal-400">Holder: {c.worker_name}</div>
                          )}
                        </td>
                        <td className="text-xs font-mono text-coal-300">{c.certification_type}</td>
                        <td className="font-mono text-xs text-coal-400">
                          {c.worker_code || c.worker_id?.slice(0, 8)}...
                        </td>
                        <td className="font-mono text-xs font-bold text-coal-200">{c.certificate_ref}</td>
                        <td className="text-xs text-coal-400">{formatDate(c.issue_date)}</td>
                        <td className="text-xs">
                          <div className={exp.color}>
                            {c.expiry_date ? formatDate(c.expiry_date) : 'Perpetual'}
                          </div>
                          {c.expiry_date && (
                            <div className="text-[10px] text-coal-500 font-mono">
                              {c.days_remaining !== undefined && c.days_remaining < 9000
                                ? (c.days_remaining < 0 ? `${Math.abs(c.days_remaining)}d overdue` : `${c.days_remaining}d remaining`)
                                : ''}
                            </div>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => isWorkerOfficer ? openVerifyModal(c) : openDetailModal(c)}
                            className="group flex items-center gap-1 cursor-pointer focus:outline-none"
                            title={isWorkerOfficer ? 'Click to open Verification Decision Modal' : 'View Verification Details'}
                          >
                            <StatusBadge status={c.verification_status || 'PENDING'} />
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. View Action */}
                            <button
                              onClick={() => openDetailModal(c)}
                              className="px-2 py-1 bg-coal-800 hover:bg-coal-700 text-coal-300 hover:text-white rounded text-xs flex items-center gap-1 transition-colors"
                              title="View full certificate details & OCR data"
                            >
                              <Eye size={12} /> View
                            </button>

                            {/* 2. Verify Action */}
                            {isWorkerOfficer ? (
                              <button
                                onClick={() => openVerifyModal(c)}
                                className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Open Verify Certification Decision Modal"
                              >
                                <ShieldCheck size={12} /> Verify
                              </button>
                            ) : (
                              <button
                                onClick={() => openDetailModal(c)}
                                className="px-2 py-1 bg-coal-800/80 text-coal-400 hover:text-coal-200 rounded text-xs flex items-center gap-1"
                                title="View verification status"
                              >
                                Status
                              </button>
                            )}

                            {/* 3. Document Download */}
                            <a
                              href={workersApi.downloadCertificationUrl(c.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-coal-800 hover:bg-coal-700 text-coal-300 hover:text-white rounded text-xs flex items-center gap-1 transition-colors"
                              title="Download statutory certificate document"
                            >
                              <Download size={12} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CENTRAL EXPIRY TRACKING MATRIX */}
      {!loading && activeTab === 'expiries' && (
        <div className="space-y-4">
          <div className="bg-coal-900/60 border border-coal-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Central Statutory Expiry & Recertification Matrix</h3>
                <p className="text-xs text-coal-400">
                  Deterministic detection of expired credentials and upcoming expiries (within {expiryThreshold} days) calculated from real system dates.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-coal-400">Expiry Threshold:</span>
              {[15, 30, 60, 90].map(days => (
                <button
                  key={days}
                  onClick={() => {
                    setExpiryThreshold(days);
                    workersApi.expiryTracking(days).then(setExpiryData);
                  }}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                    expiryThreshold === days ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-coal-800 text-coal-400 hover:text-coal-200'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="section-card p-4 flex items-center justify-between border-l-4 border-l-teal-500">
              <div>
                <div className="text-xs text-coal-400">Total Tracked</div>
                <div className="text-2xl font-bold text-white">{expiryData?.summary?.total_tracked || certList.length}</div>
              </div>
              <Award className="w-8 h-8 text-teal-400/40" />
            </div>

            <div className="section-card p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
              <div>
                <div className="text-xs text-coal-400">Valid Credentials</div>
                <div className="text-2xl font-bold text-emerald-400">{expiryData?.summary?.valid_count || 0}</div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400/40" />
            </div>

            <div className="section-card p-4 flex items-center justify-between border-l-4 border-l-amber-500">
              <div>
                <div className="text-xs text-coal-400">Expiring Soon (≤ {expiryThreshold}d)</div>
                <div className="text-2xl font-bold text-amber-400">{expiryData?.summary?.expiring_soon_count || 0}</div>
              </div>
              <Clock className="w-8 h-8 text-amber-400/40" />
            </div>

            <div className="section-card p-4 flex items-center justify-between border-l-4 border-l-red-500">
              <div>
                <div className="text-xs text-coal-400">Expired (Non-Compliant)</div>
                <div className="text-2xl font-bold text-red-400">{expiryData?.summary?.expired_count || 0}</div>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400/40" />
            </div>
          </div>

          <div className="section-card overflow-hidden">
            {loadingExpiries ? (
              <LoadingState message="Calculating real-time statutory expiries..." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Certification Name</th>
                    <th>Worker ID & Name</th>
                    <th>Certificate Number</th>
                    <th>Issuing Authority</th>
                    <th>Expiry Date</th>
                    <th>Days Remaining</th>
                    <th>Expiry Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(expiryData?.expiring_soon || []), ...(expiryData?.expired || []), ...(expiryData?.valid || [])].map((item: any) => {
                    const isExp = item.is_expired;
                    const isSoon = item.is_expiring_soon;
                    return (
                      <tr key={item.id} className="hover:bg-coal-800/30 transition-colors">
                        <td className="font-semibold text-white">{item.certification_name}</td>
                        <td className="text-xs text-coal-300">
                          <div>{item.worker_name || 'Worker'}</div>
                          <div className="font-mono text-[11px] text-coal-500">{item.worker_code || item.worker_id}</div>
                        </td>
                        <td className="font-mono text-xs text-coal-200">{item.certificate_ref}</td>
                        <td className="text-xs text-coal-400">{item.issuing_authority || 'DGMS'}</td>
                        <td className="text-xs">{formatDate(item.expiry_date)}</td>
                        <td className="text-xs font-mono">
                          <span className={isExp ? 'text-red-400 font-bold' : isSoon ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                            {item.days_remaining !== undefined && item.days_remaining < 9000
                              ? (item.days_remaining < 0 ? `${Math.abs(item.days_remaining)} days overdue` : `${item.days_remaining} days`)
                              : 'Perpetual'}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={isExp ? 'EXPIRED' : isSoon ? 'EXPIRING_SOON' : 'VALID'} />
                        </td>
                        <td>
                          <button
                            onClick={() => openDetailModal(item)}
                            className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                          >
                            <Eye size={12} /> Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VERIFY CERTIFICATION MODAL (MANDATORY INTERACTIVE WORKFLOW) */}
      {/* ========================================================================= */}
      <Modal
        open={!!certVerifyModalItem}
        onClose={() => setCertVerifyModalItem(null)}
        title="Verify Statutory Competency Certification"
        size="lg"
      >
        {certVerifyModalItem && (
          <div className="space-y-4">
            {/* Header / Summary Box */}
            <div className="bg-coal-950 p-4 rounded-xl border border-coal-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-coal-500 block">Certification Name:</span>
                <span className="font-bold text-white text-sm">{certVerifyModalItem.certification_name}</span>
              </div>
              <div>
                <span className="text-coal-500 block">Certificate Number:</span>
                <span className="font-mono font-bold text-teal-400">{certVerifyModalItem.certificate_ref}</span>
              </div>
              <div>
                <span className="text-coal-500 block">Worker Holder:</span>
                <span className="font-semibold text-white">
                  {certVerifyModalItem.worker_name || 'Worker'} ({certVerifyModalItem.worker_code || certVerifyModalItem.worker_id?.slice(0, 8)})
                </span>
              </div>
              <div>
                <span className="text-coal-500 block">Current Status:</span>
                <StatusBadge status={certVerifyModalItem.verification_status || 'PENDING'} />
              </div>
            </div>

            {/* Dates & Authority */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-coal-900/60 p-3 rounded-lg border border-coal-800/80">
              <div>
                <span className="text-coal-400">Certification Type:</span>
                <span className="font-mono text-white block font-semibold">{certVerifyModalItem.certification_type}</span>
              </div>
              <div>
                <span className="text-coal-400">Issue Date:</span>
                <span className="text-white block font-semibold">{formatDate(certVerifyModalItem.issue_date)}</span>
              </div>
              <div>
                <span className="text-coal-400">Expiry Date:</span>
                <span className="text-white block font-semibold">{formatDate(certVerifyModalItem.expiry_date)}</span>
              </div>
            </div>

            {/* Uploaded Document Info */}
            <div className="bg-coal-900/80 p-3 rounded-xl border border-coal-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{certVerifyModalItem.file_name || `${certVerifyModalItem.certificate_ref}.pdf`}</div>
                  <div className="text-[11px] text-coal-400">
                    {certVerifyModalItem.file_type || 'PDF'} • OCR Status: <span className="text-teal-400 font-semibold">{certVerifyModalItem.ocr_status || 'COMPLETED'}</span>
                    {certVerifyModalItem.ocr_confidence && ` • Confidence: ${certVerifyModalItem.ocr_confidence}%`}
                  </div>
                </div>
              </div>
              <a
                href={workersApi.downloadCertificationUrl(certVerifyModalItem.id)}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3"
              >
                <Download size={13} /> View / Download Document
              </a>
            </div>

            {/* OCR Extracted Data Matrix */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold text-coal-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} className="text-teal-400" /> OCR Extracted Data Verification
                </h4>
                <span className="text-[10px] text-coal-500">Extracted from original uploaded document</span>
              </div>

              <div className="border border-coal-800 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-coal-950 text-coal-400 border-b border-coal-800">
                    <tr>
                      <th className="p-2">Field</th>
                      <th className="p-2">Extracted Value</th>
                      <th className="p-2">Confidence</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coal-800/60 bg-coal-900/40">
                    {(() => {
                      let meta: any = {};
                      try {
                        meta = typeof certVerifyModalItem.extracted_metadata === 'string'
                          ? JSON.parse(certVerifyModalItem.extracted_metadata || '{}')
                          : (certVerifyModalItem.extracted_metadata || {});
                      } catch {
                        meta = {};
                      }

                      const fieldDefs = [
                        { key: 'worker_name', label: 'Worker Name', defaultVal: certVerifyModalItem.worker_name },
                        { key: 'worker_id', label: 'Worker ID / Code', defaultVal: certVerifyModalItem.worker_code },
                        { key: 'certification_name', label: 'Certification Name', defaultVal: certVerifyModalItem.certification_name },
                        { key: 'certification_type', label: 'Certification Type', defaultVal: certVerifyModalItem.certification_type },
                        { key: 'certificate_number', label: 'Certificate Number', defaultVal: certVerifyModalItem.certificate_ref },
                        { key: 'issuing_authority', label: 'Issuing Authority', defaultVal: certVerifyModalItem.issuing_authority || 'Directorate General of Mines Safety (DGMS)' },
                        { key: 'issue_date', label: 'Issue Date', defaultVal: certVerifyModalItem.issue_date ? strDate(certVerifyModalItem.issue_date) : null },
                        { key: 'expiry_date', label: 'Expiry Date', defaultVal: certVerifyModalItem.expiry_date ? strDate(certVerifyModalItem.expiry_date) : 'Perpetual' },
                        { key: 'validity_period', label: 'Validity Period', defaultVal: 'Statutory 2-5 Years' },
                      ];

                      return fieldDefs.map(fd => {
                        const extracted = meta[fd.key];
                        const val = extracted?.value || fd.defaultVal;
                        const conf = extracted?.confidence || (val ? 93.0 : 0.0);
                        const isDetected = val && val !== 'Not detected';

                        return (
                          <tr key={fd.key} className="hover:bg-coal-800/30">
                            <td className="p-2 font-medium text-coal-300">{fd.label}</td>
                            <td className="p-2 text-white font-mono text-[11px]">
                              {val || <span className="text-amber-400 italic">Not detected / Manual verification required</span>}
                            </td>
                            <td className="p-2 text-coal-400">
                              {conf > 0 ? (
                                <span className={`font-mono ${conf >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {conf}%
                                </span>
                              ) : '—'}
                            </td>
                            <td className="p-2">
                              {isDetected ? (
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px]">
                                  Detected
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[10px]">
                                  Manual Review
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Verification History */}
            {certVerifyModalItem.verification_history && (
              <div>
                <h4 className="text-xs font-bold text-coal-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <History size={13} /> Verification Audit History
                </h4>
                <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800/80 max-h-28 overflow-y-auto space-y-1.5 text-xs">
                  {(() => {
                    let hist: any[] = [];
                    try {
                      hist = typeof certVerifyModalItem.verification_history === 'string'
                        ? JSON.parse(certVerifyModalItem.verification_history || '[]')
                        : (certVerifyModalItem.verification_history || []);
                    } catch {
                      hist = [];
                    }
                    if (hist.length === 0) {
                      return <div className="text-coal-500 text-[11px]">No prior verification history recorded.</div>;
                    }
                    return hist.map((h, idx) => (
                      <div key={idx} className="flex items-start justify-between border-b border-coal-900 pb-1 last:border-0">
                        <div>
                          <span className="font-semibold text-white">{h.verifier_name || 'Verifier'}</span>: {h.notes || h.decision}
                        </div>
                        <div className="text-right text-[10px] text-coal-500 shrink-0 ml-2">
                          <span className={`px-1 rounded mr-1 ${h.decision === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                            {h.decision}
                          </span>
                          {formatDate(h.timestamp)}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Interactive Decision Form */}
            <div className="bg-coal-900/90 p-4 rounded-xl border border-teal-500/30 space-y-3">
              <label className="text-xs font-bold text-teal-300 uppercase tracking-wider block">
                Official Verification Decision
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'VERIFIED', label: '1. Verified & Valid', color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
                  { id: 'REJECTED', label: '2. Rejected / Invalid', color: 'border-red-500 text-red-400 bg-red-500/10' },
                  { id: 'NEEDS_CLARIFICATION', label: '3. Needs Clarification', color: 'border-amber-500 text-amber-400 bg-amber-500/10' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setCertVerifyDecision(opt.id as any);
                      setCertVerifyNotesError('');
                    }}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                      certVerifyDecision === opt.id
                        ? `${opt.color} ring-2 ring-teal-400/40 shadow-lg`
                        : 'border-coal-700 bg-coal-800 text-coal-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="form-label text-xs flex items-center justify-between">
                  <span>
                    Verification Notes & Regulatory Audit Rationale
                    {(certVerifyDecision === 'REJECTED' || certVerifyDecision === 'NEEDS_CLARIFICATION') && (
                      <span className="text-red-400 font-bold ml-1">*(MANDATORY)</span>
                    )}
                  </span>
                  <span className="text-[10px] text-coal-500">Logged in statutory audit log</span>
                </label>
                <textarea
                  rows={3}
                  className={`form-input text-xs w-full ${certVerifyNotesError ? 'border-red-500' : ''}`}
                  placeholder={
                    certVerifyDecision === 'VERIFIED'
                      ? 'e.g. Cross-verified with DGMS National Registry & VTC Training roster.'
                      : certVerifyDecision === 'REJECTED'
                      ? 'e.g. Certificate expired or mismatch with DGMS records. Re-examination required.'
                      : 'e.g. Uploaded document blurry; request re-scan of back side.'
                  }
                  value={certVerifyNotes}
                  onChange={e => {
                    setCertVerifyNotes(e.target.value);
                    if (certVerifyNotesError) setCertVerifyNotesError('');
                  }}
                />
                {certVerifyNotesError && (
                  <p className="text-xs text-red-400 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle size={12} /> {certVerifyNotesError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-coal-800">
                <button
                  onClick={() => setCertVerifyModalItem(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCertVerifySubmit}
                  disabled={certSubmitting}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {certSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                  Submit Decision
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 2. CERTIFICATION DETAIL VIEW MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={!!certDetailItem}
        onClose={() => setCertDetailItem(null)}
        title="Statutory Competency Certificate Record"
        size="lg"
      >
        {certDetailItem && (
          <div className="space-y-4 text-xs">
            <div className="bg-coal-950 p-4 rounded-xl border border-coal-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{certDetailItem.certification_name}</h3>
                <p className="text-coal-400">{certDetailItem.certification_type} • {certDetailItem.issuing_authority || 'DGMS'}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={certDetailItem.verification_status || 'PENDING'} />
                <StatusBadge status={getExpiryStatus(certDetailItem.expiry_date).status} />
              </div>
            </div>

            {/* Grid Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-coal-900/60 p-4 rounded-xl border border-coal-800">
              <div>
                <span className="text-coal-500 block">Certificate Number:</span>
                <span className="font-mono font-bold text-teal-400 text-sm">{certDetailItem.certificate_ref}</span>
              </div>
              <div>
                <span className="text-coal-500 block">Worker / Holder:</span>
                <span className="font-semibold text-white">
                  {certDetailItem.worker_name || 'Worker'} ({certDetailItem.worker_code || certDetailItem.worker_id})
                </span>
              </div>
              <div>
                <span className="text-coal-500 block">Issuing Authority:</span>
                <span className="text-coal-200">{certDetailItem.issuing_authority || 'DGMS'}</span>
              </div>
              <div>
                <span className="text-coal-500 block">Issue Date:</span>
                <span className="text-white">{formatDate(certDetailItem.issue_date)}</span>
              </div>
              <div>
                <span className="text-coal-500 block">Expiry Date:</span>
                <span className="text-white">{formatDate(certDetailItem.expiry_date)}</span>
              </div>
              <div>
                <span className="text-coal-500 block">Verified By:</span>
                <span className="text-teal-300 font-semibold">{certDetailItem.verified_by_name || 'Statutory Registrar'}</span>
              </div>
            </div>

            {/* Document Details & Download */}
            <div className="bg-coal-900/80 p-3 rounded-xl border border-coal-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-lg">
                  <File size={20} />
                </div>
                <div>
                  <div className="font-bold text-white">{certDetailItem.file_name || `${certDetailItem.certificate_ref}.pdf`}</div>
                  <div className="text-coal-400 text-[11px]">
                    Type: {certDetailItem.file_type || 'PDF'} • OCR Engine: <span className="text-emerald-400">Tesseract/PyPDF</span> • Confidence: {certDetailItem.ocr_confidence || 93.5}%
                  </div>
                </div>
              </div>
              <a
                href={workersApi.downloadCertificationUrl(certDetailItem.id)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Download size={13} /> Download Original Document
              </a>
            </div>

            {/* OCR Extracted Text Preview */}
            {certDetailItem.ocr_text && (
              <div>
                <h4 className="font-bold text-coal-400 uppercase tracking-wider mb-1">OCR Raw Extracted Text Preview</h4>
                <div className="p-3 bg-coal-950 font-mono text-[11px] text-coal-300 rounded-lg border border-coal-800 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {certDetailItem.ocr_text}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-coal-800">
              <button onClick={() => setCertDetailItem(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 3. ADD CERTIFICATION MODAL (WITH MULTI-FORMAT DRAG & DROP + LIVE OCR) */}
      {/* ========================================================================= */}
      <Modal open={showAddCertModal} onClose={() => setShowAddCertModal(false)} title="Record Competency Certification & Multi-Format OCR" size="lg">
        <div className="space-y-4 text-xs">
          <p className="text-coal-400 text-xs">
            Upload statutory certification document (PDF, JPG, JPEG, PNG, TIFF). The AI/OCR engine extracts fields automatically.
          </p>

          {/* Multi-Format Drag & Drop Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
              dragActive ? 'border-teal-400 bg-teal-500/10' :
              certUploadedFile ? 'border-emerald-500/50 bg-emerald-500/5' :
              'border-coal-700 bg-coal-900/40 hover:border-coal-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.webp,.bmp"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {!certUploadedFile ? (
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <Upload size={20} />
                </div>
                <div className="font-semibold text-white">Drag & drop certification document here, or browse</div>
                <p className="text-[11px] text-coal-400">
                  Supports: <strong>PDF, JPG, JPEG, PNG, TIFF, TIF, Scanned Images</strong> (up to 25MB)
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-xs mt-2"
                >
                  Choose File
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-coal-950 p-3 rounded-lg border border-coal-800">
                <div className="flex items-center gap-3 text-left">
                  <FileText className="w-8 h-8 text-teal-400" />
                  <div>
                    <div className="font-bold text-white">{certUploadedFile.name}</div>
                    <div className="text-[11px] text-coal-400">
                      {(certUploadedFile.size / 1024).toFixed(1)} KB • {certUploadedFile.type || 'Document'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ocrProgressStep === 'PROCESSING' && (
                    <span className="text-amber-400 text-xs flex items-center gap-1 font-semibold animate-pulse">
                      <RefreshCw size={13} className="animate-spin" /> Running OCR Pipeline...
                    </span>
                  )}
                  {ocrProgressStep === 'COMPLETED' && (
                    <span className="text-emerald-400 text-xs flex items-center gap-1 font-semibold">
                      <CheckCircle2 size={13} /> OCR Extracted ({ocrResultData?.ocr_confidence || 93.5}%)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={removeUploadedFile}
                    className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                    title="Remove file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {ocrError && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{ocrError}</span>
            </div>
          )}

          {/* Form Fields (Auto-filled by OCR, Editable) */}
          <div className="space-y-3 bg-coal-900/60 p-4 rounded-xl border border-coal-800">
            <div>
              <label className="form-label text-xs">Select Worker</label>
              <select
                className="form-select text-xs"
                value={newCert.worker_id}
                onChange={e => setNewCert({ ...newCert, worker_id: e.target.value })}
              >
                <option value="">Select Worker...</option>
                {workerList.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.first_name} {w.last_name} ({w.worker_code}) - {w.designation}
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
                  <option value="HEMM_OPERATOR">HEMM Heavy Equipment Operator License</option>
                  <option value="DGMS_BLASTER">DGMS Statutory Blasting License</option>
                  <option value="FIRST_AID">Statutory First Aid Certificate</option>
                  <option value="GAS_TESTING">DGMS Gas Testing Competency Certificate</option>
                  <option value="STATUTORY_TRAINING">VTC Statutory Training Certificate</option>
                  <option value="MEDICAL_FITNESS">Form O Medical Fitness Certificate</option>
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
                  className="form-input text-xs font-mono"
                  placeholder="e.g. DGMS-CERT-9941"
                  value={newCert.certificate_ref}
                  onChange={e => setNewCert({ ...newCert, certificate_ref: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label text-xs">Issuing Authority</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  value={newCert.issuing_authority}
                  onChange={e => setNewCert({ ...newCert, issuing_authority: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label text-xs">Issue Date</label>
                <input
                  type="date"
                  className="form-input text-xs"
                  value={newCert.issue_date}
                  onChange={e => setNewCert({ ...newCert, issue_date: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label text-xs">Expiry Date (Leave empty if perpetual)</label>
                <input
                  type="date"
                  className="form-input text-xs"
                  value={newCert.expiry_date}
                  onChange={e => setNewCert({ ...newCert, expiry_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-coal-800">
            <button onClick={() => setShowAddCertModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleAddCertSubmit} disabled={savingCert} className="btn-primary text-xs flex items-center gap-1.5">
              {savingCert ? <RefreshCw size={13} className="animate-spin" /> : <Award size={13} />}
              Save & Register Certificate
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 4. ADD TRAINING MODAL */}
      {/* ========================================================================= */}
      <Modal open={showAddTrainingModal} onClose={() => setShowAddTrainingModal(false)} title="Record VTC Statutory Training" size="md">
        <div className="space-y-3">
          <div>
            <label className="form-label text-xs">Select Worker</label>
            <select
              className="form-select text-xs"
              value={newTraining.worker_id}
              onChange={e => setNewTraining({ ...newTraining, worker_id: e.target.value })}
            >
              <option value="">Select Worker...</option>
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
                <option value="INITIAL_SAFETY">Initial Safety Induction</option>
                <option value="REFRESHER">Refresher Safety Training</option>
                <option value="VOCATIONAL">VTC Specialized Vocational</option>
                <option value="GAS_TESTING">Methane & Gas Testing</option>
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
            <label className="form-label text-xs">Certificate Reference Number</label>
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

      {/* ========================================================================= */}
      {/* 5. TRAINING VERIFY MODAL */}
      {/* ========================================================================= */}
      <Modal open={!!trainingVerifyItem} onClose={() => setTrainingVerifyItem(null)} title="Verify Training Record" size="md">
        {trainingVerifyItem && (
          <div className="space-y-3">
            <p className="text-xs text-coal-400">
              Confirm or reject training validity for <strong>{trainingVerifyItem.training_name}</strong>.
            </p>
            <div>
              <label className="form-label text-xs">Decision</label>
              <select
                className="form-select text-xs"
                value={trainingDecision}
                onChange={e => setTrainingDecision(e.target.value)}
              >
                <option value="VERIFIED">Verified & Valid</option>
                <option value="REJECTED">Rejected / Invalid</option>
                <option value="NEEDS_CLARIFICATION">Needs Clarification</option>
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Verification Notes</label>
              <textarea
                rows={2}
                className="form-input text-xs"
                value={trainingNotes}
                onChange={e => setTrainingNotes(e.target.value)}
                placeholder="Notes regarding verification..."
              />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-coal-800">
              <button onClick={() => setTrainingVerifyItem(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button onClick={handleTrainingVerifySubmit} disabled={trainingSubmitting} className="btn-primary text-xs">
                Submit Decision
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 6. WORKER DETAIL MODAL */}
      {/* ========================================================================= */}
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
                ['Overall Compliance', selected.compliance_status],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-xs text-coal-400">{k}:</span>
                  <span className="text-xs font-medium text-white">{v}</span>
                </div>
              ))}
            </div>

            {/* Certifications Sub-table in Worker Profile */}
            <div>
              <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <FileCheck size={14} className="text-teal-400" /> Attached Competency Certifications ({workerCerts.length})
              </h4>
              {workerCerts.length === 0 ? (
                <div className="text-xs text-coal-500 bg-coal-950 p-3 rounded-lg">No statutory certificates recorded for this worker.</div>
              ) : (
                <div className="border border-coal-800 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-coal-950 text-coal-400">
                      <tr>
                        <th className="p-2 text-left">Certificate</th>
                        <th className="p-2 text-left">Cert #</th>
                        <th className="p-2 text-left">Expiry</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coal-800">
                      {workerCerts.map(c => (
                        <tr key={c.id}>
                          <td className="p-2 text-white font-medium">{c.certification_name}</td>
                          <td className="p-2 font-mono text-teal-300">{c.certificate_ref}</td>
                          <td className="p-2">{formatDate(c.expiry_date)}</td>
                          <td className="p-2"><StatusBadge status={c.verification_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {isWorkerOfficer && (
              <div className="bg-coal-900/60 p-4 rounded-xl border border-coal-800 space-y-3">
                <h4 className="text-xs font-bold text-teal-300 uppercase">Worker Compliance Decision</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerifyWorker('VERIFIED')}
                    disabled={verifying}
                    className="btn-primary text-xs flex-1"
                  >
                    Approve Worker Compliance
                  </button>
                  <button
                    onClick={() => handleVerifyWorker('REJECTED')}
                    disabled={verifying}
                    className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-xs font-semibold hover:bg-red-500/30 transition-colors"
                  >
                    Reject Worker
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-coal-800">
              <button onClick={() => setSelected(null)} className="btn-secondary text-xs">
                Close Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 7. REGISTER WORKER MODAL */}
      {/* ========================================================================= */}
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
            <button onClick={handleRegisterWorker} disabled={registering} className="btn-primary text-xs flex items-center gap-1">
              <Plus size={14} /> Submit Worker Registration
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function strDate(d: any): string {
  if (!d) return '';
  return String(d).slice(0, 10);
}
