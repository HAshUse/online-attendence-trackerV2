import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  FolderPlus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  Sparkles,
  BarChart3,
  Calendar,
  Building2,
  X,
} from "lucide-react";
import Toast from "../components/Toast";

const YEAR_OPTIONS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "2024 - 2025",
  "2025 - 2026",
  "Final Year",
];

function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", year: "" });
  const [customYear, setCustomYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState(null);

  // Edit / Rename Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: "", year: "" });
  const [editCustomYear, setEditCustomYear] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editModalError, setEditModalError] = useState("");

  const navigate = useNavigate();

  const showToast = (message, type = "info", title = "") => {
    setToast({ message, type, title, id: Date.now() });
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await API.get("/branches/my");
      setBranches(res.data);
    } catch (err) {
      console.log(err);
      showToast("Could not load your branches. Please refresh.", "error");
    } finally {
      setLoading(false);
    }
  };

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

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isModalOpen) closeModal();
        if (editModalOpen) closeEditModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, editModalOpen]);

  const openModal = () => {
    setFormData({ name: "", year: "" });
    setCustomYear("");
    setModalError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setFormData({ name: "", year: "" });
    setCustomYear("");
    setModalError("");
  };

  const openEditModal = (branch, e) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setEditingBranch(branch);
    const isPredefined = YEAR_OPTIONS.includes(branch.year);
    setEditFormData({
      name: branch.name,
      year: isPredefined ? branch.year : "other",
    });
    setEditCustomYear(isPredefined ? "" : branch.year || "");
    setEditModalError("");
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (editSubmitting) return;
    setEditModalOpen(false);
    setEditingBranch(null);
    setEditFormData({ name: "", year: "" });
    setEditCustomYear("");
    setEditModalError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const branchName = formData.name.trim();
    const finalYear =
      formData.year === "other" ? customYear.trim() : formData.year.trim();

    if (!branchName) {
      setModalError("Please enter a branch name.");
      return;
    }
    if (!finalYear) {
      setModalError("Please select or enter an academic year.");
      return;
    }

    setSubmitting(true);
    setModalError("");
    try {
      const res = await API.post("/branches", {
        name: branchName,
        year: finalYear,
      });
      setBranches((prev) => [res.data, ...prev]);
      closeModal();
      showToast(`Branch "${branchName}" created!`, "success", "Branch Created");
    } catch (err) {
      setModalError(
        err.response?.data?.message || err.message || "Failed to create branch."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const branchName = editFormData.name.trim();
    const finalYear =
      editFormData.year === "other"
        ? editCustomYear.trim()
        : editFormData.year.trim();

    if (!branchName) {
      setEditModalError("Please enter a branch name.");
      return;
    }
    if (!finalYear) {
      setEditModalError("Please select or enter an academic year.");
      return;
    }

    setEditSubmitting(true);
    setEditModalError("");
    try {
      const res = await API.put(`/branches/${editingBranch._id}`, {
        name: branchName,
        year: finalYear,
      });
      setBranches((prev) =>
        prev.map((b) => (b._id === editingBranch._id ? res.data : b))
      );
      closeEditModal();
      showToast("Branch updated successfully!", "success", "Saved");
    } catch (err) {
      setEditModalError(
        err.response?.data?.message || err.message || "Failed to update branch."
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (branchId, branchName, e) => {
    e.stopPropagation();
    setMenuOpenId(null);
    const confirmed = window.confirm(
      `Delete "${branchName}"?\nAll classes and attendance records inside this branch will be permanently removed!`
    );
    if (!confirmed) return;

    try {
      await API.delete(`/branches/${branchId}`);
      setBranches((prev) => prev.filter((b) => b._id !== branchId));
      showToast(`Branch "${branchName}" deleted.`, "info", "Branch Removed");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete branch.", "error");
    }
  };

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8 sm:px-6 md:px-10 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-light)] border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Academic Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] tracking-tight">
              Branches & Batches
            </h1>
            <p className="text-xs sm:text-sm text-[var(--subtext)] mt-1">
              Select a branch to manage classes, view student attendance, and monitor analytics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Branch</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs mb-8 transition-colors">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search branches by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
            />
          </div>
          <div className="text-xs font-semibold text-[var(--subtext)] px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shrink-0 hidden sm:block">
            {loading ? "Loading..." : `${filteredBranches.length} ${filteredBranches.length === 1 ? "Branch" : "Branches"}`}
          </div>
        </div>

        {/* BRANCH CARDS GRID */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--subtext)] text-sm">
            <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
            <span>Loading branches...</span>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/50 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mx-auto mb-4">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[var(--text)] mb-1">
              {searchTerm ? "No matching branches" : "No branches created yet"}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--subtext)] max-w-sm mx-auto mb-6">
              {searchTerm
                ? `No branch matched "${searchTerm}". Clear your search query to see all branches.`
                : "Create your first branch batch (e.g. CSE 3rd Year) to start scheduling live attendance classes."}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:bg-[var(--card-hover)] cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/25 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" /> Create Branch
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBranches.map((branch) => (
              <div
                key={branch._id}
                onClick={() => navigate(`/dashboard/${branch._id}`)}
                className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-focus)] p-5 sm:p-6 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
              >
                {/* TOP ROW */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center font-bold text-base group-hover:scale-105 transition-transform">
                      {branch.name.charAt(0).toUpperCase()}
                    </div>

                    {/* MENU DROPDOWN */}
                    <div
                      className="card-menu-wrapper relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          setMenuOpenId(menuOpenId === branch._id ? null : branch._id)
                        }
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--subtext)] hover:text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                        title="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {menuOpenId === branch._id && (
                        <div className="absolute right-0 top-9 w-36 rounded-xl border border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-xl shadow-xl p-1 z-30 animate-[dropdownIn_0.15s_ease-out]">
                          <button
                            onClick={(e) => openEditModal(branch, e)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={(e) => handleDelete(branch._id, branch.name, e)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-base sm:text-lg text-[var(--text-heading)] group-hover:text-[var(--primary)] transition-colors truncate">
                    {branch.name}
                  </h3>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--subtext)] text-[11px] font-semibold mt-2 select-none">
                    <Calendar className="w-3 h-3" />
                    <span>{branch.year || "Academic Batch"}</span>
                  </div>
                </div>

                {/* BOTTOM ACTION BAR */}
                <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center justify-between text-xs font-semibold text-[var(--subtext)] group-hover:text-[var(--primary)] transition-colors">
                  <span className="inline-flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5" /> View Classes & Analytics
                  </span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE BRANCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out]">
          <div className="fixed inset-0" onClick={closeModal} />
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 shadow-2xl max-w-md w-full z-10 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-heading)]">
                  Create New Branch
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="text-[var(--subtext)] hover:text-[var(--text)] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                  Branch / Department Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science Engineering"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                  Academic Year / Batch
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer"
                >
                  <option value="">Select an academic year...</option>
                  {YEAR_OPTIONS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                  <option value="other">Custom Year / Batch...</option>
                </select>
              </div>

              {formData.year === "other" && (
                <div className="animate-[fadeIn_0.15s_ease-out]">
                  <label className="block text-xs font-bold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                    Custom Academic Year
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026 - 2030 or Fall 2026"
                    value={customYear}
                    onChange={(e) => setCustomYear(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-[var(--subtext)] hover:text-[var(--text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Creating..." : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out]">
          <div className="fixed inset-0" onClick={closeEditModal} />
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 shadow-2xl max-w-md w-full z-10 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-heading)]">
                  Edit Branch
                </h3>
              </div>
              <button
                onClick={closeEditModal}
                className="text-[var(--subtext)] hover:text-[var(--text)] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs">
                {editModalError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                  Academic Year / Batch
                </label>
                <select
                  value={editFormData.year}
                  onChange={(e) => setEditFormData({ ...editFormData, year: e.target.value })}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer"
                >
                  {YEAR_OPTIONS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                  <option value="other">Custom Year / Batch...</option>
                </select>
              </div>

              {editFormData.year === "other" && (
                <div className="animate-[fadeIn_0.15s_ease-out]">
                  <label className="block text-xs font-bold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                    Custom Year
                  </label>
                  <input
                    type="text"
                    value={editCustomYear}
                    onChange={(e) => setEditCustomYear(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-[var(--subtext)] hover:text-[var(--text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default Branches;
