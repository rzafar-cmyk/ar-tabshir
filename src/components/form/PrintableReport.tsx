import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { REPORT_FORM_SECTIONS, PROPERTY_DETAIL_FIELDS, PUBLICATION_DETAIL_FIELDS, CENTRAL_REP_DETAIL_FIELDS, MISSIONARY_DETAIL_FIELDS } from '@/data/reportFormSchema';
import type { FormField, FormSubsection } from '@/data/reportFormSchema';
import { resolveFieldValue } from '@/lib/field-map';

interface PrintableReportProps {
  country: string;
  year: number;
  data: Record<string, string | number>;
  onClose: () => void;
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

function getFieldDisplayValue(field: FormField, data: Record<string, string | number>): string {
  const raw = resolveFieldValue(data, field.code);
  if (field.formula) {
    const userVal = raw !== undefined && raw !== '' ? raw : evaluateFormula(field.formula, data);
    return String(userVal || '—');
  }
  if (raw === undefined || raw === '') return '—';
  return String(raw);
}

function FieldRow({ field, data }: { field: FormField; data: Record<string, string | number> }) {
  const val = getFieldDisplayValue(field, data);
  if (val === '—') return null;
  return (
    <tr>
      <td className="print-label">
        {field.label}
        {field.labelUrdu && <span className="print-label-urdu">{field.labelUrdu}</span>}
      </td>
      <td className="print-value">{val}</td>
    </tr>
  );
}

function SubsectionPrint({ sub, data }: { sub: FormSubsection; data: Record<string, string | number> }) {
  const hasData = sub.fields.some(f => {
    const v = resolveFieldValue(data, f.code);
    return v !== undefined && v !== '' && v !== 0;
  });
  if (!hasData) return null;
  return (
    <div className="print-subsection">
      <h4 className="print-subsection-title">
        {sub.title}
        {sub.titleUrdu && <span className="print-subsection-urdu"> — {sub.titleUrdu}</span>}
      </h4>
      <table className="print-table">
        <tbody>
          {sub.fields.map(f => <FieldRow key={f.code} field={f} data={data} />)}
        </tbody>
      </table>
    </div>
  );
}

// ── Dynamic detail printers ──

function PropertyDetailsPrint({ data }: { data: Record<string, string | number> }) {
  const count = Number(data['p1'] || 0);
  if (count < 1) return null;

  const items = [];
  for (let i = 1; i <= count; i++) {
    const hasData = PROPERTY_DETAIL_FIELDS.some(f => {
      const v = data[`${f.code}_${i}`];
      return v !== undefined && v !== '';
    });
    if (!hasData) continue;

    items.push(
      <div key={i} className="print-dynamic-block">
        <div className="print-dynamic-header">Property {i}</div>
        {PROPERTY_DETAIL_FIELDS.map(f => {
          const val = data[`${f.code}_${i}`];
          if (!val && val !== 0) return null;
          return (
            <div key={f.code} className="print-dynamic-row">
              <span className="print-dynamic-label">{f.label}</span>
              <span className="print-dynamic-value">{String(val)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return items.length > 0 ? <>{items}</> : null;
}

function PublicationDetailsPrint({ data }: { data: Record<string, string | number> }) {
  // Find the trigger field for publications — look for pub count fields
  let count = 0;
  // Check common publication count fields
  for (const key of Object.keys(data)) {
    if (key.startsWith('pub_name_') || key.startsWith('pub1_name_')) {
      const idx = parseInt(key.split('_').pop() || '0');
      if (idx > count) count = idx;
    }
  }
  // Also check from schema trigger
  REPORT_FORM_SECTIONS.forEach(s => {
    s.fields.forEach(f => {
      if (f.dynamicTrigger === 'publicationDetails') {
        const triggerVal = Number(data[f.code] || 0);
        if (triggerVal > count) count = triggerVal;
      }
    });
  });

  if (count < 1) return null;

  const items = [];
  for (let i = 1; i <= count; i++) {
    const hasData = PUBLICATION_DETAIL_FIELDS.some(f => {
      const v = data[`${f.code}_${i}`];
      return v !== undefined && v !== '';
    });
    if (!hasData) continue;

    items.push(
      <div key={i} className="print-dynamic-block">
        <div className="print-dynamic-header">Publication {i}</div>
        {PUBLICATION_DETAIL_FIELDS.map(f => {
          const val = data[`${f.code}_${i}`];
          if (!val && val !== 0) return null;
          return (
            <div key={f.code} className="print-dynamic-row">
              <span className="print-dynamic-label">{f.label}</span>
              <span className="print-dynamic-value">{String(val)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return items.length > 0 ? <>{items}</> : null;
}

function MissionaryDetailsPrint({ data }: { data: Record<string, string | number> }) {
  const missionaries = [];
  let i = 1;
  while (data[`cmd_name_${i}`]) {
    missionaries.push(i);
    i++;
  }

  if (missionaries.length === 0) return null;

  return (
    <>
      {missionaries.map(idx => (
        <div key={idx} className="print-dynamic-block">
          <div className="print-dynamic-header">Missionary {idx}: {String(data[`cmd_name_${idx}`] || '')}</div>
          {MISSIONARY_DETAIL_FIELDS.map(f => {
            const val = data[`${f.code}_${idx}`];
            if (!val && val !== 0) return null;
            return (
              <div key={f.code} className="print-dynamic-row">
                <span className="print-dynamic-label">{f.label}</span>
                <span className="print-dynamic-value">{String(val)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

function CentralRepDetailsPrint({ data }: { data: Record<string, string | number> }) {
  const count = Number(data['crv1'] || 0);
  if (count < 1) return null;

  const items = [];
  for (let i = 1; i <= count; i++) {
    const hasData = CENTRAL_REP_DETAIL_FIELDS.some(f => {
      const v = data[`${f.code}_${i}`];
      return v !== undefined && v !== '';
    });
    if (!hasData) continue;

    items.push(
      <div key={i} className="print-dynamic-block">
        <div className="print-dynamic-header">Visit {i}: {String(data[`crv_name_${i}`] || '')}</div>
        {CENTRAL_REP_DETAIL_FIELDS.map(f => {
          const val = data[`${f.code}_${i}`];
          if (!val && val !== 0) return null;
          return (
            <div key={f.code} className="print-dynamic-row">
              <span className="print-dynamic-label">{f.label}</span>
              <span className="print-dynamic-value">{String(val)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return items.length > 0 ? <>{items}</> : null;
}

/** Check if a section is entirely new (all fields are isNew) — hidden for historical reports */
function isSectionAllNew(section: typeof REPORT_FORM_SECTIONS[0]): boolean {
  const allFields = [
    ...section.fields,
    ...(section.subsections?.flatMap(s => s.fields) ?? []),
  ];
  if (allFields.length === 0) return false;
  return allFields.every(f => f.isNew);
}

// ── Section printer ──

function SectionPrint({ section, data, year }: {
  section: typeof REPORT_FORM_SECTIONS[0];
  data: Record<string, string | number>;
  year: number;
}) {
  // For historical reports (pre-2026), hide sections that are entirely new
  if (year < 2026 && isSectionAllNew(section)) return null;
  const allFields = [
    ...section.fields,
    ...(section.subsections?.flatMap(s => s.fields) ?? []),
  ];
  const hasStaticData = allFields.some(f => {
    const v = resolveFieldValue(data, f.code);
    return v !== undefined && v !== '' && v !== 0;
  });

  // Check for dynamic data
  const hasDynamicProperty = section.id === 'property' && Number(data['p1'] || 0) > 0;
  const hasDynamicMissionary = section.id === 'missionaries' && !!data['cmd_name_1'];
  const hasDynamicPublication = section.fields.some(f => f.dynamicTrigger === 'publicationDetails' && Number(data[f.code] || 0) > 0);
  const hasDynamicCentralRep = section.fields.some(f => f.dynamicTrigger === 'centralRepDetails' && Number(data[f.code] || 0) > 0);

  const additionalNotes = data[`${section.id}_additional_notes`];

  if (!hasStaticData && !hasDynamicProperty && !hasDynamicMissionary && !hasDynamicPublication && !hasDynamicCentralRep && !additionalNotes) return null;

  return (
    <div className="print-section">
      <div className="print-section-header">
        <span className="print-section-number">{section.number}</span>
        <div>
          <h3 className="print-section-title">{section.title}</h3>
          {section.titleUrdu && <p className="print-section-urdu">{section.titleUrdu}</p>}
        </div>
      </div>

      {/* Faith-Inspiring Accounts — special block rendering */}
      {section.id === 'faith-accounts' ? (
        <div>
          {section.fields.map(f => {
            const val = resolveFieldValue(data, f.code);
            if (!val || String(val).trim() === '') return null;
            const dirKey = `${f.code}_dir`;
            const dir = data[dirKey] === 'ltr' ? 'ltr' : (f.rtlDefault ? 'rtl' : 'ltr');
            const isRtl = dir === 'rtl';
            return (
              <div key={f.code} style={{ borderTop: '1px solid #e5e7eb', padding: '10px 16px' }}>
                <p style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e3a5f', marginBottom: '2px' }}>
                  {f.label}
                  {f.labelUrdu && <span style={{ display: 'block', fontSize: '10.5px', color: '#374151', fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: '2', marginTop: '2px' }}>{f.labelUrdu}</span>}
                </p>
                <p style={{
                  fontSize: '12px',
                  color: '#111827',
                  lineHeight: isRtl ? '2.2' : '1.7',
                  whiteSpace: 'pre-wrap',
                  direction: dir,
                  textAlign: isRtl ? 'right' : 'left',
                  fontFamily: isRtl ? "'Noto Nastaliq Urdu', serif" : 'inherit',
                }}>
                  {String(val)}
                </p>
              </div>
            );
          })}
        </div>
      ) : section.fields.length > 0 && !section.subsections?.length ? (
        <table className="print-table">
          <tbody>
            {section.fields.map(f => <FieldRow key={f.code} field={f} data={data} />)}
          </tbody>
        </table>
      ) : null}

      {/* Dynamic: Property details */}
      {hasDynamicProperty && <PropertyDetailsPrint data={data} />}

      {/* Dynamic: Publication details */}
      {hasDynamicPublication && <PublicationDetailsPrint data={data} />}

      {/* Dynamic: Central Rep Visit details */}
      {hasDynamicCentralRep && <CentralRepDetailsPrint data={data} />}

      {section.subsections?.map(sub => (
        <div key={sub.id}>
          <SubsectionPrint sub={sub} data={data} />
          {section.id === 'missionaries' && sub.id === 'central-missionaries' && hasDynamicMissionary && (
            <div style={{ padding: '12px 16px', margin: '8px 0', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '12px', color: '#0369a1', fontStyle: 'italic' }}>
              Detailed Missionary Information — See end of report
              <span style={{ display: 'block', fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: '2', direction: 'rtl', textAlign: 'right', fontSize: '11px', marginTop: '2px' }}>تفصیلی معلوماتِ مبلغین — رپورٹ کے آخر میں دیکھیں</span>
            </div>
          )}
        </div>
      ))}

      {/* Section-level fields after subsections (e.g. missionaries refresher courses) */}
      {section.subsections?.length && section.fields.length > 0 ? (
        <table className="print-table">
          <tbody>
            {section.fields.map(f => <FieldRow key={f.code} field={f} data={data} />)}
          </tbody>
        </table>
      ) : null}

      {additionalNotes && (
        <div className="print-additional-notes">
          <p className="print-notes-label">Additional Information:</p>
          <p className="print-notes-text">{String(additionalNotes)}</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ──

export function PrintableReport({ country, year, data, onClose }: PrintableReportProps) {
  const handlePrint = () => {
    window.print();
  };

  const allFields = REPORT_FORM_SECTIONS.flatMap(s => [
    ...s.fields,
    ...(s.subsections?.flatMap(sub => sub.fields) ?? []),
  ]);
  const filledCount = allFields.filter(f => {
    const v = resolveFieldValue(data, f.code);
    return v !== undefined && v !== '' && v !== 0;
  }).length;
  // For historical reports, exclude sections that are entirely new
  const applicableSections = year < 2026
    ? REPORT_FORM_SECTIONS.filter(s => !isSectionAllNew(s))
    : REPORT_FORM_SECTIONS;

  const completedSections = applicableSections.filter(s => {
    const fields = [...s.fields, ...(s.subsections?.flatMap(sub => sub.fields) ?? [])];
    return fields.length > 0 && fields.every(f => {
      const v = resolveFieldValue(data, f.code);
      return v !== undefined && v !== '' && v !== 0;
    });
  }).length;

  const now = new Date();
  const printDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const printTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto" id="printable-report-overlay">
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-800">Print Preview — {country}</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filledCount} fields filled</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="print-container">
        <div className="print-header">
          <div className="print-header-logo">AR</div>
          <div className="print-header-text">
            <h1 className="print-main-title">Annual Report — {year}-{year + 1}</h1>
            <p className="print-subtitle">{country}</p>
            <p className="print-subtitle-urdu">سالانہ رپورٹ — {year}-{year + 1}ء</p>
          </div>
          <div className="print-header-meta">
            <p>Reporting Period: July {year} – June {year + 1}</p>
            <p>Printed: {printDate} at {printTime}</p>
            <p>{completedSections}/{applicableSections.length} sections completed</p>
          </div>
        </div>

        <hr className="print-divider" />

        {REPORT_FORM_SECTIONS.map(section => (
          <SectionPrint key={section.id} section={section} data={data} year={year} />
        ))}

        {/* Detailed Missionary Information — printed at end of report */}
        {data['cmd_name_1'] && (
          <div className="print-section">
            <div className="print-section-header">
              <span className="print-section-number">&#9733;</span>
              <div>
                <h3 className="print-section-title">Details of Central Missionaries</h3>
                <p className="print-section-urdu">مرکزی مبلغین کی تفصیلی فہرست</p>
              </div>
            </div>
            <MissionaryDetailsPrint data={data} />
          </div>
        )}

        {/* Important Instructions & Signature Block */}
        <div className="print-signature-block">
          <div className="print-section" style={{ marginTop: '40px' }}>
            <div className="print-section-header">
              <span className="print-section-number">!</span>
              <div>
                <h3 className="print-section-title">Important Instructions</h3>
                <p className="print-section-urdu">اہم ہدایات</p>
              </div>
            </div>
            <div style={{ padding: '16px', fontSize: '12px', lineHeight: '2', color: '#374151' }}>
              <ol style={{ margin: '0', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '6px' }}>
                  A signed hard copy of the final report must be kept at the National Office.
                  <br /><span dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", display: 'block', textAlign: 'right' }}>فائنل رپورٹ کی ایک دستخط شدہ نقل پرنٹ کرکے (Hard Copy) نیشنل آفس میں محفوظ رکھی جائے۔</span>
                </li>
                <li style={{ marginBottom: '6px' }}>
                  A signed copy of the final report form must also be sent to Additional Wakālat Tabshīr in addition to the online form.
                  <br /><span dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", display: 'block', textAlign: 'right' }}>رپورٹ فارم کی ایک دستخط شدہ نقل آن لائن فارم کے علاوہ ایڈیشنل وکالت تبشیر کو بھی بذریعہ ای میل بھجوائی جائے۔</span>
                </li>
              </ol>
              <p style={{ textAlign: 'center', marginTop: '12px', fontWeight: 700, color: '#1e3a5f' }}>JazakAllah — جزاک اللہ</p>
            </div>
          </div>
          {/* Signature Block */}
          <div style={{ marginTop: '48px', padding: '0 16px', fontSize: '13px', color: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginTop: '32px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: '4px', fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Name of the National Amīr / President</p>
                <div style={{ borderBottom: '1.5px solid #d1d5db', height: '36px', marginBottom: '24px' }}></div>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: '4px', fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Date</p>
                <div style={{ borderBottom: '1.5px solid #d1d5db', height: '36px', marginBottom: '24px' }}></div>
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <p style={{ marginBottom: '4px', fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Signature & Stamp</p>
              <div style={{ border: '1.5px dashed #d1d5db', height: '80px', borderRadius: '8px' }}></div>
            </div>
          </div>
        </div>

        <div className="print-footer">
          <hr className="print-divider" />
          <div className="print-footer-content">
            <p>Annual Reports System — Tabshir Office</p>
            <p>{country} • {year}-{year + 1} • Generated {printDate}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
