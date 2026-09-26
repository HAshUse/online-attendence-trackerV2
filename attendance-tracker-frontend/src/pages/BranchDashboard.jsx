import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import "./BranchDashboard.css";

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
      <div className="page branch-dash-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page branch-dash-page">
        <h2>No data found</h2>
      </div>
    );
  }

  const hasCollegeData = data.collegeStats && data.collegeStats.length > 0;
  const hasDailyData = data.dailyTrend && data.dailyTrend.length > 0;
  const totalCollegeStudents = data.collegeStats.reduce((acc, curr) => acc + (curr.students || 0), 0) || 1;

  return (
    <div className="page branch-dash-page">
      {/* HEADER */}
      <div className="branch-header">
        <div className="header-left">
          <div>
            <h2 className="branch-title">{data.branchName} Analytics</h2>
            <p className="branch-subtitle">Comprehensive performance summary and attendance register</p>
          </div>
        </div>

        <div className="header-actions">
          {/* VIEW SWITCHER */}
          <div className="view-toggle-group">
            <button
              className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              📋 Table View
            </button>
            <button
              className={`toggle-btn ${viewMode === "charts" ? "active" : ""}`}
              onClick={() => setViewMode("charts")}
            >
              📊 Charts View
            </button>
            <button
              className={`toggle-btn ${viewMode === "both" ? "active" : ""}`}
              onClick={() => setViewMode("both")}
            >
              📑 Full View
            </button>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate(`/dashboard/${branchId}`)}
          >
            Manage Classes →
          </button>
        </div>
      </div>

      {/* OVERVIEW STATS CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper classes-icon">📚</div>
          <div className="stat-info">
            <h3>Total Classes</h3>
            <p>{data.totalClasses}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper students-icon">👥</div>
          <div className="stat-info">
            <h3>Total Students</h3>
            <p>{data.totalStudents}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper joins-icon">⚡</div>
          <div className="stat-info">
            <h3>Total Attendances</h3>
            <p>{data.totalJoinings}</p>
          </div>
        </div>

        <div className="stat-card insight-stat">
          <div className="stat-icon-wrapper college-icon">🏆</div>
          <div className="stat-info">
            <h3>Top College</h3>
            <p className="truncate-text">{data.topCollege || "No Data"}</p>
          </div>
        </div>

        <div className="stat-card insight-stat">
          <div className="stat-icon-wrapper active-icon">🔥</div>
          <div className="stat-info">
            <h3>Most Active Class</h3>
            <p className="truncate-text">{data.mostActiveClass || "No Activity"}</p>
          </div>
        </div>
      </div>

      {/* ================= TABULAR DATA VIEW ================= */}
      {(viewMode === "table" || viewMode === "both") && (
        <div className="tables-container">
          {/* SUMMARY REGISTER TABLE */}
          <div className="dashboard-table-card">
            <div className="table-card-header">
              <div>
                <h3 className="table-card-title">🏛️ College Distribution Summary</h3>
                <p className="table-card-sub">Student count breakdown and percentage distribution by college</p>
              </div>
              <span className="badge">{data.collegeStats.length} Colleges Recorded</span>
            </div>

            <div className="table-wrapper">
              {!hasCollegeData ? (
                <div className="table-empty">No college attendance recorded yet</div>
              ) : (
                <table className="custom-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>#</th>
                      <th>College Name</th>
                      <th style={{ textAlign: "right", width: "160px" }}>Unique Students</th>
                      <th style={{ textAlign: "right", width: "120px" }}>Share (%)</th>
                      <th style={{ width: "220px" }}>Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.collegeStats
                      .sort((a, b) => b.students - a.students)
                      .map((item, index) => {
                        const percent = ((item.students / totalCollegeStudents) * 100).toFixed(1);
                        return (
                          <tr key={index}>
                            <td>
                              <span className={`rank-badge rank-${index + 1}`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="font-semibold">{item.college || "Unknown / Not Specified"}</td>
                            <td style={{ textAlign: "right" }} className="font-bold">
                              {item.students}
                            </td>
                            <td style={{ textAlign: "right" }} className="text-muted">
                              {percent}%
                            </td>
                            <td>
                              <div className="progress-bar-bg">
                                <div
                                  className="progress-bar-fill"
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
                      <td colSpan="2" className="font-bold">Total Unique Count</td>
                      <td style={{ textAlign: "right" }} className="font-bold">
                        {data.totalStudents}
                      </td>
                      <td style={{ textAlign: "right" }} className="font-bold">100%</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          {/* DAILY ATTENDANCE TIMELINE TABLE */}
          <div className="dashboard-table-card">
            <div className="table-card-header">
              <div>
                <h3 className="table-card-title">📅 Daily Attendance Log</h3>
                <p className="table-card-sub">Daily breakdown of student joinings and attendance count</p>
              </div>
              <span className="badge">{data.dailyTrend.length} Days Recorded</span>
            </div>

            <div className="table-wrapper">
              {!hasDailyData ? (
                <div className="table-empty">No daily join records found</div>
              ) : (
                <table className="custom-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>#</th>
                      <th>Date</th>
                      <th style={{ textAlign: "right", width: "160px" }}>Attendance Count</th>
                      <th>Activity Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyTrend.map((trend, index) => {
                      const maxJoins = Math.max(...data.dailyTrend.map((t) => t.joins), 1);
                      const activityRatio = (trend.joins / maxJoins) * 100;
                      return (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td className="font-semibold">{trend.date}</td>
                          <td style={{ textAlign: "right" }} className="font-bold">
                            <span className="join-pill">{trend.joins} Joins</span>
                          </td>
                          <td>
                            <div className="progress-bar-bg">
                              <div
                                className="progress-bar-fill"
                                style={{
                                  width: `${activityRatio}%`,
                                  backgroundColor: "#6366f1"
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
        <div className="chart-grid">
          {/* DAILY LINE CHART */}
          <div className="chart-card">
            <h3 className="chart-title">📈 Daily Join Trend</h3>
            {!hasDailyData ? (
              <p className="table-empty">No attendance trend data available</p>
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
          <div className="chart-card">
            <h3 className="chart-title">🥧 Students by College</h3>
            {!hasCollegeData ? (
              <p className="table-empty">No college stats available</p>
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