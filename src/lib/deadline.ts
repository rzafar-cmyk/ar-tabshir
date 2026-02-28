/**
 * Deadline lock utility.
 * Reads `ar_deadline` from localStorage (same key used by DeadlineCountdown component)
 * and determines whether report submission is locked for a given year.
 *
 * A 10-day grace period is added after the deadline date.
 *
 * Year convention: `reportYear` is the START year of the reporting period.
 * e.g. 2025 = the "2025-2026" period (July 2025 – June 2026).
 * A report is considered "old" only when the current date is past June of
 * (reportYear + 1), i.e. the reporting period has fully ended.
 */

const DEADLINE_KEY = 'ar_deadline';
const GRACE_DAYS = 10;

export function isReportLocked(reportYear: number): boolean {
  // A report is only auto-locked by age if its entire reporting period
  // has ended (past June 30 of reportYear+1). getMonth() is 0-indexed,
  // so 6 = July. "month >= 6" means July or later = period is over.
  const now = new Date();
  const periodEndYear = reportYear + 1;
  const periodOver = now.getFullYear() > periodEndYear ||
    (now.getFullYear() === periodEndYear && now.getMonth() >= 6);
  if (periodOver) return true;

  // If no deadline is set, reports are open
  const raw = localStorage.getItem(DEADLINE_KEY);
  if (!raw) return false;

  try {
    const deadline = new Date(raw);
    if (isNaN(deadline.getTime())) return false;

    // Add grace period
    const lockDate = new Date(deadline);
    lockDate.setUTCDate(lockDate.getUTCDate() + GRACE_DAYS);

    return now > lockDate;
  } catch {
    return false;
  }
}
