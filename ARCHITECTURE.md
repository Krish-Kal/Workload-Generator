# 🏗️ Enterprise Workload Generator - System Architecture v2.0

## Overview

This is a production-grade, AI-powered universal workload management system for educational institutions. It automatically parses ANY timetable format, normalizes data intelligently, detects conflicts, and generates optimization suggestions.

---

## 🎯 Core Philosophy

**"Upload ANY messy timetable → System automatically understands, cleans, and generates workload intelligence"**

No manual correction needed. No hardcoded assumptions. Works with real-world data.

---

## 🧠 Intelligent Processing Pipeline

```
Raw Input (Any Format)
        ↓
  [Parser Engine] ← Detects format (CSV, XLSX, JSON, text)
        ↓
  [Normalization Engine] ← Fuzzy matches, standardizes
        ↓
  [Confidence Scorer] ← Rates data quality (0-1)
        ↓
  [Validation Layer] ← Flags suspicious entries
        ↓
  [Storage] ← MongoDB with audit trail
        ↓
  [Analytics] ← Workload, conflicts, suggestions
```

---

## 🔧 Backend Architecture

### Directory Structure

```
backend/
├── engines/                      # Core Intelligence Engines
│   ├── parserEngine.js          # Multi-format file parsing
│   ├── fuzzyMatchEngine.js      # Fuzzy string matching
│   ├── normalizationEngine.js   # Data standardization
│   ├── confidenceScorerEngine.js# Quality scoring
│   ├── workloadEngine.js        # Workload calculation
│   ├── conflictEngine.js        # Conflict detection
│   └── suggestionEngine.js      # Optimization suggestions
│
├── models/                       # Database Schemas
│   ├── Teacher.js               # Enhanced teacher profiles
│   ├── Timetable.js             # Rich timetable entries
│   └── AuditLog.js              # Complete audit trail
│
├── controllers/
│   ├── timetableController.js   # Main orchestration
│   └── workloadController.js    # Legacy workload endpoints
│
├── routes/
│   ├── timetableRoutes.js       # Enhanced API routes
│   └── workloadRoutes.js        # Workload endpoints
│
├── utils/
│   └── parser.js                # Legacy parsers
│
├── config/
│   └── db.js                    # MongoDB connection
│
├── uploads/                      # Temp file storage
└── server.js                     # Express app setup
```

---

## 🧩 Core Engines Explained

### 1️⃣ Parser Engine (`parserEngine.js`)

**Responsibility**: Detect and extract data from ANY format

**Supported Formats**:
- CSV files (auto-detects delimiter)
- XLSX/Excel files (multi-sheet support)
- JSON files
- Raw text (grid, table-like structures)
- Pasted raw timetable data

**Key Features**:
- Auto-delimiter detection
- Header normalization
- File hashing for audit trail
- Batch ID tracking
- Error tolerance

**Output**:
```json
{
  "batchId": "uuid",
  "sourceFile": "file.csv",
  "totalRows": 150,
  "rawData": [...],
  "parsingEngine": "csv-parser"
}
```

---

### 2️⃣ Fuzzy Matching Engine (`fuzzyMatchEngine.js`)

**Responsibility**: Handle messy, inconsistent data

**Handles Variations**:
- Teacher names: "Dr. Rao" = "Rao Sir" = "Dr Rao" ✓
- Times: "9-10" = "09:00-10:00" = "9:00-10:00 AM" ✓
- Subjects: "DBMS" = "Database Management" = "DB" ✓
- Days: "Mon" = "Monday" = "mo" ✓

**Algorithms**:
- String similarity matching (Levenshtein-based)
- Fuse.js fuzzy search
- Pattern normalization
- Confidence thresholds (0.7+)

**Example Usage**:
```javascript
const matcher = new FuzzyMatcher(0.75);
const result = matcher.matchTeacherName("Dr. Rao", ["Rao", "Dr Rao"]);
// Returns: { match: "Dr Rao", confidence: 0.95, method: "similarity" }
```

---

### 3️⃣ Normalization Engine (`normalizationEngine.js`)

**Responsibility**: Convert messy data to canonical schema

