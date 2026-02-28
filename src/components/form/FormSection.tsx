import type { FieldDefinition } from '@/lib/field-map';
import { FormField } from './FormField';

interface SectionData {
  title: string;
  fields: FieldDefinition[];
}

interface FormSectionProps {
  section: SectionData;
  formData: { [key: string]: string | number | boolean };
  onFieldChange: (column: string, value: string | number) => void;
}

export function FormSection({ section, formData, onFieldChange }: FormSectionProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Section Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
            {section.title.split('.')[0]}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{section.title}</h2>
            <p className="text-sm text-gray-400">
              {section.fields.length} fields
            </p>
          </div>
        </div>
      </div>

      {/* Fields Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {section.fields.map((field) => (
          <FormField
            key={field.column}
            field={field}
            value={formData[field.column] as string | number || ''}
            onChange={(value) => onFieldChange(field.column, value)}
          />
        ))}
      </div>
    </div>
  );
}
