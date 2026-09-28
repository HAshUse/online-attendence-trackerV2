import express from "express";
import { google } from "googleapis";
import oauth2Client, { createOAuth2Client, SCOPES } from "../config/googleOAuth.js";
import protect from "../middleware/authMiddleware.js";
import Teacher from "../models/Teacher.js";

const router = express.Router();

/* =====================================================
   GET /api/auth/google/url
   Returns the Google OAuth URL to redirect the teacher to
===================================================== */
router.get("/url", protect, (req, res) => {
  const client = createOAuth2Client(req);
  const url = client.generateAuthUrl({
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

  const getFrontendBaseUrl = () => {
    const envUrl = process.env.FRONTEND_URL;
    if (envUrl && !envUrl.includes("<") && envUrl.startsWith("http")) {
      return envUrl.replace(/\/$/, "");
    }
    const host = req.get("host") || "";
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return "http://localhost:5173";
    }
    return "https://attendance-tracker-frontend-yg94.onrender.com";
  };

  const frontendUrl = getFrontendBaseUrl();

  if (!code || !teacherId) {
    return res.redirect(`${frontendUrl}?google=error`);
  }

  try {
    const client = createOAuth2Client(req);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get teacher's Google email for verification
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: googleUser } = await oauth2.userinfo.get();

    // Save tokens to teacher
    await Teacher.findByIdAndUpdate(teacherId, {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token || undefined,
      googleTokenExpiry: tokens.expiry_date,
      googleEmail: googleUser.email,
    });

    res.redirect(`${frontendUrl}/branches?google=success`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    res.redirect(`${frontendUrl}?google=error`);
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
      const client = createOAuth2Client(req);
      client.setCredentials({ access_token: teacher.googleAccessToken });
      await client.revokeCredentials().catch(() => {}); // best-effort
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
