import csv from 'csv-parser';
import xlsx from 'xlsx';
import fs from 'fs';

// Expected headers (case-insensitive): Class Name, Subject, Teacher Name, Day, Time Slot, Department (optional)

const normalizeHeader = (h) => h.trim().toLowerCase();

export const parseCSVFile = (filePath) =>
  new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', () => {
        try {
          const parsed = normalizeRows(results);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => reject(err));
  });

export const parseXLSXFile = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(sheet);
  return normalizeRows(json);
};

function normalizeRows(rows) {
  return rows.map((raw) => {
    const mapped = {};
    for (const key of Object.keys(raw)) {
      const nk = normalizeHeader(key);
      mapped[nk] = raw[key];
    }

    const className = mapped['class name'] || mapped['class'] || '';
    const subject = mapped['subject'] || '';
    const teacherName = mapped['teacher name'] || mapped['teacher'] || '';
    const day = mapped['day'] || '';
    const timeSlot = mapped['time slot'] || mapped['time'] || '';
    const department = mapped['department'] || '';

    if (!className || !subject || !teacherName || !day || !timeSlot) {
      throw new Error('Missing required fields in timetable row.');
    }

    return {
      className: String(className).trim(),
      subject: String(subject).trim(),
      teacherName: String(teacherName).trim(),
      day: String(day).trim(),
      timeSlot: String(timeSlot).trim(),
      department: String(department || '').trim() || 'General',
      durationHours: 1,
    };
  });
}

