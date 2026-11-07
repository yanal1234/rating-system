import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Eye,
  X,
  Check,
  Clock3,
  FileText,
  Filter,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

import api from "../../services/api";
import "./ManageRatings.css";

const moderationLabels = {
  normal: "Normal",
  suspicious: "Suspicious",
  under_review: "Under Review",
  confirmed_abuse: "Confirmed Abuse",
};

const statusLabels = {
  valid: "Valid",
  invalid: "Invalid",
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString();
};

const getErrorMessage = (error) =>
  error.response?.data?.message || "Something went wrong. Please try again.";

function CustomStar({ size = 15, selected = true }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M13.8253 1.38197C13.5575 0.557923 12.7896 0 11.9231 0H11.8293C10.9629 0 10.195 0.557922 9.92721 1.38197L8.59463 5.48325C8.32688 6.30729 7.55897 6.86522 6.69252 6.86522L2.38013 6.86523C1.51368 6.86523 0.745773 7.42315 0.478024 8.24719L0.44903 8.33643C0.18128 9.16047 0.474598 10.0632 1.17558 10.5725L4.66436 13.1072C5.36534 13.6165 5.65865 14.5193 5.3909 15.3433L4.05834 19.4445C3.79059 20.2685 4.0839 21.1713 4.78487 21.6806L4.8608 21.7357C5.56178 22.245 6.51098 22.245 7.21196 21.7357L10.7007 19.201C11.4017 18.6918 12.3508 18.6918 13.0518 19.201L16.5406 21.7357C17.2416 22.245 18.1908 22.245 18.8917 21.7357L18.9676 21.6806C19.6686 21.1713 19.9619 20.2685 19.6941 19.4445L18.3616 15.3433C18.0938 14.5192 18.3871 13.6163 19.0881 13.1072L22.5769 10.5725C23.2778 10.0632 23.5712 9.16044 23.3034 8.33638L23.2744 8.24712C23.0066 7.42311 22.2387 6.86521 21.3723 6.86521H17.06C16.1935 6.86521 15.4256 6.30729 15.1578 5.48325L13.8253 1.38197Z"
        fill={selected ? "#01BABD" : "#8292AF"}
      />
      <path
        d="M12.0479 0C12.9143 0 13.6824 0.557866 13.9502 1.38184L15.2832 5.4834C15.551 6.30719 16.3184 6.86507 17.1846 6.86523H21.4971C22.3635 6.86523 23.1316 7.42307 23.3994 8.24707L23.4287 8.33594C23.6965 9.15988 23.4029 10.0629 22.7021 10.5723L19.2129 13.1074C18.9087 13.3285 18.681 13.6235 18.543 13.9541C13.5137 13.4996 9.50964 9.50145 9.04688 4.47461L10.0518 1.38184C10.3195 0.557859 11.0877 9.45599e-05 11.9541 0H12.0479Z"
        fill={selected ? "#007173" : "#C3C3C3"}
      />
    </svg>
  );
}

function Stars({ value }) {
  const rating = Number(value);

  return (
    <div className="rm-stars">
      {[1, 2, 3].map((star) => (
        <CustomStar key={star} size={15} selected={star <= rating} />
      ))}
      <span>{value}/3</span>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`rm-badge rm-status-${status || "unknown"}`}>
      <span className="rm-badge-dot" />
      {statusLabels[status] || status || "Unknown"}
    </span>
  );
}

function ModerationBadge({ status }) {
  return (
    <span className={`rm-badge rm-moderation-${status || "normal"}`}>
      {status === "confirmed_abuse" ? (
        <ShieldAlert size={13} />
      ) : status === "under_review" || status === "suspicious" ? (
        <AlertTriangle size={13} />
      ) : (
        <ShieldCheck size={13} />
      )}
      {moderationLabels[status] || status || "Normal"}
    </span>
  );
}

