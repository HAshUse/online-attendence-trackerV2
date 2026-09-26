import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./Branches.css";

function Branches() {
  const [branches, setBranches] = useState([]);
  const [name, setName] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const navigate = useNavigate();

  // ================= LOAD BRANCHES =================
  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await API.get("/branches/my");
      setBranches(res.data);
    } catch (err) {
      console.log(err);
    }
  };

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

  // ================= CREATE BRANCH =================
  const createBranch = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await API.post("/branches/create", { name: name.trim() });
      setName("");
      fetchBranches();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create branch");
    }
  };

  const openBranch = (branch) => {
    navigate(`/branch/${branch._id}`);
  };

  const openAnalytics = (branch) => {
    navigate(`/branch-dashboard/${branch._id}`);
  };

  // ================= DELETE BRANCH =================
  const deleteBranch = async (branchId) => {
    setMenuOpenId(null);
    const confirmDelete = window.confirm(
      "Delete this branch?\nAll classes & attendance will be permanently removed!"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/branches/delete/${branchId}`);
      setBranches((prev) => prev.filter((b) => b._id !== branchId));
      alert("Branch deleted successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete branch");
    }
  };

  const handleCardClick = (e, branch) => {
    // If the click was inside the 3-dot menu or dropdown, don't trigger card navigation
    if (e.target.closest(".card-menu-wrapper")) return;
    openBranch(branch);
  };

  return (
    <div className="branch-page">
      <div className="branch-page-header">
        <h2>Your Branches</h2>
        <p className="branch-page-sub">Manage your active class branches and attendance registers</p>
      </div>

      {/* Create Branch Form */}
      <form className="branch-create" onSubmit={createBranch}>
        <input
          placeholder="Enter branch name (e.g. Web Development, Python, SQL)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">+ Create Branch</button>
      </form>

      {/* Branch Cards Grid */}
      <div className="branch-grid">
        {branches.length === 0 ? (
          <div className="no-branches-card">
            <p>No branches created yet. Enter a branch name above to get started!</p>
          </div>
        ) : (
          branches.map((b) => {
            const formattedTag = b.name.toUpperCase().replace(/\s+/g, "-");
            const isMenuOpen = menuOpenId === b._id;

            return (
              <div
                key={b._id}
                className="codeguru-card clickable"
                onClick={(e) => handleCardClick(e, b)}
              >
                {/* Top Green Accent Bar */}
                <div className="card-top-accent" />

                <div className="card-inner">
                  {/* Header Row: Tag, Status, 3-Dot Menu */}
                  <div className="card-header-row">
                    <div className="card-tags">
                      <span className="card-tag">{formattedTag}</span>
                      <span className="card-status-badge">
                        <span className="status-dot"></span> Active
                      </span>
                    </div>

                    {/* 3-Dot Options Menu */}
                    <div className="card-menu-wrapper">
                      <button
                        className="menu-trigger-btn"
                        onClick={() => setMenuOpenId(isMenuOpen ? null : b._id)}
                        title="Options"
                        aria-label="Options"
                      >
                        ⋮
                      </button>

                      {isMenuOpen && (
                        <div className="card-dropdown-menu">
                          <button onClick={() => openBranch(b)}>
                            📂 Open Branch
                          </button>
                          <button onClick={() => openAnalytics(b)}>
                            📊 Analytics Dashboard
                          </button>
                          {b.sheetUrl && (
                            <a
                              href={b.sheetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="dropdown-link"
                            >
                              📊 Google Sheet
                            </a>
                          )}
                          <div className="dropdown-divider"></div>
                          <button
                            className="danger-item"
                            onClick={() => deleteBranch(b._id)}
                          >
                            🗑️ Delete Branch
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body: Title & Description */}
                  <div className="card-body">
                    <h3 className="card-title" onClick={() => openBranch(b)}>
                      {b.name}
                    </h3>
                    <p className="card-desc">
                      Attendance register, student tracking, and live session management.
                    </p>
                  </div>

                  {/* Footer Row: Meta & Action Link */}
                  <div className="card-footer-row">
                    <div className="card-meta">
                      <span>📖 {b.classCount || 0} Classes</span>
                    </div>

                    <button
                      className="card-action-link"
                      onClick={() => openBranch(b)}
                    >
                      Open Branch →
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Branches;