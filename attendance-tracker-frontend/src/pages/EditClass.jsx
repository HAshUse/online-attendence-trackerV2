import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
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

        {/* AM / PM Segmented Control */}
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

function EditClass() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [branches, setBranches] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);

  const [form, setForm] = useState({
    className: "",
    subject: "",
    branchId: "",
    meetLink: "",
    classDate: "",
    startTime: "10:00",
    endTime: "11:30",
    accessType: "open",
    classCode: "",
  });

  /* ================= LOAD INITIAL DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Class
        const res = await API.get(`/classes/single/${id}`);
        const cls = res.data;

        // Parse date and time from expiresAt if available
        let classDate = "";
        let endTime = "11:30";
        let startTime = "10:00";

        if (cls.expiresAt) {
          const expDate = new Date(cls.expiresAt);
          const y = expDate.getFullYear();
          const m = String(expDate.getMonth() + 1).padStart(2, "0");
          const d = String(expDate.getDate()).padStart(2, "0");
          classDate = `${y}-${m}-${d}`;

          const endH = String(expDate.getHours()).padStart(2, "0");
          const endM = String(Math.floor(expDate.getMinutes() / 5) * 5).padStart(2, "0");
          endTime = `${endH}:${endM}`;

          // estimate start time ~1.5 hours before end
          const startDate = new Date(expDate.getTime() - 90 * 60 * 1000);
          const startH = String(startDate.getHours()).padStart(2, "0");
          const startM = String(Math.floor(startDate.getMinutes() / 5) * 5).padStart(2, "0");
          startTime = `${startH}:${startM}`;
        } else {
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, "0");
          const d = String(now.getDate()).padStart(2, "0");
          classDate = `${y}-${m}-${d}`;
        }

        setForm({
          className: cls.className || "",
          subject: cls.subject || "",
          branchId: cls.branch?._id || "",
          meetLink: cls.meetLink || "",
          classDate,
          startTime,
          endTime,
          accessType: cls.accessType || "open",
          classCode: cls.classCode || "",
        });

        // 2. Fetch Branches
        try {
          const branchRes = await API.get("/branches/my");
          setBranches(branchRes.data || []);
        } catch (bErr) {
          console.error("Could not load branches", bErr);
        }

        // 3. Fetch Google status
        try {
          const gRes = await API.get("/auth/google/status");
          setGoogleConnected(Boolean(gRes.data?.connected));
        } catch {}

      } catch (err) {
        console.error(err);
        alert("Failed to load class data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

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

  const extendTime = (mins) => {
    const [h, m] = form.endTime.split(":").map(Number);
    const end = new Date();
    end.setHours(h, m, 0, 0);
    const extended = new Date(end.getTime() + mins * 60 * 1000);
    const endH = String(extended.getHours()).padStart(2, "0");
    const endM = String(extended.getMinutes()).padStart(2, "0");
    setForm((prev) => ({ ...prev, endTime: `${endH}:${endM}` }));
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const handleCopyJoinLink = () => {
    if (!form.classCode) return;
    const url = `${window.location.origin}/join/${form.classCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  /* ================= REGENERATE MEET ================= */
  const handleRegenerateMeet = async () => {
    if (!googleConnected) {
      alert("Please connect your Google account from the profile dropdown in the top navbar first!");
      return;
    }

    try {
      setRegenerating(true);
      const res = await API.put(`/classes/update/${id}`, {
        ...form,
        regenerateMeet: true
      });

      if (res.data?.class?.meetLink) {
        setForm((prev) => ({ ...prev, meetLink: res.data.class.meetLink }));
        alert("✅ Google Meet link successfully generated and attached!");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to regenerate Meet link");
    } finally {
      setRegenerating(false);
    }
  };

  /* ================= INPUT HANDLER ================= */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  /* ================= UPDATE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const startDateTime = new Date(`${form.classDate}T${form.startTime}`);
    const endDateTime = new Date(`${form.classDate}T${form.endTime}`);

    if (startDateTime >= endDateTime) {
      alert("⚠️ Class end time must be after the start time.");
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      await API.put(`/classes/update/${id}`, form);
      alert("✅ Class updated successfully!");
      navigate(form.branchId ? `/dashboard/${form.branchId}` : "/branches");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update class");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="create-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading class details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-page">
      <div className="create-card">
        {/* HEADER */}
        <h2>Edit Class Session</h2>
        <p className="create-subtitle">
          Update class schedule, timings, Google Meet link, and access privacy
        </p>

        {/* CLASS CODE & SHARE BANNER */}
        {form.classCode && (
          <div className="class-code-banner">
            <div className="code-info">
              <span className="code-label">CLASS CODE</span>
              <span className="code-val">{form.classCode}</span>
            </div>
            <button
              type="button"
              className="copy-share-btn"
              onClick={handleCopyJoinLink}
            >
              {copiedLink ? "✓ Link Copied" : "📋 Copy Join Link"}
            </button>
          </div>
        )}

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

          {/* Branch Switcher (if multiple exist) */}
          {branches.length > 0 && (
            <div className="form-group">
              <label>Branch</label>
              <select
                name="branchId"
                className="input"
                value={form.branchId}
                onChange={handleChange}
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {/* Timings: Start & End Time */}
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
                  label="End Time (Expiry)"
                  value={form.endTime}
                  onChange={(newTime) => setForm({ ...form, endTime: newTime })}
                />
              </div>
            </div>

            {/* Quick Duration & Extension Chips */}
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
              <span className="duration-divider">|</span>
              <span className="duration-title">Extend:</span>
              <button type="button" className="duration-chip extend-chip" onClick={() => extendTime(30)}>
                +30m
              </button>
              <button type="button" className="duration-chip extend-chip" onClick={() => extendTime(60)}>
                +1h
              </button>
            </div>
          </div>

          {/* Meeting Access Mode: Visual Cards (Public vs Private) */}
          <div className="form-group">
            <label>Meeting Privacy & Access Mode</label>
            <div className="access-options-grid">
              <div
                className={`access-card ${form.accessType === "open" ? "active" : ""}`}
                onClick={() => setForm({ ...form, accessType: "open" })}
                role="button"
                tabIndex={0}
              >
                <div className="access-card-head">
                  <span className="access-icon">🌐</span>
                  <span className="access-title">Public / Open</span>
                  <span className="access-radio"></span>
                </div>
                <p className="access-desc">
                  Students join directly without host approval
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
                  <span className="access-title">Private / Restricted</span>
                  <span className="access-radio"></span>
                </div>
                <p className="access-desc">
                  Host approval required for each student
                </p>
              </div>
            </div>
          </div>

          {/* Google Meet Link */}
          <div className="form-group">
            <div className="label-row">
              <label>Google Meet Link</label>
              {form.meetLink && (
                <a
                  href={form.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="test-link"
                >
                  🚀 Test Link
                </a>
              )}
            </div>
            <input
              name="meetLink"
              placeholder="https://meet.google.com/xyz-abc-def"
              value={form.meetLink}
              onChange={handleChange}
              required
            />

            {/* Auto-generate with Google Calendar */}
            <div className="meet-action-row">
              <button
                type="button"
                className="btn-regenerate-meet"
                onClick={handleRegenerateMeet}
                disabled={regenerating}
              >
                {regenerating ? (
                  "🔄 Generating Meet Link..."
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Generate Fresh Google Meet Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="edit-actions-row">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(form.branchId ? `/dashboard/${form.branchId}` : "/branches")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={submitting}
            >
              {submitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditClass;
