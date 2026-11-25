import Class from "../models/Class.js";
import Attendance from "../models/Attendance.js";
import Branch from "../models/Branch.js";
import Teacher from "../models/Teacher.js";
import {
  createBranchSheet,
  syncBranchRecordingsSheet,
  makeDriveFilePublic,
  exportClassAttendanceToSheet,
  exportOverallAttendanceToSheet,
} from "../services/googleSheets.js";
import { handleGoogleApiError } from "./attendanceController.js";
import XLSX from "xlsx";

const sendExcelBuffer = (res, workbook, sheetName, filename) => {
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  return res.send(buffer);
};

export const exportAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { college } = req.query;

    const classDoc = await Class.findOne({ _id: classId, teacher: req.user._id });
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found or unauthorized" });
    }

    let attendance = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college")
      .sort({ createdAt: 1 });

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
      ExitStatus: record.exitStatus || "unknown",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const safeCollege = (college || "all").replace(/[^a-z0-9_\-]/gi, "_");
    return sendExcelBuffer(res, workbook, "Attendance", `attendance_${safeCollege}.xlsx`);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportClassToGoogleSheet = async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await Class.findOne({ _id: classId, teacher: req.user._id }).populate("branch");
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found or unauthorized" });
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

const buildBranchMatrixRegister = async (
  teacherId,
  branchId,
  selectedCollege = null,
  selectedMonth = null
) => {
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

  if (totalClasses === 0) {
    const emptyHeader = ["S.No", "Full Name", "Group", "College", "Total Present", "Total Absent", "Attendance %"];
    return {
      header: emptyHeader,
      matrixRows: [emptyHeader],
      totalClasses: 0,
      studentCount: 0,
    };
  }

  const classHeaders = branchClasses.map((cls, idx) => {
    const dateStr = cls.classDate
      ? cls.classDate
      : cls.createdAt
      ? cls.createdAt.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    const className = cls.className || `Class ${idx + 1}`;
    return `${dateStr} (${className})`;
  });

  const attendanceRecords = await Attendance.find({
    class: { $in: classIds },
  }).populate("student", "fullName email group college");

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

    const studentTotal = totalClasses || 1;
    const absentCount = Math.max(0, studentTotal - presentCount);
    const pct = Math.min(100, Math.round((presentCount / studentTotal) * 100)) + "%";

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

export const exportOverallAttendanceExcel = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { branchId } = req.params;
    const selectedCollege = req.query.college;
    const selectedMonth = req.query.month;

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

    return sendExcelBuffer(res, workbook, "Attendance Register", parts.join("_"));
  } catch (error) {
    console.error("Excel overall export error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const exportOverallToGoogleSheet = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { branchId } = req.params;
    const selectedMonth = req.body?.month || req.query?.month;

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

    const sheetResult = await exportOverallAttendanceToSheet(tokens, title, matrixRows);

    res.json({
      message: "Exported overall attendance register to Google Sheets successfully",
      sheetUrl: sheetResult.sheetUrl,
    });
  } catch (error) {
    return handleGoogleApiError(error, teacherId, res, "Failed to export to Google Sheets");
  }
};

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

    if (!branch.sheetId) {
      const newSheetId = await createBranchSheet(tokens, branch.name);
      branch.sheetId = newSheetId;
      await branch.save();
    }

    const classes = await Class.find({ branch: branchId }).sort({ createdAt: 1 });

    for (const c of classes) {
      const link = c.recordingFileId || c.recordingUrl;
      if (link) {
        await makeDriveFilePublic(tokens, link);
      }
    }

    let result;
    try {
      result = await syncBranchRecordingsSheet(tokens, branch.sheetId, classes);
    } catch (sheetErr) {
      const errStr = `${sheetErr.message || ""} ${sheetErr.code || ""} ${sheetErr.status || ""}`.toLowerCase();
      const isDeniedOrNotFound =
        errStr.includes("permission") ||
        errStr.includes("not have permission") ||
        errStr.includes("not found") ||
        errStr.includes("403") ||
        errStr.includes("404");

      if (isDeniedOrNotFound) {
        console.warn(`[SyncRecordings] Sheet ${branch.sheetId} denied or missing. Auto-creating fresh sheet under current account...`);
        const newSheetId = await createBranchSheet(tokens, branch.name);
        branch.sheetId = newSheetId;
        await branch.save();
        result = await syncBranchRecordingsSheet(tokens, branch.sheetId, classes);
      } else {
        throw sheetErr;
      }
    }

    res.json({
      message: "All branch recordings synced to single Google Sheet",
      sheetUrl: result.sheetUrl,
      syncedCount: result.syncedCount,
    });
  } catch (error) {
    return handleGoogleApiError(error, req.user._id, res, "Failed to sync recordings to Google Sheet");
  }
};
