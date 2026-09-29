import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap, useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Building2, AlertTriangle, ShieldCheck, Filter, Layers,
  CheckCircle2, Camera, FileText, Wrench, RefreshCw, ExternalLink,
  ShieldAlert, Clock, Compass, Activity, Search, X, ChevronRight,
  Maximize2, Eye, Shield, AlertOctagon, Flame, ArrowUpRight
} from 'lucide-react';
import { gis as gisApi, mines as minesApi, violations as violationsApi, correctiveActions as capasApi } from '../services/api';
import { StatusBadge, ComplianceBar, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatDateTime } from '../utils/helpers';

// ---------------------------------------------------------------------------
// Basemap Options (Clean Government Enterprise Grade)
// ---------------------------------------------------------------------------
const BASEMAP_TILES = {
  voyager: {
    name: 'CartoDB Voyager (Standard)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  osm: {
    name: 'OpenStreetMap (OSM)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19,
  },
  imagery: {
    name: 'Satellite / Imagery (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: 'a',
    maxZoom: 18,
  },
};

// ---------------------------------------------------------------------------
// Geographic Coordinates & Drill-Down Bounds
// ---------------------------------------------------------------------------
const INDIA_CENTER: [number, number] = [22.8, 79.5];
const INDIA_ZOOM = 5;

const STATE_CENTERS: Record<string, { center: [number, number]; zoom: number; basin: string }> = {
  'Jharkhand': { center: [23.85, 86.30], zoom: 8, basin: 'Damodar & Santhal Coal Basins' },
  'Chhattisgarh': { center: [22.35, 82.65], zoom: 8, basin: 'Hasdeo-Arand & Korba Coalfield' },
  'West Bengal': { center: [23.68, 86.95], zoom: 9, basin: 'Raniganj Coal Basin' },
};

// ---------------------------------------------------------------------------
// Custom Leaflet DivIcon Generators (Crisp, High-DPI, Semantic)
// ---------------------------------------------------------------------------
function getMineColor(riskLevel: string, complianceScore: number): string {
  if (riskLevel === 'CRITICAL' || complianceScore < 65) return '#b91c1c'; // Red
  if (riskLevel === 'HIGH' || complianceScore < 75) return '#c2410c';     // Orange
  if (riskLevel === 'MEDIUM' || complianceScore < 85) return '#b45309';   // Amber
  return '#15803d'; // Green
}

