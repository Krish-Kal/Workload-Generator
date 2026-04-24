import React from 'react';

const severityMeta = {
  CRITICAL: 'bg-red-500/20 text-red-300 border border-red-500/40',
  SEVERE: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
  HIGH: 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/40',
  MEDIUM: 'bg-slate-700/70 text-slate-200 border border-slate-600',
  WARNING: 'bg-amber-500/20 text-amber-200 border border-amber-500/40',
};

const typeMeta = {
  TIME: 'Time Clash',
  RESOURCE: 'Room Clash',
  CROSS_DEPARTMENT: 'Cross-Dept',
};

const cleanTime = (timeValue) => {
  if (!timeValue) return '';
  return String(timeValue)
    .replace(/–\d{2}:\d{2}/g, '')
    .replace(/--+/g, '')
    .trim();
};

const formatSlot = (conflict) => {
  const start = cleanTime(conflict.startTime);
  const end = cleanTime(conflict.endTime);
  return end ? `${start}-${end}` : start;
};

const getConflictTitle = (conflict) => {
  const classes = [conflict.class1, conflict.class2].filter(Boolean);
  if (classes.length > 1) {
    return classes.join(' vs ');
  }
  return classes[0] || 'Schedule conflict';
};

const ConflictAlert = ({ conflicts = [], totalCount }) => {
  if (!conflicts.length) return null;

  const teacherGroups = conflicts
    .map((group) => ({
      teacher: group.teacher,
      conflicts: (group.conflicts || []).map((conflict) => ({
        ...conflict,
        severity: conflict.severity || (conflict.type === 'TIME' ? 'HIGH' : 'MEDIUM'),
      })),
    }))
    .filter((group) => group.teacher && group.conflicts.length > 0);

  const totalConflicts =
    totalCount ??
    teacherGroups.reduce((sum, group) => sum + group.conflicts.length, 0);

  if (!teacherGroups.length) return null;

  return (
    <div className="card p-4 border border-red-600/30 bg-red-950/20">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-red-100">
            Scheduling Conflicts
          </h3>
          <p className="text-xs text-red-200/80 mt-1">
            Conflicts are grouped by teacher and shown with time slot and affected classes.
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-red-300">{totalConflicts}</div>
          <div className="text-[11px] text-red-200/80">
            {teacherGroups.length} teacher{teacherGroups.length > 1 ? 's' : ''} affected
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {teacherGroups.map((group) => (
          <div
            key={group.teacher}
            className="rounded-lg border border-red-900/50 bg-slate-950/40 p-3"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-sm font-semibold text-slate-100">
                {group.teacher}
              </div>
              <div className="text-[11px] text-slate-400">
                {group.conflicts.length} conflict{group.conflicts.length > 1 ? 's' : ''}
              </div>
            </div>

            <div className="space-y-2">
              {group.conflicts.map((conflict, index) => (
                <div
                  key={`${group.teacher}-${conflict.day}-${conflict.startTime}-${index}`}
                  className="rounded-md border border-slate-800 bg-slate-900/70 p-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200">
                        {getConflictTitle(conflict)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {conflict.day || 'Unknown day'} | {formatSlot(conflict)}
                        {conflict.overlapMinutes ? ` | ${conflict.overlapMinutes} min overlap` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {conflict.class1 && conflict.class2
                          ? `${conflict.class1} overlaps with ${conflict.class2}`
                          : conflict.class1 || conflict.class2 || 'Conflict detected'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          severityMeta[conflict.severity] || severityMeta.MEDIUM
                        }`}
                      >
                        {conflict.severity}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        {typeMeta[conflict.type] || conflict.type || 'Conflict'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConflictAlert;
