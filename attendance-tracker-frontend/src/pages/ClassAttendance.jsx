import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import Toast from "../components/Toast";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Sparkles,
  RefreshCw,
  Building2,
  Users,
  ExternalLink,
  Video,
} from "lucide-react";

function ClassAttendance() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState([]);
  const [collegeStudents, setCollegeStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCollege, setSelectedCollege] = useState("");
  const [syncingMeet, setSyncingMeet] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [classInfo, setClassInfo] = useState(null);

  /* ================= FETCH DATA ================= */

  const handleSyncMeet = async (manual = true) => {
    try {
      setSyncingMeet(true);
      const res = await API.get(`/attendance/sync-meet/${id}`);
      if (res.data?.attendance) {
        setAttendance(res.data.attendance);
      }
      if (res.data?.recordingUrl) {
        setRecordingUrl(res.data.recordingUrl);
      }
      if (manual) {
        const count = res.data?.syncedCount || 0;
        if (count > 0) {
          showToast(res.data?.message || `Synced ${count} participants from Google Meet!`, "success", "Meet Synced");
        } else {
          showToast(res.data?.message || "No Google Meet conference records found yet. Ensure the meeting was joined.", "info", "Meet Telemetry");
        }
      }
    } catch (err) {
      console.warn("Meet telemetry sync error:", err);
      if (manual) {
        showToast(err.response?.data?.message || "Could not sync Google Meet data", "error", "Sync Error");
      }
    } finally {
      setSyncingMeet(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [attRes, sumRes, classRes] = await Promise.allSettled([
          API.get(`/attendance/class/${id}`),
          API.get(`/attendance/summary/${id}`),
          API.get(`/classes/single/${id}`)
        ]);

        if (attRes.status === "fulfilled") {
          setAttendance(attRes.value.data);
        }
        if (sumRes.status === "fulfilled") {
          setSummary(sumRes.value.data);
        }
        if (classRes.status === "fulfilled") {
          setClassInfo(classRes.value.data);
          if (classRes.value.data?.recordingUrl) {
            setRecordingUrl(classRes.value.data.recordingUrl);
          }
        }

        // COLLEGE WISE MAP
        const records = attRes.status === "fulfilled" ? attRes.value.data : [];
        const map = {};

        records.forEach(record => {
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

        // Run background non-blocking telemetry sync if meet link exists
        if (classRes.status === "fulfilled" && classRes.value.data?.meetLink?.includes("meet.google.com")) {
          handleSyncMeet(false);
        }

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

  const handleOpenBranchRecordingsSheet = async () => {
    try {
      const branchId = classInfo?.branch?._id || classInfo?.branch;
      if (!branchId) return;
      const res = await API.post(`/attendance/branch/${branchId}/sync-recordings`);
      if (res.data?.sheetUrl) {
        window.open(res.data.sheetUrl, "_blank");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Could not open recordings sheet.", "error");
    }
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
  const [createdSheetUrl, setCreatedSheetUrl] = useState(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [toast, setToast] = useState(null);

  // AI Clean & Dispatch States
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiRequirements, setAiRequirements] = useState("");
  const [selectedCols, setSelectedCols] = useState([
    "fullName",
    "email",
    "college",
    "group",
    "joinedAt",
    "leftAt",
    "durationMins",
    "status",
    "engagement",
    "stakeholderNotes",
  ]);
  const [dispatchTarget, setDispatchTarget] = useState("download");
  const [stakeholderEmails, setStakeholderEmails] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState(null);

  const availableColumns = [
    { key: "fullName", label: "Student Name" },
    { key: "email", label: "Email" },
    { key: "college", label: "College" },
    { key: "group", label: "Group / Dept" },
    { key: "joinedAt", label: "Joined Time" },
    { key: "leftAt", label: "Left Call At" },
    { key: "durationMins", label: "Duration (Mins)" },
    { key: "status", label: "Status" },
    { key: "engagement", label: "Engagement Level" },
    { key: "stakeholderNotes", label: "Stakeholder Notes" },
  ];

  const toggleCol = (colKey) => {
    setSelectedCols((prev) =>
      prev.includes(colKey) ? prev.filter((c) => c !== colKey) : [...prev, colKey]
    );
  };

  const applyPreset = (preset) => {
    if (preset === "hod") {
      setAiRequirements("Normalize all student names to Title Case, standardize college names, classify engagement into High/Moderate/Low, and include duration.");
    } else if (preset === "active") {
      setAiRequirements("Filter only to students who attended at least 10 minutes, format names cleanly, and highlight overall participation.");
    } else if (preset === "executive") {
      setAiRequirements("Format for executive management digest. Highlight any student who left early or had zero minutes, and provide concise engagement notes.");
    }
  };

  const handleAiPreview = async () => {
    try {
      setAiLoading(true);
      const res = await API.post(`/attendance/ai-preview/${id}`, {
        requirements: aiRequirements,
        selectedColumns: selectedCols,
      });
      setAiPreviewData(res.data);
      showToast(`Preview ready: ${res.data.records?.length || 0} records cleaned`, "info", "Preview Ready");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to generate preview", "error", "Preview Failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiDispatch = async () => {
    if (dispatchTarget === "email" && !stakeholderEmails.trim()) {
      showToast("Please enter at least one stakeholder recipient email.", "warning", "Missing Recipient");
      return;
    }

    try {
      setAiLoading(true);
      if (dispatchTarget === "download") {
        const res = await API.post(
          `/attendance/ai-dispatch/${id}`,
          {
            requirements: aiRequirements,
            selectedColumns: selectedCols,
            dispatchTarget: "download",
          },
          { responseType: "blob" }
        );
        const safeName = (classInfo?.className || "Attendance").replace(/[^a-z0-9]/gi, "_");
        downloadFile(new Blob([res.data]), `${safeName}_Cleaned_Report.xlsx`);
        showToast("Cleaned report downloaded successfully!", "success", "Download Complete");
        setShowAiModal(false);
      } else if (dispatchTarget === "email") {
        const res = await API.post(`/attendance/ai-dispatch/${id}`, {
          requirements: aiRequirements,
          selectedColumns: selectedCols,
          dispatchTarget: "email",
          stakeholderEmails,
        });
        showToast(res.data?.message || "Cleaned report sent to stakeholders!", "success", "Email Sent");
        setShowAiModal(false);
      } else if (dispatchTarget === "google_sheet") {
        const res = await API.post(`/attendance/ai-dispatch/${id}`, {
          requirements: aiRequirements,
          selectedColumns: selectedCols,
          dispatchTarget: "google_sheet",
        });
        if (res.data?.sheetUrl) {
          setCreatedSheetUrl(res.data.sheetUrl);
          showToast("Stakeholder Google Sheet generated!", "success", "Google Sheet", res.data.sheetUrl);
          window.open(res.data.sheetUrl, "_blank");
          setShowAiModal(false);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to dispatch cleaned attendance", "error", "Dispatch Failed");
    } finally {
      setAiLoading(false);
    }
  };

  const showToast = (message, type = "info", title = "", actionUrl = null) => {
    setToast({ message, type, title, actionUrl, id: Date.now() });
  };

  const handleExportGoogleSheet = async () => {
    // Open a blank tab synchronously on click to bypass browser popup blockers
    let newTab = null;
    try {
      newTab = window.open("about:blank", "_blank");
    } catch (e) {}

    try {
      setExportingSheet(true);
      const res = await API.post(`/attendance/export-google-sheet/${id}`);
      if (res.data?.sheetUrl) {
        setCreatedSheetUrl(res.data.sheetUrl);
        showToast("Google Sheet generated successfully!", "success", res.data.sheetUrl);
        if (newTab && !newTab.closed) {
          newTab.location.href = res.data.sheetUrl;
        } else {
          window.open(res.data.sheetUrl, "_blank");
        }
      } else {
        if (newTab && !newTab.closed) newTab.close();
        showToast("Google Sheet generated successfully!", "success");
      }
    } catch (err) {
      if (newTab && !newTab.closed) newTab.close();
      const msg = err.response?.data?.message || "";
      const isGoogleAuthError =
        err.response?.data?.isGoogleAuthError ||
        err.response?.status === 401 ||
        err.response?.status === 400 ||
        msg.toLowerCase().includes("invalid_grant") ||
        msg.toLowerCase().includes("connect your google") ||
        msg.toLowerCase().includes("google account") ||
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("revoked");

      if (isGoogleAuthError) {
        showToast(
          msg || "Your Google session expired. Please reconnect your Google Account.",
          "warning"
        );
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
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8 sm:px-6 md:px-10 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        {/* TOP NAVIGATION & HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--subtext)] hover:text-[var(--primary)] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] tracking-tight">
                {classInfo?.className || "Class Attendance"}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20 select-none">
                <Users className="w-3.5 h-3.5" />
                <span>{attendance.length} {attendance.length === 1 ? "Student" : "Students"}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--subtext)] mt-1">
              Live attendance records, Google Meet telemetry, and tailored stakeholder exports.
            </p>
          </div>

          {/* TELEMETRY REFRESH ACTION */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSyncMeet(true)}
              disabled={syncingMeet}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-focus)] text-[var(--text)] text-xs sm:text-sm font-semibold transition-all hover:bg-[var(--card-hover)] cursor-pointer active:scale-95 disabled:opacity-60"
              title="Fetch participant exit times & duration from Google Meet"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${syncingMeet ? "animate-spin" : ""}`} />
              <span>{syncingMeet ? "Syncing Meet..." : "Sync Meet Data"}</span>
            </button>
          </div>
        </div>

        {/* TOOLBAR CARD: REARRANGED FILTERS & EXPORT ACTIONS */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)] mb-6 transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* LEFT: FULL EXPORT ACTIONS */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-[var(--subtext)] uppercase tracking-wider mr-1 hidden sm:inline">
                Export:
              </span>

              {/* Download Excel */}
              <button
                onClick={handleExportAll}
                className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-focus)] hover:bg-[var(--card-hover)] text-[var(--text)] text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95"
                title="Download full class Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-[var(--subtext)]" />
                <span>Excel (.xlsx)</span>
              </button>

              {/* Google Sheets */}
              <button
                onClick={handleExportGoogleSheet}
                disabled={exportingSheet || attendance.length === 0}
                className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                title="Create Google Sheet in your Drive"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{exportingSheet ? "Creating..." : "Google Sheets"}</span>
              </button>

              {/* AI Clean & Dispatch */}
              <button
                onClick={() => setShowAiModal(true)}
                disabled={attendance.length === 0}
                className="inline-flex items-center gap-1.5 h-9.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                title="Clean records with LLM and download or email to stakeholders"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Clean & Dispatch (AI)</span>
              </button>

              {createdSheetUrl && (
                <a
                  href={createdSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer no-underline active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Sheet</span>
                </a>
              )}
            </div>

            {/* RIGHT: TARGETED COLLEGE FILTER & DOWNLOAD */}
            <div className="flex items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-[var(--border)]">
              <div className="relative flex-1 sm:w-56">
                <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="w-full h-9.5 pl-9 pr-8 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer appearance-none truncate"
                >
                  <option value="">Filter by College ({Object.keys(collegeStudents).length})</option>
                  {Object.keys(collegeStudents).sort().map((college) => (
                    <option key={college} value={college}>
                      {college}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] text-xs">
                  ▾
                </div>
              </div>

              <button
                onClick={handleCollegeExport}
                disabled={!selectedCollege}
                className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                title={selectedCollege ? `Download attendance for ${selectedCollege}` : "Select a college to download"}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export College</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>

          </div>
        </div>

      {/* RECORDING BANNER */}
      {recordingUrl && (
        <div className="bg-gradient-to-r from-red-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-500/25 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center text-xl shrink-0">
              🎥
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text)] m-0">Meeting Recording Available</h4>
              <p className="text-xs text-[var(--subtext)] m-0 mt-0.5">This session was automatically recorded and saved to Google Drive.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <a
              href={recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-sm shrink-0 no-underline cursor-pointer"
            >
              <span>Watch on Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {classInfo?.branch && (
              <button
                onClick={handleOpenBranchRecordingsSheet}
                className="px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)] border border-[var(--border)] text-[var(--text)] text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="View all branch recording links in one Google Sheet"
              >
                <span>Branch Sheet</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
          </div>
        </div>
      )}

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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-bold text-[var(--text)] flex items-center gap-2 before:content-[''] before:inline-block before:w-1 before:h-4.5 before:bg-gradient-to-b before:from-[var(--primary)] before:to-purple-400 before:rounded-full">
              Attendance Records ({attendance.length})
            </h3>
            <span className="text-xs text-[var(--subtext)]">
              Exit telemetry synced via Google Meet
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[750px] border-collapse bg-[var(--card)] text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]/60">
                  <th className="text-[var(--text-heading)] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-left">#</th>
                  <th className="text-[var(--text-heading)] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-left">Name</th>
                  <th className="text-[var(--text-heading)] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-left">Email</th>
                  <th className="text-[var(--text-heading)] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-left">Group</th>
                  <th className="text-[var(--text-heading)] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-left">College</th>
                  <th className="text-[var(--text-heading)] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-left">Joined</th>
                  <th className="text-[var(--text-heading)] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-left">Left Call</th>
                  <th className="text-[var(--text-heading)] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-left">Duration</th>
                  <th className="text-[var(--text-heading)] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {attendance.map((record, i) => {
                  if (!record.student) return null;
                  const joinDate = record.joinedAt ? new Date(record.joinedAt) : new Date(record.createdAt);

                  return (
                    <tr key={record._id} className="hover:bg-[var(--card-hover)] transition-colors duration-150">
                      <td className="px-3.5 py-3 text-xs sm:text-sm text-[var(--subtext)]">{i + 1}</td>
                      <td className="px-3.5 py-3 text-xs sm:text-sm font-semibold text-[var(--text)]">{record.student.fullName}</td>
                      <td className="px-3.5 py-3 text-xs text-[var(--subtext)]">{record.student.email}</td>
                      <td className="px-3.5 py-3 text-xs sm:text-sm text-[var(--text)]">{record.student.group}</td>
                      <td className="px-3.5 py-3 text-xs sm:text-sm text-[var(--text)]">{record.student.college}</td>
                      <td className="px-3.5 py-3 text-xs text-[var(--subtext)]">
                        {joinDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3.5 py-3 text-xs text-[var(--subtext)]">
                        {record.leftAt
                          ? new Date(record.leftAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : "-"}
                      </td>
                      <td className="px-3.5 py-3 text-xs font-semibold text-[var(--text)]">
                        {record.durationMins > 0 ? `${record.durationMins}m` : "-"}
                      </td>
                      <td className="px-3.5 py-3 text-xs">
                        {record.exitStatus === "completed" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Full
                          </span>
                        )}
                        {record.exitStatus === "active" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/25 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> In Call
                          </span>
                        )}
                        {record.exitStatus === "left_early" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Left Early
                          </span>
                        )}
                        {(!record.exitStatus || record.exitStatus === "unknown") && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-secondary)] text-[var(--subtext)] border border-[var(--border)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--subtext)]"></span> Attended
                          </span>
                        )}
                      </td>
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

      {/* AI CLEAN & DISPATCH MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
          <div className="fixed inset-0" onClick={() => !aiLoading && setShowAiModal(false)} />
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 shadow-2xl max-w-xl w-full z-10 my-8 transition-colors duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-xl text-violet-400">
                  ✨
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text)] tracking-tight">
                    AI Data Cleaner & Stakeholder Dispatch
                  </h3>
                  <p className="text-xs text-[var(--subtext)]">
                    Normalizes attendance records & delivers tailored sheets to stakeholders
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                disabled={aiLoading}
                className="text-[var(--subtext)] hover:text-[var(--text)] p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Requirement Presets */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                Quick Presets
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset("hod")}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)] text-[var(--text)] border border-[var(--border)] cursor-pointer transition-colors"
                >
                  📋 HOD Register
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("active")}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)] text-[var(--text)] border border-[var(--border)] cursor-pointer transition-colors"
                >
                  ⚡ Active Students (&gt;10m)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("executive")}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)] text-[var(--text)] border border-[var(--border)] cursor-pointer transition-colors"
                >
                  🎯 Executive Digest
                </button>
              </div>
            </div>

            {/* Custom Requirements Text */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                Stakeholder Requirements / Prompt
              </label>
              <textarea
                rows={2}
                value={aiRequirements}
                onChange={(e) => setAiRequirements(e.target.value)}
                placeholder="e.g. Normalize names to Title Case, filter for students with at least 10 mins duration, include engagement note..."
                className="w-full text-xs sm:text-sm p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--subtext)] focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>

            {/* Target Columns Checklist */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                Columns in Sheet ({selectedCols.length} selected)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                {availableColumns.map((col) => {
                  const active = selectedCols.includes(col.key);
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => toggleCol(col.key)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                        active
                          ? "bg-violet-600/15 border-violet-500/50 text-violet-400"
                          : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--subtext)] hover:text-[var(--text)]"
                      }`}
                    >
                      {active ? "✓ " : "+ "}
                      {col.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dispatch Target Selection */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                Dispatch Destination
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "download", label: "📥 Download Excel", desc: ".xlsx file" },
                  { id: "email", label: "✉️ Email Stakeholders", desc: "Nodemailer" },
                  { id: "google_sheet", label: "📊 Google Sheets", desc: "Live Drive link" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDispatchTarget(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      dispatchTarget === opt.id
                        ? "bg-violet-600/15 border-violet-500 text-violet-400 shadow-sm"
                        : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--subtext)] hover:text-[var(--text)]"
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{opt.label}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Email Recipients Input (if Email chosen) */}
            {dispatchTarget === "email" && (
              <div className="mb-4 animate-[fadeIn_0.2s_ease-out]">
                <label className="block text-xs font-semibold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                  Stakeholder Email Address(es)
                </label>
                <input
                  type="text"
                  value={stakeholderEmails}
                  onChange={(e) => setStakeholderEmails(e.target.value)}
                  placeholder="e.g. hod@college.edu, principal@barabari.org"
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--subtext)] focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            )}

            {/* AI Preview Summary Card */}
            {aiPreviewData && (
              <div className="mb-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-[var(--text)] animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-violet-400">✨ AI Executive Summary</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                    {aiPreviewData.engine}
                  </span>
                </div>
                <p className="text-xs text-[var(--subtext)] leading-relaxed">{aiPreviewData.summary}</p>
                <div className="mt-2 text-[10px] text-[var(--subtext)]">
                  Previewed {aiPreviewData.totalCount || aiPreviewData.records?.length || 0} cleaned student records.
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleAiPreview}
                disabled={aiLoading}
                className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--card-hover)] text-[var(--text)] text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                {aiLoading ? "Processing..." : "👁 Preview Cleanup"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  disabled={aiLoading}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-[var(--subtext)] hover:text-[var(--text)] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAiDispatch}
                  disabled={aiLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5"
                >
                  {aiLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <span>
                      {dispatchTarget === "download"
                        ? "📥 Download Cleaned Sheet"
                        : dispatchTarget === "email"
                        ? "✉️ Dispatch Email"
                        : "📊 Create Stakeholder Sheet"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION CARD */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type || "info"}
          title={toast.title}
          actionUrl={toast.actionUrl}
          actionLabel="Open Sheet ↗"
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default ClassAttendance;
