import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import branchAnalyticsRoutes from "./routes/branchAnalyticsRoutes.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";
import collegeRoutes from "./routes/collegeRoutes.js";
import cron from "node-cron";
import { checkLowAttendance } from "./services/attendanceChecker.js";

connectDB();

const app = express();

// Connect DB

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Attendance Tracker Backend Running 🚀");
});

app.use("/api/teachers", teacherRoutes); 
app.use("/api/classes", classRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/branches", branchAnalyticsRoutes);
app.use("/api/auth/google", googleAuthRoutes);
app.use("/api/colleges", collegeRoutes);

// Fallback for non-API paths (e.g. /branches?google=success accessed directly on backend)
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    const frontendUrl =
      process.env.FRONTEND_URL &&
      !process.env.FRONTEND_URL.includes("online-attendence-tracker-v2") &&
      !process.env.FRONTEND_URL.includes("<")
        ? process.env.FRONTEND_URL.replace(/\/$/, "")
        : "https://attendance-tracker-frontend-yg94.onrender.com";

    return res.redirect(`${frontendUrl}${req.originalUrl}`);
  }
  next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`)
);
// Runs everyday at 8 PM
cron.schedule("0 20 * * *", () => {
  console.log("⏰ Running daily attendance job...");
  checkLowAttendance();
});