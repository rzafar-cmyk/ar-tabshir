/**
 * dataService.ts
 *
 * Central localStorage wrapper for all persistent data.
 * All reads/writes go through these functions so migrating
 * to a real database later only requires swapping this file.
 *
 * Keys:
 *   ar_users    — array of user objects (with password hashes)
 *   ar_reports  — array of report submissions
 */

import { ALL_COUNTRIES, getCountriesForRep } from '@/data/countries';
import type { CountryConfig } from '@/data/countries';

// ── Types ──────────────────────────────────────────────────

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'desk_incharge' | 'country_rep';
  status: 'active' | 'inactive';
  assignedCountries?: string[];
  assignedDesk?: string;
  phone?: string;
  lastLogin?: string;
}

export interface RevisionFlag {
  fieldCode: string;
  note: string;
  flaggedBy: string;
  flaggedAt: string;
}

export interface StoredReport {
  id: string;
  country: string;
  countryCode: string;
  flag: string;
  continent: string;
  year: number;
  status: 'draft' | 'submitted' | 'approved' | 'revision_requested' | 'rejected' | 'update_requested' | 'update_in_progress';
  progress: number;
  lastUpdated: string;
  submittedBy: string;
  submittedByUserId: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  data: Record<string, string | number>;
  revisionFlags?: RevisionFlag[];
  updateRequestReason?: string;
  updateRequestedAt?: string;
  updateDeniedReason?: string;
  /** Soft-delete flag */
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

// ── Storage Keys ───────────────────────────────────────────

const USERS_KEY = 'ar_users';
const REPORTS_KEY = 'ar_reports';
const DATA_VERSION_KEY = 'ar_data_version';
const CURRENT_DATA_VERSION = '4';

// ── Pre-computed SHA-256 password hashes (see src/lib/crypto.ts) ──
const HASH_ADMIN   = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // admin123
const HASH_DESK    = 'dc7955dd78ce7026e028c959feec2fcd532cfcb7fab2023a8403a9eae805709c'; // desk123
const HASH_COUNTRY = '0bc6ed1c51e65b16b2a6597f3a4c0dc827a6d8effd8dc3c68d491cb4b1211682'; // country123

// ── Seed Data ──────────────────────────────────────────────
// NOTE: Names, emails, and phones below are fictional placeholders.

const SEED_USERS: StoredUser[] = [
  // Super Admin
  { id: '1', name: 'Admin User', email: 'admin@tabshir.example', password: HASH_ADMIN, role: 'super_admin', status: 'active', lastLogin: '2025-06-15 09:30' },
  // Desk In-charges
  { id: '2', name: 'Africa Desk Incharge', email: 'africa.desk@tabshir.example', password: HASH_DESK, role: 'desk_incharge', status: 'active', assignedDesk: 'Africa Desk', assignedCountries: ['Ghana', 'Nigeria', 'Egypt', 'Cameroon', 'Kenya', 'South Africa', 'Morocco', 'Tanzania'], lastLogin: '2025-06-14 16:45' },
  { id: '3', name: 'Asia Desk Incharge', email: 'asia.desk@tabshir.example', password: HASH_DESK, role: 'desk_incharge', status: 'active', assignedDesk: 'Asia Desk', assignedCountries: ['Pakistan', 'Bangladesh', 'Indonesia', 'Turkey', 'India', 'Malaysia', 'Sri Lanka'], lastLogin: '2025-06-15 08:20' },
  { id: '4', name: 'Europe Americas Desk Incharge', email: 'europe.desk@tabshir.example', password: HASH_DESK, role: 'desk_incharge', status: 'active', assignedDesk: 'Europe & Americas Desk', assignedCountries: ['United Kingdom', 'Germany', 'USA', 'Canada', 'Brazil', 'France', 'Spain'], lastLogin: '2025-06-13 14:10' },
  { id: '5', name: 'Pacific Desk Incharge', email: 'pacific.desk@tabshir.example', password: HASH_DESK, role: 'desk_incharge', status: 'inactive', assignedDesk: 'Pacific Desk', assignedCountries: ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea'], lastLogin: '2025-06-01 11:30' },
  // Country Representatives (assignedCountries includes managed sub-countries)
  { id: '6', name: 'Ghana Representative', email: 'ghana.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('Ghana'), lastLogin: '2025-06-15 10:15' },
  { id: '7', name: 'Nigeria Representative', email: 'nigeria.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('Nigeria'), lastLogin: '2025-06-14 18:30' },
  { id: '8', name: 'Egypt Representative', email: 'egypt.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('Egypt'), lastLogin: '2025-06-15 07:45' },
  { id: '9', name: 'Cameroon Representative', email: 'cameroon.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('Cameroon'), lastLogin: '2025-06-12 09:00' },
  { id: '10', name: 'Kenya Representative', email: 'kenya.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'inactive', assignedCountries: getCountriesForRep('Kenya'), lastLogin: '2025-06-05 15:20' },
  { id: '11', name: 'Pakistan Representative', email: 'pakistan.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('Pakistan'), lastLogin: '2025-06-15 11:00' },
  { id: '12', name: 'Bangladesh Representative', email: 'bangladesh.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('Bangladesh'), lastLogin: '2025-06-14 13:45' },
  { id: '13', name: 'UK Representative', email: 'uk.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('United Kingdom'), lastLogin: '2025-06-15 08:30' },
  { id: '14', name: 'USA Representative', email: 'usa.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('USA'), lastLogin: '2025-06-14 20:00' },
  { id: '15', name: 'Australia Representative', email: 'australia.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('Australia'), lastLogin: '2025-06-15 06:15' },
  // Special office representatives
  { id: '16', name: 'Arabic Desk Representative', email: 'arabic.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('Arabic Desk'), lastLogin: '2025-06-14 12:00' },
  { id: '17', name: 'Russian Desk Representative', email: 'russian.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('Russian Desk'), lastLogin: '2025-06-14 10:00' },
  { id: '18', name: 'Special Desk Representative', email: 'special.rep@tabshir.example', password: HASH_COUNTRY, role: 'country_rep', status: 'active', assignedCountries: getCountriesForRep('Daud Hanif Sahib'), lastLogin: '2025-06-13 15:00' },
];

const SEED_REPORTS: StoredReport[] = [
  // Ghana reports — 2023, 2024, 2025
  {
    id: 'RPT-GH-2023', country: 'Ghana', countryCode: 'GH', flag: '\u{1F1EC}\u{1F1ED}', continent: 'Africa', year: 2023,
    status: 'approved', progress: 100, lastUpdated: '2023-07-15', submittedBy: 'Ghana Representative', submittedByUserId: '6',
    submittedAt: '2023-07-10', approvedBy: 'Admin User', approvedAt: '2023-07-15',
    data: { b1_total_baits: 12850, m4_mosques_total: 210, j3_jamaats_total: 1650, kk7_patients_treated: 10200, ll1_leaflets_distributed: 38000, kk10_charity_amount_usd: 105000 },
  },
  {
    id: 'RPT-GH-2024', country: 'Ghana', countryCode: 'GH', flag: '\u{1F1EC}\u{1F1ED}', continent: 'Africa', year: 2024,
    status: 'approved', progress: 100, lastUpdated: '2024-07-12', submittedBy: 'Ghana Representative', submittedByUserId: '6',
    submittedAt: '2024-07-08', approvedBy: 'Admin User', approvedAt: '2024-07-12',
    data: { b1_total_baits: 14100, m4_mosques_total: 228, j3_jamaats_total: 1780, kk7_patients_treated: 11400, ll1_leaflets_distributed: 42000, kk10_charity_amount_usd: 115000 },
  },
  {
    id: 'RPT-GH-2025', country: 'Ghana', countryCode: 'GH', flag: '\u{1F1EC}\u{1F1ED}', continent: 'Africa', year: 2025,
    status: 'submitted', progress: 100, lastUpdated: '2025-06-10', submittedBy: 'Ghana Representative', submittedByUserId: '6',
    submittedAt: '2025-06-10',
    data: { b1_total_baits: 15420, m4_mosques_total: 245, j3_jamaats_total: 1890, kk7_patients_treated: 12500, ll1_leaflets_distributed: 45000, kk10_charity_amount_usd: 125000 },
  },
  // Nigeria reports — 2023, 2024, 2025
  {
    id: 'RPT-NG-2023', country: 'Nigeria', countryCode: 'NG', flag: '\u{1F1F3}\u{1F1EC}', continent: 'Africa', year: 2023,
    status: 'approved', progress: 100, lastUpdated: '2023-07-20', submittedBy: 'Nigeria Representative', submittedByUserId: '7',
    submittedAt: '2023-07-15', approvedBy: 'Admin User', approvedAt: '2023-07-20',
    data: { b1_total_baits: 24200, m4_mosques_total: 465, j3_jamaats_total: 3050, kk7_patients_treated: 24000, ll1_leaflets_distributed: 76000, kk10_charity_amount_usd: 210000 },
  },
  {
    id: 'RPT-NG-2024', country: 'Nigeria', countryCode: 'NG', flag: '\u{1F1F3}\u{1F1EC}', continent: 'Africa', year: 2024,
    status: 'approved', progress: 100, lastUpdated: '2024-07-18', submittedBy: 'Nigeria Representative', submittedByUserId: '7',
    submittedAt: '2024-07-14', approvedBy: 'Admin User', approvedAt: '2024-07-18',
    data: { b1_total_baits: 26300, m4_mosques_total: 490, j3_jamaats_total: 3250, kk7_patients_treated: 26000, ll1_leaflets_distributed: 82000, kk10_charity_amount_usd: 228000 },
  },
  {
    id: 'RPT-NG-2025', country: 'Nigeria', countryCode: 'NG', flag: '\u{1F1F3}\u{1F1EC}', continent: 'Africa', year: 2025,
    status: 'approved', progress: 100, lastUpdated: '2025-06-08', submittedBy: 'Nigeria Representative', submittedByUserId: '7',
    submittedAt: '2025-06-05', approvedBy: 'Admin User', approvedAt: '2025-06-08',
    data: { b1_total_baits: 28450, m4_mosques_total: 512, j3_jamaats_total: 3450, kk7_patients_treated: 28000, ll1_leaflets_distributed: 89000, kk10_charity_amount_usd: 245000 },
  },
  // Pakistan reports — 2023, 2024, 2025
  {
    id: 'RPT-PK-2023', country: 'Pakistan', countryCode: 'PK', flag: '\u{1F1F5}\u{1F1F0}', continent: 'Asia', year: 2023,
    status: 'approved', progress: 100, lastUpdated: '2023-08-05', submittedBy: 'Pakistan Representative', submittedByUserId: '11',
    submittedAt: '2023-08-01', approvedBy: 'Admin User', approvedAt: '2023-08-05',
    data: { b1_total_baits: 40200, m4_mosques_total: 820, j3_jamaats_total: 5100, kk7_patients_treated: 39000, ll1_leaflets_distributed: 108000, kk10_charity_amount_usd: 340000 },
  },
  {
    id: 'RPT-PK-2024', country: 'Pakistan', countryCode: 'PK', flag: '\u{1F1F5}\u{1F1F0}', continent: 'Asia', year: 2024,
    status: 'approved', progress: 100, lastUpdated: '2024-07-28', submittedBy: 'Pakistan Representative', submittedByUserId: '11',
    submittedAt: '2024-07-22', approvedBy: 'Admin User', approvedAt: '2024-07-28',
    data: { b1_total_baits: 42900, m4_mosques_total: 855, j3_jamaats_total: 5380, kk7_patients_treated: 42000, ll1_leaflets_distributed: 118000, kk10_charity_amount_usd: 360000 },
  },
  {
    id: 'RPT-PK-2025', country: 'Pakistan', countryCode: 'PK', flag: '\u{1F1F5}\u{1F1F0}', continent: 'Asia', year: 2025,
    status: 'submitted', progress: 95, lastUpdated: '2025-06-09', submittedBy: 'Pakistan Representative', submittedByUserId: '11',
    submittedAt: '2025-06-09',
    data: { b1_total_baits: 45600, m4_mosques_total: 890, j3_jamaats_total: 5670, kk7_patients_treated: 45000, ll1_leaflets_distributed: 125000, kk10_charity_amount_usd: 380000 },
  },
  // Other 2025 reports
  {
    id: 'RPT-EG-2025', country: 'Egypt', countryCode: 'EG', flag: '\u{1F1EA}\u{1F1EC}', continent: 'Africa', year: 2025,
    status: 'draft', progress: 68, lastUpdated: '2025-06-08', submittedBy: 'Egypt Representative', submittedByUserId: '8',
    data: { b1_total_baits: 8750, m4_mosques_total: 189, j3_jamaats_total: 1250 },
  },
  {
    id: 'RPT-CM-2025', country: 'Cameroon', countryCode: 'CM', flag: '\u{1F1E8}\u{1F1F2}', continent: 'Africa', year: 2025,
    status: 'revision_requested', progress: 85, lastUpdated: '2025-06-07', submittedBy: 'Cameroon Representative', submittedByUserId: '9',
    submittedAt: '2025-06-01',
    data: { b1_total_baits: 12450, m4_mosques_total: 198, j3_jamaats_total: 1450, kk7_patients_treated: 18500 },
  },
  {
    id: 'RPT-KE-2025', country: 'Kenya', countryCode: 'KE', flag: '\u{1F1F0}\u{1F1EA}', continent: 'Africa', year: 2025,
    status: 'draft', progress: 42, lastUpdated: '2025-06-05', submittedBy: 'Kenya Representative', submittedByUserId: '10',
    data: { b1_total_baits: 4200, m4_mosques_total: 90 },
  },
  {
    id: 'RPT-BD-2025', country: 'Bangladesh', countryCode: 'BD', flag: '\u{1F1E7}\u{1F1E9}', continent: 'Asia', year: 2025,
    status: 'approved', progress: 100, lastUpdated: '2025-06-06', submittedBy: 'Bangladesh Representative', submittedByUserId: '12',
    submittedAt: '2025-06-04', approvedBy: 'Admin User', approvedAt: '2025-06-06',
    data: { b1_total_baits: 32450, m4_mosques_total: 678, j3_jamaats_total: 4120, kk7_patients_treated: 38000, ll1_leaflets_distributed: 95000, kk10_charity_amount_usd: 275000 },
  },
  {
    id: 'RPT-GB-2025', country: 'United Kingdom', countryCode: 'GB', flag: '\u{1F1EC}\u{1F1E7}', continent: 'Europe', year: 2025,
    status: 'submitted', progress: 100, lastUpdated: '2025-06-11', submittedBy: 'UK Representative', submittedByUserId: '13',
    submittedAt: '2025-06-11',
    data: { b1_total_baits: 4250, m4_mosques_total: 87, j3_jamaats_total: 520 },
  },
  {
    id: 'RPT-US-2025', country: 'United States', countryCode: 'US', flag: '\u{1F1FA}\u{1F1F8}', continent: 'North America', year: 2025,
    status: 'approved', progress: 100, lastUpdated: '2025-06-03', submittedBy: 'USA Representative', submittedByUserId: '14',
    submittedAt: '2025-06-01', approvedBy: 'Admin User', approvedAt: '2025-06-03',
    data: { b1_total_baits: 7850, m4_mosques_total: 156, j3_jamaats_total: 980 },
  },
  {
    id: 'RPT-AU-2025', country: 'Australia', countryCode: 'AU', flag: '\u{1F1E6}\u{1F1FA}', continent: 'Oceania', year: 2025,
    status: 'approved', progress: 100, lastUpdated: '2025-06-04', submittedBy: 'Australia Representative', submittedByUserId: '15',
    submittedAt: '2025-06-02', approvedBy: 'Admin User', approvedAt: '2025-06-04',
    data: { b1_total_baits: 3250, m4_mosques_total: 65, j3_jamaats_total: 410 },
  },
];

// ── Internal helpers ───────────────────────────────────────

function read<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Seed / initialise ──────────────────────────────────────

let seeded = false;

function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;

  const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
  const needsReseed = !storedVersion || storedVersion < CURRENT_DATA_VERSION;

  if (!localStorage.getItem(USERS_KEY) || needsReseed) {
    write(USERS_KEY, SEED_USERS);
  }
  if (!localStorage.getItem(REPORTS_KEY) || needsReseed) {
    write(REPORTS_KEY, SEED_REPORTS);
  }

  if (needsReseed) {
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
  }
}

// ── Users CRUD ─────────────────────────────────────────────

export function getUsers(): StoredUser[] {
  ensureSeeded();
  return read<StoredUser[]>(USERS_KEY) ?? [];
}

export function saveUsers(users: StoredUser[]): void {
  write(USERS_KEY, users);
}

export function getUserById(id: string): StoredUser | undefined {
  return getUsers().find(u => u.id === id);
}

export function getUserByEmail(email: string): StoredUser | undefined {
  return getUsers().find(u => u.email === email);
}

// ── Reports CRUD ───────────────────────────────────────────

export function getReports(): StoredReport[] {
  ensureSeeded();
  return read<StoredReport[]>(REPORTS_KEY) ?? [];
}

export function saveReports(reports: StoredReport[]): void {
  write(REPORTS_KEY, reports);
}

export function getReportById(id: string): StoredReport | undefined {
  return getReports().find(r => r.id === id);
}

export function getReportsByCountry(country: string): StoredReport[] {
  return getReports().filter(r => r.country === country);
}

export function getReportsByYear(year: number): StoredReport[] {
  return getReports().filter(r => r.year === year);
}

export function getReportsByUserId(userId: string): StoredReport[] {
  return getReports().filter(r => r.submittedByUserId === userId);
}

export function getReportByCountryAndYear(country: string, year: number): StoredReport | undefined {
  const all = getReports().filter(r => r.country === country && r.year === year);
  // Prefer non-archived report over archived one
  return all.find(r => !r.archived) ?? all[0];
}

// ── Soft-Delete Helpers ────────────────────────────────────

/** Get only active (non-archived) reports, deduplicated by country+year (keeps latest) */
export function getActiveReports(): StoredReport[] {
  const active = getReports().filter(r => !r.archived);
  // Deduplicate: one report per country+year, keep the one updated most recently
  const map = new Map<string, StoredReport>();
  for (const r of active) {
    const key = `${r.country}::${r.year}`;
    const existing = map.get(key);
    if (!existing || r.lastUpdated > existing.lastUpdated) {
      map.set(key, r);
    }
  }
  return Array.from(map.values());
}

/** Get only archived reports */
export function getArchivedReports(): StoredReport[] {
  return getReports().filter(r => r.archived);
}

/** Soft-delete a report */
export function archiveReport(id: string, userId: string): boolean {
  const all = getReports();
  const report = all.find(r => r.id === id);
  if (!report) return false;
  report.archived = true;
  report.archivedAt = new Date().toISOString();
  report.archivedBy = userId;
  saveReports(all);
  return true;
}

/** Restore a soft-deleted report */
export function restoreReport(id: string): boolean {
  const all = getReports();
  const report = all.find(r => r.id === id);
  if (!report) return false;
  delete report.archived;
  delete report.archivedAt;
  delete report.archivedBy;
  saveReports(all);
  return true;
}

/** Permanently delete a report */
export function permanentlyDeleteReport(id: string): boolean {
  const all = getReports();
  const idx = all.findIndex(r => r.id === id);
  if (idx === -1) return false;
  all.splice(idx, 1);
  saveReports(all);
  return true;
}

// ── Factory Reset ──────────────────────────────────────────

/**
 * Deletes ALL reports, ALL users except the given admin, and resets audit log.
 * Preserves: deadline settings, form schema, country data, data version.
 */
export function factoryReset(keepUserId: string): void {
  // Keep only the current super admin user
  const allUsers = getUsers();
  const adminUser = allUsers.find(u => u.id === keepUserId);
  write(USERS_KEY, adminUser ? [adminUser] : []);

  // Wipe all reports (including archived)
  write(REPORTS_KEY, []);

  // Clear audit log
  localStorage.removeItem('ar_audit_log');

  // Keep ar_data_version at current so ensureSeeded doesn't reseed
  localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);

  // Reset the seeded flag so future getUsers/getReports don't try to reseed
  // (They won't because the keys exist as non-null arrays and version matches)
  seeded = true;
}

// ── Utility ────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Country list (re-exported for use in dropdowns) ────────

export function getCountryList(): CountryConfig[] {
  return ALL_COUNTRIES;
}
