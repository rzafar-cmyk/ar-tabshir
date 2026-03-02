import { useState, useMemo, useCallback } from 'react';
import { Calculator, Play, Save, History, Download, FileSpreadsheet, FileText, BarChart3, Table, TrendingUp, TrendingDown, Minus, Sparkles, Trash2, Filter, Users, XCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { FIELD_MAP } from '@/lib/field-map';
import { FieldSelector } from './FieldSelector';
import { CompilationChart } from './CompilationChart';
import { useAuth } from '@/contexts/AuthContext';
import { MissionaryCompile } from './MissionaryCompile';
import { FaithAccountsCompile } from './FaithAccountsCompile';
import { exportAllReportsToExcel, exportCompiledToExcel } from '@/lib/exportExcel';
import { useConvexData } from '@/contexts/ConvexDataContext';
import type { StoredReport } from '@/services/dataService';
import type { MultiYearCompilationResult } from '@/lib/compile-types';
import { buildColumnHeaders } from '@/lib/compile-types';
import { getCurrentFiscalYear, getAvailableFiscalYears, formatFiscalYear } from '@/lib/fiscalYear';

interface FilterState {
  continents: string[];
  years: number[];
  statuses: string[];
  minProgress: number;
}

interface SavedCompilation {
  id: string;
  name: string;
  fields: string[];
  filters: FilterState;
  createdAt: string;
}

const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];
const STATUSES = ['draft', 'submitted', 'approved', 'revision_requested', 'update_requested', 'update_in_progress'];

// All aggregatable field codes for "all fields" presets
const ALL_AGGREGATABLE_FIELDS = FIELD_MAP.filter(f => f.aggregatable).map(f => f.column);

/** Get a numeric value from report data, checking both long and short field keys */
function getReportVal(data: Record<string, string | number>, key: string): number {
  const v = data[key] ?? data[key.split('_')[0]];
  if (v === undefined || v === null || v === '') return 0;
  return typeof v === 'number' ? v : Number(v) || 0;
}

// Generate multi-year compilation data from Convex reports
function generateCompilationData(
  selectedFields: string[],
  filters: FilterState,
  allReports: StoredReport[],
  allowedCountries?: string[]
): MultiYearCompilationResult {

  // Filter reports based on role, year, status, progress
  const filtered = allReports.filter(r => {
    if (allowedCountries && !allowedCountries.includes(r.country)) return false;
    if (filters.continents.length > 0 && !filters.continents.includes(r.continent)) return false;
    if (filters.years.length > 0 && !filters.years.includes(r.year)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(r.status)) return false;
    if (r.progress < filters.minProgress) return false;
    return true;
  });

  // Collect unique countries and years
  const countrySet = new Set<string>();
  const yearSet = new Set<number>();
  for (const r of filtered) {
    countrySet.add(r.country);
    yearSet.add(r.year);
  }
  const countries = Array.from(countrySet).sort();
  const years = Array.from(yearSet).sort((a, b) => a - b);

  // Build data[country][year][field]
  const data: Record<string, Record<number, Record<string, number>>> = {};
  const totals: Record<number, Record<string, number>> = {};
  const averages: Record<number, Record<string, number>> = {};

  for (const year of years) {
    totals[year] = {};
    averages[year] = {};
    selectedFields.forEach(f => { totals[year][f] = 0; });
  }

  for (const r of filtered) {
    if (!data[r.country]) data[r.country] = {};
    if (!data[r.country][r.year]) data[r.country][r.year] = {};
    selectedFields.forEach(field => {
      const value = getReportVal(r.data, field);
      data[r.country][r.year][field] = value;
      totals[r.year][field] += value;
    });
  }

  // Averages per year
  for (const year of years) {
    const countriesWithYear = filtered.filter(r => r.year === year).length;
    selectedFields.forEach(field => {
      averages[year][field] = countriesWithYear > 0 ? Math.floor(totals[year][field] / countriesWithYear) : 0;
    });
  }

  // Year-over-year (latest year vs previous)
  const yearOverYear: Record<string, { current: number; previous: number; change: number }> = {};
  if (years.length >= 2) {
    const latestYear = years[years.length - 1];
    const prevYear = years[years.length - 2];
    selectedFields.forEach(field => {
      const current = totals[latestYear]?.[field] ?? 0;
      const previous = totals[prevYear]?.[field] ?? 0;
      yearOverYear[field] = {
        current,
        previous,
        change: previous > 0 ? ((current - previous) / previous) * 100 : 0,
      };
    });
  } else if (years.length === 1) {
    // Compare with the year before the selected one
    const latestYear = years[0];
    const prevYearReports = allReports.filter(r => r.year === latestYear - 1);
    selectedFields.forEach(field => {
      const current = totals[latestYear]?.[field] ?? 0;
      let previous = 0;
      for (const r of prevYearReports) {
        if (allowedCountries && !allowedCountries.includes(r.country)) continue;
        previous += getReportVal(r.data, field);
      }
      yearOverYear[field] = {
        current,
        previous,
        change: previous > 0 ? ((current - previous) / previous) * 100 : 0,
      };
    });
  }

  return {
    countries,
    fields: selectedFields,
    years,
    data,
    totals,
    averages,
    yearOverYear,
    metadata: {
      generatedAt: new Date().toISOString(),
      filterCount: filters.continents.length + filters.years.length + filters.statuses.length,
      totalRecords: countries.length * selectedFields.length * years.length,
    },
  };
}

