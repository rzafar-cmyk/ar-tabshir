import * as XLSX from 'xlsx';
import { REPORT_FORM_SECTIONS } from '@/data/reportFormSchema';
import { getCurrentFiscalYear, formatFiscalYear } from '@/lib/fiscalYear';

interface ReportRecord {
  id: string;
  country: string;
  year: number;
  status: string;
  progress: number;
  lastUpdated: string;
  submittedAt?: string;
  data?: Record<string, string | number>;
}

export function exportAllReportsToExcel(allowedCountries?: string[], convexReports?: ReportRecord[]) {
  const allReports = convexReports ?? [];
  let reports = allReports.filter(r => r.data && Object.keys(r.data).length > 0);

  if (allowedCountries) {
    reports = reports.filter(r => allowedCountries.includes(r.country));
  }

  if (reports.length === 0) {
    alert('No reports with data available to export.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ──
  const summaryRows: Record<string, any>[] = reports.map(r => ({
    'Country': r.country,
    'Year': r.year,
    'Status': r.status,
    'Progress': `${r.progress}%`,
    'Last Updated': r.lastUpdated,
    'Submitted At': r.submittedAt || '—',
  }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  // Set column widths
  summarySheet['!cols'] = [
    { wch: 25 }, { wch: 8 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // ── Sheet 2: All Data (one row per country, one column per field) ──
  // Collect all unique field codes across all reports
  const allFieldCodes = new Set<string>();
  reports.forEach(r => {
    if (r.data) {
      Object.keys(r.data).forEach(key => {
        // Skip dynamic missionary fields and additional notes for this sheet
        if (!key.startsWith('cmd_') && !key.endsWith('_additional_notes')) {
          allFieldCodes.add(key);
        }
      });
    }
  });

  const sortedFieldCodes = Array.from(allFieldCodes).sort();

  // Build header row with field labels from schema
  const fieldLabelMap: Record<string, string> = {};
  REPORT_FORM_SECTIONS.forEach(section => {
    section.fields.forEach(f => {
      fieldLabelMap[f.code] = f.label;
    });
    section.subsections?.forEach(sub => {
      sub.fields.forEach(f => {
        fieldLabelMap[f.code] = f.label;
      });
    });
  });

  const allDataRows: Record<string, any>[] = reports.map(r => {
    const row: Record<string, any> = { 'Country': r.country };
    sortedFieldCodes.forEach(code => {
      const label = fieldLabelMap[code] || code;
      row[label] = r.data?.[code] ?? '';
    });
    return row;
  });

  const allDataSheet = XLSX.utils.json_to_sheet(allDataRows);
  // Auto-width for country column
  allDataSheet['!cols'] = [{ wch: 25 }, ...sortedFieldCodes.map(() => ({ wch: 18 }))];
  XLSX.utils.book_append_sheet(wb, allDataSheet, 'All Data');

  // ── Sheets 3+: One sheet per form section ──
  REPORT_FORM_SECTIONS.forEach(section => {
    const sectionFields = [
      ...section.fields,
      ...(section.subsections?.flatMap(s => s.fields) ?? []),
    ];

    if (sectionFields.length === 0) return;

    // Check if any report has data for this section
    const hasData = reports.some(r =>
      sectionFields.some(f => {
        const v = r.data?.[f.code];
        return v !== undefined && v !== '';
      })
    );

    if (!hasData) return;

    const sectionRows: Record<string, any>[] = reports.map(r => {
      const row: Record<string, any> = { 'Country': r.country };
      sectionFields.forEach(f => {
        row[f.label] = r.data?.[f.code] ?? '';
      });
      // Additional notes
      const notes = r.data?.[`${section.id}_additional_notes`];
      if (notes) {
        row['Additional Notes'] = notes;
      }
      return row;
    });

    const sectionSheet = XLSX.utils.json_to_sheet(sectionRows);
    sectionSheet['!cols'] = [{ wch: 25 }, ...sectionFields.map(() => ({ wch: 20 }))];

    // Truncate sheet name to 31 chars (Excel limit)
    const sheetName = `${section.number}. ${section.title}`.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, sectionSheet, sheetName);
  });

  // ── Missionary Sheet ──
  const missionaryRows: Record<string, any>[] = [];
  reports.forEach(r => {
    if (!r.data) return;
    let i = 1;
    while (r.data[`cmd_name_${i}`]) {
      missionaryRows.push({
        'Country': r.country,
        'Name': r.data[`cmd_name_${i}`] || '',
        'Jamia': r.data[`cmd_jamia_${i}`] || '',
        'Graduation Year': r.data[`cmd_grad_year_${i}`] || '',
        'Current Posting': r.data[`cmd_posting_${i}`] || '',
        'Posted Since': r.data[`cmd_posting_since_${i}`] || '',
        'Phone': r.data[`cmd_phone_${i}`] || '',
        'Email': r.data[`cmd_email_${i}`] || '',
      });
      i++;
    }
  });

  if (missionaryRows.length > 0) {
    const missionarySheet = XLSX.utils.json_to_sheet(missionaryRows);
    missionarySheet['!cols'] = [
      { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
      { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, missionarySheet, 'Missionaries');
  }

  // ── Additional Notes Sheet ──
  const notesRows: Record<string, any>[] = [];
  reports.forEach(r => {
    if (!r.data) return;
    REPORT_FORM_SECTIONS.forEach(section => {
      const noteKey = `${section.id}_additional_notes`;
      const noteVal = r.data?.[noteKey];
      if (noteVal) {
        notesRows.push({
          'Country': r.country,
          'Section': `${section.number}. ${section.title}`,
          'Notes': noteVal,
        });
      }
    });
  });

  if (notesRows.length > 0) {
    const notesSheet = XLSX.utils.json_to_sheet(notesRows);
    notesSheet['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, notesSheet, 'Additional Notes');
  }

  // ── Download ──
  const fileName = `Annual_Reports_${formatFiscalYear(getCurrentFiscalYear())}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
}

// ── Export compiled results to Excel ──
import type { MultiYearCompilationResult } from './compile-types';
import { buildColumnHeaders } from './compile-types';

export function exportCompiledToExcel(results: MultiYearCompilationResult) {
  const isMultiYear = results.years.length > 1;
  const headers = buildColumnHeaders(results, isMultiYear);
  const wb = XLSX.utils.book_new();

  // Build rows
  const rows: Record<string, any>[] = [];
  for (const country of results.countries) {
    const row: Record<string, any> = { Country: country };
    for (const h of headers) {
      row[h.label] = results.data[country]?.[h.year]?.[h.field] ?? '—';
    }
    rows.push(row);
  }

  // Totals row
  const totalsRow: Record<string, any> = { Country: 'TOTAL' };
  for (const h of headers) {
    totalsRow[h.label] = results.totals[h.year]?.[h.field] ?? 0;
  }
  rows.push(totalsRow);

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 25 }, ...headers.map(() => ({ wch: 20 }))];
  XLSX.utils.book_append_sheet(wb, ws, 'Compiled Data');

  const fileName = `Compiled_Report_${results.fields.length}_fields_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
}
