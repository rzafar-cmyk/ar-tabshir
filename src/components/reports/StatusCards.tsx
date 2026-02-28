import { FileText, CheckCircle, Clock, AlertCircle, RotateCcw } from 'lucide-react';

interface StatusStats {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  revisionRequested: number;
  pendingApproval: number;
}

interface StatusCardsProps {
  stats: StatusStats;
  previousStats?: StatusStats;
}

export function StatusCards({ stats }: StatusCardsProps) {
  const cards = [
    {
      title: 'Total Reports',
      value: stats.total,
      icon: FileText,
      color: 'blue',
    },
    {
      title: 'Submitted',
      value: stats.pendingApproval,
      icon: Clock,
      color: 'amber',
    },
    {
      title: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      color: 'emerald',
    },
    {
      title: 'Pending',
      value: stats.draft,
      icon: AlertCircle,
      color: 'rose',
    },
    {
      title: 'Revision Requested',
      value: stats.revisionRequested,
      icon: RotateCcw,
      color: 'orange',
    },
  ];

  const colorMap: Record<string, { bg: string; iconBg: string; iconColor: string }> = {
    blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    rose: { bg: 'bg-rose-50', iconBg: 'bg-rose-100', iconColor: 'text-rose-600' },
    orange: { bg: 'bg-orange-50', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const colors = colorMap[card.color];
        const Icon = card.icon;

        return (
          <div key={card.title} className={`${colors.bg} rounded-xl px-4 py-3 border border-gray-100`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 ${colors.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4.5 h-4.5 ${colors.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{card.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
