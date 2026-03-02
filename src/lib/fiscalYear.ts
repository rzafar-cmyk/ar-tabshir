/**
 * Fiscal year runs July 1 → June 30.
 * The "fiscal year" is identified by the *start* calendar year.
 * e.g. July 2025 – June 2026 → fiscal year 2025.
 *
 * If the current month is July (index 6) or later, the fiscal year equals this calendar year.
 * Otherwise it equals last calendar year.
 */
export function getCurrentFiscalYear(): number {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

/** Format a fiscal year number as a range string: 2025 → "2025-2026" */
export function formatFiscalYear(year: number): string {
  return `${year}-${year + 1}`;
}

/**
 * Return all fiscal years that have report data, always including the current
 * fiscal year. Sorted descending (newest first).
 *
 * @param reports - Array of reports (from Convex or localStorage). If not provided, returns just the current fiscal year.
 */
export function getAvailableFiscalYears(reports?: { year: number }[]): number[] {
  const current = getCurrentFiscalYear();
  const yearSet = new Set<number>([current]);
  if (reports) {
    for (const r of reports) {
      yearSet.add(r.year);
    }
  }
  return Array.from(yearSet).sort((a, b) => b - a);
}

/**
 * Check if a year is open for submission.
 * @param year - Fiscal year to check
 * @param yearStatuses - Year status map from Convex settings. Falls back to localStorage if not provided.
 */
export function isYearOpen(year: number, yearStatuses?: Record<number, 'open' | 'closed'>): boolean {
  const statuses = yearStatuses ?? getYearStatusesFromLocalStorage();
  if (statuses[year] !== undefined) return statuses[year] === 'open';
  return year === getCurrentFiscalYear();
}

// ── localStorage fallback (kept for transition) ──

function getYearStatusesFromLocalStorage(): Record<number, 'open' | 'closed'> {
  try {
    const raw = localStorage.getItem('ar_year_status');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

/** @deprecated Use Convex settings. Kept for backward compatibility. */
export function getYearStatuses(): Record<number, 'open' | 'closed'> {
  return getYearStatusesFromLocalStorage();
}

/** @deprecated Use Convex setYearStatus mutation. Kept for backward compatibility. */
export function setYearStatus(year: number, status: 'open' | 'closed'): void {
  const current = getYearStatuses();
  current[year] = status;
  localStorage.setItem('ar_year_status', JSON.stringify(current));
}
