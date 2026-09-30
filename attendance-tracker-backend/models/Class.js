import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
      trim: true
    },

    subject: {
      type: String,
      required: true,
      trim: true
    },

    classCode: {
      type: String,
      unique: true,
      required: true
    },

    meetLink: {
      type: String,
      required: true
    },

    // 🔴 NEW — VERY IMPORTANT
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },

    classDate: {
      type: String,
      default: ""
    },

    startTime: {
      type: String,
      default: ""
    },

    endTime: {
      type: String,
      default: ""
    },

    expiresAt: {
      type: Date,
      required: true
    },

    accessType: {
      type: String,
      enum: ["open", "restricted"],
      default: "open"
    }
  },
  { timestamps: true }
);

// Speed up dashboard queries that filter by teacher + branch
classSchema.index({ teacher: 1, branch: 1 });

export default mongoose.model("Class", classSchema);
