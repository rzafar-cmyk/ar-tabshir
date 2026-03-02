import { useState, useCallback } from 'react';
import { X, Flag, Send } from 'lucide-react';
import { getFieldsBySection, resolveFieldValue, type FieldDefinition } from '@/lib/field-map';
import { REPORT_FORM_SECTIONS } from '@/data/reportFormSchema';
import { useConvexData } from '@/contexts/ConvexDataContext';
import type { RevisionFlag } from '@/services/dataService';

// Build a lookup: excel_code → formula string (from schema)
const FORMULA_MAP: Record<string, string> = {};
for (const section of REPORT_FORM_SECTIONS) {
  for (const f of section.fields) {
    if (f.formula) FORMULA_MAP[f.code] = f.formula;
  }
  for (const sub of section.subsections ?? []) {
    for (const f of sub.fields) {
      if (f.formula) FORMULA_MAP[f.code] = f.formula;
    }
  }
}

function evaluateFormula(formula: string, data: Record<string, string | number>): number {
  try {
    const parts = formula.split(/\s*\+\s*/);
    let total = 0;
    for (const p of parts) {
      const code = p.trim();
      const resolved = resolveFieldValue(data, code);
      const val = Number(resolved || 0);
      total += isNaN(val) ? 0 : val;
    }
    return total;
  } catch {
    return 0;
  }
}

function getDisplayValue(excelCode: string, data: Record<string, string | number>): string | number {
  const raw = resolveFieldValue(data, excelCode);
  const formula = FORMULA_MAP[excelCode];
  if (formula) {
    const userVal = raw !== undefined && raw !== '' ? raw : evaluateFormula(formula, data);
    return userVal || 0;
  }
  if (raw === undefined || raw === '') return '-';
  return raw;
}

interface RevisionReport {
  id: string;
  country: string;
  flag: string;
  year: number;
  status: string;
  progress: number;
  submittedBy: string;
  submittedAt?: string;
  data: Record<string, string | number>;
}

interface RevisionReviewModalProps {
  report: RevisionReport;
  reviewerName: string;
  onClose: () => void;
  onRevisionSent: () => void;
}

export function RevisionReviewModal({
  report,
  reviewerName,
  onClose,
  onRevisionSent,
}: RevisionReviewModalProps) {
  const { updateReportStatus } = useConvexData();
  const sections = getFieldsBySection();
  const [flagged, setFlagged] = useState<Map<string, string>>(new Map());
  const [toast, setToast] = useState(false);

  const toggleFlag = useCallback((column: string) => {
    setFlagged(prev => {
      const next = new Map(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.set(column, '');
      }
      return next;
    });
  }, []);

  const updateNote = useCallback((column: string, note: string) => {
    setFlagged(prev => new Map(prev).set(column, note));
  }, []);

  const handleSend = async () => {
    const now = new Date().toISOString().split('T')[0];
    const revisionFlags: RevisionFlag[] = Array.from(flagged.entries()).map(
      ([fieldCode, note]) => ({
        fieldCode,
        note,
        flaggedBy: reviewerName,
        flaggedAt: now,
      }),
    );

    await updateReportStatus(report.id, 'revision_requested', {
      revisionFlags,
    });

    setToast(true);
    setTimeout(() => {
      setToast(false);
      onRevisionSent();
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{report.flag}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Review: {report.country}
              </h2>
              <p className="text-sm text-gray-500">
                Annual Report {report.year} — Flag fields that need correction
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {flagged.size > 0 && (
              <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                {flagged.size} field{flagged.size !== 1 ? 's' : ''} flagged
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body — all sections expanded */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {Array.from(sections.entries()).map(([sectionName, fields]) => (
            <div
              key={sectionName}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="font-medium text-gray-800">{sectionName}</span>
              </div>
              <div className="p-4 space-y-1">
                {fields.map(field => (
                  <FieldRow
                    key={field.column}
                    field={field}
                    value={getDisplayValue(field.excel_code, report.data)}
                    isFlagged={flagged.has(field.excel_code)}
                    note={flagged.get(field.excel_code) ?? ''}
                    onToggle={() => toggleFlag(field.excel_code)}
                    onNoteChange={note => updateNote(field.excel_code, note)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={flagged.size === 0}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            Send Back for Revision
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg">
          Report sent back for revision successfully
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// FieldRow — single field with flag toggle + note input
// ───────────────────────────────────────────────────────────

function FieldRow({
  field,
  value,
  isFlagged,
  note,
  onToggle,
  onNoteChange,
}: {
  field: FieldDefinition;
  value: string | number | undefined;
  isFlagged: boolean;
  note: string;
  onToggle: () => void;
  onNoteChange: (note: string) => void;
}) {
  const display = value !== undefined && value !== '' ? String(value) : '-';

  return (
    <div
      className={`rounded-lg px-3 py-2 transition-colors ${
        isFlagged ? 'bg-amber-50 border border-amber-200' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Flag button */}
        <button
          onClick={onToggle}
          className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
            isFlagged
              ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
              : 'text-gray-300 hover:text-amber-500 hover:bg-gray-100'
          }`}
          title={isFlagged ? 'Remove flag' : 'Flag for revision'}
        >
          <Flag className="w-4 h-4" />
        </button>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700">{field.label_en}</p>
          <p className="text-xs text-gray-400" dir="rtl">
            {field.label_ur}
          </p>
        </div>

        {/* Value */}
        <span className="text-sm font-medium text-gray-900 flex-shrink-0">
          {display}
        </span>
      </div>

      {/* Note input — visible when flagged */}
      {isFlagged && (
        <div className="mt-2 ml-10">
          <input
            type="text"
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="What needs to be corrected?"
            className="w-full px-3 py-1.5 text-sm border border-amber-200 rounded-lg bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
          />
        </div>
      )}
    </div>
  );
}
