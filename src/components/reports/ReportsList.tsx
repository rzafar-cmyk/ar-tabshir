import { Fragment, useState, useMemo, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, ChevronRight, Eye, Edit2, CheckCircle, XCircle, Download, Trash2, Ban, RotateCcw, ShieldCheck, Archive, ArchiveRestore } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useConvexData } from '@/contexts/ConvexDataContext';
import { RevisionReviewModal } from './RevisionReviewModal';
import { formatFiscalYear } from '@/lib/fiscalYear';

interface Report {
  id: string;
  country: string;
  countryCode: string;
  flag: string;
  continent: string;
  year: number;
  status: 'draft' | 'submitted' | 'approved' | 'revision_requested' | 'rejected' | 'update_requested' | 'update_in_progress';
  progress: number;
  lastUpdated: string;
  submittedBy: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface ReportsListProps {
  reports: Report[];
  onView: (report: Report) => void;
  onEdit: (report: Report) => void;
  onApprove: (report: Report) => void;
  onRequestRevision: (report: Report) => void;
  onDelete: (report: Report) => void;
  onExport: (reports: Report[]) => void;
  userRole: 'admin' | 'contributor' | 'viewer';
  onToggleFilters?: () => void;
  onAllowUpdate?: (report: Report) => void;
  onDenyUpdate?: (report: Report) => void;
  onArchive?: (report: Report) => void;
  onRestore?: (report: Report) => void;
  onPermanentDelete?: (report: Report) => void;
  isArchiveView?: boolean;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
  submitted: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' },
  approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  revision_requested: { label: 'Revision', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' },
  update_requested: { label: 'Update Requested', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', dot: 'bg-purple-500' },
  update_in_progress: { label: 'Updating', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500' },
};

/** Format year as range: 2025 → "2025-2026" */
const fmtYear = formatFiscalYear;

interface CountryGroup {
  country: string;
  flag: string;
  continent: string;
  mainReport: Report;
  olderReports: Report[];
}

export function ReportsList({
  reports,
  onView,
  onEdit,
  onApprove,
  onRequestRevision,
  onDelete: _onDelete,
  onExport,
  userRole: _userRole,
  onToggleFilters,
  onAllowUpdate,
  onDenyUpdate,
  onArchive,
  onRestore,
  onPermanentDelete,
  isArchiveView = false,
}: ReportsListProps) {
  const { user: authUser } = useAuth();
  const { updateReportStatus: convexUpdateStatus, allReports: convexAllReports } = useConvexData();
  const canManage = authUser?.role === 'super_admin' || authUser?.role === 'desk_incharge';

  const [localReports, setLocalReports] = useState(reports);
  useEffect(() => setLocalReports(reports), [reports]);

  // Filter for desk_incharge: only their assigned countries
  const roleFilteredReports = useMemo(() => {
    if (authUser?.role === 'desk_incharge' && authUser.assignedCountries) {
      return localReports.filter((r: Report) => authUser.assignedCountries!.includes(r.country));
    }
    return localReports;
  }, [localReports, authUser]);

  const updateReportStatus = async (report: Report, newStatus: Report['status']) => {
    const now = new Date().toISOString().split('T')[0];
    const updates: Partial<Report> = newStatus === 'approved'
      ? { status: newStatus, lastUpdated: now, approvedBy: authUser?.name ?? '', approvedAt: now }
      : { status: newStatus, lastUpdated: now };
    setLocalReports(prev => prev.map((r: Report) => r.id === report.id ? { ...r, ...updates } : r));
    await convexUpdateStatus(report.id, newStatus, newStatus === 'approved' ? {
      approvedBy: authUser?.name ?? '',
      approvedAt: now,
    } : undefined);
  };

  const handleApprove = (report: Report) => {
    updateReportStatus(report, 'approved');
    onApprove(report);
  };

  const handleReject = (report: Report) => {
    updateReportStatus(report, 'rejected');
  };

  const [revisionReport, setRevisionReport] = useState<Report | null>(null);

  const handleRequestRevision = (report: Report) => {
    setRevisionReport(report);
  };

  const handleRevisionSent = () => {
    if (!revisionReport) return;
    setLocalReports(prev =>
      prev.map(r =>
        r.id === revisionReport.id
          ? { ...r, status: 'revision_requested' as const, lastUpdated: new Date().toISOString().split('T')[0] }
          : r,
      ),
    );
    onRequestRevision(revisionReport);
    setRevisionReport(null);
  };

  const handleAllowUpdate = (report: Report) => {
    updateReportStatus(report, 'update_in_progress');
    onAllowUpdate?.(report);
  };

  const handleDenyUpdate = async (report: Report) => {
    const reason = window.prompt('Reason for denying update request (optional):') ?? '';
    const now = new Date().toISOString().split('T')[0];
    setLocalReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'approved' as const, lastUpdated: now } : r));
    await convexUpdateStatus(report.id, 'approved', { updateDeniedReason: reason });
    onDenyUpdate?.(report);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Report; direction: 'asc' | 'desc' } | null>(null);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkToast, setBulkToast] = useState<string | null>(null);
  useEffect(() => { if (!bulkToast) return; const t = setTimeout(() => setBulkToast(null), 3000); return () => clearTimeout(t); }, [bulkToast]);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    const stored = localStorage.getItem('ar_reports_per_page');
    if (stored === 'Infinity') return Infinity;
    if (stored) { const n = Number(stored); if (n > 0) return n; }
    return 50;
  });

  const handleItemsPerPageChange = (value: string) => {
    const num = value === 'All' ? Infinity : Number(value);
    setItemsPerPage(num);
    localStorage.setItem('ar_reports_per_page', num === Infinity ? 'Infinity' : String(num));
    setCurrentPage(1);
  };

  // Filter by search
  const searchedReports = useMemo(() => {
    if (!searchQuery) return roleFilteredReports;
    const query = searchQuery.toLowerCase();
    return roleFilteredReports.filter(r =>
      r.country.toLowerCase().includes(query) ||
      r.continent.toLowerCase().includes(query) ||
      r.submittedBy.toLowerCase().includes(query)
    );
  }, [roleFilteredReports, searchQuery]);

  // Group by country, sort within groups by year desc
  const countryGroups = useMemo(() => {
    const groupMap = new Map<string, Report[]>();
    for (const r of searchedReports) {
      const arr = groupMap.get(r.country) ?? [];
      arr.push(r);
      groupMap.set(r.country, arr);
    }

    const groups: CountryGroup[] = [];
    for (const [country, reps] of groupMap) {
      // Sort by year descending so mainReport is latest
      reps.sort((a, b) => b.year - a.year);
      const [main, ...older] = reps;
      groups.push({
        country,
        flag: main.flag,
        continent: main.continent,
        mainReport: main,
        olderReports: older,
      });
    }

    // Sort groups
    if (sortConfig) {
      groups.sort((a, b) => {
        const aVal = a.mainReport[sortConfig.key] ?? '';
        const bVal = b.mainReport[sortConfig.key] ?? '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default: sort by country name
      groups.sort((a, b) => a.country.localeCompare(b.country));
    }

    return groups;
  }, [searchedReports, sortConfig]);

  // Paginate by country groups
  const totalGroups = countryGroups.length;
  const showAll = !isFinite(itemsPerPage);
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(totalGroups / itemsPerPage));
  const paginatedGroups = showAll
    ? countryGroups
    : countryGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Total individual reports count for display
  const totalReportsCount = searchedReports.length;

  const handleSort = (key: keyof Report) => {
    setSortConfig(current => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const toggleExpand = (country: string) => {
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country); else next.add(country);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const mainIds = paginatedGroups.map(g => g.mainReport.id);
    if (mainIds.every(id => selectedReports.has(id))) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(mainIds));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedReports);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedReports(newSet);
  };

  const SortIcon = ({ column }: { column: keyof Report }) => {
    if (!sortConfig || sortConfig.key !== column) {
      return <ChevronDown className="w-3 h-3 text-gray-300" />;
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-500" />
      : <ChevronDown className="w-3 h-3 text-blue-500" />;
  };

  /** Render the full set of action buttons for a main (latest year) report row */
  const renderMainActions = (report: Report) => (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => onView(report)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
        <Eye className="w-4 h-4" />
      </button>
      {!isArchiveView && canManage && (
        <button onClick={() => onEdit(report)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit">
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      {!isArchiveView && canManage && report.status === 'submitted' && (
        <button onClick={() => handleApprove(report)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
          <CheckCircle className="w-4 h-4" />
        </button>
      )}
      {!isArchiveView && authUser?.role === 'super_admin' && report.status === 'submitted' && (
        <button onClick={() => handleReject(report)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
          <Ban className="w-4 h-4" />
        </button>
      )}
      {!isArchiveView && canManage && report.status === 'submitted' && (
        <button onClick={() => handleRequestRevision(report)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Request Revision">
          <XCircle className="w-4 h-4" />
        </button>
      )}
      {!isArchiveView && canManage && report.status === 'update_requested' && (
        <>
          <button onClick={() => handleAllowUpdate(report)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Allow Update">
            <ShieldCheck className="w-4 h-4" />
          </button>
          <button onClick={() => handleDenyUpdate(report)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Deny Update">
            <RotateCcw className="w-4 h-4" />
          </button>
        </>
      )}
      {!isArchiveView && authUser?.role === 'super_admin' && (
        <button onClick={() => onArchive?.(report)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Archive">
          <Archive className="w-4 h-4" />
        </button>
      )}
      {isArchiveView && authUser?.role === 'super_admin' && (
        <button onClick={() => onRestore?.(report)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Restore">
          <ArchiveRestore className="w-4 h-4" />
        </button>
      )}
      {isArchiveView && authUser?.role === 'super_admin' && (
        <button onClick={() => onPermanentDelete?.(report)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Permanently Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  /** Render sub-row actions: View only */
  const renderSubActions = (report: Report) => (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => onView(report)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
        <Eye className="w-4 h-4" />
      </button>
    </div>
  );

  const renderStatusBadge = (report: Report) => {
    const st = statusConfig[report.status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${st.bg} ${st.text} border ${st.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
        {st.label}
      </span>
    );
  };

  const renderProgress = (report: Report) => (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            report.progress >= 80 ? 'bg-emerald-500' :
            report.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
          }`}
          style={{ width: `${report.progress}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{report.progress}%</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by country, continent, or submitter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
            />
          </div>
          <button
            onClick={onToggleFilters}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {selectedReports.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{selectedReports.size} selected</span>
            <button
              onClick={() => onExport(searchedReports.filter(r => selectedReports.has(r.id)))}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {!isArchiveView && authUser?.role === 'super_admin' && onArchive && (
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedReports.size})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={paginatedGroups.length > 0 && paginatedGroups.every(g => selectedReports.has(g.mainReport.id))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="w-8 px-1 py-3" /> {/* Expand arrow column */}
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('country')}
                >
                  <div className="flex items-center gap-1">Country <SortIcon column="country" /></div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('year')}
                >
                  <div className="flex items-center gap-1">Year <SortIcon column="year" /></div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Progress</th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('lastUpdated')}
                >
                  <div className="flex items-center gap-1">Last Updated <SortIcon column="lastUpdated" /></div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Submitted By</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedGroups.map((group) => {
                const { mainReport, olderReports } = group;
                const isExpanded = expandedCountries.has(group.country);
                const hasOlder = olderReports.length > 0;

                return (
                  <Fragment key={group.country}>
                    {/* Main row (latest year) */}
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedReports.has(mainReport.id)}
                          onChange={() => toggleSelect(mainReport.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-1 py-3">
                        {hasOlder ? (
                          <button
                            onClick={() => toggleExpand(group.country)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                            title={isExpanded ? 'Collapse' : `Show ${olderReports.length} older report${olderReports.length > 1 ? 's' : ''}`}
                          >
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4" />
                              : <ChevronRight className="w-4 h-4" />}
                          </button>
                        ) : <span className="w-4 h-4 block" />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{group.flag}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{group.country}</p>
                            <p className="text-xs text-gray-400">{group.continent}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 font-medium">{fmtYear(mainReport.year)}</span>
                        {hasOlder && (
                          <span className="ml-1.5 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                            +{olderReports.length}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{renderStatusBadge(mainReport)}</td>
                      <td className="px-4 py-3">{renderProgress(mainReport)}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{mainReport.lastUpdated}</p>
                        {mainReport.submittedAt && (
                          <p className="text-xs text-gray-400">Submitted: {mainReport.submittedAt}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{mainReport.submittedBy}</p>
                      </td>
                      <td className="px-4 py-3">{renderMainActions(mainReport)}</td>
                    </tr>

                    {/* Sub-rows (older years) */}
                    {isExpanded && olderReports.map((sub) => (
                      <tr key={sub.id} className="bg-gray-50/60 hover:bg-gray-100/60 transition-colors">
                        <td className="px-4 py-2" /> {/* no checkbox */}
                        <td className="px-1 py-2" /> {/* no expand arrow */}
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2 pl-8">
                            <span className="text-gray-300">└</span>
                            <span className="text-xs text-gray-500">{fmtYear(sub.year)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2" /> {/* year already shown in country cell */}
                        <td className="px-4 py-2">{renderStatusBadge(sub)}</td>
                        <td className="px-4 py-2">{renderProgress(sub)}</td>
                        <td className="px-4 py-2">
                          <p className="text-xs text-gray-500">{sub.lastUpdated}</p>
                        </td>
                        <td className="px-4 py-2">
                          <p className="text-xs text-gray-500">{sub.submittedBy}</p>
                        </td>
                        <td className="px-4 py-2">{renderSubActions(sub)}</td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
              {paginatedGroups.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                    No reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">
              {totalGroups > 0
                ? showAll
                  ? `Showing all ${totalGroups} countries (${totalReportsCount} reports)`
                  : `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, totalGroups)} of ${totalGroups} countries (${totalReportsCount} reports)`
                : 'No reports'}
            </p>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-400">Per page:</label>
              <select
                value={showAll ? 'All' : String(itemsPerPage)}
                onChange={e => handleItemsPerPageChange(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="All">All</option>
              </select>
            </div>
          </div>
          {!showAll && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Archive {selectedReports.size} Report{selectedReports.size > 1 ? 's' : ''}?</h3>
            <p className="text-sm text-gray-500 mb-4">
              The selected reports will be archived. They can be restored later from the archive.
            </p>
            <div className="max-h-40 overflow-y-auto mb-4 border border-gray-100 rounded-lg p-2">
              {searchedReports.filter(r => selectedReports.has(r.id)).map(r => (
                <p key={r.id} className="text-xs text-gray-600 py-0.5">{r.country} ({r.year}-{r.year + 1})</p>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const toArchive = searchedReports.filter(r => selectedReports.has(r.id));
                  for (const r of toArchive) { onArchive?.(r); }
                  const count = toArchive.length;
                  setSelectedReports(new Set());
                  setShowBulkDeleteConfirm(false);
                  setBulkToast(`${count} report${count > 1 ? 's' : ''} archived successfully.`);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Archive {selectedReports.size} Report{selectedReports.size > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Review Modal */}
      {/* Bulk Archive Toast */}
      {bulkToast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-emerald-600 text-white rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          {bulkToast}
        </div>
      )}

      {revisionReport && (
        <RevisionReviewModal
          report={{
            ...revisionReport,
            data: convexAllReports.find(r => r.id === revisionReport.id)?.data ?? {},
          }}
          reviewerName={authUser?.name ?? 'Reviewer'}
          onClose={() => setRevisionReport(null)}
          onRevisionSent={handleRevisionSent}
        />
      )}
    </div>
  );
}

