import { ReactNode } from 'react';
import { cn } from '../../utils/helpers';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
        "kpi-card group",
        onClick && "cursor-pointer hover:border-cil-blue/40 hover:shadow-lg hover:shadow-cil-blue/5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="kpi-card-label">{label}</p>
          <p className="kpi-card-value">{value}</p>
          {delta !== undefined && (
            <div className={cn(
              "kpi-card-delta flex items-center gap-1",
              delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-coal-500"
            )}>
              {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
              <span>{Math.abs(delta)}% {deltaLabel || 'vs last month'}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-4",
          iconBg || "bg-coal-800"
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
    <div className={cn("section-card", className)}>
      <div className="section-card-header">
        <h3 className="section-card-title">
          {icon && <span className="text-coal-400">{icon}</span>}
          {title}
        </h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className={noPad ? '' : 'section-card-body'}>
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
      case 'COMPLIANT': return 'bg-emerald-900/50 text-emerald-400 border-emerald-800/60';
      case 'NON_COMPLIANT': return 'bg-red-900/50 text-red-400 border-red-800/60';
      case 'PENDING': return 'bg-yellow-900/50 text-yellow-400 border-yellow-800/60';
      case 'UNDER_REVIEW': return 'bg-blue-900/50 text-blue-400 border-blue-800/60';
      case 'HIGH_RISK': return 'bg-orange-900/50 text-orange-400 border-orange-800/60';
      case 'CRITICAL': return 'bg-red-900/60 text-red-300 border-red-700';
      case 'RESOLVED': case 'CLOSED': return 'bg-teal-900/50 text-teal-400 border-teal-800/60';
      case 'VERIFIED': case 'FIXED': return 'bg-emerald-900/50 text-emerald-300 border-emerald-700';
      case 'NOT_FIXED': return 'bg-rose-900/60 text-rose-300 border-rose-700';
      case 'ACTION_REQUIRED': return 'bg-amber-900/50 text-amber-300 border-amber-700';
      case 'OVERDUE': return 'bg-red-900/70 text-red-300 border-red-700 animate-pulse';
      case 'OPEN': return 'bg-red-900/40 text-red-400 border-red-800/60';
      case 'IN_PROGRESS': return 'bg-blue-900/50 text-blue-400 border-blue-800/60';
      case 'ASSIGNED': return 'bg-purple-900/50 text-purple-400 border-purple-800/60';
      case 'UNDER_VERIFICATION': return 'bg-sky-900/50 text-sky-400 border-sky-800/60';
      case 'APPROVED': case 'CORP_APPROVED': return 'bg-emerald-900/60 text-emerald-300 border-emerald-700';
      case 'LOW': return 'bg-green-900/50 text-green-400 border-green-800/60';
      case 'MEDIUM': return 'bg-yellow-900/50 text-yellow-400 border-yellow-800/60';
      case 'HIGH': return 'bg-orange-900/50 text-orange-400 border-orange-800/60';
      case 'IN_CORRECTION': return 'bg-violet-900/50 text-violet-400 border-violet-800/60';
      case 'SUBMITTED': return 'bg-sky-900/50 text-sky-400 border-sky-800/60';
      case 'EXPIRED': return 'bg-red-900/50 text-red-400 border-red-800/60';
      case 'ACTIVE': return 'bg-emerald-900/50 text-emerald-400 border-emerald-800/60';
      case 'OPERATIONAL': return 'bg-emerald-900/50 text-emerald-400 border-emerald-800/60';
      default: return 'bg-coal-800 text-coal-400 border-coal-700';
    }
  };

  return (
    <span className={cn("badge border", getClasses(), className)}>
      {status}
    </span>
  );
}

interface ComplianceBarProps {
  score: number;
  showLabel?: boolean;
}

export function ComplianceBar({ score, showLabel = true }: ComplianceBarProps) {
  const color = score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-yellow-500' : score >= 55 ? 'bg-orange-500' : 'bg-red-500';
  const textColor = score >= 85 ? 'text-emerald-400' : score >= 70 ? 'text-yellow-400' : score >= 55 ? 'text-orange-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-coal-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      {showLabel && <span className={cn("text-xs font-bold w-10 text-right", textColor)}>{score}%</span>}
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
    <div className="space-y-3">
      {displayMsg && <p className="text-xs text-coal-400 animate-pulse mb-2">{displayMsg}</p>}
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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-coal-800 flex items-center justify-center mb-3 text-coal-600">
        {icon || '📭'}
      </div>
      <p className="text-white font-medium text-sm">{mainTitle}</p>
      {description && <p className="text-coal-400 text-xs mt-1 max-w-sm">{description}</p>}
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative bg-coal-900 border border-coal-700 rounded-2xl shadow-2xl w-full overflow-hidden",
        size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-xl'
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-coal-800">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

