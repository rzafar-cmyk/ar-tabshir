import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { getAvailableFiscalYears, formatFiscalYear } from '@/lib/fiscalYear';

interface FilterState {
  status: string[];
  continent: string[];
  year: string[];
  progressRange: { min: number; max: number } | null;
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
}

const statusOptions = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-400' },
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-500' },
  { value: 'approved', label: 'Approved', color: 'bg-emerald-500' },
  { value: 'revision_requested', label: 'Revision Requested', color: 'bg-amber-500' },
  { value: 'update_requested', label: 'Update Requested', color: 'bg-purple-500' },
  { value: 'update_in_progress', label: 'Update In Progress', color: 'bg-orange-500' },
];

const continentOptions = [
  { value: 'africa', label: 'Africa' },
  { value: 'asia', label: 'Asia' },
  { value: 'europe', label: 'Europe' },
  { value: 'north_america', label: 'North America' },
  { value: 'south_america', label: 'South America' },
  { value: 'oceania', label: 'Oceania' },
];

const yearOptions = getAvailableFiscalYears().map(String);

const progressRanges = [
  { label: 'All', min: 0, max: 100 },
  { label: '0-25%', min: 0, max: 25 },
  { label: '26-50%', min: 26, max: 50 },
  { label: '51-75%', min: 51, max: 75 },
  { label: '76-100%', min: 76, max: 100 },
];

export function FilterPanel({ filters, onChange, onClear }: FilterPanelProps) {
  const [expanded, setExpanded] = useState<string[]>(['status']);

  const toggleExpanded = (section: string) => {
    setExpanded(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleFilter = (category: keyof FilterState, value: string) => {
    const current = filters[category] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...filters, [category]: updated });
  };

  const setProgressRange = (range: { min: number; max: number } | null) => {
    onChange({ ...filters, progressRange: range });
  };

  const activeFilterCount = 
    filters.status.length + 
    filters.continent.length + 
    filters.year.length + 
    (filters.progressRange ? 1 : 0);

  const FilterSection = ({ 
    title, 
    sectionKey, 
    children 
  }: { 
    title: string; 
    sectionKey: string; 
    children: React.ReactNode 
  }) => (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => toggleExpanded(sectionKey)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded.includes(sectionKey) ? 'rotate-180' : ''}`} 
        />
      </button>
      {expanded.includes(sectionKey) && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </h3>
        {activeFilterCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Status Filter */}
      <FilterSection title="Status" sectionKey="status">
        <div className="space-y-2">
          {statusOptions.map(option => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
              <input
                type="checkbox"
                checked={filters.status.includes(option.value)}
                onChange={() => toggleFilter('status', option.value)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className={`w-2 h-2 rounded-full ${option.color}`} />
              <span className="text-sm text-gray-600">{option.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Continent Filter */}
      <FilterSection title="Continent" sectionKey="continent">
        <div className="space-y-2">
          {continentOptions.map(option => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
              <input
                type="checkbox"
                checked={filters.continent.includes(option.value)}
                onChange={() => toggleFilter('continent', option.value)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">{option.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Year Filter */}
      <FilterSection title="Year" sectionKey="year">
        <div className="space-y-2">
          {yearOptions.map(option => (
            <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
              <input
                type="checkbox"
                checked={filters.year.includes(option)}
                onChange={() => toggleFilter('year', option)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">{formatFiscalYear(Number(option))}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Progress Filter */}
      <FilterSection title="Completion" sectionKey="progress">
        <div className="space-y-2">
          {progressRanges.map(range => (
            <label key={range.label} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
              <input
                type="radio"
                name="progress"
                checked={filters.progressRange?.min === range.min && filters.progressRange?.max === range.max}
                onChange={() => setProgressRange(range.label === 'All' ? null : range)}
                className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">{range.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}
