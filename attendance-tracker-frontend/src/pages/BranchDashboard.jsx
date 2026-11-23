import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronRight,
  ArrowLeft,
  TrendingUp,
  Building2,
  BookOpen,
  Users,
  Zap,
  Flame,
  Calendar,
  Layers,
  Sparkles,
  GraduationCap,
  BarChart3,
} from "lucide-react";
import API from "../services/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  LabelList,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f97316", "#ef4444", "#14b8a6", "#eab308", "#8b5cf6", "#ec4899"];

/* Custom Tooltip for Daily Attendance Area Chart */
function CustomTrendTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-[11px] font-semibold text-[var(--subtext)] mb-1 flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-[var(--primary)]" />
          <span>{label}</span>
        </p>
        <p className="text-xs sm:text-sm font-extrabold text-[var(--text)] m-0 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          <span>Attendances:</span>
          <span className="text-indigo-400 font-black">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
}

/* Custom Tooltip for College Donut Chart */
function CustomPieTooltip({ active, payload, total }) {
  if (active && payload && payload.length) {
    const d = payload[0];
    const pct = total ? ((d.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[150px]">
        <p className="text-xs font-bold text-[var(--text)] mb-1.5 truncate border-b border-[var(--border)] pb-1">
          {d.name}
        </p>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-[var(--subtext)]">Enrolled:</span>
          <span className="font-extrabold text-[var(--text)]">{d.value}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs mt-1">
          <span className="text-[var(--subtext)]">Share:</span>
          <span className="font-extrabold text-emerald-400">{pct}%</span>
        </div>
      </div>
    );
  }
  return null;
}

/* Custom Tooltip for Month-wise Bar Chart */
function CustomMonthlyTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] p-3.5 rounded-2xl shadow-2xl backdrop-blur-md min-w-[180px]">
        <p className="text-xs font-bold text-[var(--text)] mb-2.5 flex items-center gap-1.5 border-b border-[var(--border)] pb-2">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span>{label}</span>
        </p>
        <div className="space-y-2">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[var(--subtext)]">{entry.name}:</span>
              </div>
              <span className="font-extrabold text-[var(--text)] text-sm">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function BranchDashboard() {
  const { branchId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "monthly" | "students" | "branches"
  
  // Student filter controls
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState("ALL");
  const [selectedTierFilter, setSelectedTierFilter] = useState("ALL");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState("");

  /* ================= FETCH ANALYTICS ================= */
  const fetchAnalytics = async (monthQuery = "") => {
    try {
      setLoading(true);
      const url = `/branches/${branchId}/analytics${monthQuery ? `?month=${monthQuery}` : ""}`;
      const res = await API.get(url);

      setData({
        branchName: res.data.branchName || "Branch",
        branchYear: res.data.branchYear || "",
        totalClasses: res.data.totalClasses || 0,
        totalStudents: res.data.totalStudents || 0,
        totalJoinings: res.data.totalJoinings || 0,
        collegeStats: res.data.collegeStats || [],
        topCollege: res.data.topCollege || null,
        mostActiveClass: res.data.mostActiveClass || null,
        dailyTrend: res.data.dailyTrend || [],
        monthlyStats: res.data.monthlyStats || [],
        studentAnalytics: res.data.studentAnalytics || [],
        branchComparison: res.data.branchComparison || [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) fetchAnalytics(selectedMonthFilter);
  }, [branchId, selectedMonthFilter]);

  if (loading && !data) {
    return (
      <div className="p-5 sm:p-8 bg-[var(--bg)] min-h-screen text-[var(--text)] transition-colors duration-200">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3.5 text-[var(--subtext)]">
          <div className="w-9 h-9 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-5 sm:p-8 bg-[var(--bg)] min-h-screen text-[var(--text)] transition-colors duration-200">
        <h2 className="text-xl font-bold text-center mt-12">No analytics data found</h2>
      </div>
    );
  }

  const hasCollegeData = data.collegeStats && data.collegeStats.length > 0;
  const hasDailyData = data.dailyTrend && data.dailyTrend.length > 0;
  const hasMonthlyData = data.monthlyStats && data.monthlyStats.length > 0;
  const hasStudentData = data.studentAnalytics && data.studentAnalytics.length > 0;
  const totalCollegeStudents = data.collegeStats.reduce((acc, curr) => acc + (curr.students || 0), 0) || 1;

  // Filter students based on search and dropdowns
  const filteredStudents = (data.studentAnalytics || []).filter((s) => {
    const term = studentSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      s.fullName.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.college.toLowerCase().includes(term);

    const matchesCollege = selectedCollegeFilter === "ALL" || s.college === selectedCollegeFilter;
    const matchesTier = selectedTierFilter === "ALL" || s.tier === selectedTierFilter;

    return matchesSearch && matchesCollege && matchesTier;
  });

  return (
    <div className="p-5 sm:p-8 bg-[var(--bg)] min-h-screen text-[var(--text)] transition-colors duration-200">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--subtext)] mb-4">
        <Link to="/branches" className="hover:text-[var(--primary)] transition-colors">
          Branches
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/dashboard/${branchId}`} className="hover:text-[var(--primary)] transition-colors">
          {data.branchName}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[var(--text)]">Analytics Suite</span>
      </div>

      {/* HEADER */}
      <div className="flex items-start sm:items-center justify-between mb-6 gap-4 flex-col sm:flex-row flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-[var(--text)] tracking-tight m-0">
              {data.branchName} Analytics
            </h2>
            {data.branchYear && (
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[var(--primary-light)] text-[var(--primary)] border border-indigo-500/20">
                {data.branchYear}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[var(--subtext)] mt-1">
            Month-wise attendance trends, student metrics, and cross-branch analytics
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            className="py-2 px-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)] text-[var(--text)] text-xs font-semibold cursor-pointer transition-all"
            onClick={() => navigate(`/overall-attendance/${branchId}`)}
          >
            📋 Overall Register
          </button>
          <button
            className="py-2 px-4 rounded-xl cursor-pointer font-semibold text-xs sm:text-sm transition-all duration-200 inline-flex items-center gap-1.5 bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white shadow-md hover:-translate-y-0.5"
            onClick={() => navigate(`/dashboard/${branchId}`)}
          >
            Manage Classes →
          </button>
        </div>
      </div>

      {/* TOP STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm flex items-center gap-3.5 hover:border-[var(--border-focus)] transition-all">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11px] font-bold text-[var(--subtext)] uppercase tracking-wider mb-0.5">Classes</h3>
            <p className="text-xl font-black text-[var(--text)] m-0">{data.totalClasses}</p>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm flex items-center gap-3.5 hover:border-[var(--border-focus)] transition-all">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11px] font-bold text-[var(--subtext)] uppercase tracking-wider mb-0.5">Students</h3>
            <p className="text-xl font-black text-[var(--text)] m-0">{data.totalStudents}</p>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm flex items-center gap-3.5 hover:border-[var(--border-focus)] transition-all">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/15 border border-amber-500/25 text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11px] font-bold text-[var(--subtext)] uppercase tracking-wider mb-0.5">Attendances</h3>
            <p className="text-xl font-black text-[var(--text)] m-0">{data.totalJoinings}</p>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm flex items-center gap-3.5 hover:border-[var(--border-focus)] transition-all">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-cyan-500/15 border border-cyan-500/25 text-cyan-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11px] font-bold text-[var(--subtext)] uppercase tracking-wider mb-0.5">Top College</h3>
            <p className="text-xs font-bold text-[var(--text)] m-0 truncate">{data.topCollege || "No Data"}</p>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm flex items-center gap-3.5 hover:border-[var(--border-focus)] transition-all">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-purple-500/15 border border-purple-500/25 text-purple-400">
            <Flame className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11px] font-bold text-[var(--subtext)] uppercase tracking-wider mb-0.5">Active Class</h3>
            <p className="text-xs font-bold text-[var(--text)] m-0 truncate">{data.mostActiveClass || "No Activity"}</p>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 mb-6 border-b border-[var(--border)] pb-2 overflow-x-auto">
        <button
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-0 ${
            activeTab === "overview"
              ? "bg-[var(--primary)] text-white shadow-md shadow-indigo-500/25"
              : "bg-transparent text-[var(--subtext)] hover:text-[var(--text)] hover:bg-[var(--card)]"
          }`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview & Trends
        </button>

        <button
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-0 ${
            activeTab === "monthly"
              ? "bg-[var(--primary)] text-white shadow-md shadow-indigo-500/25"
              : "bg-transparent text-[var(--subtext)] hover:text-[var(--text)] hover:bg-[var(--card)]"
          }`}
          onClick={() => setActiveTab("monthly")}
        >
          📅 Month-wise Analysis
        </button>

        <button
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-0 ${
            activeTab === "students"
              ? "bg-[var(--primary)] text-white shadow-md shadow-indigo-500/25"
              : "bg-transparent text-[var(--subtext)] hover:text-[var(--text)] hover:bg-[var(--card)]"
          }`}
          onClick={() => setActiveTab("students")}
        >
          🎓 Student-wise Analytics ({data.studentAnalytics?.length || 0})
        </button>

        <button
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-0 ${
            activeTab === "branches"
              ? "bg-[var(--primary)] text-white shadow-md shadow-indigo-500/25"
              : "bg-transparent text-[var(--subtext)] hover:text-[var(--text)] hover:bg-[var(--card)]"
          }`}
          onClick={() => setActiveTab("branches")}
        >
          🏢 Branch-wise Comparison ({data.branchComparison?.length || 0})
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW & TRENDS ================= */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.2s_ease-out]">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
            {/* DAILY ATTENDANCE AREA CHART */}
            <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] p-5 sm:p-6 shadow-sm xl:col-span-7 flex flex-col justify-between hover:border-[var(--border-focus)]/50 transition-all">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[var(--text)] m-0 tracking-tight">
                      Daily Attendance Velocity
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[var(--subtext)] m-0 mt-0.5">
                      Session-by-session student check-ins over time
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                  {data.totalJoinings} Total Joins
                </span>
              </div>

              {!hasDailyData ? (
                <div className="py-20 text-center text-[var(--subtext)] text-sm flex flex-col items-center gap-2">
                  <TrendingUp className="w-8 h-8 opacity-40 text-indigo-400" />
                  <p>No daily attendance activity recorded yet</p>
                </div>
              ) : (
                <div className="w-full flex-1 flex items-end pt-2">
                  <ResponsiveContainer width="100%" height={290}>
                    <AreaChart data={data.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="var(--subtext)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      />
                      <YAxis
                        stroke="var(--subtext)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTrendTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="joins"
                        name="Attendances"
                        stroke="#818cf8"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#attendanceGradient)"
                        dot={{ fill: "#0f172a", stroke: "#818cf8", strokeWidth: 2, r: 4 }}
                        activeDot={{ fill: "#6366f1", stroke: "#ffffff", strokeWidth: 2, r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* COLLEGE DONUT & BREAKDOWN */}
            <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] p-5 sm:p-6 shadow-sm xl:col-span-5 flex flex-col justify-between hover:border-[var(--border-focus)]/50 transition-all">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[var(--text)] m-0 tracking-tight">
                      Student College Share
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[var(--subtext)] m-0 mt-0.5">
                      Representation across enrolled colleges
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/25 text-amber-400">
                  {data.collegeStats.length} {data.collegeStats.length === 1 ? "College" : "Colleges"}
                </span>
              </div>

              {!hasCollegeData ? (
                <div className="py-20 text-center text-[var(--subtext)] text-sm flex flex-col items-center gap-2">
                  <Building2 className="w-8 h-8 opacity-40 text-amber-400" />
                  <p>No college distribution data available</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 flex-1 justify-between">
                  {/* Clean Donut with Centered KPI */}
                  <div className="relative w-full h-[185px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={185}>
                      <PieChart>
                        <Pie
                          data={data.collegeStats}
                          dataKey="students"
                          nameKey="college"
                          cx="50%"
                          cy="50%"
                          innerRadius={56}
                          outerRadius={78}
                          paddingAngle={data.collegeStats.length > 1 ? 4 : 0}
                          stroke="var(--card)"
                          strokeWidth={3}
                        >
                          {data.collegeStats.map((entry, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip total={totalCollegeStudents} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Metric in Donut Hole */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-[var(--text)] tracking-tight leading-none">
                        {totalCollegeStudents}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--subtext)] mt-1">
                        Students
                      </span>
                    </div>
                  </div>

                  {/* Integrated College Breakdown Cards */}
                  <div className="space-y-2 max-h-[145px] overflow-y-auto pr-1">
                    {data.collegeStats.map((item, idx) => {
                      const color = COLORS[idx % COLORS.length];
                      const pct = ((item.students / totalCollegeStudents) * 100).toFixed(0);
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-indigo-500/30 transition-all flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-[var(--text)] truncate m-0" title={item.college}>
                                {item.college}
                              </p>
                              {/* Inline mini progress bar */}
                              <div className="w-full bg-[var(--bg)] h-1 rounded-full mt-1 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, backgroundColor: color }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-extrabold text-[var(--text)]">
                              {item.students}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COLLEGE BREAKDOWN TABLE */}
          <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm sm:text-base font-bold text-[var(--text)] m-0">
                  College Distribution Summary
                </h3>
              </div>
              <span className="text-xs font-semibold text-[var(--subtext)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-full border border-[var(--border)]">
                {data.collegeStats.length} colleges enrolled
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                    <th className="py-3 px-5 text-xs font-bold text-[var(--subtext)] text-left uppercase tracking-wider">
                      College / Institution
                    </th>
                    <th className="py-3 px-5 text-xs font-bold text-[var(--subtext)] text-right uppercase tracking-wider">
                      Unique Students
                    </th>
                    <th className="py-3 px-5 text-xs font-bold text-[var(--subtext)] text-right uppercase tracking-wider">
                      Branch Share
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.collegeStats.map((item, idx) => {
                    const percent = ((item.students / totalCollegeStudents) * 100).toFixed(1);
                    const color = COLORS[idx % COLORS.length];
                    return (
                      <tr key={idx} className="hover:bg-[var(--card-hover)] transition-colors">
                        <td className="py-3.5 px-5 text-xs sm:text-sm font-semibold text-[var(--text)]">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span>{item.college}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-xs sm:text-sm font-extrabold text-right text-[var(--text)]">
                          {item.students}
                        </td>
                        <td className="py-3.5 px-5 text-xs sm:text-sm text-right">
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {percent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MONTH-WISE ATTENDANCE ANALYSIS ================= */}
      {activeTab === "monthly" && (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.2s_ease-out]">
          {/* MONTHLY SUMMARY METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm">
              <span className="text-xs text-[var(--subtext)] font-semibold uppercase">Total Active Months</span>
              <p className="text-2xl font-extrabold text-[var(--text)] mt-1 m-0">{data.monthlyStats?.length || 0}</p>
            </div>
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm">
              <span className="text-xs text-[var(--subtext)] font-semibold uppercase">Avg Attendance / Class</span>
              <p className="text-2xl font-extrabold text-[var(--primary)] mt-1 m-0">
                {data.totalClasses > 0 ? Math.round(data.totalJoinings / data.totalClasses) : 0}
              </p>
            </div>
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm">
              <span className="text-xs text-[var(--subtext)] font-semibold uppercase">Peak Month</span>
              <p className="text-base font-bold text-emerald-500 mt-1 m-0">
                {data.monthlyStats?.length > 0
                  ? [...data.monthlyStats].sort((a, b) => b.totalJoinings - a.totalJoinings)[0]?.monthLabel
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* MONTHLY COMPARISON BAR CHART */}
          <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] p-5 sm:p-6 shadow-sm hover:border-[var(--border-focus)]/50 transition-all">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[var(--text)] m-0 tracking-tight">
                    Month-over-Month Attendances & Classes
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[var(--subtext)] m-0 mt-0.5">
                    Hover on any month to inspect exact attendance counts and session volumes
                  </p>
                </div>
              </div>

              {/* Chart Legend with pills */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
                  <span>Total Attendances</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                  <span>Classes Conducted</span>
                </div>
              </div>
            </div>

            {!hasMonthlyData ? (
              <div className="py-20 text-center text-[var(--subtext)] text-sm flex flex-col items-center gap-2">
                <BarChart3 className="w-8 h-8 opacity-40 text-indigo-400" />
                <p>No monthly data recorded yet</p>
              </div>
            ) : (
              <div className="w-full pt-2">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={data.monthlyStats}
                    margin={{ top: 20, right: 15, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      stroke="var(--subtext)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <YAxis
                      stroke="var(--subtext)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={false}
                      content={<CustomMonthlyTooltip />}
                    />
                    <Bar
                      dataKey="totalJoinings"
                      name="Total Attendances"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="classesCount"
                      name="Classes Conducted"
                      fill="#22c55e"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* MONTHLY BREAKDOWN TABLE */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text)] m-0">📅 Month-by-Month Attendance Register</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-left">Month</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-right">Classes</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-right">Attendances</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-right">Unique Students</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-right">Avg / Class</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-right">Meet Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.monthlyStats.map((m, idx) => (
                    <tr key={idx} className="hover:bg-[var(--card-hover)] transition-colors">
                      <td className="py-3 px-4 text-xs sm:text-sm font-semibold text-[var(--text)]">
                        {m.monthLabel}
                      </td>
                      <td className="py-3 px-4 text-xs sm:text-sm font-bold text-right text-[var(--text)]">
                        {m.classesCount}
                      </td>
                      <td className="py-3 px-4 text-xs sm:text-sm font-bold text-right text-[var(--primary)]">
                        {m.totalJoinings}
                      </td>
                      <td className="py-3 px-4 text-xs sm:text-sm text-right text-[var(--text)]">
                        {m.uniqueStudents}
                      </td>
                      <td className="py-3 px-4 text-xs sm:text-sm font-semibold text-right text-emerald-500">
                        {m.avgAttendance}
                      </td>
                      <td className="py-3 px-4 text-xs sm:text-sm text-right text-[var(--subtext)]">
                        {m.totalDurationMins > 0 ? `${m.totalDurationMins}m` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: STUDENT-WISE ANALYTICS ================= */}
      {activeTab === "students" && (
        <div className="flex flex-col gap-5 animate-[fadeIn_0.2s_ease-out]">
          {/* CONTROLS: SEARCH & FILTERS */}
          <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between flex-wrap">
            <div className="flex-1 w-full sm:w-auto min-w-[220px]">
              <input
                type="text"
                placeholder="🔍 Search student name, email, or college..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full py-2 px-3 border border-[var(--border)] rounded-xl text-xs sm:text-sm bg-[var(--bg)] text-[var(--text)] outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* College Filter */}
              <select
                value={selectedCollegeFilter}
                onChange={(e) => setSelectedCollegeFilter(e.target.value)}
                className="py-2 px-3 border border-[var(--border)] rounded-xl text-xs bg-[var(--bg)] text-[var(--text)] outline-none cursor-pointer"
              >
                <option value="ALL">All Colleges</option>
                {data.collegeStats.map((c) => (
                  <option key={c.college} value={c.college}>
                    {c.college}
                  </option>
                ))}
              </select>

              {/* Tier Filter */}
              <select
                value={selectedTierFilter}
                onChange={(e) => setSelectedTierFilter(e.target.value)}
                className="py-2 px-3 border border-[var(--border)] rounded-xl text-xs bg-[var(--bg)] text-[var(--text)] outline-none cursor-pointer"
              >
                <option value="ALL">All Attendance Tiers</option>
                <option value="Champion">🏆 Champions (≥ 80%)</option>
                <option value="Regular">🟢 Regular (50% - 79%)</option>
                <option value="Needs Attention">⚠️ Needs Attention (&lt; 50%)</option>
              </select>

              {/* Month Filter */}
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="py-2 px-3 border border-[var(--border)] rounded-xl text-xs bg-[var(--bg)] text-[var(--text)] outline-none cursor-pointer"
              >
                <option value="">All Time</option>
                {data.monthlyStats.map((m) => (
                  <option key={m.month} value={m.month}>
                    {m.monthLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* STUDENT ANALYTICS TABLE */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text)] m-0">
                Student Attendance Performance ({filteredStudents.length})
              </h3>
              <span className="text-xs text-[var(--subtext)]">Sorted by attendance rate</span>
            </div>

            <div className="overflow-x-auto">
              {!hasStudentData ? (
                <div className="py-12 text-center text-[var(--subtext)] text-sm">No student attendance records found</div>
              ) : (
                <table className="w-full border-collapse min-w-[750px]">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                      <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-left">#</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-left">Student Name</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-left">Email</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-left">College</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-center">Attended</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-left">Attendance Rate</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-right">Call Duration</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-center">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredStudents.map((s, idx) => (
                      <tr key={s.studentId} className="hover:bg-[var(--card-hover)] transition-colors">
                        <td className="py-3 px-4 text-xs text-[var(--subtext)]">{idx + 1}</td>
                        <td className="py-3 px-4 text-xs sm:text-sm font-semibold text-[var(--text)]">{s.fullName}</td>
                        <td className="py-3 px-4 text-xs text-[var(--subtext)]">{s.email}</td>
                        <td className="py-3 px-4 text-xs text-[var(--text)]">{s.college}</td>
                        <td className="py-3 px-4 text-xs sm:text-sm font-bold text-center text-[var(--text)]">
                          {s.attendedClasses} / {s.totalClasses}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs w-9 text-[var(--text)]">{s.attendanceRate}%</span>
                            <div className="flex-1 max-w-[100px] h-2 bg-[var(--border)] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  s.attendanceRate >= 80
                                    ? "bg-emerald-500"
                                    : s.attendanceRate >= 50
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${s.attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-right font-medium text-[var(--text)]">
                          {s.totalDurationMins > 0 ? `${s.totalDurationMins}m` : "-"}
                        </td>
                        <td className="py-3 px-4 text-xs text-center">
                          {s.tier === "Champion" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                              🏆 Champion
                            </span>
                          )}
                          {s.tier === "Regular" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                              🟢 Regular
                            </span>
                          )}
                          {s.tier === "Needs Attention" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                              ⚠️ At Risk
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: BRANCH-WISE COMPARISON ================= */}
      {activeTab === "branches" && (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.2s_ease-out]">
          {/* BRANCH CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {data.branchComparison.map((b) => (
              <div
                key={b.branchId}
                className={`p-5 rounded-2xl border transition-all ${
                  b.isCurrent
                    ? "bg-[var(--card)] border-[var(--primary)] ring-2 ring-[var(--primary-light)] shadow-md"
                    : "bg-[var(--card)] border-[var(--border)] hover:border-[var(--primary)] shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-bold text-[var(--text)] m-0">{b.branchName}</h4>
                  {b.isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[var(--primary)] text-white">
                      Current
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-[var(--border)] text-center">
                  <div>
                    <span className="text-[10px] text-[var(--subtext)] font-semibold uppercase">Classes</span>
                    <p className="text-base font-bold text-[var(--text)] m-0 mt-0.5">{b.totalClasses}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--subtext)] font-semibold uppercase">Students</span>
                    <p className="text-base font-bold text-[var(--text)] m-0 mt-0.5">{b.totalStudents}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--subtext)] font-semibold uppercase">Avg / Class</span>
                    <p className="text-base font-bold text-emerald-500 m-0 mt-0.5">{b.avgClassAttendance}</p>
                  </div>
                </div>

                {!b.isCurrent && (
                  <button
                    className="w-full mt-3 py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--primary)] hover:text-white text-xs font-bold text-[var(--text)] transition-colors cursor-pointer"
                    onClick={() => navigate(`/branch/${b.branchId}`)}
                  >
                    View Branch Analytics →
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* BRANCH COMPARISON TABLE */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text)] m-0">🏢 All Branches Overview & Ranking</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-left">#</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-left">Branch Name</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-center">Year</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-right">Classes Held</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-right">Total Students</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-right">Total Attendances</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--subtext)] text-right">Avg Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.branchComparison.map((b, idx) => (
                    <tr
                      key={b.branchId}
                      className={`transition-colors ${b.isCurrent ? "bg-[var(--primary-light)]/40" : "hover:bg-[var(--card-hover)]"}`}
                    >
                      <td className="py-3 px-4 text-xs text-[var(--subtext)]">{idx + 1}</td>
                      <td className="py-3 px-4 text-xs sm:text-sm font-bold text-[var(--text)] flex items-center gap-2">
                        <span>{b.branchName}</span>
                        {b.isCurrent && (
                          <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-center text-[var(--subtext)]">{b.year || "-"}</td>
                      <td className="py-3 px-4 text-xs sm:text-sm font-semibold text-right text-[var(--text)]">
                        {b.totalClasses}
                      </td>
                      <td className="py-3 px-4 text-xs sm:text-sm text-right text-[var(--text)]">{b.totalStudents}</td>
                      <td className="py-3 px-4 text-xs sm:text-sm font-bold text-right text-[var(--primary)]">
                        {b.totalAttendances}
                      </td>
                      <td className="py-3 px-4 text-xs sm:text-sm font-bold text-right text-emerald-500">
                        {b.avgClassAttendance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BranchDashboard;
