/**
 * Workload Calculation Engine (Enterprise Edition)
 * Computes detailed workload analytics per teacher
 * Includes daily/weekly breakdowns and advanced metrics
 */

class WorkloadEngine {
  constructor(options = {}) {
    this.workdaysPerWeek = options.workdaysPerWeek || 5;
    this.hoursPerDay = options.hoursPerDay || 8;
    this.overloadThreshold = options.overloadThreshold || 20; // hours/week
    this.underloadThreshold = options.underloadThreshold || 10; // hours/week
  }

  /**
   * Calculate comprehensive workload for all teachers
   */
  calculateWorkload(entries) {
    const workloadMap = new Map();

    for (const entry of entries) {
      const teacher = entry.normalizedTeacherName || entry.teacherName;
      if (!workloadMap.has(teacher)) {
        workloadMap.set(teacher, this._initializeTeacherWorkload(teacher, entry));
      }

      const w = workloadMap.get(teacher);
      this._addEntryToWorkload(w, entry);
    }

    // Calculate additional metrics and status
    const workloads = Array.from(workloadMap.values()).map((w) =>
      this._calculateMetrics(w)
    );

    return workloads.sort((a, b) => b.totalHours - a.totalHours);
  }

  /**
   * Initialize teacher workload object
   */
  _initializeTeacherWorkload(teacher, entry) {
    return {
      teacher,
      displayName: entry.teacherName,
      department: entry.department || 'General',
      totalHours: 0,
      totalClasses: 0,
      totalSlots: 0,
      dailyLoad: {},
      weeklyLoad: {},
      subjectBreakdown: {},
      classBreakdown: {},
      roomBreakdown: {},
      confidenceScores: [],
      entries: [],
    };
  }

  /**
   * Add an entry to a teacher's workload
   */
  _addEntryToWorkload(workload, entry) {
    const hours = entry.durationHours || 1;
    const day = entry.day || 'UNKNOWN';

    // Total aggregates
    workload.totalHours += hours;
    workload.totalClasses += 1;
    workload.totalSlots += 1;
    workload.confidenceScores.push(entry.confidenceScore || 1.0);

    // Daily breakdown
    if (!workload.dailyLoad[day]) {
      workload.dailyLoad[day] = {
        slots: 0,
        hours: 0,
        classes: [],
      };
    }
    workload.dailyLoad[day].slots += 1;
    workload.dailyLoad[day].hours += hours;
    workload.dailyLoad[day].classes.push(entry.className);

    // Weekly load (sum by day first then aggregate weeks)
    if (!workload.weeklyLoad[day]) {
      workload.weeklyLoad[day] = {
        slots: 0,
        hours: 0,
      };
    }
    workload.weeklyLoad[day].slots += 1;
    workload.weeklyLoad[day].hours += hours;

    // Subject breakdown
    const subject = entry.subject || 'General';
    if (!workload.subjectBreakdown[subject]) {
      workload.subjectBreakdown[subject] = {
        hours: 0,
        classes: 0,
        days: new Set(),
      };
    }
    workload.subjectBreakdown[subject].hours += hours;
    workload.subjectBreakdown[subject].classes += 1;
    if (entry.day) {
      workload.subjectBreakdown[subject].days.add(entry.day);
    }

    // Class breakdown
    const className = entry.className || 'UNKNOWN';
    if (!workload.classBreakdown[className]) {
      workload.classBreakdown[className] = {
        hours: 0,
        slots: 0,
      };
    }
    workload.classBreakdown[className].hours += hours;
    workload.classBreakdown[className].slots += 1;

    // Room breakdown
    if (entry.room) {
      if (!workload.roomBreakdown[entry.room]) {
        workload.roomBreakdown[entry.room] = {
          hours: 0,
          classes: 0,
        };
      }
      workload.roomBreakdown[entry.room].hours += hours;
      workload.roomBreakdown[entry.room].classes += 1;
    }

    workload.entries.push(entry);
  }

