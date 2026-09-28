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

// 🔄 Intercept responses to handle authentication & sanitize error messages
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      let rawMsg = error.response.data?.message || "";

      // 401 Unauthorized / Token Expiration
      if (status === 401) {
        // Clear invalid auth data
        localStorage.removeItem("token");
        localStorage.removeItem("teacher");
        window.dispatchEvent(new Event("authChange"));

        const isAuthMsg =
          !rawMsg ||
          rawMsg === "No token provided" ||
          rawMsg === "Invalid token" ||
          rawMsg === "Teacher not found" ||
          rawMsg.toLowerCase().includes("token") ||
          rawMsg.toLowerCase().includes("jwt") ||
          rawMsg.toLowerCase().includes("unauthorized") ||
          rawMsg.toLowerCase().includes("auth");

        if (isAuthMsg) {
          rawMsg = "Your session has expired. Please log in again to continue.";
        }
      } else if (status === 403) {
        if (!rawMsg || rawMsg === "Not allowed" || rawMsg === "Not authorized") {
          rawMsg = "You do not have permission to perform this action.";
        }
      } else if (status === 404) {
        if (!rawMsg) {
          rawMsg = "The requested resource was not found.";
        }
      } else if (status >= 500) {
        if (!rawMsg || rawMsg.length > 150) {
          rawMsg = "Server encountered an error. Please try again in a few moments.";
        }
      }

      if (!error.response.data || typeof error.response.data !== "object") {
        error.response.data = {};
      }
      error.response.data.message = rawMsg;
    } else if (error.request) {
      // Network failure / Server unreachable
      const networkMsg = "Unable to connect to the server. Please check your internet connection.";
      error.message = networkMsg;
      if (!error.response) {
        error.response = { data: { message: networkMsg }, status: 0 };
      }
    }

    return Promise.reject(error);
  }
);

export default API;
