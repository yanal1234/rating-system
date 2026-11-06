import { useNavigate } from "react-router-dom";
import { LogOut, UserRound, ShieldCheck } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";
import "./Navbar.css";

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

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "42";

  return (
    <header className="main-navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">42</span>
        <span className="navbar-title">Rating System</span>
      </div>

      <div className="navbar-user">
        <div className="navbar-user-info">
          <div className="navbar-user-avatar">{initials}</div>

          <div className="navbar-user-details">
            <span className="navbar-username">{user?.username || "User"}</span>

            <span className="navbar-user-role">
              {user?.role === "staff" ? (
                <>
                  <ShieldCheck size={12} />
                  Staff
                </>
              ) : (
                <>
                  <UserRound size={12} />
                  Student
                </>
              )}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="navbar-logout"
          onClick={handleLogout}
          title="Logout"
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
