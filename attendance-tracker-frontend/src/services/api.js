import axios from "axios";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    (isLocal
      ? "http://localhost:5000/api"
      : "https://attendance-tracker-backend-469h.onrender.com/api")
});

// 🔐 Attach token to EVERY request (adminToken for /admin/*, teacher token otherwise)
API.interceptors.request.use(
  (req) => {
    const isAdminReq = req.url?.startsWith("/admin");
    const token = localStorage.getItem(isAdminReq ? "adminToken" : "token");
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
        // If this is a Google OAuth error (not a JWT/session error), don't log the user out.
        // The backend sets isGoogleAuthError: true for Google permission failures.
        const isGoogleAuthError = error.response.data?.isGoogleAuthError === true;
        const isAdminReq = error.config?.url?.startsWith("/admin");

        if (isAdminReq) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          window.dispatchEvent(new Event("adminAuthChange"));
        } else if (!isGoogleAuthError) {
          // Only wipe session and redirect for real JWT expiry / missing token
          localStorage.removeItem("token");
          localStorage.removeItem("teacher");
          localStorage.removeItem("googleStatus");
          window.dispatchEvent(new Event("authChange")); // Navbar listens → redirects to login
        }

        const isAuthMsg =
          !rawMsg ||
          rawMsg === "No token provided" ||
          rawMsg === "Invalid token" ||
          rawMsg === "Teacher not found" ||
          rawMsg.toLowerCase().includes("token") ||
          rawMsg.toLowerCase().includes("jwt") ||
          rawMsg.toLowerCase().includes("unauthorized") ||
          (rawMsg.toLowerCase().includes("auth") && !isGoogleAuthError);

        if (isAuthMsg && !isGoogleAuthError) {
          rawMsg = "Your session has expired. Please log in again to continue.";
        }
      } else if (status === 403) {
        if (!rawMsg || rawMsg === "Not allowed" || rawMsg === "Not authorized") {
          rawMsg = "You do not have permission to perform this action.";
        }
      } else if (status === 404) {
        if (!rawMsg) {
          rawMsg = "Endpoint not found (404). If you just added a feature, please restart your backend server.";
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
