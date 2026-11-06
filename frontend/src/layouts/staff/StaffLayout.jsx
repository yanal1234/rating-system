import { Outlet } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";

const StaffLayout = () => {
  return (
    <div className="staff-layout">
      <Navbar />

      <div className="staff-layout-body">
        <Sidebar />

        <main className="staff-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;
