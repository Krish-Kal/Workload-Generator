# 📡 API Reference Guide

Complete reference for all API endpoints in the AI-Powered Workload Generator.

---

## Base URL

```
Development:   http://localhost:5000
Production:    https://your-render-url.com
```

---

## 🔐 Authentication

Currently: **No authentication** (designed for internal use)

For production multi-user deployment, add JWT auth tokens to each request:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

---

## 📤 Upload & Processing Endpoints

### 1. Upload Timetable File

**Endpoint**: `POST /api/timetables/upload`

**Purpose**: Parse and validate timetable files (no database storage yet)

**Request**:
```javascript
// Form-data with file
const formData = new FormData();
formData.append('files', fileObject);  // Single or multiple files

// Examples:
// - Single file: fileObject = document.querySelector('input[type="file"]').files[0]
// - Multiple files: append each file with same field name
```

**Response**:
```json
{
  "success": true,
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "uploadedFiles": [
    {
      "fileName": "CSE_Timetable.csv",
      "fileHash": "5d41402abc4b2a76b9719d911017c592",
      "parsedEntries": 45,
      "validEntries": 43,
      "invalidEntries": 2,
      "parseTime": 234
    }
  ],
  "preview": {
    "entries": [
      {
        "className": "CSE-A",
        "subject": "Data Structures",
        "teacher": "Dr. Rao",
        "day": "Monday",
        "timeSlot": "09-10",
        "department": "CSE",
        "confidenceScore": 0.95,
        "parsingConfidence": {
          "teacherMatch": 1.0,
          "subjectMatch": 0.92,
          "timeMatch": 1.0,
          "classMatch": 0.88,
          "dayMatch": 1.0
        },
        "requiresReview": false
      }
    ],
    "stats": {
      "totalEntries": 45,
      "validEntries": 43,
      "invalidEntries": 2,
      "avgConfidence": 0.92,
      "qualityGrade": "A"
    }
  }
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid file format
- `413`: File too large
- `500`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:5000/api/timetables/upload \
  -F "files=@CSE_Timetable.csv"
```

**JavaScript Example**:
```javascript
const formData = new FormData();
const file = document.getElementById('file-input').files[0];
formData.append('files', file);

const response = await fetch('/api/timetables/upload', {
  method: 'POST',
  body: formData
});
const data = await response.json();
console.log(`Batch ID: ${data.batchId}`);
```

---

### 2. Process Timetable Batch

**Endpoint**: `POST /api/timetables/process`

**Purpose**: Normalize, score, and store parsed entries in database

**Request**:
```json
{
  "batchId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**:
```json
{
  "success": true,
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "processedEntries": 43,
  "storedEntries": 43,
  "failedEntries": 0,
  "processingTime": 1234,
  "normalizedTeachers": [
    {
      "original": "Dr. Rao Sir",
      "normalized": "Dr. Rao",
      "confidence": 0.92,
      "action": "CREATED"
    }
  ],
  "summary": {
    "dataQualityGrade": "A",
    "avgConfidenceScore": 0.94,
    "flaggedEntries": 2,
    "entryCountByDepartment": {
      "CSE": 22,
      "ECE": 21
    }
  }
}
```

**JavaScript Example**:
```javascript
const response = await fetch('/api/timetables/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ batchId: 'your-batch-id' })
});
const data = await response.json();
console.log(`Stored: ${data.storedEntries} entries`);
```

---

## 📊 Analytics Endpoints

### 3. Get Workload Analytics

**Endpoint**: `GET /api/timetables/analytics/workload`

**Query Parameters**:
```
?department=CSE          # Filter by department (optional)
&threshold=20            # Overload threshold hours (optional, default 20)
&groupBy=department      # Group results: teacher|department (default teacher)
```

**Response**:
```json
{
  "success": true,
  "workloads": [
    {
      "teacherId": "607f1f77bcf86cd799439011",
      "teacherName": "Dr. Rao",
      "department": "CSE",
      "status": "OVERLOADED",
      "utilization": 115,
      "metrics": {
        "dailyLoad": [
          { "day": "Monday", "hours": 6, "status": "HEAVY" },
          { "day": "Tuesday", "hours": 4, "status": "BALANCED" },
          { "day": "Wednesday", "hours": 5, "status": "BALANCED" },
          { "day": "Thursday", "hours": 6, "status": "HEAVY" },
          { "day": "Friday", "hours": 3, "status": "BALANCED" }
        ],
        "weeklyLoad": 24,
        "subjectBreakdown": {
          "Data Structures": 10,
          "Database": 8,
          "Algorithms": 6
        },
        "classBreakdown": {
          "CSE-A": 12,
          "CSE-B": 12
        }
      },
      "statistics": {
        "mean": 4.8,
        "median": 5.0,
        "stddev": 1.1,
        "max": 6.0,
        "min": 3.0
      }
    }
  ],
  "summary": {
    "totalTeachers": 15,
    "overloadedCount": 3,
    "balancedCount": 10,
    "underloadedCount": 2,
    "avgWeeklyLoad": 18.5
  },
  "departmentSummary": {
    "CSE": {
      "avgLoad": 19.2,
      "variance": 12.5,
      "status": "IMBALANCED"
    },
    "ECE": {
      "avgLoad": 17.8,
      "variance": 8.3,
      "status": "BALANCED"
    }
  },
  "distribution": {
    "bins": [
      { "range": "0-5h", "count": 2 },
      { "range": "5-10h", "count": 5 },
      { "range": "10-15h", "count": 4 },
      { "range": "15-20h", "count": 3 },
      { "range": "20-25h", "count": 1 }
    ]
  }
}
```

**JavaScript Example**:
```javascript
const response = await fetch(
  '/api/timetables/analytics/workload?department=CSE&threshold=20'
);
const data = await response.json();

