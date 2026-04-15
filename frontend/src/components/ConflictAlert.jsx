import React from 'react';

const ConflictAlert = ({ conflicts }) => {
  if (!conflicts?.length) {
    return null;
  }

  return (
    <div className="card p-4 border-red-600/40 bg-red-950/30">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-red-200">
          Scheduling Conflicts Detected
        </h3>
        <span className="text-[11px] text-red-300">
          {conflicts.length} teacher{conflicts.length > 1 ? 's' : ''} affected
        </span>
      </div>
      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
        {conflicts.map((c, cIdx) => (
          <div key={`conflict-${cIdx}-${c.teacher}`} className="border border-red-900/60 rounded-md p-2">
            <div className="text-xs font-semibold text-red-100">
              {c.teacher}
            </div>
            <ul className="mt-1 text-[11px] text-red-200 space-y-1">
              {(c.conflicts || []).map((conf, idx) => (
                <li key={`${c.teacher}-${conf.day}-${conf.time}-${idx}`}>
                  <span className="font-mono text-xs">
                    {conf.day} {conf.time}
                  </span>{' '}
                  – {conf.classes.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConflictAlert;

