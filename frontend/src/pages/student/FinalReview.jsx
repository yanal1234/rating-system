import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import api from "../../services/api.js";
import "./FinalReview.css";

function CustomStar({ size = 22, selected = true }) {
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

function parseDate(value) {
  if (!value) return null;

  const date = new Date(
    typeof value === "string" ? value.replace(" ", "T") : value,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function getInitials(name) {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getFlagName(flag) {
  if (typeof flag === "string") return flag;

  return (
    flag?.name ||
    flag?.label ||
    flag?.label_name ||
    flag?.title ||
    "Selected flag"
  );
}

function getFlagId(flag) {
  if (typeof flag === "number") return flag;
  return Number(flag?.id ?? flag?.label_id ?? flag?.value);
}

function getRatingLabel(rating) {
  if (rating === 1) return "Needs attention";
  if (rating === 2) return "Good experience";
  if (rating === 3) return "Excellent experience";
  return "No rating selected";
}

export default function FinalReview() {
  const location = useLocation();
  const navigate = useNavigate();

  const draft = location.state || {};
  const learner = draft.learner || {};
  const rating = Number(draft.rating || 0);
  const flags = Array.isArray(draft.flags) ? draft.flags : [];
  const feedback = String(draft.feedback || "");

  const windowId = Number(draft.windowId);
  const ratedUserId = Number(
    draft.ratedUserId || learner.id || learner.user_id,
  );

  const [progress, setProgress] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [timeLeft, setTimeLeft] = useState("--:--:--");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const learnerName =
    learner.full_name || learner.name || learner.username || "Learner";

  const username = String(learner.username || learner.handle || "").replace(
    /^@/,
    "",
  );

  const avatar =
    learner.profile_picture || learner.profilePicture || learner.avatar || null;

  const votesCast = Number(
    progress?.votes_cast ?? progress?.votesCast ?? progress?.completed ?? 0,
  );

  const maxVotes = Number(
    progress?.max_votes ?? progress?.maxVotes ?? progress?.quota ?? 0,
  );

  const remainingVotes = Number(
    progress?.remaining_votes ??
      progress?.remainingVotes ??
      Math.max(0, maxVotes - votesCast),
  );

  const progressPercent =
    maxVotes > 0 ? Math.min(100, (votesCast / maxVotes) * 100) : 0;

  const formattedDeadline = useMemo(() => {
    if (!deadline) return "Not available";

    return deadline.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [deadline]);

  useEffect(() => {
    if (
      !draft.learner ||
      !windowId ||
      !ratedUserId ||
      ![1, 2, 3].includes(rating)
    ) {
      setLoading(false);
      setError("Review information is missing. Please go back and try again.");
      return;
    }

    let cancelled = false;

    async function loadReviewData() {
      setLoading(true);
      setError("");

      const [progressResult, windowResult] = await Promise.allSettled([
        api.get("/ratings/my-progress", {
          params: { window_id: windowId },
        }),
        api.get("/voting-windows/active"),
      ]);

      if (cancelled) return;

      if (progressResult.status === "fulfilled") {
        const responseData = progressResult.value?.data;

        setProgress(
          responseData?.progress ||
            responseData?.data?.progress ||
            responseData?.data ||
            responseData ||
            null,
        );
      } else {
        console.error("Could not load voting progress:", progressResult.reason);
        setError(
          "Could not load your voting progress. Please check the backend API.",
        );
      }

      if (windowResult.status === "fulfilled") {
        const responseData = windowResult.value?.data;

        const activeWindow =
          responseData?.window ||
          responseData?.activeWindow ||
          responseData?.data?.window ||
          responseData?.data ||
          null;

        const activeWindowId = Number(
          activeWindow?.window_id ?? activeWindow?.id,
        );

        if (!activeWindowId || activeWindowId === windowId) {
          setDeadline(
            parseDate(
              activeWindow?.ends_at ||
                activeWindow?.end_date ||
                activeWindow?.end_time,
            ),
          );
        }
      }

      setLoading(false);
    }

    loadReviewData();

    return () => {
      cancelled = true;
    };
  }, [windowId, ratedUserId, rating]);

  useEffect(() => {
    if (!deadline) {
      setTimeLeft("--:--:--");
      return;
    }

    function updateCountdown() {
      const difference = deadline.getTime() - Date.now();

      if (difference <= 0) {
        setTimeLeft("00:00:00");
        return;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const clock = [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0"),
      ].join(":");

      setTimeLeft(days > 0 ? `${days}d ${clock}` : clock);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  async function handleSubmit() {
    if (submitting || sent) return;

    if (!windowId || !ratedUserId || ![1, 2, 3].includes(rating)) {
      setError("Some rating information is missing.");
      return;
    }

    if (rating === 1 && (!feedback.trim() || flags.length === 0)) {
      setError(
        "A 1-star rating requires written feedback and at least one flag.",
      );
      return;
    }

    const labelIds = flags
      .map(getFlagId)
      .filter((id) => Number.isInteger(id) && id > 0);

    if (labelIds.length !== flags.length) {
      setError(
        "Some selected flags are missing their IDs. Please go back and select them again.",
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.post("/ratings", {
        window_id: windowId,
        rated_user_id: ratedUserId,
        stars: rating,
        labels: labelIds.map((labelId) => ({
          label_id: labelId,
          stars: rating,
        })),
        feedback: feedback.trim() || null,
        interaction_type: "other",
        interaction_details: null,
      });

      setSent(true);
    } catch (err) {
      console.error("Rating submission error:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Something went wrong while submitting your rating. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fr-page">
      <main className="fr-container">
        <div className="fr-heading">
          <div className="fr-eyebrow">Final step</div>
          <h1>Review your feedback</h1>
          <p>
            Take a moment to review your rating before submitting. Your feedback
            is private and anonymous.
          </p>
        </div>

        {!draft.learner ? (
          <div className="fr-card">
            <div className="fr-loading">
              Review information is missing. Please return to the rating page.
              <div className="fr-error-actions">
                <button
                  className="fr-back"
                  onClick={() => navigate(-1)}
                  type="button"
                >
                  Go back
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="fr-layout">
            <section className="fr-card">
              <div className="fr-card-head">
                <div className="fr-card-title">Rating summary</div>
                <div className="fr-step">STEP 03 / 03</div>
              </div>

              <div className="fr-card-body">
                <div className="fr-learner">
                  <div className="fr-avatar">
                    {avatar ? (
                      <img src={avatar} alt={learnerName} />
                    ) : (
                      getInitials(learnerName)
                    )}
                  </div>

                  <div>
                    <div className="fr-learner-name">{learnerName}</div>
                    <div className="fr-learner-handle">
                      {username ? `@${username}` : "42 Learner"}
                    </div>
                  </div>
                </div>

                <div className="fr-section">
                  <div className="fr-label">Your rating</div>

                  <div className="fr-rating-box">
                    <div className="fr-stars">
                      {[1, 2, 3].map((star) => (
                        <CustomStar
                          key={star}
                          size={22}
                          selected={star <= rating}
                        />
                      ))}
                    </div>

                    <div className="fr-rating-text">
                      {getRatingLabel(rating)}
                    </div>
                  </div>
                </div>

                <div className="fr-section">
                  <div className="fr-label">Selected flags</div>

                  {flags.length > 0 ? (
                    <div className="fr-flags">
                      {flags.map((flag, index) => (
                        <span
                          className="fr-flag"
                          key={flag?.id ?? flag?.label_id ?? index}
                        >
                          {getFlagName(flag)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="fr-empty">No flags selected</div>
                  )}
                </div>

                <div className="fr-section">
                  <div className="fr-label">Written feedback</div>
                  <div className="fr-feedback">
                    {feedback.trim() || "No written feedback provided."}
                  </div>
                </div>

                <div className="fr-privacy">
                  <LockKeyhole
                    className="fr-privacy-icon"
                    size={17}
                    strokeWidth={2.2}
                  />
                  <span>
                    Your identity will remain private. The learner will receive
                    the feedback without knowing who submitted it.
                  </span>
                </div>

                {error && <div className="fr-error">{error}</div>}

                {sent && (
                  <div className="fr-success">
                    Your rating has been submitted successfully.
                  </div>
                )}

                <div className="fr-actions">
                  <button
                    className="fr-back"
                    onClick={() => navigate(-1)}
                    type="button"
                    disabled={submitting || sent}
                  >
                    ← Edit rating
                  </button>

                  <button
                    className="fr-submit"
                    onClick={handleSubmit}
                    type="button"
                    disabled={loading || submitting || sent}
                  >
                    {sent
                      ? "✓ Submitted"
                      : submitting
                        ? "Submitting..."
                        : "Submit feedback →"}
                  </button>
                </div>
              </div>
            </section>

            <aside className="fr-side">
              <div className="fr-side-card">
                <div className="fr-side-title">Your voting progress</div>

                {loading ? (
                  <div className="fr-loading">Loading progress...</div>
                ) : (
                  <>
                    <div className="fr-votes-number">
                      <strong>{votesCast}</strong>
                      <span>/ {maxVotes > 0 ? maxVotes : "—"} votes</span>
                    </div>

                    <div className="fr-progress">
                      <div
                        className="fr-progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="fr-remaining">
                      <strong>{remainingVotes}</strong> votes remaining
                    </div>
                  </>
                )}

                <div className="fr-deadline">
                  <div className="fr-deadline-label">Time remaining</div>
                  <div className="fr-countdown">{timeLeft}</div>
                  <div className="fr-deadline-note">
                    {deadline
                      ? `Voting ends: ${formattedDeadline}`
                      : "Voting deadline unavailable"}
                  </div>
                </div>
              </div>

              <div className="fr-side-card">
                <div className="fr-side-title">Rating guide</div>

                <div className="fr-guide-item">
                  <div className="fr-guide-stars">
                    {[1, 2, 3].map((star) => (
                      <CustomStar key={star} size={15} />
                    ))}
                  </div>
                  <div className="fr-guide-text">
                    <strong>Excellent</strong>
                    <span>Outstanding experience</span>
                  </div>
                </div>

                <div className="fr-guide-item">
                  <div className="fr-guide-stars">
                    {[1, 2].map((star) => (
                      <CustomStar key={star} size={15} />
                    ))}
                  </div>
                  <div className="fr-guide-text">
                    <strong>Good</strong>
                    <span>Positive experience</span>
                  </div>
                </div>

                <div className="fr-guide-item">
                  <div className="fr-guide-stars">
                    <CustomStar size={15} />
                  </div>
                  <div className="fr-guide-text">
                    <strong>Needs attention</strong>
                    <span>Feedback and a flag required</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
