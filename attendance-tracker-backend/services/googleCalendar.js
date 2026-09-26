import { google } from "googleapis";
import oauth2Client from "../config/googleOAuth.js";

/**
 * Create a Google Calendar event with a Meet link attached.
 * @param {object} teacher - Teacher document with stored Google tokens
 * @param {string} title - Class/event title
 * @param {Date|string} startTime - Event start date & time
 * @param {Date|string} endTime - Event end date & time
 * @param {string} description - Event description/subject
 * @param {string} accessType - "open" (open to everyone) | "restricted" (approval required)
 * @returns {string} Google Meet link
 */
export const createMeetLink = async (
  teacher,
  title,
  startTime,
  endTime,
  description = "",
  accessType = "open"
) => {
  if (!teacher?.googleAccessToken) {
    throw new Error("Google account not connected");
  }

  oauth2Client.setCredentials({
    access_token: teacher.googleAccessToken,
    refresh_token: teacher.googleRefreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  let startObj = new Date(startTime);
  let endObj = new Date(endTime);

  if (isNaN(startObj.getTime())) {
    startObj = new Date();
  }
  if (isNaN(endObj.getTime()) || endObj.getTime() <= startObj.getTime()) {
    endObj = new Date(startObj.getTime() + 60 * 60 * 1000); // 1 hour duration default
  }

  const startIso = startObj.toISOString();
  const endIso = endObj.toISOString();

  const isOpen = accessType === "open";

  const event = {
    summary: title,
    description: description,
    visibility: isOpen ? "public" : "default",
    guestsCanInviteOthers: isOpen,
    guestsCanSeeOtherGuests: true,
    anyoneCanAddSelf: isOpen,
    start: { dateTime: startIso },
    end: { dateTime: endIso },
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
    conferenceDataVersion: 1,
  });

  const meetLink =
    response.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video"
    )?.uri || response.data.hangoutLink;

  return meetLink;
};
