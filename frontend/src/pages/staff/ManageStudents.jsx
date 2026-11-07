import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  RefreshCw,
  Clock3,
  Flag,
} from "lucide-react";

import api from "../../services/api.js";
import "./ManageStudents.css";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(
    typeof value === "string" && value.includes(" ")
      ? value.replace(" ", "T")
      : value,
  );

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "ST";

const getSeverityClass = (severity) => {
  switch (String(severity || "").toLowerCase()) {
    case "critical":
    case "high":
      return "severity-high";
    case "medium":
      return "severity-medium";
    case "low":
      return "severity-low";
    default:
      return "";
  }
};

export default function ParticipationPage() {
  const [windows, setWindows] = useState([]);
  const [selectedWindowId, setSelectedWindowId] = useState("");
  const [summary, setSummary] = useState({
    total_participants: 0,
    voted: 0,
    not_voted: 0,
    below_minimum: 0,
    turnout: 0,
  });

  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState("voted");
  const [searchTerm, setSearchTerm] = useState("");
  const [flagFilter, setFlagFilter] = useState("all");
  const [sortBy, setSortBy] = useState("votes-desc");
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingWindows, setLoadingWindows] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState("");

  const selectedWindow = windows.find(
    (window) => String(window.window_id) === String(selectedWindowId),
  );

  const minVotes = Number(selectedWindow?.min_votes ?? 1);
  const maxVotes = Number(selectedWindow?.max_votes ?? 5);

  // Load voting windows
  const loadWindows = async () => {
    try {
      setLoadingWindows(true);
      setError("");

      const response = await api.get("/voting-windows");
      const data = response.data?.windows || [];

      setWindows(data);

      if (data.length > 0) {
        const activeWindow =
          data.find((window) => window.status === "published") || data[0];

        setSelectedWindowId(String(activeWindow.window_id));
      } else {
        setSelectedWindowId("");
        setStudents([]);
        setSummary({
          total_participants: 0,
          voted: 0,
          not_voted: 0,
          below_minimum: 0,
          turnout: 0,
        });
      }
    } catch (err) {
      console.error("Load voting windows error:", err);
      setError(err.response?.data?.message || "Failed to load voting windows.");
    } finally {
      setLoadingWindows(false);
    }
  };

  // Load participation statistics for selected window
  const loadParticipation = async (windowId) => {
    if (!windowId) return;

    try {
      setLoadingStats(true);
      setError("");

      const response = await api.get(`/participants/participation/${windowId}`);

      const data = response.data || {};

      setSummary({
        total_participants: Number(data.summary?.total_participants ?? 0),
        voted: Number(data.summary?.voted ?? 0),
        not_voted: Number(data.summary?.not_voted ?? 0),
        below_minimum: Number(data.summary?.below_minimum ?? 0),
        turnout: Number(data.summary?.turnout ?? 0),
      });

      setStudents(
        (data.participants || []).map((student) => ({
          ...student,
          user_id: Number(student.user_id),
          votes_given: Number(student.votes_given ?? 0),
          one_star: Number(student.one_star ?? 0),
          two_stars: Number(student.two_stars ?? 0),
          three_stars: Number(student.three_stars ?? 0),
          flag_count: Number(student.flag_count ?? 0),
          min_votes: Number(student.min_votes ?? minVotes),
        })),
      );

      setCurrentPage(1);
    } catch (err) {
      console.error("Load participation error:", err);
      setStudents([]);
      setSummary({
        total_participants: 0,
        voted: 0,
        not_voted: 0,
        below_minimum: 0,
        turnout: 0,
      });

      setError(
        err.response?.data?.message ||
          "Failed to load participation statistics.",
      );
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadWindows();
  }, []);

  useEffect(() => {
    if (selectedWindowId) {
      loadParticipation(selectedWindowId);
    }
  }, [selectedWindowId]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (activeTab === "voted") {
      result = result.filter((student) => student.votes_given > 0);
    } else if (activeTab === "not-voted") {
      result = result.filter((student) => student.votes_given === 0);
    } else if (activeTab === "below") {
      result = result.filter(
        (student) =>
          student.votes_given > 0 &&
          student.votes_given < Number(student.min_votes ?? minVotes),
      );
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();

      result = result.filter((student) => {
        const name = String(student.full_name || "").toLowerCase();
        const username = String(student.username || "").toLowerCase();
        const email = String(student.email || "").toLowerCase();
        const id = String(student.user_id || "");

        return (
          name.includes(search) ||
          username.includes(search) ||
          email.includes(search) ||
          id.includes(search)
        );
      });
    }

    if (flagFilter === "with-flags") {
      result = result.filter((student) => student.flag_count > 0);
    } else if (flagFilter === "without-flags") {
      result = result.filter((student) => student.flag_count === 0);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "votes-asc":
          return a.votes_given - b.votes_given;

        case "name-asc":
          return String(a.full_name || "").localeCompare(
            String(b.full_name || ""),
          );

        case "name-desc":
          return String(b.full_name || "").localeCompare(
            String(a.full_name || ""),
          );

        case "last-vote":
          return (
            new Date(b.last_vote_at || 0).getTime() -
            new Date(a.last_vote_at || 0).getTime()
          );

        case "votes-desc":
        default:
          return b.votes_given - a.votes_given;
      }
    });

    return result;
  }, [students, activeTab, searchTerm, flagFilter, sortBy, minVotes]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / rowsPerPage),
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedStudents = filteredStudents.slice(
    (safeCurrentPage - 1) * rowsPerPage,
    safeCurrentPage * rowsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, flagFilter, sortBy, rowsPerPage]);

  const getParticipationStatus = (student) => {
    const requiredVotes = Number(student.min_votes ?? minVotes);

    if (student.votes_given === 0) {
      return {
        label: "Not voted",
        type: "not-voted",
      };
    }

    if (student.votes_given < requiredVotes) {
      return {
        label: `Below minimum (${student.votes_given}/${requiredVotes})`,
        type: "below",
      };
    }

    return {
      label: "Completed",
      type: "normal",
    };
  };

  const exportCSV = () => {
    const headers = [
      "Student ID",
      "Full Name",
      "Username",
      "Email",
      "Votes Given",
      "Minimum Votes",
      "1 Star",
      "2 Stars",
      "3 Stars",
      "Flags",
      "Last Vote",
      "Participation Status",
    ];

    const rows = filteredStudents.map((student) => {
      const status = getParticipationStatus(student);

      return [
        student.user_id,
        student.full_name,
        student.username,
        student.email,
        student.votes_given,
        student.min_votes ?? minVotes,
        student.one_star,
        student.two_stars,
        student.three_stars,
        student.flag_count,
        student.last_vote_at || "",
        status.label,
      ];
    });

    const escapeCSV = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `participation-window-${selectedWindowId || "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const votedPercentage =
    summary.total_participants > 0
      ? (summary.voted / summary.total_participants) * 100
      : 0;

  const firstRow =
    filteredStudents.length === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1;

  const lastRow = Math.min(
    safeCurrentPage * rowsPerPage,
    filteredStudents.length,
  );

  return (
    <div className="part-page">
      <div className="part-header-row">
        <div>
          <div className="part-breadcrumb">REVIEW / PARTICIPATION</div>
          <h1 className="part-title">Participation</h1>
          <p className="part-subtitle">
            {summary.voted} of {summary.total_participants} students voted.{" "}
            {summary.not_voted} have not.
          </p>
        </div>

        <div className="part-header-actions">
          <div className="part-window-control">
            <select
              className="part-window-select"
              value={selectedWindowId}
              onChange={(event) => setSelectedWindowId(event.target.value)}
              disabled={loadingWindows || windows.length === 0}
            >
              {windows.length === 0 && (
                <option value="">No voting windows</option>
              )}

              {windows.map((window) => (
                <option key={window.window_id} value={window.window_id}>
                  {window.window_name || `Window ${window.window_id}`}
                  {window.status === "published" ? " (Active)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>

          <button
            className="btn-export"
            onClick={exportCSV}
            disabled={filteredStudents.length === 0}
          >
            <Download size={14} />
            Export this list
          </button>

          <button
            className="part-refresh-btn"
            onClick={() => loadParticipation(selectedWindowId)}
            disabled={!selectedWindowId || loadingStats}
            title="Refresh"
          >
            <RefreshCw size={15} className={loadingStats ? "spinning" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="part-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => loadParticipation(selectedWindowId)}>
            Retry
          </button>
        </div>
      )}

      <div className="part-stats-grid">
        <div className="part-stat-card">
          <div className="part-stat-icon cyan-icon">
            <Users size={17} />
          </div>
          <span className="stat-label">TOTAL ELIGIBLE</span>
          <div className="stat-main">
            <span className="stat-value">{summary.total_participants}</span>
            <span className="stat-unit">Students</span>
          </div>
          <p className="stat-desc">Participants in this voting window</p>
        </div>

        <div className="part-stat-card">
          <div className="part-stat-icon cyan-icon">
            <UserCheck size={17} />
          </div>
          <span className="stat-label">TURNOUT</span>
          <div className="stat-main">
            <span className="stat-value text-cyan">
              {summary.turnout.toFixed(1)}%
            </span>
            <span className="stat-unit-muted">({summary.voted} voted)</span>
          </div>
          <div className="segmented-progress">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className={`seg ${
                  votedPercentage >= (index + 1) * 20 ? "filled" : ""
                }`}
              />
            ))}
          </div>
        </div>

        <div className="part-stat-card">
          <div className="part-stat-icon orange-icon">
            <UserX size={17} />
          </div>
          <span className="stat-label">NOT VOTED</span>
          <div className="stat-main">
            <span className="stat-value text-orange">{summary.not_voted}</span>
            <span className="stat-unit">Students</span>
          </div>
          <p className="stat-desc">Have not submitted any ratings</p>
        </div>

        <div className="part-stat-card">
          <div className="part-stat-icon red-icon">
            <AlertTriangle size={17} />
          </div>
          <span className="stat-label">BELOW MINIMUM</span>
          <div className="stat-main">
            <span className="stat-value text-red">{summary.below_minimum}</span>
            <span className="stat-unit">Students</span>
          </div>
          <p className="stat-desc">Required minimum: {minVotes} votes</p>
        </div>
      </div>

      <div className="part-tabs-row">
        <button
          className={`tab-btn ${activeTab === "voted" ? "active" : ""}`}
          onClick={() => setActiveTab("voted")}
        >
          Voted
          <span className="tab-badge cyan">{summary.voted}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "not-voted" ? "active" : ""}`}
          onClick={() => setActiveTab("not-voted")}
        >
          Not voted
          <span className="tab-badge">{summary.not_voted}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "below" ? "active" : ""}`}
          onClick={() => setActiveTab("below")}
        >
          Below minimum
          <span className="tab-badge red">{summary.below_minimum}</span>
        </button>
      </div>

      <div className="part-filter-bar">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search by student name, login or email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button
              className="search-clear"
              onClick={() => setSearchTerm("")}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <select
          className="filter-dropdown"
          value={flagFilter}
          onChange={(event) => setFlagFilter(event.target.value)}
        >
          <option value="all">All students</option>
          <option value="with-flags">With flags</option>
          <option value="without-flags">Without flags</option>
        </select>

        <div className="sort-control">
          <span className="sort-label">SORT:</span>
          <select
            className="sort-dropdown"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="votes-desc">Votes given (high to low)</option>
            <option value="votes-asc">Votes given (low to high)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="last-vote">Latest vote</option>
          </select>
        </div>
      </div>

      <div className="part-table-wrapper">
        {loadingWindows || loadingStats ? (
          <div className="part-loading">
            <RefreshCw size={20} className="spinning" />
            <span>Loading participation data...</span>
          </div>
        ) : (
          <>
            <div className="part-table-scroll">
              <table className="part-table">
                <thead>
                  <tr>
                    <th>STUDENT</th>
                    <th>VOTES GIVEN</th>
                    <th>STARS GIVEN BREAKDOWN</th>
                    <th>LAST VOTE</th>
                    <th>PARTICIPATION STATUS / FLAG</th>
                    <th className="text-right">ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedStudents.map((student) => {
                    const status = getParticipationStatus(student);
                    const progress =
                      maxVotes > 0
                        ? Math.min((student.votes_given / maxVotes) * 100, 100)
                        : 0;

                    return (
                      <tr key={student.user_id}>
                        <td>
                          <div className="student-cell">
                            {student.profile_picture ? (
                              <img
                                className="student-avatar student-avatar-image"
                                src={student.profile_picture}
                                alt=""
                              />
                            ) : (
                              <div className="student-avatar">
                                {getInitials(student.full_name)}
                              </div>
                            )}

                            <div className="student-info">
                              <div className="student-name-row">
                                <span className="student-name">
                                  {student.full_name || student.username}
                                </span>
                              </div>
                              <div className="student-handle">
                                @{student.username}
                              </div>
                              <div className="student-cohort">
                                ID: {student.user_id}
                                {student.email ? ` · ${student.email}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="votes-cell">
                            <div className="votes-count">
                              {student.votes_given} / {maxVotes}
                            </div>
                            <div className="bar-mini-container">
                              <div
                                className="bar-fill"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="breakdown-cell">
                            <span>
                              3★{" "}
                              <strong className="val">
                                {student.three_stars}
                              </strong>
                            </span>
                            <span className="sep">•</span>
                            <span>
                              2★{" "}
                              <strong className="val">
                                {student.two_stars}
                              </strong>
                            </span>
                            <span className="sep">•</span>
                            <span>
                              1★{" "}
                              <strong className="val text-red">
                                {student.one_star}
                              </strong>
                            </span>
                          </div>
                        </td>

                        <td className="last-vote-cell">
                          <Clock3 size={12} />
                          {formatDate(student.last_vote_at)}
                        </td>

                        <td>
                          <div className="status-cell">
                            <span
                              className={`status-badge badge-${status.type}`}
                            >
                              {status.type === "normal" && (
                                <UserCheck size={12} />
                              )}
                              {status.type === "below" && (
                                <AlertTriangle size={12} />
                              )}
                              {status.type === "not-voted" && (
                                <UserX size={12} />
                              )}
                              {status.label}
                            </span>

                            {student.flag_count > 0 && (
                              <span className="flag-indicator">
                                <Flag size={11} />
                                {student.flag_count}
                                {student.max_severity && (
                                  <span
                                    className={getSeverityClass(
                                      student.max_severity,
                                    )}
                                  >
                                    {student.max_severity}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="text-right">
                          <button
                            className="btn-action-view"
                            onClick={() => setSelectedStudent(student)}
                          >
                            <Eye size={13} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedStudents.length === 0 && (
                    <tr>
                      <td colSpan="6">
                        <div className="part-empty">
                          <Users size={24} />
                          <span>No students found</span>
                          <p>
                            Try changing the selected tab or search filters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="part-table-footer">
              <div className="footer-left">
                Showing {firstRow}-{lastRow} of {filteredStudents.length}{" "}
                students
              </div>

              <div className="footer-right">
                <span className="rows-label">Rows per page</span>

                <select
                  className="rows-select"
                  value={rowsPerPage}
                  onChange={(event) =>
                    setRowsPerPage(Number(event.target.value))
                  }
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <div className="pagination">
                  <button
                    className="page-nav"
                    disabled={safeCurrentPage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </button>

                  <span className="page-indicator">
                    {safeCurrentPage} / {totalPages}
                  </span>

                  <button
                    className="page-nav"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedStudent && (
        <div
          className="part-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedStudent(null);
            }
          }}
        >
          <div className="part-modal">
            <div className="part-modal-header">
              <div>
                <span className="part-modal-eyebrow">
                  PARTICIPATION DETAILS
                </span>
                <h2>Student overview</h2>
              </div>

              <button
                className="part-modal-close"
                onClick={() => setSelectedStudent(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="part-modal-student">
              {selectedStudent.profile_picture ? (
                <img
                  src={selectedStudent.profile_picture}
                  alt=""
                  className="part-modal-avatar"
                />
              ) : (
                <div className="part-modal-avatar">
                  {getInitials(selectedStudent.full_name)}
                </div>
              )}

              <div>
                <h3>{selectedStudent.full_name || selectedStudent.username}</h3>
                <p>@{selectedStudent.username}</p>
                <small>
                  {selectedStudent.email || `ID: ${selectedStudent.user_id}`}
                </small>
              </div>
            </div>

            <div className="part-modal-grid">
              <div className="part-modal-stat">
                <span>VOTES GIVEN</span>
                <strong>
                  {selectedStudent.votes_given} / {maxVotes}
                </strong>
              </div>

              <div className="part-modal-stat">
                <span>FLAGS</span>
                <strong>{selectedStudent.flag_count}</strong>
              </div>

              <div className="part-modal-stat">
                <span>LAST VOTE</span>
                <strong>{formatDate(selectedStudent.last_vote_at)}</strong>
              </div>

              <div className="part-modal-stat">
                <span>MINIMUM REQUIRED</span>
                <strong>{selectedStudent.min_votes ?? minVotes}</strong>
              </div>
            </div>

            <div className="part-modal-breakdown">
              <h4>Stars given breakdown</h4>

              <div className="part-breakdown-row">
                <span>3 Stars</span>
                <div className="part-breakdown-track">
                  <div
                    className="part-breakdown-fill three"
                    style={{
                      width: `${
                        selectedStudent.votes_given
                          ? (selectedStudent.three_stars /
                              selectedStudent.votes_given) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <strong>{selectedStudent.three_stars}</strong>
              </div>

              <div className="part-breakdown-row">
                <span>2 Stars</span>
                <div className="part-breakdown-track">
                  <div
                    className="part-breakdown-fill two"
                    style={{
                      width: `${
                        selectedStudent.votes_given
                          ? (selectedStudent.two_stars /
                              selectedStudent.votes_given) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <strong>{selectedStudent.two_stars}</strong>
              </div>

              <div className="part-breakdown-row">
                <span>1 Star</span>
                <div className="part-breakdown-track">
                  <div
                    className="part-breakdown-fill one"
                    style={{
                      width: `${
                        selectedStudent.votes_given
                          ? (selectedStudent.one_star /
                              selectedStudent.votes_given) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <strong>{selectedStudent.one_star}</strong>
              </div>
            </div>

            <div className="part-modal-footer">
              <button
                className="part-modal-done"
                onClick={() => setSelectedStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
