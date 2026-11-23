import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Plus,
  BarChart3,
  Copy,
  Check,
  Edit2,
  Trash2,
  MoreVertical,
  Calendar,
  Clock,
  Video,
  Download,
  Users,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Toast from "../components/Toast";

function Dashboard() {
  const [classes, setClasses] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [exportingMonth, setExportingMonth] = useState(null);
  const [syncingRecordings, setSyncingRecordings] = useState(false);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();
  const { branchId } = useParams();

  const showToast = (message, type = "info", title = "") => {
    setToast({ message, type, title, id: Date.now() });
  };

  /* ================= FETCH CLASSES (BY BRANCH) ================= */
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await API.get(`/classes/my?branchId=${branchId}`);
        setClasses(res.data);
      } catch (err) {
        console.log(err);
        showToast("Failed to load classes for this branch.", "error");
      }
    };

    if (branchId) fetchClasses();
  }, [branchId]);

  /* ================= FETCH BRANCH NAME ================= */
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const res = await API.get(`/branches/${branchId}`);
        setBranchName(res.data.name);
      } catch (err) {
        setBranchName("Branch");
      }
    };

    if (branchId) fetchBranch();
  }, [branchId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".card-menu-wrapper")) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* ================= DELETE CLASS ================= */
  const handleDelete = async (classId, className) => {
    setMenuOpenId(null);
    const confirmDelete = window.confirm(
      `Delete "${className || "this class"}"?\nAll attendance records will be permanently removed!`
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/classes/delete/${classId}`);
      setClasses((prev) => prev.filter((c) => c._id !== classId));
      showToast("Class deleted successfully.", "info", "Class Removed");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete class.", "error");
    }
  };

  /* ================= COPY JOIN LINK ================= */
  const handleCopyLink = (classCode, e) => {
    e.stopPropagation();
    const joinUrl = `${window.location.origin}/join/${classCode}`;
    navigator.clipboard
      .writeText(joinUrl)
      .then(() => {
        setCopiedId(classCode);
        showToast("Join link copied to clipboard!", "success", "Link Copied");
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {
        window.prompt("Copy this link:", joinUrl);
      });
  };

  /* ================= EXPORT MONTH ================= */
  const handleExportMonth = async (monthStr) => {
    try {
      setExportingMonth(monthStr);
      const res = await API.get(
        `/attendance/overall/export/${branchId}?month=${monthStr}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${branchName}_${monthStr}_attendance.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast(`Exported ${monthStr} register.`, "success", "Download Complete");
    } catch (err) {
      showToast("Failed to export month attendance.", "error");
    } finally {
      setExportingMonth(null);
    }
  };

  /* ================= SYNC ALL RECORDINGS TO MASTER SHEET ================= */
  const handleSyncRecordingsSheet = async () => {
    try {
      setSyncingRecordings(true);
      const res = await API.post(`/attendance/branch/${branchId}/sync-recordings`);
      showToast(
        res.data?.message || "Branch recordings synced to Google Sheet!",
        "success",
        "Synced to Sheet"
      );
      if (res.data?.sheetUrl) {
        window.open(res.data.sheetUrl, "_blank");
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to sync recordings to Google Sheet.",
        "error"
      );
    } finally {
      setSyncingRecordings(false);
    }
  };

  // Distinct months calculation
  const months = Array.from(
    new Set(
      classes.map((c) => {
        const d = new Date(c.createdAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })
    )
  ).sort((a, b) => b.localeCompare(a));

  const filteredClasses =
    selectedMonth === "ALL"
      ? classes
      : classes.filter((c) => {
          const d = new Date(c.createdAt);
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return m === selectedMonth;
        });

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8 sm:px-6 md:px-10 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        {/* BREADCRUMB */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--subtext)] mb-4">
          <Link to="/branches" className="hover:text-[var(--primary)] transition-colors">
            Branches
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[var(--text)]">{branchName}</span>
        </div>

        {/* HERO TITLE & CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Class Manager</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] tracking-tight">
              {branchName}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--subtext)] mt-1">
              Create live Google Meet classes, record attendance, and export registers.
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSyncRecordingsSheet}
              disabled={syncingRecordings}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-amber-500/40 text-[var(--text)] text-xs sm:text-sm font-semibold transition-all hover:bg-[var(--card-hover)] cursor-pointer disabled:opacity-50"
              title="Sync all class recording links for this branch into a single Google Sheet"
            >
              <Video className="w-4 h-4 text-amber-400" />
              <span>{syncingRecordings ? "Syncing Sheet..." : "Recordings Sheet"}</span>
            </button>

            <button
              onClick={() => navigate(`/branches/analytics/${branchId}`)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-focus)] text-[var(--text)] text-xs sm:text-sm font-semibold transition-all hover:bg-[var(--card-hover)] cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Analytics Suite</span>
            </button>

            <button
              onClick={() => navigate(`/create-class/${branchId}`)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Class</span>
            </button>
          </div>
        </div>

        {/* MONTH FILTER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs mb-8 transition-colors">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedMonth("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                selectedMonth === "ALL"
                  ? "bg-[var(--primary)] text-white border-transparent shadow-xs"
                  : "bg-[var(--bg-secondary)] text-[var(--subtext)] border-[var(--border)] hover:text-[var(--text)]"
              }`}
            >
              All Classes ({classes.length})
            </button>
            {months.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                  selectedMonth === m
                    ? "bg-[var(--primary)] text-white border-transparent shadow-xs"
                    : "bg-[var(--bg-secondary)] text-[var(--subtext)] border-[var(--border)] hover:text-[var(--text)]"
                }`}
              >
                {new Date(m + "-01").toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })}
              </button>
            ))}
          </div>

          {selectedMonth !== "ALL" && (
            <button
              onClick={() => handleExportMonth(selectedMonth)}
              disabled={exportingMonth === selectedMonth}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {exportingMonth === selectedMonth ? "Exporting..." : `Download ${selectedMonth} Excel`}
              </span>
            </button>
          )}
        </div>

        {/* CLASS CARDS GRID */}
        {filteredClasses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/50 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[var(--text)] mb-1">
              No classes in this batch
            </h3>
            <p className="text-xs sm:text-sm text-[var(--subtext)] max-w-sm mx-auto mb-6">
              Create a scheduled Google Meet class to invite students and track telemetry live.
            </p>
            <button
              onClick={() => navigate(`/create-class/${branchId}`)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/25 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Schedule New Class
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClasses.map((cls) => {
              const isCustom = !cls.meetLink?.includes("meet.google.com");
              const isAuto = cls.meetMode === "auto" || (!isCustom && cls.googleCalendarEventId);

              return (
                <div
                  key={cls._id}
                  onClick={() => navigate(`/class/${cls._id}`)}
                  className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-focus)] p-5 sm:p-6 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
                >
                  <div>
                    {/* TOP BADGES & MENU */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isAuto
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/25"
                        }`}
                      >
                        <Video className="w-3 h-3" />
                        {isAuto ? "Google Meet" : "Custom Link"}
                      </span>

                      {/* 3-DOT MENU */}
                      <div
                        className="card-menu-wrapper relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            setMenuOpenId(menuOpenId === cls._id ? null : cls._id)
                          }
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--subtext)] hover:text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpenId === cls._id && (
                          <div className="absolute right-0 top-9 w-36 rounded-xl border border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-xl shadow-xl p-1 z-30 animate-[dropdownIn_0.15s_ease-out]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(null);
                                navigate(`/edit-class/${cls._id}`);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Edit Class</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(cls._id, cls.className);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-base sm:text-lg text-[var(--text-heading)] group-hover:text-[var(--primary)] transition-colors line-clamp-1 mb-2">
                      {cls.className}
                    </h3>

                    {/* TIMING INFO */}
                    <div className="space-y-1 text-xs text-[var(--subtext)] mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>
                          {new Date(cls.createdAt).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>
                          {new Date(cls.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ACTIONS */}
                  <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => handleCopyLink(cls.code, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)] border border-[var(--border)] text-[var(--text)] text-xs font-semibold transition-colors cursor-pointer"
                      title="Copy student join link"
                    >
                      {copiedId === cls.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[var(--subtext)]" />
                          <span>Join Link</span>
                        </>
                      )}
                    </button>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] group-hover:translate-x-0.5 transition-transform">
                      View Attendance <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          title={toast.title}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
