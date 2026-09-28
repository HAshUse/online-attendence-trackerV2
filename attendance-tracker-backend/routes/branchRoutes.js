// import express from "express";
// import protect from "../middleware/authMiddleware.js";
// import { createBranch, getMyBranches } from "../controllers/branchController.js";

// const router = express.Router();

// router.post("/", protect, createBranch);
// router.get("/my", protect, getMyBranches);

import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createBranch,
  getMyBranches,
  updateBranch,
  deleteBranch,
  getBranchById
} from "../controllers/branchController.js";

const router = express.Router();

// create
router.post("/create", protect, createBranch);

// list teacher branches
router.get("/my", protect, getMyBranches);

// update / rename
router.put("/update/:id", protect, updateBranch);
router.put("/:id", protect, updateBranch);

// delete
router.delete("/delete/:id", protect, deleteBranch);
router.get("/:id", protect, getBranchById);

export default router;