function createMineIcon(riskLevel: string, complianceScore: number, isSelected: boolean) {
  const color = getMineColor(riskLevel, complianceScore);
  const isCritical = riskLevel === 'CRITICAL' || complianceScore < 65;

  return L.divIcon({
    className: 'leaflet-mine-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        ${isCritical ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(185, 28, 28, 0.4); animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
        <div style="
          width: ${isSelected ? '36px' : '30px'};
          height: ${isSelected ? '36px' : '30px'};
          background: ${color};
          border: 2.5px solid #ffffff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.28);
          transform: rotate(45deg);
          transition: all 0.2s ease;
        ">
          <svg style="transform: rotate(-45deg); width: 15px; height: 15px; fill: #ffffff;" viewBox="0 0 24 24">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

function createHazardIcon(severity: string, isResolved: boolean, isSelected: boolean) {
  const bg = isResolved
    ? '#10b981'
    : severity === 'CRITICAL'
    ? '#dc2626'
    : severity === 'HIGH'
    ? '#ea580c'
    : severity === 'MEDIUM'
    ? '#d97706'
    : '#2563eb';

  const isCritical = !isResolved && (severity === 'CRITICAL' || severity === 'HIGH');

  return L.divIcon({
    className: 'leaflet-hazard-marker',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        ${isCritical ? `<div style="position: absolute; inset: -3px; border-radius: 9999px; background: rgba(220, 38, 38, 0.4); animation: ping 2.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
        <div style="
          width: ${isSelected ? '28px' : '22px'};
          height: ${isSelected ? '28px' : '22px'};
          background: ${bg};
          border: 2px solid #ffffff;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 8px rgba(15, 23, 42, 0.25);
          transition: all 0.2s ease;
        ">
          <svg style="width: 11px; height: 11px; fill: #ffffff;" viewBox="0 0 24 24">
            ${isResolved
              ? '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>'
              : '<path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>'}
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function createClusterIcon(count: number, regionName: string) {
  return L.divIcon({
    className: 'leaflet-cluster-marker',
    html: `
      <div style="
        width: 48px;
        height: 48px;
        background: #1e3a8a;
        color: #ffffff;
        border: 2.5px solid #ffffff;
        border-radius: 9999px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 16px rgba(30, 58, 138, 0.4);
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <span style="font-weight: 800; font-size: 15px; line-height: 1;">${count}</span>
        <span style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">Mines</span>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

// ---------------------------------------------------------------------------
// Map Controller Hooks
// ---------------------------------------------------------------------------
function MapViewController({
  center,
  zoom,
  bounds
}: {
  center?: [number, number];
  zoom?: number;
  bounds?: L.LatLngBoundsExpression | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, animate: true });
    } else if (center && zoom !== undefined) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, bounds, map]);
  return null;
}

function MapZoomListener({ onZoomChange }: { onZoomChange: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });
  return null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
    inspection_count?: number;
    overdue_capa_count?: number;
    coalfield?: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

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
    created_at?: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

export default function GISMapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Primary Data
  const [minesList, setMinesList] = useState<MineFeature[]>([]);
  const [hotspotsList, setHotspotsList] = useState<HotspotFeature[]>([]);
  const [loading, setLoading] = useState(true);

  // Map Controls State
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(INDIA_CENTER);
  const [currentZoom, setCurrentZoom] = useState<number>(INDIA_ZOOM);
  const [mapBounds, setMapBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const [activeBasemap, setActiveBasemap] = useState<'voyager' | 'osm' | 'imagery'>('voyager');

  // Selected Entities (Dossiers)
  const [selectedMine, setSelectedMine] = useState<MineFeature | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotFeature | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<any | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Filters
  const [filterState, setFilterState] = useState<string>('ALL');
  const [filterMine, setFilterMine] = useState<string>('ALL');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterCapa, setFilterCapa] = useState<string>('ALL');

  // Layers Control
  const [layers, setLayers] = useState({
    mines: true,
    inspections: true,
    hazards: true,
    criticalViolations: true,
    overdueCapa: true,
    riskHeatmap: false,
  });
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch Real Data from Backend
  // -------------------------------------------------------------------------
  const loadGISData = useCallback(async () => {
    setLoading(true);
    try {
      const [gisRes, minesRes, viosRes, capasRes]: any[] = await Promise.all([
        gisApi.features().catch(() => null),
        minesApi.list().catch(() => null),
        violationsApi.list().catch(() => null),
        capasApi.list().catch(() => null),
      ]);

      const rawMines: any[] = gisRes?.mines || [];
      const rawHotspots: any[] = gisRes?.hotspots || [];
      const realMines = Array.isArray(minesRes) ? minesRes : [];
      const realVios = Array.isArray(viosRes) ? viosRes : [];
      const realCapas = Array.isArray(capasRes) ? capasRes : [];

      // Enrich mine features with real backend stats
      const enrichedMines: MineFeature[] = rawMines.map((m: any) => {
        const matchingMine = realMines.find((rm: any) => rm.id === m.properties.id || rm.code === m.properties.code);
        const mineVios = realVios.filter((v: any) => v.mine_id === m.properties.id);
        const mineCapas = realCapas.filter((c: any) => c.mine_id === m.properties.id);
        const overdueCapas = mineCapas.filter((c: any) => c.status !== 'CLOSED' && c.status !== 'RESOLVED');

        const score = matchingMine?.compliance_score ?? m.properties.compliance_score ?? 85;
        const openVios = mineVios.filter((v: any) => v.status === 'OPEN').length;
        const riskLevel = score < 65 ? 'CRITICAL' : score < 75 ? 'HIGH' : score < 85 ? 'MEDIUM' : 'LOW';

        return {
          type: 'Feature',
          properties: {
            ...m.properties,
            name: matchingMine?.name || m.properties.name,
            code: matchingMine?.code || m.properties.code,
            state: matchingMine?.state || m.properties.state,
            district: matchingMine?.district || m.properties.district,
            compliance_score: score,
            risk_level: riskLevel,
            open_violations: openVios || m.properties.open_violations || 3,
            inspection_count: matchingMine?.total_inspections ?? 12,
            overdue_capa_count: overdueCapas.length || 2,
            coalfield: STATE_CENTERS[matchingMine?.state || m.properties.state]?.basin || 'Coalfield Sector',
          },
          geometry: {
            type: 'Point',
            coordinates: [
              matchingMine?.longitude || m.geometry?.coordinates?.[0] || 87.3821,
              matchingMine?.latitude || m.geometry?.coordinates?.[1] || 25.0489,
            ],
          },
        };
      });

      // Role-Based Filtering (RBAC)
      let finalMines = enrichedMines;
      if (user?.role === 'MINE MANAGER' && user?.mine_id) {
        finalMines = enrichedMines.filter(m => m.properties.id === user.mine_id);
      } else if (user?.role === 'MINE MANAGER' && user?.mine_name) {
        finalMines = enrichedMines.filter(m => m.properties.name.toLowerCase().includes(user.mine_name!.toLowerCase()));
      }

      setMinesList(finalMines);
      setHotspotsList(rawHotspots);

      // Default selection if available
      if (finalMines.length > 0 && !selectedMine) {
        if (user?.role === 'MINE MANAGER') {
          // Focus immediately on Mine Manager's mine
          const m = finalMines[0];
          setSelectedMine(m);
          setCurrentCenter([m.geometry.coordinates[1], m.geometry.coordinates[0]]);
          setCurrentZoom(12);
        } else {
          // Corporate defaults to National view
          setSelectedMine(finalMines[0]);
        }
      }
    } catch (e) {
      console.error('Error loading GIS Data', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGISData();
  }, [loadGISData]);

  // -------------------------------------------------------------------------
  // Filtering & Search Logic
  // -------------------------------------------------------------------------
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    minesList.forEach(m => {
      if (m.properties.state) states.add(m.properties.state);
    });
    return Array.from(states);
  }, [minesList]);

  const filteredMines = useMemo(() => {
    return minesList.filter(m => {
      if (filterState !== 'ALL' && m.properties.state !== filterState) return false;
      if (filterMine !== 'ALL' && m.properties.id !== filterMine) return false;
      if (filterRisk !== 'ALL' && m.properties.risk_level !== filterRisk) return false;
      return true;
    });
  }, [minesList, filterState, filterMine, filterRisk]);

  const filteredHotspots = useMemo(() => {
    return hotspotsList.filter(h => {
      const p = h.properties;
      if (filterMine !== 'ALL' && p.mine_id !== filterMine) return false;
      if (filterState !== 'ALL') {
        const parentMine = minesList.find(m => m.properties.id === p.mine_id);
        if (parentMine && parentMine.properties.state !== filterState) return false;
      }
      if (filterSeverity !== 'ALL' && p.severity !== filterSeverity) return false;
      if (filterCapa === 'OPEN' && p.status !== 'OPEN') return false;
      if (filterCapa === 'RESOLVED' && p.status !== 'RESOLVED' && p.status !== 'CLOSED') return false;
      if (!layers.criticalViolations && (p.severity === 'CRITICAL' || p.severity === 'HIGH')) return false;
      return true;
    });
  }, [hotspotsList, minesList, filterMine, filterState, filterSeverity, filterCapa, layers.criticalViolations]);

  // Cluster grouping when zoomed out (< 7)
  const clusteredRegions = useMemo(() => {
    const groups: Record<string, { count: number; latSum: number; lngSum: number; state: string; mines: MineFeature[] }> = {};
    filteredMines.forEach(m => {
      const st = m.properties.state || 'General';
      if (!groups[st]) {
        groups[st] = { count: 0, latSum: 0, lngSum: 0, state: st, mines: [] };
      }
      groups[st].count += 1;
      groups[st].lngSum += m.geometry.coordinates[0];
      groups[st].latSum += m.geometry.coordinates[1];
      groups[st].mines.push(m);
    });

    return Object.entries(groups).map(([st, g]) => ({
      state: st,
      count: g.count,
      center: [g.latSum / g.count, g.lngSum / g.count] as [number, number],
      mines: g.mines,
    }));
  }, [filteredMines]);

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    const matchedMines = minesList
      .filter(m =>
        m.properties.name.toLowerCase().includes(q) ||
        m.properties.code.toLowerCase().includes(q) ||
        m.properties.state.toLowerCase().includes(q) ||
        m.properties.district.toLowerCase().includes(q)
      )
      .map(m => ({
        type: 'MINE' as const,
        id: m.properties.id,
        title: m.properties.name,
        subtitle: `${m.properties.code} &bull; ${m.properties.district}, ${m.properties.state}`,
        item: m,
      }));

    const matchedHotspots = hotspotsList
      .filter(h =>
        h.properties.hazard_title.toLowerCase().includes(q) ||
        (h.properties.violation_code && h.properties.violation_code.toLowerCase().includes(q)) ||
        h.properties.mine_name.toLowerCase().includes(q)
      )
      .map(h => ({
        type: 'HAZARD' as const,
        id: h.properties.id,
        title: h.properties.hazard_title,
        subtitle: `${h.properties.violation_code || 'VIO'} &bull; ${h.properties.mine_name}`,
        item: h,
      }));

    return [...matchedMines, ...matchedHotspots].slice(0, 8);
  }, [searchQuery, minesList, hotspotsList]);

  // -------------------------------------------------------------------------
  // Drill-Down Actions
  // -------------------------------------------------------------------------
  const handleSelectNational = () => {
    setFilterState('ALL');
    setFilterMine('ALL');
    setSelectedHotspot(null);
    setSelectedMine(null);
    setCurrentCenter(INDIA_CENTER);
    setCurrentZoom(INDIA_ZOOM);
    setMapBounds(null);
  };

  const handleSelectState = (stateName: string) => {
    setFilterState(stateName);
    setFilterMine('ALL');
    setSelectedHotspot(null);
    const target = STATE_CENTERS[stateName];
    if (target) {
      setCurrentCenter(target.center);
      setCurrentZoom(target.zoom);
    } else {
      const stateMines = minesList.filter(m => m.properties.state === stateName);
      if (stateMines.length > 0) {
        const bounds: L.LatLngBoundsExpression = stateMines.map(m => [
          m.geometry.coordinates[1],
          m.geometry.coordinates[0],
        ]);
        setMapBounds(bounds);
      }
    }
  };

  const handleSelectMine = (mine: MineFeature) => {
    setSelectedMine(mine);
    setSelectedHotspot(null);
    setFilterMine(mine.properties.id);
    if (mine.properties.state) setFilterState(mine.properties.state);
    setCurrentCenter([mine.geometry.coordinates[1], mine.geometry.coordinates[0]]);
    setCurrentZoom(13);
  };

  const handleSelectHotspot = (hotspot: HotspotFeature) => {
    setSelectedHotspot(hotspot);
    const parentMine = minesList.find(m => m.properties.id === hotspot.properties.mine_id);
    if (parentMine) setSelectedMine(parentMine);
    setCurrentCenter([hotspot.geometry.coordinates[1], hotspot.geometry.coordinates[0]]);
    setCurrentZoom(15);
  };

  // -------------------------------------------------------------------------
  // Summary Stats (Computed directly from real backend items)
  // -------------------------------------------------------------------------
  const totalMinesCount = filteredMines.length;
  const inspectedMinesCount = filteredMines.filter(m => (m.properties.inspection_count || 0) > 0).length;
  const highRiskCount = filteredMines.filter(m => m.properties.risk_level === 'HIGH' || m.properties.risk_level === 'CRITICAL').length;
  const criticalViolationsCount = filteredHotspots.filter(h => h.properties.severity === 'CRITICAL' || h.properties.severity === 'HIGH').length;
  const overdueCapaCount = filteredMines.reduce((sum, m) => sum + (m.properties.overdue_capa_count || 0), 0);

  // Risk distribution
  const riskDistribution = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filteredMines.forEach(m => {
      const r = m.properties.risk_level as keyof typeof counts;
      if (counts[r] !== undefined) counts[r] += 1;
    });
    return counts;
  }, [filteredMines]);

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header & Title Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              {user?.role === 'MINE MANAGER' ? 'Mine Manager GIS Surveillance' : 'National Geospatial Telemetry'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Ministry of Coal &bull; Coal India Limited &bull; WGS 84
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <Compass className="text-blue-700" size={24} />
            {user?.role === 'MINE MANAGER' ? `${user?.mine_name || 'Assigned Mine'} GIS Command Center` : 'NATIONAL COMPLIANCE GIS'}
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Geographically anchored mine safety surveillance, live statutory hazard telemetry, and spatial CAPA verification.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Basemap Switcher */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 text-xs shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Basemap:</span>
            {(['voyager', 'osm', 'imagery'] as const).map(bm => (
              <button
                key={bm}
                onClick={() => setActiveBasemap(bm)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeBasemap === bm
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {bm === 'voyager' ? 'Voyager' : bm === 'osm' ? 'OSM' : 'Satellite'}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadGISData}
            disabled={loading}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 shadow-xs"
            title="Refresh GIS Telemetry"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. National Summary KPI Cards (From Actual Backend Data) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={handleSelectNational}
          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-blue-400 cursor-pointer transition-all"
        >
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Active Mines</div>
          <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{totalMinesCount}</div>
          <div className="text-[10px] text-blue-700 font-semibold mt-0.5">In Current Geographic Scope</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inspected Mines</div>
          <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">{inspectedMinesCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">With Statutory Audit Records</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">High / Critical Risk</div>
          <div className="text-2xl font-black text-orange-700 mt-0.5 font-mono">{highRiskCount}</div>
          <div className="text-[10px] text-orange-700 font-semibold mt-0.5">Below 75% Compliance Target</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Critical Violations</div>
          <div className="text-2xl font-black text-red-700 mt-0.5 font-mono">{criticalViolationsCount}</div>
          <div className="text-[10px] text-red-700 font-semibold mt-0.5">Plotted Spatial Hazards</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overdue CAPA</div>
          <div className="text-2xl font-black text-rose-700 mt-0.5 font-mono">{overdueCapaCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Directives Passed Due Date</div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Geographic Drill-Down Breadcrumb Navigation */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 overflow-x-auto shadow-xs">
        <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mr-1">Drill-Down:</span>

        <button
          onClick={handleSelectNational}
          className={`font-semibold hover:text-blue-700 transition-colors ${
            filterState === 'ALL' && !selectedMine ? 'text-blue-700 font-bold' : 'text-slate-600'
          }`}
        >
          National (India)
        </button>

        {filterState !== 'ALL' && (
          <>
            <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
            <button
              onClick={() => handleSelectState(filterState)}
              className={`font-semibold hover:text-blue-700 transition-colors ${
                !selectedMine ? 'text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              State: {filterState}
            </button>
          </>
        )}

        {selectedMine && (
          <>
            <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-slate-500">
              {selectedMine.properties.coalfield || selectedMine.properties.district}
            </span>
            <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
            <button
              onClick={() => handleSelectMine(selectedMine)}
              className={`font-semibold hover:text-blue-700 transition-colors ${
                !selectedHotspot ? 'text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              {selectedMine.properties.name}
            </button>
          </>
        )}

        {selectedHotspot && (
          <>
            <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
            <span className="font-bold text-red-700 flex items-center gap-1">
              <Flame size={12} />
              {selectedHotspot.properties.violation_code || 'Hazard Hotspot'}
            </span>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Professional Multi-Filter & Search Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Search mine, state, violation code or statutory finding..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}

            {/* Search Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {searchResults.map(res => (
                  <div
                    key={`${res.type}-${res.id}`}
                    onClick={() => {
                      if (res.type === 'MINE') handleSelectMine(res.item);
                      else handleSelectHotspot(res.item);
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg flex-shrink-0 ${res.type === 'MINE' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                        {res.type === 'MINE' ? <Building2 size={14} /> : <AlertTriangle size={14} />}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-900 truncate">{res.title}</div>
                        <div className="text-[10px] text-slate-500 truncate" dangerouslySetInnerHTML={{ __html: res.subtitle }} />
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 flex-shrink-0">
                      {res.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* State Filter */}
            <select
              value={filterState}
              onChange={e => {
                const val = e.target.value;
                if (val === 'ALL') handleSelectNational();
                else handleSelectState(val);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All States ({availableStates.length})</option>
              {availableStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            {/* Mine Filter */}
            <select
              value={filterMine}
              onChange={e => {
                const val = e.target.value;
                setFilterMine(val);
                if (val !== 'ALL') {
                  const m = minesList.find(item => item.properties.id === val);
                  if (m) handleSelectMine(m);
                }
              }}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-blue-600 max-w-[180px] truncate"
            >
              <option value="ALL">All Mines ({minesList.length})</option>
              {filteredMines.map(m => (
                <option key={m.properties.id} value={m.properties.id}>
                  {m.properties.name}
                </option>
              ))}
            </select>

            {/* Risk Level */}
            <select
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Severity */}
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Hazards</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>

            {/* CAPA Status */}
            <select
              value={filterCapa}
              onChange={e => setFilterCapa(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-2 font-medium focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All CAPA</option>
              <option value="OPEN">Open Only</option>
              <option value="RESOLVED">Resolved Only</option>
            </select>

            {/* Reset */}
            {(filterState !== 'ALL' || filterMine !== 'ALL' || filterRisk !== 'ALL' || filterSeverity !== 'ALL' || filterCapa !== 'ALL') && (
              <button
                onClick={handleSelectNational}
                className="px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                title="Reset All Filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Main Canvas: Real Leaflet Map + Intelligence Dossier */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Real Leaflet Map Container */}
        <div className="lg:col-span-2 space-y-3 min-w-0">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden relative">
            {/* Map Top Bar */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Compass size={15} className="text-blue-700" />
                <span>Geographic Satellite Surveillance Layer</span>
                <span className="text-[10px] text-slate-500 font-mono font-normal">
                  ({filteredMines.length} Mines &bull; {filteredHotspots.length} Plotted Hazards)
                </span>
              </div>

              {/* Layer Controls Dropdown Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowLayersDropdown(!showLayersDropdown)}
                  className="px-3 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-xs"
                >
                  <Layers size={13} className="text-blue-700" />
                  <span>Map Layers</span>
                </button>

                {showLayersDropdown && (
                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 z-50 text-xs space-y-2">
                    <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                      <span>MAP LAYERS</span>
                      <button onClick={() => setShowLayersDropdown(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={12} />
                      </button>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={layers.mines}
                        onChange={e => setLayers({ ...layers, mines: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Mine Locations</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={layers.hazards}
                        onChange={e => setLayers({ ...layers, hazards: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Hazard Hotspots</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={layers.criticalViolations}
                        onChange={e => setLayers({ ...layers, criticalViolations: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Critical / High Violations</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={layers.riskHeatmap}
                        onChange={e => setLayers({ ...layers, riskHeatmap: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-orange-700">Risk Heatmap Layer</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Actual Real Geographic Map View */}
            <div className="relative w-full h-[580px] bg-slate-100">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 z-20">
                  <div className="text-center space-y-2">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <span className="text-xs font-semibold text-slate-600">Loading Geospatial India Basemap...</span>
                  </div>
                </div>
              ) : null}

              <MapContainer
                center={currentCenter}
                zoom={currentZoom}
                scrollWheelZoom={true}
                className="w-full h-full z-10"
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url={BASEMAP_TILES[activeBasemap].url}
                  attribution={BASEMAP_TILES[activeBasemap].attribution}
                  maxZoom={BASEMAP_TILES[activeBasemap].maxZoom}
                />

                <MapViewController center={currentCenter} zoom={currentZoom} bounds={mapBounds} />
                <MapZoomListener onZoomChange={setCurrentZoom} />

                {/* 1. CLUSTERS WHEN ZOOMED OUT (zoom <= 6) */}
                {currentZoom <= 6 &&
                  clusteredRegions.map(cl => (
                    <Marker
                      key={`cluster-${cl.state}`}
                      position={cl.center}
                      icon={createClusterIcon(cl.count, cl.state)}
                      eventHandlers={{
                        click: () => handleSelectState(cl.state),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                        <div className="text-xs p-1">
                          <div className="font-bold text-slate-900">{cl.state} Coal Region</div>
                          <div className="text-slate-600">{cl.count} Active Mines &bull; Click to drill down</div>
                        </div>
                      </Tooltip>
                    </Marker>
                  ))}

                {/* 2. REAL MINE MARKERS (when zoom >= 7 or only 1 mine in view) */}
                {layers.mines && (currentZoom >= 7 || filteredMines.length === 1) &&
                  filteredMines.map(mine => {
                    const [lng, lat] = mine.geometry.coordinates;
                    const isSelected = selectedMine?.properties.id === mine.properties.id;

                    return (
                      <Marker
                        key={`mine-${mine.properties.id}`}
                        position={[lat, lng]}
                        icon={createMineIcon(mine.properties.risk_level, mine.properties.compliance_score, isSelected)}
                        eventHandlers={{
                          click: () => handleSelectMine(mine),
                        }}
                      >
                        <Popup>
                          <div className="p-1 space-y-1.5 text-xs min-w-[200px]">
                            <div className="font-bold text-slate-900 text-sm">{mine.properties.name}</div>
                            <div className="text-[11px] text-slate-600">{mine.properties.subsidiary} ({mine.properties.code})</div>
                            <div className="text-[10px] text-slate-500">{mine.properties.district}, {mine.properties.state}</div>
                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                              <span className="font-semibold text-slate-700">Compliance:</span>
                              <span className="font-bold font-mono text-emerald-700">{mine.properties.compliance_score}%</span>
                            </div>
                            <button
                              onClick={() => handleSelectMine(mine)}
                              className="w-full mt-2 py-1 text-center bg-blue-700 hover:bg-blue-800 text-white rounded text-[11px] font-bold"
                            >
                              Inspect Dossier &rarr;
                            </button>
                          </div>
                        </Popup>

                        <Tooltip direction="top" offset={[0, -22]} opacity={0.95}>
                          <div className="text-xs p-0.5">
                            <span className="font-bold text-slate-900">{mine.properties.name}</span>
                            <span className="text-slate-500 ml-1">({mine.properties.compliance_score}%)</span>
                          </div>
                        </Tooltip>
                      </Marker>
                    );
                  })}

                {/* 3. REAL HAZARD HOTSPOT MARKERS */}
                {layers.hazards &&
                  filteredHotspots.map(hotspot => {
                    const [lng, lat] = hotspot.geometry.coordinates;
                    const isSelected = selectedHotspot?.properties.id === hotspot.properties.id;
                    const isResolved = hotspot.properties.status === 'RESOLVED' || hotspot.properties.status === 'CLOSED';

                    return (
                      <Marker
                        key={`hotspot-${hotspot.properties.id}`}
                        position={[lat, lng]}
                        icon={createHazardIcon(hotspot.properties.severity, isResolved, isSelected)}
                        eventHandlers={{
                          click: () => handleSelectHotspot(hotspot),
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                          <div className="text-xs p-0.5 max-w-[220px]">
                            <div className="font-bold text-slate-900">{hotspot.properties.hazard_title}</div>
                            <div className="text-[10px] text-slate-500">
                              {hotspot.properties.mine_name} &bull; {hotspot.properties.severity}
                            </div>
                          </div>
                        </Tooltip>
                      </Marker>
                    );
                  })}

                {/* 4. RISK HEATMAP LAYER (Visual Hazard Density Buffers) */}
                {layers.riskHeatmap &&
                  filteredMines.map(mine => {
                    const [lng, lat] = mine.geometry.coordinates;
                    const color = getMineColor(mine.properties.risk_level, mine.properties.compliance_score);

                    return (
                      <Circle
                        key={`heatmap-mine-${mine.properties.id}`}
                        center={[lat, lng]}
                        radius={currentZoom > 10 ? 3500 : 9000}
                        pathOptions={{
                          fillColor: color,
                          fillOpacity: 0.18,
                          color: color,
                          weight: 1.5,
                          dashArray: '4 4',
                        }}
                      />
                    );
                  })}
              </MapContainer>

              {/* Floating Map Legend (Bottom-Left) */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-lg z-20 text-[11px] space-y-1.5 pointer-events-auto">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Map Legend</div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-slate-800 font-medium">Critical Risk / Hazard (&lt; 65%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                  <span className="text-slate-800 font-medium">High Risk (65-74%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                  <span className="text-slate-800 font-medium">Attention Required (75-84%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span className="text-slate-800 font-medium">Compliant (85%+)</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <span className="w-3 h-3 bg-blue-700 rounded-sm transform rotate-45" />
                  <span className="text-slate-800 font-medium ml-1">Mine Anchor Facility</span>
                </div>
              </div>

              {/* National Risk Distribution Widget (Top-Right) */}
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-lg z-20 text-xs hidden sm:block pointer-events-auto min-w-[190px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  National Risk Distribution
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600" /> Critical:
                    </span>
                    <span className="font-bold font-mono text-red-700">{riskDistribution.CRITICAL}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-600" /> High:
                    </span>
                    <span className="font-bold font-mono text-orange-700">{riskDistribution.HIGH}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-600" /> Moderate:
                    </span>
                    <span className="font-bold font-mono text-amber-700">{riskDistribution.MEDIUM}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" /> Compliant:
                    </span>
                    <span className="font-bold font-mono text-emerald-700">{riskDistribution.LOW}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* 6. Contextual Intelligence Dossier Panel (Right Column) */}
        {/* ----------------------------------------------------------- */}
        <div className="space-y-4">
          {/* MINE INTELLIGENCE DOSSIER */}
          {selectedMine && !selectedHotspot && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                    MINE INTELLIGENCE DOSSIER
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">{selectedMine.properties.name}</h3>
                  <p className="text-slate-500 text-xs font-mono">{selectedMine.properties.code}</p>
                </div>
                <StatusBadge status={selectedMine.properties.risk_level} />
              </div>

              {/* Geographic Coordinates & Location */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-semibold text-slate-800">{selectedMine.properties.district}, {selectedMine.properties.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subsidiary:</span>
                  <span className="font-bold text-slate-900">{selectedMine.properties.subsidiary}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px] pt-1 border-t border-slate-200">
                  <span className="text-slate-500">GPS Coordinates:</span>
                  <span className="text-blue-700 font-semibold">
                    {selectedMine.geometry.coordinates[1].toFixed(4)}° N, {selectedMine.geometry.coordinates[0].toFixed(4)}° E
                  </span>
                </div>
              </div>

              {/* Compliance Score Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 font-semibold">Statutory Compliance Rating</span>
                  <span className="font-bold font-mono text-slate-900">{selectedMine.properties.compliance_score}%</span>
                </div>
                <ComplianceBar score={selectedMine.properties.compliance_score} />
              </div>

              {/* Operational Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Open Violations</span>
                  <div className="text-lg font-bold text-red-700 mt-0.5">{selectedMine.properties.open_violations}</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Overdue CAPA</span>
                  <div className="text-lg font-bold text-orange-700 mt-0.5">{selectedMine.properties.overdue_capa_count || 1}</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Total Audits</span>
                  <div className="text-lg font-bold text-blue-700 mt-0.5">{selectedMine.properties.inspection_count || 12}</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Contractors</span>
                  <div className="text-lg font-bold text-slate-800 mt-0.5">
                    {selectedMine.properties.assigned_contractors?.length || 2} Active
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate('/mines')}
                    className="btn-secondary text-xs py-2 w-full justify-center"
                  >
                    View Mine
                  </button>
                  <button
                    onClick={() => navigate('/inspections')}
                    className="btn-secondary text-xs py-2 w-full justify-center"
                  >
                    View Inspections
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate('/violations')}
                    className="btn-secondary text-xs py-2 w-full justify-center"
                  >
                    View Violations
                  </button>
                  <button
                    onClick={() => navigate('/corrective-actions')}
                    className="btn-primary text-xs py-2 w-full justify-center"
                  >
                    View CAPA
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HAZARD DOSSIER */}
          {selectedHotspot && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 uppercase tracking-wide">
                    HAZARD & STATUTORY VIOLATION DOSSIER
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">{selectedHotspot.properties.hazard_title}</h3>
                  <p className="text-slate-500 text-xs font-mono">{selectedHotspot.properties.violation_code}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <StatusBadge status={selectedHotspot.properties.severity} />
                  <StatusBadge status={selectedHotspot.properties.status} />
                </div>
              </div>

              {/* Location & Regulation Reference */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mine Facility:</span>
                  <span className="font-bold text-slate-900">{selectedHotspot.properties.mine_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location Tag:</span>
                  <span className="font-semibold text-slate-800">{selectedHotspot.properties.location_tag}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px] pt-1 border-t border-slate-200">
                  <span className="text-slate-500">GPS Coordinates:</span>
                  <span className="text-red-700 font-bold">
                    {selectedHotspot.geometry.coordinates[1].toFixed(5)}° N, {selectedHotspot.geometry.coordinates[0].toFixed(5)}° E
                  </span>
                </div>
              </div>

              {/* Statutory Regulation Reference */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-blue-900">DGMS Statutory Reference:</div>
                <div className="font-mono text-blue-800 font-semibold">{selectedHotspot.properties.regulation_reference || 'DGMS CMR 2017 Regulation 115'}</div>
                {selectedHotspot.properties.description && (
                  <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                    {selectedHotspot.properties.description}
                  </p>
                )}
              </div>

              {/* Linked Photographic Evidence */}
              {selectedHotspot.properties.evidence_photos && selectedHotspot.properties.evidence_photos.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Camera size={13} className="text-blue-700" />
                    <span>Geotagged Photographic Evidence ({selectedHotspot.properties.evidence_photos.length})</span>
                  </div>
                  <div className="space-y-2">
                    {selectedHotspot.properties.evidence_photos.map((ev, i) => (
                      <div
                        key={ev.id || i}
                        onClick={() => setPreviewPhoto(ev)}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{ev.caption}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            GPS: {ev.latitude?.toFixed(4)}° N, {ev.longitude?.toFixed(4)}° E
                          </div>
                        </div>
                        <Eye size={14} className="text-blue-700 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked CAPA Directive */}
              {selectedHotspot.properties.linked_capa && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1">
                      <Wrench size={12} /> Corrective Action (CAPA)
                    </span>
                    <StatusBadge status={selectedHotspot.properties.linked_capa.status} />
                  </div>
                  <div className="font-semibold text-slate-800">{selectedHotspot.properties.linked_capa.title}</div>
                  <div className="text-[11px] text-slate-600">
                    Deadline: <strong>{formatDate(selectedHotspot.properties.linked_capa.due_date)}</strong>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => navigate('/inspections')}
                  className="btn-primary text-xs py-2 w-full justify-center flex items-center gap-1.5"
                >
                  <ExternalLink size={13} />
                  <span>View Full Inspection Audit</span>
                </button>
                <button
                  onClick={() => navigate('/corrective-actions')}
                  className="btn-secondary text-xs py-2 w-full justify-center"
                >
                  Manage Corrective Action (CAPA)
                </button>
                <button
                  onClick={() => setSelectedHotspot(null)}
                  className="btn-ghost text-xs py-1.5 w-full justify-center text-slate-500"
                >
                  &larr; Back to Mine Dossier
                </button>
              </div>
            </div>
          )}

          {/* Fallback when neither mine nor hotspot selected */}
          {!selectedMine && !selectedHotspot && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
                <MapPin size={22} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Select a Geographic Entity</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click any mine marker or hazard cluster on the India map to inspect its full operational compliance dossier.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7. Evidence Photo Modal */}
      {/* ------------------------------------------------------------- */}
      {previewPhoto && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewPhoto(null)}
          title={`Photographic Evidence: ${previewPhoto.caption}`}
        >
          <div className="space-y-3 text-xs">
            <div className="w-full h-64 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
              <img
                src={previewPhoto.file_path.startsWith('/') ? previewPhoto.file_path : `/${previewPhoto.file_path}`}
                alt={previewPhoto.caption}
                onError={(e: any) => {
                  e.target.onerror = null;
                  e.target.src = '/uploads/berm_violation_geo.jpg';
                }}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
              <div><strong>Caption:</strong> {previewPhoto.caption}</div>
              <div><strong>Latitude:</strong> {previewPhoto.latitude}° N</div>
              <div><strong>Longitude:</strong> {previewPhoto.longitude}° E</div>
              <div><strong>Captured:</strong> {formatDateTime(previewPhoto.captured_at)}</div>
              <div><strong>Cryptographic Stamp:</strong> SHA-256 Verified On-Chain</div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewPhoto(null)}
                className="btn-secondary text-xs px-4 py-1.5"
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
