import { google } from "googleapis";
import oauth2Client from "../config/googleOAuth.js";

/**
 * Create a new Google Sheet for a branch attendance register.
 * Structure:
 *   Row 1: "S.No" | "Student Name" | "Email" | "Group" | "College" | <date1> | <date2> | ...
 * @param {object} tokens - Teacher's Google tokens
 * @param {string} branchName - Name used as Sheet title
 * @returns {string} spreadsheetId
 */
export const createBranchSheet = async (tokens, branchName) => {
  oauth2Client.setCredentials({
    access_token: tokens.googleAccessToken || tokens.access_token,
    refresh_token: tokens.googleRefreshToken || tokens.refresh_token,
  });
  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  const response = await sheets.spreadsheets.create({
    resource: {
      properties: { title: `Attendance — ${branchName}` },
      sheets: [
        {
          properties: { title: "Attendance" },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: "S.No" } },
                    { userEnteredValue: { stringValue: "Student Name" } },
                    { userEnteredValue: { stringValue: "Email" } },
                    { userEnteredValue: { stringValue: "Group" } },
                    { userEnteredValue: { stringValue: "College" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  });

  return response.data.spreadsheetId;
};

/**
 * Mark a student as Present (P) in the sheet for a given date column.
 * Dynamically detects column positions (S.No, Student Name, Email, Group, College)
 * and automatically heals any shifted/misplaced rows.
 * @param {object} tokens
 * @param {string} spreadsheetId
 * @param {object} student - { fullName, email, group, college }
 * @param {string} classDate - e.g. "26/09/2026"
 */
export const markStudentPresent = async (
  tokens,
  spreadsheetId,
  student,
  classDate
) => {
  oauth2Client.setCredentials({
    access_token: tokens.googleAccessToken || tokens.access_token,
    refresh_token: tokens.googleRefreshToken || tokens.refresh_token,
  });
  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  // 1. Get first tab name
  let tabName = "Attendance";
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    if (meta.data.sheets && meta.data.sheets.length > 0) {
      tabName = meta.data.sheets[0].properties.title || "Attendance";
    }
  } catch (err) {
    console.warn("Could not read sheet metadata:", err.message);
  }

  // 2. Read full sheet
  const safeTabRange = `'${tabName}'!A:ZZ`;
  const sheetRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: safeTabRange,
  });

  let rows = sheetRes.data.values || [];

  if (rows.length === 0 || !rows[0] || rows[0].length === 0) {
    rows = [["S.No", "Student Name", "Email", "Group", "College"]];
  }

  const headerRow = rows[0];

  // Helper to dynamically find column index
  const findCol = (names) => {
    return headerRow.findIndex(
      (h) =>
        typeof h === "string" &&
        names.some((n) => h.trim().toLowerCase() === n.toLowerCase())
    );
  };

  let snoColIndex = findCol(["S.No", "SNo", "#", "Sl.No", "Serial No", "Sl No"]);
  let nameColIndex = findCol(["Student Name", "FullName", "Full Name", "Name"]);
  let emailColIndex = findCol(["Email", "Student Email", "Email Address"]);
  let groupColIndex = findCol(["Group", "Branch", "Class Group", "Section"]);
  let collegeColIndex = findCol(["College", "College Name", "Institution"]);

  // Fallback defaults
  if (emailColIndex === -1) {
    emailColIndex = snoColIndex !== -1 ? 2 : 1;
  }
  if (nameColIndex === -1) {
    nameColIndex = snoColIndex !== -1 ? 1 : 0;
  }
  if (groupColIndex === -1) {
    groupColIndex = emailColIndex + 1;
  }
  if (collegeColIndex === -1) {
    collegeColIndex = groupColIndex + 1;
  }

  // 3. Auto-Repair any historically shifted rows where student name was placed in S.No column
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;

    // If Col 0 is a name (non-numeric string) and Col 1 is an email, shift columns to align with header
    if (
      snoColIndex === 0 &&
      emailColIndex === 2 &&
      typeof r[1] === "string" &&
      r[1].includes("@") &&
      typeof r[0] === "string" &&
      !/^\d+$/.test(r[0].trim())
    ) {
      const repaired = [];
      repaired[0] = i; // S.No
      repaired[1] = r[0] || ""; // Name
      repaired[2] = r[1] || ""; // Email
      repaired[3] = r[2] || ""; // Group
      repaired[4] = r[3] || ""; // College

      // Copy remaining columns (like date checkmarks)
      for (let c = 4; c < r.length; c++) {
        if (r[c]) repaired[c] = r[c];
      }
      rows[i] = repaired;
    }
  }

  // 4. Find or create the date column + paired time column
  const timeColHeader = `Time (${classDate})`;

  let dateColIndex = headerRow.findIndex(
    (h) => typeof h === "string" && h.trim() === classDate.trim()
  );

  let timeColIndex = headerRow.findIndex(
    (h) => typeof h === "string" && h.trim() === timeColHeader
  );

  if (dateColIndex === -1) {
    // Add date column
    headerRow.push(classDate);
    dateColIndex = headerRow.length - 1;

    // Add paired time column immediately after
    headerRow.push(timeColHeader);
    timeColIndex = headerRow.length - 1;
  } else if (timeColIndex === -1) {
    // Date col exists but no time col yet — insert after date col
    timeColIndex = dateColIndex + 1;
    headerRow.splice(timeColIndex, 0, timeColHeader);

    // Shift all data rows to match the new header layout
    for (let i = 1; i < rows.length; i++) {
      rows[i].splice(timeColIndex, 0, "");
    }
  }

  // 5. Capture current join time
  const now = new Date();
  const joinTime = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // 6. Find existing student row by Email (case-insensitive)
  const studentEmail = (student.email || "").trim().toLowerCase();
  let studentRowIndex = rows.findIndex((row, i) => {
    if (i === 0) return false;
    if (row[emailColIndex] && typeof row[emailColIndex] === "string") {
      if (row[emailColIndex].trim().toLowerCase() === studentEmail) return true;
    }
    return row.some(
      (cell) =>
        typeof cell === "string" && cell.trim().toLowerCase() === studentEmail
    );
  });

  if (studentRowIndex === -1) {
    // New student row
    const newRow = new Array(Math.max(headerRow.length, timeColIndex + 1)).fill("");
    if (snoColIndex !== -1) {
      newRow[snoColIndex] = rows.length; // S.No
    }
    if (nameColIndex !== -1) newRow[nameColIndex] = student.fullName || "";
    if (emailColIndex !== -1) newRow[emailColIndex] = student.email || "";
    if (groupColIndex !== -1) newRow[groupColIndex] = student.group || "";
    if (collegeColIndex !== -1) newRow[collegeColIndex] = student.college || "";

    newRow[dateColIndex] = "P";
    newRow[timeColIndex] = joinTime;
    rows.push(newRow);
  } else {
    // Existing student row — align and mark Present
    const row = rows[studentRowIndex];

    while (row.length <= Math.max(dateColIndex, timeColIndex)) {
      row.push("");
    }

    if (snoColIndex !== -1 && (!row[snoColIndex] || isNaN(row[snoColIndex]))) {
      row[snoColIndex] = studentRowIndex;
    }
    if (nameColIndex !== -1 && (!row[nameColIndex] || row[nameColIndex] === student.email)) {
      row[nameColIndex] = student.fullName || "";
    }
    if (emailColIndex !== -1 && !row[emailColIndex]) row[emailColIndex] = student.email || "";
    if (groupColIndex !== -1 && !row[groupColIndex]) row[groupColIndex] = student.group || "";
    if (collegeColIndex !== -1 && !row[collegeColIndex]) row[collegeColIndex] = student.college || "";

    row[dateColIndex] = "P";
    // Only write time if not already set (preserve the original join time)
    if (!row[timeColIndex]) {
      row[timeColIndex] = joinTime;
    }
  }

  // 7. Ensure all rows have equal column width
  const maxLen = headerRow.length;
  rows.forEach((r) => {
    while (r.length < maxLen) {
      r.push("");
    }
  });

  // 8. Write entire sheet back
  const updateRange = `'${tabName}'!A1`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: updateRange,
    valueInputOption: "USER_ENTERED",
    resource: { values: rows },
  });
};

