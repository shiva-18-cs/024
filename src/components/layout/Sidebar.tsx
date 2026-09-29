import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, HardHat,
  ClipboardList, AlertTriangle, Wrench, Brain, Map, FileText,
  Bell, ScrollText, LogOut, ChevronDown, ChevronRight,
  Shield, Activity, Zap, HeartPulse, Award, FileCheck, Camera,
  ShieldAlert, RotateCcw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/helpers';
import { useState } from 'react';
import { getRoleDashboardPath } from '../auth/RoleRouteGuard';

interface NavItem {
  path: string;
  icon: any;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const ROLE_NAV: Record<string, NavGroup[]> = {
  'CONTRACTOR': [
    {
      label: 'Contractor Operations',
      items: [
        { path: '/contractor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/contractor/gis', icon: Map, label: 'GIS Analysis' },
        { path: '/contractors', icon: FileText, label: 'Contracts' },
        { path: '/mines', icon: Building2, label: 'Mines' },
        { path: '/documents', icon: ScrollText, label: 'Documents' },
        { path: '/workers', icon: Users, label: 'Workers' },
        { path: '/corrective-actions', icon: Wrench, label: 'Corrective Actions' },
        { path: '/violations', icon: AlertTriangle, label: 'Compliance' },
        { path: '/alerts', icon: Bell, label: 'Notifications' },
      ]
    }
  ],
  'WORKER MANAGEMENT': [
    {
      label: 'Labour & Medical Governance',
      items: [
        { path: '/worker-management/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/workers', icon: Users, label: 'Workers' },
        { path: '/workers?tab=medical', icon: HeartPulse, label: 'Medical Fitness' },
        { path: '/workers?tab=training', icon: Award, label: 'Training' },
        { path: '/workers?tab=certifications', icon: FileCheck, label: 'Certifications' },
        { path: '/alerts', icon: Bell, label: 'Notifications' },
      ]
    }
  ],
  'FIELD OFFICER': [
    {
      label: 'Field Operations',
      items: [
        { path: '/field-officer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/field-officer/gis', icon: Map, label: 'GIS Analysis' },
        { path: '/mines', icon: Building2, label: 'Assigned Mines' },
        { path: '/inspections', icon: ClipboardList, label: 'Inspections' },
        { path: '/violations', icon: AlertTriangle, label: 'Findings / Violations' },
        { path: '/inspections?tab=evidence', icon: Camera, label: 'Evidence' },
        { path: '/alerts', icon: Bell, label: 'Notifications' },
      ]
    }
  ],
  'MINE MANAGER': [
    {
      label: 'Mine Operations',
      items: [
        { path: '/mine-manager/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/gis', icon: Map, label: 'GIS Monitoring' },
        { path: '/inspections', icon: ClipboardList, label: 'Inspections' },
        { path: '/reports', icon: FileText, label: 'Mine Reports' },
        { path: '/ai-insights', icon: Brain, label: 'AI Risk Analysis' },
        { path: '/reports?tab=feedback', icon: FileCheck, label: 'Corporate Feedback' },
        { path: '/corrective-actions', icon: Wrench, label: 'Corrective Actions' },
        { path: '/escalations', icon: ShieldAlert, label: 'Escalations' },
        { path: '/recurring-problems', icon: RotateCcw, label: 'Recurring Problems' },
        { path: '/audit-logs', icon: Activity, label: 'Audit Trail' },
        { path: '/alerts', icon: Bell, label: 'Notifications' },
      ]
    }
  ],
  'CORPORATE MANAGEMENT': [
    {
      label: 'Corporate Governance',
      items: [
        { path: '/corporate/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/gis', icon: Map, label: 'National Compliance GIS' },
        { path: '/mines', icon: Building2, label: 'All Mines' },
        { path: '/contractors', icon: FileText, label: 'Contracts' },
        { path: '/reports', icon: FileText, label: 'Reports' },
        { path: '/ai-insights', icon: Brain, label: 'Compliance Analytics' },
        { path: '/violations', icon: AlertTriangle, label: 'Violations' },
        { path: '/escalations', icon: ShieldAlert, label: 'Escalations' },
        { path: '/recurring-problems', icon: RotateCcw, label: 'Recurring Problems' },
        { path: '/audit-logs', icon: Activity, label: 'Audit Trail' },
        { path: '/alerts', icon: Bell, label: 'Notifications' },
      ]
    }
  ]
};

const ROLE_BADGE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  'CORPORATE MANAGEMENT': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'MINE MANAGER': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'FIELD OFFICER': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'CONTRACTOR': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'WORKER MANAGEMENT': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

export default function Sidebar() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [showRoleSwitch, setShowRoleSwitch] = useState(false);

  const allRoles = [
    'CONTRACTOR',
    'WORKER MANAGEMENT',
    'FIELD OFFICER',
    'MINE MANAGER',
    'CORPORATE MANAGEMENT'
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchRole = async (role: string) => {
    try {
      await switchRole(role);
      setShowRoleSwitch(false);
      navigate(getRoleDashboardPath(role));
    } catch (e) {
      console.error('Role switch failed', e);
    }
  };

  const userRole = user?.role || 'CORPORATE MANAGEMENT';
  const navGroups = ROLE_NAV[userRole] || ROLE_NAV['CORPORATE MANAGEMENT'];
  const badgeStyle = ROLE_BADGE_STYLE[userRole] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };

  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col z-50 select-none shadow-sm"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex-shrink-0 w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center shadow-sm">
          <Shield size={20} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 tracking-tight">CoalGuard</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">GOV</span>
          </div>
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate">
            Ministry of Coal • CIL
          </div>
        </div>
      </div>

      {/* User & Role Card */}
      <div className="p-3 border-b border-slate-200 bg-white">
        <div className={cn("p-2.5 rounded-lg border", badgeStyle.bg, badgeStyle.border)}>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-xs font-bold text-slate-900 truncate">{user?.full_name || 'Authorized Official'}</span>
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase", badgeStyle.text, badgeStyle.bg, badgeStyle.border)}>
              {user?.role?.split(' ')[0]}
            </span>
          </div>
          <div className={cn("text-[11px] font-semibold tracking-tight truncate", badgeStyle.text)}>
            {user?.role}
          </div>
          {user?.mine_name && (
            <div className="text-[10px] text-slate-600 truncate mt-1 flex items-center gap-1 font-medium">
              <span>📍</span> {user.mine_name}
            </div>
          )}
          {user?.contractor_name && (
            <div className="text-[10px] text-slate-600 truncate mt-1 flex items-center gap-1 font-medium">
              <span>🏭</span> {user.contractor_name}
            </div>
          )}
        </div>

        {/* Role Switcher Demo Control */}
        <button
          onClick={() => setShowRoleSwitch(!showRoleSwitch)}
          className="mt-2 w-full flex items-center justify-between text-[11px] font-medium text-slate-600 hover:text-blue-700 px-1 py-1 rounded hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Zap size={12} className="text-amber-600" /> Switch Role (Demonstration)
          </span>
          {showRoleSwitch ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {showRoleSwitch && (
          <div className="mt-1.5 p-1 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5 max-h-48 overflow-y-auto">
            {allRoles.map(role => (
              <button
                key={role}
                onClick={() => handleSwitchRole(role)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded text-[11px] font-medium transition-colors flex items-center justify-between",
                  user?.role === role
                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                )}
              >
                <span>{role}</span>
                {user?.role === role && <span className="text-[9px]">Active</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path.includes('/dashboard')}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-150",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-bold border-l-3 border-blue-700 pl-[9px]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )
                  }
                >
                  <item.icon size={16} className="flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / Sign Out */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-colors"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
