import React, { useState } from 'react';
import {
  uploadTimetables,
  processTimetables,
  fetchWorkloadAnalytics,
  fetchConflictAnalysis,
  fetchSuggestions,
  fetchQualityReport,
} from '../services/api.js';

const UploadForm = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
 const [qualityReport, setQualityReport] = useState({
  qualityGrade: '-',
  averageConfidence: 0,
  confidenceDistribution: {
    excellent: 0,
    good: 0,
    acceptable: 0,
    needsReview: 0
  }
});

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files || []));
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length) {
      setError('Please select at least one file (CSV, XLSX, JSON, or TXT).');
      return;
    }

    setIsUploading(true);
    setError('');
    setMessage('');
    setUploadResult(null);

    try {
      console.log(`[DEBUG] Uploading ${files.length} file(s)...`);
      // Step 1: Upload and parse files
      const res = await uploadTimetables(files);
      console.log(`[DEBUG] Upload response - Total: ${res.summary.totalRows}, Valid: ${res.summary.totalValid}, Invalid: ${res.summary.totalInvalid}`);
      
      setUploadResult(res);
      setMessage(`✓ Parsed ${res.summary.totalRows} rows`);
      
      // Check if all data is high quality
      if (res.summary.totalInvalid === 0) {
        console.log(`[DEBUG] All rows valid - auto-processing...`);
        // Auto-process if all rows are valid
        await processData(res);
      } else {
        setMessage(
          `✓ Parsing complete: ${res.summary.totalValid} valid, ${res.summary.totalInvalid} need review`
        );
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err.message ||
        'Failed to upload files.';
      console.error(`[ERROR] Upload failed: ${msg}`, err);
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const processData = async (res) => {
    setIsProcessing(true);
    try {
      // Collect all normalized entries from results
      const allEntries = [];
      for (const result of res.results) {
        if (result.entries) {
          allEntries.push(...result.entries);
        }
      }

      if (allEntries.length === 0) {
        setError('No valid entries to process');
        return;
      }

      console.log(`[DEBUG] Processing ${allEntries.length} entries...`);

      // Step 2: Process normalized entries
      const processRes = await processTimetables(res.batchId, allEntries);
      console.log(`[DEBUG] Stored: ${processRes.stored}, Flagged: ${processRes.flagged}`);

      // Step 3: Fetch ALL fresh analytics from backend
      console.log(`[DEBUG] Fetching fresh analytics...`);
      const [workload, conflicts, suggestions, quality] = await Promise.all([
        fetchWorkloadAnalytics(),
        fetchConflictAnalysis(),
        fetchSuggestions(),
        fetchQualityReport(),
      ]);
      console.log(`[DEBUG] Analytics fetched - Workloads: ${workload.workloads?.length || 0}`);

      setQualityReport(quality);

      setMessage(
        `✓ Success! Stored ${processRes.stored} entries. Quality Grade: ${quality.qualityGrade}`
      );

      // Signal dashboard to refresh
      sessionStorage.setItem('timetableUploaded', 'true');
      
      // Trigger dashboard refresh via callback
      if (onUploadSuccess) {
        console.log(`[DEBUG] Calling onUploadSuccess callback...`);
        onUploadSuccess();
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Failed to process data.';
      console.error(`[ERROR] Process failed: ${msg}`, err);
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessNow = async () => {
    if (uploadResult) {
      await processData(uploadResult);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-6 space-y-4">
      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">
            📤 Upload Timetable Files
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload any timetable format: CSV, XLSX, JSON, or raw text. The system will automatically parse and normalize it.
          </p>
        </div>

        <div className="border border-dashed border-slate-700 rounded-lg p-6 bg-slate-900/60 hover:bg-slate-900 transition">
          <label
            htmlFor="timetable-files"
            className="flex flex-col items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm text-slate-200">
              Drag and drop or <span className="text-blue-400 underline">browse</span> to upload
            </span>
            <span className="text-xs text-slate-500">
              CSV, XLSX, JSON, TXT – up to 20 files
            </span>
          </label>
          <input
            id="timetable-files"
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.json,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          {files.length > 0 && (
            <div className="mt-4 text-xs text-slate-300">
              <div className="font-semibold mb-2">📁 Selected ({files.length}):</div>
              <div className="space-y-1">
                {files.map((f, idx) => (
                  <div key={idx} className="text-slate-400">
                    • {f.name} ({(f.size / 1024).toFixed(1)} KB)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            className="btn-primary"
            disabled={isUploading || isProcessing}
          >
            {isUploading ? '⏳ Uploading…' : '🚀 Upload & Parse'}
          </button>
          <a
            href="http://localhost:5000/sample-data/sample_timetable.csv"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            📥 Download sample
          </a>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-700/60 rounded-md px-3 py-2">
            ❌ {error}
          </div>
        )}
        {message && (
          <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-700/60 rounded-md px-3 py-2">
            ✓ {message}
          </div>
        )}
      </form>

      {/* Results Preview */}
      {uploadResult && (
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-50">📊 Parsing Results</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Total Rows</div>
              <div className="text-2xl font-bold text-slate-200">{uploadResult.summary.totalRows}</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Valid</div>
              <div className="text-2xl font-bold text-emerald-400">{uploadResult.summary.totalValid}</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Need Review</div>
              <div className="text-2xl font-bold text-yellow-500">{uploadResult.summary.totalInvalid}</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Processing Time</div>
              <div className="text-2xl font-bold text-blue-400">{uploadResult.processingTime}ms</div>
            </div>
          </div>

          {uploadResult.results.map((result, idx) => (
            <div key={idx} className="bg-slate-900 rounded-lg p-3 text-xs">
              <div className="font-semibold text-slate-200">{result.file}</div>
              <div className="text-slate-400 mt-1">
                Rows: {result.rowsProcessed} | Valid: {result.rowsValid} | Issues: {result.rowsInvalid}
              </div>
              {result.error && <div className="text-red-400 mt-1">Error: {result.error}</div>}
            </div>
          ))}

          {uploadResult.summary.totalInvalid > 0 && (
            <div className="bg-yellow-950/40 border border-yellow-700/60 rounded-md px-4 py-3 text-xs">
              <div className="font-semibold text-yellow-400 mb-1">⚠️ Flagged Entries</div>
              <div className="text-yellow-300">
                {uploadResult.summary.totalInvalid} entries have low confidence scores and may need manual review.
              </div>
            </div>
          )}

          {uploadResult.summary.totalInvalid > 0 && (
            <button
              onClick={handleProcessNow}
              className="btn-primary w-full"
              disabled={isProcessing}
            >
              {isProcessing ? '⏳ Processing…' : '✓ Process Flagged Entries'}
            </button>
          )}
        </div>
      )}

      {/* Quality Report */}
      {qualityReport && (
        <div className="card p-6 space-y-4 border border-emerald-700/40 bg-emerald-950/20">
          <h3 className="text-lg font-semibold text-emerald-400">📈 Data Quality Report</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-950/40 rounded-lg p-4">
              <div className="text-sm text-emerald-300 mb-1">Quality Grade</div>
              <div className="text-3xl font-bold text-emerald-300">{qualityReport.qualityGrade}</div>
            </div>
            <div className="bg-emerald-950/40 rounded-lg p-4">
              <div className="text-sm text-emerald-300 mb-1">Avg Confidence</div>
              <div className="text-3xl font-bold text-emerald-300">{qualityReport.averageConfidence}%</div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Excellent (90-100%)</span>
              <span className="text-emerald-400 font-semibold">{qualityReport?.confidenceDistribution?.excellent ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Good (80-90%)</span>
              <span className="text-emerald-400 font-semibold">{qualityReport.confidenceDistribution.good}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Acceptable (70-80%)</span>
              <span className="text-yellow-500 font-semibold">{qualityReport.confidenceDistribution.acceptable}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Needs Review ({'<'}70%)</span>
              <span className="text-red-400 font-semibold">{qualityReport.confidenceDistribution.needsReview}</span>
            </div>
          </div>

          <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-700/60 rounded-md px-3 py-2">
            ✓ All data processed successfully and stored in the database!
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadForm;

