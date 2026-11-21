import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, useParams } from "react-router-dom";

function Dashboard() {
  const [classes, setClasses] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [exportingMonth, setExportingMonth] = useState(null);

  const navigate = useNavigate();
  const { branchId } = useParams();

  /* ================= FETCH CLASSES (BY BRANCH) ================= */
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await API.get(`/classes/my?branchId=${branchId}`);
        setClasses(res.data);
      } catch (err) {
        console.log(err);
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
        console.log(err);
        setBranchName("Branch");
      }
    };

    if (branchId) fetchBranch();
  }, [branchId]);

  // Close 3-dot dropdown on outside click
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
  const handleDelete = async (classId) => {
    setMenuOpenId(null);
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this class?\nAll attendance records will be permanently removed!"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/classes/delete/${classId}`);
      setClasses((prev) => prev.filter((c) => c._id !== classId));
      alert("Class deleted successfully");
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to delete class. Please try again.");
    }
  };

  /* ================= COPY JOIN LINK ================= */
  const handleCopyLink = (classCode, e) => {
    e.stopPropagation();
    const joinUrl = `${window.location.origin}/join/${classCode}`;
    navigator.clipboard.writeText(joinUrl).catch(() => {
      // Fallback for non-HTTPS or denied clipboard permission
      window.prompt("Copy this link:", joinUrl);
    });
    setCopiedId(classCode);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCardClick = (e, classId) => {
    if (e.target.closest(".card-menu-wrapper") || e.target.closest(".copy-link-btn")) return;
    navigate(`/class/${classId}`);
  };

  /* ================= MONTH GROUPING & EXTRACTION ================= */
  const getMonthInfo = (cls) => {
    const raw = cls.classDate || (cls.createdAt ? cls.createdAt.slice(0, 10) : "");
    if (!raw || raw.length < 7) {
      return { key: "other", label: "Other Classes", sortVal: "0000-00" };
    }
    const key = raw.slice(0, 7); // "YYYY-MM"
    const [year, month] = key.split("-");
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m)) {
      return { key: "other", label: "Other Classes", sortVal: "0000-00" };
    }
    const label = new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
    return { key, label, sortVal: key };
  };

  const monthGroups = classes.reduce((acc, cls) => {
    const { key, label, sortVal } = getMonthInfo(cls);
    if (!acc[key]) {
      acc[key] = { key, label, sortVal, classes: [] };
    }
    acc[key].classes.push(cls);
    return acc;
  }, {});

  const sortedMonths = Object.values(monthGroups).sort((a, b) =>
    b.sortVal.localeCompare(a.sortVal)
  );

  const handleQuickExportMonthExcel = async (monthKey, monthLabel, e) => {
    e.stopPropagation();
    try {
      setExportingMonth(monthKey);
      const res = await API.get(
        `/attendance/overall/export/${branchId}?month=${monthKey}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const cleanLabel = monthLabel.replace(/[\s/\\?%*:|"<>]/g, "_");
      link.setAttribute("download", `${branchName || "branch"}_${cleanLabel}_attendance.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to export month attendance. Please try again.");
    } finally {
      setExportingMonth(null);
    }
  };

  /* ================= RENDER CLASS CARD ================= */
  const renderClassCard = (cls) => {
    const isMenuOpen = menuOpenId === cls._id;
    const isCopied = copiedId === cls.classCode;
    const formattedTag = (cls.subject || "GENERAL").toUpperCase().replace(/\s+/g, "-");
    const isExpired = new Date(cls.expiresAt) <= new Date();

    return (
      <div
        key={cls._id}
        className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-200 flex flex-col relative cursor-pointer hover:-translate-y-1 hover:shadow-[var(--shadow-md)] hover:border-emerald-500/40"
        onClick={(e) => handleCardClick(e, cls._id)}
      >
        {/* Top Accent Bar */}
        <div
          className={`h-[4.5px] w-full ${
            isExpired
              ? "bg-gradient-to-r from-slate-400 to-slate-300"
              : "bg-gradient-to-r from-emerald-500 to-emerald-400"
          }`}
        />

        <div className="p-5 sm:p-5.5 flex flex-col flex-1 justify-between">
          {/* Header Row: Subject Tag, Status, 3-Dots Menu */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[10.5px] font-bold uppercase py-1 px-2.5 rounded-md tracking-wider border border-[var(--border)]">
                {formattedTag}
              </span>
              <span
                className={`text-[11px] font-bold py-0.5 px-2.5 rounded-full inline-flex items-center gap-1.5 ${
                  isExpired
                    ? "bg-slate-400/15 text-[var(--subtext)]"
                    : "bg-emerald-500/10 text-emerald-500"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isExpired ? "bg-slate-400" : "bg-emerald-500"
                  }`}
                ></span>
                {isExpired ? "Expired" : "Active"}
              </span>
            </div>

            {/* 3-Dots Menu */}
            <div className="card-menu-wrapper relative">
              <button
                className="bg-transparent border-0 text-[var(--subtext)] text-lg w-7.5 h-7.5 rounded-md cursor-pointer flex items-center justify-center transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text)]"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(isMenuOpen ? null : cls._id);
                }}
                title="Options"
                aria-label="Options"
              >
                ⋮
              </button>

              {isMenuOpen && (
                <div className="absolute top-8.5 right-0 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-lg)] w-50 p-1.5 z-50 animate-[fadeIn_0.15s_ease-out]">
                  <button
                    className="w-full text-left bg-transparent border-0 py-2 px-3 text-[13px] font-semibold text-[var(--text)] rounded-md cursor-pointer block transition-colors hover:bg-[var(--bg-secondary)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/class/${cls._id}`);
                    }}
                  >
                    👁️ View Attendance
                  </button>
                  <button
                    className="w-full text-left bg-transparent border-0 py-2 px-3 text-[13px] font-semibold text-[var(--text)] rounded-md cursor-pointer block transition-colors hover:bg-[var(--bg-secondary)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/edit-class/${cls._id}`);
                    }}
                  >
                    ✏️ Edit Class
                  </button>
                  {cls.meetLink && (
                    <a
                      href={cls.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-left bg-transparent border-0 py-2 px-3 text-[13px] font-semibold text-[var(--text)] rounded-md cursor-pointer block transition-colors hover:bg-[var(--bg-secondary)] no-underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      🎥 Join Google Meet
                    </a>
                  )}
                  <div className="h-px bg-[var(--border)] my-1" />
                  <button
                    className="w-full text-left bg-transparent border-0 py-2 px-3 text-[13px] font-semibold text-[var(--danger)] rounded-md cursor-pointer block transition-colors hover:bg-[var(--danger-light)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(cls._id);
                    }}
                  >
                    🗑️ Delete Class
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Body: Title & Details */}
          <div className="mb-5.5">
            <h3 className="text-[18.5px] font-extrabold text-[var(--text)] mb-2 transition-colors leading-tight">
              {cls.className}
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-[13px] text-[var(--subtext)] leading-relaxed m-0">
                Code: <span className="font-bold text-[var(--primary)] bg-[var(--primary-light)] py-0.5 px-2 rounded">{cls.classCode}</span>
              </p>
              {cls.classDate && (
                <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--subtext)] bg-[var(--bg-secondary)] border border-[var(--border)] px-2 py-0.5 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {new Date(cls.classDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>

          {/* Footer Row: Copy Link & View Action */}
          <div className="flex items-center justify-between pt-3.5 border-t border-[var(--border)] gap-2.5">
            <button
              className="copy-link-btn bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer transition-colors hover:bg-[var(--card-hover)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              onClick={(e) => handleCopyLink(cls.classCode, e)}
              title="Copy student join link"
            >
              {isCopied ? "✅ Copied!" : "📋 Copy Link"}
            </button>

            <button
              className="bg-transparent border-0 text-[var(--primary)] text-[13.5px] font-bold cursor-pointer inline-flex items-center gap-1 transition-all duration-200 p-0 hover:text-[var(--primary-hover)] hover:translate-x-1"
              onClick={() => navigate(`/class/${cls._id}`)}
            >
              View Attendance →
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-5 sm:p-9 bg-[var(--bg)] min-h-screen transition-colors duration-200 max-w-[1180px] mx-auto">
      {/* TOP HEADER */}
      <div className="flex items-start sm:items-center justify-between mb-7 gap-4 flex-col sm:flex-row flex-wrap">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-[var(--text)] tracking-tight m-0">
              {branchName} Classes
            </h2>
            <p className="text-[13.5px] text-[var(--subtext)] mt-1">
              Manage class sessions, attendance links, and Google Meet meetings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto justify-between sm:justify-start">
          <button
            className="border border-[var(--border)] py-2.5 px-4.5 rounded-lg cursor-pointer font-semibold text-[13.5px] transition-all duration-200 inline-flex items-center gap-1.5 bg-[var(--card)] text-[var(--text)] hover:bg-[var(--card-hover)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            onClick={() => navigate(`/branch/${branchId}`)}
          >
            📈 Analytics
          </button>

          <button
            className="border border-[var(--border)] py-2.5 px-4.5 rounded-lg cursor-pointer font-semibold text-[13.5px] transition-all duration-200 inline-flex items-center gap-1.5 bg-[var(--card)] text-[var(--text)] hover:bg-[var(--card-hover)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            onClick={() => navigate(`/overall-attendance/${branchId}`)}
          >
            📊 Overall Attendance
          </button>

          <button
            className="border-0 py-2.5 px-4.5 rounded-lg cursor-pointer font-semibold text-[13.5px] transition-all duration-200 inline-flex items-center gap-1.5 bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white shadow-[0_2px_10px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(99,102,241,0.45)]"
            onClick={() => navigate(`/create-class/${branchId}`)}
          >
            + Create Class
          </button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {classes.length === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-10 sm:p-14 text-center max-w-[600px] my-10 mx-auto shadow-[var(--shadow-sm)]">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="text-lg font-bold text-[var(--text)] mb-2">No classes created yet in {branchName}</h3>
          <p className="text-[var(--subtext)] text-sm mb-5 leading-relaxed">
            Schedule your first class session to generate meet links and track student attendance.
          </p>
          <button
            className="border-0 py-2.5 px-4.5 rounded-lg cursor-pointer font-semibold text-[13.5px] transition-all duration-200 inline-flex items-center gap-1.5 bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white shadow-[0_2px_10px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(99,102,241,0.45)]"
            onClick={() => navigate(`/create-class/${branchId}`)}
          >
            + Create First Class
          </button>
        </div>
      )}

      {/* MONTH FILTER PILLS BAR */}
      {classes.length > 0 && sortedMonths.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          <button
            onClick={() => setSelectedMonth("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedMonth === "ALL"
                ? "bg-[var(--primary)] text-white shadow-sm shadow-indigo-500/25"
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--subtext)] hover:text-[var(--text)] hover:bg-[var(--card-hover)]"
            }`}
          >
            All Months ({classes.length})
          </button>
          {sortedMonths.map((m) => (
            <button
              key={m.key}
              onClick={() => setSelectedMonth(m.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedMonth === m.key
                  ? "bg-[var(--primary)] text-white shadow-sm shadow-indigo-500/25"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--subtext)] hover:text-[var(--text)] hover:bg-[var(--card-hover)]"
              }`}
            >
              {m.label} ({m.classes.length})
            </button>
          ))}
        </div>
      )}

      {/* MONTH-WISE CLASS SECTIONS */}
      {sortedMonths
        .filter((group) => selectedMonth === "ALL" || selectedMonth === group.key)
        .map((group) => (
          <div key={group.key} className="mb-10">
            {/* Month Section Header */}
            <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[var(--border)] flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🗓️</span>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text)] m-0">
                  {group.label}
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20">
                  {group.classes.length} {group.classes.length === 1 ? "class" : "classes"}
                </span>
              </div>

              {/* Action Buttons for this Month */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => navigate(`/overall-attendance/${branchId}?month=${group.key}`)}
                  className="text-xs font-semibold py-1.5 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all cursor-pointer inline-flex items-center gap-1.5"
                  title={`View attendance register for ${group.label}`}
                >
                  📊 Month Attendance →
                </button>
                {group.key !== "other" && (
                  <button
                    onClick={(e) => handleQuickExportMonthExcel(group.key, group.label, e)}
                    disabled={exportingMonth === group.key}
                    className="text-xs font-semibold py-1.5 px-3 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    title={`Download Excel register for ${group.label}`}
                  >
                    {exportingMonth === group.key ? "Exporting..." : "📥 Export Excel"}
                  </button>
                )}
              </div>
            </div>

            {/* Cards Grid for this Month */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5.5 w-full">
              {group.classes.map(renderClassCard)}
            </div>
          </div>
        ))}
    </div>
  );
}

export default Dashboard;

