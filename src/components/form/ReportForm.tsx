import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, Save, Send, Star, CheckCircle2, Circle, AlertCircle, Printer } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { PrintableReport } from './PrintableReport';
import '@/styles/print-styles.css';
import { REPORT_FORM_SECTIONS, PROPERTY_DETAIL_FIELDS, PUBLICATION_DETAIL_FIELDS, CENTRAL_REP_DETAIL_FIELDS, MISSIONARY_DETAIL_FIELDS } from '@/data/reportFormSchema';
import type { FormField, FormSubsection } from '@/data/reportFormSchema';
import { FIELD_MAP, normalizeReportData } from '@/lib/field-map';
import { getContinentForCountry } from '@/data/countries';
import { useAuth } from '@/contexts/AuthContext';
import { useConvexData } from '@/contexts/ConvexDataContext';
import type { FieldChange } from '@/lib/audit';
import { buildCarryForwardData, CARRY_FORWARD_FIELD_CODES } from '@/lib/carry-forward';
import { getCurrentFiscalYear } from '@/lib/fiscalYear';

interface RevisionFlag {
  fieldCode: string;
  note: string;
  flaggedBy?: string;
  flaggedAt?: string;
}

interface ReportFormProps {
  country?: string;
  countryName?: string;
  year?: number;
  initialData?: Record<string, string | number | boolean>;
  revisionFlags?: RevisionFlag[];
  onSave?: (data?: Record<string, string | number>) => void;
  onSubmit?: (data?: Record<string, string | number>) => void;
  onResubmit?: (data?: Record<string, string | number>) => void;
  readOnly?: boolean;
}

interface ReportData {
  id: string;
  country: string;
  continent?: string;
  year: number;
  status: string;
  data: Record<string, string | number>;
  lastUpdated: string;
  submittedAt?: string;
  submittedBy?: string;
  submittedByUserId?: string;
  progress: number;
  revisionFlags?: RevisionFlag[];
}

function evaluateFormula(formula: string, data: Record<string, string | number>): number {
  try {
    const parts = formula.split(/\s*\+\s*/);
    let total = 0;
    for (const p of parts) {
      const val = Number(data[p.trim()] || 0);
      total += isNaN(val) ? 0 : val;
    }
    return total;
  } catch {
    return 0;
  }
}

// ─── Section progress helper ───
function getSectionProgress(sectionId: string, data: Record<string, string | number>) {
  const section = REPORT_FORM_SECTIONS.find(s => s.id === sectionId);
  if (!section) return { filled: 0, total: 0, percent: 0 };
  const allFields = [
    ...section.fields,
    ...(section.subsections?.flatMap(s => s.fields) ?? []),
  ];
  const requiredFields = allFields.filter(f => !f.optional);
  const total = requiredFields.length;
  const filled = requiredFields.filter(f => {
    if (f.formula) return true;
    const v = data[f.code];
    return v !== undefined && v !== null && v !== '';
  }).length;
  return { filled, total, percent: total > 0 ? Math.round((filled / total) * 100) : 0 };
}

