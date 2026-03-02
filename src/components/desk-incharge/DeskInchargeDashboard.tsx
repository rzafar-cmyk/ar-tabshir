import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_COUNTRIES } from '@/data/countries';
import { ChevronDown, ChevronRight, MapPin, Users, X, FileText, Clock, CheckCircle2, AlertTriangle, Eye, Send } from 'lucide-react';
import { useConvexData } from '@/contexts/ConvexDataContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-react';
import { getCurrentFiscalYear, formatFiscalYear } from '@/lib/fiscalYear';
import { ReportDetailModal } from '@/components/reports/ReportDetailModal';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface CountryGroup {
  name: string;
  subCountries: string[];
}

interface ReportRecord {
  id: string;
  country: string;
  flag: string;
  year: number;
  status: string;
  progress: number;
  lastUpdated: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  data?: Record<string, string | number>;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function DeskInchargeDashboard() {
  const { user } = useAuth();
  const { user: clerkUser } = useUser();
  const { activeReports: convexActiveReports, updateReportStatus } = useConvexData();
  const convexUsers = useQuery(api.users.getAllUsers) ?? [];
  const assignCountriesMut = useMutation(api.users.assignCountriesToUser);
  const assigned = user?.assignedCountries ?? [];

  // ── Reports for assigned countries (Convex data is reactive, auto-updates) ──
  const currentFY = getCurrentFiscalYear();
  const { pendingReports, allMyReports } = useMemo(() => {
    const assignedSet = new Set(assigned);
    const currentYearReports = (convexActiveReports as ReportRecord[]).filter(r => assignedSet.has(r.country) && r.year === currentFY);
    return {
      pendingReports: currentYearReports.filter(r => r.status === 'submitted'),
      allMyReports: currentYearReports,
    };
  }, [assigned, currentFY, convexActiveReports]);

  // ── View report state ──
  const [viewingReport, setViewingReport] = useState<ReportRecord | null>(null);

  // ── Country grouping (independent vs managed) ──
  const { groups, independents } = useMemo(() => {
    const assignedSet = new Set(assigned);
    const groups: CountryGroup[] = [];
    const independents: string[] = [];

    const managedByMap = new Map<string, string[]>();
    for (const c of ALL_COUNTRIES) {
      if (c.managedBy && assignedSet.has(c.name) && assignedSet.has(c.managedBy)) {
        const existing = managedByMap.get(c.managedBy) ?? [];
        existing.push(c.name);
        managedByMap.set(c.managedBy, existing);
      }
    }

    const childSet = new Set<string>();
    for (const children of managedByMap.values()) {
      for (const c of children) childSet.add(c);
    }

    for (const name of assigned) {
      if (childSet.has(name)) continue;
      const subs = managedByMap.get(name) ?? [];
      if (subs.length > 0) {
        groups.push({ name, subCountries: subs });
      } else {
        independents.push(name);
      }
    }

    return { groups, independents };
  }, [assigned]);

  // ── Country reps for assigned countries (from Convex) ──
  const countryReps = useMemo(() => {
    const assignedSet = new Set(assigned);
    return convexUsers
      .filter(
        (u) =>
          u.role === 'country_rep' &&
          u.assignedCountries?.some((c: string) => assignedSet.has(c)),
      )
      .map(u => ({
        id: u._id as string,
        name: u.name,
        email: u.email,
        role: u.role,
        assignedCountries: u.assignedCountries,
        isActive: u.isActive,
      }));
  }, [assigned, convexUsers]);

  // ── State for assign countries modal ──
  const [assignParent, setAssignParent] = useState<string | null>(null);
  const [assignSelection, setAssignSelection] = useState<Set<string>>(new Set());
  const [assignToast, setAssignToast] = useState('');

  const openAssignModal = (parentCountry: string) => {
    const assignedSet = new Set(assigned);
    const currentSubs = ALL_COUNTRIES
      .filter((c) => c.managedBy === parentCountry && assignedSet.has(c.name))
      .map((c) => c.name);
    setAssignSelection(new Set(currentSubs));
    setAssignParent(parentCountry);
  };

  const handleAssignSave = useCallback(async () => {
    if (!assignParent) return;
    const rep = convexUsers.find(
      (u) =>
        u.role === 'country_rep' &&
        u.assignedCountries?.includes(assignParent),
    );
    if (rep) {
      const newCountries = [assignParent, ...Array.from(assignSelection)];
      await assignCountriesMut({
        userId: rep._id as Id<"users">,
        callerClerkId: clerkUser?.id ?? '',
        assignedCountries: newCountries,
      });
      setAssignToast(`Updated sub-countries for ${assignParent}.`);
      setTimeout(() => setAssignToast(''), 2500);
    }
    setAssignParent(null);
  }, [assignParent, assignSelection, convexUsers, assignCountriesMut, clerkUser]);

  const candidateSubCountries = useMemo(() => {
    if (!assignParent) return [];
    return assigned.filter((c) => c !== assignParent);
  }, [assigned, assignParent]);

  // ── Expanded state for parent country groups ──
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const toggleParent = (name: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // ── Status helpers ──
  const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    submitted: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: <Send className="w-3.5 h-3.5" />, label: 'Awaiting Review' },
    approved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Approved' },
    draft: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', icon: <FileText className="w-3.5 h-3.5" />, label: 'Draft' },
    revision_requested: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Revision Requested' },
  };

