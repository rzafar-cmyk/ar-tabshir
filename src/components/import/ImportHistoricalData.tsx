import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, ChevronRight, ChevronLeft, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FIELD_MAP } from '@/lib/field-map';
import { ALL_COUNTRIES, getContinentForCountry } from '@/data/countries';
import { useAuth } from '@/contexts/AuthContext';
import { useConvexData } from '@/contexts/ConvexDataContext';

type ImportStep = 'upload' | 'preview' | 'import' | 'done';

interface ParsedRow {
  country: string;
  year: number;
  data: Record<string, string | number>;
  matched: boolean;
}

// Known continent headers used as separator rows in MasterFile
const CONTINENT_HEADERS = new Set([
  'AFRICA', 'ASIA', 'EUROPE', 'NORTH AMERICA', 'SOUTH AMERICA', 'OCEANIA',
  'PACIFIC', 'MIDDLE EAST', 'AMERICAS', 'CENTRAL AMERICA', 'CARIBBEAN',
]);

function isContientSeparator(val: string): boolean {
  if (!val) return false;
  const upper = String(val).trim().toUpperCase();
  return CONTINENT_HEADERS.has(upper) || upper.startsWith('TOTAL') || upper === '' || upper === 'COUNTRY';
}

// Build a lookup from various country name variants to canonical name
const COUNTRY_ALIASES: Record<string, string> = {};
for (const c of ALL_COUNTRIES) {
  COUNTRY_ALIASES[c.name.toLowerCase()] = c.name;
  // Common variants
  COUNTRY_ALIASES[c.name.toLowerCase().replace(/,.*$/, '')] = c.name;
}
// Manual overrides for known MasterFile naming
const MANUAL_ALIASES: Record<string, string> = {
  'usa': 'USA',
  'united states': 'USA',
  'united states of america': 'USA',
  'uk': 'United Kingdom',
  'great britain': 'United Kingdom',
  'ivory coast': 'Ivory Coast',
  "cote d'ivoire": 'Ivory Coast',
  'congo brazzaville': 'Congo Brazzaville',
  'congo kinshasa': 'Congo Kinshasa',
  'drc': 'Congo Kinshasa',
  'the gambia': 'Gambia, the',
  'gambia': 'Gambia, the',
};
for (const [k, v] of Object.entries(MANUAL_ALIASES)) {
  COUNTRY_ALIASES[k] = v;
}

function matchCountry(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower];
  // Fuzzy: find first country that starts with the input
  const found = ALL_COUNTRIES.find(c => c.name.toLowerCase().startsWith(lower));
  return found?.name ?? null;
}

// Build code→column mapping from FIELD_MAP
const CODE_TO_COLUMN: Record<string, string> = {};
for (const f of FIELD_MAP) {
  CODE_TO_COLUMN[f.excel_code] = f.column;
  CODE_TO_COLUMN[f.column] = f.column;
}

