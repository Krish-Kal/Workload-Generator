import mongoose from 'mongoose';

/**
 * Audit Trail System
 * Tracks all data transformations and system decisions
 */

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'FILE_UPLOAD',
        'PARSE',
        'NORMALIZE',
        'SCORE',
        'VALIDATE',
        'PROCESS',
        'CONFLICT_DETECT',
        'EXPORT',
        'MODIFY',
        'DELETE',
      ],
    },
    entityType: {
      type: String,
      enum: ['TIMETABLE_ENTRY', 'TEACHER', 'BATCH', 'SYSTEM'],
    },
    entityId: mongoose.Schema.Types.ObjectId,
    batchId: { type: String, index: true },
    sourceFile: String,
    sourceFileHash: String,

    // Data changes
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },

    // Processing metrics
    processingTime: Number, // milliseconds
    inputMetrics: {
      rowsProcessed: Number,
      rowsValid: Number,
      rowsInvalid: Number,
    },

    // Status
    status: {
      type: String,
      enum: ['SUCCESS', 'WARNING', 'ERROR'],
      default: 'SUCCESS',
    },
    message: String,
    errorDetails: String,

    // User/System info
    userId: mongoose.Schema.Types.ObjectId,
    systemVersion: String,

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Indexes for efficient querying
auditLogSchema.index({ batchId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

/**
 * Audit Trail Manager
 */
class AuditTrailManager {
  /**
   * Log an action
   */
  static async logAction(actionData) {
    try {
      const log = new AuditLog({
        action: actionData.action,
        entityType: actionData.entityType,
        entityId: actionData.entityId,
        batchId: actionData.batchId,
        sourceFile: actionData.sourceFile,
        sourceFileHash: actionData.sourceFileHash,
        changes: actionData.changes,
        processingTime: actionData.processingTime,
        inputMetrics: actionData.inputMetrics,
        status: actionData.status || 'SUCCESS',
        message: actionData.message,
        errorDetails: actionData.errorDetails,
        userId: actionData.userId,
        systemVersion: actionData.systemVersion,
        metadata: actionData.metadata,
      });

      return await log.save();
    } catch (error) {
      console.error('Error logging audit action:', error);
      throw error;
    }
  }

  /**
   * Get audit trail for a batch
   */
  static async getBatchAuditTrail(batchId) {
    return await AuditLog.find({ batchId }).sort({ createdAt: 1 });
  }

  /**
   * Get audit trail for an entity
   */
  static async getEntityAuditTrail(entityId) {
    return await AuditLog.find({ entityId }).sort({ createdAt: 1 });
  }

  /**
   * Get audit summary for batch
   */
  static async getBatchAuditSummary(batchId) {
    const logs = await AuditLog.find({ batchId }).lean();

    return {
      batchId,
      totalActions: logs.length,
      actions: logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}),
      statuses: logs.reduce((acc, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        return acc;
      }, {}),
      timeline: logs.map((log) => ({
        action: log.action,
        status: log.status,
        timestamp: log.createdAt,
        processingTime: log.processingTime,
      })),
      metrics: {
        totalRowsProcessed: logs.reduce(
          (sum, log) => sum + (log.inputMetrics?.rowsProcessed || 0),
          0
        ),
        totalRowsValid: logs.reduce(
          (sum, log) => sum + (log.inputMetrics?.rowsValid || 0),
          0
        ),
        totalRowsInvalid: logs.reduce(
          (sum, log) => sum + (log.inputMetrics?.rowsInvalid || 0),
          0
        ),
      },
    };
  }

  /**
   * Generate change log for display
   */
  static formatChangeLog(logs) {
    return logs.map((log) => ({
      timestamp: log.createdAt,
      action: log.action,
      description: this._getActionDescription(log),
      status: log.status,
      details: {
        processingTime: log.processingTime,
        message: log.message,
        inputMetrics: log.inputMetrics,
      },
    }));
  }

  /**
   * Get readable action description
   */
  static _getActionDescription(log) {
    const descriptions = {
      FILE_UPLOAD: `Uploaded ${log.sourceFile}`,
      PARSE: `Parsed ${log.inputMetrics?.rowsProcessed || 0} rows`,
      NORMALIZE: `Normalized ${log.inputMetrics?.rowsValid || 0} valid entries`,
      SCORE: `Scored entries (avg confidence: ${log.metadata?.avgConfidence || 'N/A'})`,
      VALIDATE: `Validated ${log.inputMetrics?.rowsProcessed || 0} entries`,
      PROCESS: `Processed and stored ${log.inputMetrics?.rowsValid || 0} entries`,
      CONFLICT_DETECT: `Detected ${log.metadata?.conflictCount || 0} conflicts`,
      EXPORT: `Exported data to ${log.metadata?.format || 'unknown'} format`,
      MODIFY: `Modified ${log.metadata?.modifiedCount || 0} entries`,
      DELETE: `Deleted ${log.metadata?.deletedCount || 0} entries`,
    };

    return descriptions[log.action] || log.message || 'Unknown action';
  }
}

export { AuditLog, AuditTrailManager };
