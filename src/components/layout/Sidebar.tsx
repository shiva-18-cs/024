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
        { path: '/gis', icon: Map, label: 'GIS Spatial Radar' },
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


const ROLE_COLORS: Record<string, string> = {
  'CORPORATE MANAGEMENT': 'from-sky-500 to-blue-700',
  'MINE MANAGER': 'from-violet-500 to-purple-700',
  'FIELD OFFICER': 'from-amber-500 to-orange-600',
  'CONTRACTOR': 'from-teal-500 to-cyan-700',
  'WORKER MANAGEMENT': 'from-emerald-500 to-green-700',
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

  return (
    <aside className="fixed left-0 top-0 h-screen bg-coal-900 border-r border-coal-800 flex flex-col z-50"
      style={{ width: 'var(--sidebar-width)' }}>
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-coal-800">
        <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-cil-blue to-blue-900 rounded-xl flex items-center justify-center shadow-lg">
          <Shield size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white leading-tight">CoalGuard</div>
          <div className="text-[9px] text-coal-500 uppercase tracking-wider leading-tight">Ministry of Coal • CIL</div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="px-3 py-3 border-b border-coal-800">
        <div className={cn("rounded-lg p-2.5 bg-gradient-to-r", ROLE_COLORS[userRole] || 'from-coal-700 to-coal-800')}>
          <div className="text-white text-xs font-bold truncate">{user?.full_name || 'User'}</div>
          <div className="text-white/80 text-[10px] truncate font-semibold">{user?.role}</div>
          {user?.mine_name && <div className="text-white/70 text-[9px] truncate mt-0.5">📍 {user.mine_name}</div>}
          {user?.contractor_name && <div className="text-white/70 text-[9px] truncate mt-0.5">🏭 {user.contractor_name}</div>}
        </div>

        {/* Quick Role Switcher for Demo */}
        <button
          onClick={() => setShowRoleSwitch(!showRoleSwitch)}
          className="mt-2 w-full flex items-center justify-between text-[10px] text-coal-500 hover:text-coal-300 px-1 transition-colors"
        >
          <span className="flex items-center gap-1"><Zap size={10} /> Switch Role (Demo)</span>
          {showRoleSwitch ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>

        {showRoleSwitch && (
          <div className="mt-1 space-y-0.5">
            {allRoles.map(role => (
              <button
                key={role}
                onClick={() => handleSwitchRole(role)}
                className={cn(
                  "w-full text-left px-2 py-1 rounded text-[10px] transition-colors",
                  user?.role === role
                    ? "bg-cil-blue/20 text-cil-blue font-semibold"
                    : "text-coal-400 hover:bg-coal-800 hover:text-coal-200"
                )}
              >
                {role}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Role-Specific Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-2 mb-1 text-[9px] font-bold text-coal-600 uppercase tracking-widest">
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
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-cil-blue/20 text-cil-light border border-cil-blue/30"
                        : "text-coal-400 hover:bg-coal-800 hover:text-coal-200"
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

      {/* Footer Actions */}
      <div className="px-2 py-3 border-t border-coal-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-coal-500 hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
