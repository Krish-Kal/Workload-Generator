import FuzzyMatcher from './fuzzyMatchEngine.js';
import ConfidenceScorer from './confidenceScorerEngine.js';

/**
 * Normalization Engine
 * Converts raw parsed data into the canonical schema
 * Handles intelligent matching and standardization
 */

class NormalizationEngine {
  constructor(existingData = {}) {
    this.fuzzyMatcher = new FuzzyMatcher(0.75);
    this.confidenceScorer = new ConfidenceScorer();

    // Cache of known entities for matching
    this.knownTeachers = existingData.teachers || [];
    this.knownSubjects = existingData.subjects || [];
    this.knownClasses = existingData.classes || [];
  }

  /**
   * Main normalization method
   * Convert raw row to canonical schema with confidence scoring
   */
  normalize(rawEntry, metadata = {}) {
    if (!rawEntry) return null;

    try {
      // Extract and normalize fields
      const className = this._normalizeClassName(rawEntry.className);
      const teacher = this._normalizeTeacher(rawEntry.teacherName);
      const subject = this._normalizeSubject(rawEntry.subject);
      const day = this._normalizeDay(rawEntry.day);
      const timeData = this._normalizeTime(
        rawEntry.startTime,
        rawEntry.endTime,
        rawEntry.timeSlot
      );
      const room = this._normalizeRoom(rawEntry.room);

      // Calculate confidence scores
      const confidenceDetails = {
        teacherMatchScore: this._getTeacherMatchScore(
          rawEntry.teacherName,
          teacher
        ),
        subjectMatchScore: this._getSubjectMatchScore(
          rawEntry.subject,
          subject
        ),
        timeParseScore: timeData.confidence,
        classMatchScore: this._getClassMatchScore(rawEntry.className),
        dayMatchScore: this._getDayMatchScore(rawEntry.day, day),
      };

      const confidenceScore = this.confidenceScorer.scoreEntry(
        rawEntry,
        confidenceDetails
      );

      // Construct normalized entry
      return {
        // Canonical fields
        className,
        subject,
        teacherName: teacher.name,
        normalizedTeacherName: teacher.normalized,
        department: this._normalizeDepartment(rawEntry.department),
        day,
        startTime: timeData.startTime,
        endTime: timeData.endTime,
        durationHours: timeData.duration,
        room,

        // Confidence metrics
        confidenceScore: confidenceScore.overall,
        parsingConfidence: confidenceDetails,
        requiresReview: confidenceScore.requiresReview,
        reviewReason: confidenceScore.reviewReason,

        // Metadata
        sourceFile: metadata.sourceFile,
        sourceFileHash: metadata.sourceFileHash,
        uploadBatchId: metadata.batchId,
        parsingEngine: metadata.parsingEngine,
        rawInput: rawEntry,
      };
    } catch (error) {
      return {
        ...rawEntry,
        rawInput: rawEntry,
        flagged: true,
        flagReason: `Normalization error: ${error.message}`,
        confidenceScore: 0,
      };
    }
  }

  /**
   * Batch normalize entries
   */
  normalizeBatch(entries, metadata = {}) {
    return entries.map((entry) => this.normalize(entry, metadata));
  }

  /**
   * Normalize class name
   */
  _normalizeClassName(className) {
    if (!className) return 'UNKNOWN';
    return String(className)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .substring(0, 50);
  }

  /**
   * Normalize teacher name with fuzzy matching
   */
  _normalizeTeacher(teacherName) {
    if (!teacherName) return { name: 'UNKNOWN', normalized: 'unknown' };

    const cleaned = String(teacherName).trim();

    // Try fuzzy match against known teachers
    if (this.knownTeachers.length > 0) {
      const match = this.fuzzyMatcher.matchTeacherName(
        cleaned,
        this.knownTeachers
      );
      if (match && match.confidence > 0.8) {
        return {
          name: match.match,
          normalized: this.fuzzyMatcher._normalizeTeacherName(match.match),
          matchConfidence: match.confidence,
        };
      }
    }

    // Normalize and return as-is if no match found
    return {
      name: cleaned,
      normalized: this.fuzzyMatcher._normalizeTeacherName(cleaned),
    };
  }

