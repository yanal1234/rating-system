import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ProtectedRoute from "./ProtectedRoute";
import Loader from "../components/common/Loader";

import StudentLayout from "../layouts/student/StudentLayout";
import StaffLayout from "../layouts/staff/StaffLayout";

import Login from "../pages/auth/Login";

import StudentDashboard from "../pages/student/StudentDashboard";
import RateStudents from "../pages/student/RateStudents";
import FinalReview from "../pages/student/FinalReview";
import MyRatings from "../pages/student/MyRatings";
import StudentProfile from "../pages/student/StudentProfile";

import StaffDashboard from "../pages/staff/StaffDashboard";
import ManageStudents from "../pages/staff/ManageStudents";
import ManageWindows from "../pages/staff/ManageWindows";
import ManageRatings from "../pages/staff/ManageRatings";
import ManageLabels from "../pages/staff/ManageLabels";
import SuspiciousActivities from "../pages/staff/SuspiciousActivities";
import Analytics from "../pages/staff/Analytics";
import AuditLogs from "../pages/staff/AuditLogs";
import EditProfile from "../pages/student/EditProfile";

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen />;
  }

  const homePage = user
    ? user.role === "staff"
      ? "/staff/dashboard"
      : "/student/dashboard"
    : "/login";

  return (
    <Routes>
      {/* Authentication */}
      <Route
        path="/login"
        element={user ? <Navigate to={homePage} replace /> : <Login />}
      />

      {/* Student Routes */}
      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<Navigate to="/student/dashboard" replace />} />

          <Route path="dashboard" element={<StudentDashboard />} />

          <Route path="rate-students" element={<RateStudents />} />

          <Route path="rate/review" element={<FinalReview />} />

          <Route path="my-ratings" element={<MyRatings />} />

          <Route path="profile" element={<StudentProfile />} />
          <Route path="edit-profile" element={<EditProfile />} />
        </Route>
      </Route>

      {/* Staff Routes */}
      <Route element={<ProtectedRoute allowedRoles={["staff"]} />}>
        <Route path="/staff" element={<StaffLayout />}>
          <Route index element={<Navigate to="/staff/dashboard" replace />} />

          <Route path="dashboard" element={<StaffDashboard />} />

          <Route path="students" element={<ManageStudents />} />

          <Route path="windows" element={<ManageWindows />} />

          <Route path="ratings" element={<ManageRatings />} />

          <Route path="labels" element={<ManageLabels />} />

          <Route
            path="suspicious-activities"
            element={<SuspiciousActivities />}
          />

          <Route path="analytics" element={<Analytics />} />

          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>
      </Route>

      {/* Default Routes */}
      <Route path="/" element={<Navigate to={homePage} replace />} />

      <Route path="*" element={<Navigate to={homePage} replace />} />
    </Routes>
  );
};

export default AppRoutes;
