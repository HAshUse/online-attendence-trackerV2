import { Outlet } from "react-router-dom";
import Navbar from "../pages/Navbar";
import { ThemeProvider } from "../context/ThemeContext";

function TeacherLayout() {
  return (
    <ThemeProvider>
      <Navbar />
      <Outlet />
    </ThemeProvider>
  );
}

export default TeacherLayout;
