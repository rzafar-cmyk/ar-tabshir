import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronRight, Download, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { REPORT_FORM_SECTIONS } from '@/data/reportFormSchema';
import type { FormField } from '@/data/reportFormSchema';
import { ALL_COUNTRIES } from '@/data/countries';
import type { StoredReport } from '@/services/dataService';
import { useConvexData } from '@/contexts/ConvexDataContext';
import { getCurrentFiscalYear, getAvailableFiscalYears, formatFiscalYear } from '@/lib/fiscalYear';

// ── Types ──

interface FlatField {
  code: string;
  label: string;
  sectionTitle: string;
  sectionId: string;
  type: FormField['type'];
}

interface SearchResultRow {
  country: string;
  flag: string;
  continent: string;
  year: number;
  section: string;
  fieldLabel: string;
  fieldCode: string;
  value: string | number;
  reportId: string;
}

type SortDir = 'asc' | 'desc';
type SortKey = 'country' | 'section' | 'fieldLabel' | 'value';

// ── Helpers ──

/** Build a flat list of all form fields with section context */
function buildFlatFields(): FlatField[] {
  const fields: FlatField[] = [];
  for (const section of REPORT_FORM_SECTIONS) {
    for (const f of section.fields) {
      fields.push({ code: f.code, label: f.label, sectionTitle: `${section.number}. ${section.title}`, sectionId: section.id, type: f.type });
    }
    if (section.subsections) {
      for (const sub of section.subsections) {
        for (const f of sub.fields) {
          fields.push({ code: f.code, label: f.label, sectionTitle: `${section.number}. ${section.title}`, sectionId: section.id, type: f.type });
        }
      }
    }
  }
  return fields;
}

const ALL_FLAT_FIELDS = buildFlatFields();

/** Build section list for dropdowns */
function buildSectionOptions(): { id: string; label: string }[] {
  return REPORT_FORM_SECTIONS.map(s => ({ id: s.id, label: `${s.number}. ${s.title}` }));
}

const SECTION_OPTIONS = buildSectionOptions();
const CONTINENTS = [...new Set(ALL_COUNTRIES.map(c => c.continent))].sort();

/** Get fields for a given section (or all) */
function getFieldsForSection(sectionId: string | null): FlatField[] {
  if (!sectionId) return ALL_FLAT_FIELDS;
  return ALL_FLAT_FIELDS.filter(f => f.sectionId === sectionId);
}

/** Sort helper */
function compareValues(a: string | number, b: string | number, dir: SortDir): number {
  const numA = typeof a === 'number' ? a : Number(a);
  const numB = typeof b === 'number' ? b : Number(b);
  if (!isNaN(numA) && !isNaN(numB)) {
    return dir === 'asc' ? numA - numB : numB - numA;
  }
  const strA = String(a).toLowerCase();
  const strB = String(b).toLowerCase();
  if (strA < strB) return dir === 'asc' ? -1 : 1;
  if (strA > strB) return dir === 'asc' ? 1 : -1;
  return 0;
}

/** Sanitize search query for safe usage */
function sanitize(input: string): string {
  return input.replace(/[<>]/g, '');
}

/** Export results to CSV */
function exportToCSV(rows: SearchResultRow[], filename: string) {
  const header = 'Country,Section,Field,Value\n';
  const body = rows.map(r => {
    const val = typeof r.value === 'string' ? `"${r.value.replace(/"/g, '""')}"` : r.value;
    return `"${r.country}","${r.section}","${r.fieldLabel}",${val}`;
  }).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Quick Search Hook ──

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Sortable Table Header ──

function SortHeader({ label, sortKey, currentSort, onSort }: {
  label: string;
  sortKey: SortKey;
  currentSort: { key: SortKey; dir: SortDir } | null;
  onSort: (key: SortKey) => void;
}) {
  const active = currentSort?.key === sortKey;
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          currentSort.dir === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-gray-300" />
        )}
      </div>
    </th>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

