export function detectConflicts(entries) {
  const map = new Map(); // key: teacher|day|timeSlot -> [classes]

  for (const entry of entries) {
    const key = `${entry.teacherName}|${entry.day}|${entry.timeSlot}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(entry.className);
  }

  const conflictsByTeacher = new Map();

  for (const [key, classes] of map.entries()) {
    if (classes.length <= 1) continue;
    const [teacher, day, timeSlot] = key.split('|');
    if (!conflictsByTeacher.has(teacher)) {
      conflictsByTeacher.set(teacher, []);
    }
    conflictsByTeacher.get(teacher).push({
      day,
      time: timeSlot,
      classes,
    });
  }

  const result = [];
  for (const [teacher, conflicts] of conflictsByTeacher.entries()) {
    result.push({
      teacher,
      conflicts,
    });
  }

  return result;
}

