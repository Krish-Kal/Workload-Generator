import TimetableEntry from '../models/Timetable.js';
import { calculateWorkload, generateSuggestions } from '../utils/workloadCalculator.js';
import { detectConflicts } from '../utils/conflictDetector.js';
import { Parser as Json2csvParser } from 'json2csv';

export const getWorkload = async (req, res, next) => {
  try {
    const { teacher, subject, department } = req.query;

    const query = {};
    if (teacher) query.teacherName = new RegExp(teacher, 'i');
    if (subject) query.subject = new RegExp(subject, 'i');
    if (department) query.department = new RegExp(department, 'i');

    const entries = await TimetableEntry.find(query).lean();
    const workloads = calculateWorkload(entries);

    res.json({ workloads });
  } catch (error) {
    next(error);
  }
};

export const getConflicts = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({}).lean();
    const conflicts = detectConflicts(entries);
    res.json({ conflicts });
  } catch (error) {
    next(error);
  }
};

export const getSuggestions = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({}).lean();
    const workloads = calculateWorkload(entries);
    const suggestions = generateSuggestions(workloads);
    res.json(suggestions);
  } catch (error) {
    next(error);
  }
};

export const exportWorkload = async (req, res, next) => {
  try {
    const entries = await TimetableEntry.find({}).lean();
    const workloads = calculateWorkload(entries);

    const format = (req.query.format || 'json').toLowerCase();

    if (format === 'csv') {
      const fields = [
        'teacher',
        'department',
        'totalHours',
        'totalClasses',
        'freeSlots',
        'status',
      ];
      const parser = new Json2csvParser({ fields });
      const csv = parser.parse(workloads);
      res.header('Content-Type', 'text/csv');
      res.attachment('workload_report.csv');
      return res.send(csv);
    }

    res.json({ workloads });
  } catch (error) {
    next(error);
  }
};

