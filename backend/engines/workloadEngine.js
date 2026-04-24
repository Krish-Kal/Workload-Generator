class WorkloadEngine {
constructor(options = {}) {
  this.workdaysPerWeek = options.workdaysPerWeek || 5;
  this.hoursPerDay = options.hoursPerDay || 6;

  this.overloadThreshold = options.overloadThreshold || 15;
  this.underloadThreshold = options.underloadThreshold || 10;
}

  calculateWorkload(entries) {
    const workloadMap = new Map();

    for (const entry of entries) {
      const teacher = entry.normalizedTeacherName || entry.teacherName;

      if (!workloadMap.has(teacher)) {
        workloadMap.set(teacher, this._initializeTeacherWorkload(entry));
      }

      this._addEntryToWorkload(workloadMap.get(teacher), entry);
    }

    const workloads = Array.from(workloadMap.values()).map((w) =>
      this._calculateMetrics(w)
    );

    return this._applyStatusAnalysis(workloads);
  }

  _initializeTeacherWorkload(entry) {
    return {
      teacher: entry.teacherName,
      displayName: entry.teacherName,
      department: entry.department || 'General',

      uniqueSlots: new Set(),
      uniqueClasses: new Set(),

      totalHours: 0,
      totalClasses: 0,
      totalSlots: 0,

      dailyLoad: {},
      subjectBreakdown: {},
      classBreakdown: {},
      confidenceScores: [],
      entries: [],
    };
  }

  _parseTime(entry) {
    if (entry.timeSlot) {
      const [start, end] = entry.timeSlot.split('-');
      return {
        startTime: start,
        endTime: end,
      };
    }

    return {
      startTime: entry.startTime,
      endTime: entry.endTime,
    };
  }

  _addEntryToWorkload(workload, entry) {
    const { startTime, endTime } = this._parseTime(entry);
    const day = entry.day || 'UNKNOWN';

    const slotKey = `${day}-${startTime}-${endTime}`;

    if (!workload.uniqueSlots.has(slotKey)) {
      workload.uniqueSlots.add(slotKey);

      // ✅ FIX APPLIED HERE
      workload.totalHours = workload.uniqueSlots.size;

      workload.totalSlots += 1;
    }

    workload.uniqueClasses.add(entry.className);
    workload.totalClasses = workload.uniqueClasses.size;

    workload.confidenceScores.push(entry.confidenceScore || 1.0);

    if (!workload.dailyLoad[day]) {
      workload.dailyLoad[day] = {
        slots: 0,
        hours: 0,
        classes: new Set(),
      };
    }

    workload.dailyLoad[day].slots += 1;
    workload.dailyLoad[day].hours += 1;
    workload.dailyLoad[day].classes.add(entry.className);

    const subject = entry.subject || 'General';
    if (!workload.subjectBreakdown[subject]) {
      workload.subjectBreakdown[subject] = {
        hours: 0,
        classes: new Set(),
        days: new Set(),
      };
    }

    workload.subjectBreakdown[subject].hours += 1;
    workload.subjectBreakdown[subject].classes.add(entry.className);
    workload.subjectBreakdown[subject].days.add(day);

    const className = entry.className || 'UNKNOWN';
    if (!workload.classBreakdown[className]) {
      workload.classBreakdown[className] = {
        hours: 0,
        slots: 0,
      };
    }

    workload.classBreakdown[className].hours += 1;
    workload.classBreakdown[className].slots += 1;

    workload.entries.push(entry);
  }

  _calculateMetrics(workload) {
    const maxHoursPerWeek =
      this.workdaysPerWeek * this.hoursPerDay;

    const weeklyHours = workload.totalHours;

    const uniqueDays = Object.keys(workload.dailyLoad).length || 1;

    const avgHoursPerDay = weeklyHours / uniqueDays;

    const avgConfidence =
      workload.confidenceScores.length > 0
        ? workload.confidenceScores.reduce((a, b) => a + b) /
          workload.confidenceScores.length
        : 1;

    const utilization = Math.min(
      100,
      (weeklyHours / maxHoursPerWeek) * 100
    );

    const freeSlots = Math.max(0, maxHoursPerWeek - weeklyHours);

    const subjectBreakdown = {};
    for (const [subject, data] of Object.entries(
      workload.subjectBreakdown
    )) {
      subjectBreakdown[subject] = {
        hours: data.hours,
        classes: data.classes.size,
        daysSpan: data.days.size,
      };
    }

    const dailyLoad = {};
    for (const [day, data] of Object.entries(workload.dailyLoad)) {
      dailyLoad[day] = {
        slots: data.slots,
        hours: data.hours,
        classes: data.classes.size,
      };
    }

    return {
      teacher: workload.teacher,
      displayName: workload.displayName,
      department: workload.department,

      totalHours: weeklyHours,
      totalClasses: workload.totalClasses,
      totalSlots: workload.totalSlots,

      averageHoursPerDay: Number(avgHoursPerDay.toFixed(2)),
      averageConfidence: Number((avgConfidence * 100).toFixed(2)),

      status: 'BALANCED',
      utilization: Number(utilization.toFixed(2)),
      freeSlots,

      dailyLoad,
      subjectBreakdown,
      classBreakdown: workload.classBreakdown,

      maxHoursPerWeek,
    };
  }

  _applyStatusAnalysis(workloads) {
    if (workloads.length === 0) {
      return workloads;
    }

    const benchmarkHours = this._calculateMedian(
      workloads.map((workload) => workload.totalHours || 0)
    );

    return workloads.map((workload) => {
      const utilizationRatio =
        workload.maxHoursPerWeek > 0
          ? workload.totalHours / workload.maxHoursPerWeek
          : 0;
      const balancedWindow = Math.max(2, Math.round(benchmarkHours * 0.2));
      const lowerBound = Math.max(0, benchmarkHours - balancedWindow);
      const upperBound = Math.min(
        workload.maxHoursPerWeek,
        benchmarkHours + balancedWindow
      );

      let status = 'BALANCED';
      let analysisReason = `Within the balanced range of ${lowerBound}-${upperBound} hours based on the ${benchmarkHours}h weekly benchmark.`;

      if (utilizationRatio >= 0.85 || workload.totalHours > upperBound) {
        status = 'OVERLOADED';
        analysisReason =
          utilizationRatio >= 0.85
            ? `Uses ${Math.round(utilizationRatio * 100)}% of weekly capacity, which is above the overload limit.`
            : `${workload.totalHours}h is above the balanced upper limit of ${upperBound}h.`;
      } else if (utilizationRatio <= 0.15 || workload.totalHours < lowerBound) {
        status = 'UNDERLOADED';
        analysisReason =
          utilizationRatio <= 0.15
            ? `Uses only ${Math.round(utilizationRatio * 100)}% of weekly capacity, which is below the minimum expected load.`
            : `${workload.totalHours}h is below the balanced lower limit of ${lowerBound}h.`;
      }

      return {
        ...workload,
        status,
        analysis: {
          benchmarkHours,
          balancedWindow,
          lowerBound,
          upperBound,
          utilizationRatio: Number(utilizationRatio.toFixed(2)),
          reason: analysisReason,
        },
      };
    });
  }

  _calculateMedian(values) {
    if (values.length === 0) {
      return 0;
    }

    const sortedValues = [...values].sort((left, right) => left - right);
    const middleIndex = Math.floor(sortedValues.length / 2);

    if (sortedValues.length % 2 === 0) {
      return Number(
        (
          (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) /
          2
        ).toFixed(2)
      );
    }

    return sortedValues[middleIndex];
  }

  getStatistics(workloads) {
    const averageHours =
      workloads.length > 0
        ? Number(
            (
              workloads.reduce((sum, workload) => sum + (workload.totalHours || 0), 0) /
              workloads.length
            ).toFixed(2)
          )
        : 0;

    return {
      totalTeachers: workloads.length,
      overloaded: workloads.filter(w => w.status === 'OVERLOADED').length,
      balanced: workloads.filter(w => w.status === 'BALANCED').length,
      underloaded: workloads.filter(w => w.status === 'UNDERLOADED').length,
      averageHours,
    };
  }
}

export default WorkloadEngine;
