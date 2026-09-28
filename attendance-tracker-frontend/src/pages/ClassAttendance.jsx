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

  const handleExportGoogleSheet = async () => {
    try {
      setExportingSheet(true);
      const res = await API.post(`/attendance/export-google-sheet/${id}`);
      if (res.data?.sheetUrl) {
        window.open(res.data.sheetUrl, "_blank");
      } else {
        alert("Google Sheet generated successfully!");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to export to Google Sheets. Please ensure your Google Account is connected.");
    } finally {
      setExportingSheet(false);
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
    </div>
  );
}

export default ClassAttendance;
