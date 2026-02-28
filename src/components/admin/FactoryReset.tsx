import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { factoryReset } from '@/services/dataService';

interface FactoryResetProps {
  onDone: () => void;
}

type Step = 'warning' | 'confirm' | 'countdown' | 'done';

export function FactoryReset({ onDone }: FactoryResetProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('warning');
  const [confirmText, setConfirmText] = useState('');
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const executeReset = useCallback(() => {
    if (!user) return;
    factoryReset(user.id);
    setStep('done');
  }, [user]);

  // Countdown logic
  useEffect(() => {
    if (step !== 'countdown') return;
    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          executeReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, executeReset]);

  const cancelCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setStep('warning');
    setConfirmText('');
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Only Super Admins can perform a factory reset.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Step 1: Warning */}
      {step === 'warning' && (
        <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-800">Factory Reset</h2>
              <p className="text-xs text-red-600">Danger Zone — Irreversible Action</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-2">This will permanently delete:</h3>
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">&#8226;</span>All reports (all countries, all years, all statuses)</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">&#8226;</span>All user accounts (except yours)</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">&#8226;</span>All revision comments and audit logs</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">&#8226;</span>All archived data</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-2">The following will be preserved:</h3>
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span>Your admin account ({user.name})</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span>Form structure and field definitions</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span>Country and continent data</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span>App settings and configuration</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-700">This action CANNOT be undone.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onDone}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="px-5 py-2.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
              >
                Proceed to Confirmation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Type confirmation */}
      {step === 'confirm' && (
        <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-800">Confirm Factory Reset</h2>
              <p className="text-xs text-red-600">Type the confirmation phrase to proceed</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                Type <span className="font-mono bg-red-50 text-red-700 px-2 py-0.5 rounded">RESET EVERYTHING</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESET EVERYTHING"
                className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none font-mono"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setStep('warning'); setConfirmText(''); }}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('countdown')}
                disabled={confirmText !== 'RESET EVERYTHING'}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Execute Factory Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Countdown */}
      {step === 'countdown' && (
        <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-200">
            <h2 className="text-lg font-bold text-red-800 text-center">Factory Reset Starting...</h2>
          </div>

          <div className="p-8 text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-red-50 border-4 border-red-300 flex items-center justify-center">
              <span className="text-4xl font-bold text-red-600">{countdown}</span>
            </div>
            <p className="text-sm text-gray-600">
              Factory reset will execute in <strong className="text-red-600">{countdown}</strong> second{countdown !== 1 ? 's' : ''}...
            </p>
            <button
              onClick={cancelCountdown}
              className="px-6 py-2.5 text-sm font-semibold text-gray-600 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel Now
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm overflow-hidden">
          <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-800">Factory Reset Complete</h2>
              <p className="text-xs text-emerald-600">All data has been deleted successfully</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              The app is now in a fresh state. All reports and user accounts (except yours) have been removed.
              Dashboard cards will show zeros and all lists will be empty.
            </p>
            <div className="flex justify-end">
              <button
                onClick={onDone}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
