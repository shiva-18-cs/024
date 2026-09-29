import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Building2, AlertTriangle, ShieldCheck, Filter, Layers,
  Flame, CheckCircle2, Camera, FileText, Wrench, RefreshCw, ExternalLink,
  ShieldAlert, Clock, Compass
} from 'lucide-react';
import { gis as gisApi } from '../services/api';
import { SectionCard, StatusBadge, KPICard } from '../components/ui/UIComponents';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatDateTime } from '../utils/helpers';

interface HotspotFeature {
  type: string;
  properties: {
    entity_type: string; id: string; violation_code?: string;
    mine_id: string; mine_name: string; hazard_title: string;
    hazard_category: string; severity: string; status: string;
    regulation_reference?: string; description?: string;
    inspection_number?: string; inspection_date?: string;
    linked_capa?: { id: string; action_code: string; title: string; status: string; priority: string; due_date?: string; is_overdue?: boolean; };
    evidence_photos?: Array<{ id: string; caption: string; file_path: string; latitude?: number; longitude?: number; captured_at?: string; }>;
    created_at?: string;
  };
  geometry: { type: string; coordinates: [number, number] };
}

interface MineFeature {
  type: string;
  properties: {
    entity_type: string; id: string; mine_name: string; mine_code: string;
    subsidiary: string; state: string; district: string; manager_name?: string;
    contract_count: number; active_contract_count: number;
    active_contracts: Array<{ id: string; contract_number: string; title: string; status: string; value_inr_crores?: number; }>;
    compliance_percentage: number; open_violations: number; overdue_capas: number;
    status_color: 'GREEN' | 'ORANGE' | 'RED'; risk_status: string;
    warnings: string[];
    recent_inspections: Array<{ id: string; inspection_number: string; inspection_date?: string; compliance_score: number; risk_level: string; }>;
  };
  geometry: { type: string; coordinates: [number, number] };
}

