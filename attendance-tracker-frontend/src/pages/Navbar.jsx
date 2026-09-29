import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import logo from "../assets/logo.png";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [googleStatus, setGoogleStatus] = useState({ connected: false, googleEmail: null });
  const { dark, setDark } = useTheme();
  const profileRef = useRef(null);

  const [authTeacher, setAuthTeacher] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("teacher"));
    } catch {
      return null;
    }
  });

  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem("token"));

  // Re-sync auth state on every route change
  useEffect(() => {
    const token = localStorage.getItem("token");
    setHasToken(!!token);
    try {
      setAuthTeacher(JSON.parse(localStorage.getItem("teacher")));
    } catch {
      setAuthTeacher(null);
    }
    setOpen(false);
  }, [location.pathname]);

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

  // Check Google connection status if logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setGoogleStatus({ connected: false, googleEmail: null });
      return;
    }
    API.get("/auth/google/status")
      .then((res) => setGoogleStatus(res.data))
      .catch(() => {});
  }, [hasToken, location.pathname]);

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
    setHasToken(false);
    setAuthTeacher(null);
    setOpen(false);
    setGoogleStatus({ connected: false, googleEmail: null });
    navigate("/");
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await API.get("/auth/google/url");
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error("Failed to get Google auth URL:", err);
      alert(
        err.response?.data?.message ||
          "Google Authentication service is currently updating on the backend. Please check the Render deployment or try again in a moment."
      );
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await API.delete("/auth/google/disconnect");
      setGoogleStatus({ connected: false, googleEmail: null });
    } catch (err) {
      console.error("Disconnect failed:", err);
      alert(err.response?.data?.message || "Failed to disconnect Google account.");
    }
  };

  return (
    <nav className="h-16 w-full bg-[var(--navbar-bg)] backdrop-blur-md flex items-center justify-between px-3.5 sm:px-6 border-b border-[var(--border)] shadow-[var(--shadow-navbar)] sticky top-0 z-[200] transition-colors duration-200">

      {/* LEFT BRANDING */}
      <div
        className="flex items-center gap-3 min-w-0 cursor-pointer select-none transition-opacity hover:opacity-90"
        onClick={() => navigate("/branches")}
        role="button"
        tabIndex={0}
      >
        <img src={logo} alt="Barabari Logo" className="w-[38px] h-[38px] rounded-lg object-cover shrink-0" />
        <div className="flex flex-col justify-center gap-0.5">
          <span className="text-[13.5px] sm:text-[15px] font-bold text-[var(--text)] tracking-tight whitespace-nowrap leading-tight">
            Online Attendance Tracker
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-[var(--subtext)] tracking-normal whitespace-nowrap leading-tight">
            a product of <span className="font-bold bg-gradient-to-r from-[var(--primary)] to-purple-400 bg-clip-text text-transparent">Barabari Collectives</span>
          </span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="relative flex items-center gap-2.5" ref={profileRef}>

        {/* Home Button */}
        <button
          id="nav-home-btn"
          className="inline-flex items-center gap-1.5 h-[38px] px-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[10px] text-[var(--text)] text-[13.5px] font-semibold cursor-pointer shrink-0 transition-all duration-200 hover:bg-[var(--primary-light)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:-translate-y-0.5 active:scale-95 hover:shadow-[0_2px_8px_rgba(99,102,241,0.18)]"
          onClick={() => navigate(localStorage.getItem("token") ? "/branches" : "/")}
          title="Home / Branches"
          aria-label="Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="hidden sm:inline">Home</span>
        </button>

        {/* Colleges Button */}
        {localStorage.getItem("token") && (
          <button
            id="nav-colleges-btn"
            className="inline-flex items-center gap-1.5 h-[38px] px-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[10px] text-[var(--text)] text-[13.5px] font-semibold cursor-pointer shrink-0 transition-all duration-200 hover:bg-[var(--primary-light)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:-translate-y-0.5 active:scale-95 hover:shadow-[0_2px_8px_rgba(99,102,241,0.18)]"
            onClick={() => navigate("/colleges")}
            title="Manage Colleges"
            aria-label="Colleges"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18"/>
              <path d="M3 10h18"/>
              <path d="M5 6l7-3 7 3"/>
              <path d="M4 10v11"/>
              <path d="M20 10v11"/>
              <path d="M8 14v3"/>
              <path d="M12 14v3"/>
              <path d="M16 14v3"/>
            </svg>
            <span className="hidden sm:inline">Colleges</span>
          </button>
        )}

        {/* Dark Mode Toggle */}
        <button
          id="dark-mode-toggle"
          className="w-[38px] h-[38px] flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[10px] text-[var(--subtext)] cursor-pointer shrink-0 transition-all duration-200 hover:bg-[var(--primary-light)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:scale-105 active:scale-95"
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

        {/* Profile / Login Button */}
        {hasToken && authTeacher ? (
          <div
            className="flex items-center gap-2.5 cursor-pointer py-1.5 px-2.5 pl-1.5 rounded-xl border border-transparent hover:bg-[var(--bg-secondary)] hover:border-[var(--border)] transition-all duration-200"
            onClick={() => setOpen(!open)}
          >
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[var(--primary)] to-purple-400 text-white flex items-center justify-center font-bold text-[15px] shrink-0 shadow-[0_2px_8px_rgba(99,102,241,0.35)]">
              {authTeacher?.name?.charAt(0).toUpperCase() || "T"}
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-[13.5px] font-semibold text-[var(--text)] whitespace-nowrap">
                {authTeacher?.name || "Teacher"}
              </span>
            </div>
            <svg className={`hidden md:block text-[var(--subtext)] shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        ) : (
          <button
            id="nav-login-btn"
            className="inline-flex items-center gap-1.5 h-[38px] px-4.5 bg-gradient-to-r from-[var(--primary)] to-purple-600 hover:from-[var(--primary-hover)] hover:to-purple-700 text-white text-[13.5px] font-semibold rounded-[10px] cursor-pointer shadow-md transition-all hover:-translate-y-0.5 active:scale-95 border-0"
            onClick={() => navigate("/")}
            title="Login"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <span>Login</span>
          </button>
        )}

        {/* Profile Dropdown */}
        {open && hasToken && authTeacher && (
          <div className="absolute right-0 top-[calc(100%+10px)] bg-[var(--card)] border border-[var(--border)] rounded-2xl p-2 w-[220px] shadow-[var(--shadow-lg)] z-[300] animate-[dropdownIn_0.15s_cubic-bezier(0.4,0,0.2,1)]">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-1.5 py-2 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-purple-400 text-white flex items-center justify-center font-bold text-base shrink-0">
                {authTeacher?.name?.charAt(0).toUpperCase() || "T"}
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="text-sm font-semibold text-[var(--text)] truncate">{authTeacher?.name || "Teacher"}</p>
                <p className="text-xs text-[var(--subtext)] truncate">{authTeacher?.email || ""}</p>
              </div>
            </div>

            <div className="h-px bg-[var(--border)] my-1" />

            {/* Google Connect */}
            {googleStatus.connected ? (
              <div className="p-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--success)] mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Google Connected
                </div>
                <p className="text-[11px] text-[var(--subtext)] truncate mb-2">{googleStatus.googleEmail}</p>
                <button
                  className="w-full text-xs font-semibold text-[var(--subtext)] bg-transparent border border-[var(--border)] rounded-md py-1 px-2.5 cursor-pointer transition-all hover:border-[var(--danger)] hover:text-[var(--danger)]"
                  onClick={handleDisconnectGoogle}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                className="w-full flex items-center gap-2 py-2 px-2.5 bg-transparent border border-[var(--border)] rounded-lg text-[var(--text)] text-[13px] font-semibold cursor-pointer transition-all my-0.5 hover:border-[#4285F4] hover:bg-blue-500/10 hover:text-[#4285F4]"
                onClick={handleConnectGoogle}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Connect Google Account
              </button>
            )}

            <div className="h-px bg-[var(--border)] my-1" />

            {/* Logout */}
            <button
              id="logout-btn"
              className="w-full flex items-center gap-2 py-2 px-2.5 bg-transparent border-0 rounded-lg text-[var(--danger)] text-[13.5px] font-semibold cursor-pointer transition-all mt-0.5 hover:bg-[var(--danger-light)]"
              onClick={handleLogout}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        )}

      </div>
    </nav>
  );
}

export default Navbar;


