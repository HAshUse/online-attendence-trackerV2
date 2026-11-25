import express from "express";
import {
  markAttendance,
  getClassAttendance,
  getAttendanceSummary,
  getGroupWiseAttendance,
  getCollegeGroupWiseAttendance,
  getOverallAttendanceSummary,
  syncClassMeetTelemetry,
} from "../controllers/attendanceController.js";
import {
  exportAttendance,
  exportClassToGoogleSheet,
  exportOverallAttendanceExcel,
  exportOverallToGoogleSheet,
  syncBranchRecordingsToGoogleSheet,
} from "../controllers/exportController.js";
import {
  aiPreviewCleanedAttendance,
  aiCleanAndDispatchAttendance,
} from "../controllers/aiReportController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/mark", markAttendance);
router.get("/class/:classId", protect, getClassAttendance);
router.get("/sync-meet/:classId", protect, syncClassMeetTelemetry);
router.post("/ai-preview/:classId", protect, aiPreviewCleanedAttendance);
router.post("/ai-dispatch/:classId", protect, aiCleanAndDispatchAttendance);
router.get("/export/:classId", protect, exportAttendance);
router.post("/export-google-sheet/:classId", protect, exportClassToGoogleSheet);
router.post("/export-google-sheet-overall/:branchId", protect, exportOverallToGoogleSheet);
router.post("/branch/:branchId/sync-recordings", protect, syncBranchRecordingsToGoogleSheet);
router.get("/summary/:classId", protect, getAttendanceSummary);
router.get("/group-wise/:classId", protect, getGroupWiseAttendance);
router.get("/college-group-wise/:classId", protect, getCollegeGroupWiseAttendance);

// ⚠️ IMPORTANT: /overall/export/:branchId MUST come before /overall/:branchId
// Otherwise Express treats "export" as the branchId value.
router.get("/overall/export/:branchId", protect, exportOverallAttendanceExcel);
router.get("/overall/:branchId", protect, getOverallAttendanceSummary);

export default router;