import similarity from 'string-similarity';
import Fuse from 'fuse.js';

/**
 * Fuzzy Matching Engine
 * Handles similarity matching for teacher names, subjects, and other entities
 * Supports multiple matching strategies
 */

class FuzzyMatcher {
  constructor(threshold = 0.7) {
    this.threshold = threshold;
  }

  /**
   * Match teacher names with fuzzy logic
   * Handles variations like "Dr. Rao", "Rao Sir", "Dr Rao"
   */
  matchTeacherName(input, candidates = []) {
    if (!input || !candidates.length) return null;

    const normalized = this._normalizeTeacherName(input);
    const normalizedCandidates = candidates.map((c) => ({
      original: c,
      normalized: this._normalizeTeacherName(c),
    }));

    // Exact match (case-insensitive)
    const exactMatch = normalizedCandidates.find(
      (c) => c.normalized === normalized
    );
    if (exactMatch) {
      return {
        match: exactMatch.original,
        confidence: 1.0,
        method: 'exact',
      };
    }

    // Similarity match
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of normalizedCandidates) {
      const score = similarity.compareTwoStrings(
        normalized,
        candidate.normalized
      );
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate.original;
      }
    }

    if (bestScore >= this.threshold) {
      return {
        match: bestMatch,
        confidence: bestScore,
        method: 'similarity',
      };
    }

    return null;
  }

  /**
   * Normalize teacher name
   * Removes titles, extra spaces, punctuation
   */
  _normalizeTeacherName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\b(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|sir|madam)\b/gi, '')
      .replace(/\bsir\b|\bma'am\b/gi, '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  /**
   * Match subjects with fuzzy logic
   * Handles variations like "DBMS", "Database Management", "Databases"
   */
  matchSubject(input, candidates = []) {
    if (!input || !candidates.length) return null;

    const normalized = this._normalizeSubject(input);
    const normalizedCandidates = candidates.map((c) => ({
      original: c,
      normalized: this._normalizeSubject(c),
    }));

    // Exact match
    const exactMatch = normalizedCandidates.find(
      (c) => c.normalized === normalized
    );
    if (exactMatch) {
      return {
        match: exactMatch.original,
        confidence: 1.0,
        method: 'exact',
      };
    }

    // Fuzzy match with Fuse.js for better results
    const fuseOptions = {
      includeScore: true,
      threshold: 1 - this.threshold,
      keys: ['normalized'],
    };
    const fuse = new Fuse(normalizedCandidates, fuseOptions);
    const results = fuse.search(normalized);

    if (results.length > 0) {
      const bestResult = results[0];
      const confidence = 1 - bestResult.score;
      if (confidence >= this.threshold) {
        return {
          match: bestResult.item.original,
          confidence,
          method: 'fuzzy',
        };
      }
    }

    return null;
  }

  /**
   * Normalize subject name
   */
  _normalizeSubject(subject) {
    if (!subject) return '';
    return subject
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Match time format variations
   * Handles: "9-10", "9:00-10:00", "09.00 to 10.00", "09-10am"
   */
  parseTime(timeStr) {
    if (!timeStr) return null;

    const cleaned = timeStr
      .trim()
      .toLowerCase()
      .replace(/[.:\s]+/g, ':')
      .replace(/to|-/, '--');

    // Match patterns like 9--10, 09--10, 09--10am, etc.
    const timePattern = /(\d{1,2}):?(\d{2})?--(\d{1,2}):?(\d{2})?(am|pm)?/i;
    const match = cleaned.match(timePattern);

    if (!match) return null;

    const [, startH, startM, endH, endM, period] = match;

    let hour1 = parseInt(startH);
    let hour2 = parseInt(endH);
    const min1 = startM ? parseInt(startM) : 0;
    const min2 = endM ? parseInt(endM) : 0;

    // Handle AM/PM
    if (period) {
      const isPM = period === 'pm';
      if (isPM && hour1 !== 12) hour1 += 12;
      if (isPM && hour2 !== 12) hour2 += 12;
      if (!isPM && hour1 === 12) hour1 = 0;
      if (!isPM && hour2 === 12) hour2 = 0;
    }

    const startTime = `${String(hour1).padStart(2, '0')}:${String(min1).padStart(2, '0')}`;
    const endTime = `${String(hour2).padStart(2, '0')}:${String(min2).padStart(2, '0')}`;
    const duration = this._calculateDuration(startTime, endTime);

    return {
      startTime,
      endTime,
      duration,
      confidence: 0.9,
    };
  }

  /**
   * Calculate duration between two times
   */
  _calculateDuration(startTime, endTime) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const durationMin = Math.max(0, endMin - startMin);
    return durationMin / 60; // hours
  }

  /**
   * Normalize day name
   * Handles: "Mon", "Monday", "MON", "mo"
   */
  normalizeDay(day) {
    if (!day) return null;
    const normalized = day.substring(0, 3).toLowerCase();
    const dayMap = {
      mon: 'Monday',
      tue: 'Tuesday',
      wed: 'Wednesday',
      thu: 'Thursday',
      fri: 'Friday',
      sat: 'Saturday',
      sun: 'Sunday',
    };
    return dayMap[normalized] || null;
  }

  /**
   * Batch match teachers against a list
   */
  matchTeacherBatch(teachers, candidateList) {
    return teachers.map((teacher) => ({
      original: teacher,
      match: this.matchTeacherName(teacher, candidateList),
    }));
  }

  /**
   * Batch normalize times
   */
  normalizeTimesBatch(times) {
    return times.map((time) => ({
      original: time,
      normalized: this.parseTime(time),
    }));
  }
}

export default FuzzyMatcher;
