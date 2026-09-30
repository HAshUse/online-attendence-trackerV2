import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateClass from "./pages/CreateClass";
import ClassAttendance from "./pages/ClassAttendance";
import JoinClass from "./pages/JoinClass";
import OverallAttendance from "./pages/OverallAttendance";
import EditClass from "./pages/EditClass";
import TeacherLayout from "./layout/TeacherLayout";
import BranchDashboard from "./pages/BranchDashboard";
import Branches from "./pages/Branches";
import Colleges from "./pages/Colleges";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES (NO NAVBAR) */}
        <Route path="/join/:classCode" element={<JoinClass />} />

        {/* TEACHER LAYOUT (WITH NAVBAR) */}
        <Route element={<TeacherLayout />}>
          {/* Public Auth Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Teacher Dashboard Routes (Requires Login) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/branches" element={<Branches />} />
            <Route path="/dashboard" element={<Navigate to="/branches" replace />} />
            <Route path="/dashboard/:branchId" element={<Dashboard />} />
            <Route path="/branch/:branchId" element={<BranchDashboard />} />
            <Route path="/create-class/:branchId" element={<CreateClass />} />
            <Route path="/class/:id" element={<ClassAttendance />} />
            <Route path="/overall-attendance/:branchId" element={<OverallAttendance />} />
            <Route path="/edit-class/:id" element={<EditClass />} />
            <Route path="/colleges" element={<Colleges />} />
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
