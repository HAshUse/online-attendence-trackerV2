import Class from "../models/Class.js";
import Attendance from "../models/Attendance.js";
import Branch from "../models/Branch.js";

const formatMonthLabel = (yyyyMm) => {
  if (!yyyyMm || yyyyMm.length < 7) return yyyyMm;
  const [y, m] = yyyyMm.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return isNaN(d.getTime()) ? yyyyMm : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export const getBranchAnalytics = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { month } = req.query; // optional filter e.g. "2026-11"
    const teacherId = req.user._id;

    /* ================= 1. GET CURRENT BRANCH & ALL TEACHER BRANCHES ================= */
    const [branch, allTeacherBranches, allTeacherClasses] = await Promise.all([
      Branch.findById(branchId).select("name year"),
      Branch.find({ teacher: teacherId }).select("name year"),
      Class.find({ teacher: teacherId }),
    ]);

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    /* ================= 2. CLASSES FOR CURRENT BRANCH ================= */
    const branchClasses = allTeacherClasses.filter(
      (c) => c.branch && c.branch.toString() === branchId.toString()
    );
    const branchClassIds = branchClasses.map((c) => c._id);

    /* ================= 3. ATTENDANCE FOR CURRENT BRANCH ================= */
    const attendance = await Attendance.find({
      class: { $in: branchClassIds },
    }).populate("student", "fullName email college group");

    /* ================= 4. BASIC STATS & COLLEGE DISTRIBUTION ================= */
    const uniqueStudents = new Set();
    const collegeStudentMap = {};
    const classJoinCount = {};
    const dailyTrend = {};

    attendance.forEach((a) => {
      if (!a.student) return;
      const studentId = a.student._id.toString();
      uniqueStudents.add(studentId);

      const college = a.student.college || "Unknown";
      if (!collegeStudentMap[college]) {
        collegeStudentMap[college] = new Set();
      }
      collegeStudentMap[college].add(studentId);

      const classId = a.class.toString();
      classJoinCount[classId] = (classJoinCount[classId] || 0) + 1;

      const day = a.createdAt.toISOString().split("T")[0];
      dailyTrend[day] = (dailyTrend[day] || 0) + 1;
    });

    let topCollege = null;
    let maxCollegeCount = 0;
    for (const college in collegeStudentMap) {
      const count = collegeStudentMap[college].size;
      if (count > maxCollegeCount) {
        maxCollegeCount = count;
        topCollege = college;
      }
    }

    let activeClassId = null;
    let activeMax = 0;
    for (const cid in classJoinCount) {
      if (classJoinCount[cid] > activeMax) {
        activeMax = classJoinCount[cid];
        activeClassId = cid;
      }
    }
    const activeClass = branchClasses.find((c) => c._id.toString() === activeClassId);

    const collegeStats = Object.keys(collegeStudentMap).map((college) => ({
      college,
      students: collegeStudentMap[college].size,
    }));

    const trend = Object.keys(dailyTrend)
      .sort()
      .map((date) => ({
        date,
        joins: dailyTrend[date],
      }));

    /* ================= 5. MONTH-WISE ATTENDANCE ANALYSIS ================= */
    const monthMap = {};

    // Map classes to months
    branchClasses.forEach((cls) => {
      const rawDate = cls.classDate || (cls.createdAt ? cls.createdAt.toISOString().slice(0, 10) : "");
      const monthKey = rawDate.slice(0, 7) || new Date().toISOString().slice(0, 7);
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          monthLabel: formatMonthLabel(monthKey),
          classesCount: 0,
          totalJoinings: 0,
          uniqueStudentIds: new Set(),
          totalDurationMins: 0,
          completedSessions: 0,
          leftEarlySessions: 0,
        };
      }
      monthMap[monthKey].classesCount++;
    });

    // Map attendance to months
    attendance.forEach((a) => {
      const rawDate = a.createdAt ? a.createdAt.toISOString().slice(0, 10) : "";
      const monthKey = rawDate.slice(0, 7) || new Date().toISOString().slice(0, 7);
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          monthLabel: formatMonthLabel(monthKey),
          classesCount: 0,
          totalJoinings: 0,
          uniqueStudentIds: new Set(),
          totalDurationMins: 0,
          completedSessions: 0,
          leftEarlySessions: 0,
        };
      }
      monthMap[monthKey].totalJoinings++;
      if (a.student?._id) {
        monthMap[monthKey].uniqueStudentIds.add(a.student._id.toString());
      }
      monthMap[monthKey].totalDurationMins += a.durationMins || 0;
      if (a.exitStatus === "completed") monthMap[monthKey].completedSessions++;
      if (a.exitStatus === "left_early") monthMap[monthKey].leftEarlySessions++;
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
        totalDurationMins: m.totalDurationMins,
        completedSessions: m.completedSessions,
        leftEarlySessions: m.leftEarlySessions,
      }));

    /* ================= 6. STUDENT-WISE ANALYTICS ================= */
    let filteredAttendance = attendance;
    let filteredClassesCount = branchClasses.length;

    if (month) {
      filteredAttendance = attendance.filter(
        (a) => (a.createdAt ? a.createdAt.toISOString().slice(0, 7) : "") === month
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
          completedCount: 0,
          leftEarlyCount: 0,
          lastSeenAt: a.createdAt,
        };
      }
      studentMap[sId].attendedClasses++;
      studentMap[sId].totalDurationMins += a.durationMins || 0;
      if (a.exitStatus === "completed") studentMap[sId].completedCount++;
      if (a.exitStatus === "left_early") studentMap[sId].leftEarlyCount++;
      if (a.createdAt > studentMap[sId].lastSeenAt) {
        studentMap[sId].lastSeenAt = a.createdAt;
      }
    });

    const effectiveTotalClasses = Math.max(1, filteredClassesCount);
    const studentAnalytics = Object.values(studentMap)
      .map((s) => {
        const attendanceRate = Math.min(100, Math.round((s.attendedClasses / effectiveTotalClasses) * 100));
        let tier = "Champion";
        if (attendanceRate < 50) tier = "Needs Attention";
        else if (attendanceRate < 80) tier = "Regular";

        return {
          ...s,
          totalClasses: filteredClassesCount,
          attendanceRate,
          tier,
        };
      })
      .sort((a, b) => b.attendedClasses - a.attendedClasses || b.attendanceRate - a.attendanceRate);

    /* ================= 7. BRANCH-WISE COMPARISON ANALYTICS ================= */
    const allTeacherClassIds = allTeacherClasses.map((c) => c._id);
    const allTeacherAttendance = await Attendance.find({
      class: { $in: allTeacherClassIds },
    }).select("class student");

    const classToBranchMap = {};
    allTeacherClasses.forEach((c) => {
      if (c.branch) classToBranchMap[c._id.toString()] = c.branch.toString();
    });

    const branchComparison = allTeacherBranches.map((b) => {
      const bIdStr = b._id.toString();
      const bClasses = allTeacherClasses.filter((c) => c.branch && c.branch.toString() === bIdStr);
      const bAtts = allTeacherAttendance.filter(
        (a) => a.class && classToBranchMap[a.class.toString()] === bIdStr
      );
      const bUniqueStudents = new Set(bAtts.map((a) => (a.student ? a.student.toString() : ""))).size;

      return {
        branchId: b._id,
        branchName: b.name,
        year: b.year || "",
        totalClasses: bClasses.length,
        totalStudents: bUniqueStudents,
        totalAttendances: bAtts.length,
        avgClassAttendance: bClasses.length > 0 ? Math.round(bAtts.length / bClasses.length) : 0,
        isCurrent: bIdStr === branchId.toString(),
      };
    }).sort((a, b) => b.totalAttendances - a.totalAttendances);

    /* ================= 8. UNIFIED RESPONSE ================= */
    res.json({
      branchName: branch.name || "Branch",
      branchYear: branch.year || "",
      totalClasses: branchClasses.length,
      totalStudents: uniqueStudents.size,
      totalJoinings: attendance.length,

      collegeStats,
      topCollege,
      mostActiveClass: activeClass?.className || "N/A",
      dailyTrend: trend,

      // 🌟 Enhanced Analytics Dimensions
      monthlyStats,
      studentAnalytics,
      branchComparison,
      selectedMonth: month || "",
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({ message: "Analytics error: " + err.message });
  }
};
