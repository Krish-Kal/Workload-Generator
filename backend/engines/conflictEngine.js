/**
 * Conflict Detection Engine (Enterprise Edition)
 * Detects scheduling conflicts with confidence scoring and detailed analysis
 */

class ConflictEngine {
  /**
   * Detect all conflicts in timetable entries
   */
  detectConflicts(entries) {
    const conflicts = [];

    // Detect time-based conflicts
    conflicts.push(...this._detectTimeConflicts(entries));

    // Detect cross-department conflicts
    conflicts.push(...this._detectCrossDepartmentConflicts(entries));

    // Detect resource conflicts (same room at same time)
    conflicts.push(...this._detectResourceConflicts(entries));

    return this._deduplicateConflicts(conflicts);
  }

  /**
   * Detect single-teacher time conflicts
   * Same teacher assigned in overlapping time slots
   */
  _detectTimeConflicts(entries) {
    const teacherMap = new Map();
    const conflicts = [];

    // Group entries by normalized teacher name and day
    for (const entry of entries) {
      const teacher = entry.normalizedTeacherName || entry.teacherName;
      const day = entry.day;
      const key = `${teacher}|${day}`;

      if (!teacherMap.has(key)) {
        teacherMap.set(key, []);
      }
      teacherMap.get(key).push(entry);
    }

    // Check for overlaps within each teacher-day group
    for (const [key, dayEntries] of teacherMap) {
      if (dayEntries.length <= 1) continue;

      const [teacher, day] = key.split('|');

      // Sort by start time
      dayEntries.sort(
        (a, b) =>
          this._timeToMinutes(a.startTime) - this._timeToMinutes(b.startTime)
      );

      // Check all pairs for overlap
      for (let i = 0; i < dayEntries.length; i++) {
        for (let j = i + 1; j < dayEntries.length; j++) {
          const entry1 = dayEntries[i];
          const entry2 = dayEntries[j];

          if (this._timesOverlap(entry1, entry2)) {
            const severity = this._determineConflictSeverity(entry1, entry2);
            conflicts.push({
              type: 'TIME',
              severity,
              teacher,
              displayName: entry1.teacherName,
              day,
              startTime1: entry1.startTime,
              endTime1: entry1.endTime,
              class1: entry1.className,
              subject1: entry1.subject,
              startTime2: entry2.startTime,
              endTime2: entry2.endTime,
              class2: entry2.className,
              subject2: entry2.subject,
              overlapMinutes: this._calculateOverlapMinutes(entry1, entry2),
              confidence: Math.min(
                entry1.confidenceScore || 1.0,
                entry2.confidenceScore || 1.0
              ),
              entries: [entry1, entry2],
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect resource conflicts
   * Same room assigned at overlapping times
   */
  _detectResourceConflicts(entries) {
    const roomMap = new Map();
    const conflicts = [];

    // Group entries by room and day
    const entriesWithRoom = entries.filter((e) => e.room);
    for (const entry of entriesWithRoom) {
      const key = `${entry.room}|${entry.day}`;
      if (!roomMap.has(key)) {
        roomMap.set(key, []);
      }
      roomMap.get(key).push(entry);
    }

    // Check for overlaps
    for (const [key, roomEntries] of roomMap) {
      if (roomEntries.length <= 1) continue;

      const [room, day] = key.split('|');

      for (let i = 0; i < roomEntries.length; i++) {
        for (let j = i + 1; j < roomEntries.length; j++) {
          const entry1 = roomEntries[i];
          const entry2 = roomEntries[j];

          if (this._timesOverlap(entry1, entry2)) {
            conflicts.push({
              type: 'RESOURCE',
              severity: 'CRITICAL',
              resource: 'ROOM',
              room,
              day,
              teacher1: entry1.teacherName,
              class1: entry1.className,
              startTime1: entry1.startTime,
              endTime1: entry1.endTime,
              teacher2: entry2.teacherName,
              class2: entry2.className,
              startTime2: entry2.startTime,
              endTime2: entry2.endTime,
              overlapMinutes: this._calculateOverlapMinutes(entry1, entry2),
              entries: [entry1, entry2],
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect cross-department conflicts
   * Same subject taught by different departments at overlapping times
   */
  _detectCrossDepartmentConflicts(entries) {
    const subjectMap = new Map();
    const conflicts = [];

    // Group by subject and day
    for (const entry of entries) {
      const key = `${entry.subject}|${entry.day}`;
      if (!subjectMap.has(key)) {
        subjectMap.set(key, []);
      }
      subjectMap.get(key).push(entry);
    }

    // Check for multi-department overlaps
    for (const [key, subjectEntries] of subjectMap) {
      if (subjectEntries.length <= 1) continue;

      const [subject, day] = key.split('|');
      const departments = new Set(subjectEntries.map((e) => e.department));

      if (departments.size <= 1) continue; // Skip same department

      for (let i = 0; i < subjectEntries.length; i++) {
        for (let j = i + 1; j < subjectEntries.length; j++) {
          const entry1 = subjectEntries[i];
          const entry2 = subjectEntries[j];

          if (
            entry1.department !== entry2.department &&
            this._timesOverlap(entry1, entry2)
          ) {
            conflicts.push({
              type: 'CROSS_DEPARTMENT',
              severity: 'WARNING',
              subject,
              day,
              department1: entry1.department,
              teacher1: entry1.teacherName,
              class1: entry1.className,
              department2: entry2.department,
              teacher2: entry2.teacherName,
              class2: entry2.className,
              startTime1: entry1.startTime,
              endTime1: entry1.endTime,
              startTime2: entry2.startTime,
              endTime2: entry2.endTime,
              entries: [entry1, entry2],
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two time slots overlap
   */
  _timesOverlap(entry1, entry2) {
    const start1 = this._timeToMinutes(entry1.startTime);
    const end1 = this._timeToMinutes(entry1.endTime);
    const start2 = this._timeToMinutes(entry2.startTime);
    const end2 = this._timeToMinutes(entry2.endTime);

    return start1 < end2 && start2 < end1;
  }

  /**
   * Convert time string to minutes for comparison
   */
  _timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  /**
   * Calculate overlap duration in minutes
   */
  _calculateOverlapMinutes(entry1, entry2) {
    const start1 = this._timeToMinutes(entry1.startTime);
    const end1 = this._timeToMinutes(entry1.endTime);
    const start2 = this._timeToMinutes(entry2.startTime);
    const end2 = this._timeToMinutes(entry2.endTime);

    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    return Math.max(0, overlapEnd - overlapStart);
  }

  /**
   * Determine conflict severity
   */
  _determineConflictSeverity(entry1, entry2) {
    const overlap = this._calculateOverlapMinutes(entry1, entry2);

    if (overlap >= 45) {
      return 'CRITICAL';
    } else if (overlap >= 30) {
      return 'SEVERE';
    } else if (overlap >= 15) {
      return 'HIGH';
    }
    return 'MEDIUM';
  }

  /**
   * Deduplicate conflicts
   */
  _deduplicateConflicts(conflicts) {
    const seen = new Set();
    const unique = [];

    for (const conflict of conflicts) {
      const key = this._getConflictKey(conflict);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(conflict);
      }
    }

    return unique;
  }

  /**
   * Generate unique key for conflict
   */
  _getConflictKey(conflict) {
    if (conflict.type === 'TIME') {
      return `TIME|${conflict.teacher}|${conflict.day}|${conflict.class1}|${conflict.class2}`;
    } else if (conflict.type === 'RESOURCE') {
      return `RESOURCE|${conflict.room}|${conflict.day}|${conflict.class1}|${conflict.class2}`;
    }
    return `${conflict.type}|${conflict.subject}|${conflict.day}|${conflict.class1}|${conflict.class2}`;
  }

  /**
   * Get conflicts by teacher
   */
  getConflictsByTeacher(conflicts) {
    const teacherMap = new Map();

    for (const conflict of conflicts) {
      if (conflict.type === 'TIME') {
        if (!teacherMap.has(conflict.teacher)) {
          teacherMap.set(conflict.teacher, []);
        }
        teacherMap.get(conflict.teacher).push(conflict);
      }
    }

    const result = [];
    for (const [teacher, teacherConflicts] of teacherMap) {
      result.push({
        teacher,
        conflictCount: teacherConflicts.length,
        conflicts: teacherConflicts,
      });
    }

    return result.sort((a, b) => b.conflictCount - a.conflictCount);
  }

  /**
   * Get conflict summary statistics
   */
  getConflictSummary(conflicts) {
    const summary = {
      totalConflicts: conflicts.length,
      byType: {},
      bySeverity: {},
      affectedTeachers: new Set(),
      affectedRooms: new Set(),
      affectedClasses: new Set(),
    };

    for (const conflict of conflicts) {
      // Count by type
      summary.byType[conflict.type] = (summary.byType[conflict.type] || 0) + 1;

      // Count by severity
      if (conflict.severity) {
        summary.bySeverity[conflict.severity] =
          (summary.bySeverity[conflict.severity] || 0) + 1;
      }

      // Track affected entities
      if (conflict.teacher) summary.affectedTeachers.add(conflict.teacher);
      if (conflict.teacher1) summary.affectedTeachers.add(conflict.teacher1);
      if (conflict.teacher2) summary.affectedTeachers.add(conflict.teacher2);

      if (conflict.room) summary.affectedRooms.add(conflict.room);

      if (conflict.class1) summary.affectedClasses.add(conflict.class1);
      if (conflict.class2) summary.affectedClasses.add(conflict.class2);
    }

    return {
      ...summary,
      affectedTeachers: summary.affectedTeachers.size,
      affectedRooms: summary.affectedRooms.size,
      affectedClasses: summary.affectedClasses.size,
    };
  }
}

export default ConflictEngine;
