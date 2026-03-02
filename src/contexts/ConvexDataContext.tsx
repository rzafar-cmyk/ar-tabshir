/**
 * ConvexDataContext
 *
 * Bridges Convex reactive queries to the rest of the app.
 * Provides data + mutation functions that mirror the old dataService API
 * so components can migrate incrementally.
 */
import { createContext, useContext, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { StoredReport } from '@/services/dataService';
import type { AuditEvent, FieldChange } from '@/lib/audit';

// ── Type for Convex report documents ────────────────────────
type ConvexReport = NonNullable<ReturnType<typeof useQuery<typeof api.reports.getAllReports>>>[number];
type ConvexAuditEvent = NonNullable<ReturnType<typeof useQuery<typeof api.auditLog.getAuditEvents>>>[number];

// ── Converters ──────────────────────────────────────────────

function toStoredReport(doc: ConvexReport): StoredReport {
  return {
    id: doc._id as string,
    country: doc.country,
    countryCode: doc.countryCode ?? '',
    flag: doc.flag ?? '',
    continent: doc.continent ?? '',
    year: doc.year,
    status: doc.status as StoredReport['status'],
    progress: doc.progress ?? 0,
    lastUpdated: doc.lastUpdated ?? '',
    submittedBy: doc.submittedBy ?? '',
    submittedByUserId: doc.submittedByUserId ?? '',
    submittedAt: doc.submittedAt,
    approvedBy: doc.approvedBy,
    approvedAt: doc.approvedAt,
    data: doc.data ?? {},
    revisionFlags: doc.revisionFlags,
    updateRequestReason: doc.updateRequestReason,
    updateRequestedAt: doc.updateRequestedAt,
    updateDeniedReason: doc.updateDeniedReason,
    archived: doc.archived,
    archivedAt: doc.archivedAt,
    archivedBy: doc.archivedBy,
  };
}

function toAuditEvent(doc: ConvexAuditEvent): AuditEvent {
  let changes: FieldChange[] | undefined;
  if (doc.changes) {
    try { changes = JSON.parse(doc.changes); } catch { /* ignore */ }
  }
  return {
    id: doc._id as string,
    action: doc.action,
    country: doc.country,
    user: doc.userName,
    role: doc.userRole,
    timestamp: new Date(doc.timestamp).toISOString(),
    details: doc.details,
    changes,
  };
}

// ── Context Type ────────────────────────────────────────────

interface ConvexDataContextType {
  // Data (auto-updated via Convex reactive queries)
  allReports: StoredReport[];
  activeReports: StoredReport[];
  archivedReports: StoredReport[];
  auditEvents: AuditEvent[];
  isLoading: boolean;

  // Settings
  deadline: string | null;
  yearStatuses: Record<number, 'open' | 'closed'>;

  // Report mutations
  saveReport: (report: {
    country: string;
    countryCode?: string;
    flag?: string;
    continent?: string;
    year: number;
    status: string;
    progress: number;
    data: Record<string, string | number>;
    submittedBy?: string;
    submittedByUserId?: string;
    submittedAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    revisionFlags?: unknown;
  }) => Promise<string>;

  updateReportStatus: (
    reportId: string,
    status: string,
    extra?: {
      approvedBy?: string;
      approvedAt?: string;
      updateDeniedReason?: string;
      updateRequestReason?: string;
      updateRequestedAt?: string;
      revisionFlags?: unknown;
    }
  ) => Promise<void>;

  archiveReport: (reportId: string) => Promise<void>;
  restoreReport: (reportId: string) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;

  importReports: (reports: Array<{
    country: string;
    countryCode?: string;
    flag?: string;
    continent?: string;
    year: number;
    status: string;
    progress: number;
    data: Record<string, string | number>;
    submittedBy?: string;
    submittedByUserId?: string;
    submittedAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    lastUpdated?: string;
  }>) => Promise<{ created: number; updated: number }>;

  // Audit mutations
  logAuditEvent: (event: {
    action: string;
    country: string;
    details?: string;
    changes?: string;
    reportId?: string;
  }) => Promise<void>;

  // Settings mutations
  setDeadline: (deadline: string | null) => Promise<void>;
  setYearStatus: (year: number, status: 'open' | 'closed') => Promise<void>;

  // Factory reset
  factoryReset: () => Promise<void>;
}

const ConvexDataContext = createContext<ConvexDataContextType | null>(null);

// ── Provider ────────────────────────────────────────────────

export function ConvexDataProvider({ children }: { children: ReactNode }) {
  // ── Queries ──
  const rawReports = useQuery(api.reports.getAllReports);
  const rawAuditEvents = useQuery(api.auditLog.getAuditEvents);
  const rawSettings = useQuery(api.settings.getAllSettings);

  const isLoading = rawReports === undefined;

  // ── Convert and derive ──
  const allReports = useMemo(
    () => (rawReports ?? []).map(toStoredReport),
    [rawReports]
  );

  const activeReports = useMemo(() => {
    const active = allReports.filter((r) => !r.archived);
    // Deduplicate: one report per country+year, keep the one updated most recently
    const map = new Map<string, StoredReport>();
    for (const r of active) {
      const key = `${r.country}::${r.year}`;
      const existing = map.get(key);
      if (!existing || r.lastUpdated > existing.lastUpdated) {
        map.set(key, r);
      }
    }
    return Array.from(map.values());
  }, [allReports]);

  const archivedReports = useMemo(
    () => allReports.filter((r) => r.archived),
    [allReports]
  );

  const auditEvents = useMemo(
    () => (rawAuditEvents ?? []).map(toAuditEvent),
    [rawAuditEvents]
  );

  // ── Settings ──
  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of rawSettings ?? []) {
      map[s.key] = s.value;
    }
    return map;
  }, [rawSettings]);

  const deadline = settingsMap['deadline'] ?? null;

  const yearStatuses = useMemo(() => {
    const raw = settingsMap['year_statuses'];
    if (!raw) return {};
    try { return JSON.parse(raw) as Record<number, 'open' | 'closed'>; } catch { return {}; }
  }, [settingsMap]);

  // ── Mutation hooks ──
  const saveReportMutation = useMutation(api.reports.saveReport);
  const updateReportStatusMutation = useMutation(api.reports.updateReportStatus);
  const archiveReportMutation = useMutation(api.reports.archiveReport);
  const restoreReportMutation = useMutation(api.reports.restoreReport);
  const deleteReportMutation = useMutation(api.reports.deleteReport);
  const importReportsMutation = useMutation(api.reports.importReports);
  const factoryResetMutation = useMutation(api.reports.factoryResetReports);
  const logAuditMutation = useMutation(api.auditLog.logAuditEvent);
  const setSettingMutation = useMutation(api.settings.setSetting);
  const deleteSettingMutation = useMutation(api.settings.deleteSetting);

  // ── Wrapped mutations ──

  const saveReport = useCallback(
    async (report: Parameters<ConvexDataContextType['saveReport']>[0]) => {
      const id = await saveReportMutation(report);
      return id as string;
    },
    [saveReportMutation]
  );

  const updateReportStatus = useCallback(
    async (
      reportId: string,
      status: string,
      extra?: Parameters<ConvexDataContextType['updateReportStatus']>[2]
    ) => {
      await updateReportStatusMutation({
        reportId: reportId as Id<"reports">,
        status,
        approvedBy: extra?.approvedBy,
        approvedAt: extra?.approvedAt,
        updateDeniedReason: extra?.updateDeniedReason,
        updateRequestReason: extra?.updateRequestReason,
        updateRequestedAt: extra?.updateRequestedAt,
        revisionFlags: extra?.revisionFlags,
      });
    },
    [updateReportStatusMutation]
  );

  const archiveReport = useCallback(
    async (reportId: string) => {
      await archiveReportMutation({ reportId: reportId as Id<"reports"> });
    },
    [archiveReportMutation]
  );

  const restoreReport = useCallback(
    async (reportId: string) => {
      await restoreReportMutation({ reportId: reportId as Id<"reports"> });
    },
    [restoreReportMutation]
  );

  const deleteReport = useCallback(
    async (reportId: string) => {
      await deleteReportMutation({ reportId: reportId as Id<"reports"> });
    },
    [deleteReportMutation]
  );

  const importReports = useCallback(
    async (reports: Parameters<ConvexDataContextType['importReports']>[0]) => {
      return await importReportsMutation({ reports });
    },
    [importReportsMutation]
  );

  const logAuditEvent = useCallback(
    async (event: Parameters<ConvexDataContextType['logAuditEvent']>[0]) => {
      await logAuditMutation(event);
    },
    [logAuditMutation]
  );

  const setDeadline = useCallback(
    async (dl: string | null) => {
      if (dl) {
        await setSettingMutation({ key: 'deadline', value: dl });
      } else {
        await deleteSettingMutation({ key: 'deadline' });
      }
    },
    [setSettingMutation, deleteSettingMutation]
  );

  const setYearStatus = useCallback(
    async (year: number, status: 'open' | 'closed') => {
      const current = { ...yearStatuses };
      current[year] = status;
      await setSettingMutation({
        key: 'year_statuses',
        value: JSON.stringify(current),
      });
    },
    [setSettingMutation, yearStatuses]
  );

  const factoryReset = useCallback(async () => {
    await factoryResetMutation();
  }, [factoryResetMutation]);

  const value: ConvexDataContextType = {
    allReports,
    activeReports,
    archivedReports,
    auditEvents,
    isLoading,
    deadline,
    yearStatuses,
    saveReport,
    updateReportStatus,
    archiveReport,
    restoreReport,
    deleteReport,
    importReports,
    logAuditEvent,
    setDeadline,
    setYearStatus,
    factoryReset,
  };

  return (
    <ConvexDataContext.Provider value={value}>
      {children}
    </ConvexDataContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────

export function useConvexData(): ConvexDataContextType {
  const ctx = useContext(ConvexDataContext);
  if (!ctx)
    throw new Error('useConvexData must be used within a ConvexDataProvider');
  return ctx;
}
