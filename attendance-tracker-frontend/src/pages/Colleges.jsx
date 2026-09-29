import { useState, useEffect } from "react";
import API from "../services/api";

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
  { _id: "default_snc", name: "Sarojini Naidu College", code: "SNC" }
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
  } catch {
    // Ignore error
  }
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
  const [success, setSuccess] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  /* ================= FETCH COLLEGES ================= */
  const fetchColleges = async () => {
    try {
      const res = await API.get("/colleges");
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setColleges(res.data);
        localStorage.setItem("app_colleges", JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn("Using offline/cached colleges list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  /* ================= ADD COLLEGE ================= */
  const handleAddCollege = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    // Check duplicate
    if (colleges.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError(`"${trimmedName}" is already in the colleges list.`);
      setTimeout(() => setError(""), 4000);
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    const tempId = "col_" + Date.now();
    const newCollegeItem = {
      _id: tempId,
      name: trimmedName,
      code: trimmedCode
    };

    // Optimistically update UI and local storage
    const updatedList = [newCollegeItem, ...colleges];
    setColleges(updatedList);
    localStorage.setItem("app_colleges", JSON.stringify(updatedList));
    setName("");
    setCode("");
    setSuccess(`"${trimmedName}" added successfully!`);
    setTimeout(() => setSuccess(""), 4000);

    try {
      const res = await API.post("/colleges/create", {
        name: trimmedName,
        code: trimmedCode
      });

      if (res.data?.college) {
        setColleges((prev) => {
          const synced = prev.map((item) => (item._id === tempId ? res.data.college : item));
          localStorage.setItem("app_colleges", JSON.stringify(synced));
          return synced;
        });
      }
    } catch (err) {
      console.warn("Backend sync notice for new college:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= DELETE COLLEGE ================= */
  const handleDeleteCollege = async (id, collegeName) => {
    if (!window.confirm(`Are you sure you want to remove "${collegeName}"?`)) return;

    setDeletingId(id);
    const updatedList = colleges.filter((c) => c._id !== id);
    setColleges(updatedList);
    localStorage.setItem("app_colleges", JSON.stringify(updatedList));
    setSuccess(`"${collegeName}" removed.`);
    setTimeout(() => setSuccess(""), 3000);

    try {
      if (!id.startsWith("default_") && !id.startsWith("col_")) {
        await API.delete(`/colleges/delete/${id}`);
      }
    } catch (err) {
      console.warn("Backend sync notice for deleted college:", err);
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
    <div className="min-h-[calc(100vh-64px)] bg-[var(--bg)] px-4 py-8 sm:px-6 md:px-10 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight mb-2">
            Colleges & Institutions
          </h1>
          <p className="text-sm sm:text-base text-[var(--subtext)] max-w-xl mx-auto">
            Manage available colleges for student attendance registers and check-ins
          </p>
        </div>

        {/* ADD COLLEGE FORM CARD */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-[var(--shadow-sm)] mb-8 transition-colors duration-200">
          <h2 className="text-base sm:text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2">
            <span className="w-2 h-5 bg-gradient-to-b from-[var(--primary)] to-purple-500 rounded-full inline-block" />
            Add New College
          </h2>

          <form onSubmit={handleAddCollege} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="College Name (e.g. Osmania University, St. Francis College)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-11 px-4 text-sm rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />
            </div>

            <div className="w-full sm:w-44">
              <input
                type="text"
                placeholder="Code (e.g. OU, SFC)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={10}
                className="w-full h-11 px-4 text-sm rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)] uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-[var(--primary)] to-purple-600 hover:from-[var(--primary-hover)] hover:to-purple-700 text-white font-bold text-sm cursor-pointer shadow-[0_4px_16px_rgba(99,102,241,0.35)] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none whitespace-nowrap flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  + Add College
                </>
              )}
            </button>
          </form>

          {/* Feedback Messages */}
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {success}
            </div>
          )}
        </div>

        {/* SEARCH & STATS BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--text)]">Available Colleges</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--primary-light)] text-[var(--primary)]">
              {colleges.length}
            </span>
          </div>

          <div className="w-full sm:w-72 relative">
            <input
              type="text"
              placeholder="Search colleges by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-xs sm:text-sm rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--primary-light)]"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtext)] pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {/* COLLEGES GRID */}
        {loading ? (
          <div className="text-center py-16 text-[var(--subtext)] font-medium">
            Loading colleges...
          </div>
        ) : filteredColleges.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">🏛️</div>
            <h3 className="text-base font-bold text-[var(--text)] mb-1">
              {searchTerm ? "No colleges match your search" : "No colleges added yet"}
            </h3>
            <p className="text-xs text-[var(--subtext)] max-w-sm mx-auto">
              {searchTerm
                ? "Try searching with a different keyword or clear the search filter."
                : "Use the form above to add your first college to the system."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredColleges.map((college) => (
              <div
                key={college._id}
                className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] rounded-2xl p-4.5 sm:p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between gap-4 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {college.code ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--primary)]">
                        {college.code}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-[var(--subtext)] bg-[var(--bg-secondary)]">
                        COLLEGE
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--text)] tracking-tight leading-snug group-hover:text-[var(--primary)] transition-colors">
                    {college.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs text-[var(--subtext)]">
                  <span>Registered in system</span>
                  <button
                    onClick={() => handleDeleteCollege(college._id, college.name)}
                    disabled={deletingId === college._id}
                    title="Remove College"
                    className="p-1.5 rounded-lg text-[var(--subtext)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    {deletingId === college._id ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default Colleges;
