


import Class from "../models/Class.js";
import Attendance from "../models/Attendance.js";
import Branch from "../models/Branch.js";
import { createMeetLink } from "../services/googleCalendar.js";

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

    // Determine start & end Datetime
    let startDateTime, endDateTime;
    if (classDate && startTime && endTime) {
      startDateTime = new Date(`${classDate}T${startTime}`);
      endDateTime = new Date(`${classDate}T${endTime}`);
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

    // Handle Timings
    let startDateTime = null;
    let endDateTime = null;

    if (classDate && startTime && endTime) {
      startDateTime = new Date(`${classDate}T${startTime}`);
      endDateTime = new Date(`${classDate}T${endTime}`);
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

    res.status(200).json({ 
      className: foundClass.className,
      subject: foundClass.subject,
      branch: foundClass.branch?.name || "General",
      branchId: foundClass.branch?._id,
      expiresAt: foundClass.expiresAt,
      meetLink: foundClass.meetLink,
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
