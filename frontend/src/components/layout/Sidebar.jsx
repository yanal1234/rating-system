import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Star,
  ClipboardList,
  UserRound,
  CalendarDays,
  Tags,
  ShieldAlert,
  ChartNoAxesCombined,
  FileClock,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import "./Sidebar.css";

const studentLinks = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", path: "/student/dashboard", icon: LayoutDashboard },
      { label: "Rate Students", path: "/student/rate-students", icon: Star },
      { label: "My Ratings", path: "/student/my-ratings", icon: ClipboardList },
      { label: "My Profile", path: "/student/profile", icon: UserRound },
    ],
  },
];

const staffLinks = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Students", path: "/staff/students", icon: Users },
      { label: "Voting Windows", path: "/staff/windows", icon: CalendarDays },
      { label: "Ratings", path: "/staff/ratings", icon: Star },
      { label: "Labels", path: "/staff/labels", icon: Tags },
    ],
  },
  {
    title: "Monitoring",
    items: [
      {
        label: "Suspicious Activities",
        path: "/staff/suspicious-activities",
        icon: ShieldAlert,
      },
      {
        label: "Analytics",
        path: "/staff/analytics",
        icon: ChartNoAxesCombined,
      },
      { label: "Audit Logs", path: "/staff/audit-logs", icon: FileClock },
    ],
  },
];

const Sidebar = () => {
  const { user, isStaff } = useAuth();
  const sections = isStaff ? staffLinks : studentLinks;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {user?.username?.charAt(0)?.toUpperCase() || "U"}
        </div>

        <div className="sidebar-user-info">
          <span className="sidebar-username">{user?.username || "User"}</span>
          <span className="sidebar-role">
            {isStaff ? "Staff Account" : "Student Account"}
          </span>
        </div>
      </div>

      <nav className="sidebar-navigation">
        {sections.map((section) => (
          <div className="sidebar-section" key={section.title}>
            <p className="sidebar-section-title">{section.title}</p>

            <div className="sidebar-links">
              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? "active" : ""}`
                    }
                  >
                    <Icon size={19} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-logo">42</span>
        <span>Peer Rating System</span>
      </div>
    </aside>
  );
};

export default Sidebar;
