import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer, TileLayer, Marker, Popup, Tooltip, useMap
} from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Building2, AlertTriangle, ShieldCheck, Filter, Layers,
  Flame, CheckCircle2, Camera, FileText, Wrench, RefreshCw, ExternalLink,
  ShieldAlert, Clock, Compass, Maximize2
} from 'lucide-react';
import { gis as gisApi } from '../services/api';
import { SectionCard, StatusBadge, KPICard } from '../components/ui/UIComponents';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatDateTime } from '../utils/helpers';

// ---------------------------------------------------------------------------
// Basemap Options (Zero-Secret-Key Required)
// ---------------------------------------------------------------------------
const BASEMAP_TILES = {
  osm: {
    name: 'OpenStreetMap (OSM)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  topo: {
    name: 'World Street / Topo (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
  imagery: {
    name: 'Satellite (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18,
  },
};

// ---------------------------------------------------------------------------
// Custom Leaflet Icons for Contractor Portal
// ---------------------------------------------------------------------------
function createContractorMineIcon(statusColor: 'GREEN' | 'ORANGE' | 'RED', isSelected: boolean) {
  const bg = statusColor === 'RED' ? '#b91c1c' : statusColor === 'ORANGE' ? '#d97706' : '#059669';

  return L.divIcon({
    className: 'leaflet-contractor-mine-marker',
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        ${statusColor === 'RED' ? `<div style="position: absolute; inset: -4px; border-radius: 10px; background: rgba(185, 28, 28, 0.4); animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
        <div style="
          width: ${isSelected ? '36px' : '30px'};
          height: ${isSelected ? '36px' : '30px'};
          background: ${bg};
          border: 2.5px solid #ffffff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3);
          transform: rotate(45deg);
          transition: all 0.2s;
        ">
          <svg style="transform: rotate(-45deg); width: 15px; height: 15px; fill: #ffffff;" viewBox="0 0 24 24">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
}

function createContractorHotspotIcon(severity: string, status: string, isSelected: boolean) {
  const isResolved = status === 'RESOLVED' || status === 'CLOSED';
  const isCrit = severity === 'CRITICAL' || severity === 'HIGH';
  const color = isResolved ? '#059669' : isCrit ? '#dc2626' : '#0d9488';

  return L.divIcon({
    className: 'leaflet-contractor-hotspot-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        ${(isCrit || isSelected) && !isResolved ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; background: ${color}; opacity: 0.5; animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
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
// Map Controller
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
  const [activeBasemap, setActiveBasemap]   = useState<'osm' | 'topo' | 'imagery'>('osm');

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

  const selectedCoords = useMemo<[number, number] | null>(() => {
    if (selectedHotspot?.geometry?.coordinates?.[1] && selectedHotspot?.geometry?.coordinates?.[0]) {
      return [selectedHotspot.geometry.coordinates[1], selectedHotspot.geometry.coordinates[0]];
    }
    if (selectedMine?.geometry?.coordinates?.[1] && selectedMine?.geometry?.coordinates?.[0]) {
      return [selectedMine.geometry.coordinates[1], selectedMine.geometry.coordinates[0]];
    }
    return null;
  }, [selectedHotspot, selectedMine]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wide">
              Contractor GIS Portal
            </span>
            {user?.contractor_name && <span className="text-xs text-slate-600 font-medium">🏭 {user.contractor_name}</span>}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5 mt-1">
            <span className="p-2 rounded-xl bg-teal-100 text-teal-800"><MapPin size={22} /></span>
            CONTRACT COMPLIANCE GIS
          </h1>
          <p className="text-slate-600 text-xs mt-0.5">
            Geospatial tracking of mine site compliance, open violation hotspots, active contracts, and overdue corrective action directives.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
            {(['all','high_risk','open','resolved'] as const).map((layer) => (
              <button key={layer} onClick={() => setActiveLayer(layer)}
                className={`px-3 py-1 rounded-md transition-colors ${activeLayer === layer
                  ? layer === 'high_risk' ? 'bg-red-600 text-white font-semibold shadow-sm'
                  : layer === 'open'      ? 'bg-amber-600 text-white font-semibold shadow-sm'
                  : layer === 'resolved'  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  :                         'bg-teal-600 text-white font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'}`}>
                {layer === 'all' ? `All Findings (${hotspotsList.length})` : layer === 'high_risk' ? `Critical / High (${criticalCount})` : layer === 'open' ? `Open (${openCount})` : `Resolved (${resolvedCount})`}
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
        <KPICard label="Contract Mines"    value={summary.total_mines}      icon={<Building2    size={18} className="text-teal-600"   />} iconBg="bg-teal-500/10"   />
        <KPICard label="Compliant Mines"   value={summary.compliant_mines}  icon={<ShieldCheck  size={18} className="text-emerald-600"/>} iconBg="bg-emerald-500/10"/>
        <KPICard label="Attention Mines"   value={summary.attention_mines}  icon={<AlertTriangle size={18} className="text-amber-500" />} iconBg="bg-amber-500/10"  />
        <KPICard label="Open Violations"   value={summary.open_violations}  icon={<Flame        size={18} className="text-red-500"    />} iconBg="bg-red-500/10"    />
        <KPICard label="Overdue CAPAs"     value={summary.overdue_capas}    icon={<Clock        size={18} className="text-rose-500"   />} iconBg="bg-rose-500/10"   onClick={() => navigate('/corrective-actions')} />
        <KPICard label="Active Contracts"  value={summary.total_contracts}  icon={<FileText     size={18} className="text-sky-500"    />} iconBg="bg-sky-500/10"    />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs shadow-sm">
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Filter size={14} className="text-slate-500" />
          <span className="text-slate-700 font-semibold">Scope Filter:</span>
          <select value={filterMine} onChange={e => setFilterMine(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500 shadow-sm">
            <option value="ALL">All Active Contract Mines ({minesList.length})</option>
            {minesList.map(m => <option key={m.properties.id} value={m.properties.id}>{m.properties.mine_name} ({m.properties.mine_code})</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500 shadow-sm">
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option><option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500 shadow-sm">
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Only</option><option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved / Closed</option>
          </select>
          <select value={filterCapa} onChange={e => setFilterCapa(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500 shadow-sm">
            <option value="ALL">All CAPA States</option>
            <option value="ASSIGNED">Assigned</option><option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <button onClick={() => { setFilterMine('ALL'); setFilterSeverity('ALL'); setFilterStatus('ALL'); setFilterCapa('ALL'); }}
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
                <Layers size={14} className="text-teal-600" />
                <span>Contractor Compliance Geographic Map ({filteredHotspots.length} Plotted Points)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] border border-slate-200">
                  {(['osm', 'topo', 'imagery'] as const).map(bm => (
                    <button
                      key={bm}
                      onClick={() => setActiveBasemap(bm)}
                      className={`px-2 py-0.5 rounded font-medium transition-colors ${
                        activeBasemap === bm
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {bm === 'osm' ? 'OSM' : bm === 'topo' ? 'World Topo' : 'Satellite'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                  <Compass size={12} className="text-teal-600" />
                  <span>WGS 84</span>
                </div>
              </div>
            </div>

            <div className="relative w-full h-[560px] rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
                  <div className="text-center text-slate-600">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading Contractor GIS Hotspots &amp; Spatial Coordinates...</span>
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

                {/* Mines with active contracts */}
                {minesList.map(m => {
                  const lat = m.geometry?.coordinates?.[1];
                  const lng = m.geometry?.coordinates?.[0];
                  if (!lat || !lng) return null;
                  const isSelected = selectedMine?.properties.id === m.properties.id && !selectedHotspot;

                  return (
                    <Marker
                      key={`mine-${m.properties.id}`}
                      position={[lat, lng]}
                      icon={createContractorMineIcon(m.properties.status_color, isSelected)}
                      eventHandlers={{
                        click: () => {
                          setSelectedMine(m);
                          setSelectedHotspot(null);
                        }
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                        <div className="text-xs p-1">
                          <strong className="text-slate-900 block font-bold">{m.properties.mine_name}</strong>
                          <span className="text-slate-600">{m.properties.mine_code} • {m.properties.compliance_percentage}% compliant</span>
                        </div>
                      </Tooltip>
                    </Marker>
                  );
                })}

                {/* Hotspots */}
                {filteredHotspots.map(h => {
                  const lat = h.geometry?.coordinates?.[1];
                  const lng = h.geometry?.coordinates?.[0];
                  if (!lat || !lng) return null;
                  const isSelected = selectedHotspot?.properties.id === h.properties.id;

                  return (
                    <Marker
                      key={`hs-${h.properties.id}`}
                      position={[lat, lng]}
                      icon={createContractorHotspotIcon(
                        h.properties.severity,
                        h.properties.status,
                        isSelected
                      )}
                      eventHandlers={{
                        click: () => {
                          setSelectedHotspot(h);
                          setSelectedMine(null);
                        }
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                        <div className="text-xs p-1">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${h.properties.severity === 'CRITICAL' || h.properties.severity === 'HIGH' ? 'bg-red-500' : 'bg-teal-500'}`} />
                            {h.properties.hazard_title}
                          </div>
                          <div className="text-slate-600 text-[10px] mt-0.5">
                            {h.properties.mine_name} • {h.properties.severity} • {h.properties.status}
                          </div>
                        </div>
                      </Tooltip>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Legend overlay */}
              <div className="absolute bottom-3 left-3 bg-white/95 border border-slate-200 rounded-xl p-3 backdrop-blur-md text-xs space-y-1.5 shadow-lg z-[1000] pointer-events-auto">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contractor Map Legend</div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span>Critical / High Severity Violation</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <span>Standard Violation Finding</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>Resolved / Mitigated Finding</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-md bg-emerald-600" />
                  <span>Compliant Mine Facility (&ge; 85%)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-md bg-amber-500" />
                  <span>Attention Mine Facility (70-84%)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-md bg-red-600 animate-pulse" />
                  <span>Critical Risk Facility (&lt; 70%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Dossier */}
        <div className="space-y-4">
          <SectionCard
            title={selectedHotspot ? 'Linked Compliance & Contract Dossier' : selectedMine ? 'Mine & Contract Overview' : 'Select a Hotspot'}
            icon={<ShieldAlert size={16} className="text-teal-600" />}
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
                    </div>
                  </div>
                  <div className="text-slate-900 font-bold text-sm leading-snug">{selectedHotspot.properties.hazard_title}</div>
                  <div className="text-slate-600 text-[11px]">📍 Mine: <strong className="text-slate-900">{selectedHotspot.properties.mine_name}</strong></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Inspection Ref</span>
                    <div className="text-slate-900 font-semibold mt-0.5 font-mono text-[10px]">{selectedHotspot.properties.inspection_number || '—'}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Inspection Date</span>
                    <div className="text-slate-900 font-semibold mt-0.5">{formatDate(selectedHotspot.properties.inspection_date || selectedHotspot.properties.created_at)}</div>
                  </div>
                </div>

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
                      <Camera size={13} className="text-teal-600" />
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
                  <div className={`p-3 rounded-xl space-y-1.5 border ${selectedHotspot.properties.linked_capa.is_overdue ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-[11px] flex items-center gap-1 ${selectedHotspot.properties.linked_capa.is_overdue ? 'text-red-700' : 'text-amber-700'}`}>
                        <Wrench size={12} /> Linked CAPA Directive
                        {selectedHotspot.properties.linked_capa.is_overdue && (
                          <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded text-[9px] font-bold">
                            OVERDUE
                          </span>
                        )}
                      </span>
                      <StatusBadge status={selectedHotspot.properties.linked_capa.status} />
                    </div>
                    <div className="font-semibold text-slate-900 text-[11px]">{selectedHotspot.properties.linked_capa.title}</div>
                    <div className="text-slate-600 text-[10px]">
                      Deadline: <strong className={selectedHotspot.properties.linked_capa.is_overdue ? 'text-red-600 font-bold' : ''}>{formatDate(selectedHotspot.properties.linked_capa.due_date)}</strong>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                  <button onClick={() => navigate('/violations')} className="w-full btn-secondary text-xs py-2 rounded-lg flex items-center justify-center gap-1.5">
                    <ExternalLink size={13} /> View Full Violation Record
                  </button>
                  <button onClick={() => navigate('/corrective-actions')} className="w-full btn-primary text-xs py-2 rounded-lg flex items-center justify-center gap-1.5">
                    <Wrench size={13} /> Submit CAPA Resolution Proof
                  </button>
                </div>
              </div>

            ) : selectedMine ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-teal-700 text-[10px] font-bold">{selectedMine.properties.mine_code}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selectedMine.properties.status_color === 'RED' ? 'bg-red-50 text-red-700 border-red-200' : selectedMine.properties.status_color === 'ORANGE' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {selectedMine.properties.risk_status}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{selectedMine.properties.mine_name}</div>
                  <div className="text-slate-600 text-[11px]">{selectedMine.properties.subsidiary}</div>
                  <div className="text-slate-500 text-[10px]">{selectedMine.properties.district}, {selectedMine.properties.state}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Compliance Score</span>
                    <div className="text-emerald-600 font-bold text-sm mt-0.5">{selectedMine.properties.compliance_percentage}%</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Active Contracts</span>
                    <div className="text-teal-600 font-bold text-sm mt-0.5">{selectedMine.properties.active_contract_count}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Open Violations</span>
                    <div className="text-red-500 font-bold text-sm mt-0.5">{selectedMine.properties.open_violations}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px]">Overdue CAPAs</span>
                    <div className="text-rose-500 font-bold text-sm mt-0.5">{selectedMine.properties.overdue_capas}</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                  <div>LAT: {selectedMine.geometry.coordinates[1].toFixed(6)}° N</div>
                  <div>LNG: {selectedMine.geometry.coordinates[0].toFixed(6)}° E</div>
                  <div>BOUNDARY: Active Mine Sector</div>
                </div>

                {selectedMine.properties.warnings?.length > 0 && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl space-y-1">
                    <div className="text-red-700 font-bold text-[10px] flex items-center gap-1">
                      <ShieldAlert size={12} /> Compliance Attention Required
                    </div>
                    {selectedMine.properties.warnings.map((w, i) => (
                      <div key={i} className="text-slate-700 text-[10px] flex items-start gap-1">
                        <span>•</span><span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedMine.properties.active_contracts?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-slate-600 font-semibold text-[11px] flex items-center gap-1">
                      <FileText size={12} className="text-teal-600" /> Active Contracts
                    </div>
                    {selectedMine.properties.active_contracts.slice(0, 3).map(c => (
                      <div key={c.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{c.title}</span>
                          {c.value_inr_crores && <span className="text-teal-600 font-mono text-[10px]">₹{c.value_inr_crores} Cr</span>}
                        </div>
                        <div className="text-slate-600 font-mono text-[10px]">{c.contract_number}</div>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => navigate('/corrective-actions')} className="w-full btn-primary text-xs py-2 rounded-lg">
                  View CAPA Actions for This Mine →
                </button>
              </div>

            ) : (
              <div className="text-slate-500 text-center py-10">
                Click any hazard hotspot pin on the map to inspect the linked contractor compliance record, photographic evidence, and CAPA directive.
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