export default function ManageRatings() {
  const [windows, setWindows] = useState([]);
  const [selectedWindow, setSelectedWindow] = useState("");

  const [ratings, setRatings] = useState([]);
  const [loadingWindows, setLoadingWindows] = useState(true);
  const [loadingRatings, setLoadingRatings] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moderationFilter, setModerationFilter] = useState("all");
  const [starsFilter, setStarsFilter] = useState("all");

  const [selectedRating, setSelectedRating] = useState(null);
  const [modalType, setModalType] = useState("");
  const [reason, setReason] = useState("");
  const [moderationStatus, setModerationStatus] = useState("under_review");

  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const showNotice = (type, message) => {
    setNotice({ type, message });

    window.setTimeout(() => {
      setNotice(null);
    }, 4000);
  };

  const fetchWindows = useCallback(async () => {
    try {
      setLoadingWindows(true);

      const response = await api.get("/voting-windows");
      const list = response.data.windows || [];

      setWindows(list);

      if (list.length > 0) {
        setSelectedWindow((current) => {
          if (
            current &&
            list.some((item) => String(item.window_id) === String(current))
          ) {
            return current;
          }

          const published = list.find((item) => item.status === "published");

          return String((published || list[0]).window_id);
        });
      } else {
        setSelectedWindow("");
      }
    } catch (error) {
      showNotice("error", getErrorMessage(error));
    } finally {
      setLoadingWindows(false);
    }
  }, []);

  const fetchRatings = useCallback(async () => {
    if (!selectedWindow) {
      setRatings([]);
      return;
    }

    try {
      setLoadingRatings(true);

      const response = await api.get(`/ratings/window/${selectedWindow}`);

      setRatings(response.data.ratings || []);
    } catch (error) {
      setRatings([]);
      showNotice("error", getErrorMessage(error));
    } finally {
      setLoadingRatings(false);
    }
  }, [selectedWindow]);

  useEffect(() => {
    fetchWindows();
  }, [fetchWindows]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const filteredRatings = useMemo(() => {
    return ratings.filter((rating) => {
      const searchValue = search.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        String(rating.rating_id).includes(searchValue) ||
        (rating.voter_username || "").toLowerCase().includes(searchValue) ||
        (rating.rated_username || "").toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "all" || rating.status === statusFilter;

      const matchesModeration =
        moderationFilter === "all" ||
        rating.moderation_status === moderationFilter;

      const matchesStars =
        starsFilter === "all" || String(rating.stars) === starsFilter;

      return (
        matchesSearch && matchesStatus && matchesModeration && matchesStars
      );
    });
  }, [ratings, search, statusFilter, moderationFilter, starsFilter]);

  const stats = useMemo(() => {
    return {
      total: ratings.length,
      valid: ratings.filter((item) => item.status === "valid").length,
      invalid: ratings.filter((item) => item.status === "invalid").length,
      review: ratings.filter(
        (item) =>
          item.moderation_status === "under_review" ||
          item.moderation_status === "suspicious",
      ).length,
    };
  }, [ratings]);

  const openInvalidateModal = (rating) => {
    setSelectedRating(rating);
    setReason("");
    setModalType("invalidate");
  };

  const openModerationModal = (rating) => {
    setSelectedRating(rating);
    setReason("");
    setModerationStatus(rating.moderation_status || "normal");
    setModalType("moderation");
  };

  const closeModal = () => {
    if (actionLoading) return;

    setSelectedRating(null);
    setModalType("");
    setReason("");
  };

  const handleInvalidate = async (event) => {
    event.preventDefault();

    if (!selectedRating || !reason.trim()) return;

    try {
      setActionLoading(true);

      await api.patch(`/ratings/${selectedRating.rating_id}/invalidate`, {
        invalidation_reason: reason.trim(),
      });

      showNotice("success", "Rating invalidated successfully.");

      closeModal();
      await fetchRatings();
    } catch (error) {
      showNotice("error", getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleModeration = async (event) => {
    event.preventDefault();

    if (!selectedRating || !reason.trim()) return;

    try {
      setActionLoading(true);

      await api.patch(`/ratings/${selectedRating.rating_id}/moderation`, {
        moderation_status: moderationStatus,
        reason: reason.trim(),
      });

      showNotice("success", "Moderation status updated successfully.");

      closeModal();
      await fetchRatings();
    } catch (error) {
      showNotice("error", getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const selectedWindowName =
    windows.find((item) => String(item.window_id) === String(selectedWindow))
      ?.window_name || "Select a voting window";

  return (
    <div className="ratings-management">
      <div className="rm-page-header">
        <div>
          <div className="rm-eyebrow">STAFF CONTROL PANEL</div>
          <h1>Ratings Management</h1>
          <p>Review, monitor and manage submitted ratings.</p>
        </div>

        <button
          className="rm-refresh-btn"
          onClick={() => {
            fetchWindows();
            fetchRatings();
          }}
          disabled={loadingRatings || loadingWindows}
        >
          <RefreshCw
            size={15}
            className={loadingRatings || loadingWindows ? "rm-spinning" : ""}
          />
          Refresh
        </button>
      </div>

      {notice && (
        <div className={`rm-notice rm-notice-${notice.type}`}>
          {notice.type === "success" ? (
            <Check size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      <div className="rm-window-bar">
        <div className="rm-window-label">
          <Clock3 size={16} />
          <span>Voting Window</span>
        </div>

        <div className="rm-window-select-wrap">
          <select
            value={selectedWindow}
            onChange={(event) => setSelectedWindow(event.target.value)}
            disabled={loadingWindows || windows.length === 0}
          >
            {windows.length === 0 && (
              <option value="">No voting windows available</option>
            )}

            {windows.map((item) => (
              <option key={item.window_id} value={item.window_id}>
                {item.window_name} — {item.status}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </div>

        <span className="rm-window-name">{selectedWindowName}</span>
      </div>

      <div className="rm-stats-grid">
        <div className="rm-stat-card">
          <div className="rm-stat-icon cyan">
            <FileText size={18} />
          </div>
          <div>
            <span>Total Ratings</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="rm-stat-card">
          <div className="rm-stat-icon green">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span>Valid Ratings</span>
            <strong>{stats.valid}</strong>
          </div>
        </div>

        <div className="rm-stat-card">
          <div className="rm-stat-icon red">
            <Ban size={18} />
          </div>
          <div>
            <span>Invalidated</span>
            <strong>{stats.invalid}</strong>
          </div>
        </div>

        <div className="rm-stat-card">
          <div className="rm-stat-icon orange">
            <ShieldAlert size={18} />
          </div>
          <div>
            <span>Needs Review</span>
            <strong>{stats.review}</strong>
          </div>
        </div>
      </div>

      <div className="rm-toolbar">
        <div className="rm-search">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search by rating ID or learner..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="rm-filter">
          <Filter size={15} />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
          </select>
        </div>

        <div className="rm-filter">
          <ShieldAlert size={15} />
          <select
            value={moderationFilter}
            onChange={(event) => setModerationFilter(event.target.value)}
          >
            <option value="all">All moderation</option>
            <option value="normal">Normal</option>
            <option value="suspicious">Suspicious</option>
            <option value="under_review">Under Review</option>
            <option value="confirmed_abuse">Confirmed Abuse</option>
          </select>
        </div>

        <div className="rm-filter">
          <select
            value={starsFilter}
            onChange={(event) => setStarsFilter(event.target.value)}
          >
            <option value="all">All stars</option>
            <option value="1">1 Star</option>
            <option value="2">2 Stars</option>
            <option value="3">3 Stars</option>
          </select>
        </div>
      </div>

      <div className="rm-table-card">
        <div className="rm-table-header">
          <div>
            <h2>Submitted Ratings</h2>
            <p>Ratings recorded during this voting window</p>
          </div>

          <span className="rm-results-count">
            {filteredRatings.length} results
          </span>
        </div>

        {loadingWindows || loadingRatings ? (
          <div className="rm-empty-state">
            <RefreshCw size={23} className="rm-spinning" />
            <span>Loading ratings...</span>
          </div>
        ) : !selectedWindow ? (
          <div className="rm-empty-state">
            <Clock3 size={25} />
            <strong>No voting window selected</strong>
            <span>Create a voting window to manage its ratings.</span>
          </div>
        ) : filteredRatings.length === 0 ? (
          <div className="rm-empty-state">
            <Search size={25} />
            <strong>No ratings found</strong>
            <span>Try changing your search or filters.</span>
          </div>
        ) : (
          <div className="rm-table-scroll">
            <table className="rm-table">
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Voter</th>
                  <th>Rated Learner</th>
                  <th>Stars</th>
                  <th>Status</th>
                  <th>Moderation</th>
                  <th>Weight</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRatings.map((rating) => (
                  <tr key={rating.rating_id}>
                    <td>
                      <span className="rm-id">#{rating.rating_id}</span>
                    </td>

                    <td>
                      <span className="rm-person">
                        {rating.voter_username || `User #${rating.voter_id}`}
                      </span>
                    </td>

                    <td>
                      <span className="rm-person">
                        {rating.rated_username ||
                          `User #${rating.rated_user_id}`}
                      </span>
                    </td>

                    <td>
                      <Stars value={rating.stars} />
                    </td>

                    <td>
                      <StatusBadge status={rating.status} />
                    </td>

                    <td>
                      <ModerationBadge status={rating.moderation_status} />
                    </td>

                    <td>
                      <span className="rm-weight">
                        {Number(rating.weight ?? 1).toFixed(2)}
                      </span>
                    </td>

                    <td>
                      <span className="rm-date">
                        {formatDate(rating.created_at)}
                      </span>
                    </td>

                    <td>
                      <div className="rm-actions">
                        <button
                          className="rm-action-btn view"
                          title="View details"
                          onClick={() => {
                            setSelectedRating(rating);
                            setModalType("details");
                          }}
                        >
                          <Eye size={15} />
                        </button>

                        {rating.status !== "invalid" && (
                          <>
                            <button
                              className="rm-action-btn review"
                              title="Update moderation"
                              onClick={() => openModerationModal(rating)}
                            >
                              <ShieldAlert size={15} />
                            </button>

                            <button
                              className="rm-action-btn invalidate"
                              title="Invalidate rating"
                              onClick={() => openInvalidateModal(rating)}
                            >
                              <Ban size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalType && selectedRating && (
        <div
          className="rm-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="rm-modal">
            <div className="rm-modal-header">
              <div>
                <span className="rm-eyebrow">
                  RATING #{selectedRating.rating_id}
                </span>
                <h2>
                  {modalType === "details"
                    ? "Rating Details"
                    : modalType === "invalidate"
                      ? "Invalidate Rating"
                      : "Moderation Review"}
                </h2>
              </div>

              <button
                className="rm-modal-close"
                onClick={closeModal}
                disabled={actionLoading}
              >
                <X size={18} />
              </button>
            </div>

            {modalType === "details" ? (
              <div className="rm-details">
                <div className="rm-detail-grid">
                  <div>
                    <span>Voter</span>
                    <strong>
                      {selectedRating.voter_username ||
                        `User #${selectedRating.voter_id}`}
                    </strong>
                  </div>

                  <div>
                    <span>Rated Learner</span>
                    <strong>
                      {selectedRating.rated_username ||
                        `User #${selectedRating.rated_user_id}`}
                    </strong>
                  </div>

                  <div>
                    <span>Stars</span>
                    <Stars value={selectedRating.stars} />
                  </div>

                  <div>
                    <span>Weight</span>
                    <strong>
                      {Number(selectedRating.weight ?? 1).toFixed(2)}
                    </strong>
                  </div>

                  <div>
                    <span>Rating Status</span>
                    <StatusBadge status={selectedRating.status} />
                  </div>

                  <div>
                    <span>Moderation</span>
                    <ModerationBadge
                      status={selectedRating.moderation_status}
                    />
                  </div>

                  <div>
                    <span>Interaction Type</span>
                    <strong>{selectedRating.interaction_type || "—"}</strong>
                  </div>

                  <div>
                    <span>Submitted At</span>
                    <strong>{formatDate(selectedRating.created_at)}</strong>
                  </div>
                </div>

                <div className="rm-detail-section">
                  <span>Feedback</span>
                  <p>{selectedRating.feedback || "No feedback provided."}</p>
                </div>

                {selectedRating.interaction_details && (
                  <div className="rm-detail-section">
                    <span>Interaction Details</span>
                    <p>{selectedRating.interaction_details}</p>
                  </div>
                )}

                {selectedRating.status === "invalid" && (
                  <div className="rm-invalid-info">
                    <Ban size={16} />
                    <div>
                      <strong>This rating has been invalidated.</strong>
                      <p>
                        {selectedRating.invalidation_reason ||
                          "No reason provided."}
                      </p>
                      <small>{formatDate(selectedRating.invalidated_at)}</small>
                    </div>
                  </div>
                )}

                <button
                  className="rm-primary-btn rm-full-btn"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                className="rm-action-form"
                onSubmit={
                  modalType === "invalidate"
                    ? handleInvalidate
                    : handleModeration
                }
              >
                <div className="rm-target-info">
                  <span>Rating #{selectedRating.rating_id}</span>
                  <strong>
                    {selectedRating.voter_username ||
                      `User #${selectedRating.voter_id}`}
                    <span className="rm-arrow">→</span>
                    {selectedRating.rated_username ||
                      `User #${selectedRating.rated_user_id}`}
                  </strong>
                </div>

                {modalType === "invalidate" ? (
                  <div className="rm-warning">
                    <AlertTriangle size={17} />
                    <p>
                      This will mark the rating as invalid. The original rating
                      and its audit history will be preserved.
                    </p>
                  </div>
                ) : (
                  <div className="rm-form-group">
                    <label>Moderation Status</label>
                    <select
                      value={moderationStatus}
                      onChange={(event) =>
                        setModerationStatus(event.target.value)
                      }
                    >
                      <option value="normal">Normal</option>
                      <option value="suspicious">Suspicious</option>
                      <option value="under_review">Under Review</option>
                      <option value="confirmed_abuse">Confirmed Abuse</option>
                    </select>

                    <p className="rm-field-hint">
                      Under Review and Confirmed Abuse ratings receive zero
                      weight according to the moderation rules.
                    </p>
                  </div>
                )}

                <div className="rm-form-group">
                  <label>
                    {modalType === "invalidate"
                      ? "Reason for invalidation"
                      : "Review reason"}
                    <span className="rm-required">*</span>
                  </label>

                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Write a clear reason..."
                    maxLength={500}
                    rows={4}
                    required
                  />

                  <div className="rm-character-count">{reason.length}/500</div>
                </div>

                <div className="rm-modal-actions">
                  <button
                    type="button"
                    className="rm-secondary-btn"
                    onClick={closeModal}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className={
                      modalType === "invalidate"
                        ? "rm-danger-btn"
                        : "rm-primary-btn"
                    }
                    disabled={actionLoading || !reason.trim()}
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw size={15} className="rm-spinning" />
                        Saving...
                      </>
                    ) : modalType === "invalidate" ? (
                      <>
                        <Ban size={15} />
                        Invalidate Rating
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        Save Review
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
