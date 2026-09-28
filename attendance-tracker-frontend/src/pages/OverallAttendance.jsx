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

  const exportGoogleSheet = async () => {
    try {
      setExportingSheet(true);
      const res = await API.post(`/attendance/export-google-sheet-overall/${branchId}`);
      if (res.data?.sheetUrl) {
        window.open(res.data.sheetUrl, "_blank");
      } else {
        alert("Google Sheet created successfully!");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to export to Google Sheets. Make sure your Google Account is connected.");
    } finally {
      setExportingSheet(false);
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

    </div>
  );
}

export default OverallAttendance;