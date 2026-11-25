import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  ShieldCheck,
  Users,
  Layers,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Search,
  LogOut,
  ExternalLink,
  BarChart3,
  Video,
  ArrowRight,
  Calendar,
  Trash2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "branches"
  const [selectedFacilitator, setSelectedFacilitator] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [deletingFacilitatorId, setDeletingFacilitatorId] = useState(null);
  const navigate = useNavigate();

  const fetchOverview = async (facId = selectedFacilitator, month = selectedMonth) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (facId) params.append("facilitatorId", facId);
      if (month) params.append("month", month);
      const q = params.toString();
      const res = await API.get(`/admin/overview${q ? `?${q}` : ""}`);
      setData(res.data);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(selectedFacilitator, selectedMonth);
  }, [selectedFacilitator, selectedMonth]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin/login");
  };

  const handleDeleteFacilitator = async (f) => {
    const ok = window.confirm(
      `Delete facilitator "${f.name}" (${f.email})?\nTheir account will be removed, while their branches and attendance records remain intact.`
    );
    if (!ok) return;

    try {
      setDeletingFacilitatorId(f._id);
      await API.delete(`/admin/facilitators/${f._id}`);
      if (selectedFacilitator === f._id) setSelectedFacilitator("");
      await fetchOverview(selectedFacilitator === f._id ? "" : selectedFacilitator, selectedMonth);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete facilitator.");
    } finally {
      setDeletingFacilitatorId(null);
    }
  };

  const kpis = data?.kpis || {};
  const facilitators = data?.facilitators || [];
  const branches = data?.branches || [];
  const dailyTrend = data?.dailyTrend || [];

  const filteredBranches = branches.filter((b) => {
    const term = branchSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      b.name.toLowerCase().includes(term) ||
      (b.facilitator?.name || "").toLowerCase().includes(term) ||
      (b.year || "").toLowerCase().includes(term)
    );
  });

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-3 text-[var(--subtext)] text-sm">
        <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
        <span>Loading Admin Control Tower...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8 sm:px-6 md:px-10 text-[var(--text)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* TOP HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-light)] border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Read-Only Observer Mode</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] tracking-tight">
              Organization Control Tower
            </h1>
            <p className="text-xs sm:text-sm text-[var(--subtext)] mt-1">
              Third-person oversight across all facilitators, branches, classes, and attendance analytics.
            </p>
          </div>

          {/* GLOBAL FILTERS & LOGOUT */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedFacilitator}
              onChange={(e) => setSelectedFacilitator(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text)] focus:outline-none focus:border-[var(--border-focus)] cursor-pointer"
            >
              <option value="">All Facilitators ({facilitators.length})</option>
              {facilitators.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name} ({f.branchesCount} branches)
                </option>
              ))}
            </select>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text)] focus:outline-none focus:border-[var(--border-focus)] cursor-pointer"
              title="Filter by month"
            />

            {selectedMonth && (
              <button
                onClick={() => setSelectedMonth("")}
                className="h-10 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-semibold text-[var(--subtext)] hover:text-[var(--text)] cursor-pointer"
              >
                All Time
              </button>
            )}

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500/15 text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Admin Sign Out</span>
            </button>
          </div>
        </div>

        {/* 5-CARD KPI STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--subtext)] mb-1">
              <span>Facilitators</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-[var(--text-heading)]">
              {kpis.totalFacilitators || 0}
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1">
              {kpis.googleConnectedCount || 0} Google Linked
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--subtext)] mb-1">
              <span>Branches</span>
              <Layers className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-2xl font-extrabold text-[var(--text-heading)]">
              {kpis.totalBranches || 0}
            </div>
            <div className="text-[11px] text-[var(--subtext)] mt-1">Across workspace</div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--subtext)] mb-1">
              <span>Classes</span>
              <BookOpen className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-extrabold text-[var(--text-heading)]">
              {kpis.totalClasses || 0}
            </div>
            <div className="text-[11px] text-[var(--subtext)] mt-1">
              {kpis.totalAttendances || 0} total joins
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--subtext)] mb-1">
              <span>Unique Students</span>
              <GraduationCap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-[var(--text-heading)]">
              {kpis.totalStudents || 0}
            </div>
            <div className="text-[11px] text-[var(--subtext)] truncate mt-1">
              Top: {kpis.topCollege || "N/A"}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--subtext)] mb-1">
              <span>Org Attendance</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-[var(--text-heading)]">
              {kpis.orgAttendanceRate || 0}%
            </div>
            <div className="text-[11px] text-[var(--subtext)] mt-1">Weighted across branches</div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--subtext)] hover:text-[var(--text)]"
            }`}
          >
            Overview & Facilitators ({facilitators.length})
          </button>
          <button
            onClick={() => setActiveTab("branches")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "branches"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--subtext)] hover:text-[var(--text)]"
            }`}
          >
            All Branches Explorer ({branches.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW & FACILITATORS */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* 2-COL CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
                <h3 className="text-sm font-bold text-[var(--text-heading)] mb-4">
                  Org-Wide Daily Attendance Velocity
                </h3>
                {dailyTrend.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-xs text-[var(--subtext)]">
                    No attendance activity in selected range.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyTrend}>
                        <defs>
                          <linearGradient id="adminTrendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
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
                        <Area
                          type="monotone"
                          dataKey="joins"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          fill="url(#adminTrendFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* TOP BRANCHES BULLET LIST */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
                <h3 className="text-sm font-bold text-[var(--text-heading)] mb-4">
                  Branch Attendance Health
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {branches.slice(0, 8).map((b) => (
                    <div
                      key={b._id}
                      onClick={() => navigate(`/admin/branches/${b._id}`)}
                      className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-focus)] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-[var(--text)] mb-1">
                        <span className="truncate">{b.name}</span>
                        <span>{b.avgRate}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden mb-1">
                        <div
                          className={`h-full rounded-full ${
                            b.avgRate >= 80
                              ? "bg-emerald-500"
                              : b.avgRate >= 50
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${b.avgRate}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[var(--subtext)]">
                        <span>{b.facilitator?.name}</span>
                        <span>
                          {b.classesCount} classes • {b.studentsCount} students
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FACILITATORS TABLE */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
              <h3 className="text-base font-bold text-[var(--text-heading)] mb-4">
                All Facilitators ({facilitators.length})
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full min-w-[700px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[var(--primary-light)] text-[var(--primary)] text-xs font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Facilitator</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Google</th>
                      <th className="px-4 py-3">Branches</th>
                      <th className="px-4 py-3">Classes</th>
                      <th className="px-4 py-3">Total Joins</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-xs sm:text-sm">
                    {facilitators.map((f) => (
                      <tr key={f._id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="px-4 py-3 font-bold text-[var(--text-heading)]">{f.name}</td>
                        <td className="px-4 py-3 text-[var(--subtext)]">{f.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              f.googleConnected
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-amber-500/15 text-amber-400"
                            }`}
                          >
                            {f.googleConnected ? "Connected" : "Not Linked"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">{f.branchesCount}</td>
                        <td className="px-4 py-3 font-semibold">{f.classesCount}</td>
                        <td className="px-4 py-3 font-semibold">{f.totalAttendances}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setSelectedFacilitator(f._id);
                                setActiveTab("branches");
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                            >
                              <span>View Branches</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFacilitator(f)}
                              disabled={deletingFacilitatorId === f._id}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete Facilitator"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ALL BRANCHES EXPLORER */}
        {activeTab === "branches" && (
          <div className="space-y-5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search branches by name, facilitator, or year..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-2xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
              />
            </div>

            {filteredBranches.length === 0 ? (
              <div className="p-10 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] text-center text-xs text-[var(--subtext)]">
                No branches match the current filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBranches.map((b) => (
                  <div
                    key={b._id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-focus)] p-5 shadow-[var(--shadow-sm)] flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-[11px] font-bold">
                          <Users className="w-3 h-3" />
                          <span>{b.facilitator?.name || "Facilitator"}</span>
                        </span>
                        {b.sheetUrl && (
                          <a
                            href={b.sheetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline"
                          >
                            <span>Sheet</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-[var(--text-heading)] truncate">
                        {b.name}
                      </h3>
                      <div className="inline-flex items-center gap-1 text-[11px] text-[var(--subtext)] mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{b.year || "Academic Batch"}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-center">
                        <div>
                          <div className="text-sm font-extrabold text-[var(--text-heading)]">
                            {b.classesCount}
                          </div>
                          <div className="text-[10px] text-[var(--subtext)]">Classes</div>
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-[var(--text-heading)]">
                            {b.studentsCount}
                          </div>
                          <div className="text-[10px] text-[var(--subtext)]">Students</div>
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-[var(--text-heading)]">
                            {b.avgRate}%
                          </div>
                          <div className="text-[10px] text-[var(--subtext)]">Avg Rate</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--subtext)]">
                        <Video className="w-3.5 h-3.5 text-amber-400" />
                        <span>{b.recordingsCount} recordings</span>
                      </span>

                      <button
                        onClick={() => navigate(`/admin/branches/${b._id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold cursor-pointer"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Inspect Analytics</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
