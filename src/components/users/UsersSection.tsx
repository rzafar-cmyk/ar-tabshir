import { useState, useCallback, useEffect } from 'react';
import { Users, UserPlus, Search, MoreHorizontal, Edit2, Trash2, Shield, MapPin, Building2, CheckCircle, XCircle, Mail, Phone, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers, type StoredUser } from '@/services/dataService';
import { addUser, updateUser, deleteUser, resetPassword } from '@/services/userService';
import { UserFormModal, DeleteConfirmModal, ResetPasswordModal } from './UserModals';

type User = StoredUser;

const roleConfig = {
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700', icon: Shield },
  desk_incharge: { label: 'Desk In-charge', color: 'bg-blue-100 text-blue-700', icon: Building2 },
  country_rep: { label: 'Country Rep', color: 'bg-emerald-100 text-emerald-700', icon: MapPin },
};

export function UsersSection() {
  const { user: authUser, refreshUser } = useAuth();
  const currentUserRole = authUser?.role ?? 'country_rep';

  // ── Live user list from localStorage ──
  const [users, setUsers] = useState<User[]>(() => getUsers());
  const refreshUsers = useCallback(() => setUsers(getUsers()), []);

  // ── Filters ──
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // ── Modal / dialog states ──
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);

  // ── Toast notification ──
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Modal callbacks ──
  const handleAddUser = useCallback(async (data: { name: string; email: string; password: string; role: User['role']; assignedCountries?: string[]; assignedDesk?: string }) => {
    const result = await addUser({ ...data, status: 'active' });
    if (result.success) {
      refreshUsers();
      setShowAddModal(false);
      setToast(`User "${data.name}" added successfully.`);
    }
    return result;
  }, [refreshUsers]);

  const handleEditUser = useCallback(async (data: { name: string; email: string; password: string; role: User['role']; assignedCountries?: string[]; assignedDesk?: string }) => {
    if (!editingUser) return { success: false as const, error: 'No user selected.' };
    const changes: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      role: data.role,
      assignedCountries: data.assignedCountries,
      assignedDesk: data.assignedDesk,
    };
    const result = updateUser(editingUser.id, changes);
    if (result.success) {
      // If password was provided, also reset it
      if (data.password) {
        await resetPassword(editingUser.id, data.password);
      }
      refreshUsers();
      // Refresh session if editing the currently logged-in user
      if (editingUser.id === authUser?.id) refreshUser();
      setEditingUser(null);
      setToast(`User "${data.name}" updated successfully.`);
    }
    return result;
  }, [editingUser, authUser?.id, refreshUsers, refreshUser]);

  const handleDeleteUser = useCallback(() => {
    if (!showDeleteConfirm || !authUser) return;
    const result = deleteUser(showDeleteConfirm, authUser.id);
    if (result.success) {
      refreshUsers();
      setShowDeleteConfirm(null);
      setToast('User deleted successfully.');
    }
  }, [showDeleteConfirm, authUser, refreshUsers]);

  const handleResetPassword = useCallback(async (newPassword: string) => {
    if (!showResetPassword) return { success: false as const, error: 'No user selected.' };
    const result = await resetPassword(showResetPassword, newPassword);
    if (result.success) {
      setShowResetPassword(null);
      setToast('Password reset successfully.');
    }
    return result;
  }, [showResetPassword]);

  const filteredUsers = users.filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!user.name.toLowerCase().includes(query) &&
          !user.email.toLowerCase().includes(query) &&
          !user.assignedCountries?.some(c => c.toLowerCase().includes(query))) {
        return false;
      }
    }
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: users.length,
    superAdmin: users.filter(u => u.role === 'super_admin').length,
    deskIncharge: users.filter(u => u.role === 'desk_incharge').length,
    countryRep: users.filter(u => u.role === 'country_rep').length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
  };

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            User Management
          </h2>
          <p className="text-sm text-gray-500">Manage users, roles, and country assignments</p>
        </div>
        {currentUserRole === 'super_admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
          <p className="text-xs text-purple-600">Super Admins</p>
          <p className="text-2xl font-bold text-purple-700">{stats.superAdmin}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-xs text-blue-600">Desk In-charges</p>
          <p className="text-2xl font-bold text-blue-700">{stats.deskIncharge}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <p className="text-xs text-emerald-600">Country Reps</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.countryRep}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Inactive</p>
          <p className="text-2xl font-bold text-red-500">{stats.inactive}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none"
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="desk_incharge">Desk In-charge</option>
          <option value="country_rep">Country Rep</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Assignment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Last Login</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map(user => {
                const role = roleConfig[user.role];
                const RoleIcon = role.icon;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${role.color}`}>
                        <RoleIcon className="w-3 h-3" />
                        {role.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.assignedDesk ? (
                        <div>
                          <p className="text-sm text-gray-700">{user.assignedDesk}</p>
                          <p className="text-xs text-gray-400">{user.assignedCountries?.length} countries</p>
                        </div>
                      ) : user.assignedCountries ? (
                        <p className="text-sm text-gray-700">{user.assignedCountries.join(', ')}</p>
                      ) : (
                        <span className="text-xs text-gray-400">All Countries</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                        user.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {user.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{user.lastLogin || 'Never'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {currentUserRole === 'super_admin' && (
                          <>
                            <button
                              onClick={() => setEditingUser(user)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowResetPassword(user.id)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            {user.id !== authUser?.id && (
                              <button
                                onClick={() => setShowDeleteConfirm(user.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
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

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Add User Modal */}
      <UserFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddUser}
        editingUser={null}
      />

      {/* Edit User Modal */}
      <UserFormModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleEditUser}
        editingUser={editingUser}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={handleDeleteUser}
        userName={users.find(u => u.id === showDeleteConfirm)?.name ?? ''}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordModal
        isOpen={!!showResetPassword}
        onClose={() => setShowResetPassword(null)}
        onSave={handleResetPassword}
        userName={users.find(u => u.id === showResetPassword)?.name ?? ''}
      />

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
                  {selectedUser.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">{selectedUser.name}</h4>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${roleConfig[selectedUser.role].color}`}>
                    {roleConfig[selectedUser.role].label}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{selectedUser.phone || 'N/A'}</span>
                </div>
                {selectedUser.assignedDesk && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedUser.assignedDesk}</span>
                  </div>
                )}
                {selectedUser.assignedCountries && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">
                        {selectedUser.assignedCountries.join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
