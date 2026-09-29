    import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    // Google OAuth
    googleAccessToken: { type: String },
    googleRefreshToken: { type: String },
    googleTokenExpiry: { type: Number },
    googleEmail: { type: String },
    googleConnectedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Teacher", teacherSchema);