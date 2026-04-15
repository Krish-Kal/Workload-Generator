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

// Configure multer
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

export const uploadMiddleware = multer({ storage });

// Initialize engines
const parserEngine = new ParserEngine();
const workloadEngine = new WorkloadEngine();
const conflictEngine = new ConflictEngine();
const suggestionEngine = new SuggestionEngine();

/**
 * Upload and process timetable files
 * Accepts: CSV, XLSX, JSON, or raw text
 */
export const uploadTimetables = async (req, res, next) => {
  const startTime = Date.now();
  const batchId = uuidv4();

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    let totalRows = 0;
    let totalValid = 0;
    let totalInvalid = 0;

    // Process each uploaded file
    for (const file of req.files) {
      try {
        // Parse the file
        const parseResult = await parserEngine.parseFile(
          file.path,
          file.originalname
        );

        // Normalize headers
        const normalizedData = parserEngine.normalizeHeaders(
          parseResult.rawData
        );

        // Validate data
        const validation = parserEngine.validateAndClean(normalizedData);

        // Initialize normalization engine with existing data
        const existingTeachers = await Teacher.find().lean();
        const normalizationEngine = new NormalizationEngine({
          teachers: existingTeachers.map((t) => t.name),
        });

        // Normalize valid entries
        const normalizedEntries = validation.valid.map((entry) =>
          normalizationEngine.normalize(entry, {
            batchId,
            sourceFile: file.originalname,
            sourceFileHash: parseResult.sourceFileHash,
            parsingEngine: parseResult.parsingEngine,
          })
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
          errors: validation.invalid,
        });

        // Log parsing action
        await AuditTrailManager.logAction({
          action: 'PARSE',
          entityType: 'BATCH',
          batchId,
          sourceFile: file.originalname,
          sourceFileHash: parseResult.sourceFileHash,
          status: validation.invalidCount > 0 ? 'WARNING' : 'SUCCESS',
          inputMetrics: {
            rowsProcessed: parseResult.totalRows,
            rowsValid: validation.validCount,
            rowsInvalid: validation.invalidCount,
          },
          metadata: {
            parsingEngine: parseResult.parsingEngine,
          },
        });
      } catch (fileError) {
        await AuditTrailManager.logAction({
          action: 'PARSE',
          entityType: 'BATCH',
          batchId,
          sourceFile: file.originalname,
          status: 'ERROR',
          errorDetails: fileError.message,
        });

        results.push({
          file: file.originalname,
          error: fileError.message,
        });
      }

      // Clean up uploaded file
      fs.unlink(file.path, () => {});
    }

    const processingTime = Date.now() - startTime;

    // Log overall upload action
    await AuditTrailManager.logAction({
      action: 'FILE_UPLOAD',
      entityType: 'BATCH',
      batchId,
      inputMetrics: {
        rowsProcessed: totalRows,
        rowsValid: totalValid,
        rowsInvalid: totalInvalid,
      },
      processingTime,
      status: totalInvalid > 0 ? 'WARNING' : 'SUCCESS',
      metadata: {
        filesCount: req.files.length,
      },
    });

    res.json({
      batchId,
      success: true,
      processingTime,
      summary: {
        filesProcessed: req.files.length,
        totalRows,
        totalValid,
        totalInvalid,
      },
      results,
    });
  } catch (error) {
    await AuditTrailManager.logAction({
      action: 'FILE_UPLOAD',
      entityType: 'BATCH',
      batchId,
      status: 'ERROR',
      errorDetails: error.message,
    });

    next(error);
  }
};

/**
 * Process normalized timetable entries and store in database
 */
