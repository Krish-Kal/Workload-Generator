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

    // Workload balancing suggestions
    suggestions.push(...this._balancingsuggestions(workloads));

    // Conflict resolution suggestions
    suggestions.push(...this._conflictResolutionSuggestions(conflicts, workloads));

    // Optimization suggestions
    suggestions.push(...this._optimizationSuggestions(workloads));

    // Department-level suggestions
    suggestions.push(...this._departmentSuggestions(workloads));

    // Sort by priority
    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate workload balancing suggestions
   */
  _balancingsuggestions(workloads) {
    const suggestions = [];
    const overloaded = workloads.filter((w) => w.status === 'OVERLOADED');
    const underutilized = workloads.filter((w) => w.status === 'UNDERLOADED');

    if (overloaded.length === 0 || underutilized.length === 0) {
      return suggestions;
    }

    // Find subject matches between overloaded and underutilized teachers
    for (const over of overloaded) {
      for (const under of underutilized) {
        if (over.department !== under.department) continue; // Same dept only

        const commonSubjects = Object.keys(over.subjectBreakdown).filter(
          (subject) => subject in under.subjectBreakdown
        );

        if (commonSubjects.length === 0) continue;

        // Calculate transfer potential
        const hoursToTransfer = Math.min(
          over.totalHours - this.overloadThreshold,
          this.underloadThreshold - under.totalHours
        );

        const transferableSubjects = commonSubjects
          .map((subject) => ({
            subject,
            overloadedHours: over.subjectBreakdown[subject].hours,
            canTransfer: Math.min(
              over.subjectBreakdown[subject].hours,
              hoursToTransfer
            ),
          }))
          .filter((s) => s.canTransfer > 0);

        if (transferableSubjects.length > 0) {
          suggestions.push({
            id: `BALANCE_${over.teacher}_${under.teacher}`,
            type: 'WORKLOAD_DISTRIBUTION',
            priority: 9,
            action: 'TRANSFER_CLASSES',
            fromTeacher: over.displayName,
            fromTeacherNormalized: over.teacher,
            toTeacher: under.displayName,
            toTeacherNormalized: under.teacher,
            department: over.department,
            reason: `Redistribute workload: ${over.displayName} is overloaded (${over.totalHours}h) while ${under.displayName} is underutilized (${under.totalHours}h)`,
            subjects: transferableSubjects,
            impact: {
              fromTeacherAfter: over.totalHours - hoursToTransfer,
              toTeacherAfter: under.totalHours + hoursToTransfer,
              fromStatus: this._getStatus(
                over.totalHours - hoursToTransfer,
                this.overloadThreshold,
                this.underloadThreshold
              ),
              toStatus: this._getStatus(
                under.totalHours + hoursToTransfer,
                this.overloadThreshold,
                this.underloadThreshold
              ),
            },
            estimatedBenefit: 'Improves workload balance across department',
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Generate conflict resolution suggestions
   */
  _conflictResolutionSuggestions(conflicts, workloads) {
    const suggestions = [];

    const timeConflicts = conflicts.filter((c) => c.type === 'TIME');
    for (const conflict of timeConflicts) {
      const teacher = workloads.find((w) => w.teacher === conflict.teacher);
      if (!teacher) continue;

      // Find alternative slots for one of the classes
      const suggestion = {
        id: `RESOLVE_${conflict.teacher}_${conflict.day}_${conflict.startTime1}`,
        type: 'CONFLICT_RESOLUTION',
        priority: Math.max(8, 10 - conflict.overlapMinutes / 10), // Higher priority for longer overlaps
        action: 'RESCHEDULE_CLASS',
        teacher: conflict.displayName,
        teacherNormalized: conflict.teacher,
        day: conflict.day,
        conflict: {
          class1: conflict.class1,
          subject1: conflict.subject1,
          time1: `${conflict.startTime1}-${conflict.endTime1}`,
          class2: conflict.class2,
          subject2: conflict.subject2,
          time2: `${conflict.startTime2}-${conflict.endTime2}`,
          overlapMinutes: conflict.overlapMinutes,
        },
        suggestion: `Move one class to a free time slot on ${conflict.day}`,
        estimatedBenefit: 'Eliminates double-booking conflict',
      };

      suggestions.push(suggestion);
    }

    return suggestions;
  }

  /**
   * Generate optimization suggestions
   */
  _optimizationSuggestions(workloads) {
    const suggestions = [];

    // Suggest subject consolidation for overloaded teachers
    for (const teacher of workloads.filter((w) => w.status === 'OVERLOADED')) {
      const subjects = Object.entries(teacher.subjectBreakdown)
        .sort((a, b) => b[1].hours - a[1].hours)
        .slice(0, 5);

      const minorSubjects = subjects.filter((s) => s[1].hours < 5);

      if (minorSubjects.length > 0) {
        suggestions.push({
          id: `CONSOLIDATE_${teacher.teacher}`,
          type: 'WORKLOAD_OPTIMIZATION',
          priority: 7,
          action: 'CONSOLIDATE_SUBJECTS',
          teacher: teacher.displayName,
          teacherNormalized: teacher.teacher,
          reason: `${teacher.displayName} teaches multiple subjects with low hours each`,
          minorSubjects: minorSubjects.map((m) => ({
            subject: m[0],
            hours: m[1].hours,
          })),
          suggestion:
            'Consider consolidating low-hour subjects to reduce administrative overhead',
          estimatedBenefit: 'Reduces teaching load complexity',
        });
      }
    }

    // Suggest load balancing opportunities
    for (const teacher of workloads.filter((w) => w.status === 'UNDERLOADED')) {
      suggestions.push({
        id: `UTILIZE_${teacher.teacher}`,
        type: 'CAPACITY_UTILIZATION',
        priority: 6,
        action: 'ASSIGN_ADDITIONAL_LOAD',
        teacher: teacher.displayName,
        teacherNormalized: teacher.teacher,
        currentLoad: teacher.totalHours,
        capacity: teacher.maxHoursPerWeek - teacher.totalHours,
        reason: `${teacher.displayName} has available capacity`,
        suggestion: 'Assign additional classes to improve resource utilization',
        estimatedBenefit: `Can accommodate up to ${(
          teacher.maxHoursPerWeek - teacher.totalHours
        ).toFixed(1)} additional hours`,
      });
    }

    return suggestions;
  }

  /**
   * Generate department-level suggestions
   */
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

    // Analyze each department
    for (const [dept, teachers] of deptMap) {
      const avgHours =
        teachers.reduce((sum, t) => sum + t.totalHours, 0) / teachers.length;
      const variance = this._calculateVariance(
        teachers.map((t) => t.totalHours),
        avgHours
      );
      const stdDev = Math.sqrt(variance);

      if (stdDev > avgHours * 0.3) {
        // High variance
        suggestions.push({
          id: `DEPT_BALANCE_${dept}`,
          type: 'DEPARTMENT_STRATEGY',
          priority: 8,
          action: 'REBALANCE_DEPARTMENT',
          department: dept,
          reason: `High workload variance in ${dept} (stddev: ${stdDev.toFixed(1)}h)`,
          stats: {
            averageHours: avgHours.toFixed(1),
            standardDeviation: stdDev.toFixed(1),
            min: Math.min(...teachers.map((t) => t.totalHours)),
            max: Math.max(...teachers.map((t) => t.totalHours)),
            teacherCount: teachers.length,
          },
          suggestion:
            'Implement department-wide workload rebalancing initiative',
          estimatedBenefit: 'Improves fairness and staff satisfaction',
        });
      }
    }

    return suggestions;
  }

  /**
   * Get status based on hours
   */
  _getStatus(hours, overloadThreshold, underloadThreshold) {
    if (hours > overloadThreshold) return 'OVERLOADED';
    if (hours < underloadThreshold) return 'UNDERLOADED';
    return 'BALANCED';
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
