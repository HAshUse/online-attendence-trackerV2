import { google } from "googleapis";
import { createOAuth2Client } from "../config/googleOAuth.js";

/**
 * Clean and extract a Google Meet meeting code from any URL or raw code.
 * E.g., "https://meet.google.com/sat-fojq-pyt?authuser=0" -> "sat-fojq-pyt"
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
 * Inspects recent conference records and matches against the meeting code.
 */
export const fetchConferenceRecordsForMeeting = async (teacher, meetLink) => {
  const code = extractMeetingCode(meetLink);
  if (!code) return [];

  const meet = getMeetClient(teacher);
  let records = [];

  try {
    const res = await meet.conferenceRecords.list({ pageSize: 50 });
    const allRecords = res.data?.conferenceRecords || [];
    const spaceCache = new Map();

    for (const r of allRecords) {
      if (!r.space) continue;
      let spaceCode = spaceCache.get(r.space);

      if (spaceCode === undefined) {
        try {
          const s = await meet.spaces.get({ name: r.space });
          spaceCode = (s.data?.meetingCode || "").toLowerCase().trim();
          spaceCache.set(r.space, spaceCode);
        } catch {
          spaceCache.set(r.space, "");
        }
      }

      if (spaceCode && spaceCode === code) {
        records.push(r);
      }
    }
  } catch (err) {
    const msg = `${err?.message || ""} ${err?.response?.data?.error || ""}`.toLowerCase();
    if (
      err?.status === 401 ||
      err?.code === 401 ||
      msg.includes("invalid_grant") ||
      msg.includes("invalid credentials") ||
      msg.includes("token")
    ) {
      throw err;
    }
    console.warn("Conference records lookup error:", err.message);
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
        durationSeconds = Math.max(0, Math.round((leftAt.getTime() - joinedAt.getTime()) / 1000));
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
 * Aggregate participant sessions across multiple conference records of the same meeting space.
 */
export const aggregateParticipantsFromRecords = async (teacher, conferenceRecords) => {
  const participantsMap = {};

  for (const rec of conferenceRecords) {
    const parts = await fetchAllParticipantSessions(teacher, rec.name);
    for (const p of parts) {
      const key = (p.displayName || p.name).toLowerCase().trim();
      if (!participantsMap[key]) {
        participantsMap[key] = {
          displayName: p.displayName,
          userEmail: p.userEmail,
          sessions: [...p.sessions],
          earliestStartTime: p.earliestStartTime,
          latestEndTime: p.latestEndTime,
        };
      } else {
        participantsMap[key].sessions.push(...p.sessions);
        if (p.earliestStartTime && (!participantsMap[key].earliestStartTime || p.earliestStartTime < participantsMap[key].earliestStartTime)) {
          participantsMap[key].earliestStartTime = p.earliestStartTime;
        }
        if (p.latestEndTime && (!participantsMap[key].latestEndTime || p.latestEndTime > participantsMap[key].latestEndTime)) {
          participantsMap[key].latestEndTime = p.latestEndTime;
        }
      }
    }
  }

  return Object.values(participantsMap);
};

/**
 * Fetch recording Drive links from the conference records if available.
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
 * Break string into normalized lowercase alphanumeric tokens.
 */
const getTokens = (str) => {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
};

/**
 * Calculate token overlap similarity between two names (order-independent).
 * E.g., "Ch.Bhaskar" and "Bhaskar. ch" produces a score of 1.0 (exact match).
 */
const tokenSimilarity = (name1, name2) => {
  const t1 = getTokens(name1);
  const t2 = getTokens(name2);
  if (t1.length === 0 || t2.length === 0) return 0;

  let matches = 0;
  for (const word1 of t1) {
    if (t2.some((word2) => word1 === word2 || (word1.length > 2 && word2.length > 2 && (word1.includes(word2) || word2.includes(word1))))) {
      matches++;
    }
  }
  return matches / Math.max(t1.length, t2.length);
};

/**
 * Correlate attendance records against Meet participants telemetry.
 */
export const matchParticipantsToAttendance = (attendanceDocs, meetParticipants, meetingEndTime) => {
  const updates = [];
  const usedParticipantIndices = new Set();

  // Pass 1: Match by Email or Tokenized Name Similarity (>= 0.5)
  for (const doc of attendanceDocs) {
    const student = doc.student;
    if (!student) continue;

    const studentEmail = (student.email || "").toLowerCase().trim();
    const studentName = student.fullName || "";

    let bestMatchIdx = -1;
    let bestScore = 0;

    meetParticipants.forEach((p, idx) => {
      if (usedParticipantIndices.has(idx)) return;
      const pEmail = (p.userEmail || "").toLowerCase().trim();
      if (pEmail && (pEmail === studentEmail || pEmail.includes(studentEmail))) {
        bestMatchIdx = idx;
        bestScore = 2; // email exact match
        return;
      }

      const score = tokenSimilarity(studentName, p.displayName);
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatchIdx = idx;
      }
    });

    if (bestMatchIdx !== -1) {
      usedParticipantIndices.add(bestMatchIdx);
      const matched = meetParticipants[bestMatchIdx];

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

      const durationMins = Math.max(1, Math.round(totalSeconds / 60));
      let exitStatus = "completed";
      if (hasActiveSession) {
        exitStatus = "active";
      } else if (durationMins < 5) {
        exitStatus = "left_early";
      } else if (meetingEndTime && latestLeave) {
        const diffMins = Math.round((new Date(meetingEndTime) - new Date(latestLeave)) / 60000);
        if (diffMins > 15) {
          exitStatus = "left_early";
        }
      }

      updates.push({
        attendanceId: doc._id,
        joinedAt: matched.earliestStartTime,
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
