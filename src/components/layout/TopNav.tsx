import { useState, useEffect } from 'react';
import { Bell, Search, RefreshCw, X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
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

  const severityIcon = (sev: string) => {
    if (sev === 'CRITICAL') return <XCircle size={14} className="text-red-400" />;
    if (sev === 'HIGH') return <AlertTriangle size={14} className="text-orange-400" />;
    if (sev === 'MEDIUM') return <AlertTriangle size={14} className="text-yellow-400" />;
    return <Info size={14} className="text-blue-400" />;
  };

  return (
    <header className="fixed top-0 right-0 z-40 bg-coal-900/95 backdrop-blur-sm border-b border-coal-800 flex items-center justify-between px-4 h-14"
      style={{ left: 'var(--sidebar-width)' }}>
      {/* Left: System context */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-coal-500 hidden md:block">
          <span className="text-coal-400 font-medium">Coal India Limited</span>
          <span className="mx-2 text-coal-700">•</span>
          <span>Smart Governance & Compliance Monitoring</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search Bar */}
        <div className="relative hidden md:flex">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-coal-500" />
          <input
            type="text"
            placeholder="Search mines, contractors, violations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-coal-800 border border-coal-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-coal-300 placeholder-coal-600 focus:outline-none focus:border-cil-blue w-64"
          />
        </div>

        {/* Alerts Bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="btn-icon relative"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 top-10 w-80 bg-coal-800 border border-coal-700 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-coal-700">
                <span className="text-sm font-semibold text-white">Alerts & Escalations</span>
                <button onClick={() => setShowAlerts(false)} className="btn-icon">
                  <X size={14} />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alertList.length === 0 ? (
                  <div className="px-4 py-6 text-center text-coal-500 text-sm">No active alerts</div>
                ) : alertList.slice(0, 8).map(a => (
                  <div key={a.id}
                    className={cn("px-4 py-3 border-b border-coal-700/60 hover:bg-coal-700/50 transition-colors cursor-pointer",
                      a.is_read ? "opacity-60" : "")}
                    onClick={() => markRead(a.id)}
                  >
                    <div className="flex items-start gap-2">
                      {severityIcon(a.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-coal-200 truncate">{a.title}</div>
                        <div className="text-[10px] text-coal-500 mt-0.5 line-clamp-2">{a.message}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold",
                            a.severity === 'CRITICAL' ? 'bg-red-900/50 text-red-300' :
                            a.severity === 'HIGH' ? 'bg-orange-900/50 text-orange-300' : 'bg-yellow-900/50 text-yellow-300'
                          )}>
                            Level {a.escalation_level}
                          </span>
                          {!a.is_read && <span className="w-1.5 h-1.5 rounded-full bg-cil-blue" />}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-coal-700 bg-coal-900/50">
                <a href="/alerts" className="text-xs text-cil-blue hover:text-cil-light font-medium">
                  View all alerts →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Live status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-900/30 border border-emerald-800/50 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-semibold">System Online</span>
        </div>
      </div>
    </header>
  );
}
