import { Check, ChevronRight } from 'lucide-react';

interface SectionInfo {
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  progress: number;
}

interface SectionNavProps {
  sections: SectionInfo[];
  onSectionClick: (index: number) => void;
}

export function SectionNav({ sections, onSectionClick }: SectionNavProps) {
  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Report Sections</h3>
        <p className="text-xs text-gray-400 mt-1">27 sections total</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sections.map((section, index) => (
          <button
            key={index}
            onClick={() => onSectionClick(index)}
            className={`w-full text-left p-3 border-b border-gray-50 transition-all duration-200 ${
              section.isActive 
                ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                : 'border-l-4 border-l-transparent hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                section.isCompleted 
                  ? 'bg-emerald-500 text-white' 
                  : section.isActive 
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
              }`}>
                {section.isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${
                  section.isActive ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {section.title}
                </p>
                
                {/* Mini progress bar */}
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        section.isCompleted ? 'bg-emerald-500' : 'bg-blue-400'
                      }`}
                      style={{ width: `${section.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{section.progress}%</span>
                </div>
              </div>

              {section.isActive && (
                <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">
              {sections.filter(s => s.isCompleted).length}
            </p>
            <p className="text-[10px] text-gray-500">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">
              {sections.filter(s => s.progress > 0 && !s.isCompleted).length}
            </p>
            <p className="text-[10px] text-gray-500">In Progress</p>
          </div>
        </div>
      </div>
    </div>
  );
}
