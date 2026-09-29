import { ReactNode } from 'react';
import { cn } from '../../utils/helpers';
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconBg?: string;
  delta?: number;
  deltaLabel?: string;
  onClick?: () => void;
  className?: string;
}

export function KPICard({ label, value, icon, iconBg, delta, deltaLabel, onClick, className }: KPICardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white border border-slate-200 rounded-lg p-4 shadow-card transition-all duration-200",
        onClick && "cursor-pointer hover:border-blue-400 hover:shadow-card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
          {delta !== undefined && (
            <div className={cn(
              "text-xs font-semibold flex items-center gap-1 mt-1.5",
              delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-700" : "text-slate-500"
            )}>
              {delta > 0 ? <TrendingUp size={13} /> : delta < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
              <span>{Math.abs(delta)}% {deltaLabel || 'vs prior cycle'}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border",
          iconBg ? `${iconBg} border-slate-200/60` : "bg-slate-50 text-slate-700 border-slate-200"
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPad?: boolean;
}

export function SectionCard({ title, icon, actions, children, className, noPad }: SectionCardProps) {
  return (
    <div className={cn("bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden", className)}>
      <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          {icon && <span className="text-slate-500">{icon}</span>}
          <span>{title}</span>
        </h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className={noPad ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getClasses = () => {
    const s = (status || 'PENDING').toUpperCase().replace(/ /g, '_');
    switch (s) {
      case 'COMPLIANT':
      case 'ACTIVE':
      case 'OPERATIONAL':
      case 'FIT':
      case 'VERIFIED':
      case 'FIXED':
      case 'APPROVED':
      case 'CORP_APPROVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';

      case 'NON_COMPLIANT':
      case 'UNFIT':
      case 'EXPIRED':
      case 'NOT_FIXED':
      case 'REJECTED':
      case 'OPEN':
        return 'bg-red-50 text-red-700 border-red-200';

      case 'CRITICAL':
        return 'bg-red-100 text-red-900 border-red-300 font-bold';

      case 'HIGH':
      case 'HIGH_RISK':
        return 'bg-orange-50 text-orange-800 border-orange-200';

      case 'PENDING':
      case 'MEDIUM':
      case 'ACTION_REQUIRED':
      case 'ATTENTION':
      case 'DRAFT':
        return 'bg-amber-50 text-amber-800 border-amber-200';

      case 'UNDER_REVIEW':
      case 'UNDER_CORPORATE_REVIEW':
      case 'SUBMITTED':
      case 'IN_PROGRESS':
      case 'UNDER_VERIFICATION':
        return 'bg-blue-50 text-blue-700 border-blue-200';

      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-teal-50 text-teal-800 border-teal-200';

      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-200';

      case 'OVERDUE':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse';

      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border tracking-wide", getClasses(), className)}>
      {status}
    </span>
  );
}

interface ComplianceBarProps {
  score: number;
  showLabel?: boolean;
}

export function ComplianceBar({ score, showLabel = true }: ComplianceBarProps) {
  const color = score >= 85 ? 'bg-emerald-600' : score >= 70 ? 'bg-amber-500' : score >= 55 ? 'bg-orange-500' : 'bg-red-600';
  const textColor = score >= 85 ? 'text-emerald-700' : score >= 70 ? 'text-amber-700' : score >= 55 ? 'text-orange-700' : 'text-red-700';

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {showLabel && <span className={cn("text-xs font-bold w-10 text-right font-mono", textColor)}>{score}%</span>}
    </div>
  );
}

interface LoadingStateProps {
  rows?: number;
  message?: string;
  text?: string;
}

export function LoadingState({ rows = 5, message, text }: LoadingStateProps) {
  const displayMsg = message || text;
  return (
    <div className="space-y-3 bg-white p-6 rounded-lg border border-slate-200">
      {displayMsg && <p className="text-xs text-slate-500 font-medium animate-pulse mb-3">{displayMsg}</p>}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-10 w-full" />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  message?: string;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ message, title, description, icon, action }: EmptyStateProps) {
  const mainTitle = title || message || 'No records found';
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3 text-slate-500 text-lg">
        {icon || '📭'}
      </div>
      <p className="text-slate-800 font-bold text-sm">{mainTitle}</p>
      {description && <p className="text-slate-500 text-xs mt-1 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const isVisible = open !== undefined ? open : isOpen;
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className={cn(
        "relative bg-white border border-slate-200 rounded-xl shadow-2xl w-full overflow-hidden",
        size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-xl'
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