// ─── Single Field Renderer ───
function FieldInput({
  field,
  value,
  onChange,
  formulaValue,
  revisionFlag,
  carryForwardReadOnly,
}: {
  field: FormField;
  value: string | number;
  onChange: (code: string, val: string | number) => void;
  formulaValue?: number;
  revisionFlag?: { note: string };
  carryForwardReadOnly?: boolean;
}) {
  const hasFormula = !!field.formula;
  const displayValue = hasFormula && (value === '' || value === undefined) ? (formulaValue ?? '') : value;
  const flagClass = revisionFlag ? 'border-amber-400 bg-amber-50' : carryForwardReadOnly ? 'border-teal-300 bg-teal-50' : 'border-gray-200 hover:border-blue-300';

  const baseInputClass = `w-full px-3.5 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all duration-150 ${flagClass} ${carryForwardReadOnly ? 'cursor-not-allowed' : ''}`;

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={displayValue}
            onChange={(e) => onChange(field.code, e.target.value)}
            rows={3}
            className={baseInputClass}
            placeholder={field.notes || ''}
          />
        );
      case 'select': {
        const hasOtherOption = field.options?.includes('Other');
        const isOtherSelected = hasOtherOption && String(displayValue) !== '' && !field.options?.some(opt => opt !== 'Other' && opt === String(displayValue));
        const selectValue = isOtherSelected ? 'Other' : String(displayValue);
        return (
          <div>
            <select
              value={selectValue}
              onChange={(e) => {
                if (e.target.value === 'Other') {
                  onChange(field.code, 'Other:');
                } else {
                  onChange(field.code, e.target.value);
                }
              }}
              className={baseInputClass}
            >
              <option value="">— Select —</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {isOtherSelected && (
              <input
                type="text"
                value={String(displayValue).replace(/^Other:\s*/, '')}
                onChange={(e) => onChange(field.code, `Other: ${e.target.value}`)}
                className={`${baseInputClass} mt-2`}
                placeholder="Please specify..."
              />
            )}
          </div>
        );
      }
      case 'number':
        return (
          <input
            type="number"
            value={displayValue}
            onChange={(e) => onChange(field.code, e.target.value === '' ? '' : Number(e.target.value))}
            className={`${baseInputClass} ${hasFormula ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : ''}`}
            placeholder={hasFormula ? `Auto-total: ${formulaValue ?? 0}` : '0'}
            readOnly={carryForwardReadOnly}
            title={carryForwardReadOnly ? 'Carried forward from previous year (read-only)' : undefined}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={String(displayValue)}
            onChange={(e) => onChange(field.code, e.target.value)}
            className={baseInputClass}
          />
        );
      case 'email':
        return (
          <input
            type="email"
            value={String(displayValue)}
            onChange={(e) => onChange(field.code, e.target.value)}
            className={baseInputClass}
            placeholder="email@example.com"
          />
        );
      case 'tel':
        return (
          <input
            type="tel"
            value={String(displayValue)}
            onChange={(e) => onChange(field.code, e.target.value)}
            className={baseInputClass}
            placeholder="+1234567890"
          />
        );
      default:
        return (
          <input
            type="text"
            value={String(displayValue)}
            onChange={(e) => onChange(field.code, e.target.value)}
            className={baseInputClass}
            placeholder={field.notes || ''}
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        <span className="flex items-start justify-between gap-4">
          <span className="flex items-center gap-2 flex-1">
            {field.label}
            {field.isNew && (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full shadow-sm">NEW</span>
            )}
          </span>
          {field.labelUrdu && (
            <span className="text-sm text-gray-500 font-normal flex-shrink-0 text-right" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: '2' }}>{field.labelUrdu}</span>
          )}
        </span>
      </label>
      {renderInput()}
      {field.notes && !hasFormula && (
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{field.notes}</p>
      )}
      {hasFormula && (
        <p className="text-xs text-indigo-500 mt-1 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          Total is auto-calculated ({formulaValue ?? 0}). You may override with explanation in the explanatory note.
        </p>
      )}
      {revisionFlag && (
        <div className="flex items-start gap-2 mt-1 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">{revisionFlag.note}</p>
        </div>
      )}
    </div>
  );
}

// ─── Subsection ───
function SubsectionBlock({
  subsection,
  data,
  onChange,
  revisionFlags,
  tooltip,
  carryForwardReadOnlyCodes,
}: {
  subsection: FormSubsection;
  data: Record<string, string | number>;
  onChange: (code: string, val: string | number) => void;
  revisionFlags?: Record<string, { note: string }>;
  tooltip?: string;
  carryForwardReadOnlyCodes?: Set<string>;
}) {
  return (
    <div className="ml-1 pl-5 border-l-3 border-indigo-300 space-y-5 mt-5">
      <h4 className="text-sm font-bold text-indigo-700 flex items-center justify-between gap-4">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          {tooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dashed border-indigo-300">{subsection.title}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            subsection.title
          )}
        </span>
        {subsection.titleUrdu && (
          <span className="text-sm text-indigo-400 font-normal flex-shrink-0 text-right" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: '2' }}>{subsection.titleUrdu}</span>
        )}
      </h4>
      {subsection.fields.map((field) => (
        <FieldInput
          key={field.code}
          field={field}
          value={data[field.code] ?? ''}
          onChange={onChange}
          formulaValue={field.formula ? evaluateFormula(field.formula, data) : undefined}
          revisionFlag={revisionFlags?.[field.code]}
          carryForwardReadOnly={carryForwardReadOnlyCodes?.has(field.code)}
        />
      ))}
    </div>
  );
}