data.workloads.forEach(teacher => {
  console.log(`${teacher.teacherName}: ${teacher.weeklyLoad}h (${teacher.status})`);
});
```

---

### 4. Get Conflict Analysis

**Endpoint**: `GET /api/timetables/analytics/conflicts`

**Query Parameters**:
```
?department=CSE          # Filter by department (optional)
&severity=CRITICAL       # Filter by severity level (optional)
&type=TIME               # Filter by type: TIME|RESOURCE|CROSS_DEPT (optional)
```

**Response**:
```json
{
  "success": true,
  "conflicts": [
    {
      "conflictId": "cf-607f1f77",
      "type": "TIME",
      "severity": "CRITICAL",
      "overlapMinutes": 60,
      "entry1": {
        "teacher": "Dr. Rao",
        "class": "CSE-A",
        "subject": "Data Structures",
        "day": "Monday",
        "timeSlot": "09-10"
      },
      "entry2": {
        "teacher": "Dr. Rao",
        "class": "CSE-B",
        "subject": "Database",
        "day": "Monday",
        "timeSlot": "09-10"
      },
      "resolution": "Reschedule one of the conflicting entries"
    }
  ],
  "conflictsByTeacher": {
    "Dr. Rao": [3, 1, 2],      // [CRITICAL, SEVERE, HIGH]
    "Mr. Sharma": [0, 2, 1]
  },
  "summary": {
    "totalConflicts": 18,
    "critical": 5,
    "severe": 8,
    "high": 4,
    "medium": 1,
    "affectedTeachers": 7,
    "affectedRooms": 3
  }
}
```

**JavaScript Example**:
```javascript
const response = await fetch('/api/timetables/analytics/conflicts?severity=CRITICAL');
const data = await response.json();

console.log(`Critical conflicts: ${data.summary.critical}`);
data.conflicts.forEach(conflict => {
  console.log(`${conflict.entry1.teacher} has overlap with ${conflict.entry2.class}`);
});
```

---

### 5. Get Smart Suggestions

**Endpoint**: `GET /api/timetables/analytics/suggestions`

**Query Parameters**:
```
?priority=5              # Min priority (1-10), higher = more important (optional)
&type=BALANCING          # Type: BALANCING|OPTIMIZATION|CONSOLIDATION (optional)
&includeActionPlan=true  # Include timeline (optional, default false)
```

**Response**:
```json
{
  "success": true,
  "suggestions": [
    {
      "suggestionId": "sug-1",
      "type": "BALANCING",
      "priority": 9,
      "impactScore": 8.5,
      "title": "Transfer class from Dr. Rao to Mr. Sharma",
      "description": "Dr. Rao is overloaded (24h) and Mr. Sharma is underutilized (12h). Move CSE-B Database from Dr. Rao to Mr. Sharma.",
      "affectedTeachers": ["Dr. Rao", "Mr. Sharma"],
      "beforeWorkload": {
        "Dr. Rao": 24,
        "Mr. Sharma": 12
      },
      "afterWorkload": {
        "Dr. Rao": 20,
        "Mr. Sharma": 16
      },
      "estimatedImprovementPercent": 15.3,
      "conflictReduction": 2,
      "implementationDays": 1
    }
  ],
  "actionPlan": [
    {
      "priority": 1,
      "action": "Transfer CSE-B Database from Dr. Rao to Mr. Sharma",
      "day": "Today",
      "owner": "HOD CSE",
      "expectedOutcome": "Reduce Dr. Rao's load by 4h, improve balance by 15%"
    }
  ],
  "summary": {
    "totalSuggestions": 12,
    "highPriority": 4,
    "mediumPriority": 6,
    "lowPriority": 2,
    "estimatedImprovementPercent": 28.5
  }
}
```

**JavaScript Example**:
```javascript
const response = await fetch('/api/timetables/analytics/suggestions?priority=7');
const data = await response.json();

