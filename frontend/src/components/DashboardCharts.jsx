import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const statusColorMap = {
  Overloaded: '#f97373',
  Balanced: '#4ade80',
  Underloaded: '#facc15',
};

const DashboardCharts = ({ teachers = [] }) => {
  if (!teachers || teachers.length === 0)  {
    return (
      <div className="card p-4 text-xs text-slate-400">
        Charts will appear here after uploading timetables.
      </div>
    );
  }

  const barData = teachers.map((t) => ({
    name: t.teacher,
    hours: t.totalHours,
  }));

  const statusCounts = teachers.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    { Overloaded: 0, Balanced: 0, Underloaded: 0 }
  );

  const pieData = Object.keys(statusCounts).map((status) => ({
    name: status,
    value: statusCounts[status],
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-50 mb-2">
          Workload per Teacher (Hours)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#cbd5f5' }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11, fill: '#cbd5f5' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  border: '1px solid #1f2937',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-50 mb-2">
          Workload Distribution
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.name} (${entry.value})`}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={statusColorMap[entry.name] || '#64748b'}
                  />
                ))}
              </Pie>
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  color: '#cbd5f5',
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  border: '1px solid #1f2937',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;