export const processTimetables = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { batchId, entries } = req.body;

    if (!entries || entries.length === 0) {
      return res.status(400).json({ error: 'No entries provided' });
    }

    // Filter flagged low-confidence entries
    const flaggedEntries = entries.filter((e) => e.confidenceScore < 0.7);
    const goodEntries = entries.filter((e) => e.confidenceScore >= 0.7);

    // Store entries
    const insertResult = await TimetableEntry.insertMany(goodEntries);

    // Extract unique teachers and update Teacher collection
    const uniqueTeachers = [...new Set(goodEntries.map((e) => e.teacherName))];
    for (const teacherName of uniqueTeachers) {
      const dept = goodEntries.find((e) => e.teacherName === teacherName)
        ?.department;
      await Teacher.findOneAndUpdate(
        { name: teacherName },
        {
          name: teacherName,
          department: dept || 'General',
        },
        { upsert: true }
      );
    }

    const processingTime = Date.now() - startTime;

    // Log processing action
    await AuditTrailManager.logAction({
      action: 'PROCESS',
      entityType: 'BATCH',
      batchId,
      inputMetrics: {
        rowsProcessed: entries.length,
        rowsValid: insertResult.length,
        rowsInvalid: flaggedEntries.length,
      },
      processingTime,
      status: flaggedEntries.length > 0 ? 'WARNING' : 'SUCCESS',
    });

    res.json({
      success: true,
      batchId,
      processingTime,
      stored: insertResult.length,
      flagged: flaggedEntries.length,
      flaggedEntries: flaggedEntries.slice(0, 10), // Preview first 10
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get comprehensive workload analytics
 */
export const getWorkloadAnalytics = async (req, res, next) => {
  try {
    const { department, searchTeacher } = req.query;

    let query = {};
    if (department) query.department = new RegExp(department, 'i');
    if (searchTeacher) query.teacherName = new RegExp(searchTeacher, 'i');

    const entries = await TimetableEntry.find(query).lean();

    if (entries.length === 0) {
      return res.json({
        workloads: [],
        statistics: null,
        distribution: [],
      });
    }

    // Calculate workloads
    const workloads = workloadEngine.calculateWorkload(entries);

    // Get statistics
    const statistics = workloadEngine.getStatistics(workloads);

    // Get department summary
    const departmentSummary = workloadEngine.getDepartmentSummary(workloads);

    // Get distribution
    const distribution = workloadEngine.getDistributionData(workloads);

    res.json({
      workloads,
      statistics,
      departmentSummary,
      distribution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get conflict analysis
 */
export const getConflictAnalysis = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({}).lean();

    const conflicts = conflictEngine.detectConflicts(entries);
    const conflictsByTeacher = conflictEngine.getConflictsByTeacher(conflicts);
    const summary = conflictEngine.getConflictSummary(conflicts);

    // Log conflict detection
    await AuditTrailManager.logAction({
      action: 'CONFLICT_DETECT',
      entityType: 'SYSTEM',
      metadata: {
        conflictCount: conflicts.length,
        affectedTeachers: summary.affectedTeachers,
      },
    });

    res.json({
      totalConflicts: conflicts.length,
      conflicts,
      conflictsByTeacher,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get optimization suggestions
 */
export const getSuggestions = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({}).lean();

    if (entries.length === 0) {
      return res.json({
        suggestions: [],
        actionPlan: null,
      });
    }

    const workloads = workloadEngine.calculateWorkload(entries);
    const conflicts = conflictEngine.detectConflicts(entries);
    const suggestions = suggestionEngine.generateSuggestions(
      workloads,
      conflicts
    );
    const actionPlan = suggestionEngine.generateActionPlan(suggestions);

    res.json({
      suggestions: suggestions.slice(0, 20),
      actionPlan,
      totalSuggestions: suggestions.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit trail for a batch
 */
export const getBatchAuditTrail = async (req, res, next) => {
  try {
    const { batchId } = req.params;

    const trail = await AuditTrailManager.getBatchAuditTrail(batchId);
    const summary = await AuditTrailManager.getBatchAuditSummary(batchId);
    const formatted = AuditTrailManager.formatChangeLog(trail);

    res.json({
      batchId,
      summary,
      trail: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get data quality report
 */
export const getQualityReport = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({}).lean();

    const totalEntries = entries.length;
    const flaggedEntries = entries.filter((e) => e.flagged).length;
    const avgConfidence =
      entries.reduce((sum, e) => sum + (e.confidenceScore || 1.0), 0) /
      totalEntries;

    const confidenceDistribution = {
      excellent: entries.filter((e) => e.confidenceScore >= 0.9).length,
      good: entries.filter(
        (e) => e.confidenceScore >= 0.8 && e.confidenceScore < 0.9
      ).length,
      acceptable: entries.filter(
        (e) => e.confidenceScore >= 0.7 && e.confidenceScore < 0.8
      ).length,
      needsReview: entries.filter((e) => e.confidenceScore < 0.7).length,
    };

    res.json({
      totalEntries,
      flaggedEntries,
      flaggedPercentage: ((flaggedEntries / totalEntries) * 100).toFixed(2),
      averageConfidence: (avgConfidence * 100).toFixed(2),
      confidenceDistribution,
      qualityGrade: avgConfidence >= 0.9 ? 'A' : avgConfidence >= 0.8 ? 'B' : avgConfidence >= 0.7 ? 'C' : 'D',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export timetable data
 */
export const exportData = async (req, res, next) => {
  try {
    const { format, type } = req.query;

    const entries = await TimetableEntry.find({}).lean();

    if (!entries.length) {
      return res.status(400).json({ error: 'No data to export' });
    }

    const workloads = workloadEngine.calculateWorkload(entries);

    if (type === 'workload') {
      if (format === 'json') {
        return res.json(workloads);
      } else if (format === 'csv') {
        const csv = _convertToCSV(workloads);
        res.header('Content-Type', 'text/csv');
        res.attachment('workload_report.csv');
        return res.send(csv);
      }
    } else if (type === 'timetable') {
      if (format === 'json') {
        return res.json(entries);
      } else if (format === 'csv') {
        const csv = _convertToCSV(entries);
        res.header('Content-Type', 'text/csv');
        res.attachment('timetable_report.csv');
        return res.send(csv);
      }
    }

    res.status(400).json({ error: 'Invalid export parameters' });
  } catch (error) {
    next(error);
  }
};

/**
 * Convert data to CSV
 */
function _convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csv = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((h) => {
      const value = row[h];
      if (typeof value === 'object') return JSON.stringify(value);
      if (typeof value === 'string' && value.includes(','))
        return `"${value}"`;
      return value || '';
    });
    csv.push(values.join(','));
  }

  return csv.join('\n');
}

