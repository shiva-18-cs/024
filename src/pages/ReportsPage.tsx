import { useState, useEffect } from 'react';
import {
  FileText, Download, CheckCircle, Clock, RefreshCw, AlertTriangle, XCircle, Filter,
  Bot, Sparkles, Send, ShieldCheck, Eye, MapPin, Image as ImageIcon, History, Plus
} from 'lucide-react';
import { reports as reportsApi, inspections as inspectionsApi } from '../services/api';
import { SectionCard, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';
import { formatDateTime, getReportStatusLabel } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportList, setReportList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFTS' | 'UNDER_REVIEW' | 'REVISIONS' | 'APPROVED'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Actions state
  const [managerRemarksInput, setManagerRemarksInput] = useState('');
  const [revisionNotesInput, setRevisionNotesInput] = useState('');
  const [corporateNotesInput, setCorporateNotesInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Draft Modal
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [inspectionsList, setInspectionsList] = useState<any[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState('');
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportRemarks, setNewReportRemarks] = useState('');

  // Evidence viewer modal
  const [viewingEvidence, setViewingEvidence] = useState<any>(null);

  const isCorp = user?.role === 'CORPORATE MANAGEMENT';
  const isMineManager = user?.role === 'MINE MANAGER' || user?.role === 'CORPORATE MANAGEMENT';

  const fetchReports = () => {
    setLoading(true);
    reportsApi.list()
      .then((data: any) => {
        setReportList(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchInspectionsForDraft = () => {
    inspectionsApi.list()
      .then((data: any) => {
        // Find inspections submitted and ready for reporting
        setInspectionsList(data || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchReports();
    if (isMineManager) {
      fetchInspectionsForDraft();
    }
  }, []);

  const openReportDetail = (report: any) => {
    setSelected(report);
    setManagerRemarksInput(report.manager_remarks || '');
    setRevisionNotesInput('');
    setCorporateNotesInput('');
    setActionMessage(null);

    // Fetch review history
    setLoadingHistory(true);
    reportsApi.history(report.id)
      .then((hist: any) => {
        setReviewHistory(hist || []);
        setLoadingHistory(false);
      })
      .catch(() => {
        setReviewHistory([]);
        setLoadingHistory(false);
      });
  };

  // 1. Create Report Draft
  const handleCreateDraft = async () => {
    if (!selectedInspectionId) {
      alert('Please select an inspection to generate a report.');
      return;
    }
    setSubmittingAction(true);
    try {
      const created: any = await reportsApi.createDraft({
        inspection_id: selectedInspectionId,
        report_title: newReportTitle || undefined,
        manager_remarks: newReportRemarks || undefined
      });
      setReportList(prev => [created, ...prev]);
      setShowDraftModal(false);
      setSelectedInspectionId('');
      setNewReportTitle('');
      setNewReportRemarks('');
      openReportDetail(created);
    } catch (e: any) {
      alert(e.message || 'Failed to create report draft');
    } finally {
      setSubmittingAction(false);
    }
  };

  // 2. Run AI Risk Analysis
  const handleRunAIAnalysis = async () => {
    if (!selected) return;
    setSubmittingAction(true);
    setActionMessage(null);
    try {
      const res: any = await reportsApi.runAiAnalysis(selected.id);
      const updatedReport = await reportsApi.get(selected.id);
      setSelected(updatedReport);
      setReportList(prev => prev.map(r => r.id === selected.id ? updatedReport : r));
      setActionMessage({ type: 'success', text: 'AI-Assisted Risk Analysis completed and persisted!' });
      // Refresh history
      reportsApi.history(selected.id).then((h: any) => setReviewHistory(h || []));
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'AI Analysis failed' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // 3. Save Remarks
  const handleSaveRemarks = async () => {
    if (!selected) return;
    setSubmittingAction(true);
    setActionMessage(null);
    try {
      const updated: any = await reportsApi.saveRemarks(selected.id, managerRemarksInput);
      setSelected(updated);
      setReportList(prev => prev.map(r => r.id === selected.id ? updated : r));
      setActionMessage({ type: 'success', text: 'Mine Manager remarks updated successfully!' });
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Failed to update remarks' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // 4. Finalize Report
  const handleFinalizeReport = async () => {
    if (!selected) return;
    setSubmittingAction(true);
    setActionMessage(null);
    try {
      const updated: any = await reportsApi.finalize(selected.id, managerRemarksInput);
      setSelected(updated);
      setReportList(prev => prev.map(r => r.id === selected.id ? updated : r));
      setActionMessage({ type: 'success', text: 'Statutory Report finalized with official seal!' });
      reportsApi.history(selected.id).then((h: any) => setReviewHistory(h || []));
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Failed to finalize report' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // 5. Submit to Corporate
  const handleSubmitToCorporate = async () => {
    if (!selected) return;
    setSubmittingAction(true);
    setActionMessage(null);
    try {
      const updated: any = await reportsApi.submitToCorporate(selected.id);
      setSelected(updated);
      setReportList(prev => prev.map(r => r.id === selected.id ? updated : r));
      setActionMessage({ type: 'success', text: 'Report submitted to Corporate Management for final sign-off!' });
      reportsApi.history(selected.id).then((h: any) => setReviewHistory(h || []));
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Failed to submit report' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // 6. Corporate Review (Approve / Reject)
  const handleCorporateReview = async (approve: boolean) => {
    if (!selected) return;
    if (!approve && (!corporateNotesInput || !corporateNotesInput.trim())) {
      alert('Rejection reason and feedback is MANDATORY when rejecting a statutory report.');
      return;
    }
    setSubmittingAction(true);
    setActionMessage(null);
    try {
      await reportsApi.corporateReview(selected.id, {
        approve,
        notes: corporateNotesInput.trim() || (approve ? 'Approved statutory report.' : '')
      });
      const updated = await reportsApi.get(selected.id);
      setSelected(updated);
      setReportList(prev => prev.map(r => r.id === selected.id ? updated : r));
      setCorporateNotesInput('');
      setActionMessage({
        type: 'success',
        text: approve ? 'Report approved with corporate governance seal!' : 'Report returned to Mine Manager for revision.'
      });
      reportsApi.history(selected.id).then((h: any) => setReviewHistory(h || []));
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Corporate review submission failed' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // 7. Resubmit Report
  const handleResubmit = async () => {
    if (!selected) return;
    if (!revisionNotesInput || !revisionNotesInput.trim()) {
      alert('Please specify the revision notes detailing the corrections made.');
      return;
    }
    setSubmittingAction(true);
    setActionMessage(null);
    try {
      const updated: any = await reportsApi.resubmit(selected.id, { revision_notes: revisionNotesInput.trim() });
      setSelected(updated);
      setReportList(prev => prev.map(r => r.id === selected.id ? updated : r));
      setRevisionNotesInput('');
      setActionMessage({ type: 'success', text: 'Revised report successfully resubmitted to Corporate Management!' });
      reportsApi.history(selected.id).then((h: any) => setReviewHistory(h || []));
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Failed to resubmit report' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const downloadReport = (id: string, format: string) => {
    window.open(reportsApi.downloadUrl(id, format), '_blank');
  };

  // Filter logic
  const filteredReports = reportList.filter(r => {
    if (activeTab === 'DRAFTS') return r.approval_status === 'DRAFT' || r.approval_status === 'AI_ANALYSIS' || r.approval_status === 'FINALIZED';
    if (activeTab === 'UNDER_REVIEW') return r.approval_status === 'UNDER_CORPORATE_REVIEW';
    if (activeTab === 'REVISIONS') return r.approval_status === 'REJECTED';
    if (activeTab === 'APPROVED') return r.approval_status === 'APPROVED';
    if (statusFilter !== 'ALL') return r.approval_status === statusFilter;
    return true;
  });

  const countDrafts = reportList.filter(r => ['DRAFT', 'AI_ANALYSIS', 'FINALIZED'].includes(r.approval_status)).length;
  const countUnderReview = reportList.filter(r => r.approval_status === 'UNDER_CORPORATE_REVIEW').length;
  const countRejected = reportList.filter(r => r.approval_status === 'REJECTED').length;
  const countApproved = reportList.filter(r => r.approval_status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-700" />
            <h1 className="text-2xl font-extrabold text-slate-900">
              Official Statutory Mine Reports
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            5-Stage Governance Workflow: Draft &rarr; AI Risk Analysis &rarr; Mine Manager Review &rarr; Finalize &rarr; Corporate Approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchReports} className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 flex items-center gap-1.5 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {isMineManager && (
            <button
              onClick={() => setShowDraftModal(true)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Report Draft
            </button>
          )}
        </div>
      </div>

      {/* KPI Workflow Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => { setActiveTab('DRAFTS'); setStatusFilter('ALL'); }}
          className={`bg-white border rounded-xl p-4 cursor-pointer transition-all shadow-xs ${
            activeTab === 'DRAFTS' ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Drafts / In Preparation</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{countDrafts}</div>
          <div className="text-[11px] font-semibold text-blue-700 mt-1">Mine Manager Stage</div>
        </div>

        <div
          onClick={() => { setActiveTab('UNDER_REVIEW'); setStatusFilter('ALL'); }}
          className={`bg-white border rounded-xl p-4 cursor-pointer transition-all shadow-xs ${
            activeTab === 'UNDER_REVIEW' ? 'border-sky-600 ring-2 ring-sky-600/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Under Corporate Review</div>
          <div className="text-2xl font-extrabold text-sky-700 mt-1">{countUnderReview}</div>
          <div className="text-[11px] font-semibold text-sky-700 mt-1">Awaiting Sign-off</div>
        </div>

        <div
          onClick={() => { setActiveTab('REVISIONS'); setStatusFilter('ALL'); }}
          className={`bg-white border rounded-xl p-4 cursor-pointer transition-all shadow-xs ${
            activeTab === 'REVISIONS' ? 'border-rose-600 ring-2 ring-rose-600/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Revision Required</div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">{countRejected}</div>
          <div className="text-[11px] font-semibold text-rose-700 mt-1">Corporate Directives Issued</div>
        </div>

        <div
          onClick={() => { setActiveTab('APPROVED'); setStatusFilter('ALL'); }}
          className={`bg-white border rounded-xl p-4 cursor-pointer transition-all shadow-xs ${
            activeTab === 'APPROVED' ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Corporate Approved</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{countApproved}</div>
          <div className="text-[11px] font-semibold text-emerald-700 mt-1">Statutory Certified</div>
        </div>
      </div>

      {/* Reports Table */}
      <SectionCard title="Statutory Compliance Reports Archive">
        {loading ? (
          <LoadingState text="Loading official reports..." />
        ) : filteredReports.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-12 h-12 text-slate-400" />}
            title="No Reports Found"
            description="No reports match the selected workflow filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Report Number</th>
                  <th className="p-3.5">Title / Mine</th>
                  <th className="p-3.5">Generated Date</th>
                  <th className="p-3.5">AI Risk Level</th>
                  <th className="p-3.5">Governance Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReports.map((r) => {
                  const riskScore = r.ai_risk_score ?? r.report_data?.compliance_score ?? null;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openReportDetail(r)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 font-mono text-xs font-bold text-blue-700">
                        {r.report_number}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-sm">
                          {r.report_title || 'Statutory Compliance Report'}
                        </div>
                        <div className="text-xs font-medium text-slate-600 mt-0.5">
                          {r.mine_name || 'Assigned Mine'}
                        </div>
                      </td>
                      <td className="p-3.5 text-xs text-slate-600 font-medium">
                        {formatDateTime(r.generated_at)}
                      </td>
                      <td className="p-3.5">
                        {riskScore !== null ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                              riskScore >= 70
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : riskScore >= 40
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            Score: {Math.round(riskScore)}/100
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Not Assessed</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            r.approval_status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : r.approval_status === 'UNDER_CORPORATE_REVIEW'
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : r.approval_status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : r.approval_status === 'FINALIZED'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : r.approval_status === 'AI_ANALYSIS'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {getReportStatusLabel(r.approval_status)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => downloadReport(r.id, 'pdf')}
                            className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </button>
                          <button
                            onClick={() => downloadReport(r.id, 'xlsx')}
                            className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> XLS
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* CREATE DRAFT MODAL */}
      {showDraftModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowDraftModal(false)}
          title="STEP 1 — Create Statutory Report Draft"
        >
          <div className="space-y-4 text-sm">
            <p className="text-xs text-slate-500">
              Select a submitted Field Officer inspection to initialize a new official statutory report draft.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Field Officer Inspection *
              </label>
              <select
                value={selectedInspectionId}
                onChange={(e) => setSelectedInspectionId(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
              >
                <option value="">-- Choose Field Inspection --</option>
                {inspectionsList.map((insp) => (
                  <option key={insp.id} value={insp.id}>
                    {insp.inspection_number} | {insp.mine_name} | Score: {insp.compliance_score}% | {insp.inspection_type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Report Title (Optional)
              </label>
              <input
                type="text"
                value={newReportTitle}
                onChange={(e) => setNewReportTitle(e.target.value)}
                placeholder="e.g. Official Statutory Safety & Environmental Report"
                className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Mine Manager Remarks
              </label>
              <textarea
                rows={3}
                value={newReportRemarks}
                onChange={(e) => setNewReportRemarks(e.target.value)}
                placeholder="Preliminary observations on field inspection findings..."
                className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowDraftModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDraft}
                disabled={submittingAction}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                {submittingAction ? 'Drafting...' : 'Create Official Draft'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* FULL MULTI-STEP REPORT WORKFLOW MODAL */}
      {selected && (
        <Modal
          isOpen={true}
          onClose={() => setSelected(null)}
          title={`Report Dossier: ${selected.report_number}`}
        >
          <div className="space-y-6 text-sm max-h-[80vh] overflow-y-auto pr-1">
            {/* Action feedback message */}
            {actionMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold ${
                  actionMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
                }`}
              >
                {actionMessage.text}
              </div>
            )}

            {/* Workflow Stage Tracker */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Statutory Governance Status:
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    selected.approval_status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                      : selected.approval_status === 'UNDER_CORPORATE_REVIEW'
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300'
                      : selected.approval_status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                      : selected.approval_status === 'FINALIZED'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300'
                      : selected.approval_status === 'AI_ANALYSIS'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                  }`}
                >
                  {getReportStatusLabel(selected.approval_status)}
                </span>

                <div className="text-xs text-slate-500">
                  {selected.approval_status === 'DRAFT' && '— Step 1 Complete. Ready for AI Risk Analysis.'}
                  {selected.approval_status === 'AI_ANALYSIS' && '— Step 2 Complete. Review AI findings and add remarks.'}
                  {selected.approval_status === 'FINALIZED' && '— Step 4 Complete. Ready to Submit to Corporate.'}
                  {selected.approval_status === 'UNDER_CORPORATE_REVIEW' && '— Step 5 Active. Awaiting Corporate Governance Review.'}
                  {selected.approval_status === 'REJECTED' && '— Revision Required by Corporate Management.'}
                  {selected.approval_status === 'APPROVED' && '— Statutory Sign-Off Complete.'}
                </div>
              </div>
            </div>

            {/* General Report Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <div>
                <span className="text-xs text-slate-500">Mine Location</span>
                <p className="font-semibold text-slate-900 dark:text-white">{selected.mine_name || 'Assigned Mine'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Contractor / Operator</span>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {selected.report_data?.contractor_name || 'Direct Operations'}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Generated Date</span>
                <p className="font-semibold text-slate-900 dark:text-white">{formatDateTime(selected.generated_at)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Drafted By</span>
                <p className="font-semibold text-slate-900 dark:text-white">{selected.created_by_name || 'Mine Manager'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Finalized At</span>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {selected.finalized_at ? formatDateTime(selected.finalized_at) : 'Pending'}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Corporate Sign-Off</span>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {selected.corporate_reviewed_at ? formatDateTime(selected.corporate_reviewed_at) : 'Pending'}
                </p>
              </div>
            </div>

            {/* Corporate Rejection Feedback Alert (PART B & C) */}
            {selected.approval_status === 'REJECTED' && selected.rejection_feedback && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                  <AlertTriangle className="w-5 h-5" />
                  Corporate Revision Directive
                </div>
                <p className="text-xs text-rose-900 dark:text-rose-200 bg-white/60 dark:bg-black/20 p-2.5 rounded font-medium">
                  {selected.rejection_feedback}
                </p>
                {selected.corporate_reviewer_name && (
                  <div className="text-[11px] text-rose-600 dark:text-rose-400">
                    Reviewer: <strong>{selected.corporate_reviewer_name}</strong> | Date: {formatDateTime(selected.corporate_reviewed_at)}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: AI RISK ANALYSIS SECTION */}
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    AI-Assisted Risk Analysis & Pattern Engine
                  </h4>
                </div>

                {isMineManager && selected.approval_status === 'DRAFT' && (
                  <button
                    onClick={handleRunAIAnalysis}
                    disabled={submittingAction}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {submittingAction ? 'Evaluating...' : 'Run AI Risk Analysis'}
                  </button>
                )}
              </div>

              {selected.ai_risk_score !== undefined && selected.ai_risk_score !== null ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Assessed Risk Score:</span>
                    <span
                      className={`text-sm font-extrabold px-2.5 py-0.5 rounded ${
                        selected.ai_risk_score >= 70
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                          : selected.ai_risk_score >= 40
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      }`}
                    >
                      {selected.ai_risk_score} / 100
                    </span>
                  </div>

                  {(selected.ai_explanation || selected.ai_summary) && (
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                      <strong>AI Explanation: </strong>
                      {selected.ai_explanation || selected.ai_summary}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  AI risk scoring has not been executed on this draft. Click "Run AI Risk Analysis" above.
                </p>
              )}
            </div>

            {/* STEP 3 & 4: MINE MANAGER REMARKS & FINALIZATION */}
            {isMineManager && (
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                <h4 className="font-bold text-slate-900">
                  Mine Manager Review & Remarks
                </h4>

                {['DRAFT', 'AI_ANALYSIS'].includes(selected.approval_status) ? (
                  <div className="space-y-3">
                    <textarea
                      rows={3}
                      value={managerRemarksInput}
                      onChange={(e) => setManagerRemarksInput(e.target.value)}
                      placeholder="Enter Mine Manager review remarks, mitigation instructions, or field validations..."
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />

                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <button
                        onClick={handleSaveRemarks}
                        disabled={submittingAction}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors"
                      >
                        Save Remarks
                      </button>

                      <button
                        onClick={handleFinalizeReport}
                        disabled={submittingAction}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Finalize Report
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                    {selected.manager_remarks || 'No manager remarks recorded.'}
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: SUBMIT TO CORPORATE MANAGEMENT */}
            {isMineManager && selected.approval_status === 'FINALIZED' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <h5 className="font-bold text-slate-900">Ready for Corporate Submission</h5>
                  <p className="text-xs text-slate-600">Report is finalized with official remarks. Submit to Corporate Governance.</p>
                </div>
                <button
                  onClick={handleSubmitToCorporate}
                  disabled={submittingAction}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Submit to Corporate
                </button>
              </div>
            )}

            {/* RESUBMISSION INTERFACE (PART C) */}
            {isMineManager && selected.approval_status === 'REJECTED' && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 shadow-xs">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-700" />
                  Mine Manager Report Revision & Resubmission
                </h4>
                <p className="text-xs text-slate-600">
                  Address the corporate revision feedback above, record specific rectifications, and resubmit for statutory review.
                </p>

                <textarea
                  rows={3}
                  value={revisionNotesInput}
                  onChange={(e) => setRevisionNotesInput(e.target.value)}
                  placeholder="Detail the corrections made per Corporate Directives..."
                  className="w-full text-sm bg-white border border-amber-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleResubmit}
                    disabled={submittingAction}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Resubmit to Corporate
                  </button>
                </div>
              </div>
            )}

            {/* CORPORATE MANAGEMENT GOVERNANCE GATEWAY (PART B) */}
            {isCorp && selected.approval_status === 'UNDER_CORPORATE_REVIEW' && (
              <div className="p-4 bg-sky-50 border border-sky-300 rounded-xl space-y-3 shadow-xs">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-700" />
                  Corporate Management Final Governance Gateway
                </h4>
                <p className="text-xs text-slate-600">
                  Perform statutory review. Approve to seal official report, or Reject with mandatory revision directives.
                </p>

                <textarea
                  rows={3}
                  value={corporateNotesInput}
                  onChange={(e) => setCorporateNotesInput(e.target.value)}
                  placeholder="Official governance review remarks (MANDATORY if rejecting report)..."
                  className="w-full text-sm bg-white border border-sky-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleCorporateReview(false)}
                    disabled={submittingAction}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject / Request Revision
                  </button>
                  <button
                    onClick={() => handleCorporateReview(true)}
                    disabled={submittingAction}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Sign-Off
                  </button>
                </div>
              </div>
            )}

            {/* AUDIT & DECISION HISTORY TIMELINE (PART M) */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Statutory Decision & Review History
              </h4>

              {loadingHistory ? (
                <div className="text-xs text-slate-400">Loading audit trail...</div>
              ) : reviewHistory.length === 0 ? (
                <div className="text-xs text-slate-500 italic">No formal review entries recorded yet.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {reviewHistory.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {rev.role_level}: {rev.decision}
                        </span>
                        <span className="text-slate-400">{formatDateTime(rev.reviewed_at)}</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        Reviewer: <strong>{rev.reviewer_name}</strong>
                      </div>
                      {rev.comments && (
                        <p className="text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-black/20 p-1.5 rounded text-[11px]">
                          "{rev.comments}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Downloads & Close */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex gap-2">
                <button
                  onClick={() => downloadReport(selected.id, 'pdf')}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button
                  onClick={() => downloadReport(selected.id, 'xlsx')}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download XLS
                </button>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
