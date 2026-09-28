import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const YEAR_OPTIONS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "2024 - 2025",
  "2025 - 2026",
  "Final Year"
];

function Branches() {
  const [branches, setBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", year: "" });
  const [customYear, setCustomYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

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

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const openModal = () => {
    setFormData({ name: "", year: "" });
    setCustomYear("");
    setModalError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setModalError("");
  };

  // ================= CREATE BRANCH =================
  const createBranch = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError("Please enter a branch name");
      return;
    }

    const selectedYear = formData.year === "Custom" ? customYear.trim() : formData.year;

    setSubmitting(true);
    setModalError("");

    try {
      await API.post("/branches/create", {
        name: formData.name.trim(),
        year: selectedYear
      });
      closeModal();
      fetchBranches();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to create branch");
    } finally {
      setSubmitting(false);
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
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete branch");
    }
  };

  const handleCardClick = (e, branch) => {
    if (e.target.closest(".card-menu-wrapper")) return;
    openBranch(branch);
  };

  // Filtered branches by search term
  const filteredBranches = branches.filter((b) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = b.name.toLowerCase().includes(term);
    const yearMatch = b.year ? b.year.toLowerCase().includes(term) : false;
    return nameMatch || yearMatch;
  });

  return (
    <div className="p-5 sm:p-9 min-h-screen bg-[var(--bg)] transition-colors duration-200 max-w-[1180px] mx-auto">
      {/* HEADER */}
      <div className="text-center mb-7">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight m-0">
          Your Branches
        </h2>
        <p className="text-sm text-[var(--subtext)] mt-1.5">
          Manage your active class branches and attendance registers
        </p>
      </div>

      {/* SEARCH BAR & CREATE BRANCH BUTTON */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mb-9 max-w-[720px] mx-auto w-full">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--subtext)] pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search branches by name or year..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3 pl-11 pr-10 rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm outline-none transition-all duration-200 shadow-[var(--shadow-sm)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-light)]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--subtext)] hover:text-[var(--text)] p-1 rounded-md text-base leading-none cursor-pointer"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Create Branch Button (Triggers Popup Modal) */}
        <button
          type="button"
          onClick={openModal}
          className="w-full sm:w-auto py-3 px-5.5 border-0 rounded-xl bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white font-semibold text-sm cursor-pointer transition-all duration-200 shadow-[0_2px_10px_rgba(99,102,241,0.3)] whitespace-nowrap flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(99,102,241,0.45)] active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + Create Branch
        </button>
      </div>

      {/* BRANCH CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5.5 w-full">
        {branches.length === 0 ? (
          <div className="col-span-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center text-[var(--subtext)] text-[14.5px]">
            <p>No branches created yet. Click <strong>+ Create Branch</strong> to add your first branch!</p>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="col-span-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-10 text-center text-[var(--subtext)] text-[14.5px]">
            <div className="text-3xl mb-2">🔍</div>
            <p className="font-semibold text-[var(--text)]">No branches found matching "{searchTerm}"</p>
            <p className="text-xs text-[var(--subtext)] mt-1">Try searching with a different keyword.</p>
          </div>
        ) : (
          filteredBranches.map((b) => {
            const formattedTag = b.name.toUpperCase().replace(/\s+/g, "-");
            const isMenuOpen = menuOpenId === b._id;

            return (
              <div
                key={b._id}
                className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden transition-all duration-200 flex flex-col relative cursor-pointer hover:-translate-y-1 hover:shadow-[var(--shadow-md)] hover:border-emerald-500/40 group"
                onClick={(e) => handleCardClick(e, b)}
              >
                {/* Top Green Accent Bar */}
                <div className="h-[4.5px] bg-gradient-to-r from-emerald-500 to-emerald-400 w-full" />

                <div className="p-5 sm:p-5.5 flex flex-col flex-1 justify-between">
                  {/* Header Row: Tag, Year, Status, 3-Dot Menu */}
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-[var(--bg-secondary)] text-[var(--subtext)] text-[10.5px] font-bold uppercase py-1 px-2.5 rounded-md tracking-wider border border-[var(--border)]">
                        {formattedTag}
                      </span>
                      {b.year && (
                        <span className="bg-[var(--primary-light)] text-[var(--primary)] text-[10.5px] font-bold py-1 px-2 rounded-md tracking-wide">
                          📅 {b.year}
                        </span>
                      )}
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
                      className="text-[18.5px] font-extrabold text-[var(--text)] mb-2 cursor-pointer transition-colors leading-tight group-hover:text-[var(--primary)]"
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

      {/* CREATE BRANCH POPUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          {/* Modal Overlay / Backdrop Click Handler */}
          <div className="fixed inset-0" onClick={closeModal} />

          {/* Modal Content */}
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 shadow-2xl max-w-md w-full z-10 transition-colors duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-6 bg-gradient-to-b from-[var(--primary)] to-purple-500 rounded-full inline-block" />
                <h3 className="text-xl font-bold text-[var(--text)] tracking-tight m-0">
                  Create New Branch
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="p-1 rounded-lg text-[var(--subtext)] hover:text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-[var(--subtext)] mb-5">
              Enter the branch details to set up a new attendance register.
            </p>

            {/* Form */}
            <form onSubmit={createBranch} className="flex flex-col gap-4">
              {/* Branch Name Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--subtext)] uppercase tracking-wider">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Web Development, Data Analytics, Python"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  autoFocus
                  className="w-full py-2.5 px-3.5 text-sm rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
                />
              </div>

              {/* Branch Year Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--subtext)] uppercase tracking-wider">
                  Branch / Academic Year
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full py-2.5 px-3.5 text-sm rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none cursor-pointer transition-all duration-200 focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
                >
                  <option value="">Select Year (Optional)</option>
                  {YEAR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-[var(--card)] text-[var(--text)]">
                      {opt}
                    </option>
                  ))}
                  <option value="Custom" className="bg-[var(--card)] text-[var(--text)]">
                    + Enter Custom Year
                  </option>
                </select>
              </div>

              {/* Custom Year Text Input (if Custom selected) */}
              {formData.year === "Custom" && (
                <div className="flex flex-col gap-1.5 animate-[fadeIn_0.15s_ease-out]">
                  <label className="text-xs font-bold text-[var(--subtext)] uppercase tracking-wider">
                    Custom Year Specification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Batch 2026, Semester 3"
                    value={customYear}
                    onChange={(e) => setCustomYear(e.target.value)}
                    required
                    className="w-full py-2.5 px-3.5 text-sm rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
                  />
                </div>
              )}

              {/* Error Message */}
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {modalError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)] text-[var(--text)] text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.name.trim()}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-br from-[var(--primary)] to-purple-600 hover:from-[var(--primary-hover)] hover:to-purple-700 text-white text-sm font-semibold shadow-[0_2px_10px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    "+ Create Branch"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Branches;