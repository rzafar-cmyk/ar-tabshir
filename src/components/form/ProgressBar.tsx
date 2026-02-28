interface ProgressBarProps {
  progress: number;
  filledFields: number;
  totalFields: number;
}

export function ProgressBar({ progress, filledFields, totalFields }: ProgressBarProps) {
  // Determine color based on progress
  const getColor = () => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-amber-500';
    return 'bg-gray-400';
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-4">
        {/* Progress Bar */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600">
              Overall Progress
            </span>
            <span className="text-xs font-semibold text-gray-800">
              {progress}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="text-right">
            <p className="font-semibold text-gray-800">{filledFields}</p>
            <p>Completed</p>
          </div>
          <div className="text-gray-300">/</div>
          <div className="text-right">
            <p className="font-semibold text-gray-800">{totalFields}</p>
            <p>Total Fields</p>
          </div>
        </div>
      </div>
    </div>
  );
}
