// import { useEffect, useState } from "react";
// import API from "../services/api";
// import "./OverallAttendance.css";
// import { useNavigate } from "react-router-dom";

// function OverallAttendance() {
//   const [data, setData] = useState([]);
//   const [collegeWise, setCollegeWise] = useState({});
//   const [selectedCollege, setSelectedCollege] = useState("");
//   const navigate = useNavigate();

//   /* ================= FETCH DATA ================= */

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const res = await API.get("/attendance/overall");
//         setData(res.data);

//         // GROUP BY COLLEGE
//         const map = {};
//         res.data.forEach((s) => {
//           const college = s.college || "UNKNOWN";
//           if (!map[college]) map[college] = [];
//           map[college].push(s);
//         });

//         setCollegeWise(map);
//       } catch (err) {
//         console.log(err);
//       }
//     };

//     fetchData();
//   }, []);

//   /* ================= EXPORT ================= */

//   const downloadFile = (blob, filename) => {
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.setAttribute("download", filename);
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
//   };

//   const exportExcel = async () => {
//     try {
//       const res = await API.get("/attendance/overall/export", { responseType: "blob" });
//       downloadFile(new Blob([res.data]), "overall_attendance.xlsx");
//     } catch {
//       alert("Failed to export");
//     }
//   };

//   const exportCollegeExcel = async () => {
//     if (!selectedCollege) return;

//     try {
//       const res = await API.get(
//         `/attendance/overall/export?college=${encodeURIComponent(selectedCollege)}`,
//         { responseType: "blob" }
//       );

//       downloadFile(new Blob([res.data]), `${selectedCollege}_attendance.xlsx`);
//     } catch {
//       alert("Failed to export college data");
//     }
//   };

//   /* ================= UI ================= */

//   return (
//     <div className="overall-page">

//       <h2>Overall Student Attendance</h2>

//       {/* ACTION BAR */}
//       <div className="overall-actions">
//         <button className="btn" onClick={() => navigate("/dashboard")}>
//           ← Back
//         </button>

//         <button className="export-btn" onClick={exportExcel}>
//           Export All
//         </button>

//         <select
//           value={selectedCollege}
//           onChange={(e) => setSelectedCollege(e.target.value)}
//           className="input"
//         >
//           <option value="">Select College</option>
//           {Object.keys(collegeWise).sort().map((college) => (
//             <option key={college} value={college}>{college}</option>
//           ))}
//         </select>

//         <button
//           className="export-btn"
//           disabled={!selectedCollege}
//           onClick={exportCollegeExcel}
//         >
//           Export College
//         </button>
//       </div>

//       {/* MAIN TABLE */}
//       <div className="table-container">
//         <div className="table-wrapper">
//           <table className="overall-table">
//             <thead>
//               <tr>
//                 <th>Name</th>
//                 <th>Email</th>
//                 <th>Group</th>
//                 <th>College</th>
//                 <th>Total Joined</th>
//                 <th>Classes</th>
//               </tr>
//             </thead>
//             <tbody>
//               {data.length === 0 ? (
//                 <tr>
//                   <td colSpan="6" className="no-data">
//                     No attendance data available
//                   </td>
//                 </tr>
//               ) : (
//                 data.map((s, i) => (
//                   <tr key={i}>
//                     <td>{s.fullName}</td>
//                     <td>{s.email}</td>
//                     <td>{s.group}</td>
//                     <td>{s.college}</td>
//                     <td>{s.totalClassesJoined}</td>
//                     <td>{s.classes.join(", ")}</td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* COLLEGE WISE */}
//       <div className="college-wise-container">
//         <h2>College Wise Attendance</h2>

//         {Object.keys(collegeWise).length === 0 ? (
//           <p className="no-data">No data available</p>
//         ) : (
//           Object.keys(collegeWise).sort().map((college) => (
//             <div key={college} className="college-card">
//               <h3 className="college-title">{college}</h3>

//               <div className="table-wrapper">
//                 <table className="overall-table">
//                   <thead>
//                     <tr>
//                       <th>#</th>
//                       <th>Name</th>
//                       <th>Email</th>
//                       <th>Group</th>
//                       <th>Total Joined</th>
//                       <th>Classes</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {collegeWise[college].map((s, i) => (
//                       <tr key={i}>
//                         <td>{i + 1}</td>
//                         <td>{s.fullName}</td>
//                         <td>{s.email}</td>
//                         <td>{s.group}</td>
//                         <td>{s.totalClassesJoined}</td>
//                         <td>{s.classes.join(", ")}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//             </div>
//           ))
//         )}
//       </div>

//     </div>
//   );
// }

// export default OverallAttendance;
import { useEffect, useState } from "react";
import API from "../services/api";
import "./OverallAttendance.css";
import { useNavigate, useParams } from "react-router-dom";

function OverallAttendance() {
  const [data, setData] = useState([]);
  const [collegeWise, setCollegeWise] = useState({});
  const [selectedCollege, setSelectedCollege] = useState("");

  const navigate = useNavigate();
  const { branchId } = useParams();   // ⭐ NEW

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ⭐ fetch only this branch
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
    <div className="overall-page">

      <h2>Overall Student Attendance</h2>

      {/* ACTION BAR */}
      <div className="overall-actions">
        <button className="export-btn" onClick={exportExcel}>
          📥 Export Excel
        </button>

        <button
          className="export-btn google-sheet-btn"
          onClick={exportGoogleSheet}
          disabled={exportingSheet || data.length === 0}
        >
          {exportingSheet ? "Opening Sheet..." : "📊 Open in Google Sheets"}
        </button>

        <select
          value={selectedCollege}
          onChange={(e) => setSelectedCollege(e.target.value)}
          className="input"
        >
          <option value="">Select College</option>
          {Object.keys(collegeWise).sort().map((college) => (
            <option key={college} value={college}>{college}</option>
          ))}
        </select>

        <button
          className="export-btn"
          disabled={!selectedCollege}
          onClick={exportCollegeExcel}
        >
          Export College
        </button>
      </div>

      {/* MAIN TABLE */}
      <div className="table-container">
        <div className="table-wrapper">
          <table className="overall-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Group</th>
                <th>College</th>
                <th>Total Joined</th>
                <th>Classes</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">
                    No attendance data available
                  </td>
                </tr>
              ) : (
                data.map((s, i) => (
                  <tr key={i}>
                    <td>{s.fullName}</td>
                    <td>{s.email}</td>
                    <td>{s.group}</td>
                    <td>{s.college}</td>
                    <td>{s.totalClassesJoined}</td>
                    <td>{s.classes.join(", ")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COLLEGE WISE */}
      <div className="college-wise-container">
        <h2>College Wise Attendance</h2>

        {Object.keys(collegeWise).length === 0 ? (
          <p className="no-data">No data available</p>
        ) : (
          Object.keys(collegeWise).sort().map((college) => (
            <div key={college} className="college-card">
              <h3 className="college-title">{college}</h3>

              <div className="table-wrapper">
                <table className="overall-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Group</th>
                      <th>Total Joined</th>
                      <th>Classes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collegeWise[college].map((s, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{s.fullName}</td>
                        <td>{s.email}</td>
                        <td>{s.group}</td>
                        <td>{s.totalClassesJoined}</td>
                        <td>{s.classes.join(", ")}</td>
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
 