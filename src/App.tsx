import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { ReportForm } from "./components/form/ReportForm";
import { ReportsList, StatusCards, FilterPanel, ReportDetailModal } from "./components/reports";
import { CompileSection } from "./components/compile";
import { SearchSection } from "./components/search/SearchSection";
import { AuditLogSection } from "./components/audit/AuditLogSection";
import { ImportHistoricalData } from "./components/import/ImportHistoricalData";
import { FactoryReset } from "./components/admin/FactoryReset";
import { SettingsPage } from "./components/settings/SettingsPage";
import { CountryDashboard } from "./components/country-rep/CountryDashboard";
import { DeskInchargeDashboard } from "./components/desk-incharge/DeskInchargeDashboard";
import { DeadlineCountdown } from "./components/shared/DeadlineCountdown";
import { useAuth } from "./contexts/AuthContext";
import { getCurrentFiscalYear, formatFiscalYear } from "./lib/fiscalYear";
import { getCountriesForRep, ALL_COUNTRIES } from "./data/countries";
import type { StoredReport } from "./services/dataService";
import { useConvexData } from "./contexts/ConvexDataContext";
import { isReportLocked } from "./lib/deadline";
import { REPORT_FORM_SECTIONS } from "./data/reportFormSchema";
import "./App.css";

gsap.registerPlugin(ScrollTrigger);

/** Helper: get a numeric value from report data, checking both long and short field keys */
function reportNum(data: Record<string, string | number>, longKey: string): number {
  const v = data[longKey] ?? data[longKey.split('_')[0]];
  if (v === undefined || v === null || v === '') return 0;
  return typeof v === 'number' ? v : Number(v) || 0;
}

/** Compute real dashboard summary stats from report data */
function computeDashboardStats(reports: StoredReport[], assignedCountries?: string[]) {
  const currentFiscalYear = getCurrentFiscalYear();
  const filtered = assignedCountries
    ? reports.filter(r => assignedCountries.includes(r.country))
    : reports;

  // Current fiscal year reports
  const currentReports = filtered.filter(r => r.year === currentFiscalYear);

  // Previous fiscal year reports
  const prevReports = filtered.filter(r => r.year === currentFiscalYear - 1);

  const sumField = (reps: StoredReport[], key: string) =>
    reps.reduce((s, r) => s + reportNum(r.data, key), 0);

  return {
    baits: sumField(currentReports, 'b1_total_baits'),
    baitsPrev: sumField(prevReports, 'b1_total_baits'),
    mosques: sumField(currentReports, 'm4_mosques_total'),
    mosquesPrev: sumField(prevReports, 'm4_mosques_total'),
    jamaats: sumField(currentReports, 'j3_jamaats_total'),
    jamaatsPrev: sumField(prevReports, 'j3_jamaats_total'),
    patients: sumField(currentReports, 'kk7_patients_treated'),
    patientsPrev: sumField(prevReports, 'kk7_patients_treated'),
    leaflets: sumField(currentReports, 'll1_leaflets_distributed'),
    leafletsPrev: sumField(prevReports, 'll1_leaflets_distributed'),
    charity: sumField(currentReports, 'kk10_charity_amount_usd'),
    charityPrev: sumField(prevReports, 'kk10_charity_amount_usd'),
    // For continent chart
    continentData: (() => {
      const continents: Record<string, { baits: number; mosques: number; jamaats: number }> = {};
      for (const r of currentReports) {
        const continent = r.continent || 'Other';
        if (!continents[continent]) continents[continent] = { baits: 0, mosques: 0, jamaats: 0 };
        continents[continent].baits += reportNum(r.data, 'b1_total_baits');
        continents[continent].mosques += reportNum(r.data, 'm4_mosques_total');
        continents[continent].jamaats += reportNum(r.data, 'j3_jamaats_total');
      }
      return Object.entries(continents).map(([name, vals]) => ({
        name: name === 'North America' ? 'N. America' : name === 'South America' ? 'S. America' : name,
        ...vals,
      }));
    })(),
    // Top countries by bai'ats
    topCountries: currentReports
      .map(r => ({ country: r.country, baits: reportNum(r.data, 'b1_total_baits'), flag: r.flag || '' }))
      .sort((a, b) => b.baits - a.baits)
      .slice(0, 8),
    // Recent reports — current fiscal year only
    recentReports: currentReports
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
      .slice(0, 6)
      .map(r => ({ country: r.country, status: r.status, date: r.lastUpdated.split('T')[0], progress: r.progress })),
    // Trend data by year
    trendData: (() => {
      const years = Array.from({ length: 5 }, (_, i) => currentFiscalYear - 4 + i);
      return years.map(y => {
        const yearReports = filtered.filter(r => r.year === y);
        return {
          year: String(y),
          baits: yearReports.reduce((s, r) => s + reportNum(r.data, 'b1_total_baits'), 0),
          mosques: yearReports.reduce((s, r) => s + reportNum(r.data, 'm4_mosques_total'), 0),
          jamaats: yearReports.reduce((s, r) => s + reportNum(r.data, 'j3_jamaats_total'), 0),
        };
      });
    })(),
  };
}

// Report type definition
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


const statusColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  submitted: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  draft: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" },
  revision_requested: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
};

const chartFieldMap: Record<string, { key: string; label: string; color: string }> = {
  baits: { key: "baits", label: "Bai'ats", color: "#2563eb" },
  mosques: { key: "mosques", label: "Mosques", color: "#059669" },
  jamaats: { key: "jamaats", label: "Jama'ats", color: "#d97706" },
};

