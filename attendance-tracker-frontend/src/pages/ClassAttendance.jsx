import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import "./ClassAttendance.css";

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

  if (loading) return <div className="loading">Loading attendance...</div>;

  return (
    <div className="page">

      <h2>Class Attendance</h2>

      {/* TOP ACTIONS */}
      <div className="card">
        {/* Row 1: Back + Download Full + Google Sheet */}
        <div className="action-row">
          <button className="btn" onClick={() => navigate(-1)}>
            ← Back to Dashboard
          </button>

          <button className="btn" onClick={handleExportAll}>
            📥 Download Excel
          </button>

          <button 
            className="btn google-sheet-btn" 
            onClick={handleExportGoogleSheet}
            disabled={exportingSheet || attendance.length === 0}
          >
            {exportingSheet ? "Opening Sheet..." : "📊 Open in Google Sheets"}
          </button>
        </div>

        {/* Row 2: College select + Download Selected */}
        <div className="action-row college-row">
          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="college-select"
          >
            <option value="">Select College</option>
            {Object.keys(collegeStudents).sort().map(college => (
              <option key={college} value={college}>{college}</option>
            ))}
          </select>

          <button className="btn" onClick={handleCollegeExport} disabled={!selectedCollege}>
            Download Selected College
          </button>
        </div>
      </div>

      {/* NO DATA */}
      {attendance.length === 0 && (
        <div className="card">
          <h3>No Attendance Yet</h3>
          <p>No students have joined this class yet.</p>
        </div>
      )}

      {/* RAW RECORDS */}
      {attendance.length > 0 && (
        <div className="card">
          <h3>Attendance Records</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Group</th>
                  <th>College</th>
                  <th>Date</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record, i) => {
                  if (!record.student) return null;
                  const d = new Date(record.createdAt);

                  return (
                    <tr key={record._id}>
                      <td>{i + 1}</td>
                      <td>{record.student.fullName}</td>
                      <td>{record.student.email}</td>
                      <td>{record.student.group}</td>
                      <td>{record.student.college}</td>
                      <td>{d.toLocaleDateString()}</td>
                      <td>{d.toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUMMARY */}
      

      {/* COLLEGE WISE */}
      {Object.keys(collegeStudents).length > 0 && (
        <div className="card">
          <h3>College Wise Students</h3>

          {Object.keys(collegeStudents).sort().map(college => (
            <div key={college} className="college">
              <h4>{college}</h4>

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Group</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collegeStudents[college].map((s, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{s.fullName}</td>
                        <td>{s.email}</td>
                        <td>{s.group}</td>
                        <td><b>{s.joinCount}</b></td>
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
