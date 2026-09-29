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
      } catch (e) {}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide">
              Alerts & Incident Watch
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell size={22} className="text-blue-700" />
            Alerts, Escalations & SLA Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time compliance triggers, telemetry alerts, multi-tier escalation hierarchy (L1/L2/L3)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn-secondary text-xs"
            >
              <Check size={14} />
              <span>Mark All as Read</span>
            </button>
          )}
          <button onClick={loadAlerts} className="btn-secondary text-xs" title="Refresh">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-red-200 rounded-lg p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Critical Threats</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{criticalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-700">
              <Flame size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Active Unread Alerts</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{unreadCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Escalations Managed</p>
              <p className="text-2xl font-bold text-blue-950 mt-1">{alertList.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <ShieldAlert size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-slate-200 p-3.5 rounded-lg text-xs shadow-card">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1"><Filter size={12} /> Severity:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                filterSeverity === sev ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold mr-1">Status:</span>
          {(['ALL', 'UNREAD', 'READ'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                filterStatus === st ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
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
                  className={`p-4 rounded-lg border transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    !alt.is_read
                      ? isCrit
                        ? 'bg-red-50/60 border-red-300'
                        : isHigh
                        ? 'bg-orange-50/60 border-orange-300'
                        : 'bg-blue-50/40 border-blue-200'
                      : 'bg-white border-slate-200 opacity-90'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isCrit ? 'bg-red-100 text-red-700' : isHigh ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isCrit ? <Flame size={18} /> : <AlertTriangle size={18} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-sm">{alt.title}</span>
                        <StatusBadge status={alt.severity} />
                        {alt.escalation_level && alt.escalation_level > 0 ? (
                          <span className="badge bg-purple-50 text-purple-800 border border-purple-200 text-[10px]">
                            L{alt.escalation_level} Escalation
                          </span>
                        ) : null}
                      </div>

                      <p className="text-slate-600 text-xs leading-relaxed">{alt.message}</p>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-slate-500 font-mono">
                        {alt.mine_name && <span>📍 {alt.mine_name}</span>}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(alt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(alt.created_at).toLocaleDateString()}
                        </span>
                        {alt.sla_hours && (
                          <span className="text-amber-700 font-semibold">⏱ SLA Window: {alt.sla_hours}h</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                    {!alt.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(alt.id)}
                        className="btn-secondary text-xs py-1.5"
                      >
                        <Check size={13} />
                        <span>Acknowledge</span>
                      </button>
                    )}
                    <a
                      href="/corrective-actions"
                      className="btn-primary text-xs py-1.5"
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
