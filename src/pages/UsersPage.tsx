import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Building2, CheckCircle, XCircle, Search, Filter, RefreshCw } from 'lucide-react';
import { users as usersApi, mines as minesApi } from '../services/api';
import { SectionCard, StatusBadge, LoadingState, EmptyState, Modal } from '../components/ui/UIComponents';

interface UserRecord {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  mine_name?: string;
  contractor_name?: string;
  is_active: boolean;
  last_login?: string;
}

export default function UsersPage() {
  const [userList, setUserList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('FIELD OFFICER');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res: any = await usersApi.list();
      const list = Array.isArray(res) ? res : res?.users || [];
      setUserList(list);
    } catch (e) {
      console.error('Failed to load users', e);
      // Sample mock users
      setUserList([
        {
          id: 'u-2',
          username: 'corp_mgmt',
          email: 'corp@coalindia.in',
          full_name: 'Col. Rajesh Sharma (Director Safety)',
          role: 'CORPORATE MANAGEMENT',
          is_active: true,
          last_login: new Date(Date.now() - 1000 * 60 * 45).toISOString()
        },
        {
          id: 'u-3',
          username: 'mine_mgr_jh',
          email: 'mgr.jharia@bccl.gov.in',
          full_name: 'M. S. Roy (Agent & Mine Mgr)',
          role: 'MINE MANAGER',
          mine_name: 'Jharia Open Cast Pit 4',
          is_active: true,
          last_login: new Date(Date.now() - 1000 * 60 * 120).toISOString()
        },
        {
          id: 'u-4',
          username: 'field_officer_1',
          email: 'fo.asoren@cil.in',
          full_name: 'Anil Kumar Soren (DGMS Liaison)',
          role: 'FIELD OFFICER',
          mine_name: 'Jharia Open Cast Pit 4',
          is_active: true,
          last_login: new Date(Date.now() - 1000 * 60 * 20).toISOString()
        },
        {
          id: 'u-5',
          username: 'contractor_tata',
          email: 'compliance@tatamining.com',
          full_name: 'R. K. Meena (Project In-Charge)',
          role: 'CONTRACTOR',
          contractor_name: 'Tata Steel Mining Services',
          is_active: true,
          last_login: new Date(Date.now() - 1000 * 60 * 360).toISOString()
        },
        {
          id: 'u-6',
          username: 'worker_mgmt_1',
          email: 'welfare@bccl.gov.in',
          full_name: 'Suresh Chandra (Welfare Officer)',
          role: 'WORKER MANAGEMENT',
          mine_name: 'Jharia Open Cast Pit 4',
          is_active: true,
          last_login: new Date(Date.now() - 1000 * 60 * 600).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: UserRecord = {
      id: `u-${Date.now()}`,
      username: email.split('@')[0],
      email,
      full_name: fullName,
      role,
      is_active: true,
      last_login: 'Never'
    };
    setUserList([newUser, ...userList]);
    setShowAddModal(false);
    setFullName('');
    setEmail('');
  };

  const filtered = userList.filter(u => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cil-blue/20 text-cil-light">
              <Users size={22} />
            </span>
            RBAC Governance & Identity Management
          </h1>
          <p className="text-coal-400 text-xs mt-1">
            Ministry of Coal, CIL, Mine Manager, Field Officer, and Contractor Role-Based Access Directory
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-3 rounded-lg"
          >
            <UserPlus size={14} />
            <span>Provision Governance Identity</span>
          </button>
          <button onClick={loadUsers} className="btn-icon">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-coal-900 border border-coal-800 p-3 rounded-xl">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-coal-500" />
          <input
            type="text"
            placeholder="Search by full name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-coal-950 border border-coal-800 text-white text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-cil-blue"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-coal-500" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-coal-950 border border-coal-800 text-coal-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cil-blue"
          >
            <option value="ALL">All Roles</option>
            <option value="CORPORATE MANAGEMENT">CORPORATE MANAGEMENT</option>
            <option value="MINE MANAGER">MINE MANAGER</option>
            <option value="FIELD OFFICER">FIELD OFFICER</option>
            <option value="CONTRACTOR">CONTRACTOR</option>
            <option value="WORKER MANAGEMENT">WORKER MANAGEMENT</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <SectionCard title={`Active Governance Users (${filtered.length})`} icon={<Shield size={16} />}>
        {loading ? (
          <LoadingState rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState message="No users found matching current filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-coal-300">
              <thead className="bg-coal-950 text-coal-500 uppercase text-[10px] tracking-wider border-b border-coal-800">
                <tr>
                  <th className="py-2.5 px-3">Official / User</th>
                  <th className="py-2.5 px-3">Role Tier</th>
                  <th className="py-2.5 px-3">Assigned Asset / Mine</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Active</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coal-800/60">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-coal-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{u.full_name}</div>
                      <div className="text-[10px] text-coal-500 font-mono">{u.email}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="badge bg-coal-800 text-coal-200 border border-coal-700 text-[10px] font-semibold">
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-coal-200">{u.mine_name || u.contractor_name || 'Ministry / Headquarters'}</div>
                    </td>

                    <td className="py-3 px-3">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
                          <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-[10px] font-semibold">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-coal-500 font-mono text-[10px]">
                      {u.last_login?.includes('T') ? new Date(u.last_login).toLocaleString() : u.last_login || '—'}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => alert(`Provisioned security certificate for ${u.full_name}`)}
                        className="text-[11px] text-cil-light hover:underline font-semibold"
                      >
                        Audit Permissions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Provision User Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Provision New Governance Official">
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block text-coal-300 mb-1 font-semibold">Full Name & Designation</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Varma, Dy. Director"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-coal-950 border border-coal-700 text-white rounded-lg p-2.5 focus:outline-none focus:border-cil-blue"
              required
            />
          </div>

          <div>
            <label className="block text-coal-300 mb-1 font-semibold">Official Email</label>
            <input
              type="email"
              placeholder="e.g. r.varma@coalindia.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-coal-950 border border-coal-700 text-white rounded-lg p-2.5 focus:outline-none focus:border-cil-blue"
              required
            />
          </div>

          <div>
            <label className="block text-coal-300 mb-1 font-semibold">Assign System Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-coal-950 border border-coal-700 text-white rounded-lg p-2.5 focus:outline-none focus:border-cil-blue"
            >
              <option value="CORPORATE MANAGEMENT">CORPORATE MANAGEMENT</option>
              <option value="MINE MANAGER">MINE MANAGER</option>
              <option value="FIELD OFFICER">FIELD OFFICER</option>
              <option value="CONTRACTOR">CONTRACTOR</option>
              <option value="WORKER MANAGEMENT">WORKER MANAGEMENT</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-lg bg-coal-800 text-coal-300 hover:bg-coal-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-1.5"
            >
              <UserPlus size={14} />
              <span>Create Official Identity</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
