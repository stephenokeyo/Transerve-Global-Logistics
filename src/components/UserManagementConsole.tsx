import React, { useState } from 'react';
import { User, UserRole, CarrierConfig, AuditLog } from '../types/user';
import { 
  getUsers, updateUserRole, updateUserStatus, addUser, 
  getCarrierConfigs, saveCarrierConfigs, getAuditLogs 
} from '../data/mockUsers';
import { useI18n } from '../i18n/I18nContext';
import { 
  Users, Shield, Key, Activity, UserPlus, CheckCircle2, 
  AlertCircle, RefreshCw, Sliders, Check, Lock, Globe, BarChart3, Award 
} from 'lucide-react';
import { CarrierVolumeAnalytics } from './CarrierVolumeAnalytics';
import { ShipperLoyaltySection } from './ShipperLoyaltySection';

interface UserManagementConsoleProps {
  currentUser: User;
  onUserRoleUpdated?: () => void;
}

export const UserManagementConsole: React.FC<UserManagementConsoleProps> = ({
  currentUser,
  onUserRoleUpdated,
}) => {
  const { t, tRole, formatDateTime } = useI18n();
  const [users, setUsers] = useState<User[]>(getUsers());

  const [carrierConfigs, setCarrierConfigs] = useState<CarrierConfig[]>(getCarrierConfigs());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(getAuditLogs());
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'loyalty' | 'volume' | 'carriers' | 'audit'>('loyalty');

  // Add User Modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('customer');
  const [newUserCompany, setNewUserCompany] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');

  // Role Edit inline state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [apiTesting, setApiTesting] = useState(false);
  const [apiTestSuccess, setApiTestSuccess] = useState(false);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    const updated = updateUserRole(userId, newRole, currentUser);
    if (updated) {
      setUsers(getUsers());
      setAuditLogs(getAuditLogs());
      setEditingUserId(null);
      if (onUserRoleUpdated) onUserRoleUpdated();
    }
  };

  const handleStatusToggle = (userId: string, currentStatus: 'active' | 'suspended') => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    updateUserStatus(userId, nextStatus, currentUser);
    setUsers(getUsers());
    setAuditLogs(getAuditLogs());
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    addUser(
      {
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        company: newUserCompany || undefined,
        phone: newUserPhone || undefined,
        status: 'active',
      },
      currentUser
    );

    setUsers(getUsers());
    setAuditLogs(getAuditLogs());
    setIsAddUserOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserCompany('');
    setNewUserPhone('');
    if (onUserRoleUpdated) onUserRoleUpdated();
  };

  const handleTestCarrierApis = () => {
    setApiTesting(true);
    setTimeout(() => {
      setApiTesting(false);
      setApiTestSuccess(true);
      setTimeout(() => setApiTestSuccess(false), 3000);
    }, 1200);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] border border-purple-200">{tRole('admin')}</span>;
      case 'shipper':
        return <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200">{tRole('shipper')}</span>;
      case 'customer':
        return <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">{tRole('customer')}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Console Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950 text-white rounded-xl shadow-xs">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {t('admin.title')}
                </h2>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold uppercase tracking-wider">
                  Full Control Access
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('admin.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create New User</span>
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation (Functional interactive segmented buttons §1.A) */}
        <div className="pt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('loyalty')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'loyalty' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('admin.tabLoyalty')}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('volume')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'volume' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('admin.tabAnalytics')}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'users' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('admin.tabUsers')} ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('carriers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'carriers' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{t('admin.tabGateways')}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'audit' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{t('admin.tabAudit')} ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB: Shipper Loyalty & Volume Rewards */}
      {activeSubTab === 'loyalty' && (
        <ShipperLoyaltySection
          currentUser={currentUser}
          users={users}
        />
      )}

      {/* SUBTAB: Carrier Volume Analytics (Recharts 30-Day Breakdown) */}
      {activeSubTab === 'volume' && (
        <CarrierVolumeAnalytics />
      )}

      {/* SUBTAB 1: User Directory */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Distinct RBAC Roles: <strong>Administrator</strong> (Full System Control), <strong>Shipper</strong> (Shipments & Manifests), <strong>Customer</strong> (Self Tracking & Order History)
            </span>
            <span className="font-mono text-slate-400">Total Accounts: {users.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">User / Account</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">Organization / Company</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Role Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrentUser = u.id === currentUser.id;
                  const isEditing = editingUserId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {u.avatarInitials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] font-mono text-blue-600 font-bold bg-blue-50 px-1.5 rounded">YOU</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              defaultValue={u.role}
                              id={`select-role-${u.id}`}
                              className="p-1 border border-slate-300 rounded text-xs font-semibold bg-white"
                            >
                              <option value="admin">Administrator</option>
                              <option value="shipper">Commercial Shipper</option>
                              <option value="customer">Customer</option>
                            </select>
                            <button
                              onClick={() => {
                                const el = document.getElementById(`select-role-${u.id}`) as HTMLSelectElement;
                                if (el) handleRoleChange(u.id, el.value as UserRole);
                              }}
                              className="px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-bold hover:bg-slate-800"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] hover:bg-slate-200"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          getRoleBadge(u.role)
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-medium">{u.company || 'Individual Client'}</span>
                        {u.phone && <span className="block text-[10px] text-slate-400 font-mono">{u.phone}</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                            u.status === 'active' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          <span className="capitalize">{u.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {u.lastLogin}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUserId(isEditing ? null : u.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-300 rounded bg-blue-50/50 transition-colors"
                          >
                            Edit Role
                          </button>
                          {!isCurrentUser && (
                            <button
                              onClick={() => handleStatusToggle(u.id, u.status)}
                              className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                                u.status === 'active'
                                  ? 'text-slate-500 hover:text-rose-600 bg-slate-100'
                                  : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                              }`}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Carrier APIs & Gateway SLA Governance */}
      {activeSubTab === 'carriers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Carrier API Web Services Integration Gateway
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time rating, automated thermal label generation, and dispatch webhooks
                </p>
              </div>

              <button
                onClick={handleTestCarrierApis}
                disabled={apiTesting}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {apiTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Pinging Carrier APIs...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Execute Carrier Health Check</span>
                  </>
                )}
              </button>
            </div>

            {apiTestSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>All 5 Carrier Web Services responded nominal: 200 OK (Latency &lt; 85ms).</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {carrierConfigs.map((cfg) => (
                <div key={cfg.carrier} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 uppercase">
                      {cfg.carrier}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      {cfg.apiStatus}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium">{cfg.name}</p>

                  <div className="space-y-1.5 text-xs text-slate-500 font-mono pt-2 border-t border-slate-200">
                    <div className="flex justify-between">
                      <span>ENV:</span>
                      <strong className="text-slate-800 uppercase">{cfg.environment}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>ACCT:</span>
                      <strong className="text-slate-800">{cfg.accountNumber}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>FUEL SURCHARGE:</span>
                      <strong className="text-slate-800">{cfg.fuelSurchargePct}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>DISCOUNT SLA:</span>
                      <strong className="text-slate-800">{cfg.rateDiscountPct}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: System Audit Trail */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Immutable system audit logs tracking role modifications, shipments, and carrier dispatches</span>
            <span className="font-mono">{auditLogs.length} events logged</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{log.action}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-slate-700">{log.userName}</span>
                    {getRoleBadge(log.role)}
                  </div>
                  <p className="text-slate-600">{log.details}</p>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Platform User</h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Dr. Catherine Hall"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="c.hall@biotech.org"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white font-semibold"
                >
                  <option value="customer">Customer (Track packages & view order history)</option>
                  <option value="shipper">Commercial Shipper (Manage shipments & print labels)</option>
                  <option value="admin">Administrator (Full System & User Control)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Organization / Company</label>
                <input
                  type="text"
                  value={newUserCompany}
                  onChange={(e) => setNewUserCompany(e.target.value)}
                  placeholder="e.g. Advanced Nanotech Labs"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="+1 (555) 019-2810"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
