import React from 'react';
import UploadForm from '../components/UploadForm.jsx';

const UploadPage = () => {
  return (
    <div className="mt-4">
      <h1 className="text-xl font-semibold text-slate-50">
        Upload Timetables
      </h1>
      <p className="text-xs text-slate-400 mt-1 max-w-2xl">
        Import one or more timetable files to generate workload analytics,
        detect scheduling conflicts, and receive smart redistribution
        suggestions for staff.
      </p>
      <UploadForm />
    </div>
  );
};

export default UploadPage;

