import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import API from "../services/api";
import "./JoinClass.css";
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

  const [classInfo, setClassInfo] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* ================= FETCH CLASS INFO ================= */

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

    fetchClass();
  }, [classCode]);

  /* ================= COUNTDOWN (FIXED TIMEZONE) ================= */

  useEffect(() => {
    if (!classInfo?.expiresAt) return;

    const expiryUTC = new Date(classInfo.expiresAt).getTime();

    const interval = setInterval(() => {
      const nowUTC = Date.now();
      const diff = expiryUTC - nowUTC;

      if (isNaN(diff)) return;

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Expired");
        clearInterval(interval);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);

      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;

      setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [classInfo]);

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

    try {
      const res = await API.post("/attendance/mark", {
        ...formData,
        classCode
      });

      localStorage.setItem("studentProfile", JSON.stringify(formData));

      setMessage(res.data.message || "Attendance marked successfully");

      if (res.data.meetLink) {
        setTimeout(() => window.open(res.data.meetLink, "_blank"), 800);
      }

    } catch (err) {
      setError(err.response?.data?.message || "Unable to mark attendance");
    }
  };

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="join-page">
        <div className="join-loading-card">
          <div className="join-spinner" />
          <p>Loading class details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">

      {/* Background orbs */}
      <div className="join-orb join-orb-1" />
      <div className="join-orb join-orb-2" />

      {/* Branding header */}
      <header className="join-brand">
        <img src={logo} alt="Barabari Logo" className="join-brand-logo" />
        <div className="join-brand-text">
          <span className="join-brand-title">Online Attendance Tracker</span>
          <span className="join-brand-sub">a product of <strong>Barabari Collectives</strong></span>
        </div>
      </header>

      {/* Card */}
      <div className="join-card">

        {/* Class Info */}
        <div className="join-class-info">
          <h2 className="join-class-name">{classInfo?.className || "Class Session"}</h2>
          <div className="join-meta-row">
            <span className="join-meta-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              {classInfo?.subject || "General"}
            </span>
            {!expired ? (
              <span className="join-countdown-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {timeLeft}
              </span>
            ) : (
              <span className="join-expired-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                Session Expired
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="join-divider" />

        {/* Status messages */}
        {message && (
          <div className="join-alert join-alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {message}
          </div>
        )}
        {error && (
          <div className="join-alert join-alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* Form */}
        {!expired && (
          <form onSubmit={handleSubmit} className="join-form">

            {savedProfile && (
              <p className="join-prefill-note">✦ Details auto-filled — please verify before submitting</p>
            )}

            <div className="join-field">
              <label className="join-label">Full Name</label>
              <input
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="join-field">
              <label className="join-label">Email Address</label>
              <input
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="join-row">
              <div className="join-field">
                <label className="join-label">Group</label>
                <div className="join-select-wrap">
                  <select name="group" value={formData.group} onChange={handleChange} required>
                    <option value="">Select Group</option>
                    <option value="BSC">BSC</option>
                    <option value="BCOM">BCOM</option>
                    <option value="BA">BA</option>
                    <option value="BCA">BCA</option>
                  </select>
                  <svg className="join-select-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>

              <div className="join-field">
                <label className="join-label">College</label>
                <div className="join-select-wrap">
                  <select name="college" value={formData.college} onChange={handleChange} required>
                    <option value="">Select College</option>
                    <option value="CITY COLLEGE">City College</option>
                    <option value="VIVEKANANDA COLLEGE">Vivekananda College</option>
                    <option value="BJR COLLEGE">BJR College</option>
                    <option value="MALKAJIGIRI COLLEGE">Malkajigiri College</option>
                    <option value="GOLCONDA COLLEGE">Golconda College</option>
                    <option value="HUSSAINI ALAM COLLEGE">Hussaini Alam College</option>
                    <option value="BEGUMPET COLLEGE">Begumpet College</option>
                  </select>
                  <svg className="join-select-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </div>

            <button type="submit" className="join-submit-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Mark Attendance & Join Class
            </button>
          </form>
        )}

        {expired && !error && (
          <div className="join-expired-state">
            <div className="join-expired-icon">⏰</div>
            <p>This class session has ended. The attendance link is no longer active.</p>
          </div>
        )}

      </div>

      <p className="join-footer-text">Powered by Barabari Collectives</p>
    </div>
  );
};

export default JoinClass;