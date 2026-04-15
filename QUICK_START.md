# 🚀 Quick Start Guide

Get the AI-Powered Workload Generator up and running in 10 minutes!

---

## ⚡ 5-Minute Setup (Local Development)

### Step 1: Prerequisites Check (1 min)
```bash
# Verify you have:
node --version    # Should be >= 18.0.0
npm --version     # Should be >= 9.0.0
```

### Step 2: Install Dependencies (3 min)
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies (in another terminal)
cd frontend
npm install
```

### Step 3: Configure MongoDB (1 min)
Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/workload_db
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Quick Option**: Use MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Get connection string
4. Replace MONGODB_URI in .env

### Step 4: Start Servers (Run Both Terminals)

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
# ✅ Server running on http://localhost:5000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
# ✅ Frontend running on http://localhost:5173
```

### Step 5: Open Browser
```
🎉 http://localhost:5173
```

---

## 📤 First Upload (2 minutes)

### Option A: Use Sample File
1. Click "📥 Download sample" on Upload Page
2. Click "📤 Upload & Parse"
3. Select the downloaded CSV file
4. Wait for parsing (10-20 seconds)
5. Review quality report
6. Click "✓ Process" automatically or manually

### Option B: Create Your Own CSV
Create `timetable.csv`:
```csv
Class Name,Subject,Teacher Name,Day,Time Slot,Department
CSE-A,Data Structures,Dr. Rao,Monday,09-10,CSE
CSE-A,Database Lab,Dr. Rao,Wednesday,14-15,CSE
CSE-B,Data Structures,Mr. Sharma,Monday,10-11,CSE
CSE-B,Database Lab,Mr. Sharma,Wednesday,15-16,CSE
ECE-A,Signals,Dr. Patel,Tuesday,09-10,ECE
ECE-A,Systems,Dr. Patel,Thursday,14-15,ECE
```

Then upload and watch the magic happen! ✨

---

## 📊 View Analytics (1 minute)

After uploading:

1. **Go to Dashboard**: Click "📊 Workload Intelligence Dashboard"
2. **Review Overview**:
   - ✓ Data Quality card (Grade A-F, Confidence score)
   - ✓ Statistics card (Overloaded/Balanced count)
   - ✓ Department summary
3. **Explore Insights**:
   - 💡 Suggestions panel (right side)
   - 🚨 Conflicts detection
   - 📈 Workload charts

---

## 🎯 Key Features to Try

### 1. Multi-Format Upload
Upload any combination of:
- CSV files
- XLSX Excel files
- JSON files
- Raw text (pasted tables)

The system automatically handles them!

### 2. Messy Data Handling
Try uploading data with variations:
- Teacher names: "Dr. Rao", "Rao Sir", "Dr Rao" ✅ All recognized
- Times: "9-10", "09:00-10:00", "9 am-10 am" ✅ All parsed
- Days: "Mon", "MON", "Monday" ✅ All normalized

### 3. Conflict Detection
The system finds:
- 🕐 Time overlaps (same teacher, different classes, same time)
- 🏛️ Room conflicts (double-booked rooms)
- 🏫 Cross-department issues

### 4. Smart Suggestions
Get recommendations for:
- Moving classes between teachers (workload balancing)
- Conflict resolutions (reschedule options)
- Load optimization (consolidation opportunities)
- Capacity utilization (assigning more to underutilized staff)

### 5. Data Quality Reports
See detailed metrics:
- Grade (A-F based on confidence)
- Average confidence score
- Distribution of entry confidence levels
- Count of flagged entries

### 6. Export Data
Download your analysis:
- CSV format (for Excel)
- JSON format (for integrations)
- Workload reports
- Timetable reports

---

## 🔍 Common Tasks

### Change Workload Thresholds
Edit `backend/engines/workloadEngine.js`:
```javascript
const workloadEngine = new WorkloadEngine({
  workdaysPerWeek: 5,      // Change number of working days
  hoursPerDay: 8,          // Change max hours per day
  overloadThreshold: 20,   // Change "overloaded" threshold (default 20h)
  underloadThreshold: 10   // Change "underloaded" threshold (default 10h)
});
```