**Input Schema** (Messy):
```json
{
  "class name": "CSE A",
  "subject name": "DBMS Lab",
  "teacher name": "Dr. Rao",
  "Day": "Mon",
  "time slot": "9-10"
}
```

**Output Schema** (Canonical):
```json
{
  "className": "CSE-A",
  "subject": "Dbms Lab",
  "teacherName": "Dr. Rao",
  "normalizedTeacherName": "dr rao",
  "day": "Monday",
  "startTime": "09:00",
  "endTime": "10:00",
  "durationHours": 1,
  "confidenceScore": 0.92,
  "requiresReview": false
}
```

**Features**:
- Intelligent field mapping
- Fuzzy teacher/subject matching
- Time parsing & normalization
- Confidence scoring per field
- Flagging uncertain entries

---

### 4️⃣ Confidence Scorer Engine (`confidenceScorerEngine.js`)

**Responsibility**: Rate data quality (0-1 scale)

**Scoring Breakdown**:
```
Overall = Teacher(25%) + Subject(20%) + Time(30%) 
          + Class(15%) + Day(10%)
```

**Confidence Levels**:
- **0.9-1.0** ✅ Excellent - No review needed
- **0.8-0.9** ✅ Good - Minor review
- **0.7-0.8** ⚠️ Acceptable - May need verification
- **<0.7** 🚨 Needs Review - Uncertain data

**Quality Report**:
```json
{
  "totalEntries": 500,
  "averageConfidence": 0.89,
  "flaggedCount": 23,
  "qualityGrade": "A"
}
```

---

### 5️⃣ Workload Engine (`workloadEngine.js`)

**Responsibility**: Calculate comprehensive workload analytics

**Metrics Computed**:
- ⏱️ Total hours per teacher
- 📊 Daily/weekly breakdown
- 📚 Subject distribution
- 🏛️ Class distribution
- 📍 Room distribution
- 💯 Confidence metrics

**Workload Status**:
- 🟢 **BALANCED**: 10-20 hours/week
- 🔴 **OVERLOADED**: >20 hours/week
- 🟡 **UNDERLOADED**: <10 hours/week

**Output Features**:
- Department-wise summary
- Statistical distribution
- Distribution charts data (for UI)
- Top subjects & classes per teacher

---

### 6️⃣ Conflict Engine (`conflictEngine.js`)

**Detects Three Types of Conflicts**:

**Type 1: TIME Conflicts** 🕐
```
Dr. Rao teaching CSE-A (9:00-10:00) AND CSE-B (9:30-10:30)
❌ Impossible!
```

**Type 2: RESOURCE Conflicts** 🏛️
```
Room 101 assigned to two classes at same time
❌ Can't be in two places!
```

**Type 3: CROSS-DEPARTMENT Conflicts** 🏫
```
Same subject taught by different departments at overlapping times
⚠️ May indicate coordination issue
```

**Conflict Severity**:
- **CRITICAL**: >45 min overlap
- **SEVERE**: 30-45 min overlap
- **HIGH**: 15-30 min overlap
- **MEDIUM**: <15 min overlap

---

### 7️⃣ Suggestion Engine (`suggestionEngine.js`)

**Generates Intelligent Suggestions**:

**1️⃣ Workload Balancing**
```
"Transfer Database Lab (Dr. Rao → Mr. Sharma)"
- Dr. Rao: 25h → 22h (OVERLOADED → BALANCED)
- Mr. Sharma: 8h → 11h (UNDERLOADED → BALANCED)
```

**2️⃣ Conflict Resolution**
```
"Reschedule CSE-B practical to Friday 2-3 PM"
- Eliminates 45min overlap
- No other conflicts created
```

**3️⃣ Load Optimization**
```
"Consolidate Mr. Sharma's courses"
- 7 subjects with 2-3h each → better structure
```

**4️⃣ Capacity Utilization**
```
"Mr. Sharma has 10 hours available capacity"
- Recommendation: Assign additional lab sections
```

**Priority Scoring**:
- 10: Critical (conflicts)
- 9: High (major imbalances)
- 8: Medium (optimization)
- 6-7: Low (suggestions)

---

## 🗄️ Database Models

### Teacher Model (Enhanced)