// Components
function SummaryCard({ title, titleUr: _titleUr, value, prev, icon, accent }: {
  title: string;
  titleUr: string;
  value: number; 
  prev?: number; 
  icon: string; 
  accent: string;
}) {
  const trend = prev ? ((value - prev) / prev * 100).toFixed(1) : 0;
  const isUp = Number(trend) > 0;
  const accentMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    rose: "from-rose-500 to-rose-600",
    violet: "from-violet-500 to-violet-600",
    cyan: "from-cyan-500 to-cyan-600",
  };

  const [displayValue, setDisplayValue] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      const trigger = ScrollTrigger.create({
        trigger: cardRef.current,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.to({ val: 0 }, {
            val: value,
            duration: 0.8,
            ease: "power2.out",
            onUpdate: function() {
              setDisplayValue(Math.floor(this.targets()[0].val));
            }
          });
        }
      });
      return () => trigger.kill();
    }
  }, [value]);

  return (
    <div
      ref={cardRef}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
    >
      <div className={`h-1 bg-gradient-to-r ${accentMap[accent]}`} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl flex-shrink-0">{icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900 leading-tight">
                {displayValue.toLocaleString()}
              </p>
              {prev ? (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                  {isUp ? "↑" : "↓"}{Math.abs(Number(trend))}%
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }: { icon: string; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-blue-50 text-blue-700 shadow-sm"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && badge > 0 ? (
        <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">{badge}</span>
      ) : null}
    </button>
  );
}

// Reports Section Component
function ReportsSection({ onEditReport }: { onEditReport: (country: string, year: number) => void }) {
  const { user: authUser } = useAuth();
  const { activeReports: convexActiveReports, archivedReports: convexArchivedReports, updateReportStatus, archiveReport: doArchive, restoreReport: doRestore, deleteReport: doDelete } = useConvexData();
  const [filters, setFilters] = useState<{
    status: string[];
    continent: string[];
    year: string[];
    progressRange: { min: number; max: number } | null;
  }>({
    status: [],
    continent: [],
    year: [String(getCurrentFiscalYear())],
    progressRange: null,
  });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const userRole: 'admin' | 'contributor' | 'viewer' =
    authUser?.role === 'super_admin' || authUser?.role === 'desk_incharge' ? 'admin' : 'viewer';
  // Read reports from Convex (already role-filtered server-side)
  const storedToReport = (r: StoredReport): Report => ({
    id: r.id,
    country: r.country,
    countryCode: r.countryCode || '',
    flag: r.flag || '',
    continent: r.continent || '',
    year: r.year,
    status: r.status,
    progress: r.progress,
    lastUpdated: r.lastUpdated,
    submittedBy: r.submittedBy || '',
    submittedAt: r.submittedAt,
    approvedBy: r.approvedBy,
    approvedAt: r.approvedAt,
  });

  const liveReports: Report[] = convexActiveReports.map(storedToReport);

  const archivedReportsList: Report[] = convexArchivedReports.map(storedToReport);

  // Status cards count only the current fiscal year
  const currentYearReports = liveReports.filter(r => r.year === getCurrentFiscalYear());
  const stats = {
    total: currentYearReports.length,
    draft: currentYearReports.filter(r => r.status === 'draft').length,
    submitted: currentYearReports.filter(r => r.status === 'submitted' || r.status === 'update_requested').length,
    approved: currentYearReports.filter(r => r.status === 'approved').length,
    revisionRequested: currentYearReports.filter(r => r.status === 'revision_requested' || r.status === 'update_in_progress').length,
    pendingApproval: currentYearReports.filter(r => r.status === 'submitted' || r.status === 'update_requested').length,
  };

  // Apply filters from FilterPanel to liveReports
  const filteredReports = liveReports.filter(r => {
    if (filters.status.length > 0 && !filters.status.includes(r.status)) return false;
    if (filters.continent.length > 0 && !filters.continent.some(fc => fc.toLowerCase() === r.continent.toLowerCase().replace(/\s+/g, '_'))) return false;
    if (filters.year.length > 0 && !filters.year.includes(r.year.toString())) return false;
    if (filters.progressRange && (r.progress < filters.progressRange.min || r.progress > filters.progressRange.max)) return false;
    return true;
  });

  const handleClearFilters = () => {
    setFilters({
      status: [] as string[],
      continent: [] as string[],
      year: [String(getCurrentFiscalYear())],
      progressRange: null,
    });
  };

  const handleApprove = async (report: Report) => {
    const now = new Date().toISOString();
    await updateReportStatus(report.id, 'approved', {
      approvedAt: now,
      approvedBy: authUser?.name ?? 'Admin',
    });
    setSelectedReport(null);
  };

  const handleRequestRevision = async (report: Report) => {
    await updateReportStatus(report.id, 'revision_requested');
    setSelectedReport(null);
  };

  const handleAllowUpdate = async (report: Report) => {
    await updateReportStatus(report.id, 'update_in_progress');
    setSelectedReport(null);
  };

  const handleDenyUpdate = async (report: Report) => {
    const reason = window.prompt('Reason for denying update request (optional):') ?? '';
    await updateReportStatus(report.id, 'approved', {
      updateDeniedReason: reason,
    });
    setSelectedReport(null);
  };

  const handleArchiveReport = async (report: Report) => {
    if (!window.confirm(`Archive the report for ${report.country} (${report.year}-${report.year + 1})?\n\nThe report will be moved to the archive and can be restored later.\n\nNote: The Country Representative will be notified that this report has been deleted.`)) return;
    await doArchive(report.id);
    setSelectedReport(null);
  };

  const handleRestoreReport = async (report: Report) => {
    await doRestore(report.id);
  };

  const handlePermanentDeleteReport = async (report: Report) => {
    if (!window.confirm(`PERMANENTLY delete the report for ${report.country} (${report.year})? This action CANNOT be undone.`)) return;
    await doDelete(report.id);
  };

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{showArchived ? 'Archived Reports' : 'Country Reports'}</h2>
          <p className="text-sm text-gray-500">{showArchived ? 'View and restore archived reports' : 'Manage and review annual reports from all countries'}</p>
        </div>
        {authUser?.role === 'super_admin' && (
          <button
            onClick={() => setShowArchived(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors ${showArchived ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            {showArchived ? '← Back to Active Reports' : `Archived (${archivedReportsList.length})`}
          </button>
        )}
      </div>

      {/* Status Cards — only for active view */}
      {!showArchived && <StatusCards stats={stats} />}

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Filters Sidebar — only for active view */}
        {!showArchived && showFilters && (
          <div className="w-64 flex-shrink-0">
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onClear={handleClearFilters}
              reports={liveReports}
            />
          </div>
        )}

        {/* Reports Table */}
        <div className="flex-1">
          {showArchived ? (
            <ReportsList
              reports={archivedReportsList}
              onView={(report) => setSelectedReport(report)}
              onEdit={() => {}}
              onApprove={() => {}}
              onRequestRevision={() => {}}
              onDelete={() => {}}
              onExport={() => {}}
              userRole={userRole}
              isArchiveView
              onRestore={(report) => handleRestoreReport(report)}
              onPermanentDelete={(report) => handlePermanentDeleteReport(report)}
            />
          ) : (
            <ReportsList
              reports={filteredReports}
              onView={(report) => setSelectedReport(report)}
              onEdit={(report) => onEditReport(report.country, report.year)}
              onApprove={(report) => handleApprove(report)}
              onRequestRevision={(report) => handleRequestRevision(report)}
              onDelete={() => {}}
              onExport={() => {}}
              userRole={userRole}
              onToggleFilters={() => setShowFilters(prev => !prev)}
              onAllowUpdate={(report) => handleAllowUpdate(report)}
              onDenyUpdate={(report) => handleDenyUpdate(report)}
              onArchive={(report) => handleArchiveReport(report)}
            />
          )}
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={{
            ...selectedReport,
            data: (() => {
              const stored = convexActiveReports.find(r => r.id === selectedReport.id);
              return stored?.data ?? {};
            })(),
            comments: [],
            history: [
              ...(selectedReport.submittedAt ? [{ id: '1', action: 'Report Submitted', user: selectedReport.submittedBy, timestamp: selectedReport.submittedAt, details: 'Report submitted for review' }] : []),
              ...(selectedReport.approvedAt ? [{ id: '2', action: 'Report Approved', user: selectedReport.approvedBy || 'Admin', timestamp: selectedReport.approvedAt, details: 'Report approved' }] : []),
            ],
          }}
          onClose={() => setSelectedReport(null)}
          onEdit={() => { onEditReport(selectedReport.country, selectedReport.year); setSelectedReport(null); }}
          onApprove={() => handleApprove(selectedReport)}
          onRequestRevision={() => handleRequestRevision(selectedReport)}
          userRole={userRole}
          onAllowUpdate={() => handleAllowUpdate(selectedReport)}
          onDenyUpdate={() => handleDenyUpdate(selectedReport)}
        />
      )}
    </div>
  );
}

