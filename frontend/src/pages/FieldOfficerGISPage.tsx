import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Building2, AlertTriangle, ShieldCheck, Filter, Layers,
  Flame, CheckCircle2, Camera, FileText, Wrench, RefreshCw, ExternalLink,
  ShieldAlert, Clock, Compass, ClipboardList, RotateCcw, Activity
} from 'lucide-react';
import { gis as gisApi } from '../services/api';
import { SectionCard, StatusBadge, KPICard } from '../components/ui/UIComponents';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatDateTime } from '../utils/helpers';

interface FindingHotspot {
  type: string;
  properties: {
    entity_type: string; id: string; violation_code?: string;
    inspection_id: string; inspection_number: string; inspection_date?: string;
    mine_id: string; mine_name: string; location_tag?: string;
    finding_title: string; finding_category: string; severity: string; status: string;
    is_recurring: boolean; recurrence_count?: number;
    regulation_reference?: string; description?: string;
    inspector_name?: string; contractor_name?: string;
    evidence_photos?: Array<{ id: string; caption: string; file_path: string; latitude?: number; longitude?: number; captured_at?: string; }>;
    linked_capa?: { id: string; action_code: string; title: string; status: string; priority: string; due_date?: string; assigned_to?: string; };
    created_at?: string;
  };
  geometry: { type: string; coordinates: [number, number] };
}

interface InspectionFeature {
  type: string;
  properties: {
    entity_type: string; id: string; inspection_number: string;
    mine_id: string; mine_name: string; inspection_type: string;
    inspection_date?: string; location_tag?: string; risk_level: string;
    compliance_score: number; workflow_stage: string; summary?: string;
    evidence_count: number; observations_count: number; violations_count: number;
    evidence_photos?: Array<{ id: string; caption: string; file_path: string; latitude?: number; longitude?: number; captured_at?: string; }>;
  };
  geometry: { type: string; coordinates: [number, number] };
}

