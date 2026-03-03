import { useConvexData } from '@/contexts/ConvexDataContext';
import { ReportsList } from '../reports/ReportsList';

export function ArchivedReportsSection() {
  const { archivedReports, restoreReport, deleteReport } = useConvexData();

  const archivedReportsList = archivedReports.map(r => ({
    id: r.id,
    country: r.country,
    countryCode: r.countryCode || '',
    flag: r.flag || '',
    continent: r.continent || '',
    year: r.year,
    status: r.status as 'draft' | 'submitted' | 'approved' | 'revision_requested' | 'rejected' | 'update_requested' | 'update_in_progress',
    progress: r.progress,
    lastUpdated: r.lastUpdated,
    submittedBy: r.submittedBy || '',
    submittedAt: r.submittedAt,
    approvedBy: r.approvedBy,
    approvedAt: r.approvedAt,
  }));

  const handleRestore = async (report: { id: string }) => {
    await restoreReport(report.id);
  };

  const handlePermanentDelete = async (report: { id: string; country: string; year: number }) => {
    if (!window.confirm(`PERMANENTLY delete the report for ${report.country} (${report.year})? This action CANNOT be undone.`)) return;
    await deleteReport(report.id);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-800">Archived Reports</h3>
        <p className="text-sm text-gray-500">View and restore previously archived reports</p>
      </div>
      <ReportsList
        reports={archivedReportsList}
        onView={() => {}}
        onEdit={() => {}}
        onApprove={() => {}}
        onRequestRevision={() => {}}
        onDelete={() => {}}
        onExport={() => {}}
        userRole="admin"
        isArchiveView
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
      />
    </div>
  );
}
