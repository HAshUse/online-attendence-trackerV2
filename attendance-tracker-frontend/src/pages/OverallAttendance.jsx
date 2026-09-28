import { useEffect, useState } from "react";
import API from "../services/api";
import { useParams } from "react-router-dom";

function OverallAttendance() {
  const [data, setData] = useState([]);
  const [collegeWise, setCollegeWise] = useState({});
  const [selectedCollege, setSelectedCollege] = useState("");

  const { branchId } = useParams();

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get(`/attendance/overall/${branchId}`);
        setData(res.data);

        // GROUP BY COLLEGE
        const map = {};
        res.data.forEach((s) => {
          const college = s.college || "UNKNOWN";
          if (!map[college]) map[college] = [];
          map[college].push(s);
        });

        setCollegeWise(map);

      } catch (err) {
        console.log(err);
      }
    };

    if (branchId) fetchData();
  }, [branchId]);

  /* ================= DOWNLOAD HELPER ================= */

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  /* ================= EXPORT ALL ================= */

  const exportExcel = async () => {
    try {
      const res = await API.get(
        `/attendance/overall/export/${branchId}`,
        { responseType: "blob" }
      );

      downloadFile(new Blob([res.data]), "overall_attendance.xlsx");

    } catch {
      alert("Failed to export");
    }
  };

  /* ================= EXPORT COLLEGE ================= */

  const exportCollegeExcel = async () => {
    if (!selectedCollege) return;

    try {
      const res = await API.get(
        `/attendance/overall/export/${branchId}?college=${encodeURIComponent(selectedCollege)}`,
        { responseType: "blob" }
      );

      downloadFile(new Blob([res.data]), `${selectedCollege}_attendance.xlsx`);

    } catch {
      alert("Failed to export college data");
    }
  };

  /* ================= EXPORT GOOGLE SHEET ================= */

  const [exportingSheet, setExportingSheet] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const exportGoogleSheet = async () => {
    try {
      setExportingSheet(true);
      const res = await API.post(`/attendance/export-google-sheet-overall/${branchId}`);
      if (res.data?.sheetUrl) {
        showToast("Google Sheet opened successfully!", "success");
        window.open(res.data.sheetUrl, "_blank");
      } else {
        showToast("Google Sheet created successfully!", "success");
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

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-7 sm:px-6 md:px-8 transition-colors duration-200">

      <h2 className="mb-6 text-2xl font-bold text-[var(--text)] tracking-tight">
        Overall Student Attendance
      </h2>

      {/* ACTION BAR */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        <button 
          className="px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-xs sm:text-sm font-semibold transition-all duration-200 hover:bg-[var(--primary-hover)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 cursor-pointer inline-flex items-center gap-1.5" 
          onClick={exportExcel}
        >
          📥 Export Excel
        </button>

        <button
          className="px-4 py-2.5 rounded-lg bg-[#0f9d58] hover:bg-[#0b8043] text-white text-xs sm:text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none inline-flex items-center gap-1.5 cursor-pointer"
          onClick={exportGoogleSheet}
          disabled={exportingSheet || data.length === 0}
        >
          {exportingSheet ? "Opening Sheet..." : "📊 Open in Google Sheets"}
        </button>

        <select
          value={selectedCollege}
          onChange={(e) => setSelectedCollege(e.target.value)}
          className="min-w-[180px] h-10 px-3 py-1.5 rounded-lg border-[1.5px] border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm outline-none cursor-pointer transition-all duration-200 focus:border-[var(--border-focus)] focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Select College</option>
          {Object.keys(collegeWise).sort().map((college) => (
            <option key={college} value={college}>{college}</option>
          ))}
        </select>

        <button
          className="px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-xs sm:text-sm font-semibold transition-all duration-200 hover:bg-[var(--primary-hover)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer inline-flex items-center gap-1.5"
          disabled={!selectedCollege}
          onClick={exportCollegeExcel}
        >
          Export College
        </button>
      </div>

      {/* MAIN TABLE */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] border-collapse text-left">
            <thead>
              <tr>
                <th className="sticky top-0 bg-[var(--primary-light)] z-10 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)] border-b border-[var(--border)] text-left">Name</th>
                <th className="sticky top-0 bg-[var(--primary-light)] z-10 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)] border-b border-[var(--border)] text-left">Email</th>
                <th className="sticky top-0 bg-[var(--primary-light)] z-10 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)] border-b border-[var(--border)] text-left">Group</th>
                <th className="sticky top-0 bg-[var(--primary-light)] z-10 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)] border-b border-[var(--border)] text-left">College</th>
                <th className="sticky top-0 bg-[var(--primary-light)] z-10 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)] border-b border-[var(--border)] text-left">Total Joined</th>
                <th className="sticky top-0 bg-[var(--primary-light)] z-10 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)] border-b border-[var(--border)] text-left">Classes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-[var(--subtext)] py-10 px-5 text-sm">
                    No attendance data available
                  </td>
                </tr>
              ) : (
                data.map((s, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-secondary)] transition-colors duration-150">
                    <td className="px-4 py-3.5 text-sm font-medium text-[var(--text)]">{s.fullName}</td>
                    <td className="px-4 py-3.5 text-sm text-[var(--subtext)]">{s.email}</td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text)]">{s.group}</td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text)]">{s.college}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-[var(--text)]">{s.totalClassesJoined}</td>
                    <td className="px-4 py-3.5 text-sm text-[var(--subtext)]">{s.classes.join(", ")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COLLEGE WISE */}
      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-[var(--text)] tracking-tight">
          College Wise Attendance
        </h2>

        {Object.keys(collegeWise).length === 0 ? (
          <p className="text-sm text-[var(--subtext)]">No data available</p>
        ) : (
          Object.keys(collegeWise).sort().map((college) => (
            <div key={college} className="mt-5 p-5 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm transition-colors duration-200">
              <h3 className="mb-4 border-l-4 border-[var(--primary)] pl-3 text-base font-bold text-[var(--text)]">
                {college}
              </h3>

              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full min-w-[650px] border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">#</th>
                      <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Name</th>
                      <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Email</th>
                      <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Group</th>
                      <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Total Joined</th>
                      <th className="bg-[var(--primary-light)] text-[var(--primary)] px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)] text-left">Classes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {collegeWise[college].map((s, i) => (
                      <tr key={i} className="hover:bg-[var(--bg-secondary)] transition-colors duration-150">
                        <td className="px-4 py-3 text-sm text-[var(--text)]">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-[var(--text)]">{s.fullName}</td>
                        <td className="px-4 py-3 text-sm text-[var(--subtext)]">{s.email}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text)]">{s.group}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[var(--text)]">{s.totalClassesJoined}</td>
                        <td className="px-4 py-3 text-sm text-[var(--subtext)]">{s.classes.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          ))
        )}
      </div>

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

export default OverallAttendance;