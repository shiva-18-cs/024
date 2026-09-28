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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mine Management</h1>
          <p className="text-coal-500 text-sm mt-0.5">{mineList.length} mines across Coal India subsidiaries</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by state..."
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            className="form-input text-sm w-40"
          />
        </div>
      </div>

      {loading ? <LoadingState rows={5} /> : filtered.length === 0 ? <EmptyState message="No mines found" /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((mine: any) => (
            <div
              key={mine.id}
              className="section-card hover:border-coal-700 cursor-pointer transition-all hover:shadow-lg hover:shadow-black/30 group"
              onClick={() => navigate(`/mines/${mine.id}`)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-base font-bold text-white group-hover:text-cil-light transition-colors">{mine.name}</div>
                    <div className="text-[10px] text-coal-500 font-mono mt-0.5">{mine.code}</div>
                  </div>
                  <StatusBadge status={mine.risk_level || 'LOW'} />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-coal-500 mb-4">
                  <MapPin size={11} />
                  <span>{mine.district}, {mine.state}</span>
                  <span className="text-coal-700">•</span>
                  <span>{mine.mine_type}</span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-coal-500">Compliance Score</span>
                    <span className="font-bold text-white">{mine.compliance_score}%</span>
                  </div>
                  <ComplianceBar score={mine.compliance_score || 85} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-coal-800/60 rounded-lg p-2">
                    <div className="text-sm font-bold text-white">{mine.workers_count || 0}</div>
                    <div className="text-[9px] text-coal-500 uppercase">Workers</div>
                  </div>
                  <div className="bg-coal-800/60 rounded-lg p-2">
                    <div className="text-sm font-bold text-white">{mine.active_contractors_count || 0}</div>
                    <div className="text-[9px] text-coal-500 uppercase">Contractors</div>
                  </div>
                  <div className={`rounded-lg p-2 ${mine.open_violations_count > 0 ? 'bg-red-900/20' : 'bg-coal-800/60'}`}>
                    <div className={`text-sm font-bold ${mine.open_violations_count > 0 ? 'text-red-400' : 'text-white'}`}>
                      {mine.open_violations_count || 0}
                    </div>
                    <div className="text-[9px] text-coal-500 uppercase">Violations</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-coal-800 flex items-center justify-between">
                  <div className="text-[10px] text-coal-600">
                    Manager: <span className="text-coal-400">{mine.manager_name || '—'}</span>
                  </div>
                  <div className="text-[10px] text-coal-600">
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
