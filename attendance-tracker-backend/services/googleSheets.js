import { google } from "googleapis";
import { createOAuth2Client } from "../config/googleOAuth.js";

/**
 * Create a new Google Sheet for a branch attendance register.
 * Structure:
 *   Row 1: "S.No" | "Student Name" | "Email" | "Group" | "College" | <date1> | <date2> | ...
 * @param {object} tokens - Teacher's Google tokens
 * @param {string} branchName - Name used as Sheet title
 * @returns {string} spreadsheetId
 */
export const createBranchSheet = async (tokens, branchName) => {
  // Fix #5: fresh client per call — avoids shared singleton credential mutation
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokens.googleAccessToken || tokens.access_token,
    refresh_token: tokens.googleRefreshToken || tokens.refresh_token,
  });
  const sheets = google.sheets({ version: "v4", auth: client });

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
  // Fix #5: fresh client per call
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokens.googleAccessToken || tokens.access_token,
    refresh_token: tokens.googleRefreshToken || tokens.refresh_token,
  });
  const sheets = google.sheets({ version: "v4", auth: client });

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
  // Fix #5: fresh client per call
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokens.googleAccessToken || tokens.access_token,
    refresh_token: tokens.googleRefreshToken || tokens.refresh_token,
  });
  const sheets = google.sheets({ version: "v4", auth: client });

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
    "Join Time",
    "Left Call At",
    "Duration (mins)",
    "Exit Status",
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
    const leftAtStr = record.leftAt
      ? new Date(record.leftAt).toLocaleTimeString()
      : "-";
    const durationMins = record.durationMins || 0;
    const exitStatus = record.exitStatus || "unknown";

    rows.push([
      index + 1,
      record.student.fullName || "Unknown",
      record.student.email || "",
      record.student.group || "",
      record.student.college || "",
      dateStr,
      timeStr,
      leftAtStr,
      durationMins,
      exitStatus,
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
 * Export overall branch attendance matrix register to a Google Sheet
 * @param {object} tokens - Teacher's Google tokens
 * @param {string} branchName - Name of the branch
 * @param {Array<Array>} sheetData - 2D Array [headerRow, ...studentRows]
 * @returns {Promise<{spreadsheetId: string, sheetUrl: string}>}
 */
export const exportOverallAttendanceToSheet = async (tokens, branchName, sheetData) => {
  // Fix #5: fresh client per call
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokens.googleAccessToken || tokens.access_token,
    refresh_token: tokens.googleRefreshToken || tokens.refresh_token,
  });
  const sheets = google.sheets({ version: "v4", auth: client });

  const createRes = await sheets.spreadsheets.create({
    resource: {
      properties: { title: `Overall Attendance — ${branchName}` },
      sheets: [
        {
          properties: { title: "Attendance Register" },
        },
      ],
    },
  });

  const spreadsheetId = createRes.data.spreadsheetId;
  const tabName = "Attendance Register";

  const safeRange = `'${tabName}'!A1`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: safeRange,
    valueInputOption: "USER_ENTERED",
    resource: { values: sheetData },
  });

  // Apply styling & conditional formatting (Green for P, Red for A, Header styling)
  try {
    const sheetIdNum = createRes.data.sheets[0].properties.sheetId;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          // Freeze header row
          {
            updateSheetProperties: {
              properties: {
                sheetId: sheetIdNum,
                gridProperties: { frozenRowCount: 1 },
              },
              fields: "gridProperties.frozenRowCount",
            },
          },
          // Header row styling (Dark navy background, bold white text)
          {
            repeatCell: {
              range: {
                sheetId: sheetIdNum,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.125, green: 0.18, blue: 0.35 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  horizontalAlignment: "CENTER",
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
            },
          },
          // Conditional format rule for "P" (Present - Soft Green)
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [
                  {
                    sheetId: sheetIdNum,
                    startRowIndex: 1,
                    startColumnIndex: 4,
                  },
                ],
                booleanRule: {
                  condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "P" }] },
                  format: {
                    backgroundColor: { red: 0.85, green: 0.92, blue: 0.83 },
                    textFormat: { bold: true, foregroundColor: { red: 0.15, green: 0.31, blue: 0.07 } },
                  },
                },
              },
              index: 0,
            },
          },
          // Conditional format rule for "A" (Absent - Soft Red)
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [
                  {
                    sheetId: sheetIdNum,
                    startRowIndex: 1,
                    startColumnIndex: 4,
                  },
                ],
                booleanRule: {
                  condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "A" }] },
                  format: {
                    backgroundColor: { red: 0.95, green: 0.8, blue: 0.8 },
                    textFormat: { bold: true, foregroundColor: { red: 0.45, green: 0.1, blue: 0.28 } },
                  },
                },
              },
              index: 1,
            },
          },
        ],
      },
    });
  } catch (styleErr) {
    console.warn("Could not apply Sheet styles (non-critical):", styleErr.message);
  }

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

/**
 * Sync recordings from a branch into a single master "Recordings" tab
 * inside the branch's Google Spreadsheet.
 *
 * @param {object} tokens - Teacher's Google tokens
 * @param {string} spreadsheetId - Branch's Google Spreadsheet ID
 * @param {Array<object>|object} classes - Array of class documents or single classDoc
 * @returns {object} { spreadsheetId, sheetUrl, syncedCount }
 */
