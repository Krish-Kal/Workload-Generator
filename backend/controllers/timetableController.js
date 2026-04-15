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

    res.json({ totalConflicts: conflicts.length, conflicts });
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

    res.json({ suggestions });
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

    res.json({
      totalEntries: entries.length,
      averageConfidence: (avg * 100).toFixed(2),
      qualityGrade:
        avg >= 0.9 ? 'A' : avg >= 0.8 ? 'B' : avg >= 0.7 ? 'C' : 'D',
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

    if (!entries.length) {
      return res.status(400).json({ error: 'No data' });
    }

    res.json(entries);
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