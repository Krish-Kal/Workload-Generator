/**
 * Suggestion Engine (Enterprise Edition)
 * Generates intelligent workload balancing and optimization suggestions
 */

class SuggestionEngine {
  constructor(options = {}) {
    this.overloadThreshold = options.overloadThreshold || 20;
    this.underloadThreshold = options.underloadThreshold || 10;
  }

  /**
   * Generate comprehensive suggestions
   */
  generateSuggestions(workloads, conflicts = []) {
    const suggestions = [];

    suggestions.push(...this._balancingSuggestions(workloads));
    suggestions.push(...this._conflictResolutionSuggestions(conflicts, workloads));
    suggestions.push(...this._capacitySuggestions(workloads));
    suggestions.push(...this._departmentSuggestions(workloads));

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  _balancingSuggestions(workloads) {
    const suggestions = [];
    const overloaded = workloads.filter((w) => w.status === 'OVERLOADED');
    const underloaded = workloads.filter((w) => w.status === 'UNDERLOADED');

    if (overloaded.length === 0 || underloaded.length === 0) {
      return suggestions;
    }

    for (const over of overloaded) {
      for (const under of underloaded) {
        if (over.department !== under.department) continue;

        const commonSubjects = Object.keys(over.subjectBreakdown).filter(
          (subject) => subject in under.subjectBreakdown
        );

        if (commonSubjects.length === 0) continue;

        const hoursToTransfer = Math.min(
          Math.max(1, over.totalHours - (over.analysis?.upperBound ?? over.totalHours)),
          Math.max(1, (under.analysis?.lowerBound ?? under.totalHours) - under.totalHours)
        );

        if (hoursToTransfer <= 0) continue;

        const rankedSubjects = commonSubjects
          .map((subject) => ({
            subject,
            hours: over.subjectBreakdown[subject].hours,
          }))
          .sort((left, right) => right.hours - left.hours);

        suggestions.push({
          id: `BALANCE_${over.teacher}_${under.teacher}`,
          type: 'WORKLOAD_DISTRIBUTION',
          priority: 9,
          action: 'TRANSFER_CLASSES',
          title: `Rebalance ${over.displayName} and ${under.displayName}`,
          teacher: over.displayName,
          targetTeacher: under.displayName,
          department: over.department,
          reason: `${over.displayName} is above the balanced range at ${over.totalHours}h, while ${under.displayName} is below it at ${under.totalHours}h.`,
          suggestion: `Move about ${hoursToTransfer} hour${hoursToTransfer > 1 ? 's' : ''} of ${rankedSubjects
            .slice(0, 2)
            .map((item) => item.subject)
            .join(', ')} classes within ${over.department}.`,
          impact: {
            fromTeacherAfter: over.totalHours - hoursToTransfer,
            toTeacherAfter: under.totalHours + hoursToTransfer,
          },
          estimatedBenefit: 'Brings both teachers closer to the balanced workload band.',
        });
      }
    }

    return suggestions;
  }

  _conflictResolutionSuggestions(conflicts, workloads) {
    const suggestions = [];

    const timeConflicts = conflicts.filter((c) => c.type === 'TIME');
    for (const conflict of timeConflicts) {
      const teacher = workloads.find((w) => w.teacher === conflict.teacher);
      if (!teacher) continue;

      suggestions.push({
        id: `RESOLVE_${conflict.teacher}_${conflict.day}_${conflict.startTime1}`,
        type: 'CONFLICT_RESOLUTION',
        priority: Math.max(8, 10 - conflict.overlapMinutes / 10), // Higher priority for longer overlaps
        action: 'RESCHEDULE_CLASS',
        title: `Resolve clash for ${teacher.displayName}`,
        teacher: conflict.displayName,
        teacherNormalized: conflict.teacher,
        day: conflict.day,
        reason: `${teacher.displayName} is scheduled for ${conflict.class1} and ${conflict.class2} at overlapping times on ${conflict.day}.`,
        suggestion: `Shift one class away from ${conflict.startTime1 || conflict.startTime}-${conflict.endTime1 || conflict.endTime} on ${conflict.day}.`,
        estimatedBenefit: 'Removes double-booking and avoids timetable errors.',
      });
    }

    return suggestions;
  }

  _capacitySuggestions(workloads) {
    const suggestions = [];

    for (const teacher of workloads.filter((w) => w.status === 'UNDERLOADED')) {
      suggestions.push({
        id: `UTILIZE_${teacher.teacher}`,
        type: 'CAPACITY_UTILIZATION',
        priority: 6,
        action: 'ASSIGN_ADDITIONAL_LOAD',
        title: `Use spare capacity for ${teacher.displayName}`,
        teacher: teacher.displayName,
        reason: `${teacher.displayName} is below the balanced range with ${teacher.totalHours}h and still has ${teacher.freeSlots} free slots.`,
        suggestion: `Consider assigning 1-2 more periods in subjects already handled by ${teacher.displayName}.`,
        estimatedBenefit: `This would move the teacher closer to the ${teacher.analysis?.lowerBound}-${teacher.analysis?.upperBound}h balanced range.`,
      });
    }

    return suggestions;
  }

  _departmentSuggestions(workloads) {
    const suggestions = [];
    const deptMap = new Map();

    // Group by department
    for (const workload of workloads) {
      if (!deptMap.has(workload.department)) {
        deptMap.set(workload.department, []);
      }
      deptMap.get(workload.department).push(workload);
    }

    for (const [dept, teachers] of deptMap) {
      const avgHours =
        teachers.reduce((sum, t) => sum + t.totalHours, 0) / teachers.length;
      const variance = this._calculateVariance(
        teachers.map((t) => t.totalHours),
        avgHours
      );
      const stdDev = Math.sqrt(variance);

      if (teachers.length >= 3 && stdDev > Math.max(1.5, avgHours * 0.2)) {
        suggestions.push({
          id: `DEPT_BALANCE_${dept}`,
          type: 'DEPARTMENT_STRATEGY',
          priority: 8,
          action: 'REBALANCE_DEPARTMENT',
          title: `Review ${dept} workload spread`,
          department: dept,
          reason: `${dept} has a wide spread of weekly teaching hours across staff.`,
          stats: {
            averageHours: avgHours.toFixed(1),
            standardDeviation: stdDev.toFixed(1),
            min: Math.min(...teachers.map((t) => t.totalHours)),
            max: Math.max(...teachers.map((t) => t.totalHours)),
            teacherCount: teachers.length,
          },
          suggestion: `Review subject allocation in ${dept}; workloads range from ${Math.min(...teachers.map((t) => t.totalHours))}h to ${Math.max(...teachers.map((t) => t.totalHours))}h.`,
          estimatedBenefit: 'Improves fairness and reduces imbalance across the department.',
        });
      }
    }

    return suggestions;
  }

  /**
   * Calculate variance
   */
  _calculateVariance(values, mean) {
    const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Generate action plan from suggestions
   */
  generateActionPlan(suggestions, priorityThreshold = 7) {
    const highPrioritySuggestions = suggestions.filter(
      (s) => s.priority >= priorityThreshold
    );

    return {
      totalSuggestions: suggestions.length,
      prioritySuggestions: highPrioritySuggestions.length,
      suggestions: highPrioritySuggestions,
      estimatedImplementationDays:
        Math.ceil(highPrioritySuggestions.length / 3) * 7,
      summary: this._generateSummary(highPrioritySuggestions),
    };
  }

  /**
   * Generate text summary
   */
  _generateSummary(suggestions) {
    const types = new Map();
    for (const sug of suggestions) {
      types.set(sug.type, (types.get(sug.type) || 0) + 1);
    }

    const items = Array.from(types)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    return `${suggestions.length} high-priority suggestions: ${items}`;
  }
}

export default SuggestionEngine;
