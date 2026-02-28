import { FIELD_MAP } from './field-map';

export interface MultiYearCompilationResult {
  countries: string[];
  fields: string[];
  years: number[];
  /** data[country][year][field] = value */
  data: Record<string, Record<number, Record<string, number>>>;
  /** totals[year][field] = sum */
  totals: Record<number, Record<string, number>>;
  averages: Record<number, Record<string, number>>;
  yearOverYear: Record<string, { current: number; previous: number; change: number }>;
  metadata: {
    generatedAt: string;
    filterCount: number;
    totalRecords: number;
  };
}

export interface ColumnHeader {
  label: string;
  year: number;
  field: string;
}

export function buildColumnHeaders(result: MultiYearCompilationResult, isMultiYear: boolean): ColumnHeader[] {
  const headers: ColumnHeader[] = [];
  const fieldLabelMap = new Map<string, string>();
  for (const f of FIELD_MAP) {
    fieldLabelMap.set(f.column, f.label_en);
  }

  if (isMultiYear) {
    for (const year of result.years) {
      for (const field of result.fields) {
        headers.push({
          label: `${fieldLabelMap.get(field) || field} (${year})`,
          year,
          field,
        });
      }
    }
  } else {
    const year = result.years[0] ?? 0;
    for (const field of result.fields) {
      headers.push({
        label: fieldLabelMap.get(field) || field,
        year,
        field,
      });
    }
  }

  return headers;
}
