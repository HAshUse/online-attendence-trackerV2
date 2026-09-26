import express from "express";
import { google } from "googleapis";
import oauth2Client, { SCOPES } from "../config/googleOAuth.js";
import protect from "../middleware/authMiddleware.js";
import Teacher from "../models/Teacher.js";

const router = express.Router();

/* =====================================================
   GET /api/auth/google/url
   Returns the Google OAuth URL to redirect the teacher to
===================================================== */
router.get("/url", protect, (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",   // get refresh_token
    scope: SCOPES,
    prompt: "consent select_account", // force consent & let user pick Google account
    state: req.user._id.toString(), // pass teacher ID through OAuth flow
  });

  res.json({ url });
});

/* =====================================================
   GET /api/auth/google/callback
   Google redirects here after teacher approves
===================================================== */
router.get("/callback", async (req, res) => {
  const { code, state: teacherId } = req.query;

  if (!code || !teacherId) {
    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}?google=error`);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get teacher's Google email for verification
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();

    // Save tokens to teacher
    await Teacher.findByIdAndUpdate(teacherId, {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token || undefined,
      googleTokenExpiry: tokens.expiry_date,
      googleEmail: googleUser.email,
    });

    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/branches?google=success`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}?google=error`);
  }
});

/* =====================================================
   GET /api/auth/google/status
   Returns whether the teacher has connected Google
===================================================== */
router.get("/status", protect, async (req, res) => {
  const teacher = await Teacher.findById(req.user._id).select(
    "googleEmail googleAccessToken"
  );

  res.json({
    connected: !!teacher?.googleAccessToken,
    googleEmail: teacher?.googleEmail || null,
  });
});

/* =====================================================
   DELETE /api/auth/google/disconnect
   Revoke and remove Google tokens
===================================================== */
router.delete("/disconnect", protect, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user._id);
    if (teacher?.googleAccessToken) {
      oauth2Client.setCredentials({ access_token: teacher.googleAccessToken });
      await oauth2Client.revokeCredentials().catch(() => {}); // best-effort
    }

    await Teacher.findByIdAndUpdate(req.user._id, {
      $unset: {
        googleAccessToken: 1,
        googleRefreshToken: 1,
        googleTokenExpiry: 1,
        googleEmail: 1,
      },
    });

    res.json({ message: "Google account disconnected" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
