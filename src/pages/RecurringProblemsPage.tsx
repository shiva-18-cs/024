import { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, Building2, Search, Filter, ShieldAlert, CheckCircle2, History, ArrowRight } from 'lucide-react';
import { governance as govApi, mines as minesApi } from '../services/api';
import { SectionCard, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';
import { formatDate, formatDateTime } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

export default function RecurringProblemsPage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minesList, setMinesList] = useState<any[]>([]);
  const [selectedMine, setSelectedMine] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<any>(null);

  const loadData = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (selectedMine) params.mine_id = selectedMine;
    if (selectedSeverity) params.severity = selectedSeverity;
    if (selectedCategory) params.category = selectedCategory;

    govApi.recurringProblems(params)
      .then((data: any) => {
        setProblems(data || []);
        setLoading(false);
      })
      .catch(() => {
        setProblems([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    minesApi.list().then((res: any) => setMinesList(res || [])).catch(() => {});
  }, [selectedMine, selectedSeverity, selectedCategory]);

  const filtered = problems.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.title?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.regulation_reference?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalOccurrences = problems.reduce((acc, curr) => acc + (curr.occurrence_count || 1), 0);
  const highRiskCount = problems.filter((p) => p.severity === 'HIGH' || p.severity === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-indigo-500" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Recurring Compliance Hazards Analytics
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dynamic detection of repetitive statutory violations, failed mitigations, and cross-mine pattern clusters.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{problems.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Distinct Recurring Patterns</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalOccurrences}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Recorded Occurrences</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{highRiskCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">High / Critical Severity Patterns</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Database Live</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Real-time Pattern Synthesis</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search recurring violations, regulations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
          >
            <option value="">All Categories</option>
            <option value="Safety">Safety</option>
            <option value="Environmental">Environmental</option>
            <option value="Labour">Labour & Welfare</option>
            <option value="Machinery">Machinery & HEMM</option>
          </select>
        </div>
      </div>

      {/* List */}
      <SectionCard title="Detected Recurring Hazard Patterns">
        {loading ? (
          <LoadingState text="Synthesizing recurring patterns from violation database..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-12 h-12 text-emerald-500" />}
            title="No Recurring Hazards Detected"
            description="No repetitive violation clusters match the selected criteria in the live database."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((prob) => {
              const isCrit = prob.severity === 'CRITICAL';
              const isHigh = prob.severity === 'HIGH';

              return (
                <div
                  key={prob.id}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer space-y-3"
                  onClick={() => setSelectedProblem(prob)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {prob.occurrence_count} Occurrences
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          isCrit
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400'
                            : isHigh
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {prob.severity} SEVERITY
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        {prob.category}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Last Detected: {formatDateTime(prob.last_detected)}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {prob.title}
                    </h4>
                    {prob.regulation_reference && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                        Statutory Ref: {prob.regulation_reference}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <strong>Recommended Statutory Intervention: </strong>
                      {prob.recommended_intervention}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Affected Units: <strong>{prob.affected_mines?.join(', ')}</strong></span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProblem(prob);
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      View Pattern Breakdown <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Detail Modal */}
      {selectedProblem && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedProblem(null)}
          title={`Recurring Pattern Analysis - ${selectedProblem.title}`}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <span className="text-xs text-slate-500">Recurrence Count</span>
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedProblem.occurrence_count} Times
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Hazard Tier</span>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  {selectedProblem.severity} ({selectedProblem.category})
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Status</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedProblem.status}
                </p>
              </div>
            </div>

            <div>
              <h5 className="font-semibold text-slate-900 dark:text-white">Statutory Regulation</h5>
              <p className="text-xs font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded text-slate-800 dark:text-slate-200 mt-1">
                {selectedProblem.regulation_reference || 'DGMS Coal Mines Regulations 2017'}
              </p>
            </div>

            <div>
              <h5 className="font-semibold text-slate-900 dark:text-white">Affected Mines & Workings</h5>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedProblem.affected_mines?.map((m: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {selectedProblem.resolution_history && selectedProblem.resolution_history.length > 0 && (
              <div>
                <h5 className="font-semibold text-slate-900 dark:text-white mb-2">Historical Occurrence Log</h5>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedProblem.resolution_history.map((hist: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                      <span className="font-mono text-slate-600 dark:text-slate-400">{hist.violation_code}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                        {hist.status}
                      </span>
                      <span className="text-slate-500">{hist.detected_at ? formatDateTime(hist.detected_at) : 'Active'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              <h5 className="font-semibold text-slate-900 dark:text-white mb-1">Corporate Safety Recommendation</h5>
              <p className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded">
                {selectedProblem.recommended_intervention}
              </p>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedProblem(null)}
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
