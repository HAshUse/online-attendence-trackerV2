import "./Navbar.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import logo from "../assets/logo.png";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [googleStatus, setGoogleStatus] = useState({ connected: false, googleEmail: null });
  const { dark, setDark } = useTheme();
  const profileRef = useRef(null);

  const teacher = JSON.parse(localStorage.getItem("teacher"));

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Check Google connection status
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    API.get("/auth/google/status")
      .then((res) => setGoogleStatus(res.data))
      .catch(() => {});
  }, []);

  // Handle Google connect success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "success") {
      API.get("/auth/google/status")
        .then((res) => setGoogleStatus(res.data))
        .catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("teacher");
    navigate("/");
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await API.get("/auth/google/url");
      window.location.href = res.data.url;
    } catch (err) {
      console.error("Failed to get Google auth URL:", err);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await API.delete("/auth/google/disconnect");
      setGoogleStatus({ connected: false, googleEmail: null });
    } catch (err) {
      console.error("Disconnect failed:", err);
    }
  };

  return (
    <nav className="navbar">

      {/* LEFT BRANDING */}
      <div className="nav-left" onClick={() => navigate("/branches")} role="button" tabIndex={0}>
        <img src={logo} alt="Barabari Logo" className="logo" />
        <div className="brand-group">
          <span className="brand-title">Online Attendance Tracker</span>
          <span className="brand-subtitle">
            a product of <span className="brand-highlight">Barabari Collectives</span>
          </span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="nav-right" ref={profileRef}>

        {/* Home Button */}
        <button
          id="nav-home-btn"
          className="nav-home-btn"
          onClick={() => navigate(localStorage.getItem("token") ? "/branches" : "/")}
          title="Home / Branches"
          aria-label="Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="home-btn-text">Home</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          id="dark-mode-toggle"
          className="theme-toggle"
          onClick={() => setDark(!dark)}
          title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle dark mode"
        >
          {dark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Profile */}
        <div className="profile" onClick={() => setOpen(!open)}>
          <div className="avatar">
            {teacher?.name?.charAt(0).toUpperCase() || "T"}
          </div>
          <div className="teacher-info">
            <span className="teacher-name">
              {teacher?.name || "Teacher"}
            </span>
          </div>
          <svg className={`chevron ${open ? "chevron-up" : ""}`} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* Profile Dropdown */}
        {open && (
          <>
            <div className="profile-menu">
              {/* Header */}
              <div className="profile-menu-header">
                <div className="avatar avatar-lg">
                  {teacher?.name?.charAt(0).toUpperCase() || "T"}
                </div>
                <div>
                  <p className="profile-menu-name">{teacher?.name || "Teacher"}</p>
                  <p className="profile-menu-email">{teacher?.email || ""}</p>
                </div>
              </div>

              <div className="profile-menu-divider" />

              {/* Google Connect */}
              {googleStatus.connected ? (
                <div className="google-connected-section">
                  <div className="google-connected-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Google Connected
                  </div>
                  <p className="google-email">{googleStatus.googleEmail}</p>
                  <button className="google-disconnect-btn" onClick={handleDisconnectGoogle}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <button className="google-connect-btn" onClick={handleConnectGoogle}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Connect Google Account
                </button>
              )}

              <div className="profile-menu-divider" />

              {/* Logout */}
              <button id="logout-btn" className="logout-btn" onClick={handleLogout}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </div>
          </>
        )}

      </div>
    </nav>
  );
}

export default Navbar;

