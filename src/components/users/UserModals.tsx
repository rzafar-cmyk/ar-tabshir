import { useState, useEffect } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import { getAllCountryNames, getCountriesForRep } from '@/data/countries';

const ALL_COUNTRIES = getAllCountryNames();

type Role = 'super_admin' | 'desk_incharge' | 'country_rep';

export interface ConvexUserRecord {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  role: Role;
  assignedCountries: string[];
  assignedDesk?: string;
  isActive: boolean;
  lastLogin: number;
}

// ═══════════════════════════════════════════════════════════
// 1. UserFormModal — Edit user role and assignments
// ═══════════════════════════════════════════════════════════

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    role: Role;
    assignedCountries?: string[];
    assignedDesk?: string;
    isActive: boolean;
  }) => void | Promise<void>;
  editingUser: ConvexUserRecord | null;
}

export function UserFormModal({ isOpen, onClose, onSave, editingUser }: UserFormModalProps) {
  const [role, setRole] = useState<Role>('country_rep');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [assignedDesk, setAssignedDesk] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    if (!isOpen || !editingUser) return;
    setRole(editingUser.role);
    setAssignedDesk(editingUser.assignedDesk ?? '');
    setIsActive(editingUser.isActive);
    if (editingUser.role === 'country_rep') {
      setSelectedCountry(editingUser.assignedCountries[0] ?? '');
      setSelectedCountries(editingUser.assignedCountries);
    } else if (editingUser.role === 'desk_incharge') {
      setSelectedCountries(editingUser.assignedCountries);
      setSelectedCountry('');
    } else {
      setSelectedCountry('');
      setSelectedCountries([]);
    }
    setError('');
    setCountrySearch('');
  }, [isOpen, editingUser]);

  if (!isOpen || !editingUser) return null;

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
    if (role === 'country_rep' && !selectedCountry) { setError('Please select a country.'); return; }
    if (role === 'desk_incharge' && selectedCountries.length === 0) { setError('Please select at least one country.'); return; }

    const countries = role === 'country_rep'
      ? (selectedCountries.length > 0 ? selectedCountries : [selectedCountry])
      : role === 'desk_incharge'
        ? selectedCountries
        : [];

    try {
      await onSave({
        role,
        assignedCountries: countries,
        assignedDesk: role === 'desk_incharge' ? (assignedDesk.trim() || undefined) : undefined,
        isActive,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Edit User</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* User info (read-only — comes from Clerk) */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-800">{editingUser.name}</p>
            <p className="text-xs text-gray-500">{editingUser.email}</p>
            <p className="text-[10px] text-gray-400 mt-1">Name and email are managed through Clerk sign-in</p>
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

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Active</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'translate-x-5' : ''}`} />
            </button>
            <span className={`text-xs ${isActive ? 'text-emerald-600' : 'text-gray-500'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Country Rep → primary country */}
          {role === 'country_rep' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Country</label>
                <select
                  value={selectedCountry}
                  onChange={e => {
                    const c = e.target.value;
                    setSelectedCountry(c);
                    if (c) setSelectedCountries(getCountriesForRep(c));
                    else setSelectedCountries([]);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Select a country...</option>
                  {ALL_COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {selectedCountry && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Managed Countries <span className="font-normal text-gray-400">({selectedCountries.length})</span>
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
                      <label key={c} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedCountries.includes(c)} onChange={() => toggleCountry(c)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        {c}
                        {c === selectedCountry && <span className="text-[10px] text-blue-500 font-medium ml-auto">PRIMARY</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Desk In-charge */}
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
                  Assigned Countries <span className="font-normal text-gray-400">({selectedCountries.length})</span>
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
                    <label key={c} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selectedCountries.includes(c)} onChange={() => toggleCountry(c)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 2. AddUserModal — Create a new user manually
// ═══════════════════════════════════════════════════════════

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    email: string;
    role: Role;
    assignedCountries?: string[];
    assignedDesk?: string;
  }) => void | Promise<void>;
}

export function AddUserModal({ isOpen, onClose, onSave }: AddUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('country_rep');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [assignedDesk, setAssignedDesk] = useState('');
  const [error, setError] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setEmail('');
    setRole('country_rep');
    setSelectedCountry('');
    setSelectedCountries([]);
    setAssignedDesk('');
    setError('');
    setCountrySearch('');
  }, [isOpen]);

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
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('A valid email is required.'); return; }
    if (role === 'country_rep' && !selectedCountry) { setError('Please select a country.'); return; }
    if (role === 'desk_incharge' && selectedCountries.length === 0) { setError('Please select at least one country.'); return; }

    const countries = role === 'country_rep'
      ? (selectedCountries.length > 0 ? selectedCountries : [selectedCountry])
      : role === 'desk_incharge'
        ? selectedCountries
        : [];

    try {
      await onSave({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        assignedCountries: countries,
        assignedDesk: role === 'desk_incharge' ? (assignedDesk.trim() || undefined) : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Add New User</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            The user will be pre-created. When they sign in via Clerk with this email, their account will be automatically linked.
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
              placeholder="Enter full name"
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
              placeholder="user@example.com"
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
              <option value="country_rep">Country Rep</option>
              <option value="desk_incharge">Desk In-charge</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {/* Country Rep → primary country */}
          {role === 'country_rep' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Country</label>
                <select
                  value={selectedCountry}
                  onChange={e => {
                    const c = e.target.value;
                    setSelectedCountry(c);
                    if (c) setSelectedCountries(getCountriesForRep(c));
                    else setSelectedCountries([]);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Select a country...</option>
                  {ALL_COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {selectedCountry && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Managed Countries <span className="font-normal text-gray-400">({selectedCountries.length})</span>
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
                      <label key={c} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedCountries.includes(c)} onChange={() => toggleCountry(c)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        {c}
                        {c === selectedCountry && <span className="text-[10px] text-blue-500 font-medium ml-auto">PRIMARY</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Desk In-charge */}
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
                  Assigned Countries <span className="font-normal text-gray-400">({selectedCountries.length})</span>
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
                    <label key={c} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selectedCountries.includes(c)} onChange={() => toggleCountry(c)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            Add User
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 3. DeleteConfirmModal
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
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
