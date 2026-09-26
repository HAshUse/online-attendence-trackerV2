import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },
    // Google Sheets
    sheetId: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Branch", branchSchema);
