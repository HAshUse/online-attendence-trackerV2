import Branch from "../models/Branch.js";
import Class from "../models/Class.js";
import Attendance from "../models/Attendance.js";
import Teacher from "../models/Teacher.js";
import { createBranchSheet, getSheetUrl } from "../services/googleSheets.js";



/* CREATE BRANCH */
export const createBranch = async (req, res) => {
  try {
    const { name, year } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Branch name required" });
    }

    const exists = await Branch.findOne({
      name: name.trim(),
      year: year ? year.trim() : "",
      teacher: req.user._id
    });

    if (exists) {
      return res.status(400).json({ message: "Branch with this name and year already exists" });
    }

    const branch = await Branch.create({
      name: name.trim(),
      year: year ? year.trim() : "",
      teacher: req.user._id
    });

    // Auto-create Google Sheet if teacher has connected Google
    try {
      const teacher = await Teacher.findById(req.user._id);
      if (teacher?.googleAccessToken) {
        const tokens = {
          access_token: teacher.googleAccessToken,
          refresh_token: teacher.googleRefreshToken,
          expiry_date: teacher.googleTokenExpiry,
        };
        const sheetId = await createBranchSheet(tokens, name);
        branch.sheetId = sheetId;
        await branch.save();
      }
    } catch (sheetErr) {
      console.warn("Sheet creation failed (non-critical):", sheetErr.message);
    }

    res.status(201).json({
      ...branch.toObject(),
      sheetUrl: branch.sheetId ? getSheetUrl(branch.sheetId) : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* GET MY BRANCHES */
export const getMyBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ teacher: req.user._id })
      .sort({ createdAt: -1 });

    const branchesWithStats = await Promise.all(
      branches.map(async (b) => {
        const classCount = await Class.countDocuments({ branch: b._id });
        return {
          ...b.toObject(),
          classCount,
          sheetUrl: b.sheetId ? getSheetUrl(b.sheetId) : null,
        };
      })
    );

    res.json(branchesWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* DELETE BRANCH (CASCADE DELETE) */
export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Find branch
    const branch = await Branch.findById(id);

    if (!branch)
      return res.status(404).json({ message: "Branch not found" });

    // 2️⃣ Ownership check
    if (branch.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not allowed" });

    // 3️⃣ Find all classes in branch
    const classes = await Class.find({ branch: id });

    const classIds = classes.map(c => c._id);

    // 4️⃣ Delete attendance of those classes
    await Attendance.deleteMany({ class: { $in: classIds } });

    // 5️⃣ Delete classes
    await Class.deleteMany({ branch: id });

    // 6️⃣ Finally delete branch
    await branch.deleteOne();

    res.json({ message: "Branch and all related data deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) return res.status(404).json({ message: "Branch not found" });

    res.json({
      ...branch.toObject(),
      sheetUrl: branch.sheetId ? getSheetUrl(branch.sheetId) : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
