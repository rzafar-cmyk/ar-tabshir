import { useState, useCallback, useEffect } from 'react';
import { Users, Search, MoreHorizontal, Edit2, Trash2, Shield, MapPin, Building2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@clerk/clerk-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { UserFormModal, DeleteConfirmModal } from './UserModals';
import type { ConvexUserRecord } from './UserModals';

const roleConfig = {
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700', icon: Shield },
  desk_incharge: { label: 'Desk In-charge', color: 'bg-blue-100 text-blue-700', icon: Building2 },
  country_rep: { label: 'Country Rep', color: 'bg-emerald-100 text-emerald-700', icon: MapPin },
};

export function UsersSection() {
  const { user: authUser } = useAuth();
  const { user: clerkUser } = useUser();
  const currentUserRole = authUser?.role ?? 'country_rep';
  const clerkId = clerkUser?.id ?? '';

  // Fetch all users from Convex (reactive)
  const convexUsers = useQuery(api.users.getAllUsers) ?? [];

  // Mutations
  const updateUserMut = useMutation(api.users.updateUser);
  const deleteUserMut = useMutation(api.users.deleteUser);

  // Map to the shape the UI expects
  const users: ConvexUserRecord[] = convexUsers.map(u => ({
    _id: u._id,
    clerkId: u.clerkId,
    name: u.name,
    email: u.email,
    role: u.role,
    assignedCountries: u.assignedCountries,
    assignedDesk: u.assignedDesk,
    isActive: u.isActive,
    lastLogin: u.lastLogin,
  }));

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [selectedUser, setSelectedUser] = useState<ConvexUserRecord | null>(null);
  const [editingUser, setEditingUser] = useState<ConvexUserRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Edit handler
  const handleEditUser = useCallback(async (data: {
    role: ConvexUserRecord['role'];
    assignedCountries?: string[];
    assignedDesk?: string;
    isActive: boolean;
  }) => {
    if (!editingUser) return;
    await updateUserMut({
      userId: editingUser._id as Id<"users">,
      callerClerkId: clerkId,
      role: data.role,
      assignedCountries: data.assignedCountries,
      assignedDesk: data.assignedDesk,
      isActive: data.isActive,
    });
    setEditingUser(null);
    setToast(`User "${editingUser.name}" updated successfully.`);
  }, [editingUser, clerkId, updateUserMut]);

  // Delete handler
  const handleDeleteUser = useCallback(async () => {
    if (!showDeleteConfirm) return;
    await deleteUserMut({
      userId: showDeleteConfirm as Id<"users">,
      callerClerkId: clerkId,
    });
    setShowDeleteConfirm(null);
    setToast('User deleted successfully.');
  }, [showDeleteConfirm, clerkId, deleteUserMut]);

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
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      if (user.isActive !== isActive) return false;
    }
    return true;
  });

  const stats = {
    total: users.length,
    superAdmin: users.filter(u => u.role === 'super_admin').length,
    deskIncharge: users.filter(u => u.role === 'desk_incharge').length,
    countryRep: users.filter(u => u.role === 'country_rep').length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
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
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none">
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="desk_incharge">Desk In-charge</option>
          <option value="country_rep">Country Rep</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none">
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
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
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
                          <p className="text-xs text-gray-400">{user.assignedCountries.length} countries</p>
                        </div>
                      ) : user.assignedCountries.length > 0 ? (
                        <p className="text-sm text-gray-700">{user.assignedCountries.join(', ')}</p>
                      ) : (
                        <span className="text-xs text-gray-400">All Countries</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                        user.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {user.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {user.isActive ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedUser(user)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {currentUserRole === 'super_admin' && (
                          <>
                            <button onClick={() => setEditingUser(user)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user._id !== authUser?.id && (
                              <button onClick={() => setShowDeleteConfirm(user._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Edit User Modal */}
      <UserFormModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleEditUser}
        editingUser={editingUser}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={handleDeleteUser}
        userName={users.find(u => u._id === showDeleteConfirm)?.name ?? ''}
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
                {selectedUser.assignedDesk && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedUser.assignedDesk}</span>
                  </div>
                )}
                {selectedUser.assignedCountries.length > 0 && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-600">{selectedUser.assignedCountries.join(', ')}</p>
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
