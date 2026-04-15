export function calculateWorkload(entries) {
  const workloadMap = new Map();

  for (const entry of entries) {
    const teacher = entry.teacherName;
    if (!workloadMap.has(teacher)) {
      workloadMap.set(teacher, {
        teacher,
        department: entry.department || 'General',
        totalHours: 0,
        totalClasses: 0,
        freeSlots: 0, // calculated later if needed
        dailyLoad: {}, // { Monday: { classes: 0, hours: 0 }, ... }
        subjects: new Set(),
      });
    }

    const w = workloadMap.get(teacher);
    const hours = entry.durationHours || 1;
    w.totalHours += hours;
    w.totalClasses += 1;
    w.subjects.add(entry.subject);

    const dayKey = entry.day;
    if (!w.dailyLoad[dayKey]) {
      w.dailyLoad[dayKey] = { classes: 0, hours: 0 };
    }
    w.dailyLoad[dayKey].classes += 1;
    w.dailyLoad[dayKey].hours += hours;
  }

  // Estimate free slots per week based on a 5-day, 8-slot-per-day schedule (configurable)
  const daysPerWeek = 5;
  const slotsPerDay = 8;
  const totalSlots = daysPerWeek * slotsPerDay;

  const workloads = [];
  for (const [, value] of workloadMap) {
    const occupiedSlots = value.totalHours; // 1 hour per slot
    value.freeSlots = Math.max(totalSlots - occupiedSlots, 0);
    value.subjects = Array.from(value.subjects);

    let status = 'Balanced';
    if (value.totalHours > 20) status = 'Overloaded';
    else if (value.totalHours < 10) status = 'Underloaded';

    workloads.push({
      teacher: value.teacher,
      department: value.department,
      totalHours: value.totalHours,
      totalClasses: value.totalClasses,
      freeSlots: value.freeSlots,
      dailyLoad: value.dailyLoad,
      subjects: value.subjects,
      status,
    });
  }

  return workloads;
}

export function generateSuggestions(workloads) {
  const overloaded = workloads.filter((w) => w.totalHours > 20);
  const underutilized = workloads.filter((w) => w.totalHours < 10);

  const suggestions = [];

  for (const over of overloaded) {
    for (const under of underutilized) {
      const commonSubjects = over.subjects.filter((s) => under.subjects.includes(s));
      if (commonSubjects.length === 0) continue;

      suggestions.push({
        fromTeacher: over.teacher,
        toTeacher: under.teacher,
        reason: 'Overloaded/underutilized pair',
        commonSubjects,
        message: `Consider moving some ${commonSubjects.join(
          ', '
        )} classes from ${over.teacher} to ${under.teacher} to balance workload.`,
      });
    }
  }

  return {
    overloaded,
    underutilized,
    suggestions,
  };
}

