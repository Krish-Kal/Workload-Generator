/**
 * Confidence Scoring System
 * Calculates how confident we are in each parsed timetable entry
 * Scores each field: teacher, subject, time, class, day
 */

class ConfidenceScorer {
  /**
   * Score a single parsed entry
   * Returns an overall confidence score and individual field scores
   */
  scoreEntry(entry, options = {}) {
    const {
      teacherMatchScore = 1.0, // from fuzzy matcher
      subjectMatchScore = 1.0, // from fuzzy matcher
      timeParseScore = 1.0, // from time parser
      classMatchScore = 1.0, // validation score
      dayMatchScore = 1.0, // day validation
    } = options;

    // Individual field confidences (weighted)
    const fieldScores = {
      teacherMatch: this._scoreField(teacherMatchScore, 0.25), // 25% weight
      subjectMatch: this._scoreField(subjectMatchScore, 0.2), // 20% weight
      timeMatch: this._scoreField(timeParseScore, 0.3), // 30% weight (most critical)
      classMatch: this._scoreField(classMatchScore, 0.15), // 15% weight
      dayMatch: this._scoreField(dayMatchScore, 0.1), // 10% weight
    };

    // Calculate overall confidence
    const overallConfidence =
      fieldScores.teacherMatch +
      fieldScores.subjectMatch +
      fieldScores.timeMatch +
      fieldScores.classMatch +
      fieldScores.dayMatch;

    return {
      overall: Math.min(overallConfidence, 1.0),
      individual: {
        teacherMatch: teacherMatchScore,
        subjectMatch: subjectMatchScore,
        timeMatch: timeParseScore,
        classMatch: classMatchScore,
        dayMatch: dayMatchScore,
      },
      weighted: fieldScores,
      requiresReview: overallConfidence < 0.7,
      reviewReason: this._generateReviewReason(fieldScores, overallConfidence),
    };
  }

  /**
   * Score a batch of entries
   */
  scoreBatch(entries, options = {}) {
    return entries.map((entry, idx) => ({
      index: idx,
      entry,
      confidence: this.scoreEntry(entry, options),
    }));
  }

  /**
   * Calculate weighted score for a field
   */
  _scoreField(fieldScore, weight) {
    return fieldScore * weight;
  }

  /**
   * Generate human-readable reason for review
   */
  _generateReviewReason(fieldScores, overall) {
    if (overall >= 0.8) return null; // No review needed

    const issues = [];
    if (fieldScores.timeMatch < 0.2) issues.push('Time parsing uncertain');
    if (fieldScores.teacherMatch < 0.2) issues.push('Teacher name unclear');
    if (fieldScores.subjectMatch < 0.2) issues.push('Subject unclear');
    if (fieldScores.classMatch < 0.2) issues.push('Class name unclear');

    return issues.length > 0 ? issues.join('; ') : 'Multiple fields uncertain';
  }

  /**
   * Flag entries that are low confidence
   */
  flagLowConfidenceEntries(entries, threshold = 0.7) {
    return entries
      .map((entry) => ({
        ...entry,
        flagged: entry.confidenceScore < threshold,
        flagReason:
          entry.confidenceScore < threshold
            ? `Low confidence score: ${(entry.confidenceScore * 100).toFixed(1)}%`
            : null,
      }))
      .filter((e) => e.flagged);
  }

  /**
   * Quality report for a batch
   */
  generateQualityReport(entries) {
    const scores = entries.map((e) => e.confidenceScore || 1.0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const flagged = entries.filter((e) => (e.confidenceScore || 1.0) < 0.7).length;

    return {
      totalEntries: entries.length,
      averageConfidence: avg,
      flaggedCount: flagged,
      flaggedPercentage: ((flagged / entries.length) * 100).toFixed(2),
      qualityGrade: this._getGrade(avg),
      details: {
        excellent: scores.filter((s) => s >= 0.9).length,
        good: scores.filter((s) => s >= 0.8 && s < 0.9).length,
        acceptable: scores.filter((s) => s >= 0.7 && s < 0.8).length,
        needsReview: scores.filter((s) => s < 0.7).length,
      },
    };
  }

  /**
   * Quality grade based on average score
   */
  _getGrade(avgScore) {
    if (avgScore >= 0.95) return 'A (Excellent)';
    if (avgScore >= 0.85) return 'B (Good)';
    if (avgScore >= 0.75) return 'C (Acceptable)';
    if (avgScore >= 0.65) return 'D (Needs Review)';
    return 'F (Critical Issues)';
  }

  /**
   * Confidence adjustment based on patterns
   * Boost confidence if the entry matches known patterns
   */
  adjustConfidenceByPattern(entry, knownTeachers = [], knownSubjects = []) {
    let adjustment = 0;

    // If matches known teacher, boost by 0.1
    if (
      knownTeachers.some(
        (t) => t.toLowerCase() === (entry.teacherName || '').toLowerCase()
      )
    ) {
      adjustment += 0.1;
    }

    // If matches known subject, boost by 0.1
    if (
      knownSubjects.some(
        (s) => s.toLowerCase() === (entry.subject || '').toLowerCase()
      )
    ) {
      adjustment += 0.1;
    }

    // If has all fields, boost by 0.05
    if (entry.className && entry.day && entry.startTime && entry.endTime) {
      adjustment += 0.05;
    }

    return Math.min(1.0, (entry.confidenceScore || 0.5) + adjustment);
  }
}

export default ConfidenceScorer;
