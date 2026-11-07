import { NavLink } from "react-router-dom";
import "./Sidebar.css";

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);

const icons = {
  overview: "M13 9V3h8v6h-8ZM3 13V3h8v10H3Zm10 8V11h8v10h-8ZM3 21v-6h8v6H3Z",

  abuse:
    "M3 18v-2h18v2H3Zm5-5L3 8l1.4-1.4L9.4 11.6 8 13Zm6-5-5-5 1.4-1.4 5 5L14 8Zm5.6 9.4L8.1 6 9.5 4.6 21 16l-1.4 1.4Z",

  ratings:
    "m12 17.3 4.4 3.3-1.7-5.5L19 11.8h-5.4L12 6.4l-1.6 5.4H5l4.3 3.3-1.7 5.5L12 17.3ZM8.5 22l2.2-7.3L5 10.4h7L12 3l2 7.4h7l-5.7 4.3L17.5 22 12 17.8 8.5 22Z",

  people:
    "M1 20v-2.8c0-.6.2-1.1.5-1.6.3-.5.7-.8 1.2-1 1-.5 2.1-.9 3.2-1.2C7 13.1 8.1 13 9.2 13s2.2.1 3.3.4c1.1.3 2.2.7 3.2 1.2.5.3.9.6 1.2 1 .3.5.4 1 .4 1.6V20H1Zm8.2-8c-1.1 0-2-.4-2.8-1.2C5.6 10 5.2 9.1 5.2 8s.4-2 1.2-2.8C7.2 4.4 8.1 4 9.2 4s2 .4 2.8 1.2c.8.8 1.2 1.7 1.2 2.8s-.4 2-1.2 2.8c-.8.8-1.7 1.2-2.8 1.2Z",

  clock:
    "M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10Zm0-2c4.4 0 8-3.6 8-8s-3.6-8-8-8-8 3.6-8 8 3.6 8 8 8Zm3.3-3.7L11 12V7h2v4.2l3.7 3.7-1.4 1.4Z",

  label:
    "M5 21c-.6 0-1-.2-1.4-.6C3.2 20 3 19.6 3 19V5c0-.6.2-1 .6-1.4C4 3.2 4.4 3 5 3h11c.3 0 .6.1.9.2.3.1.5.3.7.6L22 12l-4.4 8.2c-.2.3-.4.5-.7.6-.3.1-.6.2-.9.2H5Z",

  download:
    "m12 16-5-5 1.4-1.4L11 12.2V4h2v8.2l2.6-2.6L17 11l-5 5Zm-6 5c-.6 0-1-.2-1.4-.6C4.2 20 4 19.6 4 19v-3h2v3h12v-3h2v3c0 .6-.2 1-.6 1.4-.4.4-.8.6-1.4.6H6Z",

  history:
    "M12 21c-2.3 0-4.3-.8-6-2.3S3.3 15.3 3 13h2c.3 1.7 1 3.1 2.3 4.2C8.6 18.3 10.2 19 12 19c2 0 3.7-.7 5.1-2.1 1.4-1.4 2.1-3.1 2.1-5.1s-.7-3.7-2.1-5.1C15.7 5.3 14 4.6 12 4.6c-1.1 0-2.2.3-3.2.8-1 .5-1.8 1.3-2.5 2.2H9v2H3v-6h2v2.3c.8-1 1.9-1.9 3.1-2.5C9.3 2.8 10.6 2.5 12 2.5c1.3 0 2.5.2 3.6.7 1.1.5 2.1 1.1 2.9 1.9.8.8 1.5 1.8 1.9 2.9.5 1.1.7 2.3.7 3.5s-.2 2.4-.7 3.5c-.5 1.1-1.1 2.1-1.9 2.9-.8.8-1.8 1.5-2.9 1.9-1.1.5-2.3.7-3.6.7Zm2.8-4.8L11 12.4V7h2v4.6l3.2 3.2-1.4 1.4Z",

  analytics:
    "M3 3h2v16h16v2H3V3Zm5 12 3.5-4.5 3 2.5L19 7l1.5 1.3-5.8 7.1-3-2.5L9.5 17 8 15Z",

  terminal:
    "M4 22c-.5 0-1-.2-1.4-.6C2.2 21 2 20.5 2 20V6c0-.5.2-1 .6-1.4C3 4.2 3.5 4 4 4h16c.5 0 1 .2 1.4.6.4.4.6.9.6 1.4v14c0 .5-.2 1-.6 1.4-.4.4-.9.6-1.4.6H4Zm0-2h16V8H4v12Zm3.5-1.5-1-1 2.3-2.3-2.3-2.3 1-1 3.3 3.3-3.3 3.3ZM12 18v-1.5h6V18h-6Z",

  shield:
    "M12 22C9.5 21.4 7.4 20 5.8 17.8 4.2 15.6 3.5 13.1 3.5 10.5V5l8.5-3 8.5 3v5.5c0 2.6-.7 5.1-2.3 7.3C16.6 20 14.5 21.4 12 22Zm0-2.2c1.8-.6 3.3-1.8 4.5-3.5 1.2-1.8 1.8-3.7 1.8-5.8V6.4L12 4.1 5.7 6.4v3.9c0 2.1.6 4 1.8 5.8 1.2 1.7 2.7 2.9 4.5 3.7Z",

  lock: "M6 22c-.6 0-1-.2-1.4-.6C4.2 21 4 20.5 4 20V10c0-.6.2-1 .6-1.4C5 8.2 5.4 8 6 8h1V6c0-1.4.5-2.6 1.5-3.5S10.6 1 12 1s2.6.5 3.5 1.5S17 4.6 17 6v2h1c.6 0 1 .2 1.4.6.4.4.6.8.6 1.4v10c0 .6-.2 1-.6 1.4-.4.4-.8.6-1.4.6H6Zm3-14h6V6c0-.8-.3-1.5-.9-2.1C13.5 3.3 12.8 3 12 3s-1.5.3-2.1.9C9.3 4.5 9 5.2 9 6v2Z",
};