data.suggestions.forEach(sug => {
  console.log(`[P${sug.priority}] ${sug.title}`);
  console.log(`  Impact: ${sug.impactScore}/10`);
});
```

---

### 6. Get Data Quality Report

**Endpoint**: `GET /api/timetables/analytics/quality`

**Query Parameters**:
```
?batchId=550e8400...    # Specific batch (optional, defaults to latest)
```

**Response**:
```json
{
  "success": true,
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "overallQualityGrade": "A",
  "metrics": {
    "totalEntries": 45,
    "validEntries": 43,
    "invalidEntries": 2,
    "avgConfidenceScore": 0.94,
    "entriesFlagged": 2,
    "entriesManuallyVerified": 1
  },
  "confidenceDistribution": {
    "excellent": { "range": "0.95-1.00", "count": 28, "percent": 65 },
    "good": { "range": "0.85-0.95", "count": 12, "percent": 28 },
    "fair": { "range": "0.70-0.85", "count": 2, "percent": 5 },
    "poor": { "range": "<0.70", "count": 1, "percent": 2 }
  },
  "fieldConfidence": {
    "teacher": 0.96,
    "subject": 0.92,
    "time": 0.98,
    "class": 0.89,
    "day": 0.97
  },
  "flaggedEntries": [
    {
      "entryId": "entry-123",
      "reason": "LOW_TEACHER_CONFIDENCE",
      "details": "Teacher 'Dr. R' might be 'Dr. Rao' or 'Dr. Raman'",
      "confidence": 0.68,
      "suggestedCorrection": "Dr. Rao"
    }
  ],
  "gradeExplanation": "Grade A: Average confidence > 0.90, < 5% flagged entries, no critical parsing errors"
}
```

---

### 7. Get Audit Trail

**Endpoint**: `GET /api/timetables/audit/:batchId`

**Response**:
```json
{
  "success": true,
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "auditTrail": [
    {
      "timestamp": "2024-01-15T10:30:45Z",
      "action": "FILE_UPLOAD",
      "status": "SUCCESS",
      "details": {
        "fileName": "CSE_Timetable.csv",
        "fileSize": 2048,
        "fileHash": "5d41402abc4b2a76b9719d911017c592"
      }
    },
    {
      "timestamp": "2024-01-15T10:30:50Z",
      "action": "PARSE",
      "status": "SUCCESS",
      "details": {
        "parseEngine": "parserEngine",
        "format": "CSV",
        "rowsProcessed": 45,
        "rowsValid": 43,
        "rowsInvalid": 2,
        "processingTimeMs": 234
      }
    },
    {
      "timestamp": "2024-01-15T10:30:55Z",
      "action": "NORMALIZE",
      "status": "SUCCESS",
      "details": {
        "entriesNormalized": 43,
        "newTeachersCreated": 3,
        "existingTeachersMatched": 12,
        "processingTimeMs": 156
      }
    }
  ],
  "summary": {
    "totalActions": 8,
    "successful": 8,
    "failed": 0,
    "warnings": 2,
    "totalProcessingTimeMs": 2450
  }
}
```

---

### 8. Export Data

**Endpoint**: `GET /api/timetables/export`

**Query Parameters**:
```
?format=csv              # Format: csv|json (required)
&type=timetable          # Type: timetable|workload|conflicts (required)
&batchId=550e8400...    # Filter by batch (optional)
&department=CSE          # Filter by department (optional)
```

**Response**:
- `format=csv`: Returns CSV file download
- `format=json`: Returns JSON data

**cURL Example**:
```bash
# Export as CSV
curl -X GET 'http://localhost:5000/api/timetables/export?format=csv&type=timetable' \
  -o timetable.csv

# Export as JSON
curl -X GET 'http://localhost:5000/api/timetables/export?format=json&type=workload' \
  -o workload.json
```

**JavaScript Example**:
```javascript
// Download as CSV
const url = '/api/timetables/export?format=csv&type=timetable&department=CSE';
const link = document.createElement('a');
link.href = url;
link.download = 'timetable.csv';
link.click();

