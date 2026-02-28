import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { FIELD_MAP } from '@/lib/field-map';

interface CompilationData {
  countries: string[];
  fields: string[];
  data: Record<string, Record<string, number>>;
  totals: Record<string, number>;
  averages: Record<string, number>;
  yearOverYear?: Record<string, { current: number; previous: number; change: number }>;
}

interface CompilationResultsProps {
  results: CompilationData;
  onExport: (format: 'excel' | 'pdf' | 'csv') => void;
}

export function CompilationResults({ results, onExport }: CompilationResultsProps) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fieldLabels = results.fields.map(field => {
    const fieldDef = FIELD_MAP.find(f => f.column === field);
    return fieldDef?.label_en || field;
  });

  const totalPages = Math.ceil(results.countries.length / itemsPerPage);
  const paginatedCountries = results.countries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Compilation Results</h3>
          <p className="text-sm text-gray-500">
            {results.countries.length} countries • {results.fields.length} fields
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'chart' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              Chart
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onExport('excel')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={() => onExport('csv')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => onExport('pdf')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {results.fields.slice(0, 4).map((field, idx) => {
          const total = results.totals[field] || 0;
          const avg = results.averages[field] || 0;
          const yoy = results.yearOverYear?.[field];
          const fieldLabel = fieldLabels[idx];

          return (
            <div key={field} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 truncate">{fieldLabel}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-400">Avg: {Math.round(avg).toLocaleString()}</span>
                {yoy && (
                  <span className={`text-xs flex items-center gap-1 ${
                    yoy.change > 0 ? 'text-emerald-600' : yoy.change < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {getTrendIcon(yoy.change)}
                    {Math.abs(yoy.change).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Results Table */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50">
                    Country
                  </th>
                  {fieldLabels.map((label, idx) => (
                    <th key={idx} className="px-4 py-3 text-right text-xs font-semibold text-gray-600 min-w-[120px]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedCountries.map(country => (
                  <tr key={country} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 sticky left-0 bg-white">
                      {country}
                    </td>
                    {results.fields.map(field => (
                      <td key={field} className="px-4 py-3 text-sm text-right text-gray-600">
                        {(results.data[country]?.[field] || 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                  <td className="px-4 py-3 text-sm text-gray-800 sticky left-0 bg-gray-50">
                    TOTAL
                  </td>
                  {results.fields.map(field => (
                    <td key={field} className="px-4 py-3 text-sm text-right text-gray-800">
                      {(results.totals[field] || 0).toLocaleString()}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, results.countries.length)} of {results.countries.length} countries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart View */}
      {viewMode === 'chart' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Chart visualization would appear here</p>
              <p className="text-sm">Showing aggregated data for {results.fields.length} fields</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
