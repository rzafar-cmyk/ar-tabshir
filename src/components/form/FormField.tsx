import { useState } from 'react';
import type { FieldDefinition } from '@/lib/field-map';
import { HelpCircle, Calculator, Hash, Type } from 'lucide-react';

interface FormFieldProps {
  field: FieldDefinition;
  value: string | number;
  onChange: (value: string | number) => void;
}

export function FormField({ field, value, onChange }: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = e.target.value;
    
    if (field.db_type === 'int') {
      onChange(newValue === '' ? '' : parseInt(newValue, 10) || 0);
    } else if (field.db_type === 'numeric') {
      onChange(newValue === '' ? '' : parseFloat(newValue) || 0);
    } else {
      onChange(newValue);
    }
  };

  // Determine input type based on field definition
  const getInputType = () => {
    if (field.db_type === 'int' || field.db_type === 'numeric') {
      return 'number';
    }
    if (field.label_en.toLowerCase().includes('email')) {
      return 'email';
    }
    return 'text';
  };

  // Get the appropriate icon
  const getIcon = () => {
    if (field.db_type === 'int') return <Hash className="w-4 h-4" />;
    if (field.db_type === 'numeric') return <Calculator className="w-4 h-4" />;
    return <Type className="w-4 h-4" />;
  };

  // Render yes/no dropdown for varchar fields with questions
  const isYesNoField = field.db_type === 'varchar' && field.label_en.includes('?');

  return (
    <div className={`bg-white rounded-xl border transition-all duration-200 ${
      isFocused ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
    }`}>
      <div className="p-4">
        {/* Field Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {field.excel_code}
              </span>
              {field.aggregatable && (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  Σ
                </span>
              )}
            </div>
            <label className="block text-sm font-medium text-gray-800">
              {field.label_en}
            </label>
            <p className="text-xs text-gray-400 mt-0.5" dir="rtl">
              {field.label_ur}
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-gray-400 hover:text-blue-500 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Input Field */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {getIcon()}
          </div>

          {isYesNoField ? (
            <select
              value={value as string || ''}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
            >
              <option value="">Select...</option>
              <option value="Yes">Yes / ہاں</option>
              <option value="No">No / نہیں</option>
            </select>
          ) : field.db_type === 'text' ? (
            <textarea
              value={value as string || ''}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              rows={3}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
              placeholder={`Enter ${field.label_en.toLowerCase()}...`}
            />
          ) : (
            <input
              type={getInputType()}
              value={value}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              placeholder={field.db_type === 'int' || field.db_type === 'numeric' ? '0' : 'Enter...'}
              min={field.db_type === 'int' || field.db_type === 'numeric' ? 0 : undefined}
              step={field.db_type === 'numeric' ? '0.01' : field.db_type === 'int' ? 1 : undefined}
            />
          )}
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <p><strong>Field Code:</strong> {field.excel_code}</p>
            <p><strong>Database Column:</strong> <code className="bg-blue-100 px-1 rounded">{field.column}</code></p>
            <p><strong>Type:</strong> {field.db_type}</p>
            <p><strong>Aggregatable:</strong> {field.aggregatable ? 'Yes' : 'No'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
