import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Flag,
  LoaderCircle,
  RefreshCw,
  Star,
  Users,
  CheckCircle2,
  Activity,
} from "lucide-react";

import api from "../../services/api.js";
import "./StaffDashboard.css";

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getWindowState = (window) => {
  if (!window) return "No voting window";

  const now = new Date();
  const start = new Date(window.starts_at);
  const end = new Date(window.ends_at);

  if (window.status === "cancelled") return "Cancelled";
  if (window.status === "draft") return "Draft";
  if (now < start) return "Upcoming";
  if (now > end) return "Completed";

  return "Active";
};

const getCountdown = (window, now) => {
  if (!window || window.status !== "published") return null;

  const start = new Date(window.starts_at);
  const end = new Date(window.ends_at);
  const target = now < start ? start : end;
  const difference = target.getTime() - now.getTime();

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: now > end ? "Voting period ended" : "Voting period started",
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    label: now < start ? "Time until voting starts" : "Time remaining",
  };
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  description,
  badge,
  badgeClass = "",
}) => (
  <div className="metric-card">
    <div className="metric-label">{label}</div>

    <div className="metric-main-row">
      <div className="metric-value">{value ?? 0}</div>

      <div className="metric-icon">
        <Icon size={19} />
      </div>
    </div>

    <div className="metric-divider" />

    <div className="metric-sub-row">
      <span className="metric-sub-text">{description}</span>

      {badge && (
        <span className={`metric-badge-red ${badgeClass}`}>{badge}</span>
      )}
    </div>
  </div>
);

