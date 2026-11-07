import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  ClipboardList,
  ShieldCheck,
  Settings,
  FileText,
  Eye,
  X,
  Clock3,
  Filter,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

import api from "../../services/api";
import "./AuditLogs.css";

const actionLabels = {
  rating_created: "Rating Created",
  rating_invalidated: "Rating Invalidated",
  rating_weight_changed: "Weight Changed",
  moderation_status_changed: "Moderation Updated",
  moderation_decision: "Moderation Decision",
  credibility_updated: "Credibility Updated",
};

const getActionLabel = (action) => {
  return (
    actionLabels[action] ||
    (action || "Unknown Action")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const getActionCategory = (action = "") => {
  if (action.includes("moderation") || action.includes("invalidated")) {
    return "moderation";
  }

  if (action.includes("credibility") || action.includes("weight")) {
    return "system";
  }

  if (action.includes("created")) {
    return "rating";
  }

  return "other";
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (error) =>
  error.response?.data?.message || "Something went wrong. Please try again.";

const parseDetails = (details) => {
  if (!details) return null;

  if (typeof details === "object") return details;

  try {
    return JSON.parse(details);
  } catch {
    return details;
  }
};

function ActionBadge({ action }) {
  const category = getActionCategory(action);

  return (
    <span className={`al-action-badge al-action-${category}`}>
      <span className="al-action-dot" />
      {getActionLabel(action)}
    </span>
  );
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const [selectedLog, setSelectedLog] = useState(null);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [notice, setNotice] = useState(null);

  const showNotice = (type, message) => {
    setNotice({ type, message });

    window.setTimeout(() => {
      setNotice(null);
    }, 4000);
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/audit-logs");

      setLogs(response.data.logs || []);
    } catch (error) {
      showNotice("error", getErrorMessage(error));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionTypes = useMemo(() => {
    return [...new Set(logs.map((log) => log.action_type).filter(Boolean))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchValue = search.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        String(log.log_id || "").includes(searchValue) ||
        String(log.rating_id || "").includes(searchValue) ||
        (log.performed_by_username || "").toLowerCase().includes(searchValue) ||
        (log.action_type || "").toLowerCase().includes(searchValue) ||
        (log.reason || "").toLowerCase().includes(searchValue);

      const matchesAction =
        actionFilter === "all" || log.action_type === actionFilter;

      let matchesDate = true;

      if (dateFilter !== "all" && log.created_at) {
        const logDate = new Date(log.created_at);
        const now = new Date();

        if (!Number.isNaN(logDate.getTime())) {
          if (dateFilter === "today") {
            matchesDate = logDate.toDateString() === now.toDateString();
          } else if (dateFilter === "week") {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            matchesDate = logDate >= weekAgo;
          } else if (dateFilter === "month") {
            const monthAgo = new Date();
            monthAgo.setMonth(now.getMonth() - 1);
            matchesDate = logDate >= monthAgo;
          }
        }
      }

      return matchesSearch && matchesAction && matchesDate;
    });
  }, [logs, search, actionFilter, dateFilter]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      ratings: logs.filter(
        (log) => getActionCategory(log.action_type) === "rating",
      ).length,
      moderation: logs.filter(
        (log) => getActionCategory(log.action_type) === "moderation",
      ).length,
      system: logs.filter(
        (log) => getActionCategory(log.action_type) === "system",
      ).length,
    };
  }, [logs]);

  const openDetails = async (log) => {
    setSelectedLog(log);
    setRatingHistory([]);

    if (!log.rating_id) return;

    try {
      setHistoryLoading(true);

      const response = await api.get(`/audit-logs/rating/${log.rating_id}`);

      setRatingHistory(response.data.logs || []);
    } catch {
      setRatingHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedLog(null);
    setRatingHistory([]);
  };

  const renderDetails = (details) => {
    const parsed = parseDetails(details);

    if (!parsed) return "No additional details available.";

    if (typeof parsed === "string") return parsed;

    return JSON.stringify(parsed, null, 2);
  };

  return (
    <div className="audit-logs-page">
      <div className="al-page-header">
        <div>
          <div className="al-eyebrow">STAFF CONTROL PANEL</div>
          <h1>Audit Logs</h1>
          <p>Review system activity and administrative actions.</p>
        </div>

        <button
          className="al-refresh-btn"
          onClick={fetchLogs}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "al-spinning" : ""} />
          Refresh
        </button>
      </div>

      {notice && (
        <div className={`al-notice al-notice-${notice.type}`}>
          <AlertCircle size={15} />
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="al-stats-grid">
        <div className="al-stat-card">
          <div className="al-stat-icon cyan">
            <ClipboardList size={18} />
          </div>
          <div>
            <span>Total Logs</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="al-stat-card">
          <div className="al-stat-icon blue">
            <FileText size={18} />
          </div>
          <div>
            <span>Rating Actions</span>
            <strong>{stats.ratings}</strong>
          </div>
        </div>

        <div className="al-stat-card">
          <div className="al-stat-icon orange">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span>Moderation Actions</span>
            <strong>{stats.moderation}</strong>
          </div>
        </div>

        <div className="al-stat-card">
          <div className="al-stat-icon purple">
            <Settings size={18} />
          </div>
          <div>
            <span>System Actions</span>
            <strong>{stats.system}</strong>
          </div>
        </div>
      </div>

      <div className="al-toolbar">
        <div className="al-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search logs, staff or rating ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="al-filter">
          <Filter size={14} />

          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          >
            <option value="all">All actions</option>

            {actionTypes.map((action) => (
              <option key={action} value={action}>
                {getActionLabel(action)}
              </option>
            ))}
          </select>

          <ChevronDown size={13} />
        </div>

        <div className="al-filter">
          <Clock3 size={14} />

          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>

          <ChevronDown size={13} />
        </div>
      </div>

      <div className="al-table-card">
        <div className="al-table-header">
          <div>
            <h2>Activity History</h2>
            <p>A record of actions performed across the system</p>
          </div>

          <span className="al-results-count">
            {filteredLogs.length} records
          </span>
        </div>

        {loading ? (
          <div className="al-empty-state">
            <RefreshCw size={23} className="al-spinning" />
            <span>Loading audit logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="al-empty-state">
            <ClipboardList size={25} />
            <strong>No audit logs found</strong>
            <span>
              {logs.length === 0
                ? "System activity will appear here when actions are recorded."
                : "Try changing your search or filters."}
            </span>
          </div>
        ) : (
          <div className="al-table-scroll">
            <table className="al-table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Performed By</th>
                  <th>Action</th>
                  <th>Rating ID</th>
                  <th>Reason</th>
                  <th>Date & Time</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.log_id}>
                    <td>
                      <span className="al-log-id">#{log.log_id}</span>
                    </td>

                    <td>
                      <span className="al-staff-name">
                        {log.performed_by_username ||
                          (log.performed_by
                            ? `User #${log.performed_by}`
                            : "System")}
                      </span>
                    </td>

                    <td>
                      <ActionBadge action={log.action_type} />
                    </td>

                    <td>
                      {log.rating_id ? (
                        <span className="al-rating-id">#{log.rating_id}</span>
                      ) : (
                        <span className="al-muted">—</span>
                      )}
                    </td>

                    <td>
                      <span className="al-reason" title={log.reason || ""}>
                        {log.reason || "—"}
                      </span>
                    </td>

                    <td>
                      <span className="al-date">
                        {formatDate(log.created_at)}
                      </span>
                    </td>

                    <td>
                      <button
                        className="al-view-btn"
                        onClick={() => openDetails(log)}
                        title="View log details"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedLog && (
        <div
          className="al-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails();
          }}
        >
          <div className="al-modal">
            <div className="al-modal-header">
              <div>
                <span className="al-eyebrow">
                  AUDIT RECORD #{selectedLog.log_id}
                </span>
                <h2>Log Details</h2>
              </div>

              <button className="al-modal-close" onClick={closeDetails}>
                <X size={17} />
              </button>
            </div>

            <div className="al-modal-body">
              <div className="al-detail-grid">
                <div>
                  <span>Log ID</span>
                  <strong>#{selectedLog.log_id}</strong>
                </div>

                <div>
                  <span>Performed By</span>
                  <strong>
                    {selectedLog.performed_by_username ||
                      (selectedLog.performed_by
                        ? `User #${selectedLog.performed_by}`
                        : "System")}
                  </strong>
                </div>

                <div>
                  <span>Action Type</span>
                  <ActionBadge action={selectedLog.action_type} />
                </div>

                <div>
                  <span>Related Rating</span>
                  <strong>
                    {selectedLog.rating_id
                      ? `#${selectedLog.rating_id}`
                      : "Not related to a rating"}
                  </strong>
                </div>

                <div className="al-detail-full">
                  <span>Date & Time</span>
                  <strong>{formatDate(selectedLog.created_at)}</strong>
                </div>
              </div>

              <div className="al-detail-section">
                <span>Reason</span>
                <p>{selectedLog.reason || "No reason provided."}</p>
              </div>

              <div className="al-detail-section">
                <span>Additional Details</span>
                <pre>{renderDetails(selectedLog.details)}</pre>
              </div>

              {selectedLog.rating_id && (
                <div className="al-history-section">
                  <div className="al-history-heading">
                    <div>
                      <h3>Rating Activity History</h3>
                      <p>Other recorded actions for this rating</p>
                    </div>

                    <span>{ratingHistory.length} records</span>
                  </div>

                  {historyLoading ? (
                    <div className="al-history-loading">
                      <RefreshCw size={14} className="al-spinning" />
                      Loading history...
                    </div>
                  ) : ratingHistory.length === 0 ? (
                    <div className="al-history-empty">
                      No additional history available.
                    </div>
                  ) : (
                    <div className="al-history-list">
                      {ratingHistory.map((item) => (
                        <div className="al-history-item" key={item.log_id}>
                          <div className="al-history-marker" />

                          <div className="al-history-content">
                            <div className="al-history-top">
                              <strong>
                                {getActionLabel(item.action_type)}
                              </strong>

                              <span>{formatDate(item.created_at)}</span>
                            </div>

                            <p>{item.reason || "No reason provided."}</p>

                            <small>
                              By{" "}
                              {item.performed_by_username ||
                                (item.performed_by
                                  ? `User #${item.performed_by}`
                                  : "System")}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button className="al-primary-btn" onClick={closeDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
