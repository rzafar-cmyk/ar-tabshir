import { useState } from 'react';
import { X, Printer, MessageSquare, History, FileText, CheckCircle, XCircle, Edit2, ShieldCheck, RotateCcw, AlertTriangle, ChevronsUpDown } from 'lucide-react';
import { getFieldsBySection, resolveFieldValue } from '@/lib/field-map';
import { REPORT_FORM_SECTIONS } from '@/data/reportFormSchema';
import { PrintableReport } from '@/components/form/PrintableReport';
import { isReportLocked } from '@/lib/deadline';

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

interface ReportDetail {
  id: string;
  country: string;
  flag: string;
  year: number;
  status: string;
  progress: number;
  submittedBy: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  data: Record<string, string | number>;
  comments: Comment[];
  history: HistoryEntry[];
}

interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

interface ReportDetailModalProps {
  report: ReportDetail;
  onClose: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onRequestRevision: () => void;
  userRole: 'admin' | 'contributor' | 'viewer';
  onAllowUpdate?: () => void;
  onDenyUpdate?: () => void;
}

export function ReportDetailModal({
  report,
  onClose,
  onEdit,
  onApprove,
  onRequestRevision,
  userRole,
  onAllowUpdate,
  onDenyUpdate,
}: ReportDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'data' | 'comments' | 'history'>('data');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');

  const sections = getFieldsBySection();

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const allSectionNames = Array.from(sections.keys());
  const allExpanded = allSectionNames.length > 0 && expandedSections.length === allSectionNames.length;
  const toggleAllSections = () => {
    setExpandedSections(allExpanded ? [] : allSectionNames);
  };

  const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
    submitted: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' },
    approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    revision_requested: { label: 'Revision Requested', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-500' },
    rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' },
    update_requested: { label: 'Update Requested', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', dot: 'bg-purple-500' },
    update_in_progress: { label: 'Updating', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500' },
  };

  const status = statusConfig[report.status];

  const handleAddComment = () => {
    if (newComment.trim()) {
      // Add comment logic here
      setNewComment('');
    }
  };

  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handleExportPDF = () => {
    setShowPrintPreview(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{report.flag}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{report.country}</h2>
              <p className="text-sm text-gray-500">Annual Report {report.year}-{report.year + 1}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full ${status.bg} ${status.text} border ${status.border}`}>
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {userRole !== 'viewer' && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              onClick={toggleAllSections}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronsUpDown className="w-4 h-4" />
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Completion:</span>
            <div className="flex-1 max-w-xs">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${report.progress >= 80 ? 'bg-emerald-500' : report.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                  style={{ width: `${report.progress}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700">{report.progress}%</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-gray-200">
          {[
            { id: 'data', label: 'Report Data', icon: FileText },
            { id: 'comments', label: 'Comments', icon: MessageSquare, count: report.comments.length },
            { id: 'history', label: 'History', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'data' && (
            <div className="space-y-4">
              {Array.from(sections.entries()).map(([sectionName, fields]) => (
                <div key={sectionName} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSection(sectionName)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-800">{sectionName}</span>
                    <span className="text-xs text-gray-500">{fields.length} fields</span>
                  </button>
                  {expandedSections.includes(sectionName) && (
                    <div className="p-4 grid grid-cols-2 gap-4">
                      {fields.map(field => (
                        <div key={field.column} className="flex justify-between items-center py-2 border-b border-gray-50">
                          <div>
                            <p className="text-sm text-gray-700">{field.label_en}</p>
                            <p className="text-xs text-gray-400" dir="rtl">{field.label_ur}</p>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {getDisplayValue(field.excel_code, report.data)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {userRole !== 'viewer' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
              <div className="space-y-3">
                {report.comments.map(comment => (
                  <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{comment.author}</span>
                      <span className="text-xs text-gray-400">{comment.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600">{comment.text}</p>
                  </div>
                ))}
                {report.comments.length === 0 && (
                  <p className="text-center text-gray-400 py-8">No comments yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {report.history.map(entry => (
                <div key={entry.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <History className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{entry.action}</span>
                      <span className="text-xs text-gray-400">{entry.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-500">by {entry.user}</p>
                    {entry.details && (
                      <p className="text-sm text-gray-600 mt-1">{entry.details}</p>
                    )}
                  </div>
                </div>
              ))}
              {report.history.length === 0 && (
                <p className="text-center text-gray-400 py-8">No history entries</p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {userRole === 'admin' && report.status === 'submitted' && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-3">
            {isReportLocked(report.year) && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">The deadline has passed. The Country Representative will not be able to make changes if you request a revision.</p>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onRequestRevision}
                className="flex items-center gap-2 px-4 py-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Request Revision
              </button>
              <button
                onClick={onApprove}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Report
              </button>
            </div>
          </div>
        )}
        {userRole === 'admin' && report.status === 'update_requested' && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onDenyUpdate}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Deny Update
            </button>
            <button
              onClick={onAllowUpdate}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Allow Update
            </button>
          </div>
        )}
      </div>
      {showPrintPreview && (
        <PrintableReport
          country={report.country}
          year={report.year}
          data={report.data}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}
