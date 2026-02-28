import { SignIn } from '@clerk/clerk-react';

export function ClerkLoginPage() {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center p-4"
      style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
    >
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-md">
            AR
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold text-gray-800">Annual Reports Dashboard</h1>
            <p className="text-xs text-gray-400">Wakalat Tabshir</p>
          </div>
        </div>
      </div>

      <SignIn routing="hash" />
    </div>
  );
}