export const syncBranchRecordingsSheet = async (tokens, spreadsheetId, classes = []) => {
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokens.googleAccessToken || tokens.access_token,
    refresh_token: tokens.googleRefreshToken || tokens.refresh_token,
  });
  const sheets = google.sheets({ version: "v4", auth: client });

  const classList = Array.isArray(classes) ? classes : [classes];

  // 1. Get spreadsheet metadata to check if "Recordings" tab exists
  let meta;
  try {
    meta = await sheets.spreadsheets.get({ spreadsheetId });
  } catch (err) {
    const error = new Error(`Could not access Google Sheet (${spreadsheetId}): ${err.message}`);
    error.status = err.status || err.response?.status;
    error.code = err.code || err.response?.status;
    throw error;
  }

  const sheetList = meta.data.sheets || [];
  let recordingsSheet = sheetList.find(
    (s) => (s.properties.title || "").toLowerCase() === "recordings"
  );

  let recordingsSheetId = recordingsSheet ? recordingsSheet.properties.sheetId : null;

  // If "Recordings" tab does not exist, create it
  if (!recordingsSheet) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: "Recordings",
                gridProperties: { frozenRowCount: 1 },
              },
            },
          },
        ],
      },
    });
    recordingsSheetId = addRes.data.replies?.[0]?.addSheet?.properties?.sheetId || 0;
  }

  // 2. Read existing data from "Recordings" tab
  const range = `'Recordings'!A:Z`;
  let existingValues = [];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    existingValues = res.data.values || [];
  } catch (readErr) {
    console.warn("Could not read Recordings tab:", readErr.message);
  }

  const headers = [
    "S.No",
    "Class Date",
    "Class Name",
    "Subject",
    "Class Code",
    "Meet Link",
    "Drive Recording Link",
    "Status",
    "Last Synced",
  ];

  if (existingValues.length === 0 || !existingValues[0] || existingValues[0].length === 0) {
    existingValues = [headers];
  }

  // Map existing rows by Class Code or Meet Link (Col 4 is Class Code, Col 5 is Meet Link)
  const rows = [...existingValues];

  for (const c of classList) {
    const classCode = String(c.classCode || "").trim();
    const meetLink = String(c.meetLink || "").trim();
    const recordingUrl = String(c.recordingUrl || "").trim();
    const classDate = c.classDate || (c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "-");
    const className = c.className || "Class";
    const subject = c.subject || "-";
    const status = recordingUrl ? "Recorded" : (c.autoRecord ? "Pending / Processing" : "Not Recorded");
    const lastSynced = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Look for existing row (skip header at index 0)
    let rowIndex = rows.findIndex((r, idx) => {
      if (idx === 0) return false;
      const rowCode = String(r[4] || "").trim();
      const rowMeet = String(r[5] || "").trim();
      return (classCode && rowCode === classCode) || (meetLink && rowMeet === meetLink);
    });

    if (rowIndex > 0) {
      // Update existing row
      rows[rowIndex][1] = classDate;
      rows[rowIndex][2] = className;
      rows[rowIndex][3] = subject;
      rows[rowIndex][4] = classCode;
      rows[rowIndex][5] = meetLink;
      if (recordingUrl) {
        rows[rowIndex][6] = recordingUrl;
        rows[rowIndex][7] = "Recorded";
      }
      rows[rowIndex][8] = lastSynced;
    } else {
      // Append new row
      const nextSNo = rows.length;
      rows.push([
        nextSNo,
        classDate,
        className,
        subject,
        classCode,
        meetLink,
        recordingUrl || "-",
        status,
        lastSynced,
      ]);
    }
  }

  // 3. Write rows back to "Recordings" tab
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'Recordings'!A1:I${rows.length}`,
    valueInputOption: "USER_ENTERED",
    resource: { values: rows },
  });

  // 4. Apply clean header formatting and freeze if sheet was freshly created
  if (recordingsSheetId !== null) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: recordingsSheetId,
                  gridProperties: { frozenRowCount: 1 },
                },
                fields: "gridProperties.frozenRowCount",
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: recordingsSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.15, green: 0.15, blue: 0.28 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                    horizontalAlignment: "CENTER",
                  },
                },
                fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
              },
            },
          ],
        },
      });
    } catch (styleErr) {
      // non-critical
    }
  }

  return {
    spreadsheetId,
    sheetUrl: `${getSheetUrl(spreadsheetId)}#gid=${recordingsSheetId || 0}`,
    syncedCount: classList.length,
  };
};

/**
 * Update Google Drive file permission so that anyone with the link can view.
 * @param {object} tokens - Teacher's Google OAuth tokens
 * @param {string} fileIdOrUrl - Google Drive file ID or full URL
 * @returns {Promise<boolean>}
 */
export const makeDriveFilePublic = async (tokens, fileIdOrUrl) => {
  if (!fileIdOrUrl || !tokens) return false;

  let fileId = String(fileIdOrUrl).trim();
  const match = fileId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || fileId.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) {
    fileId = match[1];
  }

  // Basic validation on file ID
  if (!fileId || fileId.length < 5 || fileId.includes("/") || fileId.includes("http")) {
    return false;
  }

  try {
    const client = createOAuth2Client();
    client.setCredentials({
      access_token: tokens.googleAccessToken || tokens.access_token,
      refresh_token: tokens.googleRefreshToken || tokens.refresh_token,
    });

    const drive = google.drive({ version: "v3", auth: client });
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
    console.log(`[DrivePermissions] File ${fileId} set to view for anyone with link.`);
    return true;
  } catch (err) {
    console.warn(`[DrivePermissions] Could not set public permission on file ${fileId}:`, err.message);
    return false;
  }
};