function MyReportTab({ repCountry, managedCountries, onCountryChange, onNavigateToDashboard }: { repCountry: string; managedCountries: string[]; onCountryChange: (c: string) => void; onNavigateToDashboard: () => void }) {
  const { allReports, updateReportStatus, deadline } = useConvexData();
  const [showForm, setShowForm] = useState(false);
  const [showViewForm, setShowViewForm] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateReason, setUpdateReason] = useState('');

  const fiscalYear = getCurrentFiscalYear();
  // Find report for this country+year from Convex data
  const allForCountryYear = allReports.filter(r => r.country === repCountry && r.year === fiscalYear);
  const rawReport = allForCountryYear.find(r => !r.archived) ?? allForCountryYear[0];
  const isArchivedByAdmin = rawReport?.archived === true;
  const existingReport = isArchivedByAdmin ? undefined : rawReport;
  const locked = isReportLocked(fiscalYear, deadline);

  const handleRequestUpdate = async () => {
    if (!updateReason.trim() || !existingReport) return;
    const now = new Date().toISOString();
    await updateReportStatus(existingReport.id, 'update_requested', {
      updateRequestReason: updateReason.trim(),
      updateRequestedAt: now,
    });
    setShowUpdateModal(false);
    setUpdateReason('');
  };

  const status = existingReport?.status;

  return (
    <div>
      {/* Country selector for reps with multiple countries */}
      {managedCountries.length > 1 && (
        <div className="px-6 pt-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Filling report for:</label>
            <div className="flex flex-wrap gap-2">
              {managedCountries.map(c => (
                <button
                  key={c}
                  onClick={() => { onCountryChange(c); setShowForm(false); setShowViewForm(false); }}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    c === repCountry
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deadline Lock Banner */}
      {locked && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-700">
            {!existingReport
              ? 'The submission deadline has passed. Reports can no longer be created.'
              : 'This report is now locked. Contact Wakalat Tabshir directly for any changes.'}
          </p>
        </div>
      )}

      {/* Deleted by Admin banner */}
      {isArchivedByAdmin && !showForm && !showViewForm && (
        <div className="p-6">
          <div className="bg-red-50 rounded-2xl border border-red-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-red-400">&#x1f5d1;&#xfe0f;</span>
            </div>
            <h3 className="text-lg font-bold text-red-800 mb-2">Report Deleted by Administration</h3>
            <p className="text-sm text-red-600 mb-1">
              Your previously submitted report for {repCountry} ({formatFiscalYear(fiscalYear)}) has been removed by the administration.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              If you believe this was done in error, please contact Wakalat Tabshir directly.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowViewForm(true)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              >
                View Deleted Report
              </button>
              {!locked && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Create New Report
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {isArchivedByAdmin && showViewForm && !showForm && (
        <div>
          <div className="px-6 pt-4">
            <button onClick={() => setShowViewForm(false)} className="text-sm text-red-600 hover:text-red-800 font-medium">&larr; Back to status</button>
          </div>
          <ReportForm key={`${repCountry}-archived-view`} countryName={repCountry} year={getCurrentFiscalYear()} readOnly />
        </div>
      )}

      {/* Status-aware UI */}
      {!existingReport && !isArchivedByAdmin && !locked && !showForm && (
        <div className="p-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">No Report Yet</h3>
            <p className="text-sm text-gray-500 mb-4">You haven't started a report for {repCountry} ({formatFiscalYear(fiscalYear)}) yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Create Report
            </button>
          </div>
        </div>
      )}

      {!existingReport && !locked && showForm && (
        <ReportForm
          key={repCountry}
          countryName={repCountry}
          year={getCurrentFiscalYear()}
          onSave={() => {}}
          onSubmit={() => onNavigateToDashboard()}
          onResubmit={() => onNavigateToDashboard()}
        />
      )}

      {existingReport && status === 'draft' && !locked && (
        <div>
          {!showForm && !showViewForm ? (
            <div className="p-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Draft in Progress</h3>
                <p className="text-sm text-gray-500 mb-1">Progress: {existingReport.progress}%</p>
                <p className="text-xs text-gray-400 mb-4">Last updated: {existingReport.lastUpdated}</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Continue Editing
                  </button>
                  <button
                    onClick={() => setShowViewForm(true)}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    👁 Preview
                  </button>
                </div>
              </div>
            </div>
          ) : showViewForm ? (
            <div>
              <div className="px-6 pt-4">
                <button onClick={() => setShowViewForm(false)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">← Back to status</button>
              </div>
              <ReportForm key={`${repCountry}-preview`} countryName={repCountry} year={getCurrentFiscalYear()} readOnly />
            </div>
          ) : (
            <ReportForm
              key={repCountry}
              countryName={repCountry}
              year={getCurrentFiscalYear()}
              onSave={() => {}}
              onSubmit={() => { setShowForm(false); onNavigateToDashboard(); }}
              onResubmit={() => { setShowForm(false); onNavigateToDashboard(); }}
            />
          )}
        </div>
      )}

      {existingReport && status === 'submitted' && !showViewForm && (
        <div className="p-6">
          <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⏳</span>
            </div>
            <h3 className="text-lg font-bold text-blue-800 mb-2">Report Under Review</h3>
            <p className="text-sm text-blue-600">Your report for {repCountry} has been submitted and is awaiting review.</p>
            <p className="text-xs text-blue-400 mt-2">Submitted: {existingReport.submittedAt}</p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setShowViewForm(true)}
                className="px-5 py-2.5 text-sm font-semibold text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
              >
                👁 View Report
              </button>
            </div>
          </div>
        </div>
      )}
      {existingReport && status === 'submitted' && showViewForm && (
        <div>
          <div className="px-6 pt-4">
            <button onClick={() => setShowViewForm(false)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">← Back to status</button>
          </div>
          <ReportForm key={`${repCountry}-view`} countryName={repCountry} year={getCurrentFiscalYear()} readOnly />
        </div>
      )}

      {existingReport && status === 'approved' && !locked && !showViewForm && (
        <div className="p-6">
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-lg font-bold text-emerald-800 mb-2">Report Approved</h3>
            <p className="text-sm text-emerald-600 mb-1">Your report for {repCountry} has been approved.</p>
            <p className="text-xs text-emerald-400 mb-4">Approved: {existingReport.approvedAt}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowViewForm(true)}
                className="px-5 py-2.5 text-sm font-semibold text-emerald-600 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                👁 View Report
              </button>
              <button
                onClick={() => setShowUpdateModal(true)}
                className="px-5 py-2.5 text-sm font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors"
              >
                Request Update
              </button>
            </div>
          </div>
        </div>
      )}
      {existingReport && status === 'approved' && !locked && showViewForm && (
        <div>
          <div className="px-6 pt-4">
            <button onClick={() => setShowViewForm(false)} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">← Back to status</button>
          </div>
          <ReportForm key={`${repCountry}-view`} countryName={repCountry} year={getCurrentFiscalYear()} readOnly />
        </div>
      )}

      {existingReport && status === 'approved' && locked && !showViewForm && (
        <div className="p-6">
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-lg font-bold text-emerald-800 mb-2">Report Approved</h3>
            <p className="text-sm text-emerald-600">Your report for {repCountry} has been approved.</p>
            <p className="text-xs text-emerald-400 mb-4">Approved: {existingReport.approvedAt}</p>
            <button
              onClick={() => setShowViewForm(true)}
              className="px-5 py-2.5 text-sm font-semibold text-emerald-600 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              👁 View Report
            </button>
          </div>
        </div>
      )}
      {existingReport && status === 'approved' && locked && showViewForm && (
        <div>
          <div className="px-6 pt-4">
            <button onClick={() => setShowViewForm(false)} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">← Back to status</button>
          </div>
          <ReportForm key={`${repCountry}-view`} countryName={repCountry} year={getCurrentFiscalYear()} readOnly />
        </div>
      )}

      {existingReport && (status === 'revision_requested') && !locked && (
        <ReportForm
          key={`${repCountry}-revision`}
          countryName={repCountry}
          year={getCurrentFiscalYear()}
          onSave={() => {}}
          onSubmit={() => { onNavigateToDashboard(); }}
          onResubmit={() => { onNavigateToDashboard(); }}
        />
      )}

      {existingReport && status === 'revision_requested' && locked && !showViewForm && (
        <div className="p-6">
          <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-bold text-amber-800 mb-2">Revision Requested</h3>
            <p className="text-sm text-amber-600">A revision was requested but the deadline has passed. Contact Wakalat Tabshir directly.</p>
            <button
              onClick={() => setShowViewForm(true)}
              className="mt-4 px-5 py-2.5 text-sm font-semibold text-amber-600 bg-white border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
            >
              👁 View Report
            </button>
          </div>
        </div>
      )}
      {existingReport && status === 'revision_requested' && locked && showViewForm && (
        <div>
          <div className="px-6 pt-4">
            <button onClick={() => setShowViewForm(false)} className="text-sm text-amber-600 hover:text-amber-800 font-medium">← Back to status</button>
          </div>
          <ReportForm key={`${repCountry}-view`} countryName={repCountry} year={getCurrentFiscalYear()} readOnly />
        </div>
      )}

      {existingReport && status === 'update_requested' && !showViewForm && (
        <div className="p-6">
          <div className="bg-purple-50 rounded-2xl border border-purple-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔄</span>
            </div>
            <h3 className="text-lg font-bold text-purple-800 mb-2">Update Request Pending</h3>
            <p className="text-sm text-purple-600">Your request to update the report is awaiting admin approval.</p>
            {existingReport.updateRequestReason && (
              <p className="text-xs text-purple-400 mt-2">Reason: {existingReport.updateRequestReason}</p>
            )}
            <button
              onClick={() => setShowViewForm(true)}
              className="mt-4 px-5 py-2.5 text-sm font-semibold text-purple-600 bg-white border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors"
            >
              👁 View Report
            </button>
          </div>
        </div>
      )}
      {existingReport && status === 'update_requested' && showViewForm && (
        <div>
          <div className="px-6 pt-4">
            <button onClick={() => setShowViewForm(false)} className="text-sm text-purple-600 hover:text-purple-800 font-medium">← Back to status</button>
          </div>
          <ReportForm key={`${repCountry}-view`} countryName={repCountry} year={getCurrentFiscalYear()} readOnly />
        </div>
      )}

      {existingReport && status === 'update_in_progress' && !locked && (
        <ReportForm
          key={`${repCountry}-update`}
          countryName={repCountry}
          year={getCurrentFiscalYear()}
          onSave={() => {}}
          onSubmit={() => { onNavigateToDashboard(); }}
          onResubmit={() => { onNavigateToDashboard(); }}
        />
      )}

      {/* Update Request Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Request Update</h3>
            <p className="text-sm text-gray-500 mb-4">Explain why you need to update the approved report.</p>
            <textarea
              value={updateReason}
              onChange={(e) => setUpdateReason(e.target.value.slice(0, 500))}
              placeholder="Reason for update..."
              rows={4}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{updateReason.length}/500</p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowUpdateModal(false); setUpdateReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestUpdate}
                disabled={!updateReason.trim()}
                className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewReportPage({ onDone }: { onDone: () => void }) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const countryNames = ALL_COUNTRIES.map(c => c.name).sort();
  if (!selectedCountry) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-800">Create New Report</h2>
        <p className="text-sm text-gray-500">Select a country to begin filling the annual report.</p>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full max-w-md px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
        >
          <option value="">Select a country...</option>
          {countryNames.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    );
  }
  return (
    <ReportForm
      countryName={selectedCountry}
      year={getCurrentFiscalYear()}
      onSave={() => {}}
      onSubmit={() => onDone()}
    />
  );
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  desk_incharge: 'Desk In-charge',
  country_rep: 'Country Rep',
};

// ── Dashboard flat fields for quick search ──
interface DashFlatField {
  code: string;
  label: string;
  sectionTitle: string;
}

const DASHBOARD_FLAT_FIELDS: DashFlatField[] = (() => {
  const fields: DashFlatField[] = [];
  for (const section of REPORT_FORM_SECTIONS) {
    for (const f of section.fields) {
      fields.push({ code: f.code, label: f.label, sectionTitle: `${section.number}. ${section.title}` });
    }
    if (section.subsections) {
      for (const sub of section.subsections) {
        for (const f of sub.fields) {
          fields.push({ code: f.code, label: f.label, sectionTitle: `${section.number}. ${section.title}` });
        }
      }
    }
  }
  return fields;
})();

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Tab ↔ URL hash mapping for page persistence ──
const TAB_HASH_MAP: Record<string, string> = {
  '#reports': 'reports',
  '#compile': 'compile',
  '#search': 'search',
  '#settings': 'settings',
  '#audit': 'audit',
  '#import': 'import',
  '#reset': 'factory-reset',
  '#overview': 'overview',
  '#my-dashboard': 'my-dashboard',
  '#my-report': 'my-report',
};
const HASH_FOR_TAB: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_HASH_MAP).map(([h, t]) => [t, h])
);

function resolveInitialTab(role?: string): string {
  // 1. Check URL hash
  const hash = window.location.hash;
  if (hash && TAB_HASH_MAP[hash]) return TAB_HASH_MAP[hash];
  // 2. Check localStorage
  const stored = localStorage.getItem('ar_active_tab');
  if (stored && Object.values(TAB_HASH_MAP).includes(stored)) return stored;
  // 3. Role default
  return role === 'country_rep' ? 'my-report' : 'overview';
}

function App() {
  const { user, logout } = useAuth();
  const { activeReports: allStoredReports } = useConvexData();

  // User is loading from Convex — show nothing until ready
  if (!user) return null;
  const isCountryRep = user?.role === 'country_rep';
  const primaryCountry = user?.assignedCountries?.[0] ?? '';
  const managedCountries = isCountryRep && primaryCountry
    ? getCountriesForRep(primaryCountry)
    : user?.assignedCountries ?? [];
  const [selectedRepCountry, setSelectedRepCountry] = useState(primaryCountry);
  const repCountry = selectedRepCountry || primaryCountry;

  // Count submitted reports awaiting review (from Convex data)
  const pendingReviewCount = allStoredReports.filter(r => r.status === 'submitted').length;

  const [activeTab, setActiveTabRaw] = useState(() => resolveInitialTab(user?.role));

  const setActiveTab = useCallback((tabOrFn: string | ((prev: string) => string)) => {
    setActiveTabRaw(prev => {
      const next = typeof tabOrFn === 'function' ? tabOrFn(prev) : tabOrFn;
      localStorage.setItem('ar_active_tab', next);
      const hash = HASH_FOR_TAB[next];
      if (hash) window.history.replaceState(null, '', hash);
      return next;
    });
  }, []);

  // Sync hash on mount
  useEffect(() => {
    const hash = HASH_FOR_TAB[activeTab];
    if (hash && window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      const tab = TAB_HASH_MAP[window.location.hash];
      if (tab) setActiveTabRaw(tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const [editingReport, setEditingReport] = useState<{ country: string; year: number } | null>(null);
  // Reset editing state when navigating away from reports
  useEffect(() => {
    if (activeTab !== 'reports') setEditingReport(null);
  }, [activeTab]);

  // Reset tab + selected country when user switches (dev switcher or login)
  useEffect(() => {
    if (!user) return;
    if (user.role === 'country_rep') {
      setSelectedRepCountry(user.assignedCountries?.[0] ?? '');
      setActiveTab(prev => (prev === 'my-dashboard' || prev === 'my-report') ? prev : 'my-report');
    } else {
      setActiveTab(prev => (prev === 'my-dashboard' || prev === 'my-report') ? 'overview' : prev);
    }
  }, [user, setActiveTab]);
  const [selectedChart, setSelectedChart] = useState("baits");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  // ── Dashboard Quick Search ──
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const debouncedDashQuery = useDebouncedValue(dashboardSearchQuery, 300);

  const dashboardSearchResults = useMemo(() => {
    if (!debouncedDashQuery || debouncedDashQuery.length < 2) return [];
    const q = debouncedDashQuery.toLowerCase();
    const activeReports = allStoredReports;
    const results: { country: string; section: string; field: string; value: string | number; reportId: string; year: number }[] = [];
    for (const report of activeReports) {
      if (!report.data) continue;
      for (const ff of DASHBOARD_FLAT_FIELDS) {
        const val = report.data[ff.code];
        if (val === undefined || val === null || val === '') continue;
        const strVal = String(val).toLowerCase();
        if (
          report.country.toLowerCase().includes(q) ||
          ff.label.toLowerCase().includes(q) ||
          ff.sectionTitle.toLowerCase().includes(q) ||
          strVal.includes(q)
        ) {
          results.push({
            country: report.country,
            section: ff.sectionTitle,
            field: ff.label,
            value: val,
            reportId: report.id,
            year: report.year,
          });
        }
        if (results.length >= 10) break;
      }
      if (results.length >= 10) break;
    }
    return results;
  }, [debouncedDashQuery]);

  const currentField = chartFieldMap[selectedChart];

  // ── Role-based filtering for desk_incharge overview ──
  const isDeskIncharge = user?.role === 'desk_incharge';
  const assignedCountryList = user?.assignedCountries ?? [];
  const totalCountryCount = ALL_COUNTRIES.length;
  const countryCount = isDeskIncharge ? assignedCountryList.length : totalCountryCount;

  // Compute real dashboard stats from Convex (already excludes archived)
  const dashStats = computeDashboardStats(allStoredReports, isDeskIncharge ? assignedCountryList : undefined);
  const filteredTopCountries = dashStats.topCountries;
  const filteredRecentReports = dashStats.recentReports;

  // Calculate real submission stats from active reports (current fiscal year only)
  const currentFY = getCurrentFiscalYear();
  const { submittedCount, approvedCount, revisionCount, draftCount } = (() => {
    const relevantReports = (isDeskIncharge
      ? allStoredReports.filter(r => assignedCountryList.includes(r.country))
      : allStoredReports
    ).filter(r => r.year === currentFY);
    return {
      submittedCount: relevantReports.filter(r => r.status === 'submitted').length,
      approvedCount: relevantReports.filter(r => r.status === 'approved').length,
      revisionCount: relevantReports.filter(r => r.status === 'revision_requested').length,
      draftCount: relevantReports.filter(r => r.status === 'draft').length,
    };
  })();
  const totalSubmissions = submittedCount + approvedCount;
  const pendingCount = countryCount - totalSubmissions - revisionCount - draftCount;
  const overviewCompletion = countryCount > 0
    ? Math.round((totalSubmissions) / countryCount * 100)
    : 0;

  const sidebarRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);
  const trendsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Page load animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(sidebarRef.current,
        { x: -100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.45, ease: "power2.out" }
      );
      gsap.fromTo(headerRef.current,
        { y: -10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out", delay: 0.1 }
      );
    });
    return () => ctx.revert();
  }, []);

  // Banner scroll animation
  useEffect(() => {
    if (bannerRef.current) {
      const trigger = ScrollTrigger.create({
        trigger: bannerRef.current,
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.fromTo(bannerRef.current,
            { scale: 0.98, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" }
          );
          gsap.to({ val: 0 }, {
            val: overviewCompletion,
            duration: 0.9,
            ease: "power2.out",
            onUpdate: function() {
              setProgressPercent(Math.floor(this.targets()[0].val));
            }
          });
        }
      });
      return () => trigger.kill();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewCompletion]);

  // Cards scroll animation
  useEffect(() => {
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll(".summary-card");
      const trigger = ScrollTrigger.create({
        trigger: cardsRef.current,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.fromTo(cards,
            { y: 18, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.06, duration: 0.5, ease: "power2.out" }
          );
        }
      });
      return () => trigger.kill();
    }
  }, []);

  // Charts scroll animation
  useEffect(() => {
    if (chartsRef.current) {
      const leftCard = chartsRef.current.querySelector(".chart-left");
      const rightCard = chartsRef.current.querySelector(".chart-right");
      const trigger = ScrollTrigger.create({
        trigger: chartsRef.current,
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.fromTo(leftCard,
            { x: -18, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.55, ease: "power2.out" }
          );
          gsap.fromTo(rightCard,
            { x: 18, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.55, ease: "power2.out", delay: 0.1 }
          );
        }
      });
      return () => trigger.kill();
    }
  }, []);

  // Trends scroll animation
  useEffect(() => {
    if (trendsRef.current) {
      const leftCard = trendsRef.current.querySelector(".trend-left");
      const rightItems = trendsRef.current.querySelectorAll(".trend-item");
      const trigger = ScrollTrigger.create({
        trigger: trendsRef.current,
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.fromTo(leftCard,
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
          );
          gsap.fromTo(rightItems,
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.08, duration: 0.4, ease: "power2.out", delay: 0.2 }
          );
        }
      });
      return () => trigger.kill();
    }
  }, []);

  // Search scroll animation
  useEffect(() => {
    if (searchRef.current) {
      const trigger = ScrollTrigger.create({
        trigger: searchRef.current,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.fromTo(searchRef.current,
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
          );
        }
      });
      return () => trigger.kill();
    }
  }, []);

  const userInitials = user.name.split(' ').map(n => n[0]).join('');

  return (
    <div className="flex h-screen bg-[#F6F7F9]" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`${sidebarCollapsed ? "w-16" : "w-64"} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 fixed h-full z-50 overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              AR
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-sm font-bold text-gray-800">Annual Reports</h1>
                <p className="text-[10px] text-gray-400">{isCountryRep ? `${repCountry}${managedCountries.length > 1 ? ` +${managedCountries.length - 1} more` : ''} • ${formatFiscalYear(getCurrentFiscalYear())}` : `${countryCount}${isDeskIncharge ? ' Assigned' : ''} Countries • ${formatFiscalYear(getCurrentFiscalYear())}`}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {isCountryRep ? (
            <>
              <NavItem icon="📊" label="My Dashboard" active={activeTab === "my-dashboard"} onClick={() => setActiveTab("my-dashboard")} />
              <NavItem icon="📝" label="My Report" active={activeTab === "my-report"} onClick={() => setActiveTab("my-report")} />
            </>
          ) : (
            <>
              <NavItem icon="📊" label="Overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
              <NavItem icon="📝" label="Reports" active={activeTab === "reports"} onClick={() => setActiveTab("reports")} badge={pendingReviewCount} />
              {(user.role === 'super_admin' || user.role === 'desk_incharge') && (
                <NavItem icon="📈" label="Compile" active={activeTab === "compile"} onClick={() => setActiveTab("compile")} />
              )}
              <NavItem icon="🔍" label="Search" active={activeTab === "search"} onClick={() => setActiveTab("search")} />
              {user.role === 'super_admin' && (
                <NavItem icon="📥" label="Import" active={activeTab === "import"} onClick={() => setActiveTab("import")} />
              )}
              {user.role === 'super_admin' && (
                <NavItem icon="⚙️" label="Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
              )}
              {(user.role === 'super_admin' || user.role === 'desk_incharge') && (
                <NavItem icon="📋" label="Audit Log" active={activeTab === "audit"} onClick={() => setActiveTab("audit")} />
              )}
              {user.role === 'super_admin' && (
                <NavItem icon="🗑️" label="Reset" active={activeTab === "factory-reset"} onClick={() => setActiveTab("factory-reset")} />
              )}
            </>
          )}
        </nav>

        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">{userInitials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-400">{roleLabels[user.role]}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? "ml-16" : "ml-64"}`}>
        {/* Header Bar */}
        <header ref={headerRef} className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h14M3 10h14M3 14h14"/></svg>
              </button>
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {activeTab === "overview" ? "Dashboard Overview"
                    : activeTab === "my-dashboard" ? "My Dashboard"
                    : activeTab === "my-report" ? `${repCountry} — Report`
                    : activeTab === "new-report" ? "New Report"
                    : activeTab === "import" ? "Import Historical Data"
                    : activeTab === "factory-reset" ? "Factory Reset"
                    : activeTab === "settings" ? "Settings"
                    : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h2>
                <p className="text-xs text-gray-400">
                  {isCountryRep ? `${repCountry}${managedCountries.length > 1 ? ` (${managedCountries.length} countries)` : ''} • Reporting Year ${formatFiscalYear(getCurrentFiscalYear())}` : isDeskIncharge ? `${countryCount} Assigned Countries • Reporting Year ${formatFiscalYear(getCurrentFiscalYear())}` : `Reporting Year ${formatFiscalYear(getCurrentFiscalYear())}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user.role === 'super_admin' && (
                <button
                  onClick={() => setActiveTab("new-report")}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#2B6EE3] text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  + New Report
                </button>
              )}
            </div>
          </div>
        </header>

        {activeTab === "my-dashboard" && isCountryRep ? (
          <CountryDashboard
            onNavigateToReport={() => setActiveTab("my-report")}
            selectedCountry={repCountry}
            managedCountries={managedCountries}
            onCountryChange={setSelectedRepCountry}
          />
        ) : activeTab === "my-report" && isCountryRep ? (
          <MyReportTab
            repCountry={repCountry}
            managedCountries={managedCountries}
            onCountryChange={setSelectedRepCountry}
            onNavigateToDashboard={() => setActiveTab('my-dashboard')}
          />
        ) : activeTab === "new-report" ? (
          <NewReportPage onDone={() => setActiveTab('reports')} />
        ) : activeTab === "reports" ? (
          editingReport ? (
            <div>
              <div className="px-6 pt-4">
                <button
                  onClick={() => setEditingReport(null)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 mb-4"
                >
                  ← Back to Reports
                </button>
              </div>
              <ReportForm
                key={`${editingReport.country}-${editingReport.year}`}
                countryName={editingReport.country}
                year={editingReport.year}
                onSave={() => {}}
                onSubmit={() => setEditingReport(null)}
              />
            </div>
          ) : (
            <ReportsSection onEditReport={(country, year) => setEditingReport({ country, year })} />
          )
        ) : activeTab === "compile" ? (
          <CompileSection />
        ) : activeTab === "search" ? (
          <SearchSection />
        ) : activeTab === "settings" ? (
          <SettingsPage />
        ) : activeTab === "audit" ? (
          <AuditLogSection />
        ) : activeTab === "import" ? (
          <ImportHistoricalData onDone={() => setActiveTab('reports')} />
        ) : activeTab === "factory-reset" ? (
          <FactoryReset onDone={() => setActiveTab('overview')} />
        ) : (
        <div className="p-6 space-y-6">
          {/* Deadline Countdown — visible to desk_incharge */}
          {isDeskIncharge && <DeadlineCountdown />}

          {/* Submission Progress Banner */}
          <div
            ref={bannerRef}
            className="bg-gradient-to-r from-[#2B6EE3] to-[#1E4DB3] rounded-2xl p-5 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{formatFiscalYear(getCurrentFiscalYear())} Report Collection Progress</h3>
                <p className="text-blue-100 text-sm mt-1">{totalSubmissions} of {countryCount} countries have submitted • <button onClick={() => setActiveTab('reports')} className="underline hover:text-white font-semibold">{pendingCount} pending</button></p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">{progressPercent}%</p>
                <p className="text-blue-200 text-xs">completion rate</p>
              </div>
            </div>
            <div className="mt-4 bg-blue-800/40 rounded-full h-3 overflow-hidden">
              <div className="h-full rounded-full flex">
                <div className="bg-emerald-400 h-full transition-all duration-1000 ease-out" style={{ width: `${countryCount > 0 ? (approvedCount / countryCount * 100) : 0}%` }} title={`Approved: ${approvedCount}`} />
                <div className="bg-blue-300 h-full transition-all duration-1000 ease-out" style={{ width: `${countryCount > 0 ? (submittedCount / countryCount * 100) : 0}%` }} title={`Submitted: ${submittedCount}`} />
                <div className="bg-amber-400 h-full transition-all duration-1000 ease-out" style={{ width: `${countryCount > 0 ? (revisionCount / countryCount * 100) : 0}%` }} title={`Revision: ${revisionCount}`} />
              </div>
            </div>
            <div className="flex gap-6 mt-2 text-xs text-blue-100">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/> {approvedCount} Approved</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-300 inline-block"/> {submittedCount} Submitted</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/> {revisionCount} In Review</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/30 inline-block"/> {pendingCount} Pending</span>
            </div>
          </div>

          {/* Report Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Reports', value: submittedCount + approvedCount + revisionCount + draftCount, bg: 'bg-blue-50', iconBg: 'bg-blue-100', icon: '📊', iconColor: 'text-blue-600' },
              { label: 'Submitted', value: submittedCount, bg: 'bg-amber-50', iconBg: 'bg-amber-100', icon: '📤', iconColor: 'text-amber-600' },
              { label: 'Approved', value: approvedCount, bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', icon: '✅', iconColor: 'text-emerald-600' },
              { label: 'Pending', value: draftCount, bg: 'bg-rose-50', iconBg: 'bg-rose-100', icon: '⏳', iconColor: 'text-rose-600' },
              { label: 'Revision Requested', value: revisionCount, bg: 'bg-orange-50', iconBg: 'bg-orange-100', icon: '🔄', iconColor: 'text-orange-600' },
            ].map(card => (
              <div key={card.label} className={`${card.bg} rounded-xl px-4 py-3 border border-gray-100`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 ${card.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className="text-base">{card.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 truncate">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 leading-tight">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Cards */}
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="summary-card">
              <SummaryCard title="Total Bai'ats" titleUr="کل بیعتیں" value={dashStats.baits} prev={dashStats.baitsPrev} icon="🤝" accent="green" />
            </div>
            <div className="summary-card">
              <SummaryCard title="Total Mosques" titleUr="کل مساجد" value={dashStats.mosques} prev={dashStats.mosquesPrev} icon="🕌" accent="blue" />
            </div>
            <div className="summary-card">
              <SummaryCard title="Total Jama'ats" titleUr="کل جماعتیں" value={dashStats.jamaats} prev={dashStats.jamaatsPrev} icon="📍" accent="amber" />
            </div>
            <div className="summary-card">
              <SummaryCard title="Patients Treated" titleUr="مریضوں کا علاج" value={dashStats.patients} prev={dashStats.patientsPrev} icon="🏥" accent="rose" />
            </div>
            <div className="summary-card">
              <SummaryCard title="Leaflets" titleUr="لیفلیٹس" value={dashStats.leaflets} prev={dashStats.leafletsPrev} icon="📄" accent="violet" />
            </div>
            <div className="summary-card">
              <SummaryCard title="Charity (USD)" titleUr="چیریٹی" value={dashStats.charity} prev={dashStats.charityPrev} icon="💰" accent="cyan" />
            </div>
          </div>

          {/* Desk In-charge: Assigned Countries, Country Reps, Assign Countries */}
          {isDeskIncharge && <DeskInchargeDashboard />}

          {/* Charts Row */}
          <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Continent Bar Chart */}
            <div className="chart-left lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">By Continent</h3>
                <div className="flex gap-1">
                  {Object.entries(chartFieldMap).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedChart(key)}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-all duration-200 ${
                        selectedChart === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dashStats.continentData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                    formatter={(value) => [value.toLocaleString(), currentField.label]}
                  />
                  <Bar dataKey={currentField.key} fill={currentField.color} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Countries */}
            <div className="chart-right bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Top Countries — Bai'ats</h3>
              <div className="space-y-3">
                {filteredTopCountries.map((c, i) => (
                  <div key={c.country} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                    <span className="text-lg">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{c.country}</p>
                      <div className="mt-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${(c.baits / (filteredTopCountries[0]?.baits || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-600">{c.baits.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trends + Recent Submissions Row */}
          <div ref={trendsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Line Chart */}
            <div className="trend-left lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">5-Year Trends</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dashStats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="baits" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} name="Bai'ats" />
                  <Line type="monotone" dataKey="mosques" stroke="#059669" strokeWidth={2.5} dot={{ r: 4 }} name="Mosques" />
                  <Line type="monotone" dataKey="jamaats" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4 }} name="Jama'ats" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Reports */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Recent Submissions</h3>
              <div className="space-y-3">
                {filteredRecentReports.map((r) => {
                  const sc = statusColors[r.status];
                  return (
                    <div key={r.country} className={`trend-item p-3 rounded-xl border ${sc.border} ${sc.bg} hover:brightness-95 transition-all duration-150 cursor-pointer`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-700">{r.country}</span>
                        <span className={`flex items-center gap-1 text-[10px] font-semibold ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {r.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">{r.date}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-gray-200 rounded-full h-1">
                            <div className={`h-full rounded-full ${r.progress === 100 ? "bg-emerald-500" : "bg-blue-400"} transition-all duration-500`} style={{ width: `${r.progress}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400">{r.progress}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Search */}
          <div ref={searchRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">Quick Search</h3>
              {debouncedDashQuery && (
                <button
                  onClick={() => { setDashboardSearchQuery(''); setActiveTab('search'); }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all in Search →
                </button>
              )}
            </div>
            <input
              type="text"
              value={dashboardSearchQuery}
              onChange={e => setDashboardSearchQuery(e.target.value)}
              placeholder="Search across all reports... e.g., 'Ghana', 'mosque', 'hospital'"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2B6EE3] focus:border-transparent outline-none transition-all"
            />
            {dashboardSearchResults.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Country</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Section</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Field</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardSearchResults.map((r, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                        onClick={() => setActiveTab('reports')}
                      >
                        <td className="px-3 py-2 text-gray-800 font-medium">{r.country}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{r.section}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{r.field}</td>
                        <td className="px-3 py-2 text-gray-800 font-medium text-xs">{r.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {debouncedDashQuery && debouncedDashQuery.length >= 2 && dashboardSearchResults.length === 0 && (
              <p className="mt-3 text-xs text-gray-400 text-center py-2">No results found for "{debouncedDashQuery}"</p>
            )}
          </div>

          {/* Footer */}
          <footer className="pt-6 pb-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <p>© {new Date().getFullYear()} Annual Reports System. All rights reserved.</p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
                <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
                <a href="#" className="hover:text-gray-600 transition-colors">Support</a>
              </div>
            </div>
          </footer>
        </div>
        )}
      </main>
    </div>
  );
}

export default App;
