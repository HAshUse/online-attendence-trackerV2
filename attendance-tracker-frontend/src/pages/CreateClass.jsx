import { useState } from "react";
import API from "../services/api";
import { useNavigate, useParams } from "react-router-dom";
import "./CreateClass.css";

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
    <div className="custom-time-picker">
      <span className="time-picker-label">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {label}
      </span>
      <div className="time-picker-box">
        {/* Hour */}
        <select
          className="time-select"
          value={hour}
          onChange={(e) => handleHourChange(e.target.value)}
        >
          {hoursList.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        <span className="time-sep">:</span>

        {/* Minute */}
        <select
          className="time-select"
          value={minute}
          onChange={(e) => handleMinuteChange(e.target.value)}
        >
          {minutesList.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* AM / PM Pills */}
        <div className="period-toggle">
          <button
            type="button"
            className={`period-btn ${period === "AM" ? "active" : ""}`}
            onClick={() => handlePeriodChange("AM")}
          >
            AM
          </button>
          <button
            type="button"
            className={`period-btn ${period === "PM" ? "active" : ""}`}
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
    <div className="create-page">
      <div className="create-card">
        <h2>Schedule New Class</h2>
        <p className="create-subtitle">
          Set up class details & timing. Google Meet link will be automatically scheduled!
        </p>

        <form onSubmit={handleSubmit}>
          {/* Class Name */}
          <div className="form-group">
            <label>Class Name</label>
            <input
              name="className"
              placeholder="Ex: React Hooks & State Management"
              value={form.className}
              onChange={handleChange}
              required
            />
          </div>

          {/* Subject */}
          <div className="form-group">
            <label>Subject</label>
            <input
              name="subject"
              placeholder="Ex: Web Development"
              value={form.subject}
              onChange={handleChange}
              required
            />
          </div>

          {/* Date of Class */}
          <div className="form-group">
            <div className="label-row">
              <label>Date of Class</label>
              <div className="quick-date-pills">
                <button
                  type="button"
                  className="quick-pill"
                  onClick={() => setQuickDate("today")}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="quick-pill"
                  onClick={() => setQuickDate("tomorrow")}
                >
                  Tomorrow
                </button>
              </div>
            </div>
            <div className="date-input-wrapper">
              <input
                type="date"
                name="classDate"
                className="custom-date-input"
                value={form.classDate}
                onChange={handleChange}
                required
              />
              <span className="date-human-preview">{formatDateDisplay(form.classDate)}</span>
            </div>
          </div>

          {/* Class Timings: Start & End Time */}
          <div className="form-group">
            <div className="form-row">
              <div className="flex-1">
                <TimePickerInput
                  label="Start Time"
                  value={form.startTime}
                  onChange={(newTime) => setForm({ ...form, startTime: newTime })}
                />
              </div>

              <div className="flex-1">
                <TimePickerInput
                  label="End Time"
                  value={form.endTime}
                  onChange={(newTime) => setForm({ ...form, endTime: newTime })}
                />
              </div>
            </div>

            {/* Quick Duration Chips */}
            <div className="duration-row">
              <span className="duration-title">Duration:</span>
              <button type="button" className="duration-chip" onClick={() => applyDuration(45)}>
                45m
              </button>
              <button type="button" className="duration-chip" onClick={() => applyDuration(60)}>
                1h
              </button>
              <button type="button" className="duration-chip" onClick={() => applyDuration(90)}>
                1.5h
              </button>
              <button type="button" className="duration-chip" onClick={() => applyDuration(120)}>
                2h
              </button>
            </div>
          </div>

          {/* Meeting Access Mode: Visual Cards */}
          <div className="form-group">
            <label>Meeting Access Mode</label>
            <div className="access-options-grid">
              <div
                className={`access-card ${form.accessType === "open" ? "active" : ""}`}
                onClick={() => setForm({ ...form, accessType: "open" })}
                role="button"
                tabIndex={0}
              >
                <div className="access-card-head">
                  <span className="access-icon">🌐</span>
                  <span className="access-title">Open to Everyone</span>
                  <span className="access-radio"></span>
                </div>
                <p className="access-desc">
                  Students join directly without waiting for host approval
                </p>
              </div>

              <div
                className={`access-card ${form.accessType === "restricted" ? "active" : ""}`}
                onClick={() => setForm({ ...form, accessType: "restricted" })}
                role="button"
                tabIndex={0}
              >
                <div className="access-card-head">
                  <span className="access-icon">🔒</span>
                  <span className="access-title">Host Approval</span>
                  <span className="access-radio"></span>
                </div>
                <p className="access-desc">
                  Teacher must admit each student manually before entering
                </p>
              </div>
            </div>
          </div>

          {/* Optional Meet Link */}
          <div className="form-group">
            <label className="optional-label">
              Custom Meet Link <span>(Optional - Auto-generated via Google Calendar)</span>
            </label>
            <input
              name="meetLink"
              placeholder="https://meet.google.com/xyz-abc-def (Leave blank to auto-create)"
              value={form.meetLink}
              onChange={handleChange}
            />
          </div>

          <div className="meet-notice">
            <span>📅 Google Calendar:</span> Meet link will be automatically attached to this session.
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Scheduling Class..." : "Schedule Class & Create Meet"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateClass;