import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function getRiskBadgeClass(risk: string | undefined): string {
  switch ((risk || '').toUpperCase()) {
    case 'LOW': return 'badge-low';
    case 'MEDIUM': return 'badge-medium';
    case 'HIGH': return 'badge-high-risk';
    case 'CRITICAL': return 'badge-critical';
    default: return 'badge-pending';
  }
}

export function getStatusBadgeClass(status: string | undefined): string {
  const s = (status || '').toUpperCase().replace(/ /g, '_');
  switch (s) {
    case 'COMPLIANT': return 'badge-compliant';
    case 'NON_COMPLIANT': return 'badge-non-compliant';
    case 'PENDING': return 'badge-pending';
    case 'UNDER_REVIEW': return 'badge-under-review';
    case 'RESOLVED': return 'badge-resolved';
    case 'OVERDUE': return 'badge-overdue';
    case 'OPEN': return 'badge-non-compliant';
    case 'IN_PROGRESS': return 'badge-under-review';
    case 'ASSIGNED': return 'badge-pending';
    case 'UNDER_VERIFICATION': return 'badge-under-review';
    case 'APPROVED': return 'badge-approved';
    case 'CORP_APPROVED': return 'badge-approved';
    case 'REJECTED': return 'badge-non-compliant';
    case 'CORP_REJECTED': return 'badge-non-compliant';
    case 'IN_CORRECTION': return 'badge-under-review';
    default: return 'badge-pending';
  }
}

export function getWorkflowStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNDER_MINE_MANAGER_REVIEW: 'Mine Manager Review',
    MM_VALIDATED: 'MM Validated',
    MM_REJECTED: 'MM Rejected',
    AUTOMATED_REPORT_GENERATED: 'Report Generated',
    UNDER_CORPORATE_REVIEW: 'Corporate Review',
    CORP_APPROVED: 'Corporate Approved',
    CORP_REJECTED: 'Corporate Rejected',
    APPROVED: 'Corporate Approved',
    REJECTED: 'Corporate Rejected',
    VIOLATIONS_FLAGGED: 'Violations Flagged',
    RE_SUBMITTED: 'Re-Submitted',
    RE_VERIFIED: 'Re-Verified',
  };
  return labels[stage] || stage;
}

export function getReportStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    AI_ANALYSIS: 'AI Analysis',
    MINE_MANAGER_REVIEW: 'Mine Manager Review',
    FINALIZED: 'Finalized',
    UNDER_CORPORATE_REVIEW: 'Pending Corp Review',
    APPROVED: 'Corporate Approved',
    REJECTED: 'Corporate Rejected',
    RESUBMITTED: 'Resubmitted',
  };
  return labels[status] || status;
}


export function getComplianceColor(score: number): string {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-yellow-400';
  if (score >= 55) return 'text-orange-400';
  return 'text-red-400';
}

export function getComplianceBgColor(score: number): string {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-yellow-500';
  if (score >= 55) return 'bg-orange-500';
  return 'bg-red-500';
}

export function truncate(text: string, maxLen: number = 80): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

export function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'CORPORATE MANAGEMENT': return 'badge-approved';
    case 'MINE MANAGER': return 'badge-under-review';
    case 'FIELD OFFICER': return 'badge-pending';
    case 'CONTRACTOR': return 'badge-medium';
    case 'WORKER MANAGEMENT': return 'badge-low';
    default: return 'badge-pending';
  }
}
