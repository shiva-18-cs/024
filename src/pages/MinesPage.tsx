import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Users, AlertTriangle, ChevronRight, Plus, Filter } from 'lucide-react';
import { mines as minesApi } from '../services/api';
import { SectionCard, StatusBadge, ComplianceBar, LoadingState, EmptyState } from '../components/ui/UIComponents';
import { formatDate } from '../utils/helpers';

export default function MinesPage() {
  const [mineList, setMineList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    minesApi.list().then((data: any) => {
      setMineList(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filterState
    ? mineList.filter(m => m.state.toLowerCase().includes(filterState.toLowerCase()))
    : mineList;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              Subsidiaries & Pits
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Mine Management & Oversight</h1>
          <p className="text-slate-500 text-sm mt-0.5">{mineList.length} operational mines across Coal India subsidiaries</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by state..."
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            className="form-input text-xs w-48"
          />
        </div>
      </div>

      {loading ? <LoadingState rows={5} /> : filtered.length === 0 ? <EmptyState message="No mines found matching criteria" /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((mine: any) => (
            <div
              key={mine.id}
              className="bg-white border border-slate-200 rounded-lg shadow-card hover:shadow-card-hover hover:border-blue-400 cursor-pointer transition-all group"
              onClick={() => navigate(`/mines/${mine.id}`)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{mine.name}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{mine.code}</div>
                  </div>
                  <StatusBadge status={mine.risk_level || 'LOW'} />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                  <MapPin size={12} className="text-slate-400" />
                  <span>{mine.district}, {mine.state}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-medium text-slate-600">{mine.mine_type}</span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-semibold">Statutory Compliance</span>
                    <span className="font-bold text-slate-800 font-mono">{mine.compliance_score}%</span>
                  </div>
                  <ComplianceBar score={mine.compliance_score || 85} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-100 rounded-md p-2">
                    <div className="text-sm font-bold text-slate-900">{mine.workers_count || 0}</div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Workers</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-md p-2">
                    <div className="text-sm font-bold text-slate-900">{mine.active_contractors_count || 0}</div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Contractors</div>
                  </div>
                  <div className={`rounded-md p-2 border ${mine.open_violations_count > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className={`text-sm font-bold ${mine.open_violations_count > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                      {mine.open_violations_count || 0}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Violations</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Manager: <span className="font-semibold text-slate-700">{mine.manager_name || '—'}</span>
                  </div>
                  <div className="font-mono font-medium text-slate-600">
                    {mine.production_capacity_mtpa} MTPA
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
