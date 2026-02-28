import { useState } from 'react';
import {
  getCurrentFiscalYear,
  formatFiscalYear,
  getAvailableFiscalYears,
  isYearOpen,
  setYearStatus,
} from '@/lib/fiscalYear';
import { getReports } from '@/services/dataService';

export function YearManagement() {
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const [confirmAction, setConfirmAction] = useState<{
    year: number;
    action: 'close' | 'open';
  } | null>(null);

  const currentFY = getCurrentFiscalYear();
  const nextFY = currentFY + 1;
  const availableYears = getAvailableFiscalYears();
  const allReports = getReports();

  const currentOpen = isYearOpen(currentFY);
  const currentReportCount = allReports.filter(r => r.year === currentFY).length;

  // Previous years: everything in availableYears that is < currentFY, sorted desc
  const previousYears = availableYears.filter(y => y < currentFY);

  // Next year: only show if it's not already in available years as "current"
  const nextYearOpen = isYearOpen(nextFY);
  // Show next year row only if it hasn't been explicitly opened yet, OR it's already opened
  const nextYearExists = availableYears.includes(nextFY);

  const handleConfirm = () => {
    if (!confirmAction) return;
    setYearStatus(confirmAction.year, confirmAction.action === 'open' ? 'open' : 'closed');
    setConfirmAction(null);
    refresh();
  };

  const reportCount = (year: number) => allReports.filter(r => r.year === year).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <span className="text-lg">📅</span>
        <h3 className="text-sm font-bold text-gray-800">Fiscal Year Management</h3>
      </div>

      <div className="px-6 py-4 space-y-5">
        {/* Current Year */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Year</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-gray-800">{formatFiscalYear(currentFY)}</span>
              <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-bold">Current</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                currentOpen
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : 'text-gray-500 bg-gray-100 border border-gray-200'
              }`}>
                {currentOpen ? 'Open' : 'Closed'}
              </span>
              <span className="text-xs text-gray-400">({currentReportCount} reports)</span>
            </div>
          </div>
          {currentOpen ? (
            <button
              onClick={() => setConfirmAction({ year: currentFY, action: 'close' })}
              className="px-3.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              Close Year
            </button>
          ) : (
            <button
              onClick={() => setConfirmAction({ year: currentFY, action: 'open' })}
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              Reopen Year
            </button>
          )}
        </div>

        {/* Previous Years */}
        {previousYears.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Previous Years</p>
            <div className="space-y-1.5">
              {previousYears.map(year => {
                const open = isYearOpen(year);
                const count = reportCount(year);
                return (
                  <div key={year} className="flex items-center gap-2 text-xs text-gray-600 py-1">
                    <span className="font-medium text-gray-700">{formatFiscalYear(year)}</span>
                    <span className="text-gray-300">&mdash;</span>
                    <span className={open ? 'text-emerald-600 font-medium' : 'text-gray-400'}>{open ? 'Open' : 'Closed'}</span>
                    <span className="text-gray-300">({count} report{count !== 1 ? 's' : ''})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Year */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Next Year</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-medium text-gray-700">{formatFiscalYear(nextFY)}</span>
              <span className="text-gray-300">&mdash;</span>
              {nextYearExists && nextYearOpen ? (
                <span className="text-emerald-600 font-medium">Open ({reportCount(nextFY)} reports)</span>
              ) : (
                <span className="text-gray-400">Not yet opened</span>
              )}
            </div>
            {!(nextYearExists && nextYearOpen) ? (
              <button
                onClick={() => setConfirmAction({ year: nextFY, action: 'open' })}
                className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Open New Year
              </button>
            ) : (
              <button
                onClick={() => setConfirmAction({ year: nextFY, action: 'close' })}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h4 className="text-sm font-bold text-gray-800 mb-2">
              {confirmAction.action === 'close' ? 'Close' : 'Open'} {formatFiscalYear(confirmAction.year)}?
            </h4>
            <p className="text-xs text-gray-500 mb-5">
              {confirmAction.action === 'close'
                ? 'Country representatives will no longer be able to submit or edit reports for this fiscal year.'
                : 'This will allow country representatives to submit reports for this fiscal year.'}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors ${
                  confirmAction.action === 'close'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmAction.action === 'close' ? 'Close Year' : 'Open Year'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
