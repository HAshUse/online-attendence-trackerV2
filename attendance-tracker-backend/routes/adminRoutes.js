import express from "express";
import adminProtect from "../middleware/adminMiddleware.js";
import {
  adminLogin,
  getAdminOverview,
  getAdminBranchAnalytics,
  getAdminClassAttendance,
  deleteFacilitator,
  getRecycleBin,
  restoreFacilitator,
  permanentDeleteFacilitator,
} from "../controllers/adminController.js";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/overview", adminProtect, getAdminOverview);
router.get("/branches/:branchId/analytics", adminProtect, getAdminBranchAnalytics);
router.get("/classes/:classId", adminProtect, getAdminClassAttendance);
router.delete("/facilitators/:id", adminProtect, deleteFacilitator);
router.get("/recycle-bin", adminProtect, getRecycleBin);
router.post("/recycle-bin/:id/restore", adminProtect, restoreFacilitator);
router.delete("/recycle-bin/:id", adminProtect, permanentDeleteFacilitator);

export default router;
