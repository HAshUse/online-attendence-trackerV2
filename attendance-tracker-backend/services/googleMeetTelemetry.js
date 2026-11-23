import { google } from "googleapis";
import { createOAuth2Client } from "../config/googleOAuth.js";

/**
 * Clean and extract a Google Meet meeting code from any URL or raw code.
 * E.g., "https://meet.google.com/abc-defg-hij?authuser=0" -> "abc-defg-hij"
 */
export const extractMeetingCode = (meetLink = "") => {
  if (!meetLink) return "";
  const match = meetLink.match(/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  if (match) return match[1].toLowerCase();
  
  // Fallback cleanup
  const clean = meetLink.split("/").pop().split("?")[0].trim().toLowerCase();
  return clean;
};

/**
 * Initialize Google Meet API client for a teacher.
 */
export const getMeetClient = (teacher) => {
  if (!teacher?.googleAccessToken) {
    throw new Error("Teacher does not have a connected Google account");
  }
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: teacher.googleAccessToken,
    refresh_token: teacher.googleRefreshToken,
  });
  return google.meet({ version: "v2", auth: client });
};

/**
 * Fetch conference records associated with a meeting space.
 */
export const fetchConferenceRecordsForMeeting = async (teacher, meetLink) => {
  const code = extractMeetingCode(meetLink);
  if (!code) return [];

  const meet = getMeetClient(teacher);
  let records = [];

  // Strategy 1: Filter by space.name
  try {
    const res = await meet.conferenceRecords.list({
      filter: `space.name = "spaces/${code}"`,
    });
    records = res.data?.conferenceRecords || [];
  } catch (err) {
    console.warn("Direct space filter failed for conference records:", err.message);
  }

  // Strategy 2: List recent records and match space property
  if (!records || records.length === 0) {
    try {
      const res = await meet.conferenceRecords.list({ pageSize: 50 });
      const allRecords = res.data?.conferenceRecords || [];
      records = allRecords.filter((r) => {
        const spaceStr = (r.space || "").toLowerCase();
        return spaceStr.includes(code);
      });
    } catch (err) {
      console.warn("List all conference records fallback failed:", err.message);
    }
  }

  // Sort latest first
  records.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
  return records;
};

/**
 * Fetch all participants and their granular join/leave sessions for a conference record.
 */
export const fetchAllParticipantSessions = async (teacher, conferenceRecordName) => {
  const meet = getMeetClient(teacher);
  const participantsRes = await meet.conferenceRecords.participants.list({
    parent: conferenceRecordName,
    pageSize: 100,
  });

  const rawParticipants = participantsRes.data?.participants || [];
  const detailedParticipants = [];

  for (const p of rawParticipants) {
    const displayName =
      p.signedinUser?.displayName ||
      p.anonymousUser?.displayName ||
      p.phoneUser?.displayName ||
      "Unknown";

    const userEmail = p.signedinUser?.user || ""; // user resource string or email

    let sessions = [];
    try {
      const sessRes = await meet.conferenceRecords.participants.participantSessions.list({
        parent: p.name,
        pageSize: 100,
      });
      sessions = sessRes.data?.participantSessions || [];
    } catch (sessErr) {
      console.warn(`Failed to fetch sessions for participant ${p.name}:`, sessErr.message);
    }

    const parsedSessions = sessions.map((s) => {
      const joinedAt = s.startTime ? new Date(s.startTime) : null;
      const leftAt = s.endTime ? new Date(s.endTime) : null;
      let durationSeconds = 0;
      if (joinedAt && leftAt) {
        durationSeconds = Math.max(0, Math.round((leftAt - joinedAt) / 1000));
      }
      return {
        joinedAt,
        leftAt,
        durationSeconds,
      };
    });

    detailedParticipants.push({
      name: p.name,
      displayName,
      userEmail,
      earliestStartTime: p.earliestStartTime ? new Date(p.earliestStartTime) : null,
      latestEndTime: p.latestEndTime ? new Date(p.latestEndTime) : null,
      sessions: parsedSessions,
    });
  }

  return detailedParticipants;
};

/**
 * Fetch recording Drive links from the conference record if available.
 */
export const fetchMeetingRecordings = async (teacher, conferenceRecordName) => {
  const meet = getMeetClient(teacher);
  try {
    const recRes = await meet.conferenceRecords.recordings.list({
      parent: conferenceRecordName,
    });
    const recordings = recRes.data?.recordings || [];
    for (const rec of recordings) {
      if (rec.state === "ACTIVE" || rec.state === "RECORDING_STATE_UNSPECIFIED" || rec.driveDestination) {
        const driveFileId = rec.driveDestination?.file || "";
        const exportUri = rec.driveDestination?.exportUri || "";
        const recordingUrl = exportUri || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : "");
        if (recordingUrl) {
          return {
            recordingUrl,
            recordingFileId: driveFileId,
          };
        }
      }
    }
  } catch (err) {
    console.warn("Failed to fetch conference recordings:", err.message);
  }
  return null;
};

/**
 * Normalize a human name for fuzzy comparison:
 * Lowercases, strips punctuation and multiple consecutive spaces.
 */
const normalizeName = (name = "") => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Correlate attendance records against Meet participants telemetry.
 */
export const matchParticipantsToAttendance = (attendanceDocs, meetParticipants, meetingEndTime) => {
  const updates = [];

  for (const doc of attendanceDocs) {
    const student = doc.student;
    if (!student) continue;

    const studentEmail = (student.email || "").toLowerCase().trim();
    const studentNormName = normalizeName(student.fullName || "");

    // 1. Try matching by email
    let matched = meetParticipants.find((p) => {
      const pEmail = (p.userEmail || "").toLowerCase().trim();
      return pEmail && (pEmail === studentEmail || pEmail.includes(studentEmail));
    });

    // 2. Fallback: match by normalized display name
    if (!matched) {
      matched = meetParticipants.find((p) => {
        const pNormName = normalizeName(p.displayName || "");
        if (!pNormName || !studentNormName) return false;
        return (
          pNormName === studentNormName ||
          pNormName.includes(studentNormName) ||
          studentNormName.includes(pNormName)
        );
      });
    }

    if (matched) {
      // Aggregate duration from sessions
      let totalSeconds = 0;
      let latestLeave = matched.latestEndTime;
      let hasActiveSession = false;

      matched.sessions.forEach((s) => {
        if (!s.leftAt) {
          hasActiveSession = true;
          if (s.joinedAt) {
            totalSeconds += Math.max(0, Math.round((Date.now() - s.joinedAt.getTime()) / 1000));
          }
        } else {
          totalSeconds += s.durationSeconds || 0;
          if (!latestLeave || s.leftAt > latestLeave) {
            latestLeave = s.leftAt;
          }
        }
      });

      const durationMins = Math.round(totalSeconds / 60);

      // Determine exitStatus
      let exitStatus = "completed";
      if (hasActiveSession) {
        exitStatus = "active";
      } else if (durationMins < 10) {
        exitStatus = "left_early";
      } else if (meetingEndTime && latestLeave) {
        const diffMins = Math.round((new Date(meetingEndTime) - new Date(latestLeave)) / 60000);
        if (diffMins > 15) {
          exitStatus = "left_early";
        }
      }

      updates.push({
        attendanceId: doc._id,
        leftAt: latestLeave,
        durationMins,
        exitStatus,
        meetSessions: matched.sessions,
        lastSyncedAt: new Date(),
      });
    }
  }

  return updates;
};
