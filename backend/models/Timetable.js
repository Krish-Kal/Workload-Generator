import mongoose from 'mongoose';

const timetableEntrySchema = new mongoose.Schema(
  {
    // Normalized canonical fields
    className: { type: String, required: true, trim: true, index: true },
    subject: { type: String, required: true, trim: true, index: true },
    teacherName: { type: String, required: true, trim: true, index: true },
    normalizedTeacherName: { type: String, trim: true, lowercase: true, index: true },
    department: { type: String, trim: true, default: 'General', index: true },
    day: { type: String, required: true, trim: true, index: true },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "10:00"
    durationHours: { type: Number, default: 1 },
    room: { type: String, trim: true, sparse: true },

    // Quality metrics
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 1.0,
    },
    parsingConfidence: {
      type: Object,
      default: {
        teacherMatch: 1.0,
        subjectMatch: 1.0,
        timeMatch: 1.0,
        classMatch: 1.0,
      },
    },

    // Source tracking (audit trail)
    sourceFile: {
      type: String,
      trim: true,
      index: true,
    },
    sourceFileHash: String,
    uploadBatchId: { type: String, index: true },
    parsingEngine: String, // e.g., "csv-parser", "xlsx-parser", "ai-parser"
    rawInput: {
      type: mongoose.Schema.Types.Mixed,
      sparse: true,
    },

    // Flags
    flagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flagReason: String,
    manuallyVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for conflict detection
timetableEntrySchema.index({
  normalizedTeacherName: 1,
  day: 1,
  startTime: 1,
});

// Index for batch queries
timetableEntrySchema.index({
  uploadBatchId: 1,
  createdAt: -1,
});

const TimetableEntry = mongoose.model('TimetableEntry', timetableEntrySchema);

export default TimetableEntry;

