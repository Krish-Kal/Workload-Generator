import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import TimetableEntry from '../models/Timetable.js';
import Teacher from '../models/Teacher.js';
import { AuditTrailManager } from '../models/AuditLog.js';
import ParserEngine from '../engines/parserEngine.js';
import NormalizationEngine from '../engines/normalizationEngine.js';
import WorkloadEngine from '../engines/workloadEngine.js';
import ConflictEngine from '../engines/conflictEngine.js';
import SuggestionEngine from '../engines/suggestionEngine.js';
import { v4 as uuidv4 } from 'uuid';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================== MULTER ==================
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname}`),
});

export const uploadMiddleware = multer({ storage });

// ================== ENGINES ==================
const parserEngine = new ParserEngine();
const workloadEngine = new WorkloadEngine();
const conflictEngine = new ConflictEngine();
const suggestionEngine = new SuggestionEngine();

// ================== UPLOAD ==================
const uploadTimetables = async (req, res, next) => {
  const batchId = uuidv4();
  const uploadStartedAt = Date.now();

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // 🔥 clear old data (fix old sample issue)
    await TimetableEntry.deleteMany({});
    await Teacher.deleteMany({});

    const results = [];
    let totalRows = 0;
    let totalValid = 0;
    let totalInvalid = 0;

    for (const file of req.files) {
      try {
        const parseResult = await parserEngine.parseFile(file.path, file.originalname);

        const normalizedData = parserEngine.normalizeHeaders(parseResult.rawData);
        const validation = parserEngine.validateAndClean(normalizedData);

        const normalizationEngine = new NormalizationEngine({
          teachers: [],
        });

        const normalizedEntries = validation.valid.map((entry) =>
          normalizationEngine.normalize(entry, { batchId })
        );

        totalRows += parseResult.totalRows;
        totalValid += validation.validCount;
        totalInvalid += validation.invalidCount;

        results.push({
          file: file.originalname,
          rowsProcessed: parseResult.totalRows,
          rowsValid: validation.validCount,
          rowsInvalid: validation.invalidCount,
          entries: normalizedEntries,
        });
      } catch (err) {
        results.push({ file: file.originalname, error: err.message });
      }

      fs.unlink(file.path, () => {});
    }

    res.json({
      batchId,
      success: true,
      summary: { totalRows, totalValid, totalInvalid },
      processingTimeMs: Date.now() - uploadStartedAt,
      results,
    });
  } catch (error) {
    next(error);
  }
};

// ================== PROCESS ==================
const processTimetables = async (req, res, next) => {
  try {
    const { batchId, entries } = req.body;

    if (!entries || entries.length === 0) {
      return res.status(400).json({ error: 'No entries provided' });
    }

    const goodEntries = entries.filter(
      (e) => (e.confidenceScore || 1) >= 0.7
    );

    const inserted = await TimetableEntry.insertMany(goodEntries);

    // unique teachers
    const teacherMap = {};
    goodEntries.forEach((e) => {
      teacherMap[e.teacherName] = e.department || 'General';
    });

    for (const name in teacherMap) {
      await Teacher.findOneAndUpdate(
        { name },
        { name, department: teacherMap[name] },
        { upsert: true }
      );
    }

    res.json({
      success: true,
      batchId,
      stored: inserted.length,
    });
  } catch (error) {
    next(error);
  }
};

// ================== ANALYTICS ==================
const getWorkloadAnalytics = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({}).lean();

    if (!entries.length) {
      return res.json({ workloads: [], statistics: null });
    }

    const workloads = workloadEngine.calculateWorkload(entries);
    const statistics = workloadEngine.getStatistics(workloads);

    res.json({ workloads, statistics });
  } catch (error) {
    next(error);
  }
};

const getConflictAnalysis = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({}).lean();
    const conflicts = conflictEngine.detectConflicts(entries);

    // ✅ GROUP BY TEACHER
    const teacherMap = new Map();

    conflicts.forEach((c) => {
      const teacher = c.teacher || c.teacher1 || c.teacher2;
      if (!teacher) return;

      if (!teacherMap.has(teacher)) {
        teacherMap.set(teacher, {
          teacher,
          conflicts: [],
        });
      }

      teacherMap.get(teacher).conflicts.push({
        day: c.day,
        startTime: c.startTime1 || c.startTime,
        endTime: c.endTime1 || c.endTime,
        class1: c.class1,
        class2: c.class2,
        type: c.type,
      });
    });

    const groupedConflicts = Array.from(teacherMap.values());

    res.json({
      totalTeachers: groupedConflicts.length,
      conflicts: groupedConflicts,
    });
  } catch (error) {
    next(error);
  }
};

const getSuggestions = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({}).lean();

    if (!entries.length) {
      return res.json({ suggestions: [] });
    }

    const workloads = workloadEngine.calculateWorkload(entries);
    const conflicts = conflictEngine.detectConflicts(entries);

    const suggestions = suggestionEngine.generateSuggestions(
      workloads,
      conflicts
    );

    const actionPlan = suggestionEngine.generateActionPlan(suggestions);

    res.json({ suggestions, actionPlan });
  } catch (error) {
    next(error);
  }
};

// ================== QUALITY ==================
const getQualityReport = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({}).lean();

    if (!entries.length) {
      return res.json({
        totalEntries: 0,
        averageConfidence: 0,
        completenessScore: 0,
        duplicateEntries: 0,
        flaggedEntries: 0,
        qualityGrade: 'N/A',
        confidenceDistribution: {
          excellent: 0,
          good: 0,
          acceptable: 0,
          needsReview: 0,
        },
      });
    }

    const avg =
      entries.reduce((sum, e) => sum + (e.confidenceScore || 1), 0) /
      entries.length;

    const requiredFieldChecks = entries.flatMap((entry) => [
      Boolean(entry.teacherName?.trim()),
      Boolean(entry.subject?.trim()),
      Boolean(entry.className?.trim()),
      Boolean(entry.day?.trim()),
      Boolean(entry.startTime?.trim()),
      Boolean(entry.endTime?.trim()),
    ]);

    const completedRequiredFields = requiredFieldChecks.filter(Boolean).length;
    const completenessScore = requiredFieldChecks.length
      ? (completedRequiredFields / requiredFieldChecks.length) * 100
      : 0;

    const uniqueKeys = new Set();
    let duplicateEntries = 0;

    for (const entry of entries) {
      const uniqueKey = [
        entry.teacherName || '',
        entry.subject || '',
        entry.className || '',
        entry.day || '',
        entry.startTime || '',
        entry.endTime || '',
      ].join('|');

      if (uniqueKeys.has(uniqueKey)) {
        duplicateEntries += 1;
      } else {
        uniqueKeys.add(uniqueKey);
      }
    }

    const flaggedEntries = entries.filter(
      (entry) => (entry.confidenceScore || 1) < 0.7 || entry.flagged
    ).length;

    const qualityScore =
      avg * 0.6 +
      (completenessScore / 100) * 0.3 +
      Math.max(0, 1 - duplicateEntries / entries.length) * 0.1;

    let qualityGrade = 'D';
    if (qualityScore >= 0.9) qualityGrade = 'A';
    else if (qualityScore >= 0.8) qualityGrade = 'B';
    else if (qualityScore >= 0.7) qualityGrade = 'C';

    res.json({
      totalEntries: entries.length,
      averageConfidence: (avg * 100).toFixed(2),
      completenessScore: completenessScore.toFixed(2),
      duplicateEntries,
      flaggedEntries,
      qualityGrade,
      confidenceDistribution: {
        excellent: entries.filter((e) => e.confidenceScore >= 0.9).length,
        good: entries.filter((e) => e.confidenceScore >= 0.8 && e.confidenceScore < 0.9).length,
        acceptable: entries.filter((e) => e.confidenceScore >= 0.7 && e.confidenceScore < 0.8).length,
        needsReview: entries.filter((e) => e.confidenceScore < 0.7).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================== AUDIT TRAIL (FIXED EXPORT) ==================
const getBatchAuditTrail = async (req, res) => {
  res.json({
    batchId: req.params.batchId,
    trail: [],
    summary: {},
  });
};

// ================== EXPORT ==================
const exportData = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({}).lean();
    const format = (req.query.format || 'json').toLowerCase();
    const type = (req.query.type || 'workload').toLowerCase();

    if (!entries.length) {
      return res.status(400).json({ error: 'No data' });
    }

    if (type !== 'workload') {
      return res.status(400).json({ error: 'Unsupported export type' });
    }

    const workloads = workloadEngine.calculateWorkload(entries);

    const reportRows = workloads.map((workload) => {
      const statusLabel =
        workload.status === 'OVERLOADED'
          ? 'Overloaded'
          : workload.status === 'UNDERLOADED'
          ? 'Underloaded'
          : 'Balanced';

      return {
        Teacher: workload.displayName || workload.teacher,
        Dept: workload.department || 'General',
        Hours: workload.totalHours,
        Classes: workload.totalClasses,
        'Free Slots': workload.freeSlots,
        Status: workload.analysis?.reason
          ? `${statusLabel}\n${workload.analysis.reason}`
          : statusLabel,
      };
    });

    if (format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(reportRows);
      worksheet['!cols'] = [
        { wch: 24 },
        { wch: 18 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 60 },
      ];

      const csv = XLSX.utils.sheet_to_csv(worksheet);
      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.attachment('workload_analysis_report.csv');
      return res.send(csv);
    }

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      const analysisSheet = XLSX.utils.json_to_sheet(reportRows);
      analysisSheet['!cols'] = [
        { wch: 24 },
        { wch: 18 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 60 },
      ];
      XLSX.utils.book_append_sheet(workbook, analysisSheet, 'Analysis');

      const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="workload_analysis_report.xlsx"'
      );
      return res.send(buffer);
    }

    return res.json({
      generatedAt: new Date().toISOString(),
      statistics,
      workloads: reportRows,
    });
  } catch (error) {
    next(error);
  }
};

// ================== EXPORTS ==================
export {
  uploadTimetables,
  processTimetables,
  getWorkloadAnalytics,
  getConflictAnalysis,
  getSuggestions,
  getQualityReport,
  getBatchAuditTrail,
  exportData
};
