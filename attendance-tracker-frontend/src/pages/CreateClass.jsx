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

  // Helper to format local date & time
  const getInitialTimes = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0");
    const startTimeStr = `${hours}:${minutes}`;

    const later = new Date(now.getTime() + 90 * 60 * 1000); // +90 mins
    const endHours = String(later.getHours()).padStart(2, "0");
    const endMinutes = String(Math.floor(later.getMinutes() / 5) * 5).padStart(2, "0");
    const endTimeStr = `${endHours}:${endMinutes}`;

    return { todayStr, startTimeStr, endTimeStr };
  };

  const initial = getInitialTimes();

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
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setForm((prev) => ({ ...prev, classDate: `${year}-${month}-${day}` }));
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

    const startDateTime = new Date(`${form.classDate}T${form.startTime}`);
    const endDateTime = new Date(`${form.classDate}T${form.endTime}`);

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
        branchId,
      });

      alert("✅ Class scheduled successfully!");
      navigate(`/dashboard/${branchId}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create class");
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

          {/* Meeting Access Mode: Visual Cards */}
          <div className="mb-4.5 flex flex-col gap-1.5">
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

          {/* Optional Meet Link */}
          <div className="mb-4.5 flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-[var(--text)] tracking-wide flex justify-between items-center">
              <span>Custom Meet Link</span> <span className="font-normal text-[var(--subtext)] text-[11.5px]">(Optional - Auto-generated via Google Calendar)</span>
            </label>
            <input
              name="meetLink"
              placeholder="https://meet.google.com/xyz-abc-def (Leave blank to auto-create)"
              value={form.meetLink}
              onChange={handleChange}
              className="w-full py-2.5 px-3.5 border-[1.5px] border-[var(--border)] rounded-lg text-[13.5px] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
            />
          </div>

          <div className="bg-[var(--primary-light)] border border-indigo-500/25 text-[var(--primary)] text-xs p-2.5 sm:p-3.5 rounded-lg mt-1 mb-5 leading-relaxed">
            <span className="font-bold">📅 Google Calendar:</span> Meet link will be automatically attached to this session.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white border-0 rounded-lg text-[14.5px] font-bold cursor-pointer transition-all duration-200 shadow-[0_4px_14px_rgba(99,102,241,0.35)] tracking-wide hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Scheduling Class..." : "Schedule Class & Create Meet"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateClass;