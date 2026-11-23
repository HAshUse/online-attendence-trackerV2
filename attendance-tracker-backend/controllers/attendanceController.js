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
  exportClassAttendanceToSheet,
  exportOverallAttendanceToSheet,
  getSheetUrl,
} from "../services/googleSheets.js";
import {
  fetchConferenceRecordsForMeeting,
  fetchAllParticipantSessions,
  aggregateParticipantsFromRecords,
  fetchMeetingRecordings,
  matchParticipantsToAttendance,
} from "../services/googleMeetTelemetry.js";
import { cleanAttendanceWithLLM } from "../services/llmAttendanceCleaner.js";
import { sendStakeholderExcelEmail } from "../services/mailer.js";
import XLSX from "xlsx";
import fs from "fs";

/**
 * Gracefully handles Google API errors (specifically invalid_grant / expired tokens)
 * Auto-unsets stale tokens in MongoDB and instructs frontend to prompt reconnection.
 */
const handleGoogleApiError = async (error, teacherId, res, defaultMsg) => {
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

    // 🔍 Find class
    const foundClass = await Class.findOne({ classCode });
    if (!foundClass) {
      return res.status(404).json({ message: "Invalid class link" });
    }

    // 👤 Find or create student
    let student = await Student.findOne({ email });

    if (!student) {
      student = await Student.create({
        fullName,
        email,
        group,
        college
      });
    } else {
      student.fullName = fullName;
      student.group = group;
      student.college = college;
      await student.save();
    }

    // 🚫 Check if student already joined THIS class
    const alreadyJoined = await Attendance.findOne({
      student: student._id,
      class: foundClass._id
    });

    if (alreadyJoined) {
      return res.status(200).json({
        message: "Attendance already marked for this class",
        meetLink: foundClass.meetLink
      });
    }

    // ✅ First time joining this class
    const attendanceDoc = await Attendance.create({
      student: student._id,
      class: foundClass._id
    });
    console.log("Attendance created:", attendanceDoc);

    // 📊 Write to Google Sheet (non-critical)
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
            day: "2-digit", month: "2-digit", year: "numeric"
          });
          await markStudentPresent(tokens, branch.sheetId, {
            fullName: student.fullName,
            email: student.email,
            group: student.group,
            college: student.college,
          }, classDate);
        }
      }
    } catch (sheetErr) {
      console.warn("Sheet write failed (non-critical):", sheetErr.message);
    }

    res.status(200).json({
      message: "Attendance marked successfully",
      meetLink: foundClass.meetLink
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

    const attendance = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college")
      .sort({ createdAt: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const exportAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { college } = req.query; // 👈 important

    let attendance = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college")
      .sort({ createdAt: 1 });

    // 🔥 FILTER BY COLLEGE
    if (college) {
      attendance = attendance.filter(
        (record) => record.student && record.student.college === college
      );
    }

    if (!attendance.length) {
      return res.status(404).json({ message: "No attendance data found" });
    }

    const data = attendance.map((record, index) => ({
      SNo: index + 1,
      FullName: record.student.fullName,
      Email: record.student.email,
      Group: record.student.group,
      College: record.student.college,
      Date: record.createdAt.toLocaleDateString(),
      Time: record.createdAt.toLocaleTimeString(),
      LeftCallAt: record.leftAt ? new Date(record.leftAt).toLocaleTimeString() : "-",
      DurationMins: record.durationMins || 0,
      ExitStatus: record.exitStatus || "unknown"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    // Fix #4: Unique filename per request prevents concurrent export corruption
    const safeCollege = (college || "all").replace(/[^a-z0-9_\-]/gi, "_");
    const filePath = `attendance_${safeCollege}_${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`;
    XLSX.writeFile(workbook, filePath);

    res.download(filePath, () => fs.unlinkSync(filePath));
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
        attendance: await Attendance.find({ class: classId }).populate("student", "fullName email group college").sort({ createdAt: -1 })
      });
    }

    // 1. Fetch conference records for this class
    const conferenceRecords = await fetchConferenceRecordsForMeeting(teacher, classDoc.meetLink);
    if (!conferenceRecords || conferenceRecords.length === 0) {
      const existingAtt = await Attendance.find({ class: classId })
        .populate("student", "fullName email group college")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        message: "No Google Meet conference records found yet. Ensure the meeting has started.",
        syncedCount: 0,
        recordingUrl: classDoc.recordingUrl || "",
        attendance: existingAtt
      });
    }

    // 2. Fetch all participants and individual sessions across all conference records for this space
    const meetParticipants = await aggregateParticipantsFromRecords(teacher, conferenceRecords);

    // 3. Fetch recordings if any
    for (const rec of conferenceRecords) {
      try {
        const recordingInfo = await fetchMeetingRecordings(teacher, rec.name);
        if (recordingInfo?.recordingUrl && recordingInfo.recordingUrl !== classDoc.recordingUrl) {
          classDoc.recordingUrl = recordingInfo.recordingUrl;
          classDoc.recordingFileId = recordingInfo.recordingFileId || "";
          await classDoc.save();

          // Auto-sync this recording link into the branch's single Google Sheet
          try {
            const branch = await Branch.findById(classDoc.branch);
            if (branch?.sheetId && teacher?.googleAccessToken) {
              await syncBranchRecordingsSheet(
                {
                  access_token: teacher.googleAccessToken,
                  refresh_token: teacher.googleRefreshToken,
                },
                branch.sheetId,
                classDoc
              );
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

    // 4. Fetch local attendance records
    const attendanceRecords = await Attendance.find({ class: classId }).populate(
      "student",
      "fullName email group college"
    );

    // 5. Match participants
    const updates = matchParticipantsToAttendance(
      attendanceRecords,
      meetParticipants,
      classDoc.expiresAt || conferenceRecords[0]?.endTime
    );

    // 6. Save updates to MongoDB
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

    // 7. Return refreshed attendance
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
   EXPORT CLASS ATTENDANCE TO GOOGLE SHEETS
===================================================== */
export const exportClassToGoogleSheet = async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await Class.findById(classId).populate("branch");
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    const teacher = await Teacher.findById(req.user._id);
    if (!teacher || !teacher.googleAccessToken) {
      return res.status(400).json({
        message: "Please connect your Google Account first from the top-right profile menu to export to Google Sheets.",
      });
    }

    const attendanceRecords = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college")
      .sort({ createdAt: 1 });

    if (!attendanceRecords.length) {
      return res.status(404).json({ message: "No attendance records found to export" });
    }

    const tokens = {
      googleAccessToken: teacher.googleAccessToken,
      googleRefreshToken: teacher.googleRefreshToken,
    };

    const sheetResult = await exportClassAttendanceToSheet(
      tokens,
      `${classDoc.className} - ${classDoc.subject}`,
      attendanceRecords
    );

    res.json({
      message: "Exported to Google Sheets successfully",
      sheetUrl: sheetResult.sheetUrl,
    });
  } catch (error) {
    return handleGoogleApiError(error, req.user._id, res, "Google Sheets export failed");
  }
};


/* =====================================================
   ATTENDANCE SUMMARY (MEET STYLE)
===================================================== */
export const getAttendanceSummary = async (req, res) => {
  try {
    const { classId } = req.params;

    // total sessions = unique dates
    const totalDays = await Attendance.aggregate([
      { $match: { class: new mongoose.Types.ObjectId(classId) } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          }
        }
      }
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
          attendedSessions: 1
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
          : Math.round((s.attendedSessions / totalClasses) * 100)
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

    const attendance = await Attendance.find({ class: classId })
      .populate("student", "fullName email group");

    const groupWise = {};

    attendance.forEach((a) => {
      const s = a.student;
      if (!s) return;

      if (!groupWise[s.group]) {
        groupWise[s.group] = {};
      }

      if (!groupWise[s.group][s.email]) {
        groupWise[s.group][s.email] = {
          fullName: s.fullName,
          email: s.email,
          attendanceCount: 1
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
   COLLEGE → GROUP WISE ATTENDANCE
===================================================== */
export const getCollegeGroupWiseAttendance = async (req, res) => {
  try {
    const { classId } = req.params;

    const attendance = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college");

    const collegeWise = {};

    attendance.forEach((a) => {
      const s = a.student;
      if (!s) return;

      if (!collegeWise[s.college]) {
        collegeWise[s.college] = {};
      }

      if (!collegeWise[s.college][s.group]) {
        collegeWise[s.college][s.group] = {};
      }

      if (!collegeWise[s.college][s.group][s.email]) {
        collegeWise[s.college][s.group][s.email] = {
          fullName: s.fullName,
          email: s.email,
          attendanceCount: 1
        };
      } else {
        collegeWise[s.college][s.group][s.email].attendanceCount += 1;
      }
    });

    const formatted = {};
    for (const college in collegeWise) {
      formatted[college] = {};
      for (const group in collegeWise[college]) {
        formatted[college][group] = Object.values(
          collegeWise[college][group]
        );
      }
    }

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const getOverallAttendanceSummary = async (req, res) => {
//   try {
//     const teacherId = req.user._id;

//     const attendance = await Attendance.find()
//       .populate({
//         path: "class",
//         match: { teacher: teacherId }, // ✅ teacher isolation
//         select: "className"
//       })
//       .populate("student", "fullName email group college");

//     // ❗ remove records of other teachers
//     const filtered = attendance.filter(a => a.class && a.student);

//     const map = {};

//     filtered.forEach(record => {
//       const s = record.student;
//       const c = record.class;

//       if (!map[s.email]) {
//         map[s.email] = {
//           fullName: s.fullName,
//           email: s.email,
//           group: s.group,
//           college: s.college,
//           classes: new Set()
//         };
//       }

//       map[s.email].classes.add(c.className);
//     });

//     const result = Object.values(map)
//       .map(s => ({
//         fullName: s.fullName,
//         email: s.email,
//         group: s.group,
//         college: s.college,
//         totalClassesJoined: s.classes.size,
//         classes: [...s.classes]
//       }))
//       .sort((a, b) =>
//         (a.college || "").localeCompare(b.college || "")
//       );

//     res.status(200).json(result);

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };


// export const exportOverallAttendanceExcel = async (req, res) => {
//   try {
//     const teacherId = req.user._id;
//     const selectedCollege = req.query.college; // ⭐ NEW

//     const attendance = await Attendance.find()
//       .populate({
//         path: "class",
//         match: { teacher: teacherId },
//         select: "className"
//       })
//       .populate("student", "fullName email group college");

//     const filtered = attendance.filter(a => a.class && a.student);

//     const map = {};

//     filtered.forEach(r => {
//       const s = r.student;

//       // ⭐ FILTER BY COLLEGE
//       if (selectedCollege && s.college !== selectedCollege) return;

//       const date = r.createdAt.toISOString().split("T")[0];
//       const header = `${date} - ${r.class.className}`;

//       if (!map[s.email]) {
//         map[s.email] = {
//           FullName: s.fullName,
//           Email: s.email,
//           Group: s.group,
//           College: s.college,
//           classes: new Set()
//         };
//       }

//       map[s.email].classes.add(header);
//     });

//     const rows = Object.values(map).map(student => ({
//       FullName: student.FullName,
//       Email: student.Email,
//       Group: student.Group,
//       College: student.College,
//       TotalClassesJoined: student.classes.size,
//       Classes: Array.from(student.classes).join(", ")
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(rows);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

//     const fileName = selectedCollege
//       ? `${selectedCollege}_attendance.xlsx`
//       : `overall_attendance.xlsx`;

//     XLSX.writeFile(workbook, fileName);
//     res.download(fileName, () => fs.unlinkSync(fileName));

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };


export const getOverallAttendanceSummary = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { branchId } = req.params;
    const { month } = req.query; // YYYY-MM e.g. "2026-11"

    // Fix #8: Pre-filter by class IDs — avoids loading the entire Attendance collection
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

    const result = Object.values(map)
      .map((s) => ({
        fullName: s.fullName,
        email: s.email,
        group: s.group,
        college: s.college,
        totalClasses,
        totalClassesJoined: s.classes.size,
        percentage:
          totalClasses === 0
            ? 0
            : Math.round((s.classes.size / totalClasses) * 100),
        classes: [...s.classes],
      }))
      .sort((a, b) => (a.college || "").localeCompare(b.college || ""));

    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const exportOverallAttendanceExcel = async (req, res) => {
//   try {
//     const teacherId = req.user._id;
//     const { branchId } = req.params;
//     const selectedCollege = req.query.college;

//     const attendance = await Attendance.find()
//       .populate({
//         path: "class",
//         match: { teacher: teacherId, branch: branchId }, // ⭐ branch filter
//         select: "className"
//       })
//       .populate("student", "fullName email group college");

//     const filtered = attendance.filter(a => a.class && a.student);

//     const map = {};

//     filtered.forEach(r => {
//       const s = r.student;

//       if (selectedCollege && s.college !== selectedCollege) return;

//       const date = r.createdAt.toISOString().split("T")[0];
//       const header = `${date} - ${r.class.className}`;

//       if (!map[s.email]) {
//         map[s.email] = {
//           FullName: s.fullName,
//           Email: s.email,
//           Group: s.group,
//           College: s.college,
//           classes: new Set()
//         };
//       }

//       map[s.email].classes.add(header);
//     });

//     const rows = Object.values(map).map(student => ({
//       FullName: student.FullName,
//       Email: student.Email,
//       Group: student.Group,
//       College: student.College,
//       TotalClassesJoined: student.classes.size,
//       Classes: Array.from(student.classes).join(", ")
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(rows);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

//     const fileName = selectedCollege
//       ? `${selectedCollege}_${branchId}_attendance.xlsx`
//       : `branch_${branchId}_attendance.xlsx`;

//     XLSX.writeFile(workbook, fileName);
//     res.download(fileName, () => fs.unlinkSync(fileName));

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
/* =====================================================
   HELPER: BUILD MATRIX REGISTER DATA FOR OVERALL BRANCH
===================================================== */
const buildBranchMatrixRegister = async (
  teacherId,
  branchId,
  selectedCollege = null,
  selectedMonth = null
) => {
  // 1. Fetch all classes in branch sorted chronologically
  let branchClasses = await Class.find({
    teacher: teacherId,
    branch: branchId,
  })
    .sort({ createdAt: 1 })
    .select("_id className classDate createdAt");

  if (selectedMonth) {
    branchClasses = branchClasses.filter((cls) => {
      const d = cls.classDate || (cls.createdAt ? cls.createdAt.toISOString().slice(0, 10) : "");
      return d.startsWith(selectedMonth);
    });
  }

  const totalClasses = branchClasses.length;
  const classIds = branchClasses.map((c) => c._id);

  // If no classes found for the branch / month
  if (totalClasses === 0) {
    const emptyHeader = ["S.No", "Full Name", "Group", "College", "Total Present", "Total Absent", "Attendance %"];
    return {
      header: emptyHeader,
      matrixRows: [emptyHeader],
      totalClasses: 0,
      studentCount: 0,
    };
  }

  // Column header titles for classes: "2026-09-11 (Class 1)"
  const classHeaders = branchClasses.map((cls, idx) => {
    const dateStr = cls.classDate
      ? cls.classDate
      : cls.createdAt
      ? cls.createdAt.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    const className = cls.className || `Class ${idx + 1}`;
    return `${dateStr} (${className})`;
  });

  // 2. Fetch all attendance records for these classes
  const attendanceRecords = await Attendance.find({
    class: { $in: classIds },
  }).populate("student", "fullName email group college");

  // 3. Build student map
  const map = {};

  attendanceRecords.forEach((record) => {
    const s = record.student;
    if (!s) return;

    if (selectedCollege && s.college !== selectedCollege) return;

    const emailKey = (s.email || "").trim().toLowerCase();
    if (!emailKey) return;

    if (!map[emailKey]) {
      map[emailKey] = {
        fullName: s.fullName || "Unknown",
        email: s.email || "",
        group: s.group || "",
        college: s.college || "",
        attendedClasses: new Set(),
      };
    }

    if (record.class) {
      map[emailKey].attendedClasses.add(record.class.toString());
    }
  });

  // 4. Build Header Row and Data Rows
  const header = [
    "S.No",
    "Full Name",
    "Group",
    "College",
    ...classHeaders,
    "Total Present",
    "Total Absent",
    "Attendance %",
  ];

  const sortedStudents = Object.values(map).sort((a, b) =>
    (a.fullName || "").localeCompare(b.fullName || "")
  );

  const matrixRows = [header];

  sortedStudents.forEach((student, idx) => {
    let presentCount = 0;

    const statusCells = branchClasses.map((cls) => {
      const isPresent = student.attendedClasses.has(cls._id.toString());
      if (isPresent) {
        presentCount++;
        return "P";
      }
      return "A";
    });

    const absentCount = totalClasses - presentCount;
    const pct =
      totalClasses === 0
        ? "0%"
        : Math.round((presentCount / totalClasses) * 100) + "%";

    matrixRows.push([
      idx + 1,
      student.fullName,
      student.group,
      student.college,
      ...statusCells,
      presentCount,
      absentCount,
      pct,
    ]);
  });

  return { header, matrixRows, totalClasses, studentCount: sortedStudents.length };
};

/* =====================================================
   EXPORT OVERALL ATTENDANCE TO EXCEL (MATRIX REGISTER)
===================================================== */
export const exportOverallAttendanceExcel = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { branchId } = req.params;
    const selectedCollege = req.query.college;
    const selectedMonth = req.query.month; // e.g. "2026-11"

    const branch = await Branch.findOne({ _id: branchId, teacher: teacherId });
    const branchName = branch?.name || "branch";

    const { matrixRows, totalClasses } = await buildBranchMatrixRegister(
      teacherId,
      branchId,
      selectedCollege,
      selectedMonth
    );

    if (totalClasses === 0) {
      return res.status(404).json({ message: "No classes found for the selected period" });
    }

    const worksheet = XLSX.utils.aoa_to_sheet(matrixRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Register");

    const parts = [branchName.replace(/\s+/g, "_")];
    if (selectedCollege) parts.push(selectedCollege.replace(/\s+/g, "_"));
    if (selectedMonth) parts.push(selectedMonth);
    parts.push("attendance.xlsx");

    const fileName = parts.join("_");

    XLSX.writeFile(workbook, fileName);
    res.download(fileName, () => {
      try {
        fs.unlinkSync(fileName);
      } catch (e) {}
    });
  } catch (error) {
    console.error("Excel overall export error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   EXPORT OVERALL ATTENDANCE TO GOOGLE SHEETS (MATRIX REGISTER)
===================================================== */
export const exportOverallToGoogleSheet = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { branchId } = req.params;
    const selectedMonth = req.body?.month || req.query?.month; // e.g. "2026-11"

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.googleAccessToken) {
      return res.status(400).json({
        message: "Please connect your Google Account first to export to Google Sheets.",
      });
    }

    const branch = await Branch.findOne({ _id: branchId, teacher: teacherId });
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const { matrixRows, studentCount, totalClasses } = await buildBranchMatrixRegister(
      teacherId,
      branchId,
      null,
      selectedMonth
    );

    if (totalClasses === 0) {
      return res.status(404).json({ message: "No classes found for the selected period" });
    }

    if (studentCount === 0) {
      return res.status(404).json({ message: "No attendance records found for this branch" });
    }

    const tokens = {
      googleAccessToken: teacher.googleAccessToken,
      googleRefreshToken: teacher.googleRefreshToken,
    };

    let title = branch.name;
    if (selectedMonth) {
      const [year, month] = selectedMonth.split("-");
      const monthLabel = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
      title += ` (${monthLabel})`;
    }

    const sheetResult = await exportOverallAttendanceToSheet(
      tokens,
      title,
      matrixRows
    );

    res.json({
      message: "Exported overall attendance register to Google Sheets successfully",
      sheetUrl: sheetResult.sheetUrl,
    });
  } catch (error) {
    return handleGoogleApiError(error, teacherId, res, "Failed to export to Google Sheets");
  }
};

/* =====================================================
   SYNC ALL BRANCH RECORDINGS TO SINGLE GOOGLE SHEET
===================================================== */
export const syncBranchRecordingsToGoogleSheet = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { branchId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.googleAccessToken) {
      return res.status(400).json({
        message: "Please connect your Google Account first to sync with Google Sheets.",
      });
    }

    const branch = await Branch.findOne({ _id: branchId, teacher: teacherId });
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const tokens = {
      googleAccessToken: teacher.googleAccessToken,
      googleRefreshToken: teacher.googleRefreshToken,
    };

    // If branch doesn't have a master Google Sheet yet, create one
    if (!branch.sheetId) {
      const newSheetId = await createBranchSheet(tokens, branch.name);
      branch.sheetId = newSheetId;
      await branch.save();
    }

    // Fetch all classes for this branch
    const classes = await Class.find({ branch: branchId }).sort({ createdAt: 1 });

    const result = await syncBranchRecordingsSheet(tokens, branch.sheetId, classes);

    res.json({
      message: "All branch recordings synced to single Google Sheet",
      sheetUrl: result.sheetUrl,
      syncedCount: result.syncedCount,
    });
  } catch (error) {
    return handleGoogleApiError(error, req.user._id, res, "Failed to sync recordings to Google Sheet");
  }
};

/* =====================================================
   AI DATA CLEANING & STAKEHOLDER DISPATCH
===================================================== */

/**
 * Preview cleaned and normalized attendance data before dispatching.
 */
export const aiPreviewCleanedAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { requirements = "", selectedColumns = [] } = req.body;

    const classDoc = await Class.findOne({ _id: classId, teacher: req.user._id });
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found or unauthorized" });
    }

    const attendanceRecords = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college")
      .sort({ createdAt: -1 });

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(400).json({ message: "No attendance records available to clean" });
    }

    const result = await cleanAttendanceWithLLM({
      records: attendanceRecords,
      requirements,
      selectedColumns,
    });

    res.json({
      success: true,
      summary: result.summary,
      records: result.records,
      engine: result.engine,
      className: classDoc.className,
      totalCount: result.records.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to preview cleaned attendance" });
  }
};

/**
 * Clean attendance data using LLM and dispatch to Excel download, Stakeholder Email, or Google Sheet.
 */
export const aiCleanAndDispatchAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const {
      requirements = "",
      selectedColumns = [],
      dispatchTarget = "download", // "download" | "email" | "google_sheet"
      stakeholderEmails = "",
      subject = "",
    } = req.body;

    const classDoc = await Class.findOne({ _id: classId, teacher: req.user._id });
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found or unauthorized" });
    }

    const attendanceRecords = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college")
      .sort({ createdAt: -1 });

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(400).json({ message: "No attendance records available to clean" });
    }

    const cleaned = await cleanAttendanceWithLLM({
      records: attendanceRecords,
      requirements,
      selectedColumns,
    });

    // Column label mapping
    const colLabels = {
      sNo: "S.No",
      fullName: "Student Name",
      email: "Email Address",
      college: "College / Institution",
      group: "Group / Dept",
      joinedAt: "Joined Time",
      leftAt: "Left Call At",
      durationMins: "Duration (Mins)",
      status: "Attendance Status",
      engagement: "Engagement Category",
      stakeholderNotes: "Notes / Engagement Flag",
    };

    const activeCols = selectedColumns.length > 0
      ? selectedColumns
      : ["sNo", "fullName", "email", "college", "group", "joinedAt", "leftAt", "durationMins", "status", "engagement", "stakeholderNotes"];

    // Format tabular data for Excel
    const formattedRows = cleaned.records.map((r, i) => {
      const row = {};
      activeCols.forEach((colKey) => {
        const header = colLabels[colKey] || colKey;
        row[header] = r[colKey] !== undefined ? r[colKey] : (colKey === "sNo" ? i + 1 : "-");
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Attendance");
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const safeClassName = (classDoc.className || "Attendance").replace(/[^a-z0-9_\-]/gi, "_");
    const filename = `${safeClassName}_Cleaned_Report.xlsx`;

    // 1. DIRECT DOWNLOAD
    if (dispatchTarget === "download") {
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(excelBuffer);
    }

    // 2. EMAIL DISPATCH TO STAKEHOLDERS
    if (dispatchTarget === "email") {
      if (!stakeholderEmails || !stakeholderEmails.trim()) {
        return res.status(400).json({ message: "Please provide at least one stakeholder recipient email." });
      }

      await sendStakeholderExcelEmail(
        stakeholderEmails,
        subject || `📊 Cleaned Attendance Report — ${classDoc.className}`,
        cleaned.summary,
        excelBuffer,
        filename
      );

      return res.json({
        success: true,
        message: `Successfully sent cleaned report to ${stakeholderEmails}`,
        summary: cleaned.summary,
        engine: cleaned.engine,
        recordCount: cleaned.records.length,
      });
    }

    // 3. EXPORT TO GOOGLE SHEET
    if (dispatchTarget === "google_sheet") {
      const teacher = await Teacher.findById(req.user._id);
      if (!teacher?.googleAccessToken) {
        return res.status(400).json({
          message: "Google account not connected. Please connect your Google account in Settings to export to Google Sheets.",
        });
      }

      const client = (await import("../config/googleOAuth.js")).createOAuth2Client();
      client.setCredentials({
        access_token: teacher.googleAccessToken,
        refresh_token: teacher.googleRefreshToken,
      });
      const sheets = (await import("googleapis")).google.sheets({ version: "v4", auth: client });

      const headerRow = activeCols.map((c) => colLabels[c] || c);
      const dataRows = cleaned.records.map((r, i) =>
        activeCols.map((colKey) => (r[colKey] !== undefined ? String(r[colKey]) : (colKey === "sNo" ? String(i + 1) : "-")))
      );

      const createRes = await sheets.spreadsheets.create({
        resource: {
          properties: { title: `Cleaned Attendance — ${classDoc.className}` },
          sheets: [{ properties: { title: "Cleaned Report" } }],
        },
      });

      const spreadsheetId = createRes.data.spreadsheetId;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Cleaned Report!A1",
        valueInputOption: "USER_ENTERED",
        resource: { values: [headerRow, ...dataRows] },
      });

      return res.json({
        success: true,
        message: "Successfully created stakeholder Google Sheet",
        sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        summary: cleaned.summary,
        engine: cleaned.engine,
      });
    }

    return res.status(400).json({ message: "Invalid dispatch target specified." });
  } catch (err) {
    console.error("AI clean and dispatch error:", err);
    res.status(500).json({ message: err.message || "Failed to clean and dispatch attendance" });
  }
};


