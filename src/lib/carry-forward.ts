/**
 * carry-forward.ts
 *
 * Defines the mapping of "opening" fields that should be pre-filled
 * from the previous year's "total/closing" fields.
 *
 * 15 mappings across 9 form sections.
 */

export interface CarryForwardMapping {
  /** The opening field code in the NEW year's form */
  targetCode: string;
  /** The source field code(s) from the PREVIOUS year. If array, values are summed. */
  sourceCode: string | string[];
  /** Human-readable label for the target field */
  label: string;
  /** Section context */
  section: string;
}

export const CARRY_FORWARD_MAPPINGS: CarryForwardMapping[] = [
  // Section 1: Jama'ats
  { targetCode: 'j1', sourceCode: 'j3', label: "Number of Jama'ats", section: "1. Jama'ats" },

  // Section 2: Mosques
  { targetCode: 'm1', sourceCode: 'm4', label: 'Number of Mosques', section: '2. Mosques' },

  // Section 3: Mission Houses
  { targetCode: 'mi1', sourceCode: 'mi3', label: 'Number of Mission Houses', section: '3. Mission Houses' },

  // Section 5.a: Central Missionaries
  { targetCode: 'cm1', sourceCode: 'cm3', label: 'Central Missionaries', section: '5.a Central Missionaries' },

  // Section 5.b: Local Missionaries
  { targetCode: 'lm1', sourceCode: 'lm3', label: 'Local Missionaries', section: '5.b Local Missionaries' },

  // Section 5.c: Local Muallimeen
  { targetCode: 'lmu1', sourceCode: 'lmu3', label: 'Local Muallimeen', section: '5.c Local Muallimeen' },

  // Section 6: Bai'ats (last year's count)
  { targetCode: 'b0', sourceCode: 'b1', label: "Bai'ats in the Last Year", section: "6. Bai'ats" },

  // Section 7.a: Lost Nau Muba'ieen Contact
  { targetCode: 'nm1', sourceCode: 'nm3', label: "Contact with lost Nau Muba'ieen", section: "7.a Lost Nau Muba'ieen" },

  // Section 30.a: Schools (NJ)
  { targetCode: 'njs1', sourceCode: ['njs_total_nj', 'njs1', 'njs4'], label: 'Schools under NJ', section: '30.a Schools (NJ)' },

  // Section 30.b: Schools (HF)
  { targetCode: 'njs2', sourceCode: ['njs_total_hf', 'njs2', 'njs5'], label: 'Schools under HF', section: '30.b Schools (HF)' },

  // Section 30.b: Vocational Centres (HF)
  { targetCode: 'njs3', sourceCode: ['njs_total_voc', 'njs3', 'njs6'], label: 'Vocational Centres under HF', section: '30.b Vocational (HF)' },

  // Section 31.a: Hospitals (NJ)
  { targetCode: 'njh1', sourceCode: 'njh3', label: 'Hospitals (NJ)', section: '31.a Hospitals (NJ)' },

  // Section 31.a: Clinics (NJ)
  { targetCode: 'njh4', sourceCode: 'njh6', label: 'Clinics (NJ)', section: '31.a Clinics (NJ)' },

  // Section 31.b: Hospitals (HF)
  { targetCode: 'hfh1', sourceCode: 'hfh3', label: 'Hospitals (HF)', section: '31.b Hospitals (HF)' },

  // Section 31.b: Clinics (HF)
  { targetCode: 'hfh4', sourceCode: 'hfh6', label: 'Clinics (HF)', section: '31.b Clinics (HF)' },
];

/** Set of all carry-forward target field codes for quick lookup */
export const CARRY_FORWARD_FIELD_CODES = new Set(
  CARRY_FORWARD_MAPPINGS.map(m => m.targetCode)
);

/**
 * Resolve the carry-forward value from a previous year's report data.
 *
 * For sourceCode as string: returns value of that field.
 * For sourceCode as array:  [preferredTotal, ...fallbackSumParts].
 *   If preferredTotal exists and is non-zero, use it.
 *   Otherwise, sum fallbackSumParts.
 */
function resolveSourceValue(
  mapping: CarryForwardMapping,
  prevData: Record<string, string | number>
): number | undefined {
  if (typeof mapping.sourceCode === 'string') {
    const v = prevData[mapping.sourceCode];
    if (v === undefined || v === '') return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }

  // Array: first element is preferred total, rest are fallback sum parts
  const [preferred, ...parts] = mapping.sourceCode;
  const prefVal = prevData[preferred];
  if (prefVal !== undefined && prefVal !== '') {
    const n = Number(prefVal);
    if (!isNaN(n)) return n;
  }

  // Fallback: sum the parts
  let sum = 0;
  let hasAny = false;
  for (const p of parts) {
    const v = prevData[p];
    if (v !== undefined && v !== '') {
      const n = Number(v);
      if (!isNaN(n)) {
        sum += n;
        hasAny = true;
      }
    }
  }
  return hasAny ? sum : undefined;
}

/**
 * Build carry-forward data for a new report given the previous year's data.
 * Returns a record of { fieldCode: value } for all fields that can be carried forward.
 */
export function buildCarryForwardData(
  prevData: Record<string, string | number>
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const mapping of CARRY_FORWARD_MAPPINGS) {
    const value = resolveSourceValue(mapping, prevData);
    if (value !== undefined) {
      result[mapping.targetCode] = value;
    }
  }

  return result;
}
