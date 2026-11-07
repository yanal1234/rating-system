import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  RefreshCw,
  ShieldAlert,
  Star,
  Tags,
  TrendingUp,
  Users,
  Vote,
  XCircle,
} from "lucide-react";

import api from "../../services/api";
import "./Analytics.css";

const getAnalyticsData = (response) => {
  const data = response?.data || {};

  return data.analytics || data.statistics || data.data || data;
};

const getNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value) => getNumber(value).toLocaleString();

const formatAverage = (value) => getNumber(value).toFixed(2);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getWindowName = (item) =>
  item?.window_name || item?.name || `Window #${item?.window_id}`;

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [windowsList, setWindowsList] = useState([]);
  const [selectedWindow, setSelectedWindow] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchWindows = useCallback(async () => {
    try {
      const response = await api.get("/voting-windows");
      setWindowsList(response.data?.windows || []);
    } catch (err) {
      console.error("Failed to load voting windows:", err);
    }
  }, []);

  const fetchAnalytics = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const endpoint =
          selectedWindow === "all"
            ? "/analytics"
            : `/analytics/window/${selectedWindow}`;

        const response = await api.get(endpoint);
        const result = getAnalyticsData(response);

        setAnalytics(result);
      } catch (err) {
        console.error("Analytics error:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load analytics. Please try again.",
        );

        setAnalytics(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedWindow],
  );

  useEffect(() => {
    fetchWindows();
  }, [fetchWindows]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const ratings = analytics?.ratings || {};
  const windows = analytics?.windows || {};
  const participants = analytics?.participants || {};

  const topLabels = useMemo(() => {
    const list = analytics?.topLabels || analytics?.top_labels || [];
    return Array.isArray(list) ? list : [];
  }, [analytics]);

  const topRatedUsers = useMemo(() => {
    const list = analytics?.topRatedUsers || analytics?.top_rated_users || [];

    return Array.isArray(list) ? list : [];
  }, [analytics]);

  const totalRatings = getNumber(ratings.total_ratings);
  const validRatings = getNumber(ratings.valid_ratings);
  const invalidRatings = getNumber(ratings.invalid_ratings);
  const effectiveRatings = getNumber(ratings.effective_ratings);

  const totalWindows = getNumber(windows.total_windows);
  const totalParticipants = getNumber(
    participants.total_participations ?? participants.total_participants,
  );

  const averageStars = getNumber(ratings.average_stars);

  const maxLabelUsage = Math.max(
    ...topLabels.map((item) => getNumber(item.usage_count)),
    1,
  );

  const maxUserRatings = Math.max(
    ...topRatedUsers.map((item) =>
      getNumber(
        item.rating_count ??
          item.total_ratings ??
          item.received_ratings ??
          item.votes_received,
      ),
    ),
    1,
  );

  const selectedWindowInfo =
    selectedWindow === "all"
      ? null
      : windowsList.find(
          (item) => String(item.window_id) === String(selectedWindow),
        );

  const handleExport = () => {
    if (!analytics) return;

    const exportData = {
      generated_at: new Date().toISOString(),
      scope:
        selectedWindow === "all"
          ? "All voting windows"
          : getWindowName(selectedWindowInfo),
      analytics,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `rating-analytics-${selectedWindow}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const renderStatCard = ({
    title,
    value,
    description,
    icon: Icon,
    variant,
  }) => (
    <div className="an-stat-card" key={title}>
      <div className={`an-stat-icon ${variant}`}>
        <Icon size={19} />
      </div>

      <div className="an-stat-info">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </div>
  );

  const statCards = [
    {
      title: "Total Ratings",
      value: formatNumber(totalRatings),
      description: "All submitted ratings",
      icon: Vote,
      variant: "cyan",
    },
    {
      title: "Participants",
      value: formatNumber(totalParticipants),
      description: "Total participation records",
      icon: Users,
      variant: "blue",
    },
    {
      title: "Average Stars",
      value: formatAverage(averageStars),
      description: "Average rating score",
      icon: Star,
      variant: "orange",
    },
    {
      title: "Effective Ratings",
      value: formatNumber(effectiveRatings),
      description: "Ratings included in results",
      icon: CheckCircle2,
      variant: "green",
    },
  ];

  if (loading) {
    return (
      <div className="an-page">
        <div className="an-loading">
          <RefreshCw size={25} className="an-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="an-page">
        <div className="an-header">
          <div>
            <div className="an-eyebrow">
              <Activity size={14} />
              SYSTEM INSIGHTS
            </div>
            <h1>Analytics</h1>
            <p>Explore rating statistics and system performance.</p>
          </div>
        </div>

        <div className="an-error-state">
          <div className="an-error-icon">
            <ShieldAlert size={25} />
          </div>
          <h2>Analytics unavailable</h2>
          <p>{error}</p>
          <button onClick={() => fetchAnalytics(true)}>
            <RefreshCw size={15} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="an-page">
      <div className="an-header">
        <div>
          <div className="an-eyebrow">
            <Activity size={14} />
            SYSTEM INSIGHTS
          </div>

          <h1>Analytics</h1>

          <p>Explore rating statistics and system performance.</p>
        </div>

        <div className="an-header-actions">
          <button
            className="an-export-btn"
            onClick={handleExport}
            disabled={!analytics}
          >
            <Download size={15} />
            Export Data
          </button>

          <button
            className="an-refresh-btn"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            title="Refresh analytics"
          >
            <RefreshCw size={16} className={refreshing ? "an-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="an-filter-bar">
        <div className="an-filter-label">
          <CalendarDays size={16} />
          <span>Analytics Scope</span>
        </div>

        <select
          value={selectedWindow}
          onChange={(event) => setSelectedWindow(event.target.value)}
        >
          <option value="all">All Voting Windows</option>

          {windowsList.map((item) => (
            <option key={item.window_id} value={item.window_id}>
              {getWindowName(item)}
            </option>
          ))}
        </select>

        {selectedWindowInfo && (
          <div className="an-selected-date">
            <Clock3 size={13} />
            {formatDate(selectedWindowInfo.starts_at)}
            <span>—</span>
            {formatDate(selectedWindowInfo.ends_at)}
          </div>
        )}
      </div>

      <div className="an-section-heading">
        <div>
          <h2>Overview</h2>
          <p>
            {selectedWindow === "all"
              ? "A summary of activity across the entire system."
              : `Statistics for ${getWindowName(selectedWindowInfo)}.`}
          </p>
        </div>

        <span className="an-live-indicator">
          <span />
          LIVE DATA
        </span>
      </div>

      <div className="an-stats-grid">{statCards.map(renderStatCard)}</div>

      <div className="an-secondary-grid">
        <div className="an-panel">
          <div className="an-panel-header">
            <div className="an-panel-title">
              <div className="an-panel-icon cyan">
                <BarChart3 size={17} />
              </div>
              <div>
                <h3>Rating Breakdown</h3>
                <p>Current rating status overview</p>
              </div>
            </div>
          </div>

          <div className="an-breakdown">
            <div className="an-breakdown-item">
              <div className="an-breakdown-top">
                <div>
                  <span className="an-dot green" />
                  <span>Valid Ratings</span>
                </div>
                <strong>{formatNumber(validRatings)}</strong>
              </div>
              <div className="an-progress">
                <span
                  className="green"
                  style={{
                    width: `${
                      totalRatings
                        ? Math.min((validRatings / totalRatings) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="an-breakdown-item">
              <div className="an-breakdown-top">
                <div>
                  <span className="an-dot red" />
                  <span>Invalid Ratings</span>
                </div>
                <strong>{formatNumber(invalidRatings)}</strong>
              </div>
              <div className="an-progress">
                <span
                  className="red"
                  style={{
                    width: `${
                      totalRatings
                        ? Math.min((invalidRatings / totalRatings) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="an-breakdown-item">
              <div className="an-breakdown-top">
                <div>
                  <span className="an-dot cyan" />
                  <span>Effective Ratings</span>
                </div>
                <strong>{formatNumber(effectiveRatings)}</strong>
              </div>
              <div className="an-progress">
                <span
                  className="cyan"
                  style={{
                    width: `${
                      totalRatings
                        ? Math.min((effectiveRatings / totalRatings) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="an-breakdown-footer">
            <span>Total submitted ratings</span>
            <strong>{formatNumber(totalRatings)}</strong>
          </div>
        </div>

        <div className="an-panel">
          <div className="an-panel-header">
            <div className="an-panel-title">
              <div className="an-panel-icon orange">
                <CalendarDays size={17} />
              </div>
              <div>
                <h3>Voting Windows</h3>
                <p>Voting window distribution</p>
              </div>
            </div>
          </div>

          <div className="an-window-stats">
            <div className="an-window-stat">
              <div>
                <span className="an-window-dot cyan" />
                <span>Total Windows</span>
              </div>
              <strong>{formatNumber(totalWindows)}</strong>
            </div>

            <div className="an-window-stat">
              <div>
                <span className="an-window-dot green" />
                <span>Published</span>
              </div>
              <strong>{formatNumber(windows.published_windows)}</strong>
            </div>

            <div className="an-window-stat">
              <div>
                <span className="an-window-dot orange" />
                <span>Draft</span>
              </div>
              <strong>{formatNumber(windows.draft_windows)}</strong>
            </div>

            <div className="an-window-stat">
              <div>
                <span className="an-window-dot red" />
                <span>Cancelled</span>
              </div>
              <strong>{formatNumber(windows.cancelled_windows)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="an-lists-grid">
        <div className="an-panel">
          <div className="an-panel-header">
            <div className="an-panel-title">
              <div className="an-panel-icon cyan">
                <Tags size={17} />
              </div>
              <div>
                <h3>Top Labels</h3>
                <p>Most frequently used rating labels</p>
              </div>
            </div>

            <span className="an-panel-count">{topLabels.length} LABELS</span>
          </div>

          {topLabels.length === 0 ? (
            <div className="an-empty">
              <Tags size={22} />
              <span>No label statistics available.</span>
            </div>
          ) : (
            <div className="an-ranking-list">
              {topLabels.map((label, index) => {
                const count = getNumber(label.usage_count);

                return (
                  <div
                    className="an-ranking-item"
                    key={label.label_id ?? index}
                  >
                    <div className="an-ranking-main">
                      <span className="an-rank-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="an-ranking-info">
                        <strong>{label.label_name || "Unnamed Label"}</strong>
                        <div className="an-ranking-progress">
                          <span
                            style={{
                              width: `${(count / maxLabelUsage) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <strong className="an-ranking-value">
                      {formatNumber(count)}
                      <small> uses</small>
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="an-panel">
          <div className="an-panel-header">
            <div className="an-panel-title">
              <div className="an-panel-icon purple">
                <TrendingUp size={17} />
              </div>
              <div>
                <h3>Top Rated Learners</h3>
                <p>Students with the highest rating activity</p>
              </div>
            </div>

            <span className="an-panel-count">
              {topRatedUsers.length} LEARNERS
            </span>
          </div>

          {topRatedUsers.length === 0 ? (
            <div className="an-empty">
              <Users size={22} />
              <span>No learner statistics available.</span>
            </div>
          ) : (
            <div className="an-ranking-list">
              {topRatedUsers.map((user, index) => {
                const count = getNumber(
                  user.rating_count ??
                    user.total_ratings ??
                    user.received_ratings ??
                    user.votes_received,
                );

                return (
                  <div className="an-ranking-item" key={user.user_id ?? index}>
                    <div className="an-ranking-main">
                      <span className="an-rank-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="an-ranking-info">
                        <strong>
                          {user.full_name ||
                            user.username ||
                            user.name ||
                            `Learner #${user.user_id}`}
                        </strong>

                        <div className="an-ranking-progress purple">
                          <span
                            style={{
                              width: `${(count / maxUserRatings) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <strong className="an-ranking-value">
                      {formatNumber(count)}
                      <small> ratings</small>
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="an-footer-note">
        <Activity size={14} />
        <span>
          Statistics are calculated from the data currently available in the
          system.
        </span>
      </div>
    </div>
  );
}