  return (
    <div className="space-y-6">

      {/* ── 1. Pending Reports (Awaiting Review) ── */}
      {pendingReports.length > 0 && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center relative">
              <Send className="w-4 h-4 text-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                {pendingReports.length}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Reports Awaiting Your Review</h3>
              <p className="text-xs text-gray-500">{pendingReports.length} report{pendingReports.length !== 1 ? 's' : ''} submitted and pending your approval</p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {pendingReports.map((report) => (
              <div key={report.id} className="px-6 py-4 flex items-center gap-4 hover:bg-blue-50/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{report.country}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Submitted {report.submittedAt || report.lastUpdated}
                    </span>
                    {report.submittedBy && (
                      <span className="text-xs text-gray-400">by {report.submittedBy}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    {report.progress}% complete
                  </span>
                  <button
                    onClick={() => setViewingReport(report)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-sm transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All Reports Status Table ── */}
      {allMyReports.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Country Reports — {formatFiscalYear(currentFY)}</h3>
              <p className="text-xs text-gray-400">{allMyReports.length} report{allMyReports.length !== 1 ? 's' : ''} across your assigned countries</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Country</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Last Updated</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allMyReports.map((report) => {
                  const sc = statusConfig[report.status] || statusConfig.draft;
                  return (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-gray-800">{report.country}</td>
                      <td className="px-6 py-3.5 text-xs text-gray-600">{formatFiscalYear(report.year)}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.bg} ${sc.text}`}>
                          {sc.icon}
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${report.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${report.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{report.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-500">{report.lastUpdated}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => setViewingReport(report)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Countries with no reports yet */}
          {assigned.length > allMyReports.length && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                {assigned.length - allMyReports.length} assigned countr{assigned.length - allMyReports.length === 1 ? 'y has' : 'ies have'} not started their report yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* No reports at all */}
      {allMyReports.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-sm font-bold text-gray-600">No Reports Yet</h3>
          <p className="text-xs text-gray-400 mt-1">None of your {assigned.length} assigned countries have started their annual report.</p>
        </div>
      )}

      {/* ── 2. My Assigned Countries ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">My Assigned Countries</h3>
            <p className="text-xs text-gray-400">{assigned.length} countries assigned to you</p>
          </div>
        </div>

        <div className="p-6">
          {/* Parent countries with sub-countries */}
          {groups.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Parent Countries ({groups.length})
              </p>
              <div className="space-y-2">
                {groups.map((g) => (
                  <div key={g.name} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleParent(g.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      {expandedParents.has(g.name) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm font-medium text-gray-800">{g.name}</span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {g.subCountries.length} sub-countr{g.subCountries.length === 1 ? 'y' : 'ies'}
                      </span>
                      <div className="flex-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAssignModal(g.name);
                        }}
                        className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Assign Countries
                      </button>
                    </button>
                    {expandedParents.has(g.name) && (
                      <div className="px-4 pb-3 pl-11 space-y-1">
                        {g.subCountries.map((sc) => (
                          <div key={sc} className="flex items-center gap-2 text-xs text-gray-500 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            {sc}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Independent countries */}
          {independents.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Independent Countries ({independents.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {independents.map((c) => (
                  <span key={c} className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg border border-gray-200">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Country Reps ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Country Reps</h3>
            <p className="text-xs text-gray-400">{countryReps.length} representatives for your countries</p>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {countryReps.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              No country reps found for your assigned countries.
            </div>
          ) : (
            countryReps.map((rep) => (
              <div key={rep.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                  {rep.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{rep.name}</p>
                  <p className="text-xs text-gray-400 truncate">{rep.email}</p>
                </div>
                <div className="text-xs text-gray-500 hidden sm:block">
                  {rep.assignedCountries?.[0] ?? '—'}
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    rep.isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {rep.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Report View Modal — reuse the same component as Admin ── */}
      {viewingReport && (
        <ReportDetailModal
          report={{
            id: viewingReport.id,
            country: viewingReport.country,
            flag: viewingReport.flag || '',
            year: viewingReport.year,
            status: viewingReport.status,
            progress: viewingReport.progress,
            submittedBy: viewingReport.submittedBy || '',
            submittedAt: viewingReport.submittedAt,
            data: viewingReport.data || {},
            comments: [],
            history: [],
          }}
          userRole="admin"
          onClose={() => setViewingReport(null)}
          onEdit={() => setViewingReport(null)}
          onApprove={async () => {
            const now = new Date().toISOString();
            await updateReportStatus(viewingReport.id, 'approved', {
              approvedAt: now,
              approvedBy: user?.name || 'desk_incharge',
            });
            setViewingReport(null);
          }}
          onRequestRevision={async () => {
            await updateReportStatus(viewingReport.id, 'revision_requested');
            setViewingReport(null);
          }}
        />
      )}

      {/* ── Assign Countries Modal ── */}
      {assignParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-800">Assign Sub-Countries to {assignParent}</h4>
              <button onClick={() => setAssignParent(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Select which of your assigned countries should be managed by <strong>{assignParent}</strong>.
            </p>
            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-gray-100">
              {candidateSubCountries.map((c) => (
                <label key={c} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={assignSelection.has(c)}
                    onChange={() => {
                      setAssignSelection((prev) => {
                        const next = new Set(prev);
                        if (next.has(c)) next.delete(c); else next.add(c);
                        return next;
                      });
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{c}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">{assignSelection.size} countr{assignSelection.size === 1 ? 'y' : 'ies'} selected</p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setAssignParent(null)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleAssignSave} className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {assignToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg">
          {assignToast}
        </div>
      )}
    </div>
  );
}
