import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import logo from "../assets/logo.png";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/branches");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/teachers/login", {
        email: email.toLowerCase().trim(),
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("teacher", JSON.stringify(res.data.teacher));

      setEmail("");
      setPassword("");
      navigate("/branches");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[var(--bg)] px-4 py-12 transition-colors duration-200 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-light)] border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Teacher Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-heading)] tracking-tight">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-[var(--subtext)] mt-1">
            Sign in to manage classes, Google Meet telemetry, and registers.
          </p>
        </div>

        {/* CARD */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-7 sm:p-9 shadow-[var(--shadow-lg)] transition-all">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium animate-[fadeIn_0.15s_ease-out]">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="name@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--subtext)] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--border)] text-center space-y-2">
            <p className="text-xs text-[var(--subtext)]">
              Don't have an account yet?{" "}
              <Link
                to="/register"
                className="font-bold text-[var(--primary)] hover:underline ml-1"
              >
                Create Account
              </Link>
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Program Lead?{" "}
              <Link to="/admin/login" className="font-semibold text-[var(--subtext)] hover:text-[var(--primary)]">
                Admin Observer Portal →
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--subtext)] mt-6">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Encrypted JWT & Google OAuth 2.0 Integration</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
