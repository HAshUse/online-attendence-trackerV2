import { useState, useEffect } from "react";
import API from "../services/api";
import {
  GraduationCap,
  Plus,
  Search,
  Building2,
  Trash2,
  Sparkles,
  School,
  X,
} from "lucide-react";
import Toast from "../components/Toast";

export const DEFAULT_COLLEGES = [
  { _id: "6abbc719e79c74cbdba68f45", name: "BR Ambedkar College", code: "BRAC" },
  { _id: "default_city", name: "City College", code: "CC" },
  { _id: "default_vivek", name: "Vivekananda College", code: "VC" },
  { _id: "default_bjr", name: "BJR College", code: "BJR" },
  { _id: "default_malka", name: "Malkajigiri College", code: "MC" },
  { _id: "default_gol", name: "Golconda College", code: "GC" },
  { _id: "default_hussaini", name: "Hussaini Alam College", code: "HAC" },
  { _id: "default_begumpet", name: "Begumpet College", code: "BC" },
  { _id: "default_ams", name: "Andhra Mahila Sabha", code: "AMS" },
  { _id: "default_snc", name: "Sarojini Naidu College", code: "SNC" },
];

const getInitialColleges = () => {
  try {
    const cached = localStorage.getItem("app_colleges");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_COLLEGES;
};

function Colleges() {
  const [colleges, setColleges] = useState(getInitialColleges);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info", title = "") => {
    setToast({ message, type, title, id: Date.now() });
  };

  const fetchColleges = async () => {
    try {
      const res = await API.get("/colleges");
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setColleges(res.data);
        localStorage.setItem("app_colleges", JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn("Using cached colleges:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleAddCollege = async (e) => {
    e.preventDefault();
    const collegeName = name.trim();
    const collegeCode = code.trim().toUpperCase();

    if (!collegeName) {
      setError("Please enter the college name.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await API.post("/colleges", {
        name: collegeName,
        code: collegeCode || collegeName.substring(0, 4).toUpperCase(),
      });

      const updated = [res.data, ...colleges];
      setColleges(updated);
      localStorage.setItem("app_colleges", JSON.stringify(updated));
      setName("");
      setCode("");
      showToast(`Added ${collegeName} to colleges list.`, "success", "College Added");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add college.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (collegeId, collegeName) => {
    const confirmed = window.confirm(`Remove "${collegeName}" from the colleges list?`);
    if (!confirmed) return;

    try {
      setDeletingId(collegeId);
      await API.delete(`/colleges/${collegeId}`);
      const updated = colleges.filter((c) => c._id !== collegeId);
      setColleges(updated);
      localStorage.setItem("app_colleges", JSON.stringify(updated));
      showToast(`Removed "${collegeName}".`, "info", "Removed");
    } catch (err) {
      // Local fallback for default offline fixtures
      const updated = colleges.filter((c) => c._id !== collegeId);
      setColleges(updated);
      localStorage.setItem("app_colleges", JSON.stringify(updated));
      showToast(`Removed "${collegeName}".`, "info", "Removed");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredColleges = colleges.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8 sm:px-6 md:px-10 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Institutional Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] tracking-tight">
              Colleges & Campuses
            </h1>
            <p className="text-xs sm:text-sm text-[var(--subtext)] mt-1">
              Colleges populated here appear as suggestions for students when joining classes.
            </p>
          </div>
        </div>

        {/* 2-COLUMN LAYOUT: ADD FORM (LEFT) + LIST (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ADD FORM */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 shadow-[var(--shadow-sm)] sticky top-24 transition-colors">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-heading)]">Add College</h3>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleAddCollege} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                    College / Campus Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyderabad Central College"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                    Abbreviation / Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HCC (Optional)"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] uppercase transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submitting ? "Adding..." : "Add College"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* LIST & SEARCH */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search colleges by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-2xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors shadow-xs"
              />
            </div>

            {/* Cards List */}
            <div className="space-y-2.5">
              {filteredColleges.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] text-center text-xs text-[var(--subtext)]">
                  No colleges found matching "{searchTerm}".
                </div>
              ) : (
                filteredColleges.map((col, index) => (
                  <div
                    key={col._id || index}
                    className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-focus)] transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[var(--primary-light)] transition-colors">
                        {col.code ? col.code.slice(0, 3) : <School className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-heading)] truncate">
                          {col.name}
                        </h4>
                        {col.code && (
                          <span className="text-[11px] font-semibold text-[var(--subtext)]">
                            Code: {col.code}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(col._id, col.name)}
                      disabled={deletingId === col._id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      title="Remove College"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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

export default Colleges;
