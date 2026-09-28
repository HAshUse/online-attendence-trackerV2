import College from "../models/College.js";

const DEFAULT_COLLEGES = [
  { name: "City College", code: "CC" },
  { name: "Vivekananda College", code: "VC" },
  { name: "BJR College", code: "BJR" },
  { name: "Malkajigiri College", code: "MC" },
  { name: "Golconda College", code: "GC" },
  { name: "Hussaini Alam College", code: "HAC" },
  { name: "Begumpet College", code: "BC" },
  { name: "Andhra Mahila Sabha", code: "AMS" },
  { name: "Sarojini Naidu College", code: "SNC" }
];

// @desc    Get all colleges (auto-seed if empty)
// @route   GET /api/colleges
// @access  Public / Protected
export const getColleges = async (req, res) => {
  try {
    let colleges = await College.find({ isActive: true }).sort({ name: 1 });

    // Auto seed default colleges if database is empty
    if (colleges.length === 0) {
      const existingCount = await College.countDocuments();
      if (existingCount === 0) {
        await College.insertMany(DEFAULT_COLLEGES);
        colleges = await College.find({ isActive: true }).sort({ name: 1 });
      }
    }

    res.status(200).json(colleges);
  } catch (error) {
    console.error("Error fetching colleges:", error);
    res.status(500).json({ message: "Server error fetching colleges", error: error.message });
  }
};

// @desc    Add a new college
// @route   POST /api/colleges
// @access  Protected
export const createCollege = async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "College name is required" });
    }

    const trimmedName = name.trim();

    // Check if college already exists (case-insensitive)
    const existing = await College.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") }
    });

    if (existing) {
      if (!existing.isActive) {
        // Reactivate if was previously deleted
        existing.isActive = true;
        if (code) existing.code = code.trim().toUpperCase();
        await existing.save();
        return res.status(200).json({ message: "College reactivated successfully", college: existing });
      }
      return res.status(400).json({ message: "College already exists" });
    }

    const newCollege = await College.create({
      name: trimmedName,
      code: code ? code.trim().toUpperCase() : "",
      createdBy: req.teacher ? req.teacher._id : undefined
    });

    res.status(201).json({ message: "College added successfully", college: newCollege });
  } catch (error) {
    console.error("Error creating college:", error);
    res.status(500).json({ message: "Server error creating college", error: error.message });
  }
};

// @desc    Delete a college
// @route   DELETE /api/colleges/:id
// @access  Protected
export const deleteCollege = async (req, res) => {
  try {
    const { id } = req.params;

    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({ message: "College not found" });
    }

    await College.findByIdAndDelete(id);

    res.status(200).json({ message: "College deleted successfully", id });
  } catch (error) {
    console.error("Error deleting college:", error);
    res.status(500).json({ message: "Server error deleting college", error: error.message });
  }
};
