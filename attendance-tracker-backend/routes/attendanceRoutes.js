import express from "express";
import {
  markAttendance,
  exportClassToGoogleSheet,
  exportOverallToGoogleSheet,
  getClassAttendance,
  exportAttendance,
  getAttendanceSummary,
  getGroupWiseAttendance,
  exportOverallAttendanceExcel,
  getCollegeGroupWiseAttendance,
  getOverallAttendanceSummary,
} from "../controllers/attendanceController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/mark", markAttendance);
router.get("/class/:classId", protect, getClassAttendance);
router.get("/export/:classId", protect, exportAttendance);
router.post("/export-google-sheet/:classId", protect, exportClassToGoogleSheet);
router.post("/export-google-sheet-overall/:branchId", protect, exportOverallToGoogleSheet);
router.get("/summary/:classId", protect, getAttendanceSummary);
router.get("/group-wise/:classId", protect, getGroupWiseAttendance);
router.get("/college-group-wise/:classId", protect, getCollegeGroupWiseAttendance);

// ⚠️ IMPORTANT: /overall/export/:branchId MUST come before /overall/:branchId
// Otherwise Express treats "export" as the branchId value.
router.get("/overall/export/:branchId", protect, exportOverallAttendanceExcel);
router.get("/overall/:branchId", protect, getOverallAttendanceSummary);

export default router;