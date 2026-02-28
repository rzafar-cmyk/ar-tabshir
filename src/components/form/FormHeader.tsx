import { Flag, Calendar, FileText } from 'lucide-react';

interface FormHeaderProps {
  countryName: string;
  year: number;
  sectionTitle: string;
  sectionNumber: number;
  totalSections: number;
}

export function FormHeader({ 
  countryName, 
  year, 
  sectionTitle, 
  sectionNumber, 
  totalSections 
}: FormHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Country & Year */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Flag className="w-4 h-4" />
            <span className="text-sm font-medium">{countryName}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">{year}</span>
          </div>
        </div>

        {/* Center: Section Info */}
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-500" />
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">{sectionTitle}</p>
            <p className="text-xs text-gray-400">
              Section {sectionNumber} of {totalSections}
            </p>
          </div>
        </div>

        {/* Right: Status Badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs font-medium bg-amber-50 text-amber-600 rounded-full border border-amber-200">
            Draft
          </span>
        </div>
      </div>
    </div>
  );
}
