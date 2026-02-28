import { useState, useEffect } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import type { StoredUser } from '@/services/dataService';
import { getAllCountryNames, getCountriesForRep } from '@/data/countries';

// ── Country list (all 213 countries from central config) ───
const ALL_COUNTRIES = getAllCountryNames();

type Role = StoredUser['role'];

// ═══════════════════════════════════════════════════════════
// 1. UserFormModal — Add / Edit
// ═══════════════════════════════════════════════════════════

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    assignedCountries?: string[];
    assignedDesk?: string;
  }) => { success: boolean; error?: string } | Promise<{ success: boolean; error?: string }>;
  editingUser: StoredUser | null;
}

export function UserFormModal({ isOpen, onClose, onSave, editingUser }: UserFormModalProps) {
  const isEdit = !!editingUser;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('country_rep');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [assignedDesk, setAssignedDesk] = useState('');
  const [error, setError] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  // Reset form when modal opens or editingUser changes
  useEffect(() => {
    if (!isOpen) return;
    if (editingUser) {
      setName(editingUser.name);
      setEmail(editingUser.email);
      setPassword('');
      setRole(editingUser.role);
      setAssignedDesk(editingUser.assignedDesk ?? '');
      if (editingUser.role === 'country_rep') {
        setSelectedCountry(editingUser.assignedCountries?.[0] ?? '');
        setSelectedCountries(editingUser.assignedCountries ?? []);
      } else if (editingUser.role === 'desk_incharge') {
        setSelectedCountries(editingUser.assignedCountries ?? []);
        setSelectedCountry('');
      } else {
        setSelectedCountry('');
        setSelectedCountries([]);
      }
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('country_rep');
      setSelectedCountry('');
      setSelectedCountries([]);
      setAssignedDesk('');
    }
    setError('');
    setCountrySearch('');
  }, [isOpen, editingUser]);

  if (!isOpen) return null;

  const toggleCountry = (c: string) => {
    setSelectedCountries(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c],
    );
  };

  const filteredCountries = countrySearch
    ? ALL_COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : ALL_COUNTRIES;

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('Full name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return; }
    if (!isEdit && !password) { setError('Password is required.'); return; }
    if (role === 'country_rep' && !selectedCountry) { setError('Please select a country.'); return; }
    if (role === 'desk_incharge' && selectedCountries.length === 0) { setError('Please select at least one country.'); return; }

    const countries = role === 'country_rep'
      ? (selectedCountries.length > 0 ? selectedCountries : [selectedCountry])
      : role === 'desk_incharge'
        ? selectedCountries
        : undefined;

    const result = await onSave({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      assignedCountries: countries,
      assignedDesk: role === 'desk_incharge' ? (assignedDesk.trim() || undefined) : undefined,
    });

    if (!result.success) {
      setError(result.error ?? 'An error occurred.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            {isEdit ? 'Edit User' : 'Add New User'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
              placeholder="e.g. John Smith"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
              placeholder="e.g. john@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password{isEdit && <span className="font-normal text-gray-400 ml-1">(optional)</span>}
            </label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
              placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password'}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={e => {
                const r = e.target.value as Role;
                setRole(r);
                setSelectedCountry('');
                setSelectedCountries([]);
                setAssignedDesk('');
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="super_admin">Super Admin</option>
              <option value="desk_incharge">Desk In-charge</option>
              <option value="country_rep">Country Rep</option>
            </select>
          </div>

          {/* Country Rep → primary country + managed countries */}
          {role === 'country_rep' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Country</label>
                <select
                  value={selectedCountry}
                  onChange={e => {
                    const c = e.target.value;
                    setSelectedCountry(c);
                    // Auto-populate managed countries from country config
                    if (c) {
                      setSelectedCountries(getCountriesForRep(c));
                    } else {
                      setSelectedCountries([]);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Select a country...</option>
                  {ALL_COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Managed Countries (editable list) */}
              {selectedCountry && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Managed Countries
                    <span className="font-normal text-gray-400 ml-1">({selectedCountries.length} total)</span>
                  </label>
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={e => setCountrySearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none mb-2"
                    placeholder="Search countries to add/remove..."
                  />
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {filteredCountries.map(c => (
                      <label
                        key={c}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCountries.includes(c)}
                          onChange={() => toggleCountry(c)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {c}
                        {c === selectedCountry && (
                          <span className="text-[10px] text-blue-500 font-medium ml-auto">PRIMARY</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Desk In-charge → multi-select checklist */}
          {role === 'desk_incharge' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desk Name</label>
                <input
                  type="text"
                  value={assignedDesk}
                  onChange={e => setAssignedDesk(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  placeholder="e.g. Africa Desk"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Countries
                  <span className="font-normal text-gray-400 ml-1">({selectedCountries.length} selected)</span>
                </label>
                <input
                  type="text"
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none mb-2"
                  placeholder="Search countries..."
                />
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {filteredCountries.map(c => (
                    <label
                      key={c}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(c)}
                        onChange={() => toggleCountry(c)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 2. DeleteConfirmModal
// ═══════════════════════════════════════════════════════════

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, userName }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Delete User</h3>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <span className="font-semibold">{userName}</span>? This cannot be undone.
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 3. ResetPasswordModal
// ═══════════════════════════════════════════════════════════

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newPassword: string) => { success: boolean; error?: string } | Promise<{ success: boolean; error?: string }>;
  userName: string;
}

export function ResetPasswordModal({ isOpen, onClose, onSave, userName }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError('');
    if (!newPassword || newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    const result = await onSave(newPassword);
    if (!result.success) {
      setError(result.error ?? 'An error occurred.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Reset Password</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Set a new password for <span className="font-semibold">{userName}</span>.
          </p>
          {error && (
            <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="text"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
              placeholder="Enter new password"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Password
          </button>
        </div>
      </div>
    </div>
  );
}
