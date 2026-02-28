import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';

interface CompilationResult {
  countries: string[];
  fields: string[];
  data: Record<string, Record<string, number>>;
  totals: Record<string, number>;
  averages: Record<string, number>;
  yearOverYear: Record<string, { current: number; previous: number; change: number }>;
}

interface CompilationChartProps {
  results: CompilationResult;
  fieldLabels: string[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export function CompilationChart({ results, fieldLabels }: CompilationChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
  const [selectedField, setSelectedField] = useState<string>(results.fields[0]);

  // Prepare data for bar chart (all fields, top 10 countries)
  const barChartData = results.countries.slice(0, 10).map(country => {
    const dataPoint: Record<string, number | string> = { country };
    results.fields.forEach(field => {
      dataPoint[field] = results.data[country]?.[field] || 0;
    });
    return dataPoint;
  });

  // Prepare data for pie chart (single field distribution)
  const pieChartData = results.countries.map(country => ({
    name: country,
    value: results.data[country]?.[selectedField] || 0
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

  // Prepare data for line chart (year over year comparison)
  const lineChartData = results.fields.map(field => ({
    field: fieldLabels[results.fields.indexOf(field)] || field,
    current: results.yearOverYear[field]?.current || 0,
    previous: results.yearOverYear[field]?.previous || 0,
    change: results.yearOverYear[field]?.change || 0
  }));

  const selectedFieldLabel = fieldLabels[results.fields.indexOf(selectedField)] || selectedField;

  return (
    <div className="space-y-4">
      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Chart Type:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                chartType === 'bar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Bar
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                chartType === 'pie' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              <PieChartIcon className="w-4 h-4" />
              Pie
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                chartType === 'line' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Trend
            </button>
          </div>
        </div>

        {chartType === 'pie' && (
          <select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
          >
            {results.fields.map((field, idx) => (
              <option key={field} value={field}>{fieldLabels[idx]}</option>
            ))}
          </select>
        )}
      </div>

      {/* Charts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {chartType === 'bar' && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Country Comparison (Top 10)</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="country" 
                  tick={{ fontSize: 11 }} 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString()}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Legend />
                {results.fields.map((field, idx) => (
                  <Bar 
                    key={field} 
                    dataKey={field} 
                    name={fieldLabels[idx]} 
                    fill={COLORS[idx % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartType === 'pie' && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">{selectedFieldLabel} Distribution</h4>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {pieChartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-gray-600">{entry.name}: {entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {chartType === 'line' && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Year-over-Year Comparison</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={lineChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="field" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString()}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Bar dataKey="previous" name="Previous Year" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="current" name="Current Year" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-xs text-blue-600 mb-1">Highest Value</p>
          <p className="text-lg font-bold text-blue-800">
            {Math.max(...results.fields.map(f => results.totals[f] || 0)).toLocaleString()}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-4 text-center">
          <p className="text-xs text-emerald-600 mb-1">Average per Country</p>
          <p className="text-lg font-bold text-emerald-800">
            {Math.round(results.fields.reduce((sum, f) => sum + (results.averages[f] || 0), 0) / results.fields.length).toLocaleString()}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <p className="text-xs text-purple-600 mb-1">Total Countries</p>
          <p className="text-lg font-bold text-purple-800">{results.countries.length}</p>
        </div>
      </div>
    </div>
  );
}
