import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertTriangle, Eye, EyeOff, ArrowRight, Users, Zap, CheckCircle2 } from 'lucide-react';
import { getRoleDashboardPath } from '../components/auth/RoleRouteGuard';

const DEMO_ROLES = [
  { role: 'CONTRACTOR', label: 'Contractor (ABC Mining)', username: 'contractor_suresh', icon: '🏗️', badge: 'Contractor' },
  { role: 'WORKER MANAGEMENT', label: 'Labour & PME Officer', username: 'worker_officer_priya', icon: '👷', badge: 'Labour & PME' },
  { role: 'FIELD OFFICER', label: 'Senior Safety Inspector', username: 'field_officer_amit', icon: '🔍', badge: 'Inspection' },
  { role: 'MINE MANAGER', label: 'Mine Manager — Rajmahal OCP', username: 'mine_manager_rajmahal', icon: '⛏️', badge: 'Mine Operations' },
  { role: 'CORPORATE MANAGEMENT', label: 'Corporate Management (CIL)', username: 'corporate_officer', icon: '🏛️', badge: 'Corporate HQ' },
];

export default function LoginPage() {
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('corporate_officer');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loggedUser = await login(username, password);
      navigate(getRoleDashboardPath(loggedUser.role));
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleUsername: string) => {
    setLoading(true);
    setError('');
    try {
      const loggedUser = await login(roleUsername, 'Password@123');
      navigate(getRoleDashboardPath(loggedUser.role));
    } catch (err: any) {
      try {
        const demoRole = DEMO_ROLES.find(r => r.username === roleUsername);
        if (demoRole) {
          const switchedUser = await switchRole(demoRole.role);
          navigate(getRoleDashboardPath(switchedUser.role));
        }
      } catch {
        setError('Quick login failed. Try manual login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Government Banner */}
      <div className="bg-slate-900 text-slate-300 text-[11px] px-6 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">Government of India</span>
          <span>•</span>
          <span>Ministry of Coal</span>
          <span>•</span>
          <span>Coal India Limited (CIL)</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-slate-400">
          <Shield size={12} className="text-emerald-400" />
          <span>Statutory Compliance & Governance System</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left: Branding & Overview */}
          <div className="lg:col-span-5 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 p-8 text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner">
                  <Shield size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white leading-tight">CoalGuard</h2>
                  <p className="text-[10px] text-blue-200 uppercase tracking-widest">Smart Governance Platform</p>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-2xl font-bold leading-snug">
                  AI-Based Smart Governance & Compliance Monitoring System
                </h1>
                <p className="text-xs text-blue-100/90 leading-relaxed">
                  Enterprise regulatory oversight for coal mines, field inspections, contractor performance, and closed-loop corrective actions.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-2.5 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-blue-100">
                <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                <span>Statutory DGMS & CMR Compliance</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-blue-100">
                <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                <span>GIS Spatial Hazard & Bench Monitoring</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-blue-100">
                <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                <span>AI Automated Risk & Anomaly Scoring</span>
              </div>
            </div>
          </div>

          {/* Right: Login Form & Role Switcher */}
          <div className="lg:col-span-7 p-8 flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Sign in to CoalGuard</h2>
              <p className="text-xs text-slate-500 mt-1">Authorized personnel and registered contractors portal</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <AlertTriangle size={15} className="text-red-700 flex-shrink-0" />
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username or Official Email</label>
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  placeholder="corporate_officer or corporate@cil.gov.in"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                </div>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 pr-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    placeholder="Password@123"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Default demo credentials: Password@123</p>
              </div>

              <button
                id="login-btn"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Sign In to Workspace <ArrowRight size={14} /></>
                )}
              </button>
            </form>

            {/* Quick Demo Access */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Zap size={13} className="text-amber-600" />
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Quick Access — Demo Roles
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEMO_ROLES.map(r => (
                  <button
                    key={r.username}
                    id={`quick-login-${r.role.toLowerCase().replace(/ /g, '-')}`}
                    onClick={() => handleQuickLogin(r.username)}
                    disabled={loading}
                    className="flex items-center justify-between p-2 rounded-md border border-slate-200 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 text-left transition-colors"
                  >
                    <div className="min-w-0 pr-1">
                      <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                        <span>{r.icon}</span>
                        <span>{r.badge}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{r.username}</div>
                    </div>
                    <ArrowRight size={12} className="text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-slate-500 border-t border-slate-200 bg-white">
        CoalGuard © {new Date().getFullYear()} Ministry of Coal & Coal India Limited. All rights reserved.
      </div>
    </div>
  );
}
