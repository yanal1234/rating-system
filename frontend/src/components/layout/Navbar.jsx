import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";
import "./Navbar.css";
import logo from "../../assets/42-logo.svg";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully.");
      navigate("/login", { replace: true });
    } catch {
      toast.error("Logout failed. Please try again.");
    }
  };

  const username = user?.username || "Staff";
  const initials = username.slice(0, 2).toUpperCase();
  const avatar = user?.avatar || user?.avatar_url;

  return (
    <header className="main-navbar staff-navbar">
      <div className="navbar-brand">
        <img src={logo} alt="42 Logo" className="navbar-logo" />
        <span className="navbar-title">Rating System</span>
      </div>

      <div className="staff-navbar-actions">
        <div className="staff-account">
          <div className="staff-avatar">
            {avatar ? (
              <img src={avatar} alt="Staff profile" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="staff-account-details">
            <span className="staff-account-name">{username}</span>
            <span className="staff-account-role">Staff Account</span>
          </div>
        </div>

        <div className="staff-navbar-divider" />

        <button
          type="button"
          className="navbar-logout"
          onClick={handleLogout}
          title="Logout"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
