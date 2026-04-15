import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  uploadMiddleware,
  uploadTimetables,
  processTimetables,
  getWorkloadAnalytics,
  getConflictAnalysis,
  getSuggestions,
  getBatchAuditTrail,
  getQualityReport,
  exportData,
} from '../controllers/timetableController.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * File Upload & Processing Routes
 */

// Upload multiple files (CSV, XLSX, JSON, or raw text)
router.post('/upload', uploadMiddleware.array('files', 20), uploadTimetables);

// Process normalized entries and store in database
router.post('/process', processTimetables);

/**
 * Analytics Routes
 */

// Get comprehensive workload analytics
router.get('/analytics/workload', getWorkloadAnalytics);

// Get conflict analysis
router.get('/analytics/conflicts', getConflictAnalysis);

// Get suggestions and action plan
router.get('/analytics/suggestions', getSuggestions);

// Get data quality report
router.get('/analytics/quality', getQualityReport);

// Get audit trail for a batch
router.get('/audit/:batchId', getBatchAuditTrail);

/**
 * Export Routes
 */

// Export data in various formats
router.get('/export', exportData);

export default router;

