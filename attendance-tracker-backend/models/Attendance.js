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
    },
    joinedAt: {
      type: Date,
      default: null
    },
    leftAt: {
      type: Date,
      default: null
    },
    durationMins: {
      type: Number,
      default: 0
    },
    exitStatus: {
      type: String,
      enum: ["active", "completed", "left_early", "unknown"],
      default: "unknown"
    },
    meetSessions: [
      {
        joinedAt: { type: Date },
        leftAt: { type: Date },
        durationSeconds: { type: Number, default: 0 }
      }
    ],
    lastSyncedAt: {
      type: Date,
      default: null
    }
    // Note: `date` removed — use `createdAt` from timestamps instead
  },
  { timestamps: true }
);

// Compound unique index: prevents duplicate attendance and speeds up duplicate checks
attendanceSchema.index({ student: 1, class: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);