### Adjust Confidence Threshold
Edit `backend/engines/fuzzyMatchEngine.js`:
```javascript
const matcher = new FuzzyMatcher(0.75);  // 0.75 = 75% match confidence
// Increase for stricter matching, decrease for looser matching
```

### Customize Quality Grade
Edit `backend/engines/confidenceScorerEngine.js` `_getGrade()` method to change what qualifies as A, B, C, D, F.

---

## 🐛 Troubleshooting

### Frontend won't connect to backend
**Problem**: CORS error or connection refused
```bash
# Check:
1. Backend running on port 5000?
2. MongoDB connected?
3. CLIENT_ORIGIN in .env matches?
```

**Solution**:
```env
# backend/.env
CLIENT_ORIGIN=http://localhost:5173
```

### Upload fails with file type error
**Problem**: File not supported
```bash
# Supported: CSV, XLSX, JSON, TXT
# Not supported: PDF (future), DOC, XLS (older Excel)
```

**Solution**: 
- Convert old Excel to XLSX
- Save PDF as CSV/XLSX first
- For text tables, save as .txt

### MongoDB connection error
**Problem**: Can't connect to MongoDB
```bash
# If using Atlas:
1. Check connection string format
2. Verify IP in Atlas whitelist (0.0.0.0 for dev)
3. Confirm username/password
```

**Example Connection String**:
```
mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/workload
```

### Parsing takes too long
**Problem**: System is slow with large files
```bash
# Typical: 1000 entries = 2-3 seconds
# If slower:
1. Check MongoDB connection
2. Close other apps for memory
3. Use smaller test file first
```

---

## 📚 Next Steps

### Learn More
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Deep dive into how it works
- [README.md](./README.md) - Full feature documentation
- [PROJECT_UPGRADE_SUMMARY.md](./PROJECT_UPGRADE_SUMMARY.md) - What's new in v2.0

### Extend the System
1. **Add PDF Support**: Integrate OCR library
2. **Add Notifications**: Email alerts for conflicts
3. **Add Schedule Optimization**: ML-based suggestions
4. **Add Authentication**: Multi-user login
5. **Add Visualizations**: Visual timetable editor

### Deploy to Production
```bash
# Backend → Render.com
# Frontend → Vercel.com  
# Database → MongoDB Atlas

See README.md "Deployment" section for details
```

---

## 💡 Pro Tips

1. **Batch Upload Multiple Files**
   - Upload CSE, ECE, IT timetables at once
   - System detects conflicts across departments
   - Generates unified suggestions

2. **Use Quality Reports**
   - Check quality grade before finalizing
   - Review flagged entries (confidence <70%)
   - Manually verify if needed

3. **Export for Sharing**
   - Export as CSV for Excel analysis
   - Export as JSON for api integrations
   - Share reports with stakeholders

4. **Regular Refresh**
   - Dashboard auto-refreshes every 30 seconds
   - Click 🔄 Refresh for immediate updates
   - Check suggestions regularly

5. **Use Audit Trail**
   - Track all data transformations
   - See processing metrics and timing
   - Verify data integrity

---

## 🎯 Success Checklist

- [ ] ✅ Node.js 18+ installed
- [ ] ✅ MongoDB configured
- [ ] ✅ Backend running (port 5000)
- [ ] ✅ Frontend running (port 5173)
- [ ] ✅ Upload first file successfully
- [ ] ✅ View quality report
- [ ] ✅ See workload analytics
- [ ] ✅ Review conflict detection
- [ ] ✅ Check smart suggestions
- [ ] ✅ Export report

**🎉 System is production-ready!**

---

## 📞 Need Help?

1. Check the [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
2. Review error messages in console
3. Check MongoDB connection logs
4. See Troubleshooting section above
5. Open an issue with:
   - Error message
   - Steps to reproduce
   - System info (Node version, OS)

---

**Ready to revolutionize staff workload management? Let's go! 🚀**

*Happy scheduling!*