const StaffDashboard = () => {
  const [windows, setWindows] = useState([]);
  const [selectedWindowId, setSelectedWindowId] = useState("");
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Load voting windows
  const fetchWindows = async () => {
    try {
      setError("");

      const response = await api.get("/voting-windows");
      const availableWindows = response.data.windows || [];

      setWindows(availableWindows);

      if (!availableWindows.length) {
        setSelectedWindowId("");
        setDashboard(null);
        setLoading(false);
        return;
      }

      const currentTime = new Date();

      const defaultWindow =
        availableWindows.find(
          (item) =>
            item.status === "published" &&
            new Date(item.starts_at) <= currentTime &&
            new Date(item.ends_at) >= currentTime,
        ) ||
        availableWindows.find((item) => item.status === "published") ||
        availableWindows[0];

      setSelectedWindowId(String(defaultWindow.window_id));
    } catch (err) {
      console.error("Voting windows error:", err);

      setError(err.response?.data?.message || "Unable to load voting windows.");

      setLoading(false);
    }
  };

  // Load analytics for selected voting window
  const fetchAnalytics = async (windowId) => {
    if (!windowId) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/analytics/window/${windowId}`);

      setDashboard(response.data.analytics ?? null);
    } catch (err) {
      console.error("Staff dashboard analytics error:", err);

      setDashboard(null);

      setError(
        err.response?.data?.message || "Unable to load dashboard analytics.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWindows();
  }, []);

  useEffect(() => {
    if (selectedWindowId) {
      fetchAnalytics(selectedWindowId);
    }
  }, [selectedWindowId]);

  const handleRefresh = () => {
    if (selectedWindowId) {
      fetchAnalytics(selectedWindowId);
    } else {
      fetchWindows();
    }
  };

  const window = dashboard?.window;
  const participation = dashboard?.participation ?? {};
  const ratings = dashboard?.ratings ?? {};
  const abuse = dashboard?.abuse ?? {};

  const pendingActivities = dashboard?.pendingActivities ?? [];
  const ratingsByDay = dashboard?.ratingsByDay ?? [];
  const starDistribution = dashboard?.starDistribution ?? [];

  const windowState = getWindowState(window);
  const countdown = getCountdown(window, now);

  const participationRate = useMemo(() => {
    const total = Number(participation.total_participants || 0);
    const completed = Number(participation.students_who_rated || 0);

    if (!total) return 0;

    return Math.min(100, Math.round((completed / total) * 100));
  }, [participation]);

  const chartDays = useMemo(() => {
    const result = [];
    const ratingsMap = new Map();

    ratingsByDay.forEach((item) => {
      const dateKey =
        typeof item.rating_date === "string"
          ? item.rating_date.slice(0, 10)
          : getDateKey(new Date(item.rating_date));

      ratingsMap.set(dateKey, Number(item.total || 0));
    });

    for (let index = 6; index >= 0; index--) {
      const date = new Date();
      date.setDate(date.getDate() - index);

      const key = getDateKey(date);

      result.push({
        key,
        label: date.toLocaleDateString("en-US", {
          weekday: "short",
        }),
        total: ratingsMap.get(key) || 0,
      });
    }

    return result;
  }, [ratingsByDay]);

  const maxDailyRatings = Math.max(1, ...chartDays.map((day) => day.total));

  const totalEffectiveStars = starDistribution.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0,
  );

  const starCounts = [3, 2, 1].map((stars) => {
    const item = starDistribution.find(
      (entry) => Number(entry.stars) === stars,
    );

    return {
      stars,
      total: Number(item?.total || 0),
      percentage: totalEffectiveStars
        ? Math.round((Number(item?.total || 0) / totalEffectiveStars) * 100)
        : 0,
    };
  });

  if (loading && !dashboard) {
    return (
      <div className="staff-content dashboard-loading">
        <LoaderCircle className="loading-spinner" size={32} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="staff-content">
      <div className="content-path">
        <span>Staff</span>
        <span>/</span>
        <span>Overview</span>
      </div>

      <div className="overview-header-row">
        <div>
          <h1>Overview</h1>
          <p>Monitor your rating system and voting activity.</p>
        </div>

        <div className="header-actions">
          {/* Voting period selector - styled to match the original dashboard */}
          <select
            aria-label="Select voting period"
            value={selectedWindowId}
            onChange={(event) => setSelectedWindowId(event.target.value)}
            disabled={!windows.length}
            style={{
              minWidth: "190px",
              maxWidth: "260px",
              height: "38px",
              padding: "0 12px",
              border: "1px solid var(--staff-border-light)",
              borderRadius: "6px",
              background: "var(--staff-card-secondary)",
              color: "var(--staff-text)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              outline: "none",
              cursor: windows.length ? "pointer" : "not-allowed",
            }}
          >
            {!windows.length && <option value="">No voting periods</option>}

            {windows.map((item) => (
              <option key={item.window_id} value={String(item.window_id)}>
                {item.window_name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="refresh-dashboard"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh dashboard"
          >
            <RefreshCw
              size={16}
              className={loading ? "refresh-spinning" : ""}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          <AlertTriangle size={18} />
          <span>{error}</span>

          <button type="button" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      )}

      {!error && !loading && !dashboard && (
        <div className="panel-box empty-dashboard">
          <CalendarDays size={28} />
          <h3>No analytics available</h3>
          <p>Select another voting period or create a voting period first.</p>
        </div>
      )}

      {dashboard && (
        <>
          {/* Selected voting period information */}
          <div className="overview-date">
            <CalendarDays size={15} />

            <span>
              {window?.window_name}{" "}
              <span>
                ({formatDate(window?.starts_at)} — {formatDate(window?.ends_at)}
                )
              </span>
            </span>

            <span
              className={`window-status ${windowState.toLowerCase().replaceAll(" ", "-")}`}
            >
              {windowState}
            </span>
          </div>

          {/* Original four-card metrics layout */}
          <div className="metrics-grid">
            <StatCard
              icon={Users}
              label="Total Participants"
              value={participation.total_participants}
              description={`${participation.students_who_rated || 0} students submitted ratings`}
            />

            <StatCard
              icon={Activity}
              label="Participation Rate"
              value={`${participationRate}%`}
              description="Students who completed their ratings"
            />

            <StatCard
              icon={Star}
              label="Total Ratings"
              value={ratings.total_ratings}
              description={`${ratings.valid_ratings || 0} valid ratings`}
            />

            <StatCard
              icon={Flag}
              label="Open Abuse Cases"
              value={abuse.open_cases}
              description={`${abuse.high_priority_cases || 0} high priority cases`}
              badge={
                Number(abuse.open_cases || 0) > 0
                  ? "Needs attention"
                  : "All clear"
              }
              badgeClass={
                Number(abuse.open_cases || 0) > 0 ? "metric-badge-red" : ""
              }
            />
          </div>

          <div className="dashboard-grid-lower">
            {/* Needs attention */}
            <section className="panel-box">
              <div className="panel-title-row">
                <div>
                  <h2>Needs Attention</h2>
                  <p>Recent suspicious activities requiring review.</p>
                </div>

                <AlertTriangle size={19} />
              </div>

              {pendingActivities.length === 0 ? (
                <div className="empty-attention">
                  <CheckCircle2 size={23} />
                  <span>No pending activities</span>
                </div>
              ) : (
                <div className="attention-list">
                  {pendingActivities.map((activity) => (
                    <div className="attention-item" key={activity.activity_id}>
                      <div className="item-top">
                        <strong>
                          {String(activity.activity_type || "")
                            .replaceAll("_", " ")
                            .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                        </strong>

                        <span
                          className={`severity-${String(
                            activity.severity,
                          ).toLowerCase()}`}
                        >
                          {activity.severity}
                        </span>
                      </div>

                      <p className="item-desc">{activity.description}</p>

                      <span className="metric-footer-text">
                        {formatDate(activity.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <a
                href="/staff/suspicious-activities"
                className="panel-footer-link"
              >
                View all activities
              </a>
            </section>

            {/* Original sidebar widgets */}
            <div className="sidebar-widgets-stack">
              <section className="panel-box">
                <div className="widget-head-between">
                  <div>
                    <h2>Voting Window</h2>
                    <p>Selected period information</p>
                  </div>

                  <CalendarDays size={19} />
                </div>

                <div className="countdown-details-table">
                  <div className="row-detail">
                    <span>Window name</span>
                    <strong>{window?.window_name || "—"}</strong>
                  </div>

                  <div className="row-detail">
                    <span>Status</span>
                    <strong>{windowState}</strong>
                  </div>

                  <div className="row-detail">
                    <span>Minimum votes</span>
                    <strong>{window?.min_votes ?? "—"}</strong>
                  </div>

                  <div className="row-detail">
                    <span>Maximum votes</span>
                    <strong>{window?.max_votes ?? "—"}</strong>
                  </div>

                  <div className="row-detail">
                    <span>Starts</span>
                    <strong>{formatDate(window?.starts_at)}</strong>
                  </div>

                  <div className="row-detail">
                    <span>Ends</span>
                    <strong>{formatDate(window?.ends_at)}</strong>
                  </div>
                </div>

                {countdown && (
                  <>
                    <div className="metric-divider" />

                    <div className="widget-head-between">
                      <span>{countdown.label}</span>
                      <Clock3 size={15} />
                    </div>

                    <div className="countdown-display">
                      <div>
                        <strong>{countdown.days}</strong>
                        <span>Days</span>
                      </div>

                      <div>
                        <strong>
                          {String(countdown.hours).padStart(2, "0")}
                        </strong>
                        <span>Hours</span>
                      </div>

                      <div>
                        <strong>
                          {String(countdown.minutes).padStart(2, "0")}
                        </strong>
                        <span>Minutes</span>
                      </div>

                      <div>
                        <strong>
                          {String(countdown.seconds).padStart(2, "0")}
                        </strong>
                        <span>Seconds</span>
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* Ratings per day */}
              <section className="panel-box">
                <div className="widget-head-between">
                  <div>
                    <h2>Ratings per Day</h2>
                    <p>Last 7 days</p>
                  </div>

                  <Activity size={19} />
                </div>

                <div className="chart-mockup">
                  <div className="chart-bars">
                    {chartDays.map((day) => (
                      <div className="chart-bar-column" key={day.key}>
                        <span>{day.total}</span>

                        <div className="bar">
                          <div
                            style={{
                              height: `${(day.total / maxDailyRatings) * 100}%`,
                              minHeight: day.total > 0 ? "4px" : "0",
                            }}
                          />
                        </div>

                        <span>{day.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Star distribution */}
              <section className="panel-box">
                <div className="widget-head-between">
                  <div>
                    <h2>Star Distribution</h2>
                    <p>Effective ratings only</p>
                  </div>

                  <Star size={19} />
                </div>

                <div className="star-stat-list">
                  {starCounts.map((item) => (
                    <div className="star-stat-row" key={item.stars}>
                      <div className="star-stat-label">
                        <span>{item.stars}</span>
                        <Star size={14} />
                      </div>

                      <div className="mini-progress-bar">
                        <div
                          style={{
                            width: `${item.percentage}%`,
                          }}
                        />
                      </div>

                      <strong>{item.total}</strong>
                    </div>
                  ))}
                </div>

                <div className="chart-bottom-stats">
                  <span>Total effective ratings</span>
                  <strong>{totalEffectiveStars}</strong>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StaffDashboard;