  /**
   * Calculate final metrics and status
   */
  _calculateMetrics(workload) {
    const maxHoursPerWeek = this.workdaysPerWeek * this.hoursPerDay;
    const avgHoursPerDay =
      workload.totalHours / Object.keys(workload.weeklyLoad).length || 0;
    const avgConfidence =
      workload.confidenceScores.length > 0
        ? workload.confidenceScores.reduce((a, b) => a + b) /
          workload.confidenceScores.length
        : 1.0;

    // Determine status
    let status = 'BALANCED';
    if (workload.totalHours > this.overloadThreshold) {
      status = 'OVERLOADED';
    } else if (workload.totalHours < this.underloadThreshold) {
      status = 'UNDERLOADED';
    }

    // Calculate utilization
    const utilization = Math.min(
      100,
      (workload.totalHours / maxHoursPerWeek) * 100
    );

    // Convert Sets to Arrays for serialization
    const subjectBreakdown = {};
    for (const [subject, data] of Object.entries(workload.subjectBreakdown)) {
      subjectBreakdown[subject] = {
        hours: data.hours,
        classes: data.classes,
        daysSpan: data.days.size,
      };
    }

    return {
      teacher: workload.teacher,
      displayName: workload.displayName,
      department: workload.department,
      totalHours: Number(workload.totalHours.toFixed(2)),
      totalClasses: workload.totalClasses,
      totalSlots: workload.totalSlots,
      averageHoursPerDay: Number(avgHoursPerDay.toFixed(2)),
      averageConfidence: Number((avgConfidence * 100).toFixed(2)),
      status,
      utilization: Number(utilization.toFixed(2)),
      freeSlots: Math.max(0, maxHoursPerWeek - workload.totalHours),
      dailyLoad: workload.dailyLoad,
      weeklyLoad: workload.weeklyLoad,
      subjectBreakdown,
      classBreakdown: workload.classBreakdown,
      roomBreakdown: workload.roomBreakdown,
      maxHoursPerWeek,
      flagged: avgConfidence < 0.7,
      topSubjects: Object.entries(subjectBreakdown)
        .sort((a, b) => b[1].hours - a[1].hours)
        .slice(0, 3)
        .map(([subject, data]) => ({ subject, hours: data.hours })),
      topClasses: Object.entries(workload.classBreakdown)
        .sort((a, b) => b[1].hours - a[1].hours)
        .slice(0, 3)
        .map(([className, data]) => ({ className, hours: data.hours })),
    };
  }

  /**
   * Get overloaded teachers
   */
  getOverloadedTeachers(workloads) {
    return workloads.filter((w) => w.status === 'OVERLOADED');
  }

  /**
   * Get underloaded teachers
   */
  getUnderutilizedTeachers(workloads) {
    return workloads.filter((w) => w.status === 'UNDERLOADED');
  }

  /**
   * Get department-wise workload summary
   */
  getDepartmentSummary(workloads) {
    const deptMap = new Map();

    for (const workload of workloads) {
      const dept = workload.department;
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          department: dept,
          teachers: 0,
          totalHours: 0,
          averageHours: 0,
          overloaded: 0,
          underloaded: 0,
          balanced: 0,
        });
      }

      const deptData = deptMap.get(dept);
      deptData.teachers += 1;
      deptData.totalHours += workload.totalHours;
      if (workload.status === 'OVERLOADED') deptData.overloaded += 1;
      else if (workload.status === 'UNDERLOADED') deptData.underloaded += 1;
      else deptData.balanced += 1;
    }

    // Calculate averages
    const result = [];
    for (const [, deptData] of deptMap) {
      deptData.averageHours = Number(
        (deptData.totalHours / deptData.teachers).toFixed(2)
      );
      result.push(deptData);
    }

    return result.sort((a, b) => b.totalHours - a.totalHours);
  }

  /**
   * Generate workload statistics
   */
  getStatistics(workloads) {
    const hours = workloads.map((w) => w.totalHours);
    const sorted = [...hours].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return {
      totalTeachers: workloads.length,
      overloaded: workloads.filter((w) => w.status === 'OVERLOADED').length,
      balanced: workloads.filter((w) => w.status === 'BALANCED').length,
      underloaded: workloads.filter((w) => w.status === 'UNDERLOADED').length,
      totalHours: Number(hours.reduce((a, b) => a + b, 0).toFixed(2)),
      averageHours: Number((hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(2)),
      medianHours: sorted[mid],
      minHours: Math.min(...hours),
      maxHours: Math.max(...hours),
      standardDeviation: Number(this._calculateStdDev(hours).toFixed(2)),
    };
  }

  /**
   * Calculate standard deviation
   */
  _calculateStdDev(values) {
    const avg = values.reduce((a, b) => a + b) / values.length;
    const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Get workload distribution chart data
   */
  getDistributionData(workloads) {
    const ranges = [
      { range: '0-5 hrs', min: 0, max: 5, count: 0 },
      { range: '5-10 hrs', min: 5, max: 10, count: 0 },
      { range: '10-15 hrs', min: 10, max: 15, count: 0 },
      { range: '15-20 hrs', min: 15, max: 20, count: 0 },
      { range: '20+ hrs', min: 20, max: 1000, count: 0 },
    ];

    for (const workload of workloads) {
      const range = ranges.find(
        (r) =>
          workload.totalHours >= r.min && workload.totalHours < r.max
      );
      if (range) range.count += 1;
    }

    return ranges;
  }
}

export default WorkloadEngine;
