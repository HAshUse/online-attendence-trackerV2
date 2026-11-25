import express from "express";
import adminProtect from "../middleware/adminMiddleware.js";
import {
  adminLogin,
  getAdminOverview,
  getAdminBranchAnalytics,
  getAdminClassAttendance,
} from "../controllers/adminController.js";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/overview", adminProtect, getAdminOverview);
router.get("/branches/:branchId/analytics", adminProtect, getAdminBranchAnalytics);
router.get("/classes/:classId", adminProtect, getAdminClassAttendance);

export default router;
