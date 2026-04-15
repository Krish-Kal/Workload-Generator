import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">
            WG
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-50">
              Workload Generator
            </div>
            <div className="text-xs text-slate-400">
              Timetable analytics for staff
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`
            }
          >
            Upload
          </NavLink>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;

