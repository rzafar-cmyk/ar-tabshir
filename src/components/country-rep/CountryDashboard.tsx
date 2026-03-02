import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConvexData } from '@/contexts/ConvexDataContext';
import { DeadlineCountdown } from '@/components/shared/DeadlineCountdown';
import type { StoredReport } from '@/services/dataService';
import { getCurrentFiscalYear, formatFiscalYear } from '@/lib/fiscalYear';

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
  submitted: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  revision_requested: { label: 'Revision Requested', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

function num(report: StoredReport | undefined, key: string): number {
  if (!report) return 0;
  // Try exact key first (seed data uses long keys like 'b1_total_baits'),
  // then fall back to short schema code (form data uses 'b1')
  const v = report.data[key] ?? report.data[key.split('_')[0]];
  if (v === undefined || v === null || v === '') return 0;
  return typeof v === 'number' ? v : Number(v) || 0;
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-gray-400">—</span>;
  if (previous === 0) return <span className="text-xs font-semibold text-emerald-600">New</span>;
  const pct = ((current - previous) / previous * 100).toFixed(1);
  const up = current >= previous;
  return (
    <span className={`text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? '↑' : '↓'} {Math.abs(Number(pct))}%
    </span>
  );
}

interface CountryDashboardProps {
  onNavigateToReport: () => void;
  /** The currently-selected country (controlled by parent) */
  selectedCountry?: string;
  /** All countries this rep manages */
  managedCountries?: string[];
  /** Called when the rep picks a different country */
  onCountryChange?: (country: string) => void;
}

export function CountryDashboard({ onNavigateToReport, selectedCountry, managedCountries, onCountryChange }: CountryDashboardProps) {
  const { user } = useAuth();
  const { allReports: convexReports } = useConvexData();
  const country = selectedCountry ?? user?.assignedCountries?.[0] ?? '';
  const countries = managedCountries ?? user?.assignedCountries ?? [];

  const currentYear = getCurrentFiscalYear();
  const { reportCurrent, reportPrev, reportPrevPrev } = useMemo(() => {
    const reports = convexReports.filter(r => r.country === country);
    return {
      reportCurrent: reports.find(r => r.year === currentYear),
      reportPrev: reports.find(r => r.year === currentYear - 1),
      reportPrevPrev: reports.find(r => r.year === currentYear - 2),
    };
  }, [country, currentYear, convexReports]);

  const currentStatus = reportCurrent?.status ?? 'draft';
  const currentProgress = reportCurrent?.progress ?? 0;
  const sc = statusConfig[currentStatus];

  const metrics = [
    { label: "Total Bai'ats", key: 'b1_total_baits', icon: '🤝', accent: 'blue' },
    { label: 'Mosques', key: 'm4_mosques_total', icon: '🕌', accent: 'emerald' },
    { label: "Jama'ats", key: 'j3_jamaats_total', icon: '📍', accent: 'amber' },
    { label: 'Patients Treated', key: 'kk7_patients_treated', icon: '🏥', accent: 'rose' },
  ];

  const accentBorder: Record<string, string> = {
    blue: 'border-blue-200',
    emerald: 'border-emerald-200',
    amber: 'border-amber-200',
    rose: 'border-rose-200',
  };

  const accentBg: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
  };

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Country header — single row strip */}
      <div className="bg-gradient-to-r from-[#2B6EE3] to-[#1E4DB3] rounded-xl px-5 py-3 text-white shadow-sm flex items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base font-bold truncate">{country}</h2>
          <span className="text-blue-200 text-xs whitespace-nowrap">{formatFiscalYear(currentYear)}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${sc.bg} ${sc.text} flex-shrink-0`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>
        <div className="flex items-center gap-3 ml-auto flex-shrink-0">
          <div className="flex items-center gap-2 w-32">
            <div className="flex-1 bg-blue-800/40 rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${currentProgress}%` }} />
            </div>
            <span className="text-[10px] font-bold w-7 text-right">{currentProgress}%</span>
          </div>
          <button
            onClick={onNavigateToReport}
            className="px-4 py-1.5 bg-white text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap"
          >
            {currentProgress > 0 ? 'Continue →' : 'Start →'}
          </button>
        </div>
      </div>

      {/* Deadline countdown — compact strip */}
      <DeadlineCountdown />

      {/* Country selector (when rep manages multiple countries) */}
      {countries.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Select Country</label>
          <div className="flex flex-wrap gap-2">
            {countries.map(c => (
              <button
                key={c}
                onClick={() => onCountryChange?.(c)}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  c === country
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Revision requested banner */}
      {currentStatus === 'revision_requested' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg">⚠️</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Your report has been sent back for revision.
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Please review the flagged fields and resubmit.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToReport}
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors shadow-sm flex-shrink-0"
          >
            Review &amp; Fix
          </button>
        </div>
      )}

      {/* Current Year Stats Cards */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">{currentYear} Key Metrics</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map(m => {
            const val = num(reportCurrent, m.key);
            const prevVal = num(reportPrev, m.key);
            return (
              <div key={m.key} className={`bg-white rounded-xl border ${accentBorder[m.accent]} shadow-sm overflow-hidden`}>
                <div className={`h-1 bg-gradient-to-r ${accentBg[m.accent]}`} />
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">{m.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 truncate">{m.label}</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-gray-900 leading-tight">{val.toLocaleString()}</p>
                        <TrendArrow current={val} previous={prevVal} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Year-over-Year Comparison */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Year-over-Year Comparison</h3>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Metric</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{formatFiscalYear(currentYear - 2)}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{formatFiscalYear(currentYear - 1)}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{formatFiscalYear(currentYear)}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metrics.map(m => {
                const vPP = num(reportPrevPrev, m.key);
                const vP = num(reportPrev, m.key);
                const vC = num(reportCurrent, m.key);
                return (
                  <tr key={m.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{m.icon} {m.label}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{vPP ? vPP.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{vP ? vP.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 text-right">{vC ? vC.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-right"><TrendArrow current={vC} previous={vP} /></td>
                  </tr>
                );
              })}
              {/* Additional rows */}
              {[
                { label: 'Leaflets Distributed', key: 'll1_leaflets_distributed', icon: '📄' },
                { label: 'Charity (USD)', key: 'kk10_charity_amount_usd', icon: '💰' },
              ].map(m => {
                const vPP = num(reportPrevPrev, m.key);
                const vP = num(reportPrev, m.key);
                const vC = num(reportCurrent, m.key);
                return (
                  <tr key={m.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{m.icon} {m.label}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{vPP ? vPP.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{vP ? vP.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 text-right">{vC ? vC.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-right"><TrendArrow current={vC} previous={vP} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report submission info */}
      {reportCurrent?.submittedAt && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Submission Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Submitted</p>
              <p className="text-gray-700 font-medium">{reportCurrent.submittedAt}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Last Updated</p>
              <p className="text-gray-700 font-medium">{reportCurrent.lastUpdated}</p>
            </div>
            {reportCurrent.approvedBy && (
              <>
                <div>
                  <p className="text-gray-400 text-xs">Approved By</p>
                  <p className="text-gray-700 font-medium">{reportCurrent.approvedBy}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Approved On</p>
                  <p className="text-gray-700 font-medium">{reportCurrent.approvedAt}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
