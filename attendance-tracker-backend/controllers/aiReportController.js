import Class from "../models/Class.js";
import Attendance from "../models/Attendance.js";
import Teacher from "../models/Teacher.js";
import { cleanAttendanceWithLLM } from "../services/llmAttendanceCleaner.js";
import { sendStakeholderExcelEmail } from "../services/mailer.js";
import { handleGoogleApiError } from "./attendanceController.js";
import XLSX from "xlsx";

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
      dispatchTarget = "download",
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

    if (dispatchTarget === "download") {
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(excelBuffer);
    }

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
    return handleGoogleApiError(err, req.user._id, res, "Failed to clean and dispatch attendance");
  }
};