/**
 * Export full class attendance records to a dedicated Google Sheet
 * @param {object} tokens - Teacher's Google tokens
 * @param {string} sheetTitle - Title for the spreadsheet
 * @param {Array} attendanceRecords - Array of populated attendance documents
 * @returns {Promise<{spreadsheetId: string, sheetUrl: string}>}
 */
export const exportClassAttendanceToSheet = async (
  tokens,
  sheetTitle,
  attendanceRecords
) => {
  oauth2Client.setCredentials({
    access_token: tokens.googleAccessToken || tokens.access_token,
    refresh_token: tokens.googleRefreshToken || tokens.refresh_token,
  });
  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  const createRes = await sheets.spreadsheets.create({
    resource: {
      properties: { title: `Attendance — ${sheetTitle}` },
      sheets: [
        {
          properties: { title: "Class Attendance" },
        },
      ],
    },
  });

  const spreadsheetId = createRes.data.spreadsheetId;
  const tabName = "Class Attendance";

  const header = [
    "S.No",
    "Student Name",
    "Email",
    "Group",
    "College",
    "Date",
    "Time",
    "Status",
  ];

  const rows = [header];

  attendanceRecords.forEach((record, index) => {
    if (!record.student) return;
    const dateStr = record.createdAt
      ? new Date(record.createdAt).toLocaleDateString()
      : new Date().toLocaleDateString();
    const timeStr = record.createdAt
      ? new Date(record.createdAt).toLocaleTimeString()
      : "";

    rows.push([
      index + 1,
      record.student.fullName || "Unknown",
      record.student.email || "",
      record.student.group || "",
      record.student.college || "",
      dateStr,
      timeStr,
      "PRESENT",
    ]);
  });

  const safeRange = `'${tabName}'!A1`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: safeRange,
    valueInputOption: "USER_ENTERED",
    resource: { values: rows },
  });

  return {
    spreadsheetId,
    sheetUrl: getSheetUrl(spreadsheetId),
  };
};

