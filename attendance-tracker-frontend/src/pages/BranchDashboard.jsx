import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f97316", "#ef4444", "#14b8a6", "#eab308", "#8b5cf6", "#ec4899"];

function BranchDashboard() {
  const { branchId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table"); // "table" | "charts" | "both"

  /* ================= FETCH ================= */
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await API.get(`/branches/${branchId}/analytics`);

        setData({
          branchName: res.data.branchName || "Branch",
          totalClasses: res.data.totalClasses || 0,
          totalStudents: res.data.totalStudents || 0,
          totalJoinings: res.data.totalJoinings || 0,
          classes: res.data.classes || [],
          collegeStats: res.data.collegeStats || [],
          topCollege: res.data.topCollege || null,
          mostActiveClass: res.data.mostActiveClass || null,
          dailyTrend: res.data.dailyTrend || []
        });
      } catch (err) {
        console.error(err);
        alert("Failed to load branch data");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [branchId]);

  if (loading) {
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
        <h2 className="text-xl font-bold text-center mt-12">No data found</h2>
      </div>
    );
  }

  const hasCollegeData = data.collegeStats && data.collegeStats.length > 0;
  const hasDailyData = data.dailyTrend && data.dailyTrend.length > 0;
  const totalCollegeStudents = data.collegeStats.reduce((acc, curr) => acc + (curr.students || 0), 0) || 1;

  return (
    <div className="p-5 sm:p-8 bg-[var(--bg)] min-h-screen text-[var(--text)] transition-colors duration-200">
      {/* HEADER */}
      <div className="flex items-start sm:items-center justify-between mb-7 gap-4 flex-col sm:flex-row flex-wrap">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-[var(--text)] tracking-tight m-0">
              {data.branchName} Analytics
            </h2>
            <p className="text-[13.5px] text-[var(--subtext)] mt-1">
              Comprehensive performance summary and attendance register
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto justify-between sm:justify-start">
          {/* VIEW SWITCHER */}
          <div className="inline-flex bg-[var(--card)] p-1 rounded-lg border border-[var(--border)] shadow-[var(--shadow-sm)]">
            <button
              className={`border-0 py-1.5 px-3.5 text-[13px] font-semibold rounded-md cursor-pointer transition-all ${
                viewMode === "table"
                  ? "bg-[var(--primary)] text-white shadow-[0_2px_8px_rgba(99,102,241,0.35)]"
                  : "bg-transparent text-[var(--subtext)] hover:text-[var(--text)]"
              }`}
              onClick={() => setViewMode("table")}
            >
              📋 Table View
            </button>
            <button
              className={`border-0 py-1.5 px-3.5 text-[13px] font-semibold rounded-md cursor-pointer transition-all ${
                viewMode === "charts"
                  ? "bg-[var(--primary)] text-white shadow-[0_2px_8px_rgba(99,102,241,0.35)]"
                  : "bg-transparent text-[var(--subtext)] hover:text-[var(--text)]"
              }`}
              onClick={() => setViewMode("charts")}
            >
              📊 Charts View
            </button>
            <button
              className={`border-0 py-1.5 px-3.5 text-[13px] font-semibold rounded-md cursor-pointer transition-all ${
                viewMode === "both"
                  ? "bg-[var(--primary)] text-white shadow-[0_2px_8px_rgba(99,102,241,0.35)]"
                  : "bg-transparent text-[var(--subtext)] hover:text-[var(--text)]"
              }`}
              onClick={() => setViewMode("both")}
            >
              📑 Full View
            </button>
          </div>

          <button
            className="border-0 py-2.5 px-4.5 rounded-lg cursor-pointer font-semibold text-[13.5px] transition-all duration-200 inline-flex items-center gap-1.5 bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white shadow-[0_2px_10px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(99,102,241,0.45)]"
            onClick={() => navigate(`/dashboard/${branchId}`)}
          >
            Manage Classes →
          </button>
        </div>
      </div>

      {/* OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-7">
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4.5 sm:p-5 shadow-[var(--shadow-sm)] flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
          <div className="w-11.5 h-11.5 rounded-xl flex items-center justify-center text-xl shrink-0 bg-indigo-500/15 text-indigo-500">
            📚
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11.5px] font-bold text-[var(--subtext)] uppercase tracking-wider mb-1">Total Classes</h3>
            <p className="text-[22px] font-extrabold text-[var(--text)] m-0 leading-none">{data.totalClasses}</p>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4.5 sm:p-5 shadow-[var(--shadow-sm)] flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
          <div className="w-11.5 h-11.5 rounded-xl flex items-center justify-center text-xl shrink-0 bg-emerald-500/15 text-emerald-500">
            👥
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11.5px] font-bold text-[var(--subtext)] uppercase tracking-wider mb-1">Total Students</h3>
            <p className="text-[22px] font-extrabold text-[var(--text)] m-0 leading-none">{data.totalStudents}</p>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4.5 sm:p-5 shadow-[var(--shadow-sm)] flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
          <div className="w-11.5 h-11.5 rounded-xl flex items-center justify-center text-xl shrink-0 bg-amber-500/15 text-amber-500">
            ⚡
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11.5px] font-bold text-[var(--subtext)] uppercase tracking-wider mb-1">Total Attendances</h3>
            <p className="text-[22px] font-extrabold text-[var(--text)] m-0 leading-none">{data.totalJoinings}</p>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4.5 sm:p-5 shadow-[var(--shadow-sm)] flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
          <div className="w-11.5 h-11.5 rounded-xl flex items-center justify-center text-xl shrink-0 bg-pink-500/15 text-pink-500">
            🏆
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11.5px] font-bold text-[var(--subtext)] uppercase tracking-wider mb-1">Top College</h3>
            <p className="text-sm sm:text-base font-extrabold text-[var(--text)] m-0 truncate">{data.topCollege || "No Data"}</p>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4.5 sm:p-5 shadow-[var(--shadow-sm)] flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
          <div className="w-11.5 h-11.5 rounded-xl flex items-center justify-center text-xl shrink-0 bg-purple-500/15 text-purple-500">
            🔥
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11.5px] font-bold text-[var(--subtext)] uppercase tracking-wider mb-1">Most Active Class</h3>
            <p className="text-sm sm:text-base font-extrabold text-[var(--text)] m-0 truncate">{data.mostActiveClass || "No Activity"}</p>
          </div>
        </div>
      </div>

      {/* ================= TABULAR DATA VIEW ================= */}
      {(viewMode === "table" || viewMode === "both") && (
        <div className="flex flex-col gap-6 mb-7">
          {/* SUMMARY REGISTER TABLE */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden transition-all">
            <div className="p-4.5 sm:p-5.5 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2.5 bg-[var(--card)]">
              <div>
                <h3 className="text-[16.5px] font-bold text-[var(--text)] m-0">🏛️ College Distribution Summary</h3>
                <p className="text-[12.5px] text-[var(--subtext)] mt-1">Student count breakdown and percentage distribution by college</p>
              </div>
              <span className="text-[11.5px] font-bold bg-[var(--primary-light)] text-[var(--primary)] py-1 px-2.5 rounded-full tracking-wide">
                {data.collegeStats.length} Colleges Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              {!hasCollegeData ? (
                <div className="py-8 px-4 text-center text-[var(--subtext)] text-[13.5px]">No college attendance recorded yet</div>
              ) : (
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[11.5px] font-bold uppercase tracking-wider py-3 px-4.5 text-left border-b border-[var(--border)]" style={{ width: "60px" }}>#</th>
                      <th className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[11.5px] font-bold uppercase tracking-wider py-3 px-4.5 text-left border-b border-[var(--border)]">College Name</th>
                      <th className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[11.5px] font-bold uppercase tracking-wider py-3 px-4.5 text-right border-b border-[var(--border)]" style={{ width: "160px" }}>Unique Students</th>
                      <th className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[11.5px] font-bold uppercase tracking-wider py-3 px-4.5 text-right border-b border-[var(--border)]" style={{ width: "120px" }}>Share (%)</th>
                      <th className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[11.5px] font-bold uppercase tracking-wider py-3 px-4.5 text-left border-b border-[var(--border)]" style={{ width: "220px" }}>Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.collegeStats
                      .sort((a, b) => b.students - a.students)
                      .map((item, index) => {
                        const percent = ((item.students / totalCollegeStudents) * 100).toFixed(1);
                        const rankClass = index === 0 ? "bg-[#ffd700] text-[#7c5e00]" : index === 1 ? "bg-[#e0e0e0] text-[#4f4f4f]" : index === 2 ? "bg-[#cd7f32] text-white" : "bg-[var(--border)] text-[var(--text)]";
                        return (
                          <tr key={index} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--card-hover)]">
                            <td className="py-3.5 px-4.5 text-[13.5px]">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${rankClass}`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3.5 px-4.5 text-[13.5px] font-semibold text-[var(--text)]">{item.college || "Unknown / Not Specified"}</td>
                            <td className="py-3.5 px-4.5 text-[13.5px] text-right font-bold text-[var(--text)]">
                              {item.students}
                            </td>
                            <td className="py-3.5 px-4.5 text-[13.5px] text-right text-[var(--subtext)]">
                              {percent}%
                            </td>
                            <td className="py-3.5 px-4.5">
                              <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${percent}%`,
                                    backgroundColor: COLORS[index % COLORS.length]
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="2" className="py-3.5 px-4.5 bg-[var(--bg-secondary)] border-t-2 border-[var(--border)] text-[13.5px] text-[var(--text)] font-bold">Total Unique Count</td>
                      <td className="py-3.5 px-4.5 bg-[var(--bg-secondary)] border-t-2 border-[var(--border)] text-[13.5px] text-[var(--text)] text-right font-bold">
                        {data.totalStudents}
                      </td>
                      <td className="py-3.5 px-4.5 bg-[var(--bg-secondary)] border-t-2 border-[var(--border)] text-[13.5px] text-[var(--text)] text-right font-bold">100%</td>
                      <td className="py-3.5 px-4.5 bg-[var(--bg-secondary)] border-t-2 border-[var(--border)]"></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          {/* DAILY ATTENDANCE TIMELINE TABLE */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden transition-all">
            <div className="p-4.5 sm:p-5.5 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2.5 bg-[var(--card)]">
              <div>
                <h3 className="text-[16.5px] font-bold text-[var(--text)] m-0">📅 Daily Attendance Log</h3>
                <p className="text-[12.5px] text-[var(--subtext)] mt-1">Daily breakdown of student joinings and attendance count</p>
              </div>
              <span className="text-[11.5px] font-bold bg-[var(--primary-light)] text-[var(--primary)] py-1 px-2.5 rounded-full tracking-wide">
                {data.dailyTrend.length} Days Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              {!hasDailyData ? (
                <div className="py-8 px-4 text-center text-[var(--subtext)] text-[13.5px]">No daily join records found</div>
              ) : (
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[11.5px] font-bold uppercase tracking-wider py-3 px-4.5 text-left border-b border-[var(--border)]" style={{ width: "60px" }}>#</th>
                      <th className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[11.5px] font-bold uppercase tracking-wider py-3 px-4.5 text-left border-b border-[var(--border)]">Date</th>
                      <th className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[11.5px] font-bold uppercase tracking-wider py-3 px-4.5 text-right border-b border-[var(--border)]" style={{ width: "160px" }}>Attendance Count</th>
                      <th className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[11.5px] font-bold uppercase tracking-wider py-3 px-4.5 text-left border-b border-[var(--border)]">Activity Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyTrend.map((trend, index) => {
                      const maxJoins = Math.max(...data.dailyTrend.map((t) => t.joins), 1);
                      const activityRatio = (trend.joins / maxJoins) * 100;
                      return (
                        <tr key={index} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--card-hover)]">
                          <td className="py-3.5 px-4.5 text-[13.5px]">{index + 1}</td>
                          <td className="py-3.5 px-4.5 text-[13.5px] font-semibold text-[var(--text)]">{trend.date}</td>
                          <td className="py-3.5 px-4.5 text-[13.5px] text-right font-bold">
                            <span className="bg-[var(--primary-light)] text-[var(--primary)] text-xs font-bold py-0.5 px-2 rounded-md">
                              {trend.joins} Joins
                            </span>
                          </td>
                          <td className="py-3.5 px-4.5">
                            <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500 bg-[var(--primary)]"
                                style={{
                                  width: `${activityRatio}%`
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= CHARTS VIEW ================= */}
      {(viewMode === "charts" || viewMode === "both") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">
          {/* DAILY LINE CHART */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5.5 shadow-[var(--shadow-sm)] transition-colors lg:col-span-2">
            <h3 className="text-base font-bold text-[var(--text)] mb-4.5">📈 Daily Join Trend</h3>
            {!hasDailyData ? (
              <p className="py-8 text-center text-[var(--subtext)] text-[13.5px]">No attendance trend data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--subtext)" />
                  <YAxis stroke="var(--subtext)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                      borderRadius: "8px"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="joins"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: "#6366f1", r: 4 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* COLLEGE PIE CHART */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5.5 shadow-[var(--shadow-sm)] transition-colors lg:col-span-1">
            <h3 className="text-base font-bold text-[var(--text)] mb-4.5">🥧 Students by College</h3>
            {!hasCollegeData ? (
              <p className="py-8 text-center text-[var(--subtext)] text-[13.5px]">No college stats available</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={data.collegeStats}
                    dataKey="students"
                    nameKey="college"
                    outerRadius={100}
                    innerRadius={45}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name ? name.slice(0, 10) : "Other"} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {data.collegeStats.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                      borderRadius: "8px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BranchDashboard;
