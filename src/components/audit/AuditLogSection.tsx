import { useState, useMemo } from 'react';
import { History, Search, Filter, Download, CheckCircle, XCircle, Edit3, Plus, Trash2, RefreshCw, Calendar, Clock, ChevronDown, ChevronRight, ArrowRight, Send, ShieldCheck, ShieldX, ArchiveRestore, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useConvexData } from '@/contexts/ConvexDataContext';
import type { AuditEvent, FieldChange } from '@/lib/audit';

// ── Role display helpers ──

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  desk_incharge: 'Desk In-charge',
  country_rep: 'Country Rep',
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: 'from-violet-400 to-violet-600', text: 'text-violet-600' },
  desk_incharge: { bg: 'from-blue-400 to-blue-600', text: 'text-blue-600' },
  country_rep: { bg: 'from-emerald-400 to-emerald-600', text: 'text-emerald-600' },
};

// ── Action config ──

const actionConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  report_created: { label: 'Created', icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  draft_saved: { label: 'Updated', icon: Edit3, color: 'text-blue-600', bg: 'bg-blue-50' },
  submitted: { label: 'Submitted', icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  revision_requested: { label: 'Revision', icon: XCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  update_allowed: { label: 'Update Allowed', icon: ShieldCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
  update_denied: { label: 'Update Denied', icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50' },
  report_archived: { label: 'Archived', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50' },
  report_restored: { label: 'Restored', icon: ArchiveRestore, color: 'text-teal-600', bg: 'bg-teal-50' },
  report_deleted: { label: 'Deleted', icon: Trash2, color: 'text-red-700', bg: 'bg-red-100' },
  import_historical: { label: 'Imported', icon: Upload, color: 'text-indigo-600', bg: 'bg-indigo-50' },
};

const defaultAction = { label: 'Action', icon: RefreshCw, color: 'text-gray-600', bg: 'bg-gray-50' };

// ── Timestamp formatter ──

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ts; }
}

// ── Component ──

export function AuditLogSection() {
  const { auditEvents: convexAuditEvents } = useConvexData();
  const { user } = useAuth();
  const currentUserRole = user?.role ?? 'country_rep';
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [showAllChanges, setShowAllChanges] = useState<Set<string>>(new Set());

  // Read audit events from Convex (already role-filtered server-side)
  const rawEvents = convexAuditEvents;

  // Build unique user and country lists for filters
  const { uniqueUsers, uniqueCountries } = useMemo(() => {
    const users = new Set<string>();
    const countries = new Set<string>();
    for (const e of rawEvents) {
      if (e.user) users.add(e.user);
      if (e.country && e.country !== 'Global') countries.add(e.country);
    }
    return {
      uniqueUsers: Array.from(users).sort(),
      uniqueCountries: Array.from(countries).sort(),
    };
  }, [rawEvents]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return rawEvents.filter(event => {
      // Role-based filtering
      if (currentUserRole === 'country_rep') {
        const repCountries = user?.assignedCountries ?? [];
        if (!event.country || !repCountries.includes(event.country)) return false;
      } else if (currentUserRole === 'desk_incharge') {
        const assignedCountries = user?.assignedCountries ?? [];
        if (event.country && event.country !== 'Global' && !assignedCountries.includes(event.country)) return false;
      }

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!event.user.toLowerCase().includes(q) &&
            !(event.details || '').toLowerCase().includes(q) &&
            !(event.country || '').toLowerCase().includes(q) &&
            !event.action.toLowerCase().includes(q)) {
          return false;
        }
      }

      // User filter
      if (userFilter !== 'all' && event.user !== userFilter) return false;

      // Country filter
      if (countryFilter !== 'all' && event.country !== countryFilter) return false;

      // Action filter
      if (actionFilter !== 'all' && event.action !== actionFilter) return false;

      // Date range filter
      if (dateRange.from) {
        const entryDate = event.timestamp.split('T')[0].split(' ')[0];
        if (entryDate < dateRange.from) return false;
      }
      if (dateRange.to) {
        const entryDate = event.timestamp.split('T')[0].split(' ')[0];
        if (entryDate > dateRange.to) return false;
      }

      return true;
    });
  }, [rawEvents, currentUserRole, user, searchQuery, userFilter, countryFilter, actionFilter, dateRange]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredEvents.length,
    created: filteredEvents.filter(e => e.action === 'report_created').length,
    updated: filteredEvents.filter(e => e.action === 'draft_saved').length,
    submitted: filteredEvents.filter(e => e.action === 'submitted').length,
    approved: filteredEvents.filter(e => e.action === 'approved').length,
  }), [filteredEvents]);

  // Unique action types present in data for filter
  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    for (const e of rawEvents) actions.add(e.action);
    return Array.from(actions).sort();
  }, [rawEvents]);

  const toggleExpand = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleShowAll = (id: string) => {
    setShowAllChanges(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const hasActiveFilters = searchQuery || userFilter !== 'all' || countryFilter !== 'all' || actionFilter !== 'all' || dateRange.from || dateRange.to;

  const clearFilters = () => {
    setSearchQuery('');
    setUserFilter('all');
    setCountryFilter('all');
    setActionFilter('all');
    setDateRange({});
  };

  const renderChanges = (event: AuditEvent) => {
    if (!event.changes || event.changes.length === 0) return null;
    const MAX_VISIBLE = 5;
    const showAll = showAllChanges.has(event.id);
    const visible = showAll ? event.changes : event.changes.slice(0, MAX_VISIBLE);
    const hasMore = event.changes.length > MAX_VISIBLE;

    return (
      <div className="mt-2 space-y-1">
        {visible.map((c: FieldChange, i: number) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="text-gray-400 mt-0.5">&#8226;</span>
            <span className="text-gray-500">
              <span className="font-medium text-gray-700">{c.label}</span>
              {' '}
              <span className="text-gray-400">({c.code})</span>
              :
              {' '}
              <span className="text-red-500 line-through">{c.oldValue ?? '(empty)'}</span>
              {' '}
              <ArrowRight className="w-3 h-3 inline text-gray-400" />
              {' '}
              <span className="text-emerald-600 font-medium">{c.newValue ?? '(empty)'}</span>
            </span>
          </div>
        ))}
        {hasMore && !showAll && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleShowAll(event.id); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-4"
          >
            Show all {event.changes.length} changes...
          </button>
        )}
        {hasMore && showAll && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleShowAll(event.id); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-4"
          >
            Show less
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            Audit Log
          </h2>
          <p className="text-sm text-gray-500">Track all system activities and changes</p>
        </div>
        <button
          onClick={() => {
            const csv = ['Timestamp,User,Role,Action,Country,Details']
              .concat(filteredEvents.map(e =>
                `"${formatTimestamp(e.timestamp)}","${e.user}","${ROLE_LABELS[e.role || ''] || e.role || ''}","${e.action}","${e.country || ''}","${(e.details || '').replace(/"/g, '""')}"`
              )).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
            a.click(); URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 px-4 py-3">
          <p className="text-xs text-emerald-600">Created</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.created}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 px-4 py-3">
          <p className="text-xs text-blue-600">Updated</p>
          <p className="text-2xl font-bold text-blue-700">{stats.updated}</p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-100 px-4 py-3">
          <p className="text-xs text-purple-600">Submitted</p>
          <p className="text-2xl font-bold text-purple-700">{stats.submitted}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 px-4 py-3">
          <p className="text-xs text-emerald-600">Approved</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.approved}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
          />
        </div>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none"
        >
          <option value="all">All Users</option>
          {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none"
        >
          <option value="all">All Countries</option>
          {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none"
        >
          <option value="all">All Actions</option>
          {uniqueActions.map(a => {
            const cfg = actionConfig[a];
            return <option key={a} value={a}>{cfg?.label || a}</option>;
          })}
        </select>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={dateRange.from || ''}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={dateRange.to || ''}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Clear Filters
          </button>
        )}
      </div>

      {/* Role Notice */}
      {currentUserRole !== 'super_admin' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-600" />
          <p className="text-sm text-amber-700">
            Showing filtered results based on your {currentUserRole === 'desk_incharge' ? 'desk' : 'country'} assignment.
          </p>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Country</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEvents.map(event => {
                const action = actionConfig[event.action] || defaultAction;
                const ActionIcon = action.icon;
                const isExpanded = expandedEntries.has(event.id);
                const hasChanges = event.changes && event.changes.length > 0;
                const roleKey = event.role || 'super_admin';
                const roleColor = ROLE_COLORS[roleKey] || ROLE_COLORS.super_admin;

                return (
                  <tr
                    key={event.id}
                    className={`transition-colors ${hasChanges ? 'cursor-pointer hover:bg-blue-50/40' : 'hover:bg-gray-50'} ${isExpanded ? 'bg-blue-50/30' : ''}`}
                    onClick={() => hasChanges && toggleExpand(event.id)}
                  >
                    <td className="px-2 py-3 text-center">
                      {hasChanges ? (
                        isExpanded ? <ChevronDown className="w-4 h-4 text-blue-500 mx-auto" /> : <ChevronRight className="w-4 h-4 text-gray-400 mx-auto" />
                      ) : (
                        <span className="w-4 h-4 block" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 bg-gradient-to-br ${roleColor.bg} rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                          {event.user.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{event.user}</p>
                          <p className={`text-[10px] font-medium ${roleColor.text}`}>{ROLE_LABELS[roleKey] || roleKey}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${action.bg} ${action.color} whitespace-nowrap`}>
                        <ActionIcon className="w-3 h-3" />
                        {action.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {event.country ? (
                        <span className="text-sm text-gray-700 font-medium">{event.country}</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-600">{event.details}</p>
                        {isExpanded && renderChanges(event)}
                        {hasChanges && !isExpanded && (
                          <p className="text-[10px] text-blue-500 mt-0.5">Click to see {event.changes!.length} field change{event.changes!.length !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <History className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No audit entries found</h3>
            <p className="text-sm text-gray-400 mt-1">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Actions will appear here as users interact with the system'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
