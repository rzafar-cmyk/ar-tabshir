import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface DeadlineCountdownProps {
  compact?: boolean;
}

function getDeadline(): string | null {
  return localStorage.getItem('ar_deadline');
}

function getTimeRemaining(deadline: string) {
  const now = new Date();
  const end = new Date(deadline + 'T23:59:59');
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, total: 0 };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { expired: false, days, hours, minutes, total: diff };
}

export function DeadlineCountdown({ compact = false }: DeadlineCountdownProps) {
  const [deadline, setDeadline] = useState<string | null>(getDeadline());
  const [timeLeft, setTimeLeft] = useState(deadline ? getTimeRemaining(deadline) : null);

  useEffect(() => {
    // Re-read deadline from localStorage periodically (in case admin changes it)
    const checkDeadline = () => {
      const d = getDeadline();
      setDeadline(d);
      if (d) setTimeLeft(getTimeRemaining(d));
    };

    checkDeadline();
    const interval = setInterval(checkDeadline, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  // Also update the countdown every minute
  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(deadline));
    }, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline || !timeLeft) return null;

  const deadlineDate = new Date(deadline).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Urgency levels
  const isUrgent = !timeLeft.expired && timeLeft.days <= 7;
  const isWarning = !timeLeft.expired && timeLeft.days <= 30 && timeLeft.days > 7;

  if (compact) {
    // Compact version for sidebar or small spaces
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
        timeLeft.expired
          ? 'bg-red-50 text-red-700 border border-red-200'
          : isUrgent
          ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
          : isWarning
          ? 'bg-amber-50 text-amber-700 border border-amber-200'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
      }`}>
        <Clock className="w-3.5 h-3.5" />
        {timeLeft.expired ? (
          <span>Deadline passed</span>
        ) : (
          <span>{timeLeft.days}d {timeLeft.hours}h left</span>
        )}
      </div>
    );
  }

  // Full banner — slim single-line bar
  if (timeLeft.expired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-red-700">Submission Deadline: {deadlineDate}</span>
        <span className="text-xs text-red-500 font-medium">&middot; Deadline passed — Submit ASAP</span>
      </div>
    );
  }

  const barClass = isUrgent
    ? 'bg-red-50 border-red-200 text-red-700'
    : isWarning
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-blue-50 border-blue-200 text-blue-700';

  const dotClass = isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-blue-400';

  return (
    <div className={`border rounded-lg px-4 py-2 flex items-center gap-2 ${barClass}`}>
      <span className="text-sm flex-shrink-0">📅</span>
      <span className="text-xs font-semibold whitespace-nowrap">Submission Deadline: {deadlineDate}</span>
      <span className={`text-xs ${dotClass}`}>&middot;</span>
      <span className="text-xs font-medium whitespace-nowrap">
        {timeLeft.days}d {timeLeft.hours}h remaining
      </span>
      {isUrgent && <span className="text-[10px] font-bold animate-pulse ml-1">— Submit now!</span>}
    </div>
  );
}

// Admin component for setting the deadline — compact single-line bar
export function DeadlineSettings() {
  const [deadline, setDeadline] = useState(localStorage.getItem('ar_deadline') || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (deadline) {
      localStorage.setItem('ar_deadline', deadline);
    } else {
      localStorage.removeItem('ar_deadline');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem('ar_deadline');
    setDeadline('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2.5 flex items-center gap-3 flex-wrap">
      <span className="text-sm flex-shrink-0">🕐</span>
      <span className="text-xs font-bold text-gray-800 whitespace-nowrap">Submission Deadline</span>
      <input
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none w-[150px]"
      />
      <button
        onClick={handleSave}
        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
      >
        {saved ? '✓ Saved' : 'Set Deadline'}
      </button>
      {deadline && (
        <button
          onClick={handleClear}
          className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