const sections = [
  {
    label: "REVIEW",
    items: [
      {
        id: "overview",
        text: "Overview",
        path: "/staff/dashboard",
        icon: "overview",
      },
      {
        id: "abuse",
        text: "Abuse Center",
        path: "/staff/suspicious-activities",
        icon: "abuse",
        badge: "●",
      },
      {
        id: "ratings",
        text: "Ratings",
        path: "/staff/ratings",
        icon: "ratings",
      },
      {
        id: "participants",
        text: "Participants",
        path: "/staff/students",
        icon: "people",
      },
    ],
  },
  {
    label: "CONFIGURE",
    items: [
      {
        id: "voting",
        text: "Voting window",
        path: "/staff/windows",
        icon: "clock",
      },
      { id: "labels", text: "Labels", path: "/staff/labels", icon: "label" },
    ],
  },
  {
    label: "RECORDS",
    items: [
      {
        id: "analytics",
        text: "Analytics",
        path: "/staff/analytics",
        icon: "analytics",
      },
      {
        id: "audit",
        text: "Audit log",
        path: "/staff/audit-logs",
        icon: "history",
      },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="sb">
      <header className="sb-header">
        <div>
          <div className="sb-title">42 Amman</div>
          <div className="sb-sub">STAFF MODERATION</div>
        </div>

        <span className="sb-shield">
          <Icon d={icons.shield} />
        </span>
      </header>

      <nav className="sb-nav">
        {sections.map((section) => (
          <div className="sb-section" key={section.label}>
            <div className="sb-label">{section.label}</div>

            {section.items.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end
                className={({ isActive }) => `sb-item ${isActive ? "on" : ""}`}
              >
                <Icon d={icons[item.icon]} />
                <span>{item.text}</span>

                {item.badge && <span className="sb-badge">{item.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sb-box">
          <Icon d={icons.terminal} />
          <span>Terminal Override</span>
        </div>
      </nav>

      <footer className="sb-footer">
        <span className="sb-lock">
          <Icon d={icons.lock} />
        </span>

        <p>
          Staff only.
          <br />
          Access is logged.
        </p>
      </footer>
    </aside>
  );
}
