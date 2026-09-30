import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import API from "../services/api";
import logo from "../assets/logo.png";

const JoinClass = () => {
  // Apply dark mode on this standalone public page
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    return () => document.documentElement.removeAttribute("data-theme");
  }, []);
  const { classCode } = useParams();

  const savedProfile = JSON.parse(localStorage.getItem("studentProfile"));

  const [formData, setFormData] = useState({
    fullName: savedProfile?.fullName || "",
    email: savedProfile?.email || "",
    group: savedProfile?.group || "",
    college: savedProfile?.college || ""
  });

  const DEFAULT_JOIN_COLLEGES = [
    { name: "BR Ambedkar College", code: "BRAC" },
    { name: "City College", code: "CC" },
    { name: "Vivekananda College", code: "VC" },
    { name: "BJR College", code: "BJR" },
    { name: "Malkajigiri College", code: "MC" },
    { name: "Golconda College", code: "GC" },
    { name: "Hussaini Alam College", code: "HAC" },
    { name: "Begumpet College", code: "BC" },
    { name: "Andhra Mahila Sabha", code: "AMS" },
    { name: "Sarojini Naidu College", code: "SNC" }
  ];

  const getJoinInitialColleges = () => {
    try {
      const cached = localStorage.getItem("app_colleges");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore error
    }
    return DEFAULT_JOIN_COLLEGES;
  };

  const [classInfo, setClassInfo] = useState(null);
  const [colleges, setColleges] = useState(getJoinInitialColleges);
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* ================= FETCH CLASS INFO & COLLEGES ================= */

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const res = await API.get(`/classes/by-code/${classCode}`);
        setClassInfo(res.data);
        if (res.data.isExpired || new Date(res.data.expiresAt) <= new Date()) {
          setExpired(true);
          setTimeLeft("Expired");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Invalid or expired class link");
        setExpired(true);
      } finally {
        setLoading(false);
      }
    };

    const fetchColleges = async () => {
      try {
        const res = await API.get("/colleges");
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setColleges(res.data);
          localStorage.setItem("app_colleges", JSON.stringify(res.data));
        }
      } catch (err) {
        console.warn("Error loading colleges list, using cached/defaults:", err);
      }
    };

    fetchClass();
    fetchColleges();
  }, [classCode]);

  /* ================= COUNTDOWN (IST TIMEZONE) ================= */

  useEffect(() => {
    if (!classInfo?.expiresAt) return;

    const expiryUTC = new Date(classInfo.expiresAt).getTime();

    // If start time is explicitly available in IST (+05:30)
    let startUTC = null;
    if (classInfo.classDate && classInfo.startTime) {
      startUTC = new Date(`${classInfo.classDate}T${classInfo.startTime}:00+05:30`).getTime();
    } else {
      // Fallback estimate: class started/starts 90 minutes before expiry
      startUTC = expiryUTC - 90 * 60 * 1000;
    }

    const interval = setInterval(() => {
      const nowUTC = Date.now();

      if (expiryUTC <= nowUTC) {
        setExpired(true);
        setTimeLeft("Session Expired");
        clearInterval(interval);
        return;
      }

      // If class hasn't started yet
      if (startUTC && nowUTC < startUTC) {
        const diff = startUTC - nowUTC;
        const totalSeconds = Math.floor(diff / 1000);
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        setTimeLeft(
          hrs > 0
            ? `Starts in ${hrs}h ${mins}m ${secs}s`
            : `Starts in ${mins}m ${secs}s`
        );
      } else {
        // Class is Live / In Progress
        const diff = expiryUTC - nowUTC;
        const totalSeconds = Math.floor(diff / 1000);
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        setTimeLeft(
          hrs > 0
            ? `Live • ${hrs}h ${mins}m ${secs}s left`
            : `Live • ${mins}m ${secs}s left`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [classInfo]);

  // Format scheduled time helper
  const getScheduledTimeString = () => {
    if (!classInfo?.expiresAt) return "";
    const expiryUTC = new Date(classInfo.expiresAt).getTime();
    const startUTC =
      classInfo.classDate && classInfo.startTime
        ? new Date(`${classInfo.classDate}T${classInfo.startTime}:00+05:30`).getTime()
        : expiryUTC - 90 * 60 * 1000;

    const startStr = new Date(startUTC).toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const endStr = new Date(expiryUTC).toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${startStr} – ${endStr} (IST)`;
  };

  /* ================= INPUT HANDLER ================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: name === "email" ? value.toLowerCase() : value
    }));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (expired) return;

    setError("");
    setMessage("");

    // Open a blank tab SYNCHRONOUSLY here (before any async work) so that
    // mobile browsers do not block it as a popup. We'll assign the meet URL
    // into this tab once the API responds.
    let meetTab = null;
    try {
      meetTab = window.open("about:blank", "_blank");
    } catch (_) {
      // Some browsers may still block; we'll fall back gracefully
    }

    try {
      const res = await API.post("/attendance/mark", {
        ...formData,
        classCode
      });

      localStorage.setItem("studentProfile", JSON.stringify(formData));
      setMessage(res.data.message || "Attendance marked successfully");

      if (res.data.meetLink) {
        if (meetTab && !meetTab.closed) {
          // Redirect the already-opened blank tab to the meet link
          meetTab.location.href = res.data.meetLink;
        } else {
          // Fallback: try window.open again or use location.href
          try {
            window.open(res.data.meetLink, "_blank");
          } catch (_) {
            window.location.href = res.data.meetLink;
          }
        }
      } else {
        // No meet link returned — close the blank tab we opened
        if (meetTab && !meetTab.closed) meetTab.close();
      }

    } catch (err) {
      // Close the blank tab on API error so it doesn't hang open
      if (meetTab && !meetTab.closed) meetTab.close();
      setError(err.response?.data?.message || "Unable to mark attendance");
    }
  };

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-5 relative overflow-hidden">
        <div className="flex flex-col items-center gap-3.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-10 z-10">
          <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
          <p className="text-[var(--subtext)] text-sm">Loading class details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-5 sm:p-8 relative overflow-hidden gap-5">

      {/* Background orbs */}
      <div className="fixed rounded-full pointer-events-none z-0 blur-[60px] w-[420px] h-[420px] -top-[140px] -right-[120px] bg-[radial-gradient(circle,rgba(99,102,241,0.22),transparent_70%)] animate-[orbFloat_8s_ease-in-out_infinite]" />
      <div className="fixed rounded-full pointer-events-none z-0 blur-[60px] w-[360px] h-[360px] -bottom-[120px] -left-[100px] bg-[radial-gradient(circle,rgba(167,139,250,0.15),transparent_70%)] animate-[orbFloat_10s_ease-in-out_infinite_reverse]" />

      {/* Branding header */}
      <header className="flex items-center gap-2.5 z-10 animate-[fadeSlideDown_0.5s_cubic-bezier(0.4,0,0.2,1)]">
        <img src={logo} alt="Barabari Logo" className="w-[34px] h-[34px] rounded-[9px] object-cover shadow-[0_4px_14px_rgba(99,102,241,0.4)]" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] sm:text-sm font-bold text-[var(--text)] tracking-tight leading-tight">Online Attendance Tracker</span>
          <span className="text-[10.5px] font-normal text-[var(--subtext)] leading-tight">a product of <strong className="font-bold bg-gradient-to-r from-[var(--primary)] to-purple-400 bg-clip-text text-transparent">Barabari Collectives</strong></span>
        </div>
      </header>

      {/* Card */}
      <div className="bg-[var(--card)] w-full max-w-[460px] rounded-[20px] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-5.5 sm:p-7 relative z-10 animate-[fadeSlideUp_0.5s_cubic-bezier(0.4,0,0.2,1)] before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-3/5 before:h-px before:bg-gradient-to-r before:from-transparent before:via-indigo-500/60 before:to-transparent">

        {/* Class Info */}
        <div className="text-center mb-4">
          <h2 className="text-xl sm:text-[22px] font-extrabold text-[var(--text)] tracking-tight mb-2.5 leading-tight">{classInfo?.className || "Class Session"}</h2>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--subtext)] text-xs font-semibold py-1 px-2.5 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              {classInfo?.subject || "General"}
            </span>
            {!expired ? (
              <span className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-[var(--primary)] text-xs font-bold py-1 px-2.5 rounded-full animate-[pulseBadge_2s_ease-in-out_infinite]">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {timeLeft}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-[var(--danger-light)] border border-red-500/30 text-[var(--danger)] text-xs font-bold py-1 px-2.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                Session Expired
              </span>
            )}
          </div>

          {/* Scheduled Time Subtext */}
          {getScheduledTimeString() && !expired && (
            <p className="text-[11.5px] text-[var(--subtext)] mt-2 mb-0 font-medium">
              ⏰ Class Schedule: <span className="text-[var(--text)] font-bold">{getScheduledTimeString()}</span>
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--border)] my-4" />

        {/* Status messages */}
        {message && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl text-[13.5px] font-medium mb-3.5 leading-snug bg-emerald-500/10 border border-emerald-500/25 text-[var(--success)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {message}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl text-[13.5px] font-medium mb-3.5 leading-snug bg-[var(--danger-light)] border border-red-500/25 text-[var(--danger)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* Form */}
        {!expired && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">

            {savedProfile && (
              <p className="text-xs font-medium text-[var(--primary)] bg-[var(--primary-light)] border border-indigo-500/25 p-2 rounded-lg text-center tracking-wide">✦ Details auto-filled — please verify before submitting</p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--subtext)] uppercase tracking-wider">Full Name</label>
              <input
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full py-2.5 px-3.5 text-sm rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)] font-inherit"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--subtext)] uppercase tracking-wider">Email Address</label>
              <input
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="w-full py-2.5 px-3.5 text-sm rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)] font-inherit"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--subtext)] uppercase tracking-wider">Group</label>
                <div className="relative">
                  <select
                    name="group"
                    value={formData.group}
                    onChange={handleChange}
                    className="w-full py-2.5 pr-9 pl-3.5 text-sm rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none appearance-none cursor-pointer transition-all duration-200 focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)] font-inherit"
                    required
                  >
                    <option value="">Select Group</option>
                    <option value="BSC" className="bg-[var(--card)] text-[var(--text)]">BSC</option>
                    <option value="BCOM" className="bg-[var(--card)] text-[var(--text)]">BCOM</option>
                    <option value="BA" className="bg-[var(--card)] text-[var(--text)]">BA</option>
                    <option value="BCA" className="bg-[var(--card)] text-[var(--text)]">BCA</option>
                    <option value="BBA" className="bg-[var(--card)] text-[var(--text)]">BBA</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--subtext)] pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--subtext)] uppercase tracking-wider">College</label>
                <div className="relative">
                  <select
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    className="w-full py-2.5 pr-9 pl-3.5 text-sm rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none appearance-none cursor-pointer transition-all duration-200 focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)] font-inherit"
                    required
                  >
                    <option value="">Select College</option>
                    {colleges.map((c) => {
                      const collegeVal = c.name.toUpperCase();
                      return (
                        <option
                          key={c._id || c.name}
                          value={collegeVal}
                          className="bg-[var(--card)] text-[var(--text)]"
                        >
                          {c.name}
                        </option>
                      );
                    })}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--subtext)] pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-1 py-3.5 px-4 text-[15px] font-bold bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white border-0 rounded-xl cursor-pointer transition-all duration-200 shadow-[0_4px_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 w-full tracking-wide hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(99,102,241,0.55)] active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Mark Attendance & Join Class
            </button>
          </form>
        )}

        {expired && !error && (
          <div className="text-center py-5">
            <div className="text-4xl mb-3">⏰</div>
            <p className="text-[var(--subtext)] text-sm leading-relaxed">This class session has ended. The attendance link is no longer active.</p>
          </div>
        )}

      </div>

      <p className="text-xs text-[var(--text-muted)] z-10 tracking-wide">Powered by Barabari Collectives</p>
    </div>
  );
};

export default JoinClass;