import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  Eye,
  ShieldAlert,
  Clock3,
  CheckCircle2,
  Activity,
  Filter,
  X,
  UserRound,
  CalendarDays,
  Hash,
  ChevronLeft,
  ChevronRight,
  Star,
  Fingerprint,
  FileText,
  ChevronDown,
} from "lucide-react";

import api from "../../services/api";
import "./SuspiciousActivities.css";

const PAGE_SIZE = 8;

const severityConfig = {
  critical: { label: "Critical", className: "critical" },
  high: { label: "High", className: "high" },
  medium: { label: "Medium", className: "medium" },
  low: { label: "Low", className: "low" },
};

const statusConfig = {
  pending: { label: "Pending", className: "pending" },
  under_review: { label: "Under Review", className: "review" },
  reviewed: { label: "Reviewed", className: "reviewed" },
  dismissed: { label: "Dismissed", className: "dismissed" },
  confirmed_abuse: { label: "Confirmed Abuse", className: "confirmed" },
  confirmed: { label: "Confirmed", className: "confirmed" },
};

const activityLabels = {
  group_voting: "Group Voting",
  extreme_voting: "Extreme Voting",
  repeated_targeting: "Repeated Targeting",
  group_retaliation: "Group Retaliation",
  rating_coordination: "Rating Coordination",
  historical_behavior: "Historical Behavior",
  rating_anomaly: "Rating Anomaly",
  flag_abuse: "Flag Abuse",
  closed_clique: "Closed Clique",
};

const getStatus = (status) => {
  const key = String(status || "pending").toLowerCase();

  return (
    statusConfig[key] || {
      label: key.replaceAll("_", " "),
      className: "pending",
    }
  );
};

