import csv from 'csv-parser';
import xlsx from 'xlsx';
import fs from 'fs';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Universal Parser Engine
 * Automatically detects and parses multiple timetable formats:
 * - CSV files
 * - XLSX files
 * - JSON files
 * - Raw pasted text (grid, table-like structures)
 */

class ParserEngine {
  constructor() {
    this.supportedFormats = ['csv', 'xlsx', 'json', 'text'];
  }

  /**
   * Main parsing method - detects format and parses accordingly
   */
  async parseFile(filePath, sourceFileName) {
    try {
      const fileExt = this._getFileExtension(filePath);
      const batchId = uuidv4();
      const fileHash = this._getFileHash(filePath);

      let rawData = [];

      switch (fileExt) {
        case 'csv':
          rawData = await this.parseCSV(filePath);
          break;
        case 'xlsx':
          rawData = this.parseXLSX(filePath);
          break;
        case 'json':
          rawData = this.parseJSON(filePath);
          break;
        case 'txt':
          rawData = await this.parseRawText(filePath);
          break;
        default:
          throw new Error(`Unsupported file format: ${fileExt}`);
      }

      // Add metadata to each entry
      return {
        batchId,
        sourceFile: sourceFileName,
        sourceFileHash: fileHash,
        parsingEngine: `${fileExt}-parser`,
        totalRows: rawData.length,
        rawData: rawData.map((row) => ({
          ...row,
          batchId,
          sourceFile: sourceFileName,
          sourceFileHash: fileHash,
          rawInput: row, // Keep original for audit trail
        })),
      };
    } catch (error) {
      throw new Error(`Parse error in ${sourceFileName}: ${error.message}`);
    }
  }

  /**
   * Parse CSV file
   */
  parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          results.push(row);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (err) => reject(err));
    });
  }

  /**
   * Parse XLSX file
   */
  parseXLSX(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(sheet);
    return json;
  }

  /**
   * Parse JSON file
   */
  parseJSON(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [data];
  }

  /**
   * Parse raw text (grid/table-like structures)
   * Handles pasted tables with flexible delimiters
   */
  async parseRawText(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    // Try to detect delimiter
    const delimiter = this._detectDelimiter(lines);

    // Parse using detected delimiter
    const rows = [];
    const headerLine = lines[0];
    const headers = this._parseDelimitedLine(headerLine, delimiter);

    for (let i = 1; i < lines.length; i++) {
      const values = this._parseDelimitedLine(lines[i], delimiter);
      if (values.length !== headers.length) continue;

      const row = {};
      headers.forEach((header, idx) => {
        row[header.toLowerCase().trim()] = values[idx].trim();
      });
      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse pasted text from raw input
   */
  parseTextInput(textInput) {
    const lines = textInput.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('Not enough data in text input');
    }

    const delimiter = this._detectDelimiter(lines);
    const rows = [];
    const headerLine = lines[0];
    const headers = this._parseDelimitedLine(headerLine, delimiter);

    for (let i = 1; i < lines.length; i++) {
      const values = this._parseDelimitedLine(lines[i], delimiter);
      if (values.length < headers.length) continue;

      const row = {};
      headers.forEach((header, idx) => {
        row[header.toLowerCase().trim()] = values[idx].trim();
      });
      rows.push(row);
    }

    return rows;
  }

  /**
   * Auto-detect delimiter in text data
   */
  _detectDelimiter(lines) {
    const delimiters = ['\t', ',', '|', ';', ' '];
    const sampleLine = lines[0];

    let bestDelimiter = ',';
    let maxSeparations = 0;

    for (const delim of delimiters) {
      const separations = (sampleLine.match(new RegExp(delim, 'g')) || []).length;
      if (separations > maxSeparations) {
        maxSeparations = separations;
        bestDelimiter = delim;
      }
    }

    return bestDelimiter;
  }

  /**
   * Parse a delimited line
   */
  _parseDelimitedLine(line, delimiter) {
    return line
      .split(delimiter)
      .map((item) => item.trim())
      .filter((item) => item);
  }

  /**
   * Get file extension
   */
  _getFileExtension(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    return ext;
  }

  /**
   * Calculate file hash for audit trail
   */
  _getFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Normalize parsed row headers to standard format
   */
  normalizeHeaders(rows) {
    if (!rows || rows.length === 0) return rows;

    return rows.map((row) => {
      const normalized = {};

      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = this._normalizeHeaderKey(key);
        normalized[normalizedKey] = value;
      }

      return normalized;
    });
  }

  /**
   * Map header variations to canonical names
   */
  _normalizeHeaderKey(key) {
    const normalized = key.toLowerCase().trim().replace(/[\s_-]+/g, ' ');

    const headerMap = {
      'class name':
        'className',
      class: 'className',
      'subject name': 'subject',
      subject: 'subject',
      'teacher name': 'teacherName',
      teacher: 'teacherName',
      'instructor name': 'teacherName',
      instructor: 'teacherName',
      day: 'day',
      'time slot': 'startTime',
      'time slote': 'startTime',
      time: 'startTime',
      'start time': 'startTime',
      'end time': 'endTime',
      duration: 'durationHours',
      'duration hours': 'durationHours',
      room: 'room',
      'room number': 'room',
      'room no': 'room',
      department: 'department',
      dept: 'department',
      'dept name': 'department',
    };

    return headerMap[normalized] || normalized;
  }

  /**
   * Validate and clean parsed data
   */
  validateAndClean(rows) {
    const requiredFields = ['className', 'subject', 'teacherName', 'day'];
    const validated = [];
    const errors = [];

    rows.forEach((row, idx) => {
      const missingFields = requiredFields.filter((field) => !row[field]);

      if (missingFields.length > 0) {
        errors.push({
          rowIndex: idx,
          row,
          missingFields,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        });
      } else {
        validated.push(row);
      }
    });

    return {
      valid: validated,
      invalid: errors,
      validCount: validated.length,
      invalidCount: errors.length,
    };
  }
}

export default ParserEngine;
