import axios from "axios";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    (isLocal
      ? "http://localhost:5000/api"
      : "https://online-attendence-tracker-1.onrender.com/api")
});

// 🔐 Attach token to EVERY request
API.interceptors.request.use(
  (req) => {
    const token = localStorage.getItem("token");
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
  },
  (error) => Promise.reject(error)
);

export default API; 
