import React from 'react';

const WorkloadTable = ({ teachers }) => {
  if (!teachers.length) {
    return (
      <div className="card p-4 text-xs text-slate-400">
        No workload data yet. Upload timetables to see analytics.
      </div>
    );
  }

  return (
    <div className="card p-4 overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-slate-400 border-b border-slate-800">
            <th className="text-left py-2 pr-4 font-medium">Teacher</th>
            <th className="text-left py-2 pr-4 font-medium">Dept</th>
            <th className="text-right py-2 pr-4 font-medium">Hours</th>
            <th className="text-right py-2 pr-4 font-medium">Classes</th>
            <th className="text-right py-2 pr-4 font-medium">Free Slots</th>
            <th className="text-left py-2 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => (
            <tr
              key={t.teacher}
              className="border-b border-slate-900 last:border-b-0 hover:bg-slate-900/40"
            >
              <td className="py-2 pr-4">{t.teacher}</td>
              <td className="py-2 pr-4 text-slate-400">
                {t.department || 'General'}
              </td>
              <td className="py-2 pr-4 text-right">{t.totalHours}</td>
              <td className="py-2 pr-4 text-right">{t.totalClasses}</td>
              <td className="py-2 pr-4 text-right">{t.freeSlots}</td>
              <td className="py-2 pr-4">
                <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200">
                  {t.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WorkloadTable;

