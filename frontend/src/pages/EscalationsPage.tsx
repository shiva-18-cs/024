import { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Clock, Building2, UserX, CheckCircle, Search, Filter } from 'lucide-react';
import { governance as govApi, mines as minesApi } from '../services/api';
import { SectionCard, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';
import { formatDate, formatDateTime } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

export default function EscalationsPage() {
  const { user } = useAuth();
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minesList, setMinesList] = useState<any[]>([]);
  const [selectedMine, setSelectedMine] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null);

  const loadData = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (selectedMine) params.mine_id = selectedMine;

    govApi.escalations(params)
      .then((data: any) => {
        setEscalations(data || []);
        setLoading(false);
      })
      .catch(() => {
        setEscalations([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    minesApi.list().then((res: any) => setMinesList(res || [])).catch(() => {});
  }, [selectedMine]);

  const filtered = escalations.filter((esc) => {
    if (filterLevel && String(esc.escalation_level) !== filterLevel) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        esc.title?.toLowerCase().includes(q) ||
        esc.mine_name?.toLowerCase().includes(q) ||
        esc.contractor_name?.toLowerCase().includes(q) ||
        esc.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const level3Count = escalations.filter((e) => e.escalation_level === 3).length;
  const level2Count = escalations.filter((e) => e.escalation_level === 2).length;
  const overdueCount = escalations.filter((e) => e.type === 'OVERDUE_CAPA').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-amber-500" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Statutory Escalations Dashboard
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time tracking of critical safety violations, overdue CAPAs, and Level 1–3 statutory breaches.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{escalations.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Active Escalations</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{level3Count}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Level 3 (Corporate / DGMS Alert)</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{level2Count}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Level 2 (Mine Manager Directives)</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-lg">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Overdue Corrective Directives</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search escalations, mines, contractors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {user?.role === 'CORPORATE MANAGEMENT' && (
            <select
              value={selectedMine}
              onChange={(e) => setSelectedMine(e.target.value)}
              className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
            >
              <option value="">All Mines</option>
              {minesList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
          >
            <option value="">All Escalation Levels</option>
            <option value="3">Level 3 (Highest / Corporate)</option>
            <option value="2">Level 2 (High / Mine Head)</option>
            <option value="1">Level 1 (Warning)</option>
          </select>
        </div>
      </div>

      {/* Escalations List */}
      <SectionCard title="Active Statutory Escalation Queue">
        {loading ? (
          <LoadingState text="Loading statutory escalations..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="w-12 h-12 text-emerald-500" />}
            title="No Active Escalations"
            description="All corrective directives and critical hazards are currently within statutory timelines."
          />
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((esc) => {
              const isLevel3 = esc.escalation_level === 3;
              const isLevel2 = esc.escalation_level === 2;

              return (
                <div
                  key={esc.id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                  onClick={() => setSelectedEscalation(esc)}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          isLevel3
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                            : isLevel2
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-400'
                        }`}
                      >
                        LEVEL {esc.escalation_level || 1}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {esc.type?.replace('_', ' ')}
                      </span>
                      {esc.days_overdue && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 font-medium">
                          {esc.days_overdue} Day(s) Overdue
                        </span>
                      )}
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                        {esc.title}
                      </h4>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {esc.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <Building2 className="w-3.5 h-3.5" />
                        {esc.mine_name}
                      </span>
                      {esc.contractor_name && (
                        <span>
                          Contractor: <strong className="text-slate-700 dark:text-slate-300">{esc.contractor_name}</strong>
                        </span>
                      )}
                      <span>
                        Responsible: <strong className="text-slate-700 dark:text-slate-300">{esc.responsible_party || 'Site In-Charge'}</strong>
                      </span>
                      <span>Triggered: {formatDateTime(esc.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEscalation(esc);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                    >
                      View Dossier
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Escalation Detail Modal */}
      {selectedEscalation && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEscalation(null)}
          title={`Escalation Dossier - ${selectedEscalation.id}`}
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <span className="text-xs text-slate-500">Escalation Tier</span>
                <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                  LEVEL {selectedEscalation.escalation_level} ({selectedEscalation.severity} SEVERITY)
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Current Status</span>
                <div className="text-base font-semibold text-slate-900 dark:text-white">
                  {selectedEscalation.status}
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-semibold text-slate-900 dark:text-white">Escalation Summary</h5>
              <p className="text-slate-700 dark:text-slate-300 mt-1">{selectedEscalation.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 bg-slate-100 dark:bg-slate-800 p-2.5 rounded">
                {selectedEscalation.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <span className="text-xs text-slate-500">Mine Location</span>
                <p className="font-medium text-slate-900 dark:text-white">{selectedEscalation.mine_name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Contractor</span>
                <p className="font-medium text-slate-900 dark:text-white">{selectedEscalation.contractor_name || 'Direct Operation'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Responsible Authority</span>
                <p className="font-medium text-slate-900 dark:text-white">{selectedEscalation.responsible_party || 'Mine Safety Officer'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Trigger Timestamp</span>
                <p className="font-medium text-slate-900 dark:text-white">{formatDateTime(selectedEscalation.created_at)}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              <h5 className="font-semibold text-slate-900 dark:text-white mb-2">Statutory Escalation Protocol</h5>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4">
                <li>Level 1: Internal safety reminder issued to contractor and site supervisor.</li>
                <li>Level 2: Mine Manager statutory directive issued with 72-hour rectification window.</li>
                <li>Level 3: Corporate Safety Directorate & DGMS regional inspector notified of non-compliance.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedEscalation(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300"
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