export function SearchSection() {
  const { allReports: convexReports } = useConvexData();

  // Reports are already role-filtered by Convex server-side
  const reports = convexReports;

  // ── Quick Search State ──
  const [quickQuery, setQuickQuery] = useState('');
  const debouncedQuery = useDebounce(quickQuery, 300);
  const [quickSort, setQuickSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  // ── Advanced Filters State ──
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advSection, setAdvSection] = useState<string | null>(null);
  const [advField, setAdvField] = useState<string | null>(null);
  const [advContinents, setAdvContinents] = useState<string[]>([]);
  const [advCountries, setAdvCountries] = useState<string[]>([]);
  const [advComparison, setAdvComparison] = useState<'eq' | 'gt' | 'lt' | 'between' | 'not_empty' | 'empty'>('not_empty');
  const [advValue, setAdvValue] = useState('');
  const [advValueMax, setAdvValueMax] = useState('');
  const [advYear, setAdvYear] = useState<number>(getCurrentFiscalYear());
  const [advResults, setAdvResults] = useState<SearchResultRow[] | null>(null);
  const [advSort, setAdvSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);

  // Derived: fields for selected section
  const advFieldOptions = useMemo(() => getFieldsForSection(advSection), [advSection]);

  // Derived: countries for selected continents
  const filteredCountryOptions = useMemo(() => {
    let list = ALL_COUNTRIES.map(c => c.name).sort();
    if (advContinents.length > 0) {
      const inContinents = new Set(ALL_COUNTRIES.filter(c => advContinents.includes(c.continent)).map(c => c.name));
      list = list.filter(c => inContinents.has(c));
    }
    return list;
  }, [advContinents]);

  // Reset field when section changes
  useEffect(() => { setAdvField(null); }, [advSection]);

  // ══ Quick Search Logic ══

  /** Flatten a single report into searchable rows */
  const flattenReport = useCallback((report: StoredReport): SearchResultRow[] => {
    const rows: SearchResultRow[] = [];
    const data = report.data || {};

    // Search static fields from form schema
    for (const ff of ALL_FLAT_FIELDS) {
      const val = data[ff.code];
      if (val !== undefined && val !== '' && val !== null) {
        rows.push({
          country: report.country,
          flag: report.flag || '',
          continent: report.continent || '',
          year: report.year,
          section: ff.sectionTitle,
          fieldLabel: ff.label,
          fieldCode: ff.code,
          value: val,
          reportId: report.id,
        });
      }
    }

    // Also search dynamic fields (missionaries, properties, etc.)
    for (const [key, val] of Object.entries(data)) {
      if (val === undefined || val === '' || val === null) continue;
      // Skip fields already covered by static schema
      if (ALL_FLAT_FIELDS.some(f => f.code === key)) continue;
      // Determine a section label from the key prefix
      let section = 'Other';
      if (key.startsWith('cmd_') || key.startsWith('cm_')) section = '5. Central / Local Missionaries';
      else if (key.startsWith('p_') || key.startsWith('p1_')) section = '4. Purchase of Property';
      else if (key.startsWith('pub') || key.startsWith('pub1_')) section = '22. Ishanat — Publications';
      else if (key.startsWith('crv_') || key.startsWith('crv1_')) section = '32. Central Representative\'s Visit';
      else if (key.endsWith('_additional_notes')) section = 'Additional Notes';

      rows.push({
        country: report.country,
        flag: report.flag || '',
        continent: report.continent || '',
        year: report.year,
        section,
        fieldLabel: key,
        fieldCode: key,
        value: val,
        reportId: report.id,
      });
    }

    return rows;
  }, []);

  /** All searchable rows from all reports */
  const allRows = useMemo(() => reports.flatMap(flattenReport), [reports, flattenReport]);

  /** Quick search results */
  const quickResults = useMemo(() => {
    const q = sanitize(debouncedQuery).toLowerCase().trim();
    if (!q) return [];

    const matched = allRows.filter(row => {
      const valStr = String(row.value).toLowerCase();
      return (
        row.country.toLowerCase().includes(q) ||
        row.section.toLowerCase().includes(q) ||
        row.fieldLabel.toLowerCase().includes(q) ||
        valStr.includes(q)
      );
    });

    // Sort
    if (quickSort) {
      matched.sort((a, b) => compareValues(a[quickSort.key], b[quickSort.key], quickSort.dir));
    }

    return matched.slice(0, 500); // Cap at 500 for performance
  }, [debouncedQuery, allRows, quickSort]);

  const handleQuickSort = useCallback((key: SortKey) => {
    setQuickSort(prev => {
      if (prev?.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: 'asc' };
    });
  }, []);

  // ══ Advanced Search Logic ══

  const handleAdvancedSearch = useCallback(() => {
    // Filter reports by year
    const yearReports = reports.filter(r => r.year === advYear);

    // Filter by countries/continents
    let countrySet: Set<string> | null = null;
    if (advCountries.length > 0) {
      countrySet = new Set(advCountries);
    } else if (advContinents.length > 0) {
      countrySet = new Set(ALL_COUNTRIES.filter(c => advContinents.includes(c.continent)).map(c => c.name));
    }

    const relevantReports = countrySet
      ? yearReports.filter(r => countrySet!.has(r.country))
      : yearReports;

    // Determine which fields to search
    const fieldsToSearch = advField
      ? ALL_FLAT_FIELDS.filter(f => f.code === advField)
      : getFieldsForSection(advSection);

    const rows: SearchResultRow[] = [];

    for (const report of relevantReports) {
      const data = report.data || {};
      for (const ff of fieldsToSearch) {
        const raw = data[ff.code];
        const strVal = raw !== undefined && raw !== null ? String(raw) : '';
        const numVal = typeof raw === 'number' ? raw : Number(raw);
        const hasValue = raw !== undefined && raw !== null && raw !== '' && raw !== 0;

        let match = false;
        switch (advComparison) {
          case 'not_empty':
            match = hasValue;
            break;
          case 'empty':
            match = !hasValue;
            break;
          case 'eq':
            if (!isNaN(numVal) && advValue) match = numVal === Number(advValue);
            else match = strVal.toLowerCase() === sanitize(advValue).toLowerCase();
            break;
          case 'gt':
            match = !isNaN(numVal) && numVal > Number(advValue);
            break;
          case 'lt':
            match = !isNaN(numVal) && numVal < Number(advValue);
            break;
          case 'between':
            match = !isNaN(numVal) && numVal >= Number(advValue) && numVal <= Number(advValueMax);
            break;
        }

        if (match) {
          rows.push({
            country: report.country,
            flag: report.flag || '',
            continent: report.continent || '',
            year: report.year,
            section: ff.sectionTitle,
            fieldLabel: ff.label,
            fieldCode: ff.code,
            value: raw ?? '',
            reportId: report.id,
          });
        }
      }
    }

    setAdvResults(rows);
    setAdvSort(null);
  }, [reports, advYear, advCountries, advContinents, advSection, advField, advComparison, advValue, advValueMax]);

  const handleAdvSort = useCallback((key: SortKey) => {
    setAdvSort(prev => {
      if (prev?.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: 'asc' };
    });
  }, []);

  const sortedAdvResults = useMemo(() => {
    if (!advResults) return null;
    if (!advSort) return advResults;
    return [...advResults].sort((a, b) => compareValues(a[advSort.key], b[advSort.key], advSort.dir));
  }, [advResults, advSort]);

  // Summary stats for advanced results (numeric values only)
  const advStats = useMemo(() => {
    if (!sortedAdvResults || sortedAdvResults.length === 0) return null;
    const nums = sortedAdvResults.map(r => typeof r.value === 'number' ? r.value : Number(r.value)).filter(n => !isNaN(n) && n !== 0);
    if (nums.length === 0) return null;
    const total = nums.reduce((s, v) => s + v, 0);
    return {
      count: nums.length,
      total,
      avg: Math.round(total / nums.length * 10) / 10,
      min: Math.min(...nums),
      max: Math.max(...nums),
    };
  }, [sortedAdvResults]);

  const clearAdvancedFilters = () => {
    setAdvSection(null);
    setAdvField(null);
    setAdvContinents([]);
    setAdvCountries([]);
    setAdvComparison('not_empty');
    setAdvValue('');
    setAdvValueMax('');
    setAdvYear(getCurrentFiscalYear());
    setAdvResults(null);
    setAdvSort(null);
  };

  // ══ Render ══

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-600" />
          Search Reports
        </h2>
        <p className="text-sm text-gray-500">Search across all submitted reports and fields</p>
      </div>

      {/* ══════════ QUICK SEARCH ══════════ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={quickInputRef}
            type="text"
            placeholder="Type anything — country, field, value, name..."
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all"
          />
          {quickQuery && (
            <button onClick={() => setQuickQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Search Results */}
        {debouncedQuery.trim() && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-3">
              Found <span className="font-semibold text-gray-800">{quickResults.length}</span>
              {quickResults.length === 500 ? '+' : ''} results for &ldquo;<span className="text-blue-600">{sanitize(debouncedQuery)}</span>&rdquo;
            </p>

            {quickResults.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        <SortHeader label="Country" sortKey="country" currentSort={quickSort} onSort={handleQuickSort} />
                        <SortHeader label="Section" sortKey="section" currentSort={quickSort} onSort={handleQuickSort} />
                        <SortHeader label="Field" sortKey="fieldLabel" currentSort={quickSort} onSort={handleQuickSort} />
                        <SortHeader label="Value" sortKey="value" currentSort={quickSort} onSort={handleQuickSort} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {quickResults.map((row, i) => (
                        <tr key={`${row.reportId}-${row.fieldCode}-${i}`} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{row.flag}</span>
                              <span className="text-sm font-medium text-gray-800">{row.country}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-500">{row.section}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">{row.fieldLabel}</td>
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900 text-right font-mono">
                            {typeof row.value === 'number' ? row.value.toLocaleString() : String(row.value).length > 60 ? String(row.value).slice(0, 60) + '…' : String(row.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No results found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════ ADVANCED FILTERS ══════════ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Advanced Filters
          </span>
          {advResults && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{advResults.length} results</span>
          )}
        </button>

        {showAdvanced && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-5">
            {/* Row 1: Section + Field */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Section Dropdown */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Section</label>
                <select
                  value={advSection ?? ''}
                  onChange={(e) => setAdvSection(e.target.value || null)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white"
                >
                  <option value="">All Sections</option>
                  {SECTION_OPTIONS.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Field Dropdown */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Field</label>
                <select
                  value={advField ?? ''}
                  onChange={(e) => setAdvField(e.target.value || null)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white"
                >
                  <option value="">All Fields</option>
                  {advSection ? (
                    advFieldOptions.map(f => (
                      <option key={f.code} value={f.code}>{f.label}</option>
                    ))
                  ) : (
                    // Group by section when "All Sections" is selected
                    SECTION_OPTIONS.map(sec => {
                      const fields = ALL_FLAT_FIELDS.filter(f => f.sectionId === sec.id);
                      if (fields.length === 0) return null;
                      return (
                        <optgroup key={sec.id} label={sec.label}>
                          {fields.map(f => (
                            <option key={f.code} value={f.code}>{f.label}</option>
                          ))}
                        </optgroup>
                      );
                    })
                  )}
                </select>
              </div>
            </div>

            {/* Row 2: Continent + Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Continent filter */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Continents</label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTINENTS.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setAdvContinents(prev =>
                          prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
                        );
                        setAdvCountries([]);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                        advContinents.includes(c) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country multi-select */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Countries {advCountries.length > 0 && <span className="text-blue-600">({advCountries.length})</span>}
                </label>
                <CountryPicker
                  options={filteredCountryOptions}
                  selected={advCountries}
                  onChange={setAdvCountries}
                />
              </div>
            </div>

            {/* Row 3: Comparison + Value + Year */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Comparison</label>
                <select
                  value={advComparison}
                  onChange={(e) => setAdvComparison(e.target.value as typeof advComparison)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white"
                >
                  <option value="not_empty">Not Empty</option>
                  <option value="empty">Empty</option>
                  <option value="eq">Equals</option>
                  <option value="gt">Greater Than</option>
                  <option value="lt">Less Than</option>
                  <option value="between">Between</option>
                </select>
              </div>

              {advComparison !== 'not_empty' && advComparison !== 'empty' && (
                <div className={advComparison === 'between' ? 'md:col-span-2' : ''}>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Value</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={advComparison === 'between' ? 'Min' : 'Value'}
                      value={advValue}
                      onChange={(e) => setAdvValue(e.target.value)}
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                    {advComparison === 'between' && (
                      <>
                        <span className="text-gray-400 text-sm">–</span>
                        <input
                          type="text"
                          placeholder="Max"
                          value={advValueMax}
                          onChange={(e) => setAdvValueMax(e.target.value)}
                          className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Year</label>
                <select
                  value={advYear}
                  onChange={(e) => setAdvYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white"
                >
                  {getAvailableFiscalYears(convexReports).map(y => (
                    <option key={y} value={y}>{formatFiscalYear(y)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleAdvancedSearch}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              <button
                onClick={clearAdvancedFilters}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════ ADVANCED RESULTS ══════════ */}
      {sortedAdvResults && (
        <div className="space-y-4">
          {/* Results header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Results: <span className="font-semibold text-gray-800">{sortedAdvResults.length}</span> matches
              {' '}across <span className="font-semibold text-gray-800">{new Set(sortedAdvResults.map(r => r.country)).size}</span> countries
            </p>
            <button
              onClick={() => exportToCSV(sortedAdvResults, `search-results-${new Date().toISOString().split('T')[0]}.csv`)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Summary stats */}
          {advStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Count', value: advStats.count.toLocaleString() },
                { label: 'Total', value: advStats.total.toLocaleString() },
                { label: 'Average', value: advStats.avg.toLocaleString() },
                { label: 'Min', value: advStats.min.toLocaleString() },
                { label: 'Max', value: advStats.max.toLocaleString() },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-lg font-bold text-gray-800">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Results table */}
          {sortedAdvResults.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <SortHeader label="Country" sortKey="country" currentSort={advSort} onSort={handleAdvSort} />
                      <SortHeader label="Section" sortKey="section" currentSort={advSort} onSort={handleAdvSort} />
                      <SortHeader label="Field" sortKey="fieldLabel" currentSort={advSort} onSort={handleAdvSort} />
                      <SortHeader label="Value" sortKey="value" currentSort={advSort} onSort={handleAdvSort} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedAdvResults.map((row, i) => (
                      <tr key={`${row.reportId}-${row.fieldCode}-${i}`} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{row.flag}</span>
                            <span className="text-sm font-medium text-gray-800">{row.country}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-500">{row.section}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-700">{row.fieldLabel}</td>
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900 text-right font-mono">
                          {typeof row.value === 'number' ? row.value.toLocaleString() : String(row.value).length > 80 ? String(row.value).slice(0, 80) + '…' : String(row.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
              <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No results found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Country Picker — searchable multi-select dropdown
// ══════════════════════════════════════════════════════════

function CountryPicker({ options, selected, onChange }: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = filter
    ? options.filter(c => c.toLowerCase().includes(filter.toLowerCase()))
    : options;

  const toggle = (country: string) => {
    onChange(
      selected.includes(country)
        ? selected.filter(c => c !== country)
        : [...selected, country]
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-left"
      >
        <span className="text-gray-600 truncate">
          {selected.length === 0 ? 'All Countries' : `${selected.length} selected`}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Filter countries..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-200 outline-none"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-44 p-1">
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded"
              >
                Clear selection
              </button>
            )}
            {filtered.map(c => (
              <label key={c} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(c)}
                  onChange={() => toggle(c)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{c}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">No countries match</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
