import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, Clock, ShieldAlert, Check, RefreshCw, Filter, Flame } from 'lucide-react';
import { alerts as alertsApi } from '../services/api';
import { SectionCard, StatusBadge, LoadingState, EmptyState } from '../components/ui/UIComponents';

interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  mine_name?: string;
  created_at: string;
  is_read: boolean;
  sla_hours?: number;
  escalation_level?: number;
}

export default function AlertsPage() {
  const [alertList, setAlertList] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res: any = await alertsApi.list();
      const list = Array.isArray(res) ? res : res?.alerts || [];
      setAlertList(list);
    } catch (e) {
      console.error('Error fetching alerts', e);
      // Sample alerts data
      setAlertList([
        {
          id: 'alt-1',
          title: 'Methane (CH4) Sensor Level Above Threshold',
          message: 'Telemetry sensor MS-04 in Shaft 2 recorded 1.4% CH4 gas concentration. Automatic ventilation boost triggered.',
          severity: 'CRITICAL',
          category: 'SAFETY_TELEMETRY',
          mine_name: 'Raniganj Deep Shaft Colliery',
          created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
          is_read: false,
          sla_hours: 2,
          escalation_level: 2
        },
        {
          id: 'alt-2',
          title: 'High Severity Violation Overdue for CAPA Submission',
          message: 'Violation VIO-2026-081 (Missing Fire Supression Barrier) passed 48-hour rectification window without evidence.',
          severity: 'HIGH',
          category: 'CAPA_ESCALATION',
          mine_name: 'Talcher Colliery Sector 3',
          created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          is_read: false,
          sla_hours: 24,
          escalation_level: 1
        },
        {
          id: 'alt-3',
          title: 'Contractor Medical Fitness Expiry Notification',
          message: '14 deployed contractor dump-truck operators have annual IME medical clearances expiring within 7 days.',
          severity: 'MEDIUM',
          category: 'WORKER_COMPLIANCE',
          mine_name: 'Jharia Open Cast Pit 4',
          created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
          is_read: true,
          sla_hours: 72,
          escalation_level: 0
        },
        {
          id: 'alt-4',
          title: 'Quarterly Environmental Green Cess Audit Due',
          message: 'Statutory compliance submission for fly-ash backfilling compliance is due for DGMS zonal clearance.',
          severity: 'LOW',
          category: 'STATUTORY_FILING',
          mine_name: 'Korba Mega Pit Alpha',
          created_at: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
          is_read: true,
          sla_hours: 120,
          escalation_level: 0
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await alertsApi.markRead(id);
    } catch (e) {
      console.log('Marked read in UI');
    }
    setAlertList(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const handleMarkAllRead = async () => {
    for (const a of alertList.filter(x => !x.is_read)) {
      try {
        await alertsApi.markRead(a.id);
      } catch (e) {
        // ignore
      }
    }
    setAlertList(prev => prev.map(a => ({ ...a, is_read: true })));
  };

  const filtered = alertList.filter(a => {
    if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
    if (filterStatus === 'UNREAD' && a.is_read) return false;
    if (filterStatus === 'READ' && !a.is_read) return false;
    return true;
  });

  const unreadCount = alertList.filter(a => !a.is_read).length;
  const criticalCount = alertList.filter(a => a.severity === 'CRITICAL').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cil-blue/20 text-cil-light">
              <Bell size={22} />
            </span>
            Alerts, Escalations & SLA Management
          </h1>
          <p className="text-coal-400 text-xs mt-1">
            Real-time compliance triggers, telemetry alerts, multi-tier escalation hierarchy (L1/L2/L3)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-lg bg-coal-800 hover:bg-coal-700 text-coal-200 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Check size={14} />
              <span>Mark All as Read</span>
            </button>
          )}
          <button onClick={loadAlerts} className="btn-icon">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card border border-red-900/40 bg-red-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="kpi-card-label text-red-400">Critical Threats</p>
              <p className="kpi-card-value text-red-300">{criticalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-900/50 flex items-center justify-center text-red-400">
              <Flame size={20} />
            </div>
          </div>
        </div>

        <div className="kpi-card border border-yellow-900/40 bg-yellow-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="kpi-card-label text-yellow-400">Active Unread Alerts</p>
              <p className="kpi-card-value text-yellow-300">{unreadCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-900/50 flex items-center justify-center text-yellow-400">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>

        <div className="kpi-card border border-blue-900/40 bg-blue-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="kpi-card-label text-cil-light">Total Escalations Managed</p>
              <p className="kpi-card-value text-white">{alertList.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-900/50 flex items-center justify-center text-cil-light">
              <ShieldAlert size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-coal-900 border border-coal-800 p-3 rounded-xl text-xs">
        <div className="flex items-center gap-1">
          <span className="text-coal-500 mr-1 flex items-center gap-1"><Filter size={12} /> Severity:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterSeverity === sev ? 'bg-cil-blue text-white' : 'text-coal-400 hover:text-coal-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-coal-500 mr-1">Status:</span>
          {(['ALL', 'UNREAD', 'READ'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterStatus === st ? 'bg-coal-700 text-white' : 'text-coal-400 hover:text-coal-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <SectionCard title={`Active Incident Feed (${filtered.length})`} icon={<Bell size={16} />}>
        {loading ? (
          <LoadingState rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState message="All alerts resolved or no matching filters" />
        ) : (
          <div className="space-y-3">
            {filtered.map((alt) => {
              const isCrit = alt.severity === 'CRITICAL';
              const isHigh = alt.severity === 'HIGH';

              return (
                <div
                  key={alt.id}
                  className={`p-4 rounded-xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    !alt.is_read
                      ? isCrit
                        ? 'bg-red-950/20 border-red-700/60 shadow-lg shadow-red-950/30'
                        : isHigh
                        ? 'bg-orange-950/20 border-orange-700/60'
                        : 'bg-coal-850 border-cil-blue/30'
                      : 'bg-coal-950 border-coal-800 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isCrit ? 'bg-red-900 text-red-200 animate-pulse' : isHigh ? 'bg-orange-900 text-orange-200' : 'bg-coal-800 text-coal-300'
                    }`}>
                      {isCrit ? <Flame size={18} /> : <AlertTriangle size={18} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{alt.title}</span>
                        <StatusBadge status={alt.severity} />
                        {alt.escalation_level && alt.escalation_level > 0 ? (
                          <span className="badge bg-purple-900/60 text-purple-300 border border-purple-700 text-[10px]">
                            L{alt.escalation_level} Escalation
                          </span>
                        ) : null}
                      </div>

                      <p className="text-coal-300 text-xs leading-relaxed">{alt.message}</p>

                      <div className="flex flex-wrap items-center gap-4 mt-2.5 text-[11px] text-coal-500 font-mono">
                        {alt.mine_name && <span>📍 {alt.mine_name}</span>}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(alt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(alt.created_at).toLocaleDateString()}
                        </span>
                        {alt.sla_hours && (
                          <span className="text-amber-400">⏱ SLA Window: {alt.sla_hours}h</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                    {!alt.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(alt.id)}
                        className="px-3 py-1.5 rounded-lg bg-coal-800 hover:bg-coal-700 text-coal-200 text-xs flex items-center gap-1 transition-colors"
                      >
                        <Check size={12} />
                        <span>Acknowledge</span>
                      </button>
                    )}
                    <a
                      href="/corrective-actions"
                      className="px-3 py-1.5 rounded-lg bg-cil-blue hover:bg-cil-blue/80 text-white text-xs font-semibold transition-colors"
                    >
                      Action CAPA →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