/**
 * Export overall branch attendance summary to a Google Sheet
 * @param {object} tokens - Teacher's Google tokens
 * @param {string} branchName - Name of the branch
 * @param {Array} rows - Array of student summary objects
 * @returns {Promise<{spreadsheetId: string, sheetUrl: string}>}
 */
export const exportOverallAttendanceToSheet = async (tokens, branchName, rows) => {
  oauth2Client.setCredentials({
    access_token: tokens.googleAccessToken || tokens.access_token,
    refresh_token: tokens.googleRefreshToken || tokens.refresh_token,
  });
  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  const createRes = await sheets.spreadsheets.create({
    resource: {
      properties: { title: `Overall Attendance — ${branchName}` },
      sheets: [
        {
          properties: { title: "Overall Summary" },
        },
      ],
    },
  });

  const spreadsheetId = createRes.data.spreadsheetId;
  const tabName = "Overall Summary";

  const header = [
    "S.No",
    "Full Name",
    "Email",
    "Group",
    "College",
    "Total Classes",
    "Total Classes Joined",
    "Attendance %",
    "Classes Attended",
  ];

  const sheetData = [header];

  rows.forEach((student, index) => {
    sheetData.push([
      index + 1,
      student.FullName || "",
      student.Email || "",
      student.Group || "",
      student.College || "",
      student.TotalClasses || 0,
      student.TotalClassesJoined || 0,
      student.AttendancePercentage || "0%",
      student.Classes || "",
    ]);
  });

  const safeRange = `'${tabName}'!A1`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: safeRange,
    valueInputOption: "USER_ENTERED",
    resource: { values: sheetData },
  });

  return {
    spreadsheetId,
    sheetUrl: getSheetUrl(spreadsheetId),
  };
};

/**
 * Get the public URL for a spreadsheet
 */
export const getSheetUrl = (spreadsheetId) =>
  `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
