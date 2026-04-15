import React, { useEffect, useState } from 'react';
import {
  fetchWorkloadAnalytics,
  fetchConflictAnalysis,
  fetchSuggestions,
  fetchQualityReport,
  exportData,
} from '../services/api.js';
import TeacherCard from '../components/TeacherCard.jsx';
import WorkloadTable from '../components/WorkloadTable.jsx';
import ConflictAlert from '../components/ConflictAlert.jsx';
import DashboardCharts from '../components/DashboardCharts.jsx';

const Dashboard = () => {
  const [workloadData, setWorkloadData] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [qualityReport, setQualityReport] = useState(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [workload, conflictData, suggestionData, quality] = await Promise.all([
        fetchWorkloadAnalytics({
          department: departmentFilter || undefined,
          searchTeacher: search || undefined,
        }),
        fetchConflictAnalysis(),
        fetchSuggestions(),
        fetchQualityReport(),
      ]);
      setWorkloadData(workload);
      setConflicts(conflictData.conflicts || []);
      setSuggestions(suggestionData);
      setQualityReport(quality);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Failed to load analytics.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async (format, type = 'workload') => {
    try {
      const res = await exportData(type, format);
      if (format === 'csv') {
        const url = window.URL.createObjectURL(res.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${type}_report.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const dataStr =
          'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
        const link = document.createElement('a');
        link.href = dataStr;
        link.setAttribute('download', `${type}_report.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      alert('Failed to export data.');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const teachers = workloadData?.workloads || [];
  const statistics = workloadData?.statistics;

  return (
    <div className="space-y-4 mt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">
            📊 Workload Intelligence Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            AI-powered analytics, conflict detection, and optimization insights
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="btn-outline text-xs"
            title="Refresh data"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => handleExport('json', 'workload')}
            className="btn-outline text-xs"
          >
            📥 JSON
          </button>
          <button
            onClick={() => handleExport('csv', 'workload')}
            className="btn-primary text-xs"
          >
            📥 CSV
          </button>
        </div>
      </div>

      {/* Quality Report Card */}
      {qualityReport && (
        <div className="card p-4 border border-emerald-700/40 bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-emerald-400">✓ Data Quality</h3>
              <p className="text-xs text-emerald-300 mt-1">
                Grade: <span className="font-bold">{qualityReport.qualityGrade}</span> | 
                Avg Confidence: <span className="font-bold">{qualityReport.averageConfidence}%</span> |
                Total: {qualityReport.totalEntries} entries
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Flagged</div>
              <div className="text-xl font-bold text-yellow-500">{qualityReport.flaggedEntries}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="card p-4 flex flex-col md:flex-row gap-3 md:items-end"
      >
        <div className="flex-1">
          <label className="block text-[11px] text-slate-400 mb-1">
            🔍 Search by teacher name
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Dr. Rao"
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] text-slate-400 mb-1">
            🏛️ Filter by department
          </label>
          <input
            type="text"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            placeholder="e.g. CSE"
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="btn-primary text-xs md:self-auto"
          disabled={isLoading}
        >
          {isLoading ? '⏳ Loading…' : '🔎 Apply'}
        </button>
      </form>

      {error && (
        <div className="card p-3 text-xs text-red-300 bg-red-950/40 border border-red-700/60">
          ❌ {error}
        </div>
      )}

      {/* Stats Overview */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card p-4 bg-slate-900">
            <div className="text-xs text-slate-400">Total Teachers</div>
            <div className="text-2xl font-bold text-slate-200">{statistics.totalTeachers}</div>
          </div>
          <div className="card p-4 bg-red-950/40 border border-red-700/30">
            <div className="text-xs text-red-300">Overloaded</div>
            <div className="text-2xl font-bold text-red-400">{statistics.overloaded}</div>
          </div>
          <div className="card p-4 bg-emerald-950/40 border border-emerald-700/30">
            <div className="text-xs text-emerald-300">Balanced</div>
            <div className="text-2xl font-bold text-emerald-400">{statistics.balanced}</div>
          </div>
          <div className="card p-4 bg-yellow-950/40 border border-yellow-700/30">
            <div className="text-xs text-yellow-300">Underloaded</div>
            <div className="text-2xl font-bold text-yellow-400">{statistics.underloaded}</div>
          </div>
          <div className="card p-4 bg-slate-900">
            <div className="text-xs text-slate-400">Avg Hours/Week</div>
            <div className="text-2xl font-bold text-slate-200">{statistics.averageHours}</div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
        {/* Left Column: Charts and Tables */}
        <div className="space-y-4">
          <DashboardCharts
            workloads={teachers}
            distribution={workloadData?.distribution}
          />
          <WorkloadTable teachers={teachers} />
        </div>

        {/* Right Column: Insights */}
        <div className="space-y-4">
          {/* Conflicts */}
          {conflicts && (
            <ConflictAlert conflicts={conflicts} totalCount={conflicts.length} />
          )}

          {/* Suggestions */}
          {suggestions && suggestions.suggestions && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-slate-50 mb-3">
                💡 Optimization Suggestions
              </h3>
              
              {suggestions.suggestions.length === 0 ? (
                <p className="text-xs text-slate-400">
                  ✓ No optimization suggestions available. System appears optimal.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {suggestions.suggestions.slice(0, 8).map((sug, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-700 rounded-lg p-2 bg-slate-900/50 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-200">
                            {sug.type === 'WORKLOAD_DISTRIBUTION'
                              ? `Transfer: ${sug.fromTeacher} → ${sug.toTeacher}`
                              : sug.type === 'CONFLICT_RESOLUTION'
                              ? `Resolve: ${sug.teacher}`
                              : sug.type}
                          </div>
                          <div className="text-slate-400 mt-1">{sug.reason}</div>
                          {sug.impact && (
                            <div className="text-slate-500 mt-1 text-[10px]">
                              Before/After:{' '}
                              <span className="text-red-400">
                                {sug.impact.fromTeacherAfter?.toFixed(1)}h
                              </span>
                              /
                              <span className="text-emerald-400">
                                {sug.impact.toTeacherAfter?.toFixed(1)}h
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-yellow-500 font-bold">
                          P{sug.priority}
                        </div>
                      </div>
                    </div>
                  ))}
                  {suggestions.suggestions.length > 8 && (
                    <div className="text-xs text-slate-500 text-center py-2">
                      +{suggestions.suggestions.length - 8} more suggestions
                    </div>
                  )}
                </div>
              )}

              {suggestions.actionPlan && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="text-xs text-slate-400">
                    <div className="font-semibold text-slate-300">
                      📋 Action Plan Summary
                    </div>
                    <div className="text-slate-500 mt-1">
                      {suggestions.actionPlan.summary}
                    </div>
                    <div className="text-slate-600 mt-1">
                      Est. Implementation: ~{suggestions.actionPlan.estimatedImplementationDays} days
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Department Summary */}
          {workloadData?.departmentSummary && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-slate-50 mb-3">
                🏛️ Department Summary
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {workloadData.departmentSummary.map((dept, idx) => (
                  <div key={idx} className="border border-slate-700 rounded-lg p-2 bg-slate-900/50 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-200">{dept.department}</span>
                      <span className="text-slate-400">{dept.teachers} teachers</span>
                    </div>
                    <div className="flex gap-2 mt-1 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        Balanced: {dept.balanced}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                        Over: {dept.overloaded}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                        Under: {dept.underloaded}
                      </span>
                    </div>
                    <div className="text-slate-500 mt-1">
                      Avg: <span className="font-semibold text-slate-300">{dept.averageHours}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <section className="text-[11px] text-slate-600 bg-slate-950/40 rounded-lg p-3 border border-slate-800">
        <div className="space-y-1">
          <div>
            <strong>Status Indicators:</strong> 🟢 Green = Balanced (10-20h) | 🔴 Red = Overloaded ({'>'}20h) | 🟡 Yellow = Underloaded ({'<'}10h)
          </div>
          <div>
            <strong>Confidence Scoring:</strong> All entries are scored (0-100%) and flagged if {`<`}70%. Check Data Quality tab for details.
          </div>
          <div>
            <strong>Auto-Refresh:</strong> Dashboard updates every 30 seconds. Click 🔄 Refresh to update immediately.
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

