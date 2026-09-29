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

  // Capture the caller's frontend origin from origin or referer header
  let frontendOrigin = "";
  if (req.headers.origin) {
    frontendOrigin = req.headers.origin;
  } else if (req.headers.referer) {
    try {
      const parsed = new URL(req.headers.referer);
      frontendOrigin = parsed.origin;
    } catch (e) {}
  }

  // Pass both teacherId and frontendOrigin in state
  const statePayload = JSON.stringify({
    teacherId: req.user._id.toString(),
    frontendOrigin: frontendOrigin || "",
  });
  const encodedState = Buffer.from(statePayload).toString("base64url");

  const url = client.generateAuthUrl({
    access_type: "offline",   // get refresh_token
    scope: SCOPES,
    prompt: "consent select_account", // force consent & let user pick Google account
    state: encodedState,
  });

  res.json({ url });
});

/* =====================================================
   GET /api/auth/google/callback
   Google redirects here after teacher approves
===================================================== */
router.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  let teacherId = null;
  let frontendOrigin = null;

  if (state) {
    try {
      const decoded = Buffer.from(state, "base64url").toString("utf8");
      const parsed = JSON.parse(decoded);
      teacherId = parsed.teacherId;
      frontendOrigin = parsed.frontendOrigin;
    } catch (e) {
      teacherId = state;
    }
  }

  const getFrontendBaseUrl = () => {
    // 1. If origin passed from the frontend request, prioritize it
    if (
      frontendOrigin &&
      frontendOrigin.startsWith("http") &&
      !frontendOrigin.includes("your-backend") &&
      !frontendOrigin.includes("online-attendence-tracker-v2.onrender.com")
    ) {
      return frontendOrigin.replace(/\/$/, "");
    }

    // 2. If valid FRONTEND_URL env var exists (and is not pointing to backend)
    const envUrl = process.env.FRONTEND_URL;
    if (
      envUrl &&
      !envUrl.includes("<") &&
      !envUrl.includes("your-backend") &&
      !envUrl.includes("online-attendence-tracker-v2.onrender.com") &&
      envUrl.startsWith("http")
    ) {
      return envUrl.replace(/\/$/, "");
    }

    // 3. Localhost fallback
    const host = req.get("host") || "";
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return "http://localhost:5173";
    }

    // 4. Default production frontend static site
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

    // Prepare token updates while preserving existing refresh_token if new one isn't returned
    const updatePayload = {
      googleAccessToken: tokens.access_token,
      googleTokenExpiry: tokens.expiry_date,
      googleEmail: googleUser.email,
      googleConnectedAt: new Date()
    };
    if (tokens.refresh_token) {
      updatePayload.googleRefreshToken = tokens.refresh_token;
    }

    await Teacher.findByIdAndUpdate(teacherId, { $set: updatePayload });

    res.redirect(`${frontendUrl}/branches?google=success`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    res.redirect(`${frontendUrl}?google=error`);
  }
});

/* =====================================================
   GET /api/auth/google/status
   Returns whether the teacher has connected Google (valid across token refreshes)
===================================================== */
router.get("/status", protect, async (req, res) => {
  const teacher = await Teacher.findById(req.user._id).select(
    "googleEmail googleAccessToken googleRefreshToken googleConnectedAt"
  );

  // Remains connected as long as access token or long-lived refresh token exists in DB
  const isConnected = !!(teacher?.googleAccessToken || teacher?.googleRefreshToken);

  res.json({
    connected: isConnected,
    googleEmail: teacher?.googleEmail || null,
    googleConnectedAt: teacher?.googleConnectedAt || null
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
        googleConnectedAt: 1
      },
    });

    res.json({ message: "Google account disconnected" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
