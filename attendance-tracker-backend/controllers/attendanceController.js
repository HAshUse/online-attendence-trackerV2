import mongoose from "mongoose";
import Student from "../models/Student.js";
import Class from "../models/Class.js";
import Attendance from "../models/Attendance.js";
import Branch from "../models/Branch.js";
import Teacher from "../models/Teacher.js";
import {
  markStudentPresent,
  createBranchSheet,
  syncBranchRecordingsSheet,
  makeDriveFilePublic,
} from "../services/googleSheets.js";
import {
  fetchConferenceRecordsForMeeting,
  aggregateParticipantsFromRecords,
  fetchMeetingRecordings,
  matchParticipantsToAttendance,
} from "../services/googleMeetTelemetry.js";

/**
 * Gracefully handles Google API errors (specifically invalid_grant / expired tokens)
 * Auto-unsets stale tokens in MongoDB and instructs frontend to prompt reconnection.
 */
export const handleGoogleApiError = async (error, teacherId, res, defaultMsg) => {
  console.error(defaultMsg, error);
  const errStr = `${error?.message || ""} ${error?.response?.data?.error || ""} ${JSON.stringify(error?.response?.data || {})}`.toLowerCase();

  if (
    errStr.includes("invalid_grant") ||
    errStr.includes("invalid credentials") ||
    errStr.includes("token has been expired or revoked") ||
    errStr.includes("token expired")
  ) {
    try {
      if (teacherId) {
        await Teacher.findByIdAndUpdate(teacherId, {
          $unset: {
            googleAccessToken: 1,
            googleRefreshToken: 1,
            googleTokenExpiry: 1,
            googleEmail: 1,
            googleConnectedAt: 1,
          },
        });
      }
    } catch (dbErr) {
      console.error("Failed to unset expired Google tokens:", dbErr);
    }

    return res.status(401).json({
      message: "Your Google session has expired or was revoked. Please reconnect your Google Account.",
      isGoogleAuthError: true,
    });
  }

  return res.status(500).json({ message: error.message || defaultMsg });
};

