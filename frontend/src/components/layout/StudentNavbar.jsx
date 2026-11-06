import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import "./StudentNavbar.css";
import logo from "../../assets/42-logo.svg";

const StudentNavbar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="student-navbar">
      <Link to="/student/dashboard" className="student-navbar-brand">
        <img src={logo} alt="42" className="student-navbar-logo" />
        <span className="student-navbar-title">Rating System</span>
      </Link>

      <button
        type="button"
        className="student-navbar-logout"
        onClick={handleLogout}
      >
        <LogOut size={15} />
        <span>Log out</span>
      </button>
    </header>
  );
};

export default StudentNavbar;
