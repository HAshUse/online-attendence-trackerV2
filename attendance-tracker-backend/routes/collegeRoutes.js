import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getColleges,
  createCollege,
  deleteCollege
} from "../controllers/collegeController.js";

const router = express.Router();

// Public / Protected: Fetch colleges
router.get("/", getColleges);

// Protected: Create & Delete
router.post("/create", protect, createCollege);
router.delete("/delete/:id", protect, deleteCollege);

export default router;
