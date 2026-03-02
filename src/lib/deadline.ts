/**
 * Deadline lock utility.
 * Accepts deadline from Convex settings (or localStorage fallback)
 * and determines whether report submission is locked for a given year.
 *
 * A 10-day grace period is added after the deadline date.
 *
 * Year convention: `reportYear` is the START year of the reporting period.
 * e.g. 2025 = the "2025-2026" period (July 2025 – June 2026).
 * A report is considered "old" only when the current date is past June of
 * (reportYear + 1), i.e. the reporting period has fully ended.
 */

const GRACE_DAYS = 10;

/**
 * @param reportYear - Fiscal year to check
 * @param deadline - Deadline string from Convex settings (or null). Falls back to localStorage if not provided.
 */
export function isReportLocked(reportYear: number, deadline?: string | null): boolean {
  const now = new Date();
  const periodEndYear = reportYear + 1;
  const periodOver = now.getFullYear() > periodEndYear ||
    (now.getFullYear() === periodEndYear && now.getMonth() >= 6);
  if (periodOver) return true;

  // Use provided deadline, fall back to localStorage
  const raw = deadline !== undefined ? deadline : localStorage.getItem('ar_deadline');
  if (!raw) return false;

  try {
    const dl = new Date(raw);
    if (isNaN(dl.getTime())) return false;

    const lockDate = new Date(dl);
    lockDate.setUTCDate(lockDate.getUTCDate() + GRACE_DAYS);

    return now > lockDate;
  } catch {
    return false;
  }
}
