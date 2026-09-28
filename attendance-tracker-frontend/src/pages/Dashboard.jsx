import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, useParams } from "react-router-dom";

function Dashboard() {
  const [classes, setClasses] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

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
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  /* ================= COPY JOIN LINK ================= */
  const handleCopyLink = (classCode, e) => {
    e.stopPropagation();
    const joinUrl = `${window.location.origin}/join/${classCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedId(classCode);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCardClick = (e, classId) => {
    if (e.target.closest(".card-menu-wrapper") || e.target.closest(".copy-link-btn")) return;
    navigate(`/class/${classId}`);
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

      {/* 3-COLUMN CLASS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5.5 w-full">
        {classes.map((cls) => {
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
                  <p className="text-[13px] text-[var(--subtext)] leading-relaxed m-0">
                    Code: <span className="font-bold text-[var(--primary)] bg-[var(--primary-light)] py-0.5 px-2 rounded">{cls.classCode}</span>
                  </p>
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
        })}
      </div>
    </div>
  );
}

export default Dashboard;

