import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

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
    navigate(`/dashboard/${branch._id}`);
  };

  const openAnalytics = (branch) => {
    navigate(`/branch/${branch._id}`);
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
    if (e.target.closest(".card-menu-wrapper")) return;
    openBranch(branch);
  };

  return (
    <div className="p-5 sm:p-9 min-h-screen bg-[var(--bg)] transition-colors duration-200 max-w-[1180px] mx-auto">
      <div className="text-center mb-7">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight m-0">
          Your Branches
        </h2>
        <p className="text-sm text-[var(--subtext)] mt-1.5">
          Manage your active class branches and attendance registers
        </p>
      </div>

      {/* Create Branch Form */}
      <form className="flex flex-col sm:flex-row justify-center gap-3 mb-9 max-w-[600px] mx-auto" onSubmit={createBranch}>
        <input
          placeholder="Enter branch name (e.g. Web Development, Python, SQL)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[240px] sm:min-w-[280px] py-3 px-4.5 rounded-lg border-[1.5px] border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm outline-none transition-all duration-200 shadow-[var(--shadow-sm)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-light)]"
        />
        <button
          type="submit"
          className="py-3 px-5.5 border-0 rounded-lg bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white font-semibold text-sm cursor-pointer transition-all duration-200 shadow-[0_2px_10px_rgba(99,102,241,0.3)] whitespace-nowrap hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(99,102,241,0.45)]"
        >
          + Create Branch
        </button>
      </form>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5.5 w-full">
        {branches.length === 0 ? (
          <div className="col-span-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center text-[var(--subtext)] text-[14.5px]">
            <p>No branches created yet. Enter a branch name above to get started!</p>
          </div>
        ) : (
          branches.map((b) => {
            const formattedTag = b.name.toUpperCase().replace(/\s+/g, "-");
            const isMenuOpen = menuOpenId === b._id;

            return (
              <div
                key={b._id}
                className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-200 flex flex-col relative cursor-pointer hover:-translate-y-1 hover:shadow-[var(--shadow-md)] hover:border-emerald-500/40"
                onClick={(e) => handleCardClick(e, b)}
              >
                {/* Top Green Accent Bar */}
                <div className="h-[4.5px] bg-gradient-to-r from-emerald-500 to-emerald-400 w-full" />

                <div className="p-5 sm:p-5.5 flex flex-col flex-1 justify-between">
                  {/* Header Row: Tag, Status, 3-Dot Menu */}
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[10.5px] font-bold uppercase py-1 px-2.5 rounded-md tracking-wider border border-[var(--border)]">
                        {formattedTag}
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-500 text-[11px] font-bold py-0.5 px-2.5 rounded-full inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Active
                      </span>
                    </div>

                    {/* 3-Dot Options Menu */}
                    <div className="card-menu-wrapper relative">
                      <button
                        className="bg-transparent border-0 text-[var(--subtext)] text-lg w-7.5 h-7.5 rounded-md cursor-pointer flex items-center justify-center transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text)]"
                        onClick={() => setMenuOpenId(isMenuOpen ? null : b._id)}
                        title="Options"
                        aria-label="Options"
                      >
                        ⋮
                      </button>

                      {isMenuOpen && (
                        <div className="absolute top-8.5 right-0 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-lg)] w-48 p-1.5 z-50 animate-[fadeIn_0.15s_ease-out]">
                          <button
                            className="w-full text-left bg-transparent border-0 py-2 px-3 text-[13px] font-semibold text-[var(--text)] rounded-md cursor-pointer block transition-colors hover:bg-[var(--bg-secondary)]"
                            onClick={() => openBranch(b)}
                          >
                            📂 View Classes
                          </button>
                          <button
                            className="w-full text-left bg-transparent border-0 py-2 px-3 text-[13px] font-semibold text-[var(--text)] rounded-md cursor-pointer block transition-colors hover:bg-[var(--bg-secondary)]"
                            onClick={() => openAnalytics(b)}
                          >
                            📊 View Analytics
                          </button>
                          {b.sheetUrl && (
                            <a
                              href={b.sheetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full text-left bg-transparent border-0 py-2 px-3 text-[13px] font-semibold text-[var(--text)] rounded-md cursor-pointer block transition-colors hover:bg-[var(--bg-secondary)] no-underline"
                            >
                              📊 Google Sheet
                            </a>
                          )}
                          <div className="h-px bg-[var(--border)] my-1" />
                          <button
                            className="w-full text-left bg-transparent border-0 py-2 px-3 text-[13px] font-semibold text-[var(--danger)] rounded-md cursor-pointer block transition-colors hover:bg-[var(--danger-light)]"
                            onClick={() => deleteBranch(b._id)}
                          >
                            🗑️ Delete Branch
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body: Title & Description */}
                  <div className="mb-6">
                    <h3
                      className="text-[18.5px] font-extrabold text-[var(--text)] mb-2 cursor-pointer transition-colors leading-tight hover:text-[var(--primary)]"
                      onClick={() => openBranch(b)}
                    >
                      {b.name}
                    </h3>
                    <p className="text-[13px] text-[var(--subtext)] leading-relaxed m-0">
                      Attendance register, student tracking, and live session management.
                    </p>
                  </div>

                  {/* Footer Row: Meta & Action Link */}
                  <div className="flex items-center justify-between pt-3.5 border-t border-[var(--border)] gap-3">
                    <div className="text-[12.5px] font-semibold text-[var(--subtext)] flex items-center gap-3">
                      <span>📖 {b.classCount || 0} Classes</span>
                    </div>

                    <button
                      className="bg-transparent border-0 text-[var(--primary)] text-[13.5px] font-bold cursor-pointer inline-flex items-center gap-1 transition-all duration-200 p-0 hover:text-[var(--primary-hover)] hover:translate-x-1"
                      onClick={() => openBranch(b)}
                    >
                      View Classes →
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
