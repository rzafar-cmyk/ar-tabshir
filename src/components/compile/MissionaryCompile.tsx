import { useState, useMemo } from 'react';
import { Users, Search, Download, MapPin, GraduationCap, Phone, Mail, ChevronUp, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getReports } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';

interface MissionaryRecord {
  country: string;
  name: string;
  jamia: string;
  gradYear: string;
  posting: string;
  postingSince: string;
  phone: string;
  email: string;
}

type SortKey = 'country' | 'name' | 'jamia' | 'gradYear' | 'posting';
type SortDir = 'asc' | 'desc';

function extractMissionaries(allowedCountries?: string[]): MissionaryRecord[] {
  try {
    const reports = getReports() as any[];
    const missionaries: MissionaryRecord[] = [];

    for (const report of reports) {
      if (!report.data) continue;
      if (allowedCountries && !allowedCountries.includes(report.country)) continue;

      let i = 1;
      while (report.data[`cmd_name_${i}`]) {
        missionaries.push({
          country: report.country,
          name: String(report.data[`cmd_name_${i}`] || ''),
          jamia: String(report.data[`cmd_jamia_${i}`] || ''),
          gradYear: String(report.data[`cmd_grad_year_${i}`] || ''),
          posting: String(report.data[`cmd_posting_${i}`] || ''),
          postingSince: String(report.data[`cmd_posting_since_${i}`] || ''),
          phone: String(report.data[`cmd_phone_${i}`] || ''),
          email: String(report.data[`cmd_email_${i}`] || ''),
        });
        i++;
      }
    }

    return missionaries;
  } catch {
    return [];
  }
}

export function MissionaryCompile() {
  const { user } = useAuth();
  const allowedCountries = user?.role === 'desk_incharge' ? user.assignedCountries : undefined;

  const allMissionaries = useMemo(() => extractMissionaries(allowedCountries), [allowedCountries]);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('country');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterJamia, setFilterJamia] = useState('');

  // Unique values for filters
  const countries = useMemo(() => [...new Set(allMissionaries.map(m => m.country))].sort(), [allMissionaries]);
  const jamias = useMemo(() => [...new Set(allMissionaries.map(m => m.jamia).filter(Boolean))].sort(), [allMissionaries]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = allMissionaries;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.country.toLowerCase().includes(q) ||
        m.posting.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.includes(q)
      );
    }

    if (filterCountry) {
      result = result.filter(m => m.country === filterCountry);
    }

    if (filterJamia) {
      result = result.filter(m => m.jamia === filterJamia);
    }

    result.sort((a, b) => {
      const aVal = a[sortKey] || '';
      const bVal = b[sortKey] || '';
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allMissionaries, search, filterCountry, filterJamia, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-600" />
      : <ChevronDown className="w-3 h-3 text-blue-600" />;
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const sheetData = filtered.map(m => ({
      'Country': m.country,
      'Name': m.name,
      'Jamia': m.jamia,
      'Graduation Year': m.gradYear,
      'Current Posting': m.posting,
      'Posted Since': m.postingSince,
      'Phone': m.phone,
      'Email': m.email,
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
      { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Missionaries');
    XLSX.writeFile(wb, `Missionaries_${new Date().toISOString().split('T')[0]}.xlsx`, { bookType: 'xlsx' });
  };

  // Stats
  const totalMissionaries = allMissionaries.length;
  const totalCountries = countries.length;
  const totalJamias = jamias.length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalMissionaries}</p>
              <p className="text-xs text-gray-500">Total Missionaries</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalCountries}</p>
              <p className="text-xs text-gray-500">Countries with Missionaries</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalJamias}</p>
              <p className="text-xs text-gray-500">Jamias Represented</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, country, posting, email, phone..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all"
            />
          </div>

          {/* Country filter */}
          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-600 focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="">All Countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Jamia filter */}
          <select
            value={filterJamia}
            onChange={(e) => setFilterJamia(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-600 focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="">All Jamias</option>
            {jamias.map(j => <option key={j} value={j}>{j}</option>)}
          </select>

          {/* Export */}
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-400">
          Showing {filtered.length} of {totalMissionaries} missionaries
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600" onClick={() => handleSort('name')}>
                    <span className="flex items-center gap-1">Name <SortIcon column="name" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600" onClick={() => handleSort('country')}>
                    <span className="flex items-center gap-1">Country <SortIcon column="country" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600" onClick={() => handleSort('jamia')}>
                    <span className="flex items-center gap-1">Jamia <SortIcon column="jamia" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600" onClick={() => handleSort('gradYear')}>
                    <span className="flex items-center gap-1">Grad Year <SortIcon column="gradYear" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600" onClick={() => handleSort('posting')}>
                    <span className="flex items-center gap-1">Posting <SortIcon column="posting" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Since</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((m, idx) => (
                  <tr key={`${m.country}-${m.name}-${idx}`} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{m.name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                        <MapPin className="w-3 h-3" />
                        {m.country}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.jamia || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.gradYear || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{m.posting || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.postingSince || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.phone && (
                          <a href={`tel:${m.phone}`} className="text-gray-400 hover:text-blue-600 transition-colors" title={m.phone}>
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {m.email && (
                          <a href={`mailto:${m.email}`} className="text-gray-400 hover:text-blue-600 transition-colors" title={m.email}>
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {!m.phone && !m.email && <span className="text-xs text-gray-300">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-sm font-bold text-gray-600">No Missionaries Found</h3>
          <p className="text-xs text-gray-400 mt-1">
            {allMissionaries.length === 0
              ? 'No country reports contain missionary data yet. Missionaries are added in Section 34 of the annual report form.'
              : 'No missionaries match your current search/filter criteria.'}
          </p>
        </div>
      )}
    </div>
  );
}
