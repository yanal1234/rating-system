import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/common/Loader";

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  // Wait until authentication check finishes
  if (loading) {
    return <Loader fullScreen />;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check whether the user has permission
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const correctDashboard =
      user.role === "staff" ? "/staff/dashboard" : "/student/dashboard";

    return <Navigate to={correctDashboard} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
