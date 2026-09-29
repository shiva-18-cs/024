import { useState, useEffect } from 'react';
import { Bell, Search, RefreshCw, X, CheckCircle2, AlertTriangle, XCircle, Info, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { alerts as alertsApi } from '../../services/api';
import { cn } from '../../utils/helpers';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: string;
  escalation_level: number;
  created_at: string;
  is_read: boolean;
}

export default function TopNav() {
  const { user } = useAuth();
  const [alertList, setAlertList] = useState<Alert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    alertsApi.list().then((data: any) => setAlertList(data || [])).catch(() => {});
  }, []);

  const unreadCount = alertList.filter(a => !a.is_read).length;

  const markRead = async (id: string) => {
    await alertsApi.markRead(id).catch(() => {});
    setAlertList(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const severityBadge = (sev: string) => {
    if (sev === 'CRITICAL') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
          <XCircle size={11} /> Critical
        </span>
      );
    }
    if (sev === 'HIGH') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
          <AlertTriangle size={11} /> High
        </span>
      );
    }
    if (sev === 'MEDIUM') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle size={11} /> Medium
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
        <Info size={11} /> Info
      </span>
    );
  };

  return (
    <header
      className="fixed top-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 h-14 shadow-xs"
      style={{ left: 'var(--sidebar-width)' }}
    >
      {/* Left: System Context & Institutional Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <span className="font-bold text-slate-800">Coal India Limited</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600">Smart Governance & Compliance Monitoring</span>
          <span className="text-slate-300">/</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold tracking-wide uppercase">
            Gov Platform
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative hidden md:flex items-center">
          <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search mines, contracts, violations, workers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all w-72"
          />
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="System Alerts & Escalations"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 top-12 w-88 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div>
                  <span className="text-xs font-bold text-slate-800">Alerts & Escalations</span>
                  <p className="text-[10px] text-slate-500">Real-time statutory notifications</p>
                </div>
                <button
                  onClick={() => setShowAlerts(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {alertList.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-500 text-xs">
                    No active statutory alerts at this time.
                  </div>
                ) : (
                  alertList.slice(0, 8).map(a => (
                    <div
                      key={a.id}
                      className={cn(
                        "p-3.5 hover:bg-slate-50 transition-colors cursor-pointer",
                        a.is_read ? "opacity-60 bg-white" : "bg-blue-50/20"
                      )}
                      onClick={() => markRead(a.id)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-800 leading-tight">{a.title}</span>
                        {severityBadge(a.severity)}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{a.message}</p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[10px]">
                        <span className="font-semibold text-slate-500">Escalation Level {a.escalation_level}</span>
                        {!a.is_read && (
                          <span className="font-semibold text-blue-700">Click to acknowledge</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <a
                  href="/alerts"
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                >
                  View All Escalations & Alerts →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-emerald-800 font-semibold tracking-tight">System Online</span>
        </div>
      </div>
    </header>
  );
}
