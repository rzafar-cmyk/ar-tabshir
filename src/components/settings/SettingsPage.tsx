import { useState } from 'react';
import { UsersSection } from '../users';
import { DeadlineSettings } from '../shared/DeadlineCountdown';
import { YearManagement } from '../admin/YearManagement';
import { ImportHistoricalData } from '../import/ImportHistoricalData';
import { FactoryReset } from '../admin/FactoryReset';
import { ArchivedReportsSection } from './ArchivedReportsSection';

const TABS = [
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'deadline', label: 'Deadline', icon: '🕐' },
  { id: 'year-management', label: 'Year Management', icon: '📅' },
  { id: 'import', label: 'Import', icon: '📥' },
  { id: 'archived', label: 'Archived Data', icon: '🗄️' },
  { id: 'factory-reset', label: 'Factory Reset', icon: '🗑️' },
] as const;

type SettingsTab = (typeof TABS)[number]['id'];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('users');

  return (
    <div className="p-6 space-y-4">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UsersSection />}
      {activeTab === 'deadline' && (
        <div className="space-y-4">
          <DeadlineSettings />
        </div>
      )}
      {activeTab === 'year-management' && (
        <div className="space-y-4">
          <YearManagement />
        </div>
      )}
      {activeTab === 'import' && (
        <ImportHistoricalData onDone={() => setActiveTab('users')} />
      )}
      {activeTab === 'archived' && (
        <ArchivedReportsSection />
      )}
      {activeTab === 'factory-reset' && (
        <FactoryReset onDone={() => setActiveTab('users')} />
      )}
    </div>
  );
}