// ─── Dynamic Property Details ───
function PropertyDetailsBlock({
  count,
  data,
  onChange,
}: {
  count: number;
  data: Record<string, string | number>;
  onChange: (code: string, val: string | number) => void;
}) {
  if (!count || count < 1) return null;
  return (
    <div className="mt-5 space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="p-5 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200 space-y-4 shadow-sm">
          <h5 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
            Property {i + 1} Details
          </h5>
          {PROPERTY_DETAIL_FIELDS.map((field) => {
            const code = `${field.code}_${i + 1}`;
            return (
              <FieldInput
                key={code}
                field={{ ...field, code }}
                value={data[code] ?? ''}
                onChange={onChange}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Dynamic Publication Details ───
function PublicationDetailsBlock({
  count,
  data,
  onChange,
}: {
  count: number;
  data: Record<string, string | number>;
  onChange: (code: string, val: string | number) => void;
}) {
  if (!count || count < 1) return null;
  return (
    <div className="mt-5 space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="p-5 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200 space-y-4 shadow-sm">
          <h5 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
            Publication {i + 1} Details
          </h5>
          {PUBLICATION_DETAIL_FIELDS.map((field) => {
            const code = `${field.code}_${i + 1}`;
            return (
              <FieldInput
                key={code}
                field={{ ...field, code }}
                value={data[code] ?? ''}
                onChange={onChange}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Dynamic Central Representative Visit Details ───
function CentralRepDetailsBlock({
  count,
  data,
  onChange,
}: {
  count: number;
  data: Record<string, string | number>;
  onChange: (code: string, val: string | number) => void;
}) {
  if (!count || count < 1) return null;
  return (
    <div className="mt-5 space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="p-5 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200 space-y-4 shadow-sm">
          <h5 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
            Visit {i + 1} Details
          </h5>
          {CENTRAL_REP_DETAIL_FIELDS.map((field) => {
            const code = `${field.code}_${i + 1}`;
            return (
              <FieldInput
                key={code}
                field={{ ...field, code }}
                value={data[code] ?? ''}
                onChange={onChange}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Missionary Details ───
function MissionaryDetailsBlock({
  data,
  onChange,
}: {
  data: Record<string, string | number>;
  onChange: (code: string, val: string | number) => void;
}) {
  const [showPopup, setShowPopup] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [tempData, setTempData] = useState<Record<string, string | number>>({});

  const missionaries: Record<string, string | number>[] = [];
  let i = 1;
  while (data[`cmd_name_${i}`]) {
    const m: Record<string, string | number> = {};
    for (const f of MISSIONARY_DETAIL_FIELDS) {
      m[f.code] = data[`${f.code}_${i}`] ?? '';
    }
    missionaries.push(m);
    i++;
  }

  const openAdd = () => { setTempData({}); setEditIndex(null); setShowPopup(true); };
  const openEdit = (idx: number) => {
    const m: Record<string, string | number> = {};
    for (const f of MISSIONARY_DETAIL_FIELDS) m[f.code] = data[`${f.code}_${idx + 1}`] ?? '';
    setTempData(m); setEditIndex(idx); setShowPopup(true);
  };
  const handleSave = () => {
    const idx = editIndex !== null ? editIndex + 1 : missionaries.length + 1;
    for (const f of MISSIONARY_DETAIL_FIELDS) onChange(`${f.code}_${idx}`, tempData[f.code] ?? '');
    setShowPopup(false); setTempData({}); setEditIndex(null);
  };
  const handleDelete = (idx: number) => {
    for (let j = idx + 1; j <= missionaries.length; j++) {
      for (const f of MISSIONARY_DETAIL_FIELDS) {
        onChange(`${f.code}_${j}`, j < missionaries.length ? (data[`${f.code}_${j + 1}`] ?? '') : '');
      }
    }
  };

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-bold text-gray-700">Central Missionary Details</h5>
        <button onClick={openAdd} className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-sm transition-all">
          + Add Missionary
        </button>
      </div>
      {missionaries.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Current Posting</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {missionaries.map((m, idx) => (
                <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-medium">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{String(m.cmd_name || '—')}</td>
                  <td className="px-4 py-3 text-gray-600">{String(m.cmd_posting || '—')}</td>
                  <td className="px-4 py-3 text-gray-600">{String(m.cmd_phone || '—')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(idx)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold mr-3">Details</button>
                    <button onClick={() => handleDelete(idx)} className="text-xs text-red-400 hover:text-red-600 font-semibold">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-400">No missionaries added yet</p>
          <p className="text-xs text-gray-300 mt-1">Click &quot;Add Missionary&quot; to begin</p>
        </div>
      )}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-lg font-bold text-gray-800">
                {editIndex !== null ? 'Edit Missionary' : 'Add New Missionary'}
              </h3>
              <button onClick={() => setShowPopup(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {MISSIONARY_DETAIL_FIELDS.map((field) => (
                <FieldInput key={field.code} field={field} value={tempData[field.code] ?? ''} onChange={(_c: string, val: string | number) => setTempData(prev => ({ ...prev, [field.code]: val }))} />
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowPopup(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-sm">
                {editIndex !== null ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Card ───
function SectionCard({
  section,
  data,
  onChange,
  expanded,
  onToggle,
  revisionFlags,
  carryForwardReadOnlyCodes,
}: {
  section: { id: string; number: number; title: string; titleUrdu?: string; fields: FormField[]; subsections?: FormSubsection[]; additionalInfoLabel?: string; additionalInfoLabelUrdu?: string };
  data: Record<string, string | number>;
  onChange: (code: string, val: string | number) => void;
  expanded: boolean;
  onToggle: () => void;
  revisionFlags?: Record<string, { note: string }>;
  carryForwardReadOnlyCodes?: Set<string>;
}) {
  const { filled, total, percent } = getSectionProgress(section.id, data);
  const additionalInfoKey = `${section.id}_additional_notes`;
  const addInfoLabel = section.additionalInfoLabel || 'Additional Information or Explanatory Note';
  const addInfoLabelUrdu = section.additionalInfoLabelUrdu || 'مزید معلومات یا وضاحتی نوٹ';

  return (
    <div id={`section-${section.id}`} className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all duration-200 ${expanded ? 'border-blue-200 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow'}`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 ${
            percent === 100 ? 'bg-emerald-100 text-emerald-600' :
            percent > 0 ? 'bg-blue-100 text-blue-600' :
            'bg-gray-100 text-gray-400'
          }`}>
            {section.number}
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <div className="text-left flex-1">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-gray-800">{section.title}</h3>
              {section.titleUrdu && <span className="text-sm text-gray-500 flex-shrink-0 text-right" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: '2' }}>{section.titleUrdu}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium">{filled}/{total}</span>
          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percent === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                percent > 0 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                'bg-gray-200'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          {percent === 100 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-5">
          {/* Faith-Inspiring Accounts — special rendering with RTL/LTR toggle */}
          {section.id === 'faith-accounts' ? (
            <div className="space-y-5">
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
                <p className="text-sm font-semibold text-amber-800">Please provide detailed accounts for each topic below.</p>
                <p className="text-xs text-amber-600 mt-1">You may write in English or Urdu. Use the RTL/LTR toggle to switch text direction per field.</p>
                <p className="text-xs text-amber-600 mt-0.5" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: '2' }}>براہ کرم ہر موضوع کے لیے تفصیلی واقعات درج کریں۔ آپ انگریزی یا اردو میں لکھ سکتے ہیں۔</p>
              </div>
              {section.fields.map((field) => {
                const dirKey = `${field.code}_dir`;
                const currentDir = data[dirKey] === 'ltr' ? 'ltr' : (field.rtlDefault ? 'rtl' : 'ltr');
                const isRtl = currentDir === 'rtl';
                return (
                  <div key={field.code} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Header bar with bilingual label */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <span className="flex items-start justify-between gap-4">
                        <span className="text-sm font-medium text-gray-700">
                          {field.label}
                        </span>
                        {field.labelUrdu && (
                          <span className="text-sm text-gray-500 font-normal flex-shrink-0 text-right" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: '2' }}>{field.labelUrdu}</span>
                        )}
                      </span>
                    </div>
                    {/* Toggle row */}
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center">
                      <button
                        type="button"
                        onClick={() => onChange(dirKey, isRtl ? 'ltr' : 'rtl')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${isRtl ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                        title={isRtl ? 'Switch to Left-to-Right (English)' : 'Switch to Right-to-Left (Urdu)'}
                      >
                        {isRtl ? 'اردو' : 'English'}
                      </button>
                    </div>
                    {/* Textarea */}
                    <textarea
                      dir={currentDir}
                      value={String(data[field.code] ?? '')}
                      onChange={(e) => onChange(field.code, e.target.value)}
                      rows={4}
                      className={`w-full px-4 py-3 text-sm border-0 focus:ring-0 outline-none resize-y ${isRtl ? "font-['Noto_Nastaliq_Urdu',serif] leading-[2.2]" : ''}`}
                      placeholder={isRtl ? 'یہاں اردو میں لکھیں...' : 'Type here in English...'}
                      style={isRtl ? { fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: '2.2' } : undefined}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {/* Render fields that should appear before subsections */}
              {!section.subsections?.length && section.fields.map((field) => {
                return (
                  <div key={field.code}>
                    <FieldInput
                      field={field}
                      value={data[field.code] ?? ''}
                      onChange={onChange}
                      formulaValue={field.formula ? evaluateFormula(field.formula, data) : undefined}
                      revisionFlag={revisionFlags?.[field.code]}
                      carryForwardReadOnly={carryForwardReadOnlyCodes?.has(field.code)}
                    />
                    {field.dynamicTrigger === 'propertyDetails' && Math.floor(Number(data[field.code] || 0)) > 0 && (
                      <PropertyDetailsBlock count={Math.floor(Number(data[field.code] || 0))} data={data} onChange={onChange} />
                    )}
                    {field.dynamicTrigger === 'publicationDetails' && Math.floor(Number(data[field.code] || 0)) > 0 && (
                      <PublicationDetailsBlock count={Math.floor(Number(data[field.code] || 0))} data={data} onChange={onChange} />
                    )}
                    {field.dynamicTrigger === 'centralRepDetails' && Math.floor(Number(data[field.code] || 0)) > 0 && (
                      <CentralRepDetailsBlock count={Math.floor(Number(data[field.code] || 0))} data={data} onChange={onChange} />
                    )}
                  </div>
                );
              })}

              {section.subsections?.map((sub) => {
                const missionaryTooltips: Record<string, string> = {
                  'central-missionaries': 'Graduates of an International Jamia.',
                  'local-missionaries': 'Graduates of a local Jamia-tul-Mubashireen.',
                  'local-muallimeen': 'Personnel trained directly by senior missionaries or through specialized instructional courses.',
                };
                const tooltip = section.id === 'missionaries' ? missionaryTooltips[sub.id] : undefined;
                return (
                  <div key={sub.id}>
                    <SubsectionBlock subsection={sub} data={data} onChange={onChange} revisionFlags={revisionFlags} tooltip={tooltip} carryForwardReadOnlyCodes={carryForwardReadOnlyCodes} />
                    {section.id === 'missionaries' && sub.id === 'central-missionaries' && (
                      <MissionaryDetailsBlock data={data} onChange={onChange} />
                    )}
                  </div>
                );
              })}

              {/* Render section-level fields after subsections (e.g. missionaries refresher courses) */}
              {section.subsections?.length && section.fields.length > 0 && section.fields.map((field) => {
                return (
                  <div key={field.code}>
                    <FieldInput
                      field={field}
                      value={data[field.code] ?? ''}
                      onChange={onChange}
                      formulaValue={field.formula ? evaluateFormula(field.formula, data) : undefined}
                      revisionFlag={revisionFlags?.[field.code]}
                      carryForwardReadOnly={carryForwardReadOnlyCodes?.has(field.code)}
                    />
                  </div>
                );
              })}
            </>
          )}

          {/* Additional Info */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700">
              <span className="flex items-start justify-between gap-4">
                <span className="flex-1">{addInfoLabel}</span>
                <span className="text-sm text-gray-500 font-normal flex-shrink-0 text-right" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: '2' }}>{addInfoLabelUrdu}</span>
              </span>
              <span className="block text-xs text-gray-300 font-normal mt-1">You may type in English or Urdu</span>
            </label>
            <textarea
              dir="auto"
              value={String(data[additionalInfoKey] ?? '')}
              onChange={(e) => onChange(additionalInfoKey, e.target.value)}
              rows={3}
              className="w-full mt-2 px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none hover:border-blue-300 transition-all"
              placeholder="Type here in English or Urdu..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Progress Sidebar ───
function SectionProgressSidebar({
  data,
  expandedSections,
  onJumpToSection,
}: {
  data: Record<string, string | number>;
  expandedSections: Set<string>;
  onJumpToSection: (sectionId: string) => void;
}) {
  return (
    <div className="w-72 flex-shrink-0 hidden xl:block">
      <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h3 className="text-sm font-bold">Section Progress</h3>
          <p className="text-xs text-blue-200 mt-0.5">Click to jump to a section</p>
        </div>
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-3 space-y-1">
          {REPORT_FORM_SECTIONS.map((section) => {
            const { percent } = getSectionProgress(section.id, data);
            const isActive = expandedSections.has(section.id);
            return (
              <button
                key={section.id}
                onClick={() => onJumpToSection(section.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150 group ${
                  isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                {percent === 100 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : percent > 0 ? (
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <svg className="w-4 h-4 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray={`${percent}, 100`} />
                    </svg>
                  </div>
                ) : (
                  <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
                <span className={`text-xs font-medium truncate ${
                  isActive ? 'text-blue-700' : percent === 100 ? 'text-emerald-700' : 'text-gray-600 group-hover:text-gray-800'
                }`}>
                  {section.number}. {section.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Report Form ───
export function ReportForm({ country, countryName, year = getCurrentFiscalYear(), initialData, revisionFlags: propRevisionFlags, onSave, onSubmit, onResubmit, readOnly }: ReportFormProps) {
  const { user: authUser } = useAuth();
  const { allReports: convexReports, saveReport: convexSaveReport, logAuditEvent } = useConvexData();
  const resolvedCountry = country || countryName || '';
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['jamaats']));
  const [toast, setToast] = useState<string | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      const converted: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(initialData)) {
        converted[k] = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v;
      }
      setFormData(normalizeReportData(converted));
      return;
    }
    if (!resolvedCountry) return;
    const reports = convexReports as unknown as ReportData[];
    // In readOnly mode, show any report (including archived). Otherwise skip archived.
    const existing = readOnly
      ? reports.find((r) => r.country === resolvedCountry && r.year === year)
      : reports.find((r) => r.country === resolvedCountry && r.year === year && !(r as any).archived);

    // Carry-forward: pre-fill opening fields from previous year's totals
    const prevYear = reports.find((r) => r.country === resolvedCountry && r.year === year - 1 && !(r as any).archived);
    const carryForward = prevYear?.data ? buildCarryForwardData(normalizeReportData(prevYear.data)) : {};

    if (existing?.data) {
      // Normalize data so both code and column keys are available
      const normalized = normalizeReportData(existing.data);
      // Merge carry-forward under existing data (existing values take precedence)
      const merged = { ...carryForward, ...normalized };
      setFormData(merged);
    } else if (Object.keys(carryForward).length > 0) {
      setFormData(carryForward);
    }
  }, [resolvedCountry, year, initialData, convexReports]);

  useEffect(() => {
    if (!resolvedCountry || readOnly) return;
    const interval = setInterval(() => { saveFormData('draft', true).then(() => setLastSaved(new Date().toLocaleTimeString())); }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedCountry, formData, readOnly]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  // Auto-scroll on Tab: when an input receives focus, scroll it into view
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  const handleFieldChange = useCallback((code: string, val: string | number) => {
    setFormData((prev) => ({ ...prev, [code]: val }));
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
      return next;
    });
  };

  const jumpToSection = (sectionId: string) => {
    setExpandedSections((prev) => new Set(prev).add(sectionId));
    setTimeout(() => {
      document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const calculateProgress = (): number => {
    const allFields = REPORT_FORM_SECTIONS.flatMap((s) => [...s.fields, ...(s.subsections?.flatMap((sub) => sub.fields) ?? [])]);
    const requiredFields = allFields.filter((f) => !f.optional);
    const filled = requiredFields.filter((f) => { if (f.formula) return true; const v = formData[f.code]; return v !== undefined && v !== null && v !== ''; }).length;
    return requiredFields.length > 0 ? Math.round((filled / requiredFields.length) * 100) : 0;
  };

  // Build field code → label map for audit change tracking
  const fieldLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    REPORT_FORM_SECTIONS.forEach(section => {
      section.fields.forEach(f => { map[f.code] = f.label; });
      section.subsections?.forEach(sub => {
        sub.fields.forEach(f => { map[f.code] = f.label; });
      });
    });
    return map;
  }, []);

  const saveFormData = async (status: 'draft' | 'submitted' = 'draft', autoSave = false) => {
    if (!resolvedCountry) return;
    const reports = convexReports as unknown as ReportData[];
    const now = new Date().toISOString();
    const existingIdx = reports.findIndex((r) => r.country === resolvedCountry && r.year === year && !(r as any).archived);
    // Preserve revision_requested status during auto-save so flags/banner remain visible
    const currentStatus = existingIdx >= 0 ? reports[existingIdx].status : 'draft';
    const effectiveStatus = (status === 'draft' && (currentStatus === 'revision_requested' || currentStatus === 'update_in_progress'))
      ? currentStatus
      : status;

    // Compute field-level changes for audit (only on explicit save/submit)
    let changes: FieldChange[] | undefined;
    const isNewReport = existingIdx < 0;
    if (!autoSave && existingIdx >= 0) {
      const oldData = reports[existingIdx].data || {};
      changes = [];
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(formData)]);
      for (const key of allKeys) {
        if (key.startsWith('cmd_') || key.endsWith('_additional_notes')) continue;
        const oldVal = oldData[key];
        const newVal = formData[key];
        const oldNorm = (oldVal === undefined || oldVal === null || oldVal === '') ? '' : String(oldVal);
        const newNorm = (newVal === undefined || newVal === null || newVal === '') ? '' : String(newVal);
        if (oldNorm !== newNorm) {
          changes.push({
            code: key,
            label: fieldLabelMap[key] || key,
            oldValue: oldNorm === '' ? undefined : oldVal,
            newValue: newNorm === '' ? undefined : newVal,
          });
        }
      }
      if (changes.length === 0) changes = undefined;
    }

    // Save via Convex mutation (upserts by country+year)
    const revisionFlags = effectiveStatus === 'submitted' ? undefined : (existingIdx >= 0 ? (reports[existingIdx] as any).revisionFlags : undefined);
    await convexSaveReport({
      country: resolvedCountry,
      continent: getContinentForCountry(resolvedCountry),
      year,
      status: effectiveStatus,
      data: formData,
      progress: calculateProgress(),
      submittedBy: authUser?.name ?? '',
      submittedByUserId: authUser?.id ?? '',
      submittedAt: effectiveStatus === 'submitted' ? now : (existingIdx >= 0 ? reports[existingIdx].submittedAt : undefined),
      revisionFlags,
    });

    // Audit logging — skip for auto-save
    if (!autoSave) {
      const statusChanged = currentStatus !== effectiveStatus;
      let action = effectiveStatus === 'submitted' ? 'submitted' : 'draft_saved';
      let details: string;

      if (isNewReport) {
        action = 'report_created';
        details = `New report created for ${resolvedCountry}`;
      } else if (statusChanged && effectiveStatus === 'submitted') {
        details = `Status changed: ${currentStatus.replace('_', ' ')} → Submitted for ${resolvedCountry}`;
      } else {
        const changeCount = changes?.length ?? 0;
        details = changeCount > 0
          ? `${resolvedCountry} — ${changeCount} field${changeCount !== 1 ? 's' : ''} changed`
          : `Draft saved for ${resolvedCountry}`;
      }

      await logAuditEvent({
        action,
        country: resolvedCountry,
        details,
        changes: changes ? JSON.stringify(changes) : undefined,
      });
    }
  };

  const handleSave = async () => { await saveFormData('draft', false); setToast('Report saved as draft.'); setLastSaved(new Date().toLocaleTimeString()); if (onSave) onSave(formData); };
  const handleSubmit = async () => {
    const isResubmit = existingReport?.status === 'revision_requested';
    await saveFormData('submitted', false);
    setToast(isResubmit ? 'Report resubmitted!' : 'Report submitted!');
    // Open print preview first, then notify parent after a delay
    setShowPrint(true);
    setTimeout(() => {
      if (isResubmit && onResubmit) onResubmit(formData); else if (onSubmit) onSubmit(formData);
    }, 200);
  };

  const expandAll = () => setExpandedSections(new Set(REPORT_FORM_SECTIONS.map((s) => s.id)));
  const collapseAll = () => setExpandedSections(new Set());

  const progress = calculateProgress();
  const completedSections = REPORT_FORM_SECTIONS.filter(s => getSectionProgress(s.id, formData).percent === 100).length;

  const existingReport = (convexReports as unknown as ReportData[]).find((r) => r.country === resolvedCountry && r.year === year && !(r as any).archived);
  const revisionFlagsArray: RevisionFlag[] = propRevisionFlags || existingReport?.revisionFlags || [];
  const revisionFlagsMap: Record<string, { note: string }> = {};
  // Build column→excel_code lookup for backward compat (old flags used column names)
  const columnToCode: Record<string, string> = {};
  for (const f of FIELD_MAP) columnToCode[f.column] = f.excel_code;
  for (const flag of revisionFlagsArray) {
    revisionFlagsMap[flag.fieldCode] = { note: flag.note };
    // If flag was saved with a long column name, also map to the short excel_code
    const shortCode = columnToCode[flag.fieldCode];
    if (shortCode && shortCode !== flag.fieldCode) {
      revisionFlagsMap[shortCode] = { note: flag.note };
    }
  }
  const isRevisionRequested = existingReport?.status === 'revision_requested';

  // Carry-forward: country reps see these fields as read-only; desk in-charge / super admin can edit
  const isCountryRep = authUser?.role === 'country_rep';
  const carryForwardReadOnlyCodes = isCountryRep ? CARRY_FORWARD_FIELD_CODES : undefined;

  return (
    <div className="p-6">
      {/* Top Header — compact strip */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-xl px-5 py-3 text-white shadow-sm mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h2 className="text-sm font-bold">Annual Report — {year}-{year + 1}</h2>
              <p className="text-blue-200 text-[11px]">{resolvedCountry || 'Select a country'} • Jul {year} – Jun {year + 1}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative w-9 h-9">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3.5" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#fff" strokeWidth="3.5" strokeDasharray={`${progress}, 100`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{progress}%</span>
              </div>
              <span className="text-xs font-semibold hidden sm:inline">{completedSections}/{REPORT_FORM_SECTIONS.length} <span className="text-blue-200 font-normal">sections</span></span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <button onClick={expandAll} className="text-blue-200 hover:text-white transition-colors font-medium">Expand</button>
              <span className="text-white/30">|</span>
              <button onClick={collapseAll} className="text-blue-200 hover:text-white transition-colors font-medium">Collapse</button>
              {lastSaved && (
                <>
                  <span className="text-white/30">|</span>
                  <span className="text-blue-300 hidden sm:inline">Saved: {lastSaved}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Read-Only Banner */}
      {readOnly && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 mb-6 shadow-sm">
          <span className="text-xl">👁</span>
          <div>
            <p className="text-sm font-bold text-blue-800">Read-Only View</p>
            <p className="text-xs text-blue-600">You are viewing this report in read-only mode. Fields cannot be edited.</p>
          </div>
        </div>
      )}

      {/* Revision Banner */}
      {isRevisionRequested && revisionFlagsArray.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3 mb-6 shadow-sm">
          <Star className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">Revision Requested — {revisionFlagsArray.length} field(s) flagged</p>
            <p className="text-xs text-amber-600 mt-1">Please review the flagged fields (highlighted in amber) and resubmit.</p>
          </div>
        </div>
      )}

      {/* Main Content with Sidebar */}
      <div className="flex gap-6">
        {/* Sections */}
        <div className={`flex-1 space-y-4 min-w-0 ${readOnly ? 'pointer-events-none [&_input]:bg-gray-50 [&_select]:bg-gray-50 [&_textarea]:bg-gray-50' : ''}`}>
          {REPORT_FORM_SECTIONS.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              data={formData}
              onChange={handleFieldChange}
              expanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              revisionFlags={revisionFlagsMap}
              carryForwardReadOnlyCodes={carryForwardReadOnlyCodes}
            />
          ))}

          {/* Important Instructions */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-blue-200 p-6 mt-4 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-xl text-blue-700 text-lg font-bold flex-shrink-0">!</span>
              <div>
                <h3 className="text-base font-bold text-gray-800">Important Instructions</h3>
                <p className="text-sm text-gray-500 mt-0.5" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: '2' }}>اہم ہدایات</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-gray-700 pl-1">
              <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">&#8226;</span><span>Fields marked with <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />NEW</span> are newly added this year. Please pay special attention to these.</span></li>
              <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">&#8226;</span><span>A signed hard copy of this report must be kept at the National Office.</span></li>
              <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">&#8226;</span><span>A signed copy of this form must also be sent to Additional Wakālat Tabshīr in addition to the online form.</span></li>
              <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">&#8226;</span><span>Any other additional information that you wish to submit with your report should also be sent to Wakālat Tabshīr on <strong>jalsauk@tabshir.org</strong></span></li>
            </ul>
            <div className="mt-4 pt-3 border-t border-blue-200 text-center">
              <p className="text-sm font-semibold text-blue-800">JazakAllah — جزاک اللہ</p>
            </div>
          </div>
        </div>

        {/* Progress Sidebar */}
        <SectionProgressSidebar
          data={formData}
          expandedSections={expandedSections}
          onJumpToSection={jumpToSection}
        />
      </div>

      {/* Sticky Bottom Actions */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 shadow-xl z-30">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={progress >= 80 ? '#10b981' : '#3b82f6'} strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">{progress}%</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700">Form Progress</p>
            <p className="text-xs text-gray-400">{completedSections} of {REPORT_FORM_SECTIONS.length} sections completed</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPrint(true)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white rounded-xl hover:bg-gray-50 transition-all border border-gray-200">
            <Printer className="w-4 h-4" />
            Print
          </button>
          {!readOnly && (
            <>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all border border-gray-200">
                <Save className="w-4 h-4" />
                {authUser?.role === 'country_rep' ? 'Save Draft' : 'Save Changes'}
              </button>
              {authUser?.role === 'country_rep' && (
                <button onClick={() => setShowSubmitConfirm(true)} className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md shadow-blue-200">
                  <Send className="w-4 h-4" />
                  {isRevisionRequested ? 'Resubmit' : 'Submit Report'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {showPrint && (
        <PrintableReport
          country={resolvedCountry}
          year={year}
          data={formData}
          onClose={() => setShowPrint(false)}
        />
      )}

      {/* Submit Confirmation Dialog */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Confirm Final Submission</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Once submitted, you will not be able to edit or make any changes to this report. Please ensure all sections are complete and accurate before proceeding.
            </p>
            <p className="text-sm font-medium text-gray-700 mb-6">
              Are you sure you want to make the final submission?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Go Back &amp; Review
              </button>
              <button
                onClick={() => { setShowSubmitConfirm(false); handleSubmit(); }}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Yes, Submit Final Report
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
