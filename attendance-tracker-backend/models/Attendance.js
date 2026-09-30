import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true
    }
    // Note: `date` removed — use `createdAt` from timestamps instead
  },
  { timestamps: true }
);

// Compound unique index: prevents duplicate attendance and speeds up duplicate checks
attendanceSchema.index({ student: 1, class: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);