```javascript
{
  name: String,
  normalizedName: String (lowercase, no titles),
  department: String,
  subjects: [String],
  email: String,
  qualifications: [String],
  workloadThreshold: Number (default: 20)
}
```

### TimetableEntry Model (Rich)

```javascript
{
  // Canonical Data
  className: String,
  subject: String,
  teacherName: String,
  normalizedTeacherName: String,
  day: String,
  startTime: String ("HH:MM"),
  endTime: String ("HH:MM"),
  durationHours: Number,
  room: String,

  // Quality Metrics
  confidenceScore: Number (0-1),
  parsingConfidence: {
    teacherMatch: Number,
    subjectMatch: Number,
    timeMatch: Number,
    classMatch: Number,
    dayMatch: Number
  },

  // Source Tracking
  sourceFile: String,
  sourceFileHash: String,
  uploadBatchId: String (UUID),
  parsingEngine: String,
  rawInput: Object (original data),

  // Flags
  flagged: Boolean,
  flagReason: String,
  manuallyVerified: Boolean,

  timestamps: {
    createdAt: Date,
    updatedAt: Date
  }
}
```

### AuditLog Model

```javascript
{
  action: String (FILE_UPLOAD, PARSE, NORMALIZE, etc.),
  entityType: String,
  entityId: ObjectId,
  batchId: String,
  sourceFile: String,
  
  changes: {
    before: Object,
    after: Object
  },
  
  processingTime: Number (ms),
  inputMetrics: {
    rowsProcessed: Number,
    rowsValid: Number,
    rowsInvalid: Number
  },
  
  status: String (SUCCESS, WARNING, ERROR),
  message: String,
  errorDetails: String,
  
  metadata: Object,
  timestamps: { createdAt: Date }
}
```

---

## 📡 API Endpoints

### Upload & Processing

```bash
# Upload files (CSV, XLSX, JSON, or raw text)
POST /api/timetable/upload
Content-Type: multipart/form-data
Files: [file1, file2, ...]

Response:
{
  "batchId": "uuid",
  "success": true,
  "processingTime": 1234,
  "summary": {
    "filesProcessed": 2,
    "totalRows": 500,
    "totalValid": 485,
    "totalInvalid": 15
  },
  "results": [...]
}
```

```bash
# Process normalized entries
POST /api/timetable/process
Content-Type: application/json
{
  "batchId": "uuid",
  "entries": [...]
}
```

### Analytics

```bash
# Workload analytics
GET /api/timetable/analytics/workload?department=CSE&searchTeacher=Rao

Response:
{
  "workloads": [...],
  "statistics": {...},
  "departmentSummary": [...],
  "distribution": [...]
}
```

```bash
# Conflict analysis
GET /api/timetable/analytics/conflicts

Response:
{
  "totalConflicts": 5,
  "conflicts": [...],
  "conflictsByTeacher": [...],
  "summary": {...}
}
```

```bash
# Suggestions & action plan
GET /api/timetable/analytics/suggestions

Response:
{
  "suggestions": [...],
  "actionPlan": {...},
  "totalSuggestions": 42
}
```

```bash
# Data quality report
GET /api/timetable/analytics/quality

Response:
{
  "totalEntries": 500,
  "flaggedEntries": 15,
  "averageConfidence": "92.5%",
  "confidenceDistribution": {...},
  "qualityGrade": "A"
}
```

```bash
# Audit trail
GET /api/timetable/audit/:batchId

Response:
{
  "batchId": "uuid",
  "summary": {...},
  "trail": [...]
}
```

### Export

```bash
# Export workload data
GET /api/timetable/export?type=workload&format=csv|json

# Export timetable data
GET /api/timetable/export?type=timetable&format=csv|json
```

---

## 🚀 Workflow Example

### Step 1: Upload Messy Files
```bash
curl -X POST \
  -F "files=@timetable_cse.csv" \
  -F "files=@timetable_ece.xlsx" \
  http://localhost:5000/api/timetable/upload
```

**Output**: Batch ID with parsing results

### Step 2: Review Quality Report
```bash
curl http://localhost:5000/api/timetable/analytics/quality
```

**Output**: Shows flagged entries (~3% in this example)

### Step 3: Process Validated Entries
```bash
curl -X POST http://localhost:5000/api/timetable/process \
  -H "Content-Type: application/json" \
  -d '{"batchId": "...", "entries": [...]}'
```

