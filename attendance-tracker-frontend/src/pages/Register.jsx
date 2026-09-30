import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setError("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/teachers/register", {
        name: form.name,
        email: form.email,
        password: form.password
      });

      // 🔑 Direct login: Save token and teacher to localStorage
      if (res.data.token && res.data.teacher) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("teacher", JSON.stringify(res.data.teacher));
        navigate("/branches");
      } else {
        alert("Registration successful. Please login.");
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-[var(--bg)] p-6 transition-colors duration-200 relative overflow-hidden before:content-[''] before:fixed before:-top-[120px] before:-left-[120px] before:w-[400px] before:h-[400px] before:bg-[radial-gradient(circle,rgba(99,102,241,0.15),transparent_70%)] before:rounded-full before:pointer-events-none before:z-0 after:content-[''] after:fixed after:-bottom-[100px] after:-right-[100px] after:w-[350px] after:h-[350px] after:bg-[radial-gradient(circle,rgba(167,139,250,0.1),transparent_70%)] after:rounded-full after:pointer-events-none after:z-0">
      <div className="bg-[var(--card)] p-7 sm:p-9 w-full max-w-[420px] rounded-3xl border border-[var(--border)] shadow-[var(--shadow-lg)] relative z-10 transition-all duration-200">
        <h2 className="text-center mb-6 text-[20px] sm:text-[22px] font-bold text-[var(--text)] tracking-tight transition-colors">
          Teacher Register
        </h2>

        {error && (
          <div className="bg-[var(--danger-light)] text-[var(--danger)] text-[13px] p-2.5 rounded-lg text-center mb-3 border border-red-500/20 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <input
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            className="w-full py-2.5 px-3.5 text-sm border-[1.5px] border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
            required
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full py-2.5 px-3.5 text-sm border-[1.5px] border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full py-2.5 px-3.5 text-sm border-[1.5px] border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
            required
          />

          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="w-full py-2.5 px-3.5 text-sm border-[1.5px] border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary-light)]"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className={`mt-1.5 py-3 px-4 bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white border-0 rounded-lg text-[15px] font-semibold transition-all duration-200 tracking-wide shadow-[0_4px_14px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(99,102,241,0.45)] active:scale-[0.98] ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="text-center text-[13.5px] mt-4.5 text-[var(--subtext)] transition-colors">
          Already have an account?{" "}
          <Link to="/" className="text-[var(--primary)] font-semibold transition-all hover:underline ml-1">
            login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;