  /**
   * Get teacher matching confidence
   */
  _getTeacherMatchScore(raw, normalized) {
    if (!raw) return 0.0;
    if (String(raw).trim().toLowerCase() === normalized.normalized) return 1.0;
    // Check if it's a fuzzy match
    const similarity = this.fuzzyMatcher._normalizeTeacherName(raw).localeCompare(
      normalized.normalized
    );
    return similarity === 0 ? 0.95 : 0.7;
  }

  /**
   * Normalize subject with fuzzy matching
   */
  _normalizeSubject(subject) {
    if (!subject) return 'UNKNOWN';

    const cleaned = String(subject).trim();

    // Try fuzzy match against known subjects
    if (this.knownSubjects.length > 0) {
      const match = this.fuzzyMatcher.matchSubject(cleaned, this.knownSubjects);
      if (match && match.confidence > 0.7) {
        return match.match;
      }
    }

    // Standardize: title case
    return cleaned
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .substring(0, 100);
  }

  /**
   * Get subject matching confidence
   */
  _getSubjectMatchScore(raw, normalized) {
    if (!raw) return 0.0;
    if (String(raw).toLowerCase() === normalized.toLowerCase()) return 1.0;
    return 0.85;
  }

  /**
   * Normalize day
   */
  _normalizeDay(day) {
    if (!day) return 'UNKNOWN';
    const normalized = this.fuzzyMatcher.normalizeDay(String(day).trim());
    return normalized || 'UNKNOWN';
  }

  /**
   * Get day matching confidence
   */
  _getDayMatchScore(raw, normalized) {
    if (!raw) return 0.0;
    if (normalized !== 'UNKNOWN') return 1.0;
    return 0.5; // Unknown day format
  }

  /**
   * Normalize time with intelligent parsing
   */
  _normalizeTime(startTime, endTime, timeSlot) {
    // If both start and end are provided, use them
    if (startTime && endTime) {
      const startParsed = this.fuzzyMatcher.parseTime(`${startTime}--${endTime}`);
      if (startParsed) {
        return {
          startTime: startParsed.startTime,
          endTime: startParsed.endTime,
          duration: startParsed.duration,
          confidence: 0.95,
        };
      }
    }

    // Try to parse timeslot (e.g., "9-10", "09:00-10:00")
    if (timeSlot) {
      const parsed = this.fuzzyMatcher.parseTime(timeSlot);
      if (parsed) {
        return {
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          duration: parsed.duration,
          confidence: 0.9,
        };
      }
    }

    // Fallback
    return {
      startTime: startTime || '00:00',
      endTime: endTime || '01:00',
      duration: 1,
      confidence: 0.3,
    };
  }

  /**
   * Normalize room/location
   */
  _normalizeRoom(room) {
    if (!room) return null;
    return String(room).trim().toUpperCase();
  }

  /**
   * Normalize department
   */
  _normalizeDepartment(dept) {
    if (!dept) return 'General';
    return String(dept)
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get class matching confidence
   */
  _getClassMatchScore(raw) {
    if (!raw) return 0.0;
    return 0.9; // Assume high confidence for class names
  }

  /**
   * Update known entities for better future matching
   */
  updateKnownEntities(teachers = [], subjects = [], classes = []) {
    this.knownTeachers = [...new Set([...this.knownTeachers, ...teachers])];
    this.knownSubjects = [...new Set([...this.knownSubjects, ...subjects])];
    this.knownClasses = [...new Set([...this.knownClasses, ...classes])];
  }

  /**
   * Generate normalization report
   */
  generateReport(normalizedEntries) {
    const total = normalizedEntries.length;
    const flagged = normalizedEntries.filter((e) => e.flagged || e.requiresReview).length;
    const avgConfidence =
      normalizedEntries.reduce((sum, e) => sum + (e.confidenceScore || 0), 0) / total;

    return {
      total,
      flagged,
      flaggedPercentage: ((flagged / total) * 100).toFixed(2),
      averageConfidence: (avgConfidence * 100).toFixed(2),
      uniqueTeachers: [
        ...new Set(normalizedEntries.map((e) => e.normalizedTeacherName)),
      ].length,
      uniqueSubjects: [
        ...new Set(normalizedEntries.map((e) => e.subject)),
      ].length,
      uniqueClasses: [
        ...new Set(normalizedEntries.map((e) => e.className)),
      ].length,
    };
  }
}

export default NormalizationEngine;
