import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, useParams } from "react-router-dom";
import "./Dashboard.css";

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
    <div className="dashboard-page">
      {/* TOP HEADER */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <div>
            <h2 className="dashboard-title">{branchName} Classes</h2>
            <p className="dashboard-subtitle">
              Manage class sessions, attendance links, and Google Meet meetings
            </p>
          </div>
        </div>

        <div className="dashboard-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/overall-attendance/${branchId}`)}
          >
            📊 Overall Attendance
          </button>

          <button
            className="btn btn-primary"
            onClick={() => navigate(`/create-class/${branchId}`)}
          >
            + Create Class
          </button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {classes.length === 0 && (
        <div className="empty-classes-card">
          <div className="empty-icon">📚</div>
          <h3>No classes created yet in {branchName}</h3>
          <p>Schedule your first class session to generate meet links and track student attendance.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/create-class/${branchId}`)}
          >
            + Create First Class
          </button>
        </div>
      )}

      {/* 3-COLUMN CLASS CARDS GRID */}
      <div className="classes-grid">
        {classes.map((cls) => {
          const isMenuOpen = menuOpenId === cls._id;
          const isCopied = copiedId === cls.classCode;
          const formattedTag = (cls.subject || "GENERAL").toUpperCase().replace(/\s+/g, "-");
          const isExpired = new Date(cls.expiresAt) <= new Date();

          return (
            <div
              key={cls._id}
              className="codeguru-card class-card-item"
              onClick={(e) => handleCardClick(e, cls._id)}
            >
              {/* Top Accent Bar */}
              <div className={`card-top-accent ${isExpired ? "accent-expired" : ""}`} />

              <div className="card-inner">
                {/* Header Row: Subject Tag, Status, 3-Dots Menu */}
                <div className="card-header-row">
                  <div className="card-tags">
                    <span className="card-tag">{formattedTag}</span>
                    <span className={`card-status-badge ${isExpired ? "status-expired" : ""}`}>
                      <span className={`status-dot ${isExpired ? "dot-expired" : ""}`}></span>
                      {isExpired ? "Expired" : "Active"}
                    </span>
                  </div>

                  {/* 3-Dots Menu */}
                  <div className="card-menu-wrapper">
                    <button
                      className="menu-trigger-btn"
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
                      <div className="card-dropdown-menu">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/class/${cls._id}`);
                          }}
                        >
                          👁️ View Attendance
                        </button>
                        <button
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
                            className="dropdown-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            🎥 Join Google Meet
                          </a>
                        )}
                        <div className="dropdown-divider"></div>
                        <button
                          className="danger-item"
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
                <div className="card-body">
                  <h3 className="card-title">{cls.className}</h3>
                  <p className="card-desc">
                    Code: <span className="code-badge">{cls.classCode}</span>
                  </p>
                </div>

                {/* Footer Row: Copy Link & View Action */}
                <div className="card-footer-row">
                  <button
                    className="copy-link-btn"
                    onClick={(e) => handleCopyLink(cls.classCode, e)}
                    title="Copy student join link"
                  >
                    {isCopied ? "✅ Copied!" : "📋 Copy Link"}
                  </button>

                  <button
                    className="card-action-link"
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