const getSeverity = (severity) => {
  const key = String(severity || "medium").toLowerCase();
  return severityConfig[key] || severityConfig.medium;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const parseDetails = (details) => {
  if (!details) return {};
  if (typeof details === "object") return details;

  try {
    return JSON.parse(details);
  } catch {
    return { raw_details: details };
  }
};

const normalizeActivity = (item) => ({
  ...item,
  activity_id: item.activity_id ?? item.id,
  user_id: item.user_id ?? item.userId,
  related_user_id: item.related_user_id ?? item.target_user_id,
  window_id:
    item.window_id ??
    item.voting_window_id ??
    item.window?.window_id ??
    item.window?.id ??
    null,
  activity_type: item.activity_type ?? "unknown",
  severity: item.severity ?? "medium",
  status: item.status ?? "pending",
  description: item.description ?? "No description provided.",
  details: parseDetails(item.details),
  username:
    item.username ??
    item.user_name ??
    item.actor_username ??
    item.user?.username ??
    null,
  related_username:
    item.related_username ??
    item.related_user_name ??
    item.target_username ??
    item.related_user?.username ??
    null,
  window_name:
    item.window_name ??
    item.window_title ??
    item.window?.title ??
    item.window?.name ??
    null,
  rating_stars: item.stars ?? item.rating_stars ?? item.rating?.stars ?? null,
  created_at: item.created_at ?? item.detected_at,
});

const normalizeWindow = (item) => ({
  ...item,
  id: item.window_id ?? item.id,
  name:
    item.window_name ??
    item.title ??
    item.name ??
    `Window #${item.window_id ?? item.id}`,
});

const getActivityName = (type) =>
  activityLabels[type] ||
  String(type || "Unknown Activity").replaceAll("_", " ");

const getDisplayName = (name, id) => {
  if (name) return name;
  return id ? `User #${id}` : "Unknown user";
};

const csvValue = (value) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

function downloadCSV(rows) {
  const columns = [
    ["Activity ID", "activity_id"],
    ["Activity Type", "activity_type"],
    ["User ID", "user_id"],
    ["Username", "username"],
    ["Related User ID", "related_user_id"],
    ["Related Username", "related_username"],
    ["Window ID", "window_id"],
    ["Window Name", "window_name"],
    ["Rating ID", "rating_id"],
    ["Severity", "severity"],
    ["Status", "status"],
    ["Description", "description"],
    ["Detected At", "created_at"],
  ];

  const header = columns.map(([label]) => csvValue(label)).join(",");

  const body = rows.map((item) =>
    columns
      .map(([, key]) => {
        let value = item[key];

        if (key === "activity_type") value = getActivityName(value);
        if (key === "created_at") value = formatDate(value);
        if (key === "status") value = getStatus(value).label;

        return csvValue(value);
      })
      .join(","),
  );

  const csv = "\uFEFF" + [header, ...body].join("\n");
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `suspicious-activities-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className={`sa-stat-card ${tone || ""}`}>
      <div className="sa-stat-top">
        <span>{label}</span>

        <div className="sa-stat-icon">
          <Icon size={17} />
        </div>
      </div>

      <strong>{value}</strong>
    </div>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="sa-detail-row">
      <div className="sa-detail-label">
        <Icon size={15} />
        <span>{label}</span>
      </div>

      <div className="sa-detail-value">{children || "—"}</div>
    </div>
  );
}

function DetailsModal({ activity, onClose }) {
  if (!activity) return null;

  const details = activity.details || {};
  const detailEntries = Object.entries(details);
  const severity = getSeverity(activity.severity);
  const status = getStatus(activity.status);

  return (
    <div className="sa-modal-overlay" onClick={onClose}>
      <div className="sa-modal" onClick={(event) => event.stopPropagation()}>
        <div className="sa-modal-header">
          <div>
            <span className="sa-modal-eyebrow">ACTIVITY DETAILS</span>

            <h2>{getActivityName(activity.activity_type)}</h2>

            <p>Activity #{activity.activity_id ?? "—"}</p>
          </div>

          <button
            type="button"
            className="sa-icon-button"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={19} />
          </button>
        </div>

        <div className="sa-modal-body">
          <div className="sa-detail-badges">
            <span className={`sa-severity ${severity.className}`}>
              <span />
              {severity.label} Severity
            </span>

            <span className={`sa-status ${status.className}`}>
              {status.label}
            </span>
          </div>

          <div className="sa-details-grid">
            <DetailRow icon={UserRound} label="User">
              {getDisplayName(activity.username, activity.user_id)}
            </DetailRow>

            <DetailRow icon={UserRound} label="Related User">
              {getDisplayName(
                activity.related_username,
                activity.related_user_id,
              )}
            </DetailRow>

            <DetailRow icon={CalendarDays} label="Voting Window">
              {activity.window_name ||
                (activity.window_id ? `Window #${activity.window_id}` : "—")}
            </DetailRow>

            <DetailRow icon={Hash} label="Rating ID">
              {activity.rating_id || "—"}
            </DetailRow>

            <DetailRow icon={Clock3} label="Detected At">
              {formatDate(activity.created_at)}
            </DetailRow>

            <DetailRow icon={Star} label="Rating">
              {activity.rating_stars ? (
                <span className="sa-rating-stars">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Star
                      key={index}
                      size={14}
                      fill={
                        index < Number(activity.rating_stars)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  ))}
                  <span>{activity.rating_stars}/3</span>
                </span>
              ) : (
                "—"
              )}
            </DetailRow>
          </div>

          <div className="sa-description-box">
            <div className="sa-description-title">
              <FileText size={15} />
              Detection Description
            </div>

            <p>{activity.description}</p>
          </div>

          <div className="sa-evidence-section">
            <div className="sa-description-title">
              <Fingerprint size={16} />
              Detection Evidence
            </div>

            {detailEntries.length > 0 ? (
              <div className="sa-evidence-list">
                {detailEntries.map(([key, value]) => (
                  <div className="sa-evidence-item" key={key}>
                    <span>{key.replaceAll("_", " ")}</span>

                    <strong>
                      {typeof value === "object"
                        ? JSON.stringify(value, null, 2)
                        : String(value ?? "—")}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sa-no-evidence">
                No additional evidence was stored for this activity.
              </div>
            )}
          </div>
        </div>

        <div className="sa-modal-footer">
          <button
            type="button"
            className="sa-secondary-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuspiciousActivities() {
  const [activities, setActivities] = useState([]);
  const [windows, setWindows] = useState([]);

  const [selectedWindow, setSelectedWindow] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [windowsError, setWindowsError] = useState("");

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const fetchWindows = useCallback(async () => {
    try {
      setWindowsError("");

      const response = await api.get("/voting-windows");
      const payload = response.data;

      const rows = Array.isArray(payload)
        ? payload
        : (payload?.windows ??
          payload?.votingWindows ??
          payload?.data?.windows ??
          payload?.data ??
          []);

      if (!Array.isArray(rows)) {
        throw new Error("Unexpected voting windows response.");
      }

      setWindows(rows.map(normalizeWindow).filter((item) => item.id != null));
    } catch (err) {
      console.error("Failed to load voting windows:", err);

      setWindowsError(
        err.response?.data?.message || "Could not load voting windows.",
      );
    }
  }, []);

  const fetchActivities = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const response = await api.get("/suspicious-activities", {
        params: {
          page: 1,
          limit: 500,
        },
      });

      const payload = response.data;

      const rows = Array.isArray(payload)
        ? payload
        : (payload?.activities ??
          payload?.suspiciousActivities ??
          payload?.data?.activities ??
          payload?.data ??
          []);

      if (!Array.isArray(rows)) {
        throw new Error("Unexpected activities response from server.");
      }

      setActivities(rows.map(normalizeActivity));
    } catch (err) {
      console.error("Failed to load suspicious activities:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load suspicious activities.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    await Promise.all([fetchActivities(true), fetchWindows()]);
  };

  useEffect(() => {
    fetchActivities();
    fetchWindows();
  }, [fetchActivities, fetchWindows]);

  const windowActivities = useMemo(() => {
    if (selectedWindow === "all") return activities;

    return activities.filter(
      (item) => String(item.window_id) === String(selectedWindow),
    );
  }, [activities, selectedWindow]);

  const stats = useMemo(() => {
    return {
      total: windowActivities.length,

      pending: windowActivities.filter(
        (item) => String(item.status).toLowerCase() === "pending",
      ).length,

      critical: windowActivities.filter((item) =>
        ["critical", "high"].includes(String(item.severity).toLowerCase()),
      ).length,

      confirmed: windowActivities.filter((item) =>
        ["confirmed", "confirmed_abuse"].includes(
          String(item.status).toLowerCase(),
        ),
      ).length,
    };
  }, [windowActivities]);

  const activityTypes = useMemo(
    () =>
      [...new Set(windowActivities.map((item) => item.activity_type))].sort(),
    [windowActivities],
  );

  const filteredActivities = useMemo(() => {
    const term = search.trim().toLowerCase();

    return windowActivities.filter((item) => {
      const matchesSearch =
        !term ||
        [
          item.activity_id,
          item.username,
          item.related_username,
          item.user_id,
          item.related_user_id,
          item.activity_type,
          item.description,
          item.window_name,
          item.rating_id,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesSeverity =
        severityFilter === "all" ||
        String(item.severity).toLowerCase() === severityFilter;

      const matchesStatus =
        statusFilter === "all" ||
        String(item.status).toLowerCase() === statusFilter;

      const matchesType =
        typeFilter === "all" || item.activity_type === typeFilter;

      return matchesSearch && matchesSeverity && matchesStatus && matchesType;
    });
  }, [windowActivities, search, severityFilter, statusFilter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredActivities.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const visibleActivities = filteredActivities.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, severityFilter, statusFilter, typeFilter, selectedWindow]);

  const handleExport = () => {
    if (!filteredActivities.length) return;
    downloadCSV(filteredActivities);
  };

  const selectedWindowName =
    selectedWindow === "all"
      ? "All Voting Windows"
      : windows.find((item) => String(item.id) === String(selectedWindow))
          ?.name || "Selected Window";

  return (
    <div className="suspicious-page">
      <div className="content-path">
        <span>STAFF PANEL</span>
        <span>/</span>
        <span>SECURITY</span>
      </div>

      <div className="overview-header-row sa-page-heading">
        <div>
          <h1>Suspicious Activities</h1>
          <p>Review activities flagged by the detection system.</p>
        </div>

        <div className="header-actions sa-header-actions">
          <div className="sa-window-select-wrap">
            <CalendarDays size={15} />

            <select
              value={selectedWindow}
              onChange={(event) => setSelectedWindow(event.target.value)}
              aria-label="Select voting window"
            >
              <option value="all">All Voting Windows</option>

              {windows.map((window) => (
                <option key={window.id} value={String(window.id)}>
                  {window.name}
                </option>
              ))}
            </select>

            <ChevronDown size={14} />
          </div>

          <button
            type="button"
            className="btn-export"
            onClick={handleExport}
            disabled={loading || filteredActivities.length === 0}
            title="Download filtered activities as CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="refresh-dashboard"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Refresh data"
            aria-label="Refresh data"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "refresh-spinning" : ""}
            />
          </button>
        </div>
      </div>

      {windowsError && (
        <div className="sa-window-warning">
          <AlertTriangle size={14} />
          {windowsError}
        </div>
      )}

      <div className="sa-selected-window">
        <CalendarDays size={15} />

        <span>Viewing:</span>

        <strong>{selectedWindowName}</strong>

        <span className="sa-window-count">
          {windowActivities.length} activities
        </span>
      </div>

      <div className="metrics-grid sa-stats-grid">
        <StatCard
          icon={Activity}
          label="Total Activities"
          value={stats.total}
          tone="cyan"
        />

        <StatCard
          icon={Clock3}
          label="Pending Review"
          value={stats.pending}
          tone="orange"
        />

        <StatCard
          icon={ShieldAlert}
          label="High Risk"
          value={stats.critical}
          tone="red"
        />

        <StatCard
          icon={CheckCircle2}
          label="Confirmed Abuse"
          value={stats.confirmed}
          tone="purple"
        />
      </div>

      <section className="sa-content-card">
        <div className="sa-content-header">
          <div>
            <h2>Detection Log</h2>
            <p>
              Activities identified by the suspicious behavior detection system.
            </p>
          </div>

          <span className="sa-record-count">
            {filteredActivities.length} RECORDS
          </span>
        </div>

        <div className="sa-toolbar">
          <div className="sa-search">
            <Search size={16} />

            <input
              type="text"
              placeholder="Search user, activity, ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="sa-filters">
            <div className="sa-filter-control">
              <Filter size={14} />

              <select
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value)}
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <select
              className="sa-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="confirmed_abuse">Confirmed Abuse</option>
            </select>

            <select
              className="sa-select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">All Activity Types</option>

              {activityTypes.map((type) => (
                <option value={type} key={type}>
                  {getActivityName(type)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="sa-error">
            <AlertTriangle size={17} />

            <div>
              <strong>Could not load activities</strong>
              <p>{error}</p>
            </div>

            <button type="button" onClick={() => fetchActivities()}>
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="sa-state">
            <div className="sa-loader" />
            <span>Loading suspicious activities...</span>
          </div>
        ) : !error && visibleActivities.length === 0 ? (
          <div className="sa-state sa-empty">
            <div className="sa-empty-icon">
              <CheckCircle2 size={25} />
            </div>

            <h3>No activities found</h3>

            <p>
              {activities.length === 0
                ? "No suspicious activities have been recorded yet."
                : "Try changing your search, voting window or filters."}
            </p>
          </div>
        ) : (
          !error && (
            <>
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>ACTIVITY</th>
                      <th>USER</th>
                      <th>RELATED USER</th>
                      <th>SEVERITY</th>
                      <th>STATUS</th>
                      <th>DETECTED</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {visibleActivities.map((item) => {
                      const severity = getSeverity(item.severity);
                      const status = getStatus(item.status);

                      return (
                        <tr key={item.activity_id}>
                          <td>
                            <div className="sa-activity-cell">
                              <span
                                className={`sa-activity-icon ${severity.className}`}
                              >
                                <AlertTriangle size={15} />
                              </span>

                              <div>
                                <strong>
                                  {getActivityName(item.activity_type)}
                                </strong>

                                <span>
                                  #{item.activity_id ?? "—"}
                                  {item.rating_id
                                    ? ` · Rating #${item.rating_id}`
                                    : ""}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="sa-user-cell">
                              <span className="sa-user-avatar">
                                <UserRound size={14} />
                              </span>

                              <div>
                                <strong>
                                  {getDisplayName(item.username, item.user_id)}
                                </strong>

                                <span>ID: {item.user_id ?? "—"}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="sa-related-user">
                              <strong>
                                {getDisplayName(
                                  item.related_username,
                                  item.related_user_id,
                                )}
                              </strong>

                              <span>
                                {item.related_user_id
                                  ? `ID: ${item.related_user_id}`
                                  : "No related user"}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span
                              className={`sa-severity ${severity.className}`}
                            >
                              <span />
                              {severity.label}
                            </span>
                          </td>

                          <td>
                            <span className={`sa-status ${status.className}`}>
                              {status.label}
                            </span>
                          </td>

                          <td>
                            <span className="sa-date">
                              {formatDate(item.created_at)}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="sa-view-button"
                              onClick={() => setSelectedActivity(item)}
                              title="View activity details"
                            >
                              <Eye size={15} />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="sa-table-footer">
                <span>
                  Showing{" "}
                  <strong>
                    {filteredActivities.length === 0
                      ? 0
                      : (currentPage - 1) * PAGE_SIZE + 1}
                    –
                    {Math.min(
                      currentPage * PAGE_SIZE,
                      filteredActivities.length,
                    )}
                  </strong>{" "}
                  of <strong>{filteredActivities.length}</strong> activities
                </span>

                <div className="sa-pagination">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((value) => value - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span>
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((value) => value + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )
        )}
      </section>

      <div className="info-notice">
        <ShieldAlert size={14} />
        Suspicious activity is an automated signal, not a confirmed violation.
        Review the available evidence before taking action.
      </div>

      <DetailsModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
}
