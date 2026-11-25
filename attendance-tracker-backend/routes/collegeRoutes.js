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

// Protected: Create & Delete (support both RESTful and /create, /delete/:id)
router.post("/", protect, createCollege);
router.post("/create", protect, createCollege);
router.delete("/delete/:id", protect, deleteCollege);
router.delete("/:id", protect, deleteCollege);

export default router;
