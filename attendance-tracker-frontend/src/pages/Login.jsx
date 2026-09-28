import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // 🔐 If already logged in → go dashboard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/branches");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await API.post("/teachers/login", {
        email: email.toLowerCase(),
        password
      });

      // store auth
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("teacher", JSON.stringify(res.data.teacher));

      // reset fields
      setEmail("");
      setPassword("");

      navigate("/branches");

    } catch (err) {
      setError(
        err?.response?.data?.message ||
        "Invalid email or password"
      );
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-[var(--bg)] p-6 transition-colors duration-200 relative overflow-hidden before:content-[''] before:fixed before:-top-[120px] before:-left-[120px] before:w-[400px] before:h-[400px] before:bg-[radial-gradient(circle,rgba(99,102,241,0.15),transparent_70%)] before:rounded-full before:pointer-events-none before:z-0 after:content-[''] after:fixed after:-bottom-[100px] after:-right-[100px] after:w-[350px] after:h-[350px] after:bg-[radial-gradient(circle,rgba(167,139,250,0.1),transparent_70%)] after:rounded-full after:pointer-events-none after:z-0">
      <div className="bg-[var(--card)] p-7 sm:p-9 w-full max-w-[400px] rounded-3xl border border-[var(--border)] shadow-[var(--shadow-lg)] relative z-10 transition-all duration-200">
        <h2 className="text-center mb-6 text-[20px] sm:text-[22px] font-bold text-[var(--text)] tracking-tight transition-colors">
          Teacher Login
        </h2>

        {error && (
          <p className="bg-[var(--danger-light)] text-[var(--danger)] text-[13px] p-2.5 rounded-lg text-center mb-3 border border-red-500/20">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full py-2.5 px-3.5 text-sm border-[1.5px] border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full py-2.5 px-3.5 text-sm border-[1.5px] border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
            required
          />

          <button
            type="submit"
            className="mt-1 py-3 px-4 bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white border-0 rounded-lg text-[15px] font-semibold cursor-pointer transition-all duration-200 tracking-wide shadow-[0_4px_14px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] active:translate-y-0"
          >
            Login
          </button>
        </form>

        <div className="text-center text-[13.5px] mt-4.5 text-[var(--subtext)] transition-colors">
          Not registered?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-[var(--primary)] cursor-pointer font-semibold transition-all hover:underline ml-1"
          >
            Register here
          </span>
        </div>
      </div>
    </div>
  );
}

export default Login;