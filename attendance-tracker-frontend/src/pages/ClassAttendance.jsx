import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";

function ClassAttendance() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState([]);
  const [collegeStudents, setCollegeStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCollege, setSelectedCollege] = useState("");

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [attRes, sumRes] = await Promise.all([
          API.get(`/attendance/class/${id}`),
          API.get(`/attendance/summary/${id}`)
        ]);

        setAttendance(attRes.data);
        setSummary(sumRes.data);

        // COLLEGE WISE MAP
        const map = {};

        attRes.data.forEach(record => {
          if (!record.student) return;

          const s = record.student;
          const college = s.college || "UNKNOWN";

          if (!map[college]) map[college] = {};

          if (!map[college][s.email]) {
            map[college][s.email] = {
              fullName: s.fullName,
              email: s.email,
              group: s.group,
              joinCount: 1
            };
          } else {
            map[college][s.email].joinCount += 1;
          }
        });

        const formatted = {};
        Object.keys(map).forEach(c => {
          formatted[c] = Object.values(map[c]);
        });

        setCollegeStudents(formatted);

      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [id]);

  /* ================= EXPORT ================= */

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportAll = async () => {
    try {
      const res = await API.get(`/attendance/export/${id}`, { responseType: "blob" });
      downloadFile(new Blob([res.data]), "attendance.xlsx");
    } catch (err) {
      console.log(err);
    }
  };

  const handleCollegeExport = async () => {
    if (!selectedCollege) return;
    try {
      const res = await API.get(`/attendance/export/${id}?college=${selectedCollege}`, { responseType: "blob" });
      downloadFile(new Blob([res.data]), `${selectedCollege}_attendance.xlsx`);
    } catch (err) {
      console.log(err);
    }
  };

  const [exportingSheet, setExportingSheet] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleExportGoogleSheet = async () => {
    try {
      setExportingSheet(true);
      const res = await API.post(`/attendance/export-google-sheet/${id}`);
      if (res.data?.sheetUrl) {
        showToast("Google Sheet opened successfully!", "success");
        window.open(res.data.sheetUrl, "_blank");
      } else {
        showToast("Google Sheet generated successfully!", "success");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "";
      if (
        msg.toLowerCase().includes("connect your google") ||
        msg.toLowerCase().includes("google account") ||
        err.response?.status === 400
      ) {
        setShowGoogleModal(true);
      } else {
        showToast(msg || "Failed to export to Google Sheets", "error");
      }
    } finally {
      setExportingSheet(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setConnectingGoogle(true);
      const res = await API.get("/auth/google/url");
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      showToast("Failed to initiate Google connection", "error");
    } finally {
      setConnectingGoogle(false);
    }
  };

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="text-center font-medium text-[var(--subtext)] mt-16 text-base">
        Loading attendance...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-7 sm:px-6 md:px-8 transition-colors duration-200">

      <h2 className="text-center mb-7 text-2xl font-bold text-[var(--text)] tracking-tight">
        Class Attendance
      </h2>

      {/* TOP ACTIONS */}
      <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm mb-6 transition-colors duration-200 flex flex-col gap-3">
        {/* Row 1: Back + Download Full + Google Sheet */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            className="px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-xs sm:text-sm font-semibold transition-all duration-200 hover:bg-[var(--primary-hover)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 cursor-pointer" 
            onClick={() => navigate(-1)}
          >
            ← Back to Dashboard
          </button>

          <button 
            className="px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-xs sm:text-sm font-semibold transition-all duration-200 hover:bg-[var(--primary-hover)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 cursor-pointer" 
            onClick={handleExportAll}
          >
            📥 Download Excel
          </button>

          <button 
            className="px-4 py-2.5 rounded-lg bg-[#0f9d58] hover:bg-[#0b8043] text-white text-xs sm:text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none inline-flex items-center gap-1.5 cursor-pointer" 
            onClick={handleExportGoogleSheet}
            disabled={exportingSheet || attendance.length === 0}
          >
            {exportingSheet ? "Opening Sheet..." : "📊 Open in Google Sheets"}
          </button>
        </div>

        {/* Row 2: College select + Download Selected */}
        <div className="flex items-center gap-2.5 flex-wrap pt-3 border-t border-[var(--border)]">
          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="flex-1 min-w-[180px] px-3 py-2 text-sm border-[1.5px] border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] outline-none cursor-pointer transition-all duration-200 focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Select College</option>
            {Object.keys(collegeStudents).sort().map(college => (
              <option key={college} value={college}>{college}</option>
            ))}
          </select>

          <button 
            className="px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-xs sm:text-sm font-semibold transition-all duration-200 hover:bg-[var(--primary-hover)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer" 
            onClick={handleCollegeExport} 
            disabled={!selectedCollege}
          >
            Download Selected College
          </button>
        </div>
      </div>

      {/* NO DATA */}
      {attendance.length === 0 && (
        <div className="bg-[var(--card)] p-8 rounded-2xl border border-[var(--border)] shadow-sm mb-6 transition-colors duration-200 text-center">
          <h3 className="text-base font-bold text-[var(--text)] mb-1">No Attendance Yet</h3>
          <p className="text-sm text-[var(--subtext)]">No students have joined this class yet.</p>
        </div>
      )}

      {/* RAW RECORDS */}
      {attendance.length > 0 && (
        <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm mb-6 transition-colors duration-200 flex flex-col gap-3">
          <h3 className="text-base sm:text-lg font-bold text-[var(--text)] flex items-center gap-2 before:content-[''] before:inline-block before:w-1 before:h-4.5 before:bg-gradient-to-b before:from-[var(--primary)] before:to-purple-400 before:rounded-full">
            Attendance Records
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[600px] border-collapse bg-[var(--card)] text-left">
              <thead>
                <tr>
                  <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">#</th>
                  <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Name</th>
                  <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Email</th>
                  <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Group</th>
                  <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">College</th>
                  <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Date</th>
                  <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {attendance.map((record, i) => {
                  if (!record.student) return null;
                  const d = new Date(record.createdAt);

                  return (
                    <tr key={record._id} className="hover:bg-[var(--bg-secondary)] transition-colors duration-150">
                      <td className="px-4 py-3 text-sm text-[var(--text)]">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text)]">{record.student.fullName}</td>
                      <td className="px-4 py-3 text-sm text-[var(--subtext)]">{record.student.email}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text)]">{record.student.group}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text)]">{record.student.college}</td>
                      <td className="px-4 py-3 text-sm text-[var(--subtext)]">{d.toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-[var(--subtext)]">{d.toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COLLEGE WISE */}
      {Object.keys(collegeStudents).length > 0 && (
        <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm mb-6 transition-colors duration-200 flex flex-col gap-4">
          <h3 className="text-base sm:text-lg font-bold text-[var(--text)] flex items-center gap-2 before:content-[''] before:inline-block before:w-1 before:h-4.5 before:bg-gradient-to-b before:from-[var(--primary)] before:to-purple-400 before:rounded-full">
            College Wise Students
          </h3>

          {Object.keys(collegeStudents).sort().map(college => (
            <div key={college} className="border-l-4 border-[var(--primary)] pl-4 mb-6">
              <h4 className="mt-2 mb-2.5 text-xs sm:text-sm text-[var(--subtext)] font-semibold uppercase tracking-wider">
                {college}
              </h4>

              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full min-w-[600px] border-collapse bg-[var(--card)] text-left">
                  <thead>
                    <tr>
                      <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">#</th>
                      <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Name</th>
                      <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Email</th>
                      <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Group</th>
                      <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {collegeStudents[college].map((s, i) => (
                      <tr key={i} className="hover:bg-[var(--bg-secondary)] transition-colors duration-150">
                        <td className="px-4 py-3 text-sm text-[var(--text)]">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-[var(--text)]">{s.fullName}</td>
                        <td className="px-4 py-3 text-sm text-[var(--subtext)]">{s.email}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text)]">{s.group}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[var(--text)]">{s.joinCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* GOOGLE CONNECT POPUP MODAL */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="fixed inset-0" onClick={() => setShowGoogleModal(false)} />
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 shadow-2xl max-w-md w-full z-10 transition-colors duration-200 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl shadow-inner">
              📊
            </div>
            <h3 className="text-xl font-bold text-[var(--text)] tracking-tight mb-2">
              Connect Google Account
            </h3>
            <p className="text-xs sm:text-sm text-[var(--subtext)] leading-relaxed mb-6">
              To export attendance registers and create live spreadsheets in your Google Drive, please connect your Google account.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)] text-[var(--text)] text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={connectingGoogle}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] hover:opacity-95 text-white text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {connectingGoogle ? (
                  "Connecting..."
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Connect Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border animate-[fadeIn_0.2s_ease-out] ${
          toast.type === "error"
            ? "bg-red-950/90 border-red-500/30 text-red-200"
            : "bg-emerald-950/90 border-emerald-500/30 text-emerald-200"
        }`}>
          <span className="text-lg">{toast.type === "error" ? "⚠️" : "✅"}</span>
          <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-white cursor-pointer bg-transparent border-0">✕</button>
        </div>
      )}
    </div>
  );
}

export default ClassAttendance;
