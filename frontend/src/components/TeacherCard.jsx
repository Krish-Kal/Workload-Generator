import React from 'react';

const statusColors = {
  Overloaded: 'bg-red-500/20 border-red-500/60 text-red-300',
  Balanced: 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300',
  Underloaded: 'bg-amber-500/20 border-amber-500/60 text-amber-200',
};

const TeacherCard = ({ teacher }) => {
  const colorClass = statusColors[teacher.status] || statusColors.Balanced;

  return (
    <div className="card p-4 flex flex-col gap-3 hover:-translate-y-0.5 hover:border-slate-600 transition-transform">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-50">
            {teacher.teacher}
          </div>
          <div className="text-xs text-slate-400">
            {teacher.department || 'General'}
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-[11px] border ${colorClass}`}
        >
          {teacher.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">
            Hours / week
          </div>
          <div className="text-sm font-semibold">{teacher.totalHours}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">
            Classes
          </div>
          <div className="text-sm font-semibold">{teacher.totalClasses}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">
            Free slots
          </div>
          <div className="text-sm font-semibold">{teacher.freeSlots}</div>
        </div>
      </div>

      {teacher.subjects?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {teacher.subjects.map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-200"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherCard;