export default function FieldOfficerGISPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gisData, setGisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<FindingHotspot | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<InspectionFeature | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'high_risk' | 'open' | 'resolved' | 'recurring'>('all');
  const [filterMine, setFilterMine]           = useState('ALL');
  const [filterSeverity, setFilterSeverity]   = useState('ALL');
  const [filterStatus, setFilterStatus]       = useState('ALL');
  const [filterRecurring, setFilterRecurring] = useState('ALL');

  useEffect(() => { loadGISData(); }, [filterMine, filterSeverity, filterStatus, filterRecurring]);

  const loadGISData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterMine !== 'ALL')      params.mine_id           = filterMine;
      if (filterSeverity !== 'ALL')  params.severity          = filterSeverity;
      if (filterStatus !== 'ALL')    params.violation_status  = filterStatus;
      if (filterRecurring !== 'ALL') params.is_recurring      = filterRecurring;
      const data: any = await gisApi.fieldOfficer(params);
      setGisData(data);
      if (data?.hotspots?.length > 0 && !selectedHotspot) setSelectedHotspot(data.hotspots[0]);
      else if (data?.inspections?.length > 0 && !selectedInspection && !selectedHotspot) setSelectedInspection(data.inspections[0]);
    } catch (e) { console.error('Field Officer GIS load failed', e); }
    finally { setLoading(false); }
  };

  const summary    = gisData?.summary    || { assigned_mines: 0, total_inspections: 0, geo_tagged_inspections: 0, open_findings: 0, high_critical_findings: 0, recurring_findings: 0 };
  const minesList: any[]                 = gisData?.mines       || [];
  const inspectionsList: InspectionFeature[] = gisData?.inspections || [];
  const hotspotsList: FindingHotspot[]   = gisData?.hotspots   || [];

  const filteredHotspots = hotspotsList.filter(h => {
    const sev = h.properties.severity, stat = h.properties.status;
    if (activeLayer === 'high_risk' && !(sev === 'HIGH' || sev === 'CRITICAL')) return false;
    if (activeLayer === 'open'      && stat !== 'OPEN')                          return false;
    if (activeLayer === 'resolved'  && stat !== 'RESOLVED' && stat !== 'CLOSED') return false;
    if (activeLayer === 'recurring' && !h.properties.is_recurring)               return false;
    return true;
  });

  const criticalCount  = hotspotsList.filter(h => h.properties.severity === 'CRITICAL' || h.properties.severity === 'HIGH').length;
  const openCount      = hotspotsList.filter(h => h.properties.status === 'OPEN').length;
  const resolvedCount  = hotspotsList.filter(h => h.properties.status === 'RESOLVED' || h.properties.status === 'CLOSED').length;
  const recurringCount = hotspotsList.filter(h => h.properties.is_recurring).length;

  const toX = (lng: number) => Math.min(92, Math.max(8, ((lng - 81.0) / 7.5) * 100));
  const toY = (lat: number) => Math.min(90, Math.max(10, (1 - ((lat - 20.0) / 5.5)) * 100));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">Field Officer GIS Portal</span>
            {user?.full_name && <span className="text-xs text-coal-400 font-medium">👷 {user.full_name}</span>}
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5 mt-1">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300"><MapPin size={22} /></span>
            Field Inspection Hazard Heatmap &amp; GIS Hotspot Layer
          </h1>
          <p className="text-coal-400 text-xs mt-0.5">Geospatially anchored field inspection findings, recurring hazards and geo-tagged photographic evidence across assigned mining sectors.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-coal-900 border border-coal-800 rounded-lg p-1 text-xs">
            {(['all','high_risk','open','resolved','recurring'] as const).map((layer) => (
              <button key={layer} onClick={() => setActiveLayer(layer)}
                className={`px-3 py-1 rounded-md transition-colors ${activeLayer === layer
                  ? layer === 'high_risk' ? 'bg-red-600 text-white font-semibold'
                  : layer === 'open'      ? 'bg-amber-600 text-white font-semibold'
                  : layer === 'resolved'  ? 'bg-emerald-600 text-white font-semibold'
                  : layer === 'recurring' ? 'bg-violet-600 text-white font-semibold'
                  :                         'bg-amber-600 text-white font-semibold'
                  : 'text-coal-400 hover:text-coal-200'}`}>
                {layer === 'all' ? `All Findings (${hotspotsList.length})` : layer === 'high_risk' ? `Critical / High (${criticalCount})` : layer === 'open' ? `Open (${openCount})` : layer === 'resolved' ? `Resolved (${resolvedCount})` : `Recurring (${recurringCount})`}
              </button>
            ))}
          </div>
          <button onClick={loadGISData} className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"><RefreshCw size={13} /></button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Assigned Mines"     value={summary.assigned_mines}          icon={<Building2     size={18} className="text-amber-400"  />} iconBg="bg-amber-500/10"  />
        <KPICard label="Total Inspections"  value={summary.total_inspections}        icon={<ClipboardList size={18} className="text-sky-400"    />} iconBg="bg-sky-500/10"    onClick={() => navigate('/inspections')} />
        <KPICard label="Geo-tagged"         value={summary.geo_tagged_inspections}   icon={<Camera        size={18} className="text-teal-400"   />} iconBg="bg-teal-500/10"   />
        <KPICard label="Open Findings"      value={summary.open_findings}            icon={<AlertTriangle size={18} className="text-red-400"    />} iconBg="bg-red-500/10"    />
        <KPICard label="High / Critical"    value={summary.high_critical_findings}   icon={<Flame         size={18} className="text-rose-400"   />} iconBg="bg-rose-500/10"   />
        <KPICard label="Recurring Issues"   value={summary.recurring_findings}       icon={<RotateCcw     size={18} className="text-violet-400" />} iconBg="bg-violet-500/10" />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-coal-900 border border-coal-800 p-3 rounded-xl text-xs">
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Filter size={14} className="text-coal-500" />
          <span className="text-coal-400 font-semibold">Scope Filter:</span>
          <select value={filterMine} onChange={e => setFilterMine(e.target.value)}
            className="bg-coal-950 border border-coal-700 text-coal-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500">
            <option value="ALL">Assigned Mines ({minesList.length})</option>
            {minesList.map((m: any) => <option key={m.properties.id} value={m.properties.id}>{m.properties.name} ({m.properties.code})</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="bg-coal-950 border border-coal-700 text-coal-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500">
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option><option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-coal-950 border border-coal-700 text-coal-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500">
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Only</option><option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved / Closed</option>
          </select>
          <select value={filterRecurring} onChange={e => setFilterRecurring(e.target.value)}
            className="bg-coal-950 border border-coal-700 text-coal-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500">
            <option value="ALL">All Finding Types</option>
            <option value="true">Recurring Issues Only</option>
            <option value="false">Non-Recurring Only</option>
          </select>
          <button onClick={() => { setFilterMine('ALL'); setFilterSeverity('ALL'); setFilterStatus('ALL'); setFilterRecurring('ALL'); }}
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
                <Layers size={14} className="text-amber-400" />
                <span>Field Inspection Hazard Heatmap &amp; GIS Hotspot Layer ({filteredHotspots.length} Plotted Points)</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-coal-400 font-mono">
                <Compass size={12} className="text-amber-300" /><span>DATUM: WGS 84 / UTM 44N</span>
              </div>
            </div>
            <div className="relative w-full h-[540px] bg-coal-950 rounded-xl border border-coal-800/80 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, rgba(245, 158, 11, 0.35) 1px, transparent 0)`, backgroundSize: '28px 28px' }} />
              <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 50 120 Q 200 80 400 160 T 700 240" fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="6 4" />
                <path d="M 100 350 Q 300 280 500 380 T 800 320" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <path d="M 220 500 Q 420 400 620 480" fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="450" cy="270" r="180" fill="none" stroke="#b45309" strokeWidth="1" opacity="0.3" />
                <circle cx="450" cy="270" r="260" fill="none" stroke="#b45309" strokeWidth="1" strokeDasharray="4 6" opacity="0.15" />
              </svg>
              {loading ? (
                <div className="text-center text-coal-400">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Loading Field GIS Hotspots &amp; Spatial Coordinates...</span>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {/* Mine anchor markers */}
                  {minesList.map((m: any) => {
                    const [lng, lat] = m.geometry.coordinates;
                    return (
                      <div key={`mine-${m.properties.id}`} style={{ left: `${toX(lng)}%`, top: `${toY(lat)}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10">
                        <div className="w-12 h-12 rounded-2xl bg-coal-900/90 border border-slate-600/80 flex items-center justify-center text-slate-300 shadow-md group-hover:scale-110 group-hover:border-amber-400 transition-transform">
                          <Building2 size={18} />
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-14 hidden group-hover:block bg-coal-900 border border-coal-700 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-xl z-30 pointer-events-none">
                          <div className="font-bold">{m.properties.name}</div>
                          <div className="text-coal-400">{m.properties.code} • {m.properties.state}</div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Inspection markers */}
                  {inspectionsList.filter(i => i.geometry.coordinates[0] && i.geometry.coordinates[1]).map(insp => {
                    const [lng, lat] = insp.geometry.coordinates;
                    if (!lng || !lat) return null;
                    const isSelected = selectedInspection?.properties.id === insp.properties.id && !selectedHotspot;
                    return (
                      <div key={`insp-${insp.properties.id}`} style={{ left: `${toX(lng)}%`, top: `${toY(lat)}%` }}
                        onClick={() => { setSelectedInspection(insp); setSelectedHotspot(null); }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-15">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110 border ${isSelected ? 'bg-amber-500/30 text-amber-300 border-amber-400 ring-2 ring-amber-400/40' : 'bg-coal-900/80 text-amber-400 border-amber-700/60'}`}>
                          <ClipboardList size={15} />
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-11 hidden group-hover:block bg-coal-900 border border-coal-700 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-xl z-30 pointer-events-none">
                          <div className="font-bold">{insp.properties.inspection_number}</div>
                          <div className="text-coal-400">{insp.properties.mine_name} • {insp.properties.risk_level}</div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Finding hotspot markers */}
                  {filteredHotspots.map(h => {
                    const [lng, lat] = h.geometry.coordinates;
                    const isSelected = selectedHotspot?.properties.id === h.properties.id;
                    const isCrit = h.properties.severity === 'CRITICAL' || h.properties.severity === 'HIGH';
                    const isResolved = h.properties.status === 'RESOLVED' || h.properties.status === 'CLOSED';
                    const isRecurring = h.properties.is_recurring;
                    return (
                      <div key={`hs-${h.properties.id}`} style={{ left: `${toX(lng)}%`, top: `${toY(lat)}%` }}
                        onClick={() => setSelectedHotspot(h)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20 transition-all duration-200">
                        {(isCrit || isSelected) && !isResolved && <div className={`absolute -inset-2 rounded-full animate-ping opacity-60 ${isCrit ? 'bg-red-500' : 'bg-amber-500'}`} />}
                        {isRecurring && !isResolved && <div className="absolute -inset-3 rounded-full border-2 border-violet-500/40 animate-pulse" />}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform transform group-hover:scale-125 border ${isSelected ? 'bg-amber-500 text-white border-white ring-4 ring-amber-400/40 scale-125' : isResolved ? 'bg-emerald-950 text-emerald-400 border-emerald-500' : isCrit ? 'bg-red-950 text-red-400 border-red-500' : 'bg-amber-950 text-amber-400 border-amber-500'}`}>
                          {isResolved ? <CheckCircle2 size={14} /> : isCrit ? <Flame size={14} className="animate-pulse" /> : isRecurring ? <RotateCcw size={14} /> : <AlertTriangle size={14} />}
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-10 hidden group-hover:block bg-coal-900 border border-coal-700 text-white text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-2xl z-30 pointer-events-none">
                          <div className="font-bold flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${isCrit ? 'bg-red-500' : 'bg-amber-500'}`} />{h.properties.finding_title}</div>
                          <div className="text-coal-400 text-[10px] mt-0.5">{h.properties.mine_name} • {h.properties.severity}{isRecurring ? ' • RECURRING' : ''}</div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 bg-coal-900/95 border border-coal-800 rounded-xl p-3 backdrop-blur-md text-xs space-y-1.5 shadow-xl">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-coal-400">Hotspot Severity Legend</div>
                    <div className="flex items-center gap-2 text-coal-300"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /><span>Critical / High Severity Hazard</span></div>
                    <div className="flex items-center gap-2 text-coal-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span>Medium Severity Finding</span></div>
                    <div className="flex items-center gap-2 text-coal-300"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>Resolved / Mitigated Action</span></div>
                    <div className="flex items-center gap-2 text-coal-300"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" /><span>Recurring Finding</span></div>
                    <div className="flex items-center gap-2 text-coal-300"><span className="w-3 h-3 rounded-md bg-coal-800 border border-slate-600" /><span>Mine Anchor Facility</span></div>
                    <div className="flex items-center gap-2 text-coal-300"><span className="w-2.5 h-2.5 rounded-lg bg-amber-900 border border-amber-700" /><span>Inspection Location</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Dossier */}
        <div className="space-y-4">
          <SectionCard title={selectedHotspot ? 'Linked Inspection & Hazard Dossier' : selectedInspection ? 'Inspection Overview' : 'Select a Finding'} icon={<ShieldAlert size={16} className="text-amber-400" />}>
            {selectedHotspot ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-coal-950 rounded-xl border border-coal-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-coal-500 text-[10px] font-semibold">{selectedHotspot.properties.violation_code || selectedHotspot.properties.id.slice(0, 8)}</span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={selectedHotspot.properties.severity} /><StatusBadge status={selectedHotspot.properties.status} />
                      {selectedHotspot.properties.is_recurring && <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded text-[9px] font-bold">RECURRING</span>}
                    </div>
                  </div>
                  <div className="text-white font-bold text-sm">{selectedHotspot.properties.finding_title}</div>
                  <div className="text-coal-400 text-[11px]">📍 Mine: <strong className="text-coal-200">{selectedHotspot.properties.mine_name}</strong></div>
                  {selectedHotspot.properties.location_tag && <div className="text-coal-400 text-[11px]">🏷️ Location: <span className="text-coal-300">{selectedHotspot.properties.location_tag}</span></div>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Field Inspector</span><div className="text-coal-200 font-semibold mt-0.5">{selectedHotspot.properties.inspector_name || '—'}</div></div>
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Inspection Date</span><div className="text-coal-200 font-semibold mt-0.5">{formatDate(selectedHotspot.properties.inspection_date || selectedHotspot.properties.created_at)}</div></div>
                </div>

                {selectedHotspot.properties.is_recurring && selectedHotspot.properties.recurrence_count && selectedHotspot.properties.recurrence_count > 1 && (
                  <div className="p-2.5 bg-violet-950/30 border border-violet-800/40 rounded-xl">
                    <div className="text-violet-300 font-bold text-[11px] flex items-center gap-1"><RotateCcw size={12} /> Recurring Hazard Pattern</div>
                    <div className="text-coal-300 text-[10px] mt-1">This finding has been recorded <strong className="text-violet-300">{selectedHotspot.properties.recurrence_count}x</strong> across inspections — escalation recommended.</div>
                  </div>
                )}

                {selectedHotspot.properties.regulation_reference && (
                  <div className="space-y-1 bg-coal-950 p-2.5 rounded-lg border border-coal-800">
                    <div className="text-coal-500 text-[10px] uppercase font-semibold">DGMS Statutory Reference</div>
                    <div className="text-indigo-400 font-mono text-[11px] font-semibold">{selectedHotspot.properties.regulation_reference}</div>
                    {selectedHotspot.properties.description && <div className="text-coal-300 text-[11px] mt-1 pt-1 border-t border-coal-800">{selectedHotspot.properties.description}</div>}
                  </div>
                )}

                {selectedHotspot.properties.evidence_photos && selectedHotspot.properties.evidence_photos.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-coal-400 font-semibold text-[11px] flex items-center gap-1.5"><Camera size={13} className="text-amber-400" /><span>Geotagged On-Site Photographic Evidence ({selectedHotspot.properties.evidence_photos.length})</span></div>
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
                  <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1"><Wrench size={12} /> Linked CAPA Directive</span>
                      <StatusBadge status={selectedHotspot.properties.linked_capa.status} />
                    </div>
                    <div className="font-semibold text-coal-200 text-[11px]">{selectedHotspot.properties.linked_capa.title}</div>
                    {selectedHotspot.properties.linked_capa.assigned_to && <div className="text-coal-400 text-[10px]">Assigned to: <strong className="text-coal-300">{selectedHotspot.properties.linked_capa.assigned_to}</strong></div>}
                    <div className="text-coal-400 text-[10px]">Deadline: <strong>{formatDate(selectedHotspot.properties.linked_capa.due_date)}</strong></div>
                  </div>
                )}

                <div className="pt-2 border-t border-coal-800 flex flex-col gap-2">
                  <button onClick={() => navigate('/inspections')} className="w-full btn-secondary text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"><ExternalLink size={13} /> View Full Inspection Audit</button>
                  <button onClick={() => navigate('/corrective-actions')} className="w-full btn-primary text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"><Wrench size={13} /> View / Resolve Corrective Actions</button>
                </div>
              </div>

            ) : selectedInspection ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-coal-950 rounded-xl border border-coal-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-amber-400 text-[10px] font-bold">{selectedInspection.properties.inspection_number}</span>
                    <StatusBadge status={selectedInspection.properties.risk_level} />
                  </div>
                  <div className="font-bold text-white text-sm">{selectedInspection.properties.mine_name}</div>
                  <div className="text-coal-400 text-[11px]">{selectedInspection.properties.inspection_type}</div>
                  {selectedInspection.properties.location_tag && <div className="text-coal-500 text-[10px]">📍 {selectedInspection.properties.location_tag}</div>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Compliance Score</span><div className="text-emerald-400 font-bold text-sm mt-0.5">{selectedInspection.properties.compliance_score}%</div></div>
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Inspection Date</span><div className="text-coal-200 font-semibold mt-0.5">{formatDate(selectedInspection.properties.inspection_date)}</div></div>
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Violations</span><div className="text-red-400 font-bold text-sm mt-0.5">{selectedInspection.properties.violations_count}</div></div>
                  <div className="bg-coal-950 p-2.5 rounded-lg border border-coal-800"><span className="text-coal-500 text-[10px]">Photo Evidence</span><div className="text-teal-400 font-bold text-sm mt-0.5">{selectedInspection.properties.evidence_count}</div></div>
                </div>
                <div className="p-3 bg-coal-950 rounded-xl border border-coal-800 font-mono text-[11px] text-coal-300">
                  <div>LAT: {selectedInspection.geometry.coordinates[1]?.toFixed(6)}° N</div>
                  <div>LNG: {selectedInspection.geometry.coordinates[0]?.toFixed(6)}° E</div>
                  <div>STAGE: {selectedInspection.properties.workflow_stage}</div>
                </div>
                <button onClick={() => navigate('/inspections')} className="w-full btn-primary text-xs py-2 rounded-lg">Open Inspection Record →</button>
              </div>

            ) : (
              <div className="text-coal-500 text-center py-10">Click any finding hotspot pin on the map to inspect the linked field inspection, geo-tagged photographic evidence, and CAPA directive.</div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
