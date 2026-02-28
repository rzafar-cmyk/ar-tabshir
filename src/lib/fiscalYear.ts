import { getReports } from '@/services/dataService';

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
 */
export function getAvailableFiscalYears(): number[] {
  const current = getCurrentFiscalYear();
  const yearSet = new Set<number>([current]);
  for (const r of getReports()) {
    yearSet.add(r.year);
  }
  return Array.from(yearSet).sort((a, b) => b - a);
}

const YEAR_STATUS_KEY = 'ar_year_status';

export function getYearStatuses(): Record<number, 'open' | 'closed'> {
  try {
    const raw = localStorage.getItem(YEAR_STATUS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export function setYearStatus(year: number, status: 'open' | 'closed'): void {
  const current = getYearStatuses();
  current[year] = status;
  localStorage.setItem(YEAR_STATUS_KEY, JSON.stringify(current));
}

export function isYearOpen(year: number): boolean {
  const statuses = getYearStatuses();
  // Default: current fiscal year is open, others closed
  if (statuses[year] !== undefined) return statuses[year] === 'open';
  return year === getCurrentFiscalYear();
}
