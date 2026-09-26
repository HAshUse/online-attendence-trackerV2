import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Register.css";
import API from "../services/api";
import { Link } from "react-router-dom";
function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleChange = (e) => {
    setError("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

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
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h2>Teacher Register</h2>

        {error && <div style={{ color: "#ef4444", marginBottom: "12px", fontSize: "14px", fontWeight: "600" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <button type="submit">Create Account</button>
        </form>

        <div className="register-footer">
          Already have an account? <Link to={`/`}>login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
