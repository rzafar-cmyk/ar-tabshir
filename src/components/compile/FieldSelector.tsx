import { useState } from 'react';
import { Search, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { FIELD_MAP } from '@/lib/field-map';

interface FieldSelectorProps {
  selectedFields: string[];
  onChange: (fields: string[]) => void;
}

export function FieldSelector({ selectedFields, onChange }: FieldSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Group fields by section
  const sections = FIELD_MAP.reduce((acc, field) => {
    if (!acc[field.section_en]) {
      acc[field.section_en] = [];
    }
    acc[field.section_en].push(field);
    return acc;
  }, {} as Record<string, typeof FIELD_MAP>);

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  const toggleField = (column: string) => {
    const newFields = selectedFields.includes(column)
      ? selectedFields.filter(f => f !== column)
      : [...selectedFields, column];
    onChange(newFields);
  };

  const selectAllInSection = (section: string) => {
    const sectionFields = sections[section]
      .filter(f => f.aggregatable)
      .map(f => f.column);
    const allSelected = sectionFields.every(f => selectedFields.includes(f));
    
    if (allSelected) {
      onChange(selectedFields.filter(f => !sectionFields.includes(f)));
    } else {
      onChange([...new Set([...selectedFields, ...sectionFields])]);
    }
  };

  const filteredSections = Object.entries(sections).filter(([_, fields]) =>
    fields.some(f => 
      f.label_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.column.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Select Fields to Compile</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">
            {selectedFields.length}/{FIELD_MAP.filter(f => f.aggregatable).length} fields selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const allAggregatable = FIELD_MAP.filter(f => f.aggregatable).map(f => f.column);
                const allSelected = allAggregatable.every(f => selectedFields.includes(f));
                onChange(allSelected ? [] : allAggregatable);
              }}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              {FIELD_MAP.filter(f => f.aggregatable).every(f => selectedFields.includes(f.column)) ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={() => onChange([])}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Clear all
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {filteredSections.map(([sectionName, fields]) => {
          const aggregatableFields = fields.filter(f => f.aggregatable);
          const selectedCount = aggregatableFields.filter(f => selectedFields.includes(f.column)).length;
          const isExpanded = expandedSections.has(sectionName);
          const allSelected = aggregatableFields.length > 0 && selectedCount === aggregatableFields.length;

          return (
            <div key={sectionName} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => toggleSection(sectionName)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-700">{sectionName}</span>
                  <span className="text-xs text-gray-400">
                    ({selectedCount}/{aggregatableFields.length})
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllInSection(sectionName);
                  }}
                  className={`text-xs px-2 py-1 rounded ${
                    allSelected
                      ? 'text-emerald-600 bg-emerald-50'
                      : 'text-blue-600 bg-blue-50'
                  }`}
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 space-y-1">
                  {aggregatableFields.map(field => (
                    <label
                      key={field.column}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        selectedFields.includes(field.column)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedFields.includes(field.column) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.column)}
                        onChange={() => toggleField(field.column)}
                        className="hidden"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{field.label_en}</p>
                        <p className="text-xs text-gray-400" dir="rtl">{field.label_ur}</p>
                      </div>
                      <span className="text-xs font-mono text-gray-400">{field.excel_code}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