// Export to CSV (multi-year aware)
function exportToCSV(results: MultiYearCompilationResult): string {
  const isMultiYear = results.years.length > 1;
  const headers = buildColumnHeaders(results, isMultiYear);

  let csv = 'Country,' + headers.map(h => `"${h.label}"`).join(',') + '\n';

  results.countries.forEach(country => {
    const row = [`"${country}"`];
    headers.forEach(h => {
      const val = results.data[country]?.[h.year]?.[h.field];
      row.push(val !== undefined ? val.toString() : '');
    });
    csv += row.join(',') + '\n';
  });

  // Add totals row
  const totalsRow = ['TOTAL'];
  headers.forEach(h => {
    totalsRow.push((results.totals[h.year]?.[h.field] ?? 0).toString());
  });
  csv += totalsRow.join(',') + '\n';

  return csv;
}

// New presets
interface Preset {
  id: string;
  name: string;
  fields: string[];
  continents: string[];
  description: string;
}

const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'full-report',
    name: 'Full Report \u2014 All Countries',
    fields: ALL_AGGREGATABLE_FIELDS,
    continents: [],
    description: 'All aggregatable fields across all countries',
  },
  {
    id: 'baits-tabligh',
    name: "Bai'ats & Tabligh Summary",
    fields: ['b1_total_baits', 'b2_nations_entered', 'll1_leaflets_distributed', 'll2_people_reached', 'e1_quran_exhibitions', 'e4_book_stalls', 'e5_book_fairs', 'e6_total_visitors', 'mcj1_radio_stations', 'mcj3_radio_hours', 'mcj4_tv_programs', 'mcj5_tv_hours', 'mco1_other_tv_programs', 'mco5_newspapers', 'mco7_people_reached'],
    continents: [],
    description: "Bai'ats, Leafletting, Exhibitions, Media Coverage",
  },
  {
    id: 'missionaries',
    name: 'Missionaries & Mu\'allimeen',
    fields: ['cm1_central_missionaries_prev', 'cm2_central_missionaries_new', 'cm3_central_missionaries_total', 'lm1_local_missionaries_prev', 'lm2_local_missionaries_new', 'lm3_local_missionaries_total', 'lmu1_mualameen_prev', 'lmu2_mualameen_new', 'lmu3_mualameen_total'],
    continents: [],
    description: 'Central, Local, and Mualameen missionaries',
  },
  {
    id: 'africa-summary',
    name: 'Africa Summary',
    fields: ALL_AGGREGATABLE_FIELDS,
    continents: ['Africa'],
    description: 'All fields for African countries',
  },
  {
    id: 'asia-summary',
    name: 'Asia Summary',
    fields: ALL_AGGREGATABLE_FIELDS,
    continents: ['Asia'],
    description: 'All fields for Asian countries',
  },
  {
    id: 'europe-summary',
    name: 'Europe Summary',
    fields: ALL_AGGREGATABLE_FIELDS,
    continents: ['Europe'],
    description: 'All fields for European countries',
  },
  {
    id: 'north-america-summary',
    name: 'North America Summary',
    fields: ALL_AGGREGATABLE_FIELDS,
    continents: ['North America'],
    description: 'All fields for North American countries',
  },
  {
    id: 'south-america-summary',
    name: 'South America Summary',
    fields: ALL_AGGREGATABLE_FIELDS,
    continents: ['South America'],
    description: 'All fields for South American countries',
  },
  {
    id: 'oceania-summary',
    name: 'Oceania Summary',
    fields: ALL_AGGREGATABLE_FIELDS,
    continents: ['Oceania'],
    description: 'All fields for Oceania countries',
  },
];

