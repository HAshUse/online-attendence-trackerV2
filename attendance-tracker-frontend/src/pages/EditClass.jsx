import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";

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

        {/* AM / PM Segmented Control */}
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
      <div className="min-h-[calc(100vh-64px)] bg-[var(--bg)] flex justify-center items-center p-5 sm:p-9 transition-colors duration-200">
        <div className="flex flex-col items-center justify-center gap-3.5 p-10 text-[var(--subtext)] text-sm">
          <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin"></div>
          <p>Loading class details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--bg)] flex justify-center items-center p-5 sm:p-9 transition-colors duration-200">
      <div className="bg-[var(--card)] p-6 sm:p-8.5 rounded-3xl w-full max-w-[500px] border border-[var(--border)] shadow-[var(--shadow-lg)] transition-all duration-200">
        {/* HEADER */}
        <h2 className="text-center mb-1 text-xl sm:text-[23px] font-extrabold text-[var(--text)] tracking-tight">
          Edit Class Session
        </h2>
        <p className="text-center text-[13px] text-[var(--subtext)] mb-6 leading-relaxed">
          Update class schedule, timings, Google Meet link, and access privacy
        </p>

        {/* CLASS CODE & SHARE BANNER */}
        {form.classCode && (
          <div className="flex items-center justify-between bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-2.5 sm:p-3.5 mb-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[var(--subtext)] tracking-wider">CLASS CODE</span>
              <span className="text-base font-extrabold text-[var(--primary)] tracking-widest">{form.classCode}</span>
            </div>
            <button
              type="button"
              className="bg-[var(--card)] border border-[var(--border)] text-[var(--text)] text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
              onClick={handleCopyJoinLink}
            >
              {copiedLink ? "✓ Link Copied" : "📋 Copy Join Link"}
            </button>
          </div>
        )}

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

          {/* Branch Switcher (if multiple exist) */}
          {branches.length > 0 && (
            <div className="mb-4.5 flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-[var(--text)] tracking-wide">Branch</label>
              <select
                name="branchId"
                className="w-full py-2.5 px-3.5 border-[1.5px] border-[var(--border)] rounded-lg text-[13.5px] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)] cursor-pointer"
                value={form.branchId}
                onChange={handleChange}
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id} className="bg-[var(--card)] text-[var(--text)]">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {/* Timings: Start & End Time */}
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
                  label="End Time (Expiry)"
                  value={form.endTime}
                  onChange={(newTime) => setForm({ ...form, endTime: newTime })}
                />
              </div>
            </div>

            {/* Quick Duration & Extension Chips */}
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
              <span className="text-[var(--border)] text-[13px] mx-0.5">|</span>
              <span className="text-[11px] font-semibold text-[var(--subtext)]">Extend:</span>
              <button type="button" className="bg-emerald-500/10 text-[var(--success)] border border-emerald-500/30 text-[11.5px] font-semibold py-0.5 px-2.5 rounded-full cursor-pointer transition-all hover:bg-emerald-500/20 hover:border-[var(--success)] hover:-translate-y-0.5 active:scale-95" onClick={() => extendTime(30)}>
                +30m
              </button>
              <button type="button" className="bg-emerald-500/10 text-[var(--success)] border border-emerald-500/30 text-[11.5px] font-semibold py-0.5 px-2.5 rounded-full cursor-pointer transition-all hover:bg-emerald-500/20 hover:border-[var(--success)] hover:-translate-y-0.5 active:scale-95" onClick={() => extendTime(60)}>
                +1h
              </button>
            </div>
          </div>

          {/* Meeting Access Mode: Visual Cards (Public vs Private) */}
          <div className="mb-4.5 flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-[var(--text)] tracking-wide">Meeting Privacy & Access Mode</label>
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
                  <span className="text-[12.5px] font-bold text-[var(--text)] flex-1 leading-tight">Public / Open</span>
                  <span className={`w-4 h-4 rounded-full border-2 border-[var(--border)] flex items-center justify-center shrink-0 transition-all ${form.accessType === "open" ? "border-[var(--primary)] bg-[var(--primary)] after:content-[''] after:w-1.5 after:h-1.5 after:bg-white after:rounded-full" : ""}`}></span>
                </div>
                <p className="text-[11px] text-[var(--subtext)] leading-snug m-0">
                  Students join directly without host approval
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
                  <span className="text-[12.5px] font-bold text-[var(--text)] flex-1 leading-tight">Private / Restricted</span>
                  <span className={`w-4 h-4 rounded-full border-2 border-[var(--border)] flex items-center justify-center shrink-0 transition-all ${form.accessType === "restricted" ? "border-[var(--primary)] bg-[var(--primary)] after:content-[''] after:w-1.5 after:h-1.5 after:bg-white after:rounded-full" : ""}`}></span>
                </div>
                <p className="text-[11px] text-[var(--subtext)] leading-snug m-0">
                  Host approval required for each student
                </p>
              </div>
            </div>
          </div>

          {/* Google Meet Link */}
          <div className="mb-4.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-[var(--text)] tracking-wide">Google Meet Link</label>
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
              placeholder="https://meet.google.com/xyz-abc-def"
              value={form.meetLink}
              onChange={handleChange}
              className="w-full py-2.5 px-3.5 border-[1.5px] border-[var(--border)] rounded-lg text-[13.5px] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
              required
            />

            {/* Auto-generate with Google Calendar */}
            <div className="mt-1.5">
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text)] text-[12.5px] font-semibold cursor-pointer transition-all hover:border-[#4285F4] hover:text-[#4285F4] hover:bg-[var(--card-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
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
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-2.5">
            <button
              type="button"
              className="flex-1 py-3 px-4 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-[var(--card-hover)] hover:border-[var(--subtext)]"
              onClick={() => navigate(form.branchId ? `/dashboard/${form.branchId}` : "/branches")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-2 py-3 px-4 bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white border-0 rounded-lg text-[14.5px] font-bold cursor-pointer transition-all duration-200 shadow-[0_4px_14px_rgba(99,102,241,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
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

