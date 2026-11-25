import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  Video,
  Users,
  BookOpen,
  TrendingUp,
  Search,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f97316", "#ef4444", "#14b8a6", "#eab308", "#8b5cf6", "#ec4899"];

function AdminBranchView() {
  const { branchId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "monthly" | "students" | "classes"
  const [selectedMonth, setSelectedMonth] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("ALL");

  // Read-only Class Modal
  const [classModalData, setClassModalData] = useState(null);
  const [classLoading, setClassLoading] = useState(false);

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        setLoading(true);
        const q = selectedMonth ? `?month=${selectedMonth}` : "";
        const res = await API.get(`/admin/branches/${branchId}/analytics${q}`);
        setData(res.data);
      } catch (err) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          navigate("/admin/login");
        }
      } finally {
        setLoading(false);
      }
    };
    if (branchId) fetchBranch();
  }, [branchId, selectedMonth, navigate]);

  const openClassDetails = async (classId) => {
    try {
      setClassLoading(true);
      const res = await API.get(`/admin/classes/${classId}`);
      setClassModalData(res.data);
    } catch {
      setClassModalData(null);
    } finally {
      setClassLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-3 text-[var(--subtext)] text-sm">
        <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
        <span>Loading branch analytics...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-8 text-center text-[var(--subtext)]">
        Branch not found.
      </div>
    );
  }

  const colleges = Array.from(
    new Set((data.studentAnalytics || []).map((s) => s.college).filter(Boolean))
  ).sort();

  const filteredStudents = (data.studentAnalytics || []).filter((s) => {
    const term = studentSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (s.fullName || "").toLowerCase().includes(term) ||
      (s.email || "").toLowerCase().includes(term) ||
      (s.college || "").toLowerCase().includes(term);
    const matchesCol = selectedCollege === "ALL" || s.college === selectedCollege;
    return matchesSearch && matchesCol;
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8 sm:px-6 md:px-10 text-[var(--text)]">
      <div className="max-w-7xl mx-auto">
        {/* OBSERVER BANNER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--primary-light)] border border-[var(--primary)]/25 mb-6">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-[var(--primary)]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              Observer Mode • Owned by <strong>{data.facilitator?.name}</strong> ({data.facilitator?.email})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {data.sheetUrl && (
              <a
                href={data.sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-semibold text-emerald-400 hover:border-emerald-500/40"
              >
                <span>Open Branch Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={() => navigate("/admin")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] hover:border-[var(--border-focus)] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Control Tower</span>
            </button>
          </div>
        </div>

        {/* HEADER & KPI */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] tracking-tight">
              {data.branchName} {data.branchYear ? `(${data.branchYear})` : ""}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--subtext)] mt-1">
              Read-only branch analytics, student percentages, and class recordings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text)]"
            />
            {selectedMonth && (
              <button
                onClick={() => setSelectedMonth("")}
                className="h-10 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-semibold cursor-pointer"
              >
                All Time
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--subtext)] font-semibold">Total Classes</div>
              <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-1">
                {data.totalClasses}
              </div>
            </div>
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--subtext)] font-semibold">Unique Students</div>
              <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-1">
                {data.totalStudents}
              </div>
            </div>
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--subtext)] font-semibold">Total Attendances</div>
              <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-1">
                {data.totalJoinings}
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {[
            { id: "overview", label: "Overview & Trends" },
            { id: "monthly", label: `Month-wise (${data.monthlyStats?.length || 0})` },
            { id: "students", label: `Students (${data.studentAnalytics?.length || 0})` },
            { id: "classes", label: `Classes & Recordings (${data.classes?.length || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === t.id
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--subtext)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h3 className="text-sm font-bold text-[var(--text-heading)] mb-4">
                Daily Attendance Trend
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--subtext)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--subtext)" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                    <Area type="monotone" dataKey="joins" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h3 className="text-sm font-bold text-[var(--text-heading)] mb-4">
                College Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.collegeStats || []}
                      dataKey="students"
                      nameKey="college"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {(data.collegeStats || []).map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* MONTHLY TAB */}
        {activeTab === "monthly" && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[var(--primary-light)] text-[var(--primary)] text-xs font-bold uppercase">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Classes</th>
                  <th className="px-4 py-3">Unique Students</th>
                  <th className="px-4 py-3">Total Joins</th>
                  <th className="px-4 py-3">Avg / Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(data.monthlyStats || []).map((m) => (
                  <tr key={m.month}>
                    <td className="px-4 py-3 font-bold">{m.monthLabel}</td>
                    <td className="px-4 py-3">{m.classesCount}</td>
                    <td className="px-4 py-3">{m.uniqueStudents}</td>
                    <td className="px-4 py-3">{m.totalJoinings}</td>
                    <td className="px-4 py-3">{m.avgAttendance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search student name, email, or college..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-xl"
                />
              </div>
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                className="h-10 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs sm:text-sm"
              >
                <option value="ALL">All Colleges</option>
                {colleges.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[var(--primary-light)] text-[var(--primary)] text-xs font-bold uppercase">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">College</th>
                    <th className="px-4 py-3">Attended</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredStudents.map((s, idx) => (
                    <tr key={s.studentId} className="hover:bg-[var(--bg-secondary)]">
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold">{s.fullName}</td>
                      <td className="px-4 py-3 text-[var(--subtext)]">{s.email}</td>
                      <td className="px-4 py-3">{s.college}</td>
                      <td className="px-4 py-3 font-semibold">
                        {s.attendedClasses} / {s.totalClasses}
                      </td>
                      <td className="px-4 py-3 font-bold">{s.attendanceRate}%</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            s.tier === "Champion"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : s.tier === "Regular"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-rose-500/15 text-rose-400"
                          }`}
                        >
                          {s.tier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CLASSES & RECORDINGS TAB */}
        {activeTab === "classes" && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[var(--primary-light)] text-[var(--primary)] text-xs font-bold uppercase">
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Joins</th>
                  <th className="px-4 py-3">Recording</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(data.classes || []).map((c) => (
                  <tr key={c._id} className="hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-3">
                      <div className="font-bold">{c.className}</div>
                      <div className="text-[11px] text-[var(--subtext)]">
                        {c.subject} • #{c.classCode}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--subtext)]">
                      {c.classDate || "-"} {c.startTime ? `• ${c.startTime}` : ""}
                    </td>
                    <td className="px-4 py-3 font-bold">{c.attendanceCount}</td>
                    <td className="px-4 py-3">
                      {c.recordingUrl ? (
                        <a
                          href={c.recordingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:underline"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Watch</span>
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openClassDetails(c._id)}
                        className="text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                      >
                        View Roster
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* READ-ONLY CLASS ATTENDANCE MODAL */}
      {(classLoading || classModalData) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="fixed inset-0" onClick={() => setClassModalData(null)} />
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto z-10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--text-heading)]">
                {classLoading ? "Loading class roster..." : `${classModalData?.classInfo?.className} — Attendance (${classModalData?.attendance?.length || 0})`}
              </h3>
              <button
                onClick={() => setClassModalData(null)}
                className="p-1 rounded-lg text-[var(--subtext)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!classLoading && classModalData && (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[var(--primary-light)] text-[var(--primary)] font-bold uppercase">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">College</th>
                      <th className="px-3 py-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {(classModalData.attendance || []).map((a, i) => (
                      <tr key={a._id}>
                        <td className="px-3 py-2">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold">{a.student?.fullName}</td>
                        <td className="px-3 py-2 text-[var(--subtext)]">{a.student?.email}</td>
                        <td className="px-3 py-2">{a.student?.college}</td>
                        <td className="px-3 py-2">{a.durationMins ? `${a.durationMins}m` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBranchView;