export function CompileSection() {
  const { user: authUser } = useAuth();
  const { allReports: convexReports } = useConvexData();
  const allowedCountries = authUser?.role === 'desk_incharge' ? authUser.assignedCountries : undefined;
  const YEARS = getAvailableFiscalYears(convexReports);

  const [selectedFields, setSelectedFields] = useState<string[]>([
    'b1_total_baits',
    'm4_mosques_total',
    'j3_jamaats_total',
    'kk7_patients_treated',
    'll1_leaflets_distributed',
    'kk10_charity_amount_usd'
  ]);
  const [filters, setFilters] = useState<FilterState>({
    continents: [],
    years: [getCurrentFiscalYear()],
    statuses: ['submitted', 'approved'],
    minProgress: 50
  });
  const [results, setResults] = useState<MultiYearCompilationResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [savedCompilations, setSavedCompilations] = useState<SavedCompilation[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [compileTab, setCompileTab] = useState<'data' | 'missionaries' | 'faith-accounts'>('data');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const isMultiYear = results ? results.years.length > 1 : false;

  const handleCompile = useCallback(() => {
    setIsCompiling(true);
    setTimeout(() => {
      const data = generateCompilationData(selectedFields, filters, convexReports, allowedCountries);
      setResults(data);
      setIsCompiling(false);
      setCurrentPage(1);
      setSortConfig(null);
    }, 800);
  }, [selectedFields, filters, allowedCountries]);

  const handleSaveCompilation = useCallback(() => {
    if (!saveName.trim()) return;
    const newCompilation: SavedCompilation = {
      id: Date.now().toString(),
      name: saveName,
      fields: [...selectedFields],
      filters: { ...filters },
      createdAt: new Date().toLocaleDateString()
    };
    setSavedCompilations(prev => [...prev, newCompilation]);
    setShowSaveDialog(false);
    setSaveName('');
  }, [saveName, selectedFields, filters]);

  const handleLoadCompilation = useCallback((compilation: SavedCompilation) => {
    setSelectedFields(compilation.fields);
    setFilters(compilation.filters);
    setActivePreset(null);
  }, []);

  const handleDeleteCompilation = useCallback((id: string) => {
    setSavedCompilations(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleExportAll = useCallback(() => {
    if (results) {
      exportCompiledToExcel(results);
    } else {
      exportAllReportsToExcel(allowedCountries, convexReports);
    }
  }, [results, allowedCountries]);

  const handleExportCSV = useCallback(() => {
    if (!results) return;
    const content = exportToCSV(results);
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compilation-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [results]);

  const applyPreset = useCallback((preset: Preset) => {
    setSelectedFields(preset.fields);
    setFilters(prev => ({ ...prev, continents: preset.continents }));
    setActivePreset(preset.id);
  }, []);

  // Clear preset highlight when user manually changes fields or filters
  const handleFieldChange = useCallback((fields: string[]) => {
    setSelectedFields(fields);
    setActivePreset(null);
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setActivePreset(null);
  }, []);

  // Column headers for table
  const columnHeaders = useMemo(() => {
    if (!results) return [];
    return buildColumnHeaders(results, isMultiYear);
  }, [results, isMultiYear]);

  // Sorted countries
  const sortedCountries = useMemo(() => {
    if (!results) return [];
    const list = [...results.countries];
    if (!sortConfig) return list;

    list.sort((a, b) => {
      if (sortConfig.key === 'country') {
        return sortConfig.direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      }
      // Parse "year:field" key
      const [yearStr, field] = sortConfig.key.split(':');
      const year = Number(yearStr);
      const aVal = results.data[a]?.[year]?.[field] ?? 0;
      const bVal = results.data[b]?.[year]?.[field] ?? 0;
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [results, sortConfig]);

  // Pagination
  const paginatedCountries = useMemo(() => {
    return sortedCountries.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedCountries, currentPage]);

  const totalPages = sortedCountries.length > 0 ? Math.ceil(sortedCountries.length / itemsPerPage) : 0;

  const fieldLabels = useMemo(() => {
    if (!results) return [];
    return results.fields.map(field => {
      const fieldDef = FIELD_MAP.find(f => f.column === field);
      return fieldDef?.label_en || field;
    });
  }, [results]);

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const SortIndicator = ({ colKey }: { colKey: string }) => {
    if (!sortConfig || sortConfig.key !== colKey) return <ChevronDown className="w-3 h-3 text-gray-300 inline ml-1" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
  };

  // For single-year backward compat with CompilationChart
  const chartCompatResults = useMemo(() => {
    if (!results) return null;
    const latestYear = results.years[results.years.length - 1];
    const flatData: Record<string, Record<string, number>> = {};
    for (const country of results.countries) {
      flatData[country] = results.data[country]?.[latestYear] ?? {};
    }
    return {
      countries: results.countries,
      fields: results.fields,
      data: flatData,
      totals: results.totals[latestYear] ?? {},
      averages: results.averages[latestYear] ?? {},
      yearOverYear: results.yearOverYear,
      metadata: results.metadata,
    };
  }, [results]);

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            Compile & Aggregate
          </h2>
          <p className="text-sm text-gray-500">Generate summaries and compare data across countries</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg hover:from-emerald-600 hover:to-emerald-700 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {results ? 'Export Compiled' : 'Export All'} to Excel
          </button>
          {results && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setCompileTab('data')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            compileTab === 'data'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Data Compilation
        </button>
        <button
          onClick={() => setCompileTab('missionaries')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            compileTab === 'missionaries'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Missionaries
        </button>
        <button
          onClick={() => setCompileTab('faith-accounts')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            compileTab === 'faith-accounts'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Faith Accounts
        </button>
      </div>

      {compileTab === 'missionaries' ? (
        <MissionaryCompile />
      ) : compileTab === 'faith-accounts' ? (
        <FaithAccountsCompile />
      ) : (
      <>
      {/* Saved Compilations */}
      {savedCompilations.length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <History className="w-4 h-4" />
            Saved Compilations
          </h3>
          <div className="flex flex-wrap gap-2">
            {savedCompilations.map(compilation => (
              <div key={compilation.id} className="flex items-center gap-1 bg-white rounded-lg px-3 py-2 border border-blue-200">
                <button
                  onClick={() => handleLoadCompilation(compilation)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {compilation.name}
                </button>
                <span className="text-xs text-gray-400">({compilation.createdAt})</span>
                <button
                  onClick={() => handleDeleteCompilation(compilation.id)}
                  className="ml-1 p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Field Selector */}
        <div className="lg:col-span-2">
          <FieldSelector
            selectedFields={selectedFields}
            onChange={handleFieldChange}
          />
        </div>

        {/* Filters & Controls */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </h3>

            {/* Continent Filter */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 mb-2 block">
                Continents ({filters.continents.length}/{CONTINENTS.length})
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const allSelected = filters.continents.length === CONTINENTS.length;
                    handleFilterChange({ ...filters, continents: allSelected ? [] : [...CONTINENTS] });
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    filters.continents.length === CONTINENTS.length
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {filters.continents.length === CONTINENTS.length ? 'Deselect All' : 'Select All'}
                </button>
                {CONTINENTS.map(continent => (
                  <button
                    key={continent}
                    onClick={() => {
                      const newContinents = filters.continents.includes(continent)
                        ? filters.continents.filter(c => c !== continent)
                        : [...filters.continents, continent];
                      handleFilterChange({ ...filters, continents: newContinents });
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      filters.continents.includes(continent)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {continent}
                  </button>
                ))}
              </div>
            </div>

            {/* Year Filter */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 mb-2 block">Years</label>
              <div className="flex flex-wrap gap-2">
                {YEARS.map(year => (
                  <button
                    key={year}
                    onClick={() => {
                      const newYears = filters.years.includes(year)
                        ? filters.years.filter(y => y !== year)
                        : [...filters.years, year];
                      handleFilterChange({ ...filters, years: newYears });
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      filters.years.includes(year)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {formatFiscalYear(year)}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 mb-2 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      const newStatuses = filters.statuses.includes(status)
                        ? filters.statuses.filter(s => s !== status)
                        : [...filters.statuses, status];
                      handleFilterChange({ ...filters, statuses: newStatuses });
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${
                      filters.statuses.includes(status)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Slider */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">
                Min Progress: {filters.minProgress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.minProgress}
                onChange={(e) => handleFilterChange({ ...filters, minProgress: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>

          {/* Compile Button */}
          <button
            onClick={handleCompile}
            disabled={selectedFields.length === 0 || isCompiling}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCompiling ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Compiling...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generate Compilation
              </>
            )}
          </button>

          {/* Quick Presets */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Quick Presets
              </h3>
              {activePreset && (
                <button
                  onClick={() => { setActivePreset(null); setSelectedFields([]); handleFilterChange({ ...filters, continents: [] }); }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
                >
                  <XCircle className="w-3 h-3" />
                  Clear All
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {DEFAULT_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors border ${
                    activePreset === preset.id
                      ? 'bg-purple-100 text-purple-700 border-purple-300'
                      : 'text-gray-600 bg-white hover:bg-purple-50 hover:text-purple-600 border-transparent hover:border-purple-200'
                  }`}
                >
                  <p className="font-medium text-xs">{preset.name}</p>
                  <p className="text-[10px] text-gray-400">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="pt-6 border-t border-gray-200 space-y-6">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Compilation Results</h3>
              <p className="text-sm text-gray-500">
                {results.countries.length} countries &bull; {results.fields.length} fields &bull; {results.years.length > 1 ? `${results.years.join(', ')}` : results.years[0]} &bull; Generated {new Date(results.metadata.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <Table className="w-4 h-4" />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === 'chart' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Chart
                </button>
              </div>

              {/* Export Buttons */}
              <button
                onClick={() => exportCompiledToExcel(results)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {results.fields.slice(0, 6).map((field, idx) => {
              const latestYear = results.years[results.years.length - 1];
              const total = results.totals[latestYear]?.[field] ?? 0;
              const avg = results.averages[latestYear]?.[field] ?? 0;
              const yoy = results.yearOverYear[field];
              const fieldLabel = fieldLabels[idx];

              return (
                <div key={field} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-500 truncate" title={fieldLabel}>{fieldLabel}</p>
                  <p className="text-xl font-bold text-gray-800 mt-1">
                    {total.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">Avg: {Math.round(avg).toLocaleString()}</span>
                  </div>
                  {yoy && (
                    <div className={`flex items-center gap-1 mt-1 text-xs ${
                      yoy.change > 0 ? 'text-emerald-600' : yoy.change < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {getTrendIcon(yoy.change)}
                      <span>{yoy.change > 0 ? '+' : ''}{yoy.change.toFixed(1)}% YoY</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Chart View */}
          {viewMode === 'chart' && chartCompatResults && (
            <CompilationChart results={chartCompatResults} fieldLabels={fieldLabels} />
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('country')}
                      >
                        Country <SortIndicator colKey="country" />
                      </th>
                      {columnHeaders.map((h, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-3 text-right text-xs font-semibold text-gray-600 min-w-[140px] cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort(`${h.year}:${h.field}`)}
                        >
                          {h.label} <SortIndicator colKey={`${h.year}:${h.field}`} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedCountries.map(country => (
                      <tr key={country} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 sticky left-0 bg-white z-10">
                          {country}
                        </td>
                        {columnHeaders.map((h, idx) => {
                          const val = results.data[country]?.[h.year]?.[h.field];
                          return (
                            <td key={idx} className="px-4 py-3 text-sm text-right text-gray-600 font-mono">
                              {val !== undefined ? val.toLocaleString() : '\u2014'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                      <td className="px-4 py-3 text-sm text-gray-800 sticky left-0 bg-blue-50 z-10">
                        TOTAL
                      </td>
                      {columnHeaders.map((h, idx) => (
                        <td key={idx} className="px-4 py-3 text-sm text-right text-gray-800 font-mono">
                          {(results.totals[h.year]?.[h.field] ?? 0).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedCountries.length)} of {sortedCountries.length} countries
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Save Compilation</h3>
            <input
              type="text"
              placeholder="Enter compilation name..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowSaveDialog(false); setSaveName(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCompilation}
                disabled={!saveName.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
