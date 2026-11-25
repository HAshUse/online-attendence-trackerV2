import { Navigate, Outlet, useLocation } from "react-router-dom";

function AdminProtectedRoute() {
  const token = localStorage.getItem("adminToken");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default AdminProtectedRoute;