export function ImportHistoricalData({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { importReports, logAuditEvent } = useConvexData();
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [importYear, setImportYear] = useState(2024);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fieldCodes, setFieldCodes] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] }>({ imported: 0, skipped: 0, errors: [] });
  const [dragOver, setDragOver] = useState(false);
  const [previewRow, setPreviewRow] = useState<ParsedRow | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

        if (raw.length < 3) {
          alert('File has too few rows. Expected at least 3 rows (headers + data).');
          return;
        }

        // Row 1 (index 1) should contain field codes
        // Try index 0 first, then index 1 if 0 looks like section headers
        let codeRowIdx = 1;
        const row0 = raw[0] || [];
        const row1 = raw[1] || [];

        // Heuristic: if row0 has mostly empty or section-like strings, codes are in row1
        const row0Codes = row0.filter(c => c && String(c).match(/^[a-z][a-z0-9_]*$/i));
        const row1Codes = row1.filter(c => c && String(c).match(/^[a-z][a-z0-9_]*$/i));

        if (row0Codes.length > row1Codes.length) {
          codeRowIdx = 0;
        }

        const codeRow = raw[codeRowIdx] || [];

        // Map column indices to field codes
        const colMap: { idx: number; code: string; column: string }[] = [];
        const detectedCodes: string[] = [];
        let countryColIdx = 0;

        for (let i = 0; i < codeRow.length; i++) {
          const cell = String(codeRow[i] || '').trim().toLowerCase();
          if (cell === 'country' || cell === 'ملک' || cell === 'name') {
            countryColIdx = i;
            continue;
          }
          // Try to match the code
          const column = CODE_TO_COLUMN[cell] || CODE_TO_COLUMN[cell.replace(/\./g, '_')];
          if (column) {
            colMap.push({ idx: i, code: cell, column });
            detectedCodes.push(cell);
          }
        }

        // Data rows start after code row (skip one more if there's a label row between)
        const dataStartIdx = codeRowIdx + 1;
        // If the row right after codes looks like labels (text descriptions), skip it
        const possibleLabelRow = raw[dataStartIdx];
        let actualDataStart = dataStartIdx;
        if (possibleLabelRow) {
          const numericCount = possibleLabelRow.filter(c => c !== null && !isNaN(Number(c))).length;
          if (numericCount < colMap.length * 0.3) {
            actualDataStart = dataStartIdx + 1;
          }
        }

        const rows: ParsedRow[] = [];
        for (let r = actualDataStart; r < raw.length; r++) {
          const row = raw[r];
          if (!row || row.length === 0) continue;

          const countryRaw = String(row[countryColIdx] || '').trim();
          if (!countryRaw || isContientSeparator(countryRaw)) continue;

          const country = matchCountry(countryRaw);
          const rowData: Record<string, string | number> = {};

          for (const col of colMap) {
            const val = row[col.idx];
            if (val !== null && val !== undefined && val !== '') {
              rowData[col.column] = typeof val === 'number' ? val : (isNaN(Number(val)) ? String(val) : Number(val));
            }
          }

          if (Object.keys(rowData).length > 0) {
            rows.push({
              country: country || countryRaw,
              year: importYear,
              data: rowData,
              matched: !!country,
            });
          }
        }

        setParsedRows(rows);
        setFieldCodes(detectedCodes);
        setStep('preview');
      } catch (err) {
        alert('Failed to parse Excel file: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    reader.readAsArrayBuffer(file);
  }, [importYear]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xlsm') || file.name.endsWith('.xls'))) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleImport = async () => {
    const errors: string[] = [];
    const matchedRows = parsedRows.filter(row => {
      if (!row.matched) {
        errors.push(`Skipped "${row.country}" — no matching country found`);
        return false;
      }
      return true;
    });
    const skipped = parsedRows.length - matchedRows.length;

    const reportsToImport = matchedRows.map(row => {
      const countryConfig = ALL_COUNTRIES.find(c => c.name === row.country);
      const continent = getContinentForCountry(row.country);
      const countryCode = row.country.substring(0, 2).toUpperCase();
      const now = new Date().toISOString();
      return {
        country: row.country,
        countryCode,
        flag: '',
        continent: continent || countryConfig?.continent || 'Other',
        year: row.year,
        status: 'approved',
        progress: 100,
        data: row.data as Record<string, string | number>,
        submittedBy: 'Historical Import',
        submittedByUserId: user?.id || 'system',
        submittedAt: now,
        approvedBy: 'System (Historical)',
        approvedAt: now,
        lastUpdated: now,
      };
    });

    try {
      const result = await importReports(reportsToImport);
      const imported = result.created + result.updated;

      await logAuditEvent({
        action: 'import_historical',
        country: 'Global',
        details: `Imported ${imported} reports for year ${importYear} from ${fileName}. Skipped: ${skipped}.`,
      });

      setImportResult({ imported, skipped, errors });
      setStep('done');
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const matchedCount = parsedRows.filter(r => r.matched).length;
  const unmatchedCount = parsedRows.filter(r => !r.matched).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Upload', 'Preview', 'Import', 'Done'].map((label, i) => {
          const stepNames: ImportStep[] = ['upload', 'preview', 'import', 'done'];
          const isActive = stepNames.indexOf(step) >= i;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="w-4 h-4 text-gray-300" />}
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                {i + 1}. {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Import Historical Data</h2>
            <p className="text-sm text-gray-500 mt-1">Upload a MasterFile Excel (.xlsx/.xlsm) to import historical report data.</p>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Report Year:</label>
            <select
              value={importYear}
              onChange={e => setImportYear(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
            >
              {Array.from({ length: 10 }, (_, i) => 2015 + i).map(y => (
                <option key={y} value={y}>{y}-{y + 1}</option>
              ))}
            </select>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-2">Drag & drop your Excel file here</p>
            <p className="text-xs text-gray-400 mb-4">or</p>
            <label className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              Browse Files
              <input
                type="file"
                accept=".xlsx,.xlsm,.xls"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700 space-y-1">
                <p className="font-medium">Expected MasterFile format:</p>
                <ul className="list-disc pl-4">
                  <li>Row 1: Section headers (optional)</li>
                  <li>Row 2: Field codes (j1, m1, mi1, b1, etc.)</li>
                  <li>Row 3+: Country data (one row per country)</li>
                  <li>Continent separator rows are automatically skipped</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Preview Import Data</h2>
              <p className="text-sm text-gray-500 mt-1">
                <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                {fileName} — Year: {importYear}-{importYear + 1}
              </p>
            </div>
            <button onClick={() => { setStep('upload'); setParsedRows([]); }} className="text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-4 h-4 inline" /> Back
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium">Total Rows</p>
              <p className="text-2xl font-bold text-blue-700">{parsedRows.length}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium">Matched Countries</p>
              <p className="text-2xl font-bold text-emerald-700">{matchedCount}</p>
            </div>
            <div className={`rounded-xl px-4 py-3 border ${unmatchedCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-xs font-medium ${unmatchedCount > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Unmatched</p>
              <p className={`text-2xl font-bold ${unmatchedCount > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{unmatchedCount}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500">{fieldCodes.length} field codes detected: {fieldCodes.slice(0, 15).join(', ')}{fieldCodes.length > 15 ? ` +${fieldCodes.length - 15} more` : ''}</p>

          {/* Options */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={e => setOverwriteExisting(e.target.checked)}
              className="rounded border-gray-300"
            />
            Overwrite existing reports for this year (merge data)
          </label>

          {/* Data Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Country</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Fields</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Preview</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${!row.matched ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-2 text-gray-800 font-medium">{row.country}</td>
                    <td className="px-4 py-2">
                      {row.matched ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3 h-3" /> Matched</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="w-3 h-3" /> Unmatched</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{Object.keys(row.data).length} fields</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setPreviewRow(row)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => { setStep('upload'); setParsedRows([]); }}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { setStep('import'); handleImport(); }}
              disabled={matchedCount === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Import {matchedCount} Countries
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="text-center space-y-6 py-12">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Import Complete</h2>
            <p className="text-sm text-gray-500 mt-1">{fileName} — Year {importYear}-{importYear + 1}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium">Imported</p>
              <p className="text-2xl font-bold text-emerald-700">{importResult.imported}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-500 font-medium">Skipped</p>
              <p className="text-2xl font-bold text-gray-600">{importResult.skipped}</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left max-w-lg mx-auto max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-amber-700 mb-2">Warnings ({importResult.errors.length}):</p>
              <ul className="text-xs text-amber-600 space-y-1">
                {importResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => { setStep('upload'); setParsedRows([]); setImportResult({ imported: 0, skipped: 0, errors: [] }); }}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Import Another File
            </button>
            <button
              onClick={onDone}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-gray-800">{previewRow.country}</h3>
                <p className="text-xs text-gray-500">{Object.keys(previewRow.data).length} fields — Year {importYear}-{importYear + 1}</p>
              </div>
              <button onClick={() => setPreviewRow(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left pb-2 text-xs font-medium text-gray-500">Field</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(previewRow.data).map(([key, val]) => {
                    const fieldDef = FIELD_MAP.find(f => f.column === key);
                    return (
                      <tr key={key} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-600">
                          <span className="font-medium">{fieldDef?.label_en || key}</span>
                          <span className="text-xs text-gray-400 ml-2">({key})</span>
                        </td>
                        <td className="py-1.5 text-gray-800 font-medium">{String(val)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