/* =====================================================
   MARK ATTENDANCE
===================================================== */
export const markAttendance = async (req, res) => {
  try {
    const { fullName, email, group, college, classCode } = req.body;

    if (!fullName || !email || !group || !college || !classCode) {
      return res.status(400).json({ message: "All fields required" });
    }

    const foundClass = await Class.findOne({ classCode });
    if (!foundClass) {
      return res.status(404).json({ message: "Invalid class link" });
    }

    if (foundClass.expiresAt && new Date(foundClass.expiresAt) <= new Date()) {
      return res.status(410).json({ message: "Class session has expired" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let student = await Student.findOne({ email: normalizedEmail });

    if (!student) {
      student = await Student.create({
        fullName,
        email: normalizedEmail,
        group,
        college,
      });
    } else {
      student.fullName = fullName;
      student.group = group;
      student.college = college;
      await student.save();
    }

    const alreadyJoined = await Attendance.findOne({
      student: student._id,
      class: foundClass._id,
    });

    if (alreadyJoined) {
      return res.status(200).json({
        message: "Attendance already marked for this class",
        meetLink: foundClass.meetLink,
      });
    }

    const attendanceDoc = await Attendance.create({
      student: student._id,
      class: foundClass._id,
    });
    console.log("Attendance created:", attendanceDoc);

    // Write to Google Sheet (non-critical)
    try {
      const branch = await Branch.findById(foundClass.branch);
      if (branch?.sheetId) {
        const teacher = await Teacher.findById(foundClass.teacher);
        if (teacher?.googleAccessToken) {
          const tokens = {
            access_token: teacher.googleAccessToken,
            refresh_token: teacher.googleRefreshToken,
            expiry_date: teacher.googleTokenExpiry,
          };
          const classDate = new Date().toLocaleDateString("en-IN", {
            day: "2-digit", month: "2-digit", year: "numeric",
          });
          try {
            await markStudentPresent(tokens, branch.sheetId, {
              fullName: student.fullName,
              email: student.email,
              group: student.group,
              college: student.college,
            }, classDate);
          } catch (mErr) {
            const errStr = `${mErr.message || ""} ${mErr.code || ""}`.toLowerCase();
            if (errStr.includes("permission") || errStr.includes("not found") || mErr.code === 403 || mErr.code === 404) {
              console.warn(`[MarkAttendance] Sheet ${branch.sheetId} denied or missing. Auto-creating fresh sheet...`);
              const newSheetId = await createBranchSheet(tokens, branch.name);
              branch.sheetId = newSheetId;
              await branch.save();
              await markStudentPresent(tokens, branch.sheetId, {
                fullName: student.fullName,
                email: student.email,
                group: student.group,
                college: student.college,
              }, classDate);
            } else {
              throw mErr;
            }
          }
        }
      }
    } catch (sheetErr) {
      console.warn("Sheet write failed (non-critical):", sheetErr.message);
    }

    res.status(200).json({
      message: "Attendance marked successfully",
      meetLink: foundClass.meetLink,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   GET RAW CLASS ATTENDANCE
===================================================== */
export const getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await Class.findOne({ _id: classId, teacher: req.user._id });
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found or unauthorized" });
    }

    const attendance = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college")
      .sort({ createdAt: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   SYNC CLASS MEET TELEMETRY (EXIT TRACKING & RECORDING)
===================================================== */
export const syncClassMeetTelemetry = async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await Class.findOne({
      _id: classId,
      teacher: req.user._id,
    });

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found or unauthorized" });
    }

    const teacher = await Teacher.findById(req.user._id);
    if (!teacher || !teacher.googleAccessToken) {
      return res.status(400).json({
        message: "Google account not connected. Please connect your Google account to fetch Meet telemetry.",
      });
    }

    if (!classDoc.meetLink || !classDoc.meetLink.includes("meet.google.com")) {
      return res.status(200).json({
        message: "Class does not have an active Google Meet link",
        syncedCount: 0,
        recordingUrl: classDoc.recordingUrl || "",
        attendance: await Attendance.find({ class: classId }).populate("student", "fullName email group college").sort({ createdAt: -1 }),
      });
    }

    const conferenceRecords = await fetchConferenceRecordsForMeeting(teacher, classDoc.meetLink);
    if (!conferenceRecords || conferenceRecords.length === 0) {
      const existingAtt = await Attendance.find({ class: classId })
        .populate("student", "fullName email group college")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        message: "No Google Meet conference records found yet. Ensure the meeting has started.",
        syncedCount: 0,
        recordingUrl: classDoc.recordingUrl || "",
        attendance: existingAtt,
      });
    }

    const meetParticipants = await aggregateParticipantsFromRecords(teacher, conferenceRecords);

    for (const rec of conferenceRecords) {
      try {
        const recordingInfo = await fetchMeetingRecordings(teacher, rec.name);
        if (recordingInfo?.recordingUrl && recordingInfo.recordingUrl !== classDoc.recordingUrl) {
          classDoc.recordingUrl = recordingInfo.recordingUrl;
          classDoc.recordingFileId = recordingInfo.recordingFileId || "";
          await classDoc.save();

          const teacherTokens = {
            access_token: teacher.googleAccessToken,
            refresh_token: teacher.googleRefreshToken,
          };

          await makeDriveFilePublic(teacherTokens, classDoc.recordingFileId || classDoc.recordingUrl);

          try {
            const branch = await Branch.findById(classDoc.branch);
            if (teacher?.googleAccessToken && branch) {
              if (!branch.sheetId) {
                branch.sheetId = await createBranchSheet(teacherTokens, branch.name);
                await branch.save();
              }
              try {
                await syncBranchRecordingsSheet(teacherTokens, branch.sheetId, classDoc);
              } catch (sheetSyncErr) {
                const errStr = `${sheetSyncErr.message || ""} ${sheetSyncErr.code || ""}`.toLowerCase();
                if (errStr.includes("permission") || errStr.includes("not found") || sheetSyncErr.code === 403 || sheetSyncErr.code === 404) {
                  console.warn(`[TelemetrySync] Branch sheet ${branch.sheetId} denied/missing. Creating fresh sheet...`);
                  branch.sheetId = await createBranchSheet(teacherTokens, branch.name);
                  await branch.save();
                  await syncBranchRecordingsSheet(teacherTokens, branch.sheetId, classDoc);
                } else {
                  throw sheetSyncErr;
                }
              }
            }
          } catch (sheetSyncErr) {
            console.warn("Could not sync recording link to branch sheet:", sheetSyncErr.message);
          }
          break;
        }
      } catch (recErr) {
        console.warn("Error fetching recording info:", recErr.message);
      }
    }

    const attendanceRecords = await Attendance.find({ class: classId }).populate(
      "student",
      "fullName email group college"
    );

    const updates = matchParticipantsToAttendance(
      attendanceRecords,
      meetParticipants,
      classDoc.expiresAt || conferenceRecords[0]?.endTime
    );

    for (const u of updates) {
      await Attendance.findByIdAndUpdate(u.attendanceId, {
        joinedAt: u.joinedAt || undefined,
        leftAt: u.leftAt,
        durationMins: u.durationMins,
        exitStatus: u.exitStatus,
        meetSessions: u.meetSessions,
        lastSyncedAt: u.lastSyncedAt,
      });
    }

    const refreshedAttendance = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: `Successfully synced ${updates.length} participants with Meet telemetry`,
      syncedCount: updates.length,
      recordingUrl: classDoc.recordingUrl || "",
      attendance: refreshedAttendance,
    });
  } catch (error) {
    return handleGoogleApiError(error, req.user._id, res, "Google Meet telemetry sync failed");
  }
};

/* =====================================================
   ATTENDANCE SUMMARY (MEET STYLE)
===================================================== */
export const getAttendanceSummary = async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await Class.findOne({ _id: classId, teacher: req.user._id });
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found or unauthorized" });
    }

    const totalDays = await Attendance.aggregate([
      { $match: { class: new mongoose.Types.ObjectId(classId) } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
        },
      },
    ]);

    const totalClasses = totalDays.length;

    const attendance = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college");

    const map = {};

    attendance.forEach((a) => {
      const s = a.student;
      if (!s) return;

      if (!map[s.email]) {
        map[s.email] = {
          fullName: s.fullName,
          email: s.email,
          group: s.group,
          college: s.college,
          attendedSessions: 1,
        };
      } else {
        map[s.email].attendedSessions += 1;
      }
    });

    const summary = Object.values(map).map((s) => ({
      ...s,
      totalClasses,
      percentage:
        totalClasses === 0
          ? 0
          : Math.round((s.attendedSessions / totalClasses) * 100),
    }));

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   GROUP WISE ATTENDANCE
===================================================== */
export const getGroupWiseAttendance = async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await Class.findOne({ _id: classId, teacher: req.user._id });
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found or unauthorized" });
    }

    const attendance = await Attendance.find({ class: classId })
      .populate("student", "fullName email group");

    const groupWise = {};

    attendance.forEach((a) => {
      const s = a.student;
      if (!s) return;

      if (!groupWise[s.group]) groupWise[s.group] = {};

      if (!groupWise[s.group][s.email]) {
        groupWise[s.group][s.email] = {
          fullName: s.fullName,
          email: s.email,
          attendanceCount: 1,
        };
      } else {
        groupWise[s.group][s.email].attendanceCount += 1;
      }
    });

    const formatted = {};
    for (const g in groupWise) {
      formatted[g] = Object.values(groupWise[g]);
    }

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   COLLEGE -> GROUP WISE ATTENDANCE
===================================================== */
export const getCollegeGroupWiseAttendance = async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await Class.findOne({ _id: classId, teacher: req.user._id });
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found or unauthorized" });
    }

    const attendance = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college");

    const collegeWise = {};

    attendance.forEach((a) => {
      const s = a.student;
      if (!s) return;

      if (!collegeWise[s.college]) collegeWise[s.college] = {};
      if (!collegeWise[s.college][s.group]) collegeWise[s.college][s.group] = {};

      if (!collegeWise[s.college][s.group][s.email]) {
        collegeWise[s.college][s.group][s.email] = {
          fullName: s.fullName,
          email: s.email,
          attendanceCount: 1,
        };
      } else {
        collegeWise[s.college][s.group][s.email].attendanceCount += 1;
      }
    });

    const formatted = {};
    for (const college in collegeWise) {
      formatted[college] = {};
      for (const group in collegeWise[college]) {
        formatted[college][group] = Object.values(collegeWise[college][group]);
      }
    }

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   OVERALL BRANCH ATTENDANCE SUMMARY
===================================================== */
export const getOverallAttendanceSummary = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { branchId } = req.params;
    const { month } = req.query;

    let branchClasses = await Class.find({
      teacher: teacherId,
      branch: branchId,
    }).select("_id className classDate createdAt");

    if (month) {
      branchClasses = branchClasses.filter((c) => {
        const d = c.classDate || (c.createdAt ? c.createdAt.toISOString().slice(0, 10) : "");
        return d.startsWith(month);
      });
    }

    const totalClasses = branchClasses.length;
    const classIds = branchClasses.map((c) => c._id);
    const classMap = Object.fromEntries(branchClasses.map((c) => [c._id.toString(), c.className]));

    const attendance = await Attendance.find({ class: { $in: classIds } })
      .populate("student", "fullName email group college");

    const map = {};

    attendance.forEach((record) => {
      const s = record.student;
      if (!s) return;

      const className = classMap[record.class.toString()] || "Class";

      if (!map[s.email]) {
        map[s.email] = {
          fullName: s.fullName,
          email: s.email,
          group: s.group,
          college: s.college,
          classes: new Set(),
        };
      }

      map[s.email].classes.add(className);
    });

    const denominator = totalClasses || 1;
    const result = Object.values(map)
      .map((s) => ({
        fullName: s.fullName,
        email: s.email,
        group: s.group,
        college: s.college,
        totalClasses: denominator,
        totalClassesJoined: s.classes.size,
        percentage:
          totalClasses === 0
            ? 0
            : Math.min(100, Math.round((s.classes.size / denominator) * 100)),
        classes: [...s.classes],
      }))
      .sort((a, b) => (a.college || "").localeCompare(b.college || ""));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
