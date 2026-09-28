import "dotenv/config";
import { google } from "googleapis";

export const getRedirectUri = (req) => {
  const envUri = process.env.GOOGLE_REDIRECT_URI;
  if (
    envUri &&
    !envUri.includes("<") &&
    !envUri.includes("your-backend") &&
    envUri.startsWith("http")
  ) {
    return envUri.trim();
  }

  if (req) {
    const rawProto = req.headers["x-forwarded-proto"];
    const protocol =
      (typeof rawProto === "string" ? rawProto.split(",")[0].trim() : null) ||
      req.protocol ||
      "https";
    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:5000";
    return `${protocol}://${host}/api/auth/google/callback`;
  }

  return "http://localhost:5000/api/auth/google/callback";
};

export const createOAuth2Client = (req) => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri(req)
  );
};

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  getRedirectUri()
);

export const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email",
];

export default oauth2Client;
