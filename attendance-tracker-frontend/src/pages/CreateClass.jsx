import { useState } from "react";
import API from "../services/api";
import { useNavigate, useParams } from "react-router-dom";
import Toast from "../components/Toast";

// Convert "HH:MM" (24h) to 12-hour object { hour, minute, period }
const parse24 = (timeStr) => {
  if (!timeStr) return { hour: "12", minute: "00", period: "PM" };
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = String(mStr || "00").padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return { hour: String(h).padStart(2, "0"), minute: m, period };
};

// Convert { hour, minute, period } to "HH:MM" (24h)
const format24 = (hour, minute, period) => {
  let h = parseInt(hour, 10) || 12;
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

// Custom Time Picker Component
function TimePickerInput({ label, value, onChange }) {
  const { hour, minute, period } = parse24(value);

  const hoursList = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  const minutesList = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  const handleHourChange = (newHour) => {
    onChange(format24(newHour, minute, period));
  };

  const handleMinuteChange = (newMin) => {
    onChange(format24(hour, newMin, period));
  };

  const handlePeriodChange = (newPeriod) => {
    onChange(format24(hour, minute, newPeriod));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text)]">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {label}
      </span>
      <div className="flex items-center gap-1 bg-[var(--bg)] border-[1.5px] border-[var(--border)] rounded-lg p-1 transition-all focus-within:border-[var(--border-focus)] focus-within:bg-[var(--card)] focus-within:ring-2 focus-within:ring-[var(--primary-light)]">
        {/* Hour */}
        <select
          className="flex-1 bg-transparent border-0 outline-none text-sm font-bold text-[var(--text)] py-1.5 px-0.5 text-center cursor-pointer rounded hover:bg-[var(--bg-secondary)] focus:bg-[var(--bg-secondary)]"
          value={hour}
          onChange={(e) => handleHourChange(e.target.value)}
        >
          {hoursList.map((h) => (
            <option key={h} value={h} className="bg-[var(--card)] text-[var(--text)]">{h}</option>
          ))}
        </select>

        <span className="text-sm font-extrabold text-[var(--subtext)] select-none">:</span>

        {/* Minute */}
        <select
          className="flex-1 bg-transparent border-0 outline-none text-sm font-bold text-[var(--text)] py-1.5 px-0.5 text-center cursor-pointer rounded hover:bg-[var(--bg-secondary)] focus:bg-[var(--bg-secondary)]"
          value={minute}
          onChange={(e) => handleMinuteChange(e.target.value)}
        >
          {minutesList.map((m) => (
            <option key={m} value={m} className="bg-[var(--card)] text-[var(--text)]">{m}</option>
          ))}
        </select>

        {/* AM / PM Pills */}
        <div className="inline-flex bg-[var(--bg-secondary)] rounded-md p-0.5 gap-0.5">
          <button
            type="button"
            className={`border-0 text-[11px] font-bold py-1 px-1.5 rounded cursor-pointer transition-all leading-none ${
              period === "AM"
                ? "bg-[var(--primary)] text-white shadow-[0_1px_4px_rgba(99,102,241,0.4)]"
                : "bg-transparent text-[var(--subtext)]"
            }`}
            onClick={() => handlePeriodChange("AM")}
          >
            AM
          </button>
          <button
            type="button"
            className={`border-0 text-[11px] font-bold py-1 px-1.5 rounded cursor-pointer transition-all leading-none ${
              period === "PM"
                ? "bg-[var(--primary)] text-white shadow-[0_1px_4px_rgba(99,102,241,0.4)]"
                : "bg-transparent text-[var(--subtext)]"
            }`}
            onClick={() => handlePeriodChange("PM")}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateClass() {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const [loading, setLoading] = useState(false);

  // Helper to format local date & time in IST (5-minute rounded)
  const getInitialTimes = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 330 * 60000);

    let mins = Math.ceil(ist.getMinutes() / 5) * 5;
    if (mins >= 60) {
      ist.setHours(ist.getHours() + 1);
      mins = 0;
    }
    ist.setMinutes(mins, 0, 0);

    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, "0");
    const d = String(ist.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    const startH = String(ist.getHours()).padStart(2, "0");
    const startM = String(ist.getMinutes()).padStart(2, "0");
    const startTimeStr = `${startH}:${startM}`;

    // Default 60 mins duration
    const later = new Date(ist.getTime() + 60 * 60 * 1000);
    const endH = String(later.getHours()).padStart(2, "0");
    const endM = String(later.getMinutes()).padStart(2, "0");
    const endTimeStr = `${endH}:${endM}`;

    return { todayStr, startTimeStr, endTimeStr };
  };

  const initial = getInitialTimes();

  const [meetMode, setMeetMode] = useState("auto"); // "auto" | "custom"
  const [autoRecord, setAutoRecord] = useState(false);
  const [invitedGuests, setInvitedGuests] = useState([]);
  const [guestInput, setGuestInput] = useState("");
  const [guestRole, setGuestRole] = useState("GUEST");
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info", title = "") => {
    setToast({ message, type, title, id: Date.now() });
  };

  const [form, setForm] = useState({
    className: "",
    subject: "",
    classDate: initial.todayStr,
    startTime: initial.startTimeStr,
    endTime: initial.endTimeStr,
    accessType: "open",
    meetLink: "",
  });

  const handleAddGuest = (e) => {
    if (e) e.preventDefault();
    const email = guestInput.trim().toLowerCase();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      showToast("Please enter a valid email address.", "warning", "Invalid Email");
      return;
    }
    if (invitedGuests.some((g) => g.email === email)) {
      showToast("This guest is already added to the list.", "warning", "Already Added");
      return;
    }
    setInvitedGuests([...invitedGuests, { email, role: guestRole }]);
    setGuestInput("");
    showToast(`Added ${email} as ${guestRole === "COHOST" ? "Co-host" : "Guest"}.`, "success", "Guest Added");
  };

  const handleRemoveGuest = (emailToRemove) => {
    setInvitedGuests(invitedGuests.filter((g) => g.email !== emailToRemove));
  };

  /* ================= QUICK HELPERS ================= */
  const setQuickDate = (type) => {
    const d = new Date();
    if (type === "tomorrow") {
      d.setDate(d.getDate() + 1);
    }
    const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    setForm((prev) => ({ ...prev, classDate: dateStr }));
  };

  const applyDuration = (mins) => {
    if (!form.startTime) return;
    const [hStr, mStr] = form.startTime.split(":");
    const h = parseInt(hStr || "0", 10);
    const m = parseInt(mStr || "0", 10);

    let totalMins = h * 60 + m + mins;
    let endH = Math.floor(totalMins / 60) % 24;
    let endM = totalMins % 60;

    // Align to 5-minute interval for select option compatibility
    endM = Math.round(endM / 5) * 5;
    if (endM >= 60) {
      endM = 0;
      endH = (endH + 1) % 24;
    }

    const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    setForm((prev) => ({ ...prev, endTime: endTimeStr }));
  };

  const handleStartTimeChange = (newStartTime) => {
    const duration = currentDurationMins || 60;
    const [hStr, mStr] = newStartTime.split(":");
    const h = parseInt(hStr || "0", 10);
    const m = parseInt(mStr || "0", 10);

    let totalMins = h * 60 + m + duration;
    let endH = Math.floor(totalMins / 60) % 24;
    let endM = totalMins % 60;

    endM = Math.round(endM / 5) * 5;
    if (endM >= 60) {
      endM = 0;
      endH = (endH + 1) % 24;
    }

    const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    setForm((prev) => ({ ...prev, startTime: newStartTime, endTime: endTimeStr }));
  };

  const currentDurationMins = (() => {
    if (!form.startTime || !form.endTime) return 0;
    const [sh, sm] = form.startTime.split(":").map(Number);
    const [eh, em] = form.endTime.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
    let startMins = sh * 60 + sm;
    let endMins = eh * 60 + em;
    if (endMins <= startMins) endMins += 24 * 60;
    return endMins - startMins;
  })();

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  /* ================= INPUT HANDLER ================= */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  /* ================= CREATE CLASS ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (meetMode === "custom" && !form.meetLink.trim()) {
      showToast("Please enter your custom meeting link or switch to Auto-generate.", "warning", "Missing Link");
      return;
    }

    const startDateTime = new Date(`${form.classDate}T${form.startTime}:00+05:30`);
    let endDateTime = new Date(`${form.classDate}T${form.endTime}:00+05:30`);
    if (endDateTime <= startDateTime) {
      endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
    }

    if (endDateTime <= new Date()) {
      showToast("The class end time has already passed! Please select a future time or date.", "warning", "Time Expired");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const res = await API.post("/classes/create", {
        ...form,
        meetLink: meetMode === "custom" ? form.meetLink.trim() : "",
        autoRecord: meetMode === "auto" ? autoRecord : false,
        invitedGuests,
        branchId,
      });

      if (res.data?.recordingWarning) {
        showToast(res.data.recordingWarning, "warning", "Workspace Pro Required");
        setTimeout(() => {
          navigate(`/dashboard/${branchId}`);
        }, 2800);
      } else if (autoRecord && !res.data?.autoRecord) {
        showToast(
          "Class scheduled! Note: Recording cannot start because your Google account does not have a Workspace Pro subscription.",
          "warning",
          "Workspace Pro Required"
        );
        setTimeout(() => {
          navigate(`/dashboard/${branchId}`);
        }, 2800);
      } else {
        showToast("Class scheduled successfully!", "success", "Scheduled");
        setTimeout(() => {
          navigate(`/dashboard/${branchId}`);
        }, 900);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to create class. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--bg)] flex justify-center items-center p-5 sm:p-9 transition-colors duration-200">
      <div className="bg-[var(--card)] p-6 sm:p-8.5 rounded-3xl w-full max-w-[500px] border border-[var(--border)] shadow-[var(--shadow-lg)] transition-all duration-200">
        <h2 className="text-center mb-1 text-xl sm:text-[23px] font-extrabold text-[var(--text)] tracking-tight">
          Schedule New Class
        </h2>
        <p className="text-center text-[13px] text-[var(--subtext)] mb-6 leading-relaxed">
          Set up class details & timing. Google Meet link will be automatically scheduled!
        </p>

        <form onSubmit={handleSubmit}>
          {/* Class Name */}
          <div className="mb-4.5 flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-[var(--text)] tracking-wide">Class Name</label>
            <input
              name="className"
              placeholder="Ex: React Hooks & State Management"
              value={form.className}
              onChange={handleChange}
              className="w-full py-2.5 px-3.5 border-[1.5px] border-[var(--border)] rounded-lg text-[13.5px] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
              required
            />
          </div>

          {/* Subject */}
          <div className="mb-4.5 flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-[var(--text)] tracking-wide">Subject</label>
            <input
              name="subject"
              placeholder="Ex: Web Development"
              value={form.subject}
              onChange={handleChange}
              className="w-full py-2.5 px-3.5 border-[1.5px] border-[var(--border)] rounded-lg text-[13.5px] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
              required
            />
          </div>

          {/* Date of Class */}
          <div className="mb-4.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-[var(--text)] tracking-wide">Date of Class</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--subtext)] py-0.5 px-2.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all hover:bg-[var(--primary-light)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  onClick={() => setQuickDate("today")}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--subtext)] py-0.5 px-2.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all hover:bg-[var(--primary-light)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  onClick={() => setQuickDate("tomorrow")}
                >
                  Tomorrow
                </button>
              </div>
            </div>
            <div className="relative flex flex-col gap-1">
              <input
                type="date"
                name="classDate"
                className="w-full py-2.5 px-3.5 border-[1.5px] border-[var(--border)] rounded-lg text-[13.5px] font-semibold bg-[var(--bg)] text-[var(--text)] outline-none cursor-pointer transition-all duration-200 focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
                value={form.classDate}
                onChange={handleChange}
                required
              />
              <span className="text-[11.5px] font-medium text-[var(--primary)] pl-0.5">{formatDateDisplay(form.classDate)}</span>
            </div>
          </div>

          {/* Class Timings: Start & End Time */}
          <div className="mb-4.5 flex flex-col gap-1.5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-0">
                <TimePickerInput
                  label="Start Time"
                  value={form.startTime}
                  onChange={handleStartTimeChange}
                />
              </div>

              <div className="flex-1 min-w-0">
                <TimePickerInput
                  label="End Time"
                  value={form.endTime}
                  onChange={(newTime) => setForm({ ...form, endTime: newTime })}
                />
              </div>
            </div>

            {/* Quick Duration Chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] font-semibold text-[var(--subtext)]">Duration:</span>
              {[
                { label: "45m", mins: 45 },
                { label: "1h", mins: 60 },
                { label: "1.5h", mins: 90 },
                { label: "2h", mins: 120 },
              ].map((chip) => {
                const isActive = currentDurationMins === chip.mins;
                return (
                  <button
                    key={chip.mins}
                    type="button"
                    className={`text-[11.5px] font-bold py-1 px-3 rounded-full cursor-pointer transition-all duration-150 ${
                      isActive
                        ? "bg-[var(--primary)] text-white border border-[var(--primary)] shadow-[0_2px_8px_rgba(99,102,241,0.35)] scale-105"
                        : "bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--primary-light)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    }`}
                    onClick={() => applyDuration(chip.mins)}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting Link Source Toggle */}
          <div className="mb-4.5 flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-[var(--text)] tracking-wide">
              Meeting Link Option
            </label>
            <div className="grid grid-cols-2 p-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setMeetMode("auto");
                  setForm({ ...form, meetLink: "" });
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                  meetMode === "auto"
                    ? "bg-[var(--card)] text-[var(--primary)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--subtext)] hover:text-[var(--text)]"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Auto-generate Meet
              </button>
              <button
                type="button"
                onClick={() => setMeetMode("custom")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                  meetMode === "custom"
                    ? "bg-[var(--card)] text-[var(--primary)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--subtext)] hover:text-[var(--text)]"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Custom Meet Link
              </button>
            </div>
          </div>

          {/* AUTO-GENERATE MEET MODE: Access Type & Google Calendar info */}
          {meetMode === "auto" ? (
            <div className="flex flex-col gap-4 animate-[fadeIn_0.2s_ease-out]">
              {/* Meeting Access Mode: Visual Cards */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-bold text-[var(--text)] tracking-wide">Meeting Access Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    className={`border-[1.5px] border-[var(--border)] bg-[var(--bg)] rounded-xl p-3 cursor-pointer transition-all duration-200 flex flex-col gap-1 select-none hover:border-[var(--border-focus)] hover:bg-[var(--card-hover)] hover:-translate-y-0.5 ${
                      form.accessType === "open" ? "!border-[var(--primary)] !bg-[var(--primary-light)] ring-1 ring-[var(--primary)]" : ""
                    }`}
                    onClick={() => setForm({ ...form, accessType: "open" })}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base shrink-0">🌐</span>
                      <span className="text-[12.5px] font-bold text-[var(--text)] flex-1 leading-tight">Open to Everyone</span>
                      <span className={`w-4 h-4 rounded-full border-2 border-[var(--border)] flex items-center justify-center shrink-0 transition-all ${form.accessType === "open" ? "border-[var(--primary)] bg-[var(--primary)] after:content-[''] after:w-1.5 after:h-1.5 after:bg-white after:rounded-full" : ""}`}></span>
                    </div>
                    <p className="text-[11px] text-[var(--subtext)] leading-snug m-0">
                      Students join directly without waiting for host approval
                    </p>
                  </div>

                  <div
                    className={`border-[1.5px] border-[var(--border)] bg-[var(--bg)] rounded-xl p-3 cursor-pointer transition-all duration-200 flex flex-col gap-1 select-none hover:border-[var(--border-focus)] hover:bg-[var(--card-hover)] hover:-translate-y-0.5 ${
                      form.accessType === "restricted" ? "!border-[var(--primary)] !bg-[var(--primary-light)] ring-1 ring-[var(--primary)]" : ""
                    }`}
                    onClick={() => setForm({ ...form, accessType: "restricted" })}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base shrink-0">🔒</span>
                      <span className="text-[12.5px] font-bold text-[var(--text)] flex-1 leading-tight">Host Approval</span>
                      <span className={`w-4 h-4 rounded-full border-2 border-[var(--border)] flex items-center justify-center shrink-0 transition-all ${form.accessType === "restricted" ? "border-[var(--primary)] bg-[var(--primary)] after:content-[''] after:w-1.5 after:h-1.5 after:bg-white after:rounded-full" : ""}`}></span>
                    </div>
                    <p className="text-[11px] text-[var(--subtext)] leading-snug m-0">
                      Teacher must admit each student manually before entering
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--primary-light)] border border-indigo-500/25 text-[var(--primary)] text-xs p-2.5 sm:p-3.5 rounded-lg mb-1 leading-relaxed">
                <span className="font-bold">📅 Google Calendar & Meet:</span> An open Google Meet link will be automatically generated and synced to your Google Calendar so you can join directly with one click.
              </div>
            </div>
          ) : (
            /* CUSTOM MEET LINK MODE: Paste link input */
            <div className="mb-4.5 flex flex-col gap-1.5 animate-[fadeIn_0.2s_ease-out]">
              <div className="flex items-center justify-between">
                <label className="text-[12.5px] font-bold text-[var(--text)] tracking-wide">
                  Paste Meeting Link <span className="text-red-500">*</span>
                </label>
                {form.meetLink && (
                  <a
                    href={form.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11.5px] font-semibold text-[var(--primary)] hover:underline opacity-90 transition-opacity"
                  >
                    🚀 Test Link
                  </a>
                )}
              </div>
              <input
                name="meetLink"
                placeholder="https://meet.google.com/xyz-abc-def or Zoom / Teams link"
                value={form.meetLink}
                onChange={handleChange}
                required={meetMode === "custom"}
                autoFocus
                className="w-full py-2.5 px-3.5 border-[1.5px] border-[var(--border)] rounded-lg text-[13.5px] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />
              <p className="text-[11px] text-[var(--subtext)] m-0 leading-tight">
                Students will be redirected to this link immediately after submitting their attendance.
              </p>
            </div>
          )}

          {/* AUTO-RECORD (Workspace Pro) */}
          {meetMode === "auto" && (
            <div className={`mb-4.5 p-3.5 rounded-xl border transition-all ${
              autoRecord
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--card-hover)]"
            }`}>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRecord}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoRecord(checked);
                    if (checked) {
                      showToast(
                        "Google Workspace Pro or Education account required. Personal Google accounts (@gmail.com) cannot record meetings.",
                        "warning",
                        "Workspace Pro Required"
                      );
                    }
                  }}
                  className="mt-0.5 w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-bold text-[var(--text)]">🎥 Auto-record Meeting</span>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/20">
                      Workspace Pro
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--subtext)] leading-snug">
                    Recording starts automatically and the Drive link will be saved once the meeting concludes.
                  </span>
                  {autoRecord && (
                    <div className="mt-2 text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-1.5 leading-relaxed">
                      <span className="shrink-0 text-xs mt-0.5">⚠️</span>
                      <span>
                        <strong>Note:</strong> Standard personal Google accounts cannot record meetings. If your account is not Workspace Pro, the class will be scheduled normally without recording.
                      </span>
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* GUEST INVITATIONS (Calendar Invites & Co-hosts) */}
          <div className="mb-4.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-[var(--text)] tracking-wide flex items-center gap-1.5">
                <span>👥 Invite People</span>
                <span className="text-[11px] font-normal text-[var(--subtext)]">(Optional)</span>
              </label>
              {invitedGuests.length > 0 && (
                <span className="text-[11px] font-semibold text-[var(--primary)]">
                  {invitedGuests.length} invited
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="guest@example.com"
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddGuest();
                  }
                }}
                className="flex-1 py-2 px-3 border-[1.5px] border-[var(--border)] rounded-lg text-[13px] bg-[var(--bg)] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)]"
              />

              <select
                value={guestRole}
                onChange={(e) => setGuestRole(e.target.value)}
                className="py-2 px-2.5 border-[1.5px] border-[var(--border)] rounded-lg text-[12px] font-semibold bg-[var(--bg)] text-[var(--text)] outline-none cursor-pointer focus:border-[var(--border-focus)]"
              >
                <option value="GUEST">Guest</option>
                <option value="COHOST">Co-host</option>
              </select>

              <button
                type="button"
                onClick={handleAddGuest}
                className="py-2 px-3.5 bg-[var(--bg-secondary)] hover:bg-[var(--primary)] hover:text-white border border-[var(--border)] text-[var(--text)] rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                + Add
              </button>
            </div>

            {/* Guest Chips */}
            {invitedGuests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {invitedGuests.map((g) => (
                  <div
                    key={g.email}
                    className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text)]"
                  >
                    <span className="font-medium">{g.email}</span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1 rounded ${
                        g.role === "COHOST"
                          ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                          : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {g.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGuest(g.email)}
                      className="ml-0.5 text-[var(--subtext)] hover:text-red-400 font-bold transition-colors cursor-pointer"
                      title="Remove guest"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-[var(--subtext)] m-0 leading-tight">
              Guests will receive a calendar invitation with the meeting link directly in their inbox.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 px-4 bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white border-0 rounded-lg text-[14.5px] font-bold cursor-pointer transition-all duration-200 shadow-[0_4px_14px_rgba(99,102,241,0.35)] tracking-wide hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Scheduling Class..." : meetMode === "auto" ? "Schedule Class & Auto-Create Meet" : "Schedule Class with Custom Link"}
          </button>
        </form>
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

export default CreateClass;