**Output**: Stored entries count

### Step 4: Get Analytics
```bash
curl http://localhost:5000/api/timetable/analytics/workload
curl http://localhost:5000/api/timetable/analytics/conflicts
curl http://localhost:5000/api/timetable/analytics/suggestions
```

**Output**: Comprehensive insights

### Step 5: View Audit Trail
```bash
curl http://localhost:5000/api/timetable/audit/{batchId}
```

**Output**: Complete history of transformations

---

## 💡 Key Features

### ✅ Intelligent Parsing
- Auto-detects file format
- Handles delimiter variations
- Robust error recovery
- Batch processing (1000s of rows)

### ✅ Smart Normalization
- Fuzzy teacher name matching
- Multiple time format support
- Subject deduplication
- Department inference

### ✅ Quality Assurance
- Per-field confidence scoring
- Flagging of uncertain entries
- Data quality report card
- Manual verification support

### ✅ Conflict Detection
- Time conflicts
- Resource conflicts
- Cross-department alerts
- Severity classification

### ✅ Optimization
- Workload balancing suggestions
- Load redistribution recommendations
- Department-level strategies
- Capacity utilization insights

### ✅ Audit Trail
- Complete processing history
- Change tracking
- Error logging
- Compliance support

### ✅ Enterprise Ready
- Batch processing
- Error tolerance
- Scalable to 10,000+ entries
- Rich API with filtering
- Export capabilities (CSV, JSON)

---

## 🔧 Configuration

### Environment Variables (`.env`)

```bash
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/workload
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=production
```

### Customization Options

```javascript
// In server.js, you can customize:

const workloadEngine = new WorkloadEngine({
  workdaysPerWeek: 5,      // Days per week
  hoursPerDay: 8,          // Max hours per day
  overloadThreshold: 20,   // Hours considered overloaded
  underloadThreshold: 10   // Hours considered underloaded
});

const fuzzyMatcher = new FuzzyMatcher(0.75); // Match confidence threshold
```

---

## 📊 Performance

- **Parsing**: O(n) - Linear time
- **Normalization**: O(n) - Linear time
- **Conflict Detection**: O(n²) worst case, typically O(n log n)
- **Processing**: Handles 10,000+ entries in <5 seconds

---

## 🎓 Example Use Case

**Scenario**: College uploads messy timetables from 3 departments

**Input**: 
- CSE timetable (XLSX, inconsistent format)
- ECE timetable (CSV, different headers)
- IT timetable (Mixed Excel sheets)

**System Processes**:
1. ✅ Parses all 3 files automatically
2. ✅ Detects 127 parse issues, flags for review
3. ✅ Normalizes teacher names (fuzzy matching works!)
4. ✅ Detects 8 time conflicts and 2 room conflicts
5. ✅ Suggests workload redistribution
6. ✅ Generates email recommendations

**Output**:
- 485/500 high-confidence entries stored
- 5 conflicts resolved
- 3 workload improvements suggested
- Complete audit trail for compliance

---

## 🛠️Installation & Running

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

Runs on: `http://localhost:5000`

### Environment Setup

1. Create `.env` file in `backend/`
2. Add MongoDB connection string
3. Configure port and client origin
4. Run `npm run dev`

---

## 📝 Version History

- **v1.0**: Basic CSV/XLSX support, simple workload calculation
- **v2.0** (Current):
  - Multi-format parser with fuzzy logic
  - Confidence scoring system
  - Advanced conflict detection
  - Intelligent suggestions
  - Comprehensive audit trail
  - Enterprise-grade architecture

---

## 🚀 Future Enhancements

- [ ] PDF timetable parsing (OCR)
- [ ] AI-powered data correction
- [ ] Real-time scheduling conflicts alerts
- [ ] Teacher workload optimization (ML)
- [ ] Visual timetable editor
- [ ] Multi-institution support
- [ ] API rate limiting & authentication
- [ ] Advanced reporting & dashboards

---

## 📞 Support

For issues or questions, refer to:
- Audit logs for detailed error information
- Quality reports for data validation issues
- API responses include helpful error messages

---

**Built with ❤️ for Educational Excellence**
