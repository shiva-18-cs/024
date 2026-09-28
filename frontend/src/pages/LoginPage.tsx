import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertTriangle, Eye, EyeOff, ArrowRight, Users, Zap } from 'lucide-react';

const DEMO_ROLES = [
  { role: 'CONTRACTOR', label: 'Contractor (ABC Mining)', username: 'contractor_suresh', icon: '🏗️', color: 'from-teal-500/20 to-cyan-900/20 border-teal-800/60' },
  { role: 'WORKER MANAGEMENT', label: 'Labour & PME Officer', username: 'worker_officer_priya', icon: '👷', color: 'from-emerald-500/20 to-green-900/20 border-emerald-800/60' },
  { role: 'FIELD OFFICER', label: 'Senior Safety Inspector', username: 'field_officer_amit', icon: '🔍', color: 'from-amber-500/20 to-orange-900/20 border-amber-800/60' },
  { role: 'MINE MANAGER', label: 'Mine Manager — Rajmahal OCP', username: 'mine_manager_rajmahal', icon: '⛏️', color: 'from-violet-500/20 to-purple-900/20 border-violet-800/60' },
  { role: 'CORPORATE MANAGEMENT', label: 'Corporate Management (CIL)', username: 'corporate_officer', icon: '🏛️', color: 'from-sky-500/20 to-blue-900/20 border-sky-800/60' },
];

import { getRoleDashboardPath } from '../components/auth/RoleRouteGuard';

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
      // Try role switch as fallback
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
    <div className="min-h-screen bg-coal-950 flex">
      {/* Left: Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-coal-900 via-coal-950 to-coal-900" />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #0284c7 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6366f1 0%, transparent 50%)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-gradient-to-br from-cil-blue to-blue-900 rounded-2xl flex items-center justify-center shadow-xl">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">CoalGuard</div>
              <div className="text-xs text-coal-500 uppercase tracking-widest">Ministry of Coal • CIL</div>
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-white leading-tight">
              AI-Based Smart<br />
              <span className="text-cil-blue">Governance &</span><br />
              Compliance Platform
            </h1>
            <p className="text-coal-400 text-base leading-relaxed max-w-sm">
              Centralized digital governance for Coal India Limited — integrating field inspections, compliance monitoring, AI risk analytics, and closed-loop corrective action workflows.
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {[
            { icon: '🔍', label: 'Geo-tagged Inspections' },
            { icon: '🤖', label: 'AI Risk Assessment' },
            { icon: '📋', label: 'Automated Reports' },
            { icon: '⚡', label: 'Real-time Escalations' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-2.5 bg-coal-900/80 border border-coal-800 rounded-xl p-3">
              <span className="text-xl">{f.icon}</span>
              <span className="text-xs font-medium text-coal-300">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-cil-blue rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">CoalGuard</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Sign in</h2>
          <p className="text-coal-500 text-sm mb-8">Access the Governance & Compliance Platform</p>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800/60 rounded-lg px-4 py-3 mb-4">
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div>
              <label className="form-label">Username or Email</label>
              <input
                id="username-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="form-input"
                placeholder="corporate_officer or corporate@cil.gov.in"
                required
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input pr-10"
                  placeholder="Password@123"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-coal-500 hover:text-coal-300"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-[10px] text-coal-600 mt-1">Default password: Password@123</p>
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-2.5 text-sm"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          {/* Quick Role Login */}
          <div className="border-t border-coal-800 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} className="text-coal-500" />
              <span className="text-xs font-semibold text-coal-500 uppercase tracking-wider">Quick Access — Demo Roles</span>
            </div>
            <div className="space-y-2">
              {DEMO_ROLES.map(r => (
                <button
                  key={r.username}
                  id={`quick-login-${r.role.toLowerCase().replace(/ /g, '-')}`}
                  onClick={() => handleQuickLogin(r.username)}
                  disabled={loading}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-gradient-to-r text-left transition-all hover:scale-[1.01] disabled:opacity-50 ${r.color}`}
                >
                  <span className="text-lg">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{r.label}</div>
                    <div className="text-[10px] text-coal-400">{r.username}</div>
                  </div>
                  <ArrowRight size={12} className="text-coal-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
