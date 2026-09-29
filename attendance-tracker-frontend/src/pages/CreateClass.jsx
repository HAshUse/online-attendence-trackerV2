import { useState } from "react";
import API from "../services/api";
import { useNavigate, useParams } from "react-router-dom";

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

  // Helper to format local date & time in IST
  const getInitialTimes = () => {
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const startTimeStr = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });

    const later = new Date(now.getTime() + 90 * 60 * 1000); // +90 mins
    const endTimeStr = later.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });

    return { todayStr, startTimeStr, endTimeStr };
  };

  const initial = getInitialTimes();

  const [meetMode, setMeetMode] = useState("auto"); // "auto" | "custom"
  const [form, setForm] = useState({
    className: "",
    subject: "",
    classDate: initial.todayStr,
    startTime: initial.startTimeStr,
    endTime: initial.endTimeStr,
    accessType: "open",
    meetLink: "",
  });

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
    const [h, m] = form.startTime.split(":").map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + mins * 60 * 1000);
    const endH = String(end.getHours()).padStart(2, "0");
    const endM = String(end.getMinutes()).padStart(2, "0");
    setForm((prev) => ({ ...prev, endTime: `${endH}:${endM}` }));
  };

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
      alert("⚠️ Please enter your custom meeting link or switch to Auto-generate.");
      return;
    }

    const startDateTime = new Date(`${form.classDate}T${form.startTime}:00+05:30`);
    const endDateTime = new Date(`${form.classDate}T${form.endTime}:00+05:30`);

    if (endDateTime <= new Date()) {
      alert("⚠️ The class end time has already passed! Please select a future time or date.");
      return;
    }

    if (startDateTime >= endDateTime) {
      alert("⚠️ Class end time must be after the start time.");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      await API.post("/classes/create", {
        ...form,
        meetLink: meetMode === "custom" ? form.meetLink.trim() : "",
        branchId,
      });

      alert("✅ Class scheduled successfully!");
      navigate(`/dashboard/${branchId}`);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to create class. Please try again.");
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
                  onChange={(newTime) => setForm({ ...form, startTime: newTime })}
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
              <button type="button" className="bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-[11.5px] font-semibold py-0.5 px-2.5 rounded-full cursor-pointer transition-all hover:bg-[var(--primary-light)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:-translate-y-0.5 active:scale-95" onClick={() => applyDuration(45)}>
                45m
              </button>
              <button type="button" className="bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-[11.5px] font-semibold py-0.5 px-2.5 rounded-full cursor-pointer transition-all hover:bg-[var(--primary-light)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:-translate-y-0.5 active:scale-95" onClick={() => applyDuration(60)}>
                1h
              </button>
              <button type="button" className="bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-[11.5px] font-semibold py-0.5 px-2.5 rounded-full cursor-pointer transition-all hover:bg-[var(--primary-light)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:-translate-y-0.5 active:scale-95" onClick={() => applyDuration(90)}>
                1.5h
              </button>
              <button type="button" className="bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-[11.5px] font-semibold py-0.5 px-2.5 rounded-full cursor-pointer transition-all hover:bg-[var(--primary-light)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:-translate-y-0.5 active:scale-95" onClick={() => applyDuration(120)}>
                2h
              </button>
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
                <span className="font-bold">📅 Google Calendar:</span> Meet link will be automatically created and attached to this session.
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

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 px-4 bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white border-0 rounded-lg text-[14.5px] font-bold cursor-pointer transition-all duration-200 shadow-[0_4px_14px_rgba(99,102,241,0.35)] tracking-wide hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Scheduling Class..." : meetMode === "auto" ? "Schedule Class & Auto-Create Meet" : "Schedule Class with Custom Link"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateClass;