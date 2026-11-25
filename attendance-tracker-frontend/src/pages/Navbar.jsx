import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import logo from "../assets/logo.png";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";
import {
  Home,
  GraduationCap,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Sparkles,
  Link2,
  Unlink,
} from "lucide-react";
import Toast from "../components/Toast";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [googleStatus, setGoogleStatus] = useState(() => {
    try {
      const saved = localStorage.getItem("googleStatus");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { connected: false, googleEmail: null };
  });
  const { dark, setDark } = useTheme();
  const profileRef = useRef(null);
  const [toast, setToast] = useState(null);

  const [authTeacher, setAuthTeacher] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("teacher"));
    } catch {
      return null;
    }
  });

  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem("token"));
  const [hasAdminToken, setHasAdminToken] = useState(() => !!localStorage.getItem("adminToken"));

  const showToast = (message, type = "info", title = "") => {
    setToast({ message, type, title, id: Date.now() });
  };

  // Re-sync auth state on route change
  useEffect(() => {
    const token = localStorage.getItem("token");
    setHasToken(!!token);
    setHasAdminToken(!!localStorage.getItem("adminToken"));
    try {
      setAuthTeacher(JSON.parse(localStorage.getItem("teacher")));
    } catch {
      setAuthTeacher(null);
    }
    setOpen(false);
  }, [location.pathname]);

  // Handle auth expiry
  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("teacher");
      localStorage.removeItem("googleStatus");
      setHasToken(false);
      setAuthTeacher(null);
      setOpen(false);
      setGoogleStatus({ connected: false, googleEmail: null });
      navigate("/");
    };
    window.addEventListener("authChange", handleAuthExpired);
    return () => window.removeEventListener("authChange", handleAuthExpired);
  }, [navigate]);

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

  // Google status check
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setGoogleStatus({ connected: false, googleEmail: null });
      localStorage.removeItem("googleStatus");
      return;
    }
    API.get("/auth/google/status")
      .then((res) => {
        if (res.data) {
          setGoogleStatus(res.data);
          localStorage.setItem("googleStatus", JSON.stringify(res.data));
        }
      })
      .catch(() => {});
  }, [hasToken, location.pathname]);

  // Google connect callback handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "success") {
      API.get("/auth/google/status")
        .then((res) => {
          if (res.data) {
            setGoogleStatus(res.data);
            localStorage.setItem("googleStatus", JSON.stringify(res.data));
            showToast("Google account connected successfully!", "success", "Google Connected");
          }
        })
        .catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("teacher");
    localStorage.removeItem("googleStatus");
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
      showToast(
        err.response?.data?.message || "Google Authentication service is updating. Please try again.",
        "warning",
        "Connection Error"
      );
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await API.delete("/auth/google/disconnect");
      setGoogleStatus({ connected: false, googleEmail: null });
      showToast("Google account disconnected.", "info", "Disconnected");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to disconnect Google account.", "error");
    }
  };

  return (
    <nav className="h-16 w-full bg-[var(--navbar-bg)] backdrop-blur-xl flex items-center justify-between px-3.5 sm:px-6 border-b border-[var(--border)] shadow-[var(--shadow-navbar)] sticky top-0 z-[200] transition-colors duration-200">
      {/* BRANDING */}
      <div
        className="flex items-center gap-3 min-w-0 cursor-pointer select-none group"
        onClick={() => navigate(hasToken ? "/branches" : hasAdminToken ? "/admin" : "/")}
        role="button"
        tabIndex={0}
      >
        <div className="relative">
          <img
            src={logo}
            alt="Barabari Logo"
            className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-[var(--border)] group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--card)]" />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[14px] sm:text-[15px] font-bold text-[var(--text-heading)] tracking-tight whitespace-nowrap leading-tight group-hover:text-[var(--primary)] transition-colors">
            Attendance Tracker
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-[var(--subtext)] whitespace-nowrap leading-tight">
            by <span className="font-semibold text-[var(--primary)]">Barabari</span> Collectives
          </span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="relative flex items-center gap-2 sm:gap-2.5" ref={profileRef}>
        {/* Navigation links if authenticated */}
        {hasToken && (
          <>
            <button
              onClick={() => navigate("/branches")}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xs font-semibold hover:border-[var(--border-focus)] hover:bg-[var(--card-hover)] transition-all cursor-pointer active:scale-95"
              title="Branches Overview"
            >
              <Home className="w-3.5 h-3.5 text-[var(--subtext)]" />
              <span className="hidden sm:inline">Branches</span>
            </button>

            <button
              onClick={() => navigate("/colleges")}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xs font-semibold hover:border-[var(--border-focus)] hover:bg-[var(--card-hover)] transition-all cursor-pointer active:scale-95"
              title="Colleges List"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[var(--subtext)]" />
              <span className="hidden sm:inline">Colleges</span>
            </button>
          </>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={() => setDark(!dark)}
          className="h-9 w-9 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--subtext)] hover:text-[var(--text)] hover:border-[var(--border-focus)] hover:bg-[var(--card-hover)] flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme"
        >
          {dark ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500 transition-transform -rotate-12 hover:rotate-0" />
          )}
        </button>

        {/* User Profile or Login */}
        {hasToken && authTeacher ? (
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-2 h-9 pl-2 pr-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-focus)] text-[var(--text)] text-xs font-semibold transition-all cursor-pointer select-none active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold flex items-center justify-center text-[11px] shadow-xs">
                {authTeacher.name ? authTeacher.name.charAt(0).toUpperCase() : "T"}
              </div>
              <span className="max-w-[90px] sm:max-w-[130px] truncate">
                {authTeacher.name || "Account"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-[var(--subtext)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {open && (
              <div className="absolute right-0 top-11 w-64 rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-xl shadow-2xl p-2 z-[300] animate-[dropdownIn_0.15s_ease-out]">
                {/* User Info Header */}
                <div className="px-3 py-2.5 border-b border-[var(--border)] mb-1">
                  <div className="text-xs font-bold text-[var(--text-heading)] truncate">
                    {authTeacher.name}
                  </div>
                  <div className="text-[11px] text-[var(--subtext)] truncate">
                    {authTeacher.email}
                  </div>
                </div>

                {/* Google Workspace status */}
                <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] mb-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-[var(--subtext)] tracking-wider">
                      Google Account
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        googleStatus.connected
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {googleStatus.connected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  {googleStatus.connected ? (
                    <div className="space-y-1">
                      <div className="text-[11px] text-[var(--text)] truncate font-medium">
                        {googleStatus.googleEmail}
                      </div>
                      <button
                        onClick={handleDisconnectGoogle}
                        className="w-full text-left text-[11px] text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1.5 cursor-pointer pt-0.5"
                      >
                        <Unlink className="w-3 h-3" /> Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleConnectGoogle}
                      className="w-full text-left text-[11px] text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Link2 className="w-3 h-3" /> Connect Google Account
                    </button>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : hasAdminToken ? (
          <button
            onClick={() => navigate("/admin")}
            className="h-9 px-3.5 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/25 text-[var(--primary)] text-xs font-semibold cursor-pointer"
          >
            Admin
          </button>
        ) : (
          <button
            onClick={() => navigate("/")}
            className="h-9 px-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Login
          </button>
        )}
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
    </nav>
  );
}

export default Navbar;
