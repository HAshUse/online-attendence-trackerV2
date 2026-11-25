import jwt from "jsonwebtoken";
import Teacher from "../models/Teacher.js";
import Branch from "../models/Branch.js";
import Class from "../models/Class.js";
import Attendance from "../models/Attendance.js";
import { getSheetUrl } from "../services/googleSheets.js";

const formatMonthLabel = (yyyyMm) => {
  if (!yyyyMm || yyyyMm.length < 7) return yyyyMm;
  const [y, m] = yyyyMm.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return isNaN(d.getTime())
    ? yyyyMm
    : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

/* POST /api/admin/login */
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  if (!adminEmail || !adminPassword) {
    return res.status(503).json({
      message: "Admin credentials are not configured on the server (set ADMIN_EMAIL and ADMIN_PASSWORD).",
    });
  }

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  if (email.trim().toLowerCase() !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ message: "Invalid admin credentials." });
  }

  const token = jwt.sign(
    { role: "admin", email: adminEmail },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    message: "Admin login successful",
    token,
    admin: { email: adminEmail, role: "admin" },
  });
};

/* GET /api/admin/overview?month=YYYY-MM&facilitatorId=... */
export const getAdminOverview = async (req, res) => {
  try {
    const { month, facilitatorId } = req.query;

    const [teachers, branches, allClasses] = await Promise.all([
      Teacher.find().select("name email googleEmail googleAccessToken googleRefreshToken createdAt"),
      Branch.find().populate("teacher", "name email googleEmail").sort({ createdAt: -1 }),
      Class.find().select("className subject branch teacher classDate recordingUrl createdAt"),
    ]);

    const filteredBranches = facilitatorId
      ? branches.filter((b) => b.teacher?._id?.toString() === facilitatorId)
      : branches;

    let scopedClasses = facilitatorId
      ? allClasses.filter((c) => c.teacher?.toString() === facilitatorId)
      : allClasses;

    if (month) {
      scopedClasses = scopedClasses.filter((c) => {
        const raw = c.classDate || (c.createdAt ? c.createdAt.toISOString().slice(0, 10) : "");
        return raw.slice(0, 7) === month;
      });
    }

    const scopedClassIds = scopedClasses.map((c) => c._id);
    const attendance = await Attendance.find({ class: { $in: scopedClassIds } }).populate(
      "student",
      "fullName email college group"
    );

    const classToBranch = {};
    const classToTeacher = {};
    scopedClasses.forEach((c) => {
      if (c.branch) classToBranch[c._id.toString()] = c.branch.toString();
      if (c.teacher) classToTeacher[c._id.toString()] = c.teacher.toString();
    });

    // Org-wide stats
    const uniqueStudents = new Set();
    const collegeCounts = {};
    const dailyTrendMap = {};
    const branchAttMap = {};
    const branchStudentsMap = {};
    const teacherAttMap = {};
    const teacherStudentsMap = {};

    attendance.forEach((a) => {
      if (!a.student) return;
      const sId = a.student._id.toString();
      const cId = a.class.toString();
      const bId = classToBranch[cId];
      const tId = classToTeacher[cId];

      uniqueStudents.add(sId);
      const col = (a.student.college || "Unknown").trim();
      collegeCounts[col] = (collegeCounts[col] || 0) + 1;

      const day = a.createdAt ? a.createdAt.toISOString().split("T")[0] : "";
      if (day) dailyTrendMap[day] = (dailyTrendMap[day] || 0) + 1;

      if (bId) {
        branchAttMap[bId] = (branchAttMap[bId] || 0) + 1;
        if (!branchStudentsMap[bId]) branchStudentsMap[bId] = new Set();
        branchStudentsMap[bId].add(sId);
      }

      if (tId) {
        teacherAttMap[tId] = (teacherAttMap[tId] || 0) + 1;
        if (!teacherStudentsMap[tId]) teacherStudentsMap[tId] = new Set();
        teacherStudentsMap[tId].add(sId);
      }
    });

    const topCollege =
      Object.entries(collegeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const dailyTrend = Object.keys(dailyTrendMap)
      .sort()
      .map((date) => ({ date, joins: dailyTrendMap[date] }));

    const branchList = filteredBranches.map((b) => {
      const bId = b._id.toString();
      const bClasses = scopedClasses.filter((c) => c.branch?.toString() === bId);
      const bAttCount = branchAttMap[bId] || 0;
      const bStudentCount = branchStudentsMap[bId]?.size || 0;
      const recordingsCount = bClasses.filter((c) => !!c.recordingUrl).length;
      const maxPossible = bClasses.length * bStudentCount;
      const avgRate =
        maxPossible > 0 ? Math.min(100, Math.round((bAttCount / maxPossible) * 100)) : 0;

      return {
        _id: b._id,
        name: b.name,
        year: b.year || "",
        facilitator: b.teacher
          ? { _id: b.teacher._id, name: b.teacher.name, email: b.teacher.email }
          : { _id: null, name: "Unknown", email: "" },
        classesCount: bClasses.length,
        studentsCount: bStudentCount,
        totalAttendances: bAttCount,
        recordingsCount,
        avgRate,
        sheetUrl: b.sheetId ? getSheetUrl(b.sheetId) : null,
      };
    });

    const facilitatorList = teachers
      .map((t) => {
        const tId = t._id.toString();
        const tBranches = branches.filter((b) => b.teacher?._id?.toString() === tId);
        const tClasses = scopedClasses.filter((c) => c.teacher?.toString() === tId);
        const tAttCount = teacherAttMap[tId] || 0;
        const tStudentCount = teacherStudentsMap[tId]?.size || 0;
        const maxPossible = tClasses.length * tStudentCount;
        const avgRate =
          maxPossible > 0 ? Math.min(100, Math.round((tAttCount / maxPossible) * 100)) : 0;

        return {
          _id: t._id,
          name: t.name,
          email: t.email,
          googleConnected: !!(t.googleAccessToken || t.googleRefreshToken),
          googleEmail: t.googleEmail || null,
          branchesCount: tBranches.length,
          classesCount: tClasses.length,
          studentsCount: tStudentCount,
          totalAttendances: tAttCount,
          avgRate,
        };
      })
      .sort((a, b) => b.totalAttendances - a.totalAttendances);

    const orgMaxPossible = branchList.reduce(
      (acc, b) => acc + b.classesCount * b.studentsCount,
      0
    );
    const orgAttendanceRate =
      orgMaxPossible > 0
        ? Math.min(100, Math.round((attendance.length / orgMaxPossible) * 100))
        : 0;

    res.json({
      kpis: {
        totalFacilitators: teachers.length,
        googleConnectedCount: facilitatorList.filter((f) => f.googleConnected).length,
        totalBranches: filteredBranches.length,
        totalClasses: scopedClasses.length,
        totalStudents: uniqueStudents.size,
        totalAttendances: attendance.length,
        orgAttendanceRate,
        topCollege,
      },
      dailyTrend,
      facilitators: facilitatorList,
      branches: branchList,
    });
  } catch (err) {
    console.error("Admin overview error:", err);
    res.status(500).json({ message: "Failed to load admin overview: " + err.message });
  }
};

/* GET /api/admin/branches/:branchId/analytics?month=YYYY-MM */
export const getAdminBranchAnalytics = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { month } = req.query;

    const branch = await Branch.findById(branchId).populate("teacher", "name email googleEmail");
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const branchClasses = await Class.find({ branch: branchId })
      .sort({ createdAt: -1 })
      .select("className subject classCode classDate startTime endTime recordingUrl createdAt");

    const branchClassIds = branchClasses.map((c) => c._id);
    const attendance = await Attendance.find({ class: { $in: branchClassIds } }).populate(
      "student",
      "fullName email college group"
    );

    const uniqueStudents = new Set();
    const collegeStudentMap = {};
    const classJoinCount = {};
    const dailyTrend = {};

    attendance.forEach((a) => {
      if (!a.student) return;
      const sId = a.student._id.toString();
      uniqueStudents.add(sId);

      const col = a.student.college || "Unknown";
      if (!collegeStudentMap[col]) collegeStudentMap[col] = new Set();
      collegeStudentMap[col].add(sId);

      const cId = a.class.toString();
      classJoinCount[cId] = (classJoinCount[cId] || 0) + 1;

      const day = a.createdAt.toISOString().split("T")[0];
      dailyTrend[day] = (dailyTrend[day] || 0) + 1;
    });

    const collegeStats = Object.keys(collegeStudentMap).map((college) => ({
      college,
      students: collegeStudentMap[college].size,
    }));

    const trend = Object.keys(dailyTrend)
      .sort()
      .map((date) => ({ date, joins: dailyTrend[date] }));

    const monthMap = {};
    const classMonthMap = {};

    branchClasses.forEach((cls) => {
      const rawDate = cls.classDate || (cls.createdAt ? cls.createdAt.toISOString().slice(0, 10) : "");
      const monthKey = rawDate.slice(0, 7) || new Date().toISOString().slice(0, 7);
      classMonthMap[cls._id.toString()] = monthKey;
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          monthLabel: formatMonthLabel(monthKey),
          classesCount: 0,
          totalJoinings: 0,
          uniqueStudentIds: new Set(),
        };
      }
      monthMap[monthKey].classesCount++;
    });

    attendance.forEach((a) => {
      const rawDate = a.createdAt ? a.createdAt.toISOString().slice(0, 10) : "";
      const monthKey =
        (a.class && classMonthMap[a.class.toString()]) ||
        rawDate.slice(0, 7) ||
        new Date().toISOString().slice(0, 7);
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          monthLabel: formatMonthLabel(monthKey),
          classesCount: 0,
          totalJoinings: 0,
          uniqueStudentIds: new Set(),
        };
      }
      monthMap[monthKey].totalJoinings++;
      if (a.student?._id) monthMap[monthKey].uniqueStudentIds.add(a.student._id.toString());
    });

    const monthlyStats = Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        month: m.month,
        monthLabel: m.monthLabel,
        classesCount: m.classesCount,
        totalJoinings: m.totalJoinings,
        uniqueStudents: m.uniqueStudentIds.size,
        avgAttendance: m.classesCount > 0 ? Math.round(m.totalJoinings / m.classesCount) : 0,
      }));

    let filteredAttendance = attendance;
    let filteredClassesCount = branchClasses.length;
    if (month) {
      filteredAttendance = attendance.filter(
        (a) => (a.class && classMonthMap[a.class.toString()]) === month
      );
      filteredClassesCount = branchClasses.filter((c) => {
        const raw = c.classDate || (c.createdAt ? c.createdAt.toISOString().slice(0, 10) : "");
        return raw.slice(0, 7) === month;
      }).length;
    }

    const studentMap = {};
    filteredAttendance.forEach((a) => {
      if (!a.student) return;
      const sId = a.student._id.toString();
      if (!studentMap[sId]) {
        studentMap[sId] = {
          studentId: sId,
          fullName: a.student.fullName || "Unknown",
          email: a.student.email || "-",
          college: a.student.college || "Unknown",
          group: a.student.group || "-",
          attendedClasses: 0,
          totalDurationMins: 0,
        };
      }
      studentMap[sId].attendedClasses++;
      studentMap[sId].totalDurationMins += a.durationMins || 0;
    });

    const totalClassesForStudent = filteredClassesCount || 1;
    const studentAnalytics = Object.values(studentMap)
      .map((s) => {
        const attendanceRate = Math.min(
          100,
          Math.round((s.attendedClasses / totalClassesForStudent) * 100)
        );
        let tier = "Champion";
        if (attendanceRate < 50) tier = "Needs Attention";
        else if (attendanceRate < 80) tier = "Regular";
        return {
          ...s,
          totalClasses: totalClassesForStudent,
          attendanceRate,
          tier,
        };
      })
      .sort((a, b) => b.attendanceRate - a.attendanceRate || b.attendedClasses - a.attendedClasses);

    const classes = branchClasses.map((c) => ({
      _id: c._id,
      className: c.className,
      subject: c.subject,
      classCode: c.classCode,
      classDate: c.classDate,
      startTime: c.startTime,
      endTime: c.endTime,
      recordingUrl: c.recordingUrl || "",
      attendanceCount: classJoinCount[c._id.toString()] || 0,
    }));

    res.json({
      branchName: branch.name,
      branchYear: branch.year || "",
      sheetUrl: branch.sheetId ? getSheetUrl(branch.sheetId) : null,
      facilitator: branch.teacher
        ? { _id: branch.teacher._id, name: branch.teacher.name, email: branch.teacher.email }
        : { name: "Unknown", email: "" },
      totalClasses: branchClasses.length,
      totalStudents: uniqueStudents.size,
      totalJoinings: attendance.length,
      collegeStats,
      dailyTrend: trend,
      monthlyStats,
      studentAnalytics,
      classes,
    });
  } catch (err) {
    console.error("Admin branch analytics error:", err);
    res.status(500).json({ message: "Failed to load branch analytics: " + err.message });
  }
};

/* GET /api/admin/classes/:classId (read-only class attendance view) */
export const getAdminClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const classDoc = await Class.findById(classId)
      .populate("teacher", "name email")
      .populate("branch", "name year");

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    const attendance = await Attendance.find({ class: classId })
      .populate("student", "fullName email group college")
      .sort({ createdAt: -1 });

    res.json({ classInfo: classDoc, attendance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* DELETE /api/admin/facilitators/:id (deletes facilitator account only; branches remain intact) */
export const deleteFacilitator = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Teacher.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Facilitator not found" });
    }
    res.json({ message: "Facilitator removed successfully", id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
