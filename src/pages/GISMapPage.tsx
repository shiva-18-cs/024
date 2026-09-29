import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Building2, AlertTriangle, ShieldCheck, Filter, Layers, Info,
  Flame, CheckCircle2, Camera, FileText, Wrench, RefreshCw, ExternalLink,
  ShieldAlert, Clock, Compass, Activity
} from 'lucide-react';
import { gis as gisApi } from '../services/api';
import { SectionCard, StatusBadge, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatDateTime } from '../utils/helpers';

interface HotspotFeature {
  type: string;
  properties: {
    entity_type: string;
    id: string;
    violation_code?: string;
    mine_id: string;
    mine_name: string;
    location_tag: string;
    hazard_title: string;
    hazard_category: string;
    severity: string;
    status: string;
    regulation_reference?: string;
    description?: string;
    inspection_id?: string;
    inspection_number?: string;
    inspection_date?: string;
    inspector_name?: string;
    contractor_id?: string;
    contractor_name?: string;
    evidence_photos?: Array<{
      id: string;
      caption: string;
      file_path: string;
      latitude?: number;
      longitude?: number;
      captured_at?: string;
    }>;
    linked_capa?: {
      id: string;
      action_code: string;
      title: string;
      status: string;
      due_date?: string;
      priority: string;
    };
    linked_report?: {
      id: string;
      report_number: string;
      report_title: string;
      approval_status: string;
    };
    created_at?: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

interface MineFeature {
  type: string;
  properties: {
    entity_type: string;
    id: string;
    name: string;
    code: string;
    subsidiary: string;
    state: string;
    district: string;
    compliance_score: number;
    risk_level: string;
    open_violations: number;
    production_mtpa?: number;
    manager?: string;
    assigned_contractors?: string[];
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

export default function GISMapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [minesList, setMinesList] = useState<MineFeature[]>([]);
  const [hotspotsList, setHotspotsList] = useState<HotspotFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotFeature | null>(null);
  const [selectedMine, setSelectedMine] = useState<MineFeature | null>(null);

  // Filters
  const [filterMine, setFilterMine] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeLayer, setActiveLayer] = useState<'all' | 'high_risk' | 'open' | 'resolved'>('all');

  useEffect(() => {
    loadGISData();
  }, [filterMine, filterSeverity, filterStatus]);

  const loadGISData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterMine !== 'ALL') params.mine_id = filterMine;
      if (filterSeverity !== 'ALL') params.severity = filterSeverity;
      if (filterStatus !== 'ALL') params.status = filterStatus;

      const data: any = await gisApi.features(params);
      setMinesList(data?.mines || []);
      setHotspotsList(data?.hotspots || []);
      if (data?.hotspots?.length > 0 && !selectedHotspot) {
        setSelectedHotspot(data.hotspots[0]);
      } else if (data?.mines?.length > 0 && !selectedMine) {
        setSelectedMine(data.mines[0]);
      }
    } catch (e) {
      console.error('Failed to load GIS data', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredHotspots = hotspotsList.filter((h) => {
    const sev = h.properties.severity;
    const stat = h.properties.status;
    if (activeLayer === 'high_risk' && !(sev === 'HIGH' || sev === 'CRITICAL')) return false;
    if (activeLayer === 'open' && stat !== 'OPEN') return false;
    if (activeLayer === 'resolved' && stat !== 'RESOLVED' && stat !== 'CLOSED') return false;
    return true;
  });

  const criticalCount = hotspotsList.filter(h => h.properties.severity === 'CRITICAL' || h.properties.severity === 'HIGH').length;
  const openCount = hotspotsList.filter(h => h.properties.status === 'OPEN').length;
  const resolvedCount = hotspotsList.filter(h => h.properties.status === 'RESOLVED' || h.properties.status === 'CLOSED').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 uppercase">
              Role: {user?.role || 'Corporate'}
            </span>
            <span className="text-xs text-slate-600 font-medium">
              Geospatial Telemetry & Hotspot Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5 mt-1">
            <span className="p-2 rounded-xl bg-cil-blue/20 text-cil-light">
              <MapPin size={22} />
            </span>
            Mine Hazard Hotspots & GIS Spatial Monitoring
          </h1>
          <p className="text-slate-600 text-xs mt-0.5">
            Geographically anchored inspection findings, photographic evidence, and hazard density across active coal sectors.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
            <button
              onClick={() => setActiveLayer('all')}
              className={`px-3 py-1 rounded-md transition-colors ${activeLayer === 'all' ? 'bg-cil-blue text-white font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All Hotspots ({hotspotsList.length})
            </button>
            <button
              onClick={() => setActiveLayer('high_risk')}
              className={`px-3 py-1 rounded-md transition-colors ${activeLayer === 'high_risk' ? 'bg-red-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Critical / High ({criticalCount})
            </button>
            <button
              onClick={() => setActiveLayer('open')}
              className={`px-3 py-1 rounded-md transition-colors ${activeLayer === 'open' ? 'bg-amber-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Open Hazards ({openCount})
            </button>
            <button
              onClick={() => setActiveLayer('resolved')}
              className={`px-3 py-1 rounded-md transition-colors ${activeLayer === 'resolved' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>
          <button onClick={loadGISData} className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-slate-500" />
          <span className="text-slate-600 font-semibold">Scope Filter:</span>
          <select
            value={filterMine}
            onChange={(e) => setFilterMine(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cil-blue"
          >
            <option value="ALL">All Authorized Mines ({minesList.length})</option>
            {minesList.map((m) => (
              <option key={m.properties.id} value={m.properties.id}>
                {m.properties.name} ({m.properties.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cil-blue"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cil-blue"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Only</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved / Closed</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Spatial Canvas & Hotspot Detail Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map Vector Visualization */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xl overflow-hidden relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Layers size={14} className="text-cil-blue" />
                <span>Active Mine Hazard Heatmap & GIS Hotspot Layer ({filteredHotspots.length} Plotted Points)</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                <Compass size={12} className="text-cil-light" />
                <span>DATUM: WGS 84 / UTM 44N</span>
              </div>
            </div>

            {/* Interactive Radar Spatial Canvas */}
            <div className="relative w-full h-[540px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center">
              {/* Grid Background */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.4) 1px, transparent 0)`,
                  backgroundSize: '28px 28px'
                }}
              />

              {/* Geographic Contour Lines */}
              <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 50 120 Q 200 80 400 160 T 700 240" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="6 4" />
                <path d="M 100 350 Q 300 280 500 380 T 800 320" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
                <path d="M 220 500 Q 420 400 620 480" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="450" cy="270" r="180" fill="none" stroke="#0369a1" strokeWidth="1" opacity="0.3" />
                <circle cx="450" cy="270" r="260" fill="none" stroke="#0369a1" strokeWidth="1" strokeDasharray="4 6" opacity="0.15" />
              </svg>

              {loading ? (
                <div className="text-center text-slate-600">
                  <div className="w-8 h-8 border-2 border-cil-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Loading GIS Hotspots & Spatial Coordinates...</span>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {/* Mine Anchor Outlines */}
                  {minesList.map((m) => {
                    const [lng, lat] = m.geometry.coordinates;
                    const xPct = Math.min(92, Math.max(8, ((lng - 81.0) / 7.5) * 100));
                    const yPct = Math.min(90, Math.max(10, (1 - ((lat - 20.0) / 5.5)) * 100));

                    return (
                      <div
                        key={`mine-${m.properties.id}`}
                        style={{ left: `${xPct}%`, top: `${yPct}%` }}
                        onClick={() => { setSelectedMine(m); setSelectedHotspot(null); }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-600/80 flex items-center justify-center text-slate-300 shadow-md group-hover:scale-110 group-hover:border-cil-blue transition-transform">
                          <Building2 size={18} />
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-14 hidden group-hover:block bg-white border border-slate-300 text-slate-900 text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-xl z-30 pointer-events-none">
                          <div className="font-bold">{m.properties.name}</div>
                          <div className="text-slate-600">{m.properties.subsidiary} • Score: {m.properties.compliance_score}%</div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Hotspots Markers */}
                  {filteredHotspots.map((h) => {
                    const [lng, lat] = h.geometry.coordinates;
                    const xPct = Math.min(92, Math.max(8, ((lng - 81.0) / 7.5) * 100));
                    const yPct = Math.min(90, Math.max(10, (1 - ((lat - 20.0) / 5.5)) * 100));
                    const isSelected = selectedHotspot?.properties.id === h.properties.id;
                    const sev = h.properties.severity;
                    const isCrit = sev === 'CRITICAL' || sev === 'HIGH';
                    const isResolved = h.properties.status === 'RESOLVED' || h.properties.status === 'CLOSED';

                    return (
                      <div
                        key={`hotspot-${h.properties.id}`}
                        style={{ left: `${xPct}%`, top: `${yPct}%` }}
                        onClick={() => setSelectedHotspot(h)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20 transition-all duration-200"
                      >
                        {/* Ping radar wave for Critical / High */}
                        {(isCrit || isSelected) && !isResolved && (
                          <div className={`absolute -inset-2 rounded-full animate-ping opacity-60 ${isCrit ? 'bg-red-500' : 'bg-cil-blue'}`} />
                        )}

                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform transform group-hover:scale-125 border ${
                            isSelected
                              ? 'bg-cil-blue text-white border-white ring-4 ring-cil-light/40 scale-125'
                              : isResolved
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-500'
                              : isCrit
                              ? 'bg-red-950 text-red-400 border-red-500'
                              : 'bg-amber-950 text-amber-400 border-amber-500'
                          }`}
                        >
                          {isResolved ? (
                            <CheckCircle2 size={14} />
                          ) : isCrit ? (
                            <Flame size={14} className="animate-pulse" />
                          ) : (
                            <AlertTriangle size={14} />
                          )}
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-10 hidden group-hover:block bg-white border border-slate-300 text-slate-900 text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-2xl z-30 pointer-events-none">
                          <div className="font-bold flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isCrit ? 'bg-red-500' : 'bg-amber-500'}`} />
                            {h.properties.hazard_title}
                          </div>
                          <div className="text-slate-600 text-[10px] mt-0.5">
                            {h.properties.mine_name} • {h.properties.severity} • {h.properties.status}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Compass / Legend Overlay */}
                  <div className="absolute bottom-4 left-4 bg-slate-50 border border-slate-200 rounded-xl p-3 backdrop-blur-md text-xs space-y-1.5 shadow-xl">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Hotspot Severity Legend</div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span>Critical / High Severity Hazard</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Medium Severity Finding</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Resolved / Mitigated Action</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-600" />
                      <span>Mine Anchor Facility</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Hotspot Detail Dossier Inspector */}
        <div className="space-y-4">
          <SectionCard
            title={selectedHotspot ? 'Linked Hotspot & Hazard Dossier' : (selectedMine ? 'Selected Mine Overview' : 'Select a Hotspot')}
            icon={<ShieldAlert size={16} className="text-red-400" />}
          >
            {selectedHotspot ? (
              <div className="space-y-4 text-xs">
                {/* Header card */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-500 text-[10px] font-semibold">
                      {selectedHotspot.properties.violation_code || selectedHotspot.properties.id.slice(0, 8)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={selectedHotspot.properties.severity} />
                      <StatusBadge status={selectedHotspot.properties.status} />
                    </div>
                  </div>
                  <div className="text-slate-900 font-bold text-sm">
                    {selectedHotspot.properties.hazard_title}
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    📍 Mine: <strong className="text-slate-900">{selectedHotspot.properties.mine_name}</strong>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    🏷️ Location Tag: <span className="text-slate-700 font-medium">{selectedHotspot.properties.location_tag}</span>
                  </div>
                </div>

                {/* Regulation & Description */}
                <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold">DGMS Statutory Reference</div>
                  <div className="text-indigo-400 font-mono text-[11px] font-semibold">
                    {selectedHotspot.properties.regulation_reference}
                  </div>
                  {selectedHotspot.properties.description && (
                    <div className="text-slate-700 text-[11px] mt-1 pt-1 border-t border-slate-200">
                      {selectedHotspot.properties.description}
                    </div>
                  )}
                </div>

                {/* Inspection & Inspector Context */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Field Inspector</span>
                    <div className="text-slate-900 font-semibold mt-0.5">
                      {selectedHotspot.properties.inspector_name || 'Amitabh Singh'}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Inspection Date</span>
                    <div className="text-slate-900 font-semibold mt-0.5">
                      {formatDate(selectedHotspot.properties.inspection_date || selectedHotspot.properties.created_at)}
                    </div>
                  </div>
                </div>

                {/* Geotagged Evidence Photos */}
                {selectedHotspot.properties.evidence_photos && selectedHotspot.properties.evidence_photos.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-slate-600 font-semibold text-[11px] flex items-center gap-1.5">
                      <Camera size={13} className="text-cil-blue" />
                      <span>Geotagged On-Site Photographic Evidence ({selectedHotspot.properties.evidence_photos.length})</span>
                    </div>
                    <div className="space-y-2">
                      {selectedHotspot.properties.evidence_photos.map((ev, idx) => (
                        <div key={ev.id || idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                          <div className="font-semibold text-slate-900 text-[11px]">{ev.caption}</div>
                          <div className="text-slate-500 font-mono text-[10px]">
                            GPS: {ev.latitude?.toFixed(4)}° N, {ev.longitude?.toFixed(4)}° E
                          </div>
                          <div className="text-slate-500 text-[9px]">Captured: {formatDateTime(ev.captured_at)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked Corrective Action (CAPA) */}
                {selectedHotspot.properties.linked_capa && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-800 font-bold text-[11px] flex items-center gap-1">
                        <Wrench size={12} /> Linked CAPA Directive
                      </span>
                      <StatusBadge status={selectedHotspot.properties.linked_capa.status} />
                    </div>
                    <div className="font-semibold text-slate-900 text-[11px]">
                      {selectedHotspot.properties.linked_capa.title}
                    </div>
                    <div className="text-slate-600 text-[10px]">
                      Deadline: <strong>{formatDate(selectedHotspot.properties.linked_capa.due_date)}</strong>
                    </div>
                  </div>
                )}

                {/* Linked Statutory Report */}
                {selectedHotspot.properties.linked_report && (
                  <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-400 font-bold text-[11px] flex items-center gap-1">
                        <FileText size={12} /> Linked Statutory Report
                      </span>
                      <StatusBadge status={selectedHotspot.properties.linked_report.approval_status} />
                    </div>
                    <div className="font-semibold text-slate-900 text-[11px]">
                      {selectedHotspot.properties.linked_report.report_number} — {selectedHotspot.properties.linked_report.report_title}
                    </div>
                  </div>
                )}

                {/* Action Links */}
                <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                  <button
                    onClick={() => navigate('/inspections')}
                    className="w-full btn-secondary text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={13} /> View Full Inspection Audit
                  </button>
                  <button
                    onClick={() => navigate('/corrective-actions')}
                    className="w-full btn-primary text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Wrench size={13} /> View / Resolve Corrective Actions
                  </button>
                </div>
              </div>
            ) : selectedMine ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900 text-sm">{selectedMine.properties.name}</div>
                  <div className="text-slate-600 text-[11px]">{selectedMine.properties.subsidiary} ({selectedMine.properties.code})</div>
                  <div className="text-slate-500 text-[10px] mt-1">{selectedMine.properties.district}, {selectedMine.properties.state}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Compliance Index</span>
                    <div className="text-emerald-400 font-bold text-sm mt-0.5">{selectedMine.properties.compliance_score}%</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Open Hazards</span>
                    <div className="text-red-400 font-bold text-sm mt-0.5">{selectedMine.properties.open_violations}</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                  <div>LAT: {selectedMine.geometry.coordinates[1].toFixed(6)}° N</div>
                  <div>LNG: {selectedMine.geometry.coordinates[0].toFixed(6)}° E</div>
                  <div>RADIUS: 4.5 km Active Mine Boundary</div>
                </div>

                <button
                  onClick={() => navigate('/inspections')}
                  className="w-full btn-primary text-xs py-2 rounded-lg"
                >
                  Conduct Mine Inspection Here →
                </button>
              </div>
            ) : (
              <div className="text-slate-500 text-center py-10">
                Click any hazard hotspot pin on the map to inspect the linked inspection, photographic evidence, and CAPA.
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
