import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer, TileLayer, Marker, Popup, Tooltip, useMap
} from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Building2, AlertTriangle, ShieldCheck, Filter, Layers,
  Flame, CheckCircle2, Camera, FileText, Wrench, RefreshCw, ExternalLink,
  ShieldAlert, Clock, Compass, ClipboardList, RotateCcw, Activity, Maximize2
} from 'lucide-react';
import { gis as gisApi } from '../services/api';
import { SectionCard, StatusBadge, KPICard } from '../components/ui/UIComponents';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatDateTime } from '../utils/helpers';

// ---------------------------------------------------------------------------
// Basemap Options
// ---------------------------------------------------------------------------
const BASEMAP_TILES = {
  voyager: {
    name: 'CartoDB Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: 'abc',
    maxZoom: 19,
  },
  imagery: {
    name: 'Satellite (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    subdomains: 'a',
    maxZoom: 18,
  },
};

// ---------------------------------------------------------------------------
// Custom Leaflet Icons
// ---------------------------------------------------------------------------
function createMineIcon(name: string, isSelected: boolean) {
  return L.divIcon({
    className: 'leaflet-field-mine-marker',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="
          width: ${isSelected ? '34px' : '28px'};
          height: ${isSelected ? '34px' : '28px'};
          background: #0f172a;
          border: 2px solid ${isSelected ? '#f59e0b' : '#64748b'};
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          color: white;
          transform: rotate(45deg);
          transition: all 0.2s;
        ">
          <svg style="transform: rotate(-45deg); width: 14px; height: 14px; fill: #ffffff;" viewBox="0 0 24 24">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function createInspectionIcon(isSelected: boolean, riskLevel: string) {
  const bg = riskLevel === 'CRITICAL' ? '#b91c1c' : riskLevel === 'HIGH' ? '#ea580c' : '#0284c7';
  return L.divIcon({
    className: 'leaflet-field-insp-marker',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="
          width: ${isSelected ? '30px' : '26px'};
          height: ${isSelected ? '30px' : '26px'};
          background: ${bg};
          border: 2px solid #ffffff;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 8px rgba(0,0,0,0.25);
          color: white;
          transition: all 0.2s;
        ">
          <svg style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2;" viewBox="0 0 24 24">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function createHotspotIcon(severity: string, status: string, isRecurring: boolean, isSelected: boolean) {
  const isResolved = status === 'RESOLVED' || status === 'CLOSED';
  const isCrit = severity === 'CRITICAL' || severity === 'HIGH';
  const color = isResolved ? '#16a34a' : isCrit ? '#dc2626' : isRecurring ? '#7c3aed' : '#d97706';

  return L.divIcon({
    className: 'leaflet-field-hotspot-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        ${(isCrit || isSelected) && !isResolved ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; background: ${color}; opacity: 0.5; animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
        ${isRecurring && !isResolved ? `<div style="position: absolute; inset: -3px; border-radius: 9999px; border: 2px dashed #8b5cf6; animation: spin 6s linear infinite;"></div>` : ''}
        <div style="
          width: ${isSelected ? '28px' : '24px'};
          height: ${isSelected ? '28px' : '24px'};
          background: ${color};
          border: 2px solid #ffffff;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          color: white;
          transition: all 0.2s;
        ">
          ${isResolved ? `
            <svg style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          ` : isCrit ? `
            <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 24 24"><path d="M12 23c-4.97 0-9-4.03-9-9 0-3.32 1.8-6.22 4.49-7.75C7.94 9.07 10 11.5 10 14c0 1.1.9 2 2 2s2-.9 2-2c0-3.5-3-6-3-10 4.5 1.5 8 5.79 8 10 0 4.97-4.03 9-9 9z"/></svg>
          ` : `
            <svg style="width: 13px; height: 13px; fill: currentColor;" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
          `}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

// ---------------------------------------------------------------------------
// Map Bounds / Center Synchronizer
// ---------------------------------------------------------------------------
function MapController({
  selectedCoords,
  allCoords,
}: {
  selectedCoords: [number, number] | null;
  allCoords: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedCoords && selectedCoords[0] && selectedCoords[1]) {
      map.flyTo(selectedCoords, 14, { duration: 1.0 });
    }
  }, [selectedCoords, map]);

  useEffect(() => {
    if (allCoords.length > 0 && !selectedCoords) {
      const valid = allCoords.filter(c => c && c[0] && c[1]);
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12, animate: true });
      }
    }
  }, [allCoords, selectedCoords, map]);

  return null;
}

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
  const [activeBasemap, setActiveBasemap]     = useState<'voyager' | 'osm' | 'imagery'>('voyager');

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

  const summary        = gisData?.summary    || { assigned_mines: 0, total_inspections: 0, geo_tagged_inspections: 0, open_findings: 0, high_critical_findings: 0, recurring_findings: 0 };
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

  // Gather coordinates for bounds
  const allCoords = useMemo<[number, number][]>(() => {
    const coords: [number, number][] = [];
    minesList.forEach(m => {
      if (m.geometry?.coordinates?.[1] && m.geometry?.coordinates?.[0]) {
        coords.push([m.geometry.coordinates[1], m.geometry.coordinates[0]]);
      }
    });
    hotspotsList.forEach(h => {
      if (h.geometry?.coordinates?.[1] && h.geometry?.coordinates?.[0]) {
        coords.push([h.geometry.coordinates[1], h.geometry.coordinates[0]]);
      }
    });
    return coords;
  }, [minesList, hotspotsList]);

  // Selected coordinates for map focus
  const selectedCoords = useMemo<[number, number] | null>(() => {
    if (selectedHotspot?.geometry?.coordinates?.[1] && selectedHotspot?.geometry?.coordinates?.[0]) {
      return [selectedHotspot.geometry.coordinates[1], selectedHotspot.geometry.coordinates[0]];
    }
    if (selectedInspection?.geometry?.coordinates?.[1] && selectedInspection?.geometry?.coordinates?.[0]) {
      return [selectedInspection.geometry.coordinates[1], selectedInspection.geometry.coordinates[0]];
    }
    return null;
  }, [selectedHotspot, selectedInspection]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide">
              Field Officer GIS Portal
            </span>
            {user?.full_name && <span className="text-xs text-slate-600 font-medium">👷 {user.full_name}</span>}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5 mt-1">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800"><MapPin size={22} /></span>
            Field Inspection Hazard Heatmap &amp; GIS Hotspot Layer
          </h1>
          <p className="text-slate-600 text-xs mt-0.5">
            Geospatially anchored field inspection findings, recurring hazards and geo-tagged photographic evidence across assigned mining sectors.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
            {(['all','high_risk','open','resolved','recurring'] as const).map((layer) => (
              <button key={layer} onClick={() => setActiveLayer(layer)}
                className={`px-3 py-1 rounded-md transition-colors ${activeLayer === layer
                  ? layer === 'high_risk' ? 'bg-red-600 text-white font-semibold shadow-sm'
                  : layer === 'open'      ? 'bg-amber-600 text-white font-semibold shadow-sm'
                  : layer === 'resolved'  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : layer === 'recurring' ? 'bg-violet-600 text-white font-semibold shadow-sm'
                  :                         'bg-amber-600 text-white font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'}`}>
                {layer === 'all' ? `All Findings (${hotspotsList.length})` : layer === 'high_risk' ? `Critical / High (${criticalCount})` : layer === 'open' ? `Open (${openCount})` : layer === 'resolved' ? `Resolved (${resolvedCount})` : `Recurring (${recurringCount})`}
              </button>
            ))}
          </div>
          <button onClick={loadGISData} className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Assigned Mines"     value={summary.assigned_mines}          icon={<Building2     size={18} className="text-amber-500"  />} iconBg="bg-amber-500/10"  />
        <KPICard label="Total Inspections"  value={summary.total_inspections}        icon={<ClipboardList size={18} className="text-sky-500"    />} iconBg="bg-sky-500/10"    onClick={() => navigate('/inspections')} />
        <KPICard label="Geo-tagged"         value={summary.geo_tagged_inspections}   icon={<Camera        size={18} className="text-teal-600"   />} iconBg="bg-teal-500/10"   />
        <KPICard label="Open Findings"      value={summary.open_findings}            icon={<AlertTriangle size={18} className="text-red-500"    />} iconBg="bg-red-500/10"    />
        <KPICard label="High / Critical"    value={summary.high_critical_findings}   icon={<Flame         size={18} className="text-rose-500"   />} iconBg="bg-rose-500/10"   />
        <KPICard label="Recurring Issues"   value={summary.recurring_findings}       icon={<RotateCcw     size={18} className="text-violet-500" />} iconBg="bg-violet-500/10" />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs shadow-sm">
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Filter size={14} className="text-slate-500" />
          <span className="text-slate-700 font-semibold">Scope Filter:</span>
          <select value={filterMine} onChange={e => setFilterMine(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 shadow-sm">
            <option value="ALL">Assigned Mines ({minesList.length})</option>
            {minesList.map((m: any) => <option key={m.properties.id} value={m.properties.id}>{m.properties.name} ({m.properties.code})</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 shadow-sm">
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option><option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 shadow-sm">
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Only</option><option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved / Closed</option>
          </select>
          <select value={filterRecurring} onChange={e => setFilterRecurring(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 shadow-sm">
            <option value="ALL">All Finding Types</option>
            <option value="true">Recurring Issues Only</option>
            <option value="false">Non-Recurring Only</option>
          </select>
          <button onClick={() => { setFilterMine('ALL'); setFilterSeverity('ALL'); setFilterStatus('ALL'); setFilterRecurring('ALL'); }}
            className="text-[11px] text-slate-500 hover:text-slate-700 underline underline-offset-2">Reset</button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map Canvas */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md overflow-hidden relative">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Layers size={14} className="text-amber-500" />
                <span>Field Inspection Hazard Spatial Map ({filteredHotspots.length} Plotted Points)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] border border-slate-200">
                  {(['voyager', 'osm', 'imagery'] as const).map(bm => (
                    <button
                      key={bm}
                      onClick={() => setActiveBasemap(bm)}
                      className={`px-2 py-0.5 rounded font-medium transition-colors ${
                        activeBasemap === bm
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {bm === 'voyager' ? 'Street' : bm === 'osm' ? 'OSM' : 'Satellite'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                  <Compass size={12} className="text-amber-500" />
                  <span>WGS 84</span>
                </div>
              </div>
            </div>

            <div className="relative w-full h-[560px] rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
                  <div className="text-center text-slate-600">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading Field GIS Hotspots &amp; Spatial Coordinates...</span>
                  </div>
                </div>
              ) : null}

              <MapContainer
                center={[23.5, 85.5]}
                zoom={7}
                className="w-full h-full z-10"
                scrollWheelZoom={true}
              >
                <TileLayer
                  url={BASEMAP_TILES[activeBasemap].url}
                  attribution={BASEMAP_TILES[activeBasemap].attribution}
                  maxZoom={BASEMAP_TILES[activeBasemap].maxZoom}
                />

                <MapController
                  selectedCoords={selectedCoords}
                  allCoords={allCoords}
                />

                {/* Mine Anchor Markers */}
                {minesList.map((m: any) => {
                  const lat = m.geometry?.coordinates?.[1];
                  const lng = m.geometry?.coordinates?.[0];
                  if (!lat || !lng) return null;
                  const isSelected = selectedHotspot?.properties.mine_id === m.properties.id;

                  return (
                    <Marker
                      key={`mine-${m.properties.id}`}
                      position={[lat, lng]}
                      icon={createMineIcon(m.properties.name, isSelected)}
                      eventHandlers={{
                        click: () => {
                          const matchingHotspot = hotspotsList.find(h => h.properties.mine_id === m.properties.id);
                          if (matchingHotspot) setSelectedHotspot(matchingHotspot);
                        }
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                        <div className="text-xs p-1">
                          <strong className="text-slate-900 block font-bold">{m.properties.name}</strong>
                          <span className="text-slate-600">{m.properties.code} • {m.properties.state}</span>
                        </div>
                      </Tooltip>
                    </Marker>
                  );
                })}

                {/* Inspection Markers */}
                {inspectionsList.map(insp => {
                  const lat = insp.geometry?.coordinates?.[1];
                  const lng = insp.geometry?.coordinates?.[0];
                  if (!lat || !lng) return null;
                  const isSelected = selectedInspection?.properties.id === insp.properties.id && !selectedHotspot;

                  return (
                    <Marker
                      key={`insp-${insp.properties.id}`}
                      position={[lat, lng]}
                      icon={createInspectionIcon(isSelected, insp.properties.risk_level)}
                      eventHandlers={{
                        click: () => {
                          setSelectedInspection(insp);
                          setSelectedHotspot(null);
                        }
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                        <div className="text-xs p-1">
                          <strong className="text-slate-900 block font-bold">{insp.properties.inspection_number}</strong>
                          <span className="text-slate-600">{insp.properties.mine_name} • Score: {insp.properties.compliance_score}%</span>
                        </div>
                      </Tooltip>
                    </Marker>
                  );
                })}

                {/* Finding Hotspot Markers */}
                {filteredHotspots.map(h => {
                  const lat = h.geometry?.coordinates?.[1];
                  const lng = h.geometry?.coordinates?.[0];
                  if (!lat || !lng) return null;
                  const isSelected = selectedHotspot?.properties.id === h.properties.id;

                  return (
                    <Marker
                      key={`hs-${h.properties.id}`}
                      position={[lat, lng]}
                      icon={createHotspotIcon(
                        h.properties.severity,
                        h.properties.status,
                        h.properties.is_recurring,
                        isSelected
                      )}
                      eventHandlers={{
                        click: () => {
                          setSelectedHotspot(h);
                          setSelectedInspection(null);
                        }
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                        <div className="text-xs p-1">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${h.properties.severity === 'CRITICAL' || h.properties.severity === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'}`} />
                            {h.properties.finding_title}
                          </div>
                          <div className="text-slate-600 text-[10px] mt-0.5">
                            {h.properties.mine_name} • {h.properties.severity} {h.properties.is_recurring ? ' • RECURRING' : ''}
                          </div>
                        </div>
                      </Tooltip>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Legend overlay */}
              <div className="absolute bottom-3 left-3 bg-white/95 border border-slate-200 rounded-xl p-3 backdrop-blur-md text-xs space-y-1.5 shadow-lg z-[1000] pointer-events-auto">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Spatial Hotspot Legend</div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span>Critical / High Severity Hazard</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Medium Severity Finding</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>Resolved / Mitigated Action</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                  <span>Recurring Finding Escaped Mitigation</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-md bg-slate-900" />
                  <span>Mine Facility Anchor</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-600" />
                  <span>Inspection Audit Point</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Dossier Panel */}
        <div className="space-y-4">
          <SectionCard
            title={selectedHotspot ? 'Linked Inspection & Hazard Dossier' : selectedInspection ? 'Inspection Overview' : 'Select a Finding'}
            icon={<ShieldAlert size={16} className="text-amber-500" />}
          >
            {selectedHotspot ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-500 text-[10px] font-semibold">
                      {selectedHotspot.properties.violation_code || selectedHotspot.properties.id.slice(0, 8)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={selectedHotspot.properties.severity} />
                      <StatusBadge status={selectedHotspot.properties.status} />
                      {selectedHotspot.properties.is_recurring && (
                        <span className="px-1.5 py-0.5 bg-violet-50 text-violet-800 border border-violet-200 rounded text-[9px] font-bold">
                          RECURRING
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-slate-900 font-bold text-sm leading-snug">{selectedHotspot.properties.finding_title}</div>
                  <div className="text-slate-600 text-[11px]">📍 Mine: <strong className="text-slate-900">{selectedHotspot.properties.mine_name}</strong></div>
                  {selectedHotspot.properties.location_tag && (
                    <div className="text-slate-600 text-[11px]">🏷️ Location: <span className="text-slate-700">{selectedHotspot.properties.location_tag}</span></div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Field Inspector</span>
                    <div className="text-slate-900 font-semibold mt-0.5">{selectedHotspot.properties.inspector_name || '—'}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Inspection Date</span>
                    <div className="text-slate-900 font-semibold mt-0.5">{formatDate(selectedHotspot.properties.inspection_date || selectedHotspot.properties.created_at)}</div>
                  </div>
                </div>

                {selectedHotspot.properties.is_recurring && selectedHotspot.properties.recurrence_count && selectedHotspot.properties.recurrence_count > 1 && (
                  <div className="p-2.5 bg-violet-50 border border-violet-200 rounded-xl">
                    <div className="text-violet-800 font-bold text-[11px] flex items-center gap-1">
                      <RotateCcw size={12} /> Recurring Hazard Pattern
                    </div>
                    <div className="text-slate-700 text-[10px] mt-1">
                      This finding has been recorded <strong className="text-violet-800">{selectedHotspot.properties.recurrence_count}x</strong> across inspections — escalation recommended.
                    </div>
                  </div>
                )}

                {selectedHotspot.properties.regulation_reference && (
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-slate-500 text-[10px] uppercase font-semibold">DGMS Statutory Reference</div>
                    <div className="text-indigo-600 font-mono text-[11px] font-semibold">{selectedHotspot.properties.regulation_reference}</div>
                    {selectedHotspot.properties.description && (
                      <div className="text-slate-700 text-[11px] mt-1 pt-1 border-t border-slate-200 leading-relaxed">
                        {selectedHotspot.properties.description}
                      </div>
                    )}
                  </div>
                )}

                {selectedHotspot.properties.evidence_photos && selectedHotspot.properties.evidence_photos.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-slate-600 font-semibold text-[11px] flex items-center gap-1.5">
                      <Camera size={13} className="text-amber-500" />
                      <span>Geotagged On-Site Photographic Evidence ({selectedHotspot.properties.evidence_photos.length})</span>
                    </div>
                    {selectedHotspot.properties.evidence_photos.map((ev, idx) => (
                      <div key={ev.id || idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                        <div className="font-semibold text-slate-900 text-[11px]">{ev.caption}</div>
                        <div className="text-slate-500 font-mono text-[10px]">GPS: {ev.latitude?.toFixed(4)}° N, {ev.longitude?.toFixed(4)}° E</div>
                        <div className="text-slate-500 text-[9px]">Captured: {formatDateTime(ev.captured_at)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedHotspot.properties.linked_capa && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-800 font-bold text-[11px] flex items-center gap-1">
                        <Wrench size={12} /> Linked CAPA Directive
                      </span>
                      <StatusBadge status={selectedHotspot.properties.linked_capa.status} />
                    </div>
                    <div className="font-semibold text-slate-900 text-[11px]">{selectedHotspot.properties.linked_capa.title}</div>
                    {selectedHotspot.properties.linked_capa.assigned_to && (
                      <div className="text-slate-600 text-[10px]">
                        Assigned to: <strong className="text-slate-700">{selectedHotspot.properties.linked_capa.assigned_to}</strong>
                      </div>
                    )}
                    <div className="text-slate-600 text-[10px]">
                      Deadline: <strong>{formatDate(selectedHotspot.properties.linked_capa.due_date)}</strong>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                  <button onClick={() => navigate('/inspections')} className="w-full btn-secondary text-xs py-2 rounded-lg flex items-center justify-center gap-1.5">
                    <ExternalLink size={13} /> View Full Inspection Audit
                  </button>
                  <button onClick={() => navigate('/corrective-actions')} className="w-full btn-primary text-xs py-2 rounded-lg flex items-center justify-center gap-1.5">
                    <Wrench size={13} /> View / Resolve Corrective Actions
                  </button>
                </div>
              </div>

            ) : selectedInspection ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-amber-600 text-[10px] font-bold">{selectedInspection.properties.inspection_number}</span>
                    <StatusBadge status={selectedInspection.properties.risk_level} />
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{selectedInspection.properties.mine_name}</div>
                  <div className="text-slate-600 text-[11px]">{selectedInspection.properties.inspection_type}</div>
                  {selectedInspection.properties.location_tag && (
                    <div className="text-slate-500 text-[10px]">📍 {selectedInspection.properties.location_tag}</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Compliance Score</span>
                    <div className="text-emerald-600 font-bold text-sm mt-0.5">{selectedInspection.properties.compliance_score}%</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Inspection Date</span>
                    <div className="text-slate-900 font-semibold mt-0.5">{formatDate(selectedInspection.properties.inspection_date)}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Violations</span>
                    <div className="text-red-500 font-bold text-sm mt-0.5">{selectedInspection.properties.violations_count}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Photo Evidence</span>
                    <div className="text-teal-600 font-bold text-sm mt-0.5">{selectedInspection.properties.evidence_count}</div>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                  <div>LAT: {selectedInspection.geometry.coordinates[1]?.toFixed(6)}° N</div>
                  <div>LNG: {selectedInspection.geometry.coordinates[0]?.toFixed(6)}° E</div>
                  <div>STAGE: {selectedInspection.properties.workflow_stage}</div>
                </div>
                <button onClick={() => navigate('/inspections')} className="w-full btn-primary text-xs py-2 rounded-lg">
                  Open Inspection Record →
                </button>
              </div>

            ) : (
              <div className="text-slate-500 text-center py-10">
                Click any finding hotspot pin on the map to inspect the linked field inspection, geo-tagged photographic evidence, and CAPA directive.
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
