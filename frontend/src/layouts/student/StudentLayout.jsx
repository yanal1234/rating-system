import { Outlet } from "react-router-dom";
import StudentNavbar from "../../components/layout/StudentNavbar";
import "./StudentLayout.css";

const StudentLayout = () => {
  return (
    <div className="student-layout">
      <StudentNavbar />

      <main className="student-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
