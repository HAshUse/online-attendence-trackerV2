import { Navigate, Outlet, useLocation } from "react-router-dom";

function ProtectedRoute() {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    // Redirect to login page if token is missing
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
