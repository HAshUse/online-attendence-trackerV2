import Class from "../models/Class.js";
import Attendance from "../models/Attendance.js";
import Branch from "../models/Branch.js";
import { createMeetLink } from "../services/googleCalendar.js";

/**
 * Helper to parse date & time strings into a Date object in IST (Asia/Kolkata, UTC+05:30)
 * @param {string} dateStr - "YYYY-MM-DD" e.g. "2026-09-29"
 * @param {string} timeStr - "HH:mm" e.g. "20:00"
 * @returns {Date}
 */
export const parseISTDateTime = (dateStr, timeStr) => {
  if (!dateStr) return new Date();
  const t = (timeStr || "23:59").trim();
  const parts = t.split(":");
  const hh = parts[0].padStart(2, "0");
  const mm = (parts[1] || "00").padStart(2, "0");
  const ss = (parts[2] || "00").padStart(2, "0");
  // Always attach +05:30 (IST) offset
  const isoWithIST = `${dateStr.trim()}T${hh}:${mm}:${ss}+05:30`;
  const dt = new Date(isoWithIST);
  return isNaN(dt.getTime()) ? new Date() : dt;
};

export const createClass = async (req, res) => {
  try {
    const { className, subject, classDate, startTime, endTime, meetLink: customMeetLink, expiresAt, branchId, accessType } = req.body;

    if (!className || !subject || !branchId) {
      return res.status(400).json({ message: "Class name, subject, and branch are required" });
    }

    // 🔐 validate branch ownership
    const branch = await Branch.findOne({
      _id: branchId,
      teacher: req.user._id
    });

    if (!branch) {
      return res.status(403).json({ message: "Invalid branch selected" });
    }

    // Determine start & end Datetime in IST (+05:30)
    let startDateTime, endDateTime;
    if (classDate && startTime && endTime) {
      startDateTime = parseISTDateTime(classDate, startTime);
      endDateTime = parseISTDateTime(classDate, endTime);
    } else if (expiresAt) {
      startDateTime = new Date();
      endDateTime = new Date(expiresAt);
    } else {
      startDateTime = new Date();
      endDateTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours default
    }

    // Determine Meet Link: Use custom link if provided, else auto-generate via Google Calendar if connected
    let finalMeetLink = customMeetLink || "";

    if (!finalMeetLink && req.user.googleAccessToken) {
      try {
        finalMeetLink = await createMeetLink(
          req.user,
          `${className} - ${subject}`,
          startDateTime,
          endDateTime,
          `Branch: ${branch.name}`,
          accessType || "open"
        );
      } catch (calendarErr) {
        console.error("Google Calendar Meet link creation failed:", calendarErr.message);
      }
    }

    // Fallback if no meet link was generated or provided
    if (!finalMeetLink) {
      finalMeetLink = "https://meet.google.com/new";
    }

    // 🔢 ensure unique 6 digit code
    let classCode;
    let exists = true;

    while (exists) {
      classCode = Math.floor(100000 + Math.random() * 900000).toString();
      exists = await Class.exists({ classCode });
    }

    const newClass = await Class.create({
      className,
      subject,
      meetLink: finalMeetLink,
      classCode,
      branch: branchId,
      classDate: classDate || "",
      startTime: startTime || "",
      endTime: endTime || "",
      expiresAt: endDateTime,
      accessType: accessType || "open",
      teacher: req.user._id
    });

    res.status(201).json(newClass);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyClasses = async (req, res) => {
  try {
    const teacherId = req.user._id;
    let { branchId } = req.query;

    // base filter → teacher only
    const filter = { teacher: teacherId };

    // ⭐ APPLY BRANCH FILTER ONLY IF VALID
    if (
      branchId &&
      branchId !== "undefined" &&
      branchId !== "null" &&
      branchId.length === 24 // valid Mongo ObjectId
    ) {
      filter.branch = branchId;
    }

    const classes = await Class.find(filter)
      .populate("branch", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(classes);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      className,
      subject,
      meetLink,
      expiresAt,
      branchId,
      classDate,
      startTime,
      endTime,
      accessType,
      regenerateMeet
    } = req.body;

    const classDoc = await Class.findOne({
      _id: id,
      teacher: req.user._id
    });

    if (!classDoc)
      return res.status(404).json({ message: "Class not found or unauthorized" });

    // validate branch change
    if (branchId) {
      const branch = await Branch.findOne({
        _id: branchId,
        teacher: req.user._id
      });

      if (!branch)
        return res.status(403).json({ message: "Invalid branch selected" });

      classDoc.branch = branchId;
    }

    if (className) classDoc.className = className;
    if (subject) classDoc.subject = subject;
    if (accessType) classDoc.accessType = accessType;

    // Handle Timings in IST (+05:30)
    let startDateTime = null;
    let endDateTime = null;

    if (classDate && startTime && endTime) {
      startDateTime = parseISTDateTime(classDate, startTime);
      endDateTime = parseISTDateTime(classDate, endTime);
      classDoc.classDate = classDate;
      classDoc.startTime = startTime;
      classDoc.endTime = endTime;
      classDoc.expiresAt = endDateTime;
    } else if (expiresAt) {
      endDateTime = new Date(expiresAt);
      classDoc.expiresAt = endDateTime;
    }

    // Handle Google Meet Link regeneration if requested
    if (regenerateMeet && req.user.googleAccessToken) {
      try {
        const start = startDateTime || new Date();
        const end = endDateTime || classDoc.expiresAt || new Date(Date.now() + 60 * 60 * 1000);
        const generatedMeet = await createMeetLink(
          req.user,
          `${classDoc.className} - ${classDoc.subject}`,
          start,
          end,
          "Updated Class Session",
          classDoc.accessType || "open"
        );
        if (generatedMeet) {
          classDoc.meetLink = generatedMeet;
        }
      } catch (calErr) {
        console.error("Failed to regenerate Google Meet link:", calErr.message);
      }
    } else if (meetLink) {
      classDoc.meetLink = meetLink;
    }

    await classDoc.save();

    res.json({ message: "Class updated successfully", class: classDoc });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const classDoc = await Class.findOne({
      _id: id,
      teacher: req.user._id
    });

    if (!classDoc)
      return res.status(404).json({ message: "Class not found or unauthorized" });

    await Attendance.deleteMany({ class: id });
    await classDoc.deleteOne();

    res.json({ message: "Class deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getClassByCode = async (req, res) => {
  try {
    const { classCode } = req.params;

    const foundClass = await Class.findOne({ classCode }).populate("branch", "name");

    if (!foundClass) {
      return res.status(404).json({
        message: "Invalid or non-existent class link"
      });
    }

    const isExpired = new Date(foundClass.expiresAt) <= new Date();

    // Note: meetLink is intentionally NOT returned here (public endpoint).
    // It is only returned by POST /attendance/mark after attendance is recorded.
    res.status(200).json({ 
      className: foundClass.className,
      subject: foundClass.subject,
      branch: foundClass.branch?.name || "General",
      branchId: foundClass.branch?._id,
      classDate: foundClass.classDate,
      startTime: foundClass.startTime,
      endTime: foundClass.endTime,
      expiresAt: foundClass.expiresAt,
      isExpired
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSingleClass = async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id).populate("branch", "_id name");

    if (!cls) return res.status(404).json({ message: "Class not found" });

    if (cls.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    res.json(cls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