// Or fetch JSON
const response = await fetch('/api/timetables/export?format=json&type=workload');
const data = await response.json();
```

---

## 🛠️ Advanced Integration

### Batch Workflow Example

```javascript
// Complete workflow: Upload → Process → Analyze → Export

// Step 1: Upload
const uploadFormData = new FormData();
uploadFormData.append('files', fileInput.files[0]);
const uploadRes = await fetch('/api/timetables/upload', {
  method: 'POST',
  body: uploadFormData
});
const uploadData = await uploadRes.json();
const batchId = uploadData.batchId;

// Step 2: Process
const processRes = await fetch('/api/timetables/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ batchId })
});
const processData = await processRes.json();
console.log(`Processed: ${processData.storedEntries} entries`);

// Step 3: Get Analytics
const workloadRes = await fetch('/api/timetables/analytics/workload?department=CSE');
const workloadData = await workloadRes.json();
console.log(`Highest load: ${workloadData.workloads[0].teacherName}`);

// Step 4: Get Suggestions
const suggestionsRes = await fetch('/api/timetables/analytics/suggestions');
const suggestionsData = await suggestionsRes.json();
console.log(`Top suggestion: ${suggestionsData.suggestions[0].title}`);

// Step 5: Export
const exportRes = await fetch(
  '/api/timetables/export?format=csv&type=workload'
);
const blob = await exportRes.blob();
download(blob, 'workload.csv');
```

---

## ⚠️ Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Invalid batch ID",
  "details": "Batch not found in database",
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:45Z"
}
```

**Common Status Codes**:
- `200`: Success
- `400`: Bad request (missing/invalid parameters)
- `404`: Not found (batch/data doesn't exist)
- `413`: Payload too large (file >50MB)
- `500`: Server error (database/processing failure)

**JavaScript Error Handling**:
```javascript
try {
  const response = await fetch('/api/timetables/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error(`Error: ${error.error}`);
    throw new Error(error.details);
  }
  
  const data = await response.json();
  console.log('Success:', data);
} catch (err) {
  console.error('Request failed:', err.message);
}
```

---

## 📋 Rate Limiting & Quotas

- **Upload file size**: Max 50MB
- **Batch entries**: Max 10,000
- **Request timeout**: 30 seconds
- **Database retention**: All batches stored indefinitely

---

## 📝 Examples by Use Case

### Use Case 1: Dashboard Integration

```javascript
// Fetch and display workload
async function loadDashboard() {
  const [workload, conflicts, suggestions] = await Promise.all([
    fetch('/api/timetables/analytics/workload').then(r => r.json()),
    fetch('/api/timetables/analytics/conflicts').then(r => r.json()),
    fetch('/api/timetables/analytics/suggestions').then(r => r.json())
  ]);
  
  updateUI(workload, conflicts, suggestions);
}
```

### Use Case 2: Automated Reporting

```javascript
// Generate report every day
async function generateDailyReport() {
  const quality = await fetch('/api/timetables/analytics/quality')
    .then(r => r.json());
  
  const workload = await fetch('/api/timetables/analytics/workload')
    .then(r => r.json());
  
  const csv = await fetch('/api/timetables/export?format=csv&type=workload')
    .then(r => r.blob());
  
  // Send report via email or webhook
  await sendEmail('admin@college.edu', {
    quality: quality.overallQualityGrade,
    topSuggestion: workload.summary.overloadedCount,
    attachment: csv
  });
}
```

### Use Case 3: Mobile App Integration

```javascript
// React Native or Flutter integration
const API_BASE = 'https://your-api.com';

async function fetchTeacherWorkload(teacherName) {
  const response = await fetch(
    `${API_BASE}/api/timetables/analytics/workload`
  );
  const data = await response.json();
  return data.workloads.find(w => w.teacherName === teacherName);
}
```

---

## 🔗 WebSocket Support (Future)

Coming in v2.1: Real-time updates via WebSocket
```javascript
const ws = new WebSocket('ws://localhost:5000/ws');
ws.on('workload-updated', (data) => {
  console.log('New workload data:', data);
});
```

---

## 📚 Related Documentation

- [Quick Start Guide](./QUICK_START.md) - Get started in 10 minutes
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Deep dive into system design
- [README.md](./README.md) - Feature overview and deployment

---

**Need more help?** Check the troubleshooting section in [QUICK_START.md](./QUICK_START.md) or review specific engine documentation in [ARCHITECTURE.md](./ARCHITECTURE.md).