export default function ContractorGISPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gisData, setGisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotFeature | null>(null);
  const [selectedMine, setSelectedMine] = useState<MineFeature | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'high_risk' | 'open' | 'resolved'>('all');
  const [filterMine, setFilterMine]         = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus]     = useState('ALL');
  const [filterCapa, setFilterCapa]         = useState('ALL');

  useEffect(() => { loadGISData(); }, [filterMine, filterSeverity, filterStatus, filterCapa]);

  const loadGISData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterMine !== 'ALL')     params.mine_id          = filterMine;
      if (filterSeverity !== 'ALL') params.severity         = filterSeverity;
      if (filterStatus !== 'ALL')   params.violation_status = filterStatus;
      if (filterCapa !== 'ALL')     params.capa_status      = filterCapa;
      const data: any = await gisApi.contractor(params);
      setGisData(data);
      if (data?.hotspots?.length > 0 && !selectedHotspot) setSelectedHotspot(data.hotspots[0]);
      else if (data?.mines?.length > 0 && !selectedMine && !selectedHotspot) setSelectedMine(data.mines[0]);
    } catch (e) { console.error('Contractor GIS load failed', e); }
    finally { setLoading(false); }
  };

  const summary  = gisData?.summary  || { total_mines: 0, compliant_mines: 0, attention_mines: 0, open_violations: 0, overdue_capas: 0, total_contracts: 0 };
  const minesList: MineFeature[]       = gisData?.mines    || [];
  const hotspotsList: HotspotFeature[] = gisData?.hotspots || [];

  const filteredHotspots = hotspotsList.filter(h => {
    if (activeLayer === 'high_risk' && !(h.properties.severity === 'HIGH' || h.properties.severity === 'CRITICAL')) return false;
    if (activeLayer === 'open'      && h.properties.status !== 'OPEN')                                              return false;
    if (activeLayer === 'resolved'  && h.properties.status !== 'RESOLVED' && h.properties.status !== 'CLOSED')     return false;
    return true;
  });

  const criticalCount = hotspotsList.filter(h => h.properties.severity === 'CRITICAL' || h.properties.severity === 'HIGH').length;
  const openCount     = hotspotsList.filter(h => h.properties.status === 'OPEN').length;
  const resolvedCount = hotspotsList.filter(h => h.properties.status === 'RESOLVED' || h.properties.status === 'CLOSED').length;

  const toX = (lng: number) => Math.min(92, Math.max(8, ((lng - 81.0) / 7.5) * 100));
  const toY = (lat: number) => Math.min(90, Math.max(10, (1 - ((lat - 20.0) / 5.5)) * 100));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase">Contractor GIS Portal</span>
            {user?.contractor_name && <span className="text-xs text-coal-400 font-medium">🏭 {user.contractor_name}</span>}
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5 mt-1">
            <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300"><MapPin size={22} /></span>
            Contractor Compliance Hazard Heatmap &amp; GIS Hotspot Layer
          </h1>
          <p className="text-coal-400 text-xs mt-0.5">Geospatially anchored contractor violations, CAPA positions and geo-tagged inspection evidence across authorised mining blocks.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-coal-900 border border-coal-800 rounded-lg p-1 text-xs">
            {(['all','high_risk','open','resolved'] as const).map((layer) => (
              <button key={layer} onClick={() => setActiveLayer(layer)}
                className={`px-3 py-1 rounded-md transition-colors ${activeLayer === layer
                  ? layer === 'high_risk' ? 'bg-red-600 text-white font-semibold'
                  : layer === 'open'     ? 'bg-amber-600 text-white font-semibold'
                  : layer === 'resolved' ? 'bg-emerald-600 text-white font-semibold'
                  :                        'bg-teal-600 text-white font-semibold'
                  : 'text-coal-400 hover:text-coal-200'}`}>
                {layer === 'all' ? `All Hotspots (${hotspotsList.length})` : layer === 'high_risk' ? `Critical / High (${criticalCount})` : layer === 'open' ? `Open Hazards (${openCount})` : `Resolved (${resolvedCount})`}
              </button>
            ))}
          </div>
          <button onClick={loadGISData} className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"><RefreshCw size={13} /></button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Authorised Mines" value={summary.total_mines}     icon={<Building2     size={18} className="text-teal-400"    />} iconBg="bg-teal-500/10"    />
        <KPICard label="Compliant Mines"  value={summary.compliant_mines} icon={<ShieldCheck   size={18} className="text-emerald-400" />} iconBg="bg-emerald-500/10" />
        <KPICard label="Need Attention"   value={summary.attention_mines} icon={<AlertTriangle size={18} className="text-amber-400"   />} iconBg="bg-amber-500/10"   />
        <KPICard label="Active Contracts" value={summary.total_contracts} icon={<FileText      size={18} className="text-sky-400"     />} iconBg="bg-sky-500/10"     />
        <KPICard label="Open Violations"  value={summary.open_violations} icon={<Flame         size={18} className="text-red-400"     />} iconBg="bg-red-500/10"     onClick={() => navigate('/violations')} />
        <KPICard label="Overdue CAPAs"    value={summary.overdue_capas}   icon={<Clock         size={18} className="text-rose-400"    />} iconBg="bg-rose-500/10"    onClick={() => navigate('/corrective-actions')} />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-coal-900 border border-coal-800 p-3 rounded-xl text-xs">
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Filter size={14} className="text-coal-500" />
          <span className="text-coal-400 font-semibold">Scope Filter:</span>
          <select value={filterMine} onChange={e => setFilterMine(e.target.value)}
            className="bg-coal-950 border border-coal-700 text-coal-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500">
            <option value="ALL">All My Mines ({minesList.length})</option>
            {minesList.map(m => <option key={m.properties.id} value={m.properties.id}>{m.properties.mine_name} ({m.properties.mine_code})</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="bg-coal-950 border border-coal-700 text-coal-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500">
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option><option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-coal-950 border border-coal-700 text-coal-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500">
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Only</option><option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved / Closed</option>
          </select>
          <select value={filterCapa} onChange={e => setFilterCapa(e.target.value)}
            className="bg-coal-950 border border-coal-700 text-coal-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500">
            <option value="ALL">All CAPA States</option>
            <option value="ASSIGNED">Assigned</option><option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <button onClick={() => { setFilterMine('ALL'); setFilterSeverity('ALL'); setFilterStatus('ALL'); setFilterCapa('ALL'); }}
            className="text-[11px] text-coal-500 hover:text-coal-300 underline underline-offset-2">Reset</button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map Canvas */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-coal-900 border border-coal-800 rounded-2xl p-4 shadow-xl overflow-hidden relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-coal-300">
                <Layers size={14} className="text-teal-400" />
                <span>Contractor Compliance Hazard Heatmap &amp; GIS Hotspot Layer ({filteredHotspots.length} Plotted Points)</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-coal-400 font-mono">
                <Compass size={12} className="text-teal-300" /><span>DATUM: WGS 84 / UTM 44N</span>
              </div>
            </div>
            <div className="relative w-full h-[540px] bg-coal-950 rounded-xl border border-coal-800/80 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, rgba(20, 184, 166, 0.4) 1px, transparent 0)`, backgroundSize: '28px 28px' }} />
              <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 50 120 Q 200 80 400 160 T 700 240" fill="none" stroke="#0d9488" strokeWidth="2" strokeDasharray="6 4" />
                <path d="M 100 350 Q 300 280 500 380 T 800 320" fill="none" stroke="#14b8a6" strokeWidth="1.5" />
                <path d="M 220 500 Q 420 400 620 480" fill="none" stroke="#2dd4bf" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="450" cy="270" r="180" fill="none" stroke="#0f766e" strokeWidth="1" opacity="0.3" />
                <circle cx="450" cy="270" r="260" fill="none" stroke="#0f766e" strokeWidth="1" strokeDasharray="4 6" opacity="0.15" />
              </svg>
              {loading ? (
                <div className="text-center text-coal-400">
                  <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Loading Contractor GIS Hotspots &amp; Spatial Coordinates...</span>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {minesList.map(m => {
                    const [lng, lat] = m.geometry.coordinates;
                    const isSelected = selectedMine?.properties.id === m.properties.id && !selectedHotspot;
                    return (
                      <div key={`mine-${m.properties.id}`} style={{ left: `${toX(lng)}%`, top: `${toY(lat)}%` }}
                        onClick={() => { setSelectedMine(m); setSelectedHotspot(null); }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110 border-2 ${isSelected ? 'ring-4 ring-white/30 scale-110' : ''} ${m.properties.status_color === 'RED' ? 'bg-red-950/80 text-red-400 border-red-500' : m.properties.status_color === 'ORANGE' ? 'bg-amber-950/80 text-amber-400 border-amber-500' : 'bg-coal-900/90 text-slate-300 border-slate-600/80'}`}>
                          <Building2 size={18} />
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-14 hidden group-hover:block bg-coal-900 border border-coal-700 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-xl z-30 pointer-events-none">
                          <div className="font-bold">{m.properties.mine_name}</div>
                          <div className="text-coal-400">{m.properties.mine_code} • {m.properties.compliance_percentage}% compliant</div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredHotspots.map(h => {
                    const [lng, lat] = h.geometry.coordinates;
                    const isSelected = selectedHotspot?.properties.id === h.properties.id;
                    const isCrit = h.properties.severity === 'CRITICAL' || h.properties.severity === 'HIGH';
                    const isResolved = h.properties.status === 'RESOLVED' || h.properties.status === 'CLOSED';
                    return (
                      <div key={`hs-${h.properties.id}`} style={{ left: `${toX(lng)}%`, top: `${toY(lat)}%` }}
                        onClick={() => setSelectedHotspot(h)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20 transition-all duration-200">
                        {(isCrit || isSelected) && !isResolved && <div className={`absolute -inset-2 rounded-full animate-ping opacity-60 ${isCrit ? 'bg-red-500' : 'bg-teal-500'}`} />}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform transform group-hover:scale-125 border ${isSelected ? 'bg-teal-500 text-white border-white ring-4 ring-teal-400/40 scale-125' : isResolved ? 'bg-emerald-950 text-emerald-400 border-emerald-500' : isCrit ? 'bg-red-950 text-red-400 border-red-500' : 'bg-amber-950 text-amber-400 border-amber-500'}`}>
                          {isResolved ? <CheckCircle2 size={14} /> : isCrit ? <Flame size={14} className="animate-pulse" /> : <AlertTriangle size={14} />}
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-10 hidden group-hover:block bg-coal-900 border border-coal-700 text-white text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-2xl z-30 pointer-events-none">
                          <div className="font-bold flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${isCrit ? 'bg-red-500' : 'bg-amber-500'}`} />{h.properties.hazard_title}</div>
                          <div className="text-coal-400 text-[10px] mt-0.5">{h.properties.mine_name} • {h.properties.severity} • {h.properties.status}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="absolute bottom-4 left-4 bg-coal-900/95 border border-coal-800 rounded-xl p-3 backdrop-blur-md text-xs space-y-1.5 shadow-xl">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-coal-400">Hotspot Severity Legend</div>
                    <div className="flex items-center gap-2 text-coal-300"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /><span>Critical / High Severity Hazard</span></div>
                    <div className="flex items-center gap-2 text-coal-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span>Medium Severity Finding</span></div>
                    <div className="flex items-center gap-2 text-coal-300"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>Resolved / Mitigated Action</span></div>
                    <div className="flex items-center gap-2 text-coal-300"><span className="w-3 h-3 rounded-md bg-coal-800 border border-slate-600" /><span>Mine Anchor / Contract Block</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Dossier */}
        <div className="space-y-4">
          <SectionCard title={selectedHotspot ? 'Linked Compliance & Contract Dossier' : selectedMine ? 'Mine & Contract Overview' : 'Select a Hotspot'} icon={<ShieldAlert size={16} className="text-teal-400" />}>
            {selectedHotspot ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-coal-950 rounded-xl border border-coal-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-coal-500 text-[10px] font-semibold">{selectedHotspot.properties.violation_code || selectedHotspot.properties.id.slice(0, 8)}</span>
                    <div className="flex items-center gap-1.5"><StatusBadge status={selectedHotspot.properties.severity} /><StatusBadge status={selectedHotspot.properties.status} /></div>
                  </div>
                  <div className="text-white font-bold text-sm">{selectedHotspot.properties.hazard_title}</div>
                  <div className="text-coal-400 text-[11px]">📍 Mine: <strong className="text-coal-200">{selectedHotspot.properties.mine_name}</strong></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Inspection Ref</span><div className="text-coal-200 font-semibold mt-0.5 font-mono text-[10px]">{selectedHotspot.properties.inspection_number || '—'}</div></div>
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Inspection Date</span><div className="text-coal-200 font-semibold mt-0.5">{formatDate(selectedHotspot.properties.inspection_date || selectedHotspot.properties.created_at)}</div></div>
                </div>
                {selectedHotspot.properties.regulation_reference && (
                  <div className="space-y-1 bg-coal-950 p-2.5 rounded-lg border border-coal-800">
                    <div className="text-coal-500 text-[10px] uppercase font-semibold">DGMS Statutory Reference</div>
                    <div className="text-indigo-400 font-mono text-[11px] font-semibold">{selectedHotspot.properties.regulation_reference}</div>
                    {selectedHotspot.properties.description && <div className="text-coal-300 text-[11px] mt-1 pt-1 border-t border-coal-800">{selectedHotspot.properties.description}</div>}
                  </div>
                )}
                {selectedHotspot.properties.evidence_photos && selectedHotspot.properties.evidence_photos.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-coal-400 font-semibold text-[11px] flex items-center gap-1.5"><Camera size={13} className="text-teal-400" /><span>Geotagged On-Site Photographic Evidence ({selectedHotspot.properties.evidence_photos.length})</span></div>
                    {selectedHotspot.properties.evidence_photos.map((ev, idx) => (
                      <div key={ev.id || idx} className="p-2.5 bg-coal-950 rounded-lg border border-coal-800 space-y-1">
                        <div className="font-semibold text-coal-200 text-[11px]">{ev.caption}</div>
                        <div className="text-coal-500 font-mono text-[10px]">GPS: {ev.latitude?.toFixed(4)}° N, {ev.longitude?.toFixed(4)}° E</div>
                        <div className="text-coal-500 text-[9px]">Captured: {formatDateTime(ev.captured_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedHotspot.properties.linked_capa && (
                  <div className={`p-3 rounded-xl space-y-1.5 border ${selectedHotspot.properties.linked_capa.is_overdue ? 'bg-red-950/30 border-red-800/40' : 'bg-amber-950/30 border-amber-800/40'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-[11px] flex items-center gap-1 ${selectedHotspot.properties.linked_capa.is_overdue ? 'text-red-400' : 'text-amber-400'}`}>
                        <Wrench size={12} /> Linked CAPA Directive
                        {selectedHotspot.properties.linked_capa.is_overdue && <span className="ml-1 px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded text-[9px] font-bold">OVERDUE</span>}
                      </span>
                      <StatusBadge status={selectedHotspot.properties.linked_capa.status} />
                    </div>
                    <div className="font-semibold text-coal-200 text-[11px]">{selectedHotspot.properties.linked_capa.title}</div>
                    <div className="text-coal-400 text-[10px]">Deadline: <strong className={selectedHotspot.properties.linked_capa.is_overdue ? 'text-red-400' : ''}>{formatDate(selectedHotspot.properties.linked_capa.due_date)}</strong></div>
                  </div>
                )}
                <div className="pt-2 border-t border-coal-800 flex flex-col gap-2">
                  <button onClick={() => navigate('/violations')} className="w-full btn-secondary text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"><ExternalLink size={13} /> View Full Violation Record</button>
                  <button onClick={() => navigate('/corrective-actions')} className="w-full btn-primary text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"><Wrench size={13} /> Submit CAPA Resolution Proof</button>
                </div>
              </div>
            ) : selectedMine ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-coal-950 rounded-xl border border-coal-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-teal-400 text-[10px] font-bold">{selectedMine.properties.mine_code}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selectedMine.properties.status_color === 'RED' ? 'bg-red-500/20 text-red-400 border-red-500/40' : selectedMine.properties.status_color === 'ORANGE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'}`}>{selectedMine.properties.risk_status}</span>
                  </div>
                  <div className="font-bold text-white text-sm">{selectedMine.properties.mine_name}</div>
                  <div className="text-coal-400 text-[11px]">{selectedMine.properties.subsidiary}</div>
                  <div className="text-coal-500 text-[10px]">{selectedMine.properties.district}, {selectedMine.properties.state}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Compliance Score</span><div className="text-emerald-400 font-bold text-sm mt-0.5">{selectedMine.properties.compliance_percentage}%</div></div>
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Active Contracts</span><div className="text-teal-400 font-bold text-sm mt-0.5">{selectedMine.properties.active_contract_count}</div></div>
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Open Violations</span><div className="text-red-400 font-bold text-sm mt-0.5">{selectedMine.properties.open_violations}</div></div>
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Overdue CAPAs</span><div className="text-rose-400 font-bold text-sm mt-0.5">{selectedMine.properties.overdue_capas}</div></div>
                </div>
                <div className="p-3 bg-coal-950 rounded-xl border border-coal-800 font-mono text-[11px] text-coal-300">
                  <div>LAT: {selectedMine.geometry.coordinates[1].toFixed(6)}° N</div>
                  <div>LNG: {selectedMine.geometry.coordinates[0].toFixed(6)}° E</div>
                  <div>BOUNDARY: Active Mine Sector</div>
                </div>
                {selectedMine.properties.warnings?.length > 0 && (
                  <div className="p-2.5 bg-red-950/30 border border-red-800/40 rounded-xl space-y-1">
                    <div className="text-red-400 font-bold text-[10px] flex items-center gap-1"><ShieldAlert size={12} /> Compliance Attention Required</div>
                    {selectedMine.properties.warnings.map((w, i) => <div key={i} className="text-coal-300 text-[10px] flex items-start gap-1"><span>•</span><span>{w}</span></div>)}
                  </div>
                )}
                {selectedMine.properties.active_contracts?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-coal-400 font-semibold text-[11px] flex items-center gap-1"><FileText size={12} className="text-teal-400" /> Active Contracts</div>
                    {selectedMine.properties.active_contracts.slice(0, 3).map(c => (
                      <div key={c.id} className="p-2 bg-coal-950 rounded-lg border border-coal-800 text-[11px]">
                        <div className="flex justify-between font-bold text-white"><span>{c.title}</span>{c.value_inr_crores && <span className="text-teal-400 font-mono text-[10px]">₹{c.value_inr_crores} Cr</span>}</div>
                        <div className="text-coal-400 font-mono text-[10px]">{c.contract_number}</div>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => navigate('/corrective-actions')} className="w-full btn-primary text-xs py-2 rounded-lg">View CAPA Actions for This Mine →</button>
              </div>
            ) : (
              <div className="text-coal-500 text-center py-10">Click any hazard hotspot pin on the map to inspect the linked contractor compliance record, photographic evidence, and CAPA directive.</div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
