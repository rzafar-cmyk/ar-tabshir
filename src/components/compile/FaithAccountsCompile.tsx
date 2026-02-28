import { useState, useMemo } from 'react';
import { BookOpen, Filter, Download, Globe, Tag } from 'lucide-react';
import { REPORT_FORM_SECTIONS } from '@/data/reportFormSchema';
import { getReports } from '@/services/dataService';
import { exportAccountsToWord } from '@/lib/exportAccounts';

interface AccountEntry {
  country: string;
  fieldCode: string;
  topicEn: string;
  topicUr: string;
  text: string;
  dir: string;
}

const FA_SECTION = REPORT_FORM_SECTIONS.find(s => s.id === 'faith-accounts');
const FA_TOPICS = FA_SECTION?.fields.map(f => ({
  code: f.code,
  labelEn: f.label,
  labelUr: f.labelUrdu || '',
})) ?? [];

export function FaithAccountsCompile() {
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  const allAccounts = useMemo<AccountEntry[]>(() => {
    const reports = getReports() as { country: string; data: Record<string, string | number> }[];
    const entries: AccountEntry[] = [];

    for (const report of reports) {
      if (!report.data) continue;
      for (const topic of FA_TOPICS) {
        const val = report.data[topic.code];
        if (val && String(val).trim() !== '') {
          const dirKey = `${topic.code}_dir`;
          entries.push({
            country: report.country,
            fieldCode: topic.code,
            topicEn: topic.labelEn,
            topicUr: topic.labelUr,
            text: String(val),
            dir: report.data[dirKey] === 'ltr' ? 'ltr' : 'rtl',
          });
        }
      }
    }

    return entries;
  }, []);

  const countries = useMemo(() => {
    const set = new Set(allAccounts.map(a => a.country));
    return Array.from(set).sort();
  }, [allAccounts]);

  const filteredAccounts = useMemo(() => {
    return allAccounts.filter(a => {
      if (topicFilter !== 'all' && a.fieldCode !== topicFilter) return false;
      if (countryFilter !== 'all' && a.country !== countryFilter) return false;
      return true;
    });
  }, [allAccounts, topicFilter, countryFilter]);

  const handleExportWord = () => {
    exportAccountsToWord(filteredAccounts, topicFilter === 'all' ? 'topic' : 'country');
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            Filters
          </h3>
          <button
            onClick={handleExportWord}
            disabled={filteredAccounts.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export to Word
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          {/* Topic filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Topic
            </label>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
            >
              <option value="all">All Topics ({allAccounts.length})</option>
              {FA_TOPICS.map(t => {
                const count = allAccounts.filter(a => a.fieldCode === t.code).length;
                if (count === 0) return null;
                return <option key={t.code} value={t.code}>{t.labelEn} ({count})</option>;
              })}
            </select>
          </div>
          {/* Country filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Country
            </label>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
            >
              <option value="all">All Countries ({countries.length})</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {filteredAccounts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No faith-inspiring accounts found</p>
          <p className="text-xs text-gray-300 mt-1">Accounts will appear here once countries submit their reports with faith-inspiring accounts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''} found</p>
          {filteredAccounts.map((account, idx) => (
            <div key={`${account.country}-${account.fieldCode}-${idx}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-lg">{account.country}</span>
                  <span className="text-xs font-medium text-gray-600">{account.topicEn}</span>
                </div>
                {account.dir === 'rtl' && (
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">RTL</span>
                )}
              </div>
              <div
                className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"
                dir={account.dir}
                style={account.dir === 'rtl' ? {
                  fontFamily: "'Noto Nastaliq Urdu', serif",
                  lineHeight: '2.2',
                  textAlign: 'right',
                } : undefined}
              >
                {account.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
