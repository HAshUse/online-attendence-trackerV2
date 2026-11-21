import { google } from "googleapis";
import { createOAuth2Client } from "../config/googleOAuth.js";

/**
 * Create a Google Calendar event with a Meet link attached.
 * For "open" access, creates the space via Google Meet API v2 with accessType: OPEN,
 * then attaches it as native conferenceData to the Google Calendar event.
 *
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

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: teacher.googleAccessToken,
    refresh_token: teacher.googleRefreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: client });

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
  let meetLink = "";
  let meetingCode = "";

  // 1. If open access, create space via Meet API v2 with accessType = "OPEN"
  if (isOpen) {
    try {
      const meetApi = google.meet({ version: "v2", auth: client });
      const spaceRes = await meetApi.spaces.create({
        requestBody: {
          config: {
            accessType: "OPEN",
            entryPointAccess: "ALL",
          },
        },
      });
      meetLink = spaceRes.data?.meetingUri || "";
      meetingCode =
        spaceRes.data?.meetingCode ||
        (meetLink ? meetLink.split("/").pop().split("?")[0] : "");
    } catch (meetErr) {
      console.warn("Direct Meet space creation failed, falling back to Calendar conferenceData:", meetErr.message);
    }
  }

  // 2. Build Google Calendar Event
  const event = {
    summary: title,
    description: meetLink
      ? `${description ? description + "\n\n" : ""}Join Meeting: ${meetLink}`
      : description,
    location: meetLink || "",
    visibility: isOpen ? "public" : "default",
    guestsCanInviteOthers: isOpen,
    guestsCanSeeOtherGuests: true,
    anyoneCanAddSelf: isOpen,
    start: { dateTime: startIso },
    end: { dateTime: endIso },
  };

  if (meetLink && meetingCode) {
    // Attach pre-created open Meet space to Calendar event
    event.conferenceData = {
      conferenceId: meetingCode,
      entryPoints: [
        {
          entryPointType: "video",
          uri: meetLink,
          label: meetLink.replace("https://", ""),
        },
      ],
      conferenceSolution: {
        key: { type: "hangoutsMeet" },
        name: "Google Meet",
      },
    };
  } else {
    // Fallback or restricted mode: standard Calendar conferenceData
    event.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
    conferenceDataVersion: 1,
  });

  const finalMeetLink =
    meetLink ||
    response.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video"
    )?.uri ||
    response.data.hangoutLink;

  return finalMeetLink;
};
