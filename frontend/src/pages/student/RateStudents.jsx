import { useEffect, useMemo, useState, useId } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  UserRound,
  LockKeyhole,
  Star,
  CheckCircle2,
  Circle,
  BarChart3,
  CalendarDays,
  Clock3,
} from "lucide-react";

import api from "../../services/api";
import "./StudentDashboard.css";
import "./RateStudents.css";

const MAX_CHARS = 150;

const OPTIONS = [
  {
    value: 3,
    title: "Excellent",
    desc: "Positive impact on you or the community.",
  },
  {
    value: 2,
    title: "Good",
    desc: "A normal experience or a minor issue.",
  },
  {
    value: 1,
    title: "Bad",
    desc: "A serious issue that needs explanation.",
  },
];

const FLAGS_BY_STARS = {
  3: [
    { id: 1, name: "Helpful" },
    { id: 2, name: "Good Teammate" },
    { id: 3, name: "Community Contributor" },
    { id: 4, name: "Respectful" },
    { id: 5, name: "Fair" },
    { id: 6, name: "Thorough" },
    { id: 7, name: "Clear Explainer" },
    { id: 8, name: "Helpful Feedback" },
    { id: 9, name: "Well Prepared" },
    { id: 10, name: "Knows Their Code" },
    { id: 11, name: "Open to Feedback" },
  ],
  2: [
    { id: 1, name: "Helpful" },
    { id: 4, name: "Respectful" },
    { id: 12, name: "Unreliable Teammate" },
    { id: 13, name: "Disruptive" },
    { id: 14, name: "Rushed" },
    { id: 15, name: "Late" },
    { id: 16, name: "Defensive" },
    { id: 20, name: "Unprepared" },
  ],
  1: [
    { id: 14, name: "Rushed" },
    { id: 15, name: "Late" },
    { id: 17, name: "Aggressive Behavior" },
    { id: 18, name: "Disrespectful" },
    { id: 19, name: "Bad Evaluator" },
    { id: 20, name: "Unprepared" },
  ],
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const getSkillName = (skill) => {
  if (typeof skill === "string") return skill;

  if (skill && typeof skill === "object") {
    return skill.skill_name || skill.name || skill.label || "";
  }

  return "";
};

const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(
    typeof value === "string" ? value.replace(" ", "T") : value,
  );

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatVotingEnd = (value) => {
  const date = parseDate(value);

  if (!date) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDetailedTimeRemaining = (endDate, now) => {
  if (!endDate) return "—";

  const difference = endDate.getTime() - now;

  if (difference <= 0) return "Voting ended";

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  const pad = (number) => String(number).padStart(2, "0");

  return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/* Custom star SVG */

function CustomStar({ size = 24, selected = false }) {
  const generatedId = useId();
  const filterId = `rate-star-filter-${generatedId.replace(/:/g, "")}`;

  const outerColor = selected ? "#01BABD" : "#8292AF";
  const innerColor = selected ? "#007173" : "#C3C3C3";

  const shadowMatrix = selected
    ? "0 0 0 0 0.0355272 0 0 0 0 0.727649 0 0 0 0 0.741585 0 0 0 1 0"
    : "0 0 0 0 0.509804 0 0 0 0 0.572549 0 0 0 0 0.686275 0 0 0 1 0";

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
        d="M13.8253 1.38197C13.5575 0.557923 12.7896 0 11.9231 0H11.8293C10.9629 0 10.195 0.557922 9.92721 1.38197L8.59463 5.48325C8.32688 6.30729 7.55897 6.86522 6.69252 6.86522L2.38013 6.86523C1.51368 6.86523 0.745773 7.42315 0.478024 8.24719L0.44903 8.33643C0.18128 9.16047 0.474598 10.0632 1.17558 10.5725L4.66436 13.1072C5.36534 13.6165 5.65865 14.5193 5.3909 15.3433L4.05834 19.4445C3.79059 20.2685 4.0839 21.1713 4.78487 21.6806L4.8608 21.7357C5.56178 22.245 6.51098 22.245 7.21196 21.7357L10.7007 19.201C11.4017 18.6918 12.3508 18.6918 13.0518 19.201L16.5406 21.7357C17.2416 22.245 18.1908 22.245 18.8917 21.7357L18.9676 21.6806C19.6686 21.1713 19.9619 20.2685 19.6941 19.4445L18.3616 15.3433C18.0938 14.5192 18.3871 13.6165 19.0881 13.1072L22.5769 10.5725C23.2778 10.0632 23.5712 9.16044 23.3034 8.33638L23.2744 8.24712C23.0066 7.42311 22.2387 6.86521 21.3723 6.86521H17.06C16.1935 6.86521 15.4256 6.30729 15.1578 5.48325L13.8253 1.38197Z"
        fill={outerColor}
      />

      <g filter={`url(#${filterId})`}>
        <path
          d="M12.0479 0C12.9143 0 13.6824 0.557866 13.9502 1.38184L15.2832 5.4834C15.551 6.30719 16.3184 6.86507 17.1846 6.86523H21.4971C22.3635 6.86523 23.1316 7.42307 23.3994 8.24707L23.4287 8.33594C23.6965 9.15988 23.4029 10.0629 22.7021 10.5723L19.2129 13.1074C18.9087 13.3285 18.681 13.6235 18.543 13.9541C13.5137 13.4996 9.50964 9.50145 9.04688 4.47461L10.0518 1.38184C10.3195 0.557859 11.0877 9.45599e-05 11.9541 0H12.0479Z"
          fill={innerColor}
        />
      </g>

      <defs>
        <filter
          id={filterId}
          x="9.04688"
          y="0"
          width="16.4805"
          height="13.9541"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="3" />
          <feGaussianBlur stdDeviation="1" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values={shadowMatrix} />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
        </filter>
      </defs>
    </svg>
  );
}

function RatingStars({ count = 0, size = 18, selected = true }) {
  return (
    <div className="rate-star-icons">
      {Array.from({ length: count }, (_, index) => (
        <CustomStar key={index} size={size} selected={selected} />
      ))}
    </div>
  );
}

export default function RateStudents() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const learner = location.state?.learner;

  const ratedUserId =
    searchParams.get("user_id") || learner?.user_id || learner?.id;

  const [rating, setRating] = useState(null);
  const [flags, setFlags] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [votingWindow, setVotingWindow] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [windowLoading, setWindowLoading] = useState(true);

  const [votingProgress, setVotingProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);

  const windowId =
    searchParams.get("window_id") ||
    votingWindow?.window_id ||
    votingWindow?.id;

  const learnerName =
    learner?.full_name ||
    learner?.name ||
    learner?.username ||
    "Selected Learner";

  const learnerUsername = learner?.username
    ? `@${learner.username.replace(/^@/, "")}`
    : "42 Amman Learner";

  /* Load active voting window */

  useEffect(() => {
    let cancelled = false;

    const loadVotingWindow = async () => {
      try {
        const response = await api.get("/voting-windows/active");

        if (!cancelled) {
          setVotingWindow(response.data?.window || null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load voting window:", error);
          setVotingWindow(null);
        }
      } finally {
        if (!cancelled) setWindowLoading(false);
      }
    };

    loadVotingWindow();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Load real voting progress */

  useEffect(() => {
    if (!windowId) {
      setVotingProgress(null);
      return;
    }

    let cancelled = false;

    const loadVotingProgress = async () => {
      setProgressLoading(true);

      try {
        const response = await api.get("/ratings/my-progress", {
          params: { window_id: windowId },
        });

        if (!cancelled) {
          console.log("VOTING PROGRESS RESPONSE:", response.data);

          const data =
            response.data?.progress ||
            response.data?.data?.progress ||
            response.data?.data ||
            response.data;

          setVotingProgress(data || null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load voting progress:", error);
          setVotingProgress(null);
        }
      } finally {
        if (!cancelled) {
          setProgressLoading(false);
        }
      }
    };

    loadVotingProgress();

    return () => {
      cancelled = true;
    };
  }, [windowId]);

  /* Update countdown every second */

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const availableFlags = useMemo(
    () => (rating ? FLAGS_BY_STARS[rating] || [] : []),
    [rating],
  );

  const startsAt = parseDate(votingWindow?.starts_at);
  const endsAt = parseDate(votingWindow?.ends_at);

  const isWindowOpen = Boolean(
    votingWindow &&
    startsAt &&
    endsAt &&
    currentTime >= startsAt.getTime() &&
    currentTime <= endsAt.getTime(),
  );

  /* Read progress values from the API response */

  const progressVotesCast = Number(
    votingProgress?.votes_cast ??
      votingProgress?.votesCast ??
      votingProgress?.completed_votes ??
      votingProgress?.completedVotes ??
      0,
  );

  const progressMaxVotes = Number(
    votingProgress?.max_votes ??
      votingProgress?.maxVotes ??
      votingWindow?.max_votes ??
      0,
  );

  const progressRemainingVotes = Number(
    votingProgress?.remaining_votes ??
      votingProgress?.remainingVotes ??
      Math.max(0, progressMaxVotes - progressVotesCast),
  );

  const progressPercent =
    progressMaxVotes > 0
      ? Math.min(100, Math.max(0, (progressVotesCast / progressMaxVotes) * 100))
      : 0;

  const detailedTimeRemaining = getDetailedTimeRemaining(endsAt, currentTime);

  const votingEnds = formatVotingEnd(votingWindow?.ends_at);

  const toggleFlag = (id) => {
    setFlags((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

    setError("");
  };

  const selectRating = (value) => {
    setRating(value);
    setFlags([]);
    setError("");
  };

  const handleContinue = () => {
    setError("");

    if (!ratedUserId || !windowId) {
      setError("Missing learner or voting session information.");
      return;
    }

    if (!learner) {
      setError(
        "Learner information is missing. Please return to the learners list and select the learner again.",
      );
      return;
    }

    if (!isWindowOpen) {
      setError("The voting window is currently closed.");
      return;
    }

    if (!rating) {
      setError("Please select a rating.");
      return;
    }

    if (rating === 1 && flags.length === 0) {
      setError("Please select at least one flag.");
      return;
    }

    if (rating === 1 && !feedback.trim()) {
      setError("Written feedback is required for a one-star rating.");
      return;
    }

    const selectedFlags = availableFlags.filter((flag) =>
      flags.includes(flag.id),
    );

    navigate("/student/rate/review", {
      state: {
        learner,
        ratedUserId: Number(ratedUserId),
        windowId: Number(windowId),
        rating,
        flags: selectedFlags,
        feedback: feedback.trim(),
        votingWindow: votingWindow
          ? {
              window_id: votingWindow.window_id || votingWindow.id,
              window_name: votingWindow.window_name,
              starts_at: votingWindow.starts_at,
              ends_at: votingWindow.ends_at,
              min_votes: votingWindow.min_votes,
              max_votes: votingWindow.max_votes,
            }
          : null,
      },
    });
  };

  return (
    <div className="student-dashboard rate-students-page">
      <section className="dashboard-heading">
        <div>
          <span className="dashboard-eyebrow">
            42 AMMAN <span className="eyebrow-dot">•</span> STUDENT SPACE
          </span>
          <h1>
            Rate your <span>experience.</span>
          </h1>
          <p>Share honest and constructive feedback with your peers.</p>
        </div>

        <div className="dashboard-date">
          <CalendarDays size={16} />
          <span>Rating & Feedback</span>
        </div>
      </section>

      <Link to="/student/dashboard" className="rate-back-link">
        <ArrowLeft size={15} />
        Back to learners
      </Link>

      <div className="dashboard-layout rate-layout">
        <main className="dashboard-main">
          {/* Learner profile */}

          <section className="student-profile-card rate-learner-card">
            <div className="student-profile-avatar">
              {learner?.profile_picture ? (
                <img
                  src={learner.profile_picture}
                  alt={learnerName}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                getInitials(learnerName) || <UserRound size={25} />
              )}
            </div>

            <div className="student-profile-details">
              <div className="student-name-row">
                <h2>{learnerName}</h2>
                <span className="student-handle">Learner</span>
              </div>

              <p className="student-bio">{learnerUsername}</p>

              {learner?.bio && (
                <p className="rate-learner-bio">{learner.bio}</p>
              )}

              {Array.isArray(learner?.skills) && learner.skills.length > 0 && (
                <div className="rate-learner-skills">
                  {learner.skills.map((skill, index) => {
                    const skillName = getSkillName(skill);
                    if (!skillName) return null;

                    return (
                      <span key={skill.skill_id || skill.id || index}>
                        {skillName}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rate-private-label">
              <LockKeyhole size={14} />
              Private feedback
            </div>
          </section>

          {/* Rating selection */}

          <section className="rate-content-card">
            <div className="rate-section-heading">
              <div>
                <span className="rate-step">01</span>
                <div>
                  <h2>Your Rating</h2>
                  <p>Select the rating that reflects your experience.</p>
                </div>
              </div>

              <span className="rate-required">REQUIRED</span>
            </div>

            <div className="rate-options">
              {OPTIONS.map((option) => {
                const isSelected = rating === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={windowLoading || !isWindowOpen}
                    onClick={() => selectRating(option.value)}
                    className={`rate-option ${isSelected ? "selected" : ""}`}
                  >
                    <div className="rate-option-top">
                      <RatingStars count={option.value} selected={isSelected} />

                      {isSelected ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Circle size={18} />
                      )}
                    </div>

                    <h3>{option.title}</h3>
                    <p>{option.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Feedback labels */}

          {rating !== null && (
            <section className="rate-content-card">
              <div className="rate-section-heading">
                <div>
                  <span className="rate-step">02</span>
                  <div>
                    <h2>Feedback Labels</h2>
                    <p>Choose labels that describe your experience.</p>
                  </div>
                </div>

                <span
                  className={rating === 1 ? "rate-required" : "rate-optional"}
                >
                  {rating === 1 ? "REQUIRED" : "OPTIONAL"}
                </span>
              </div>

              <div className="rate-flags">
                {availableFlags.map((flag) => (
                  <button
                    key={flag.id}
                    type="button"
                    onClick={() => toggleFlag(flag.id)}
                    className={`rate-flag ${
                      flags.includes(flag.id) ? "active" : ""
                    }`}
                  >
                    {flags.includes(flag.id) && <CheckCircle2 size={13} />}
                    {flag.name}
                  </button>
                ))}
              </div>

              {rating === 1 && (
                <p className="rate-hint">
                  At least one label is required for a one-star rating.
                </p>
              )}
            </section>
          )}

          {/* Written feedback */}

          {rating !== null && (
            <section
              className={`rate-content-card ${
                feedback.trim() ? "rate-feedback-active" : ""
              }`}
            >
              <div className="rate-section-heading">
                <div>
                  <span className="rate-step">03</span>
                  <div>
                    <h2>Written Feedback</h2>
                    <p>Explain your experience clearly and respectfully.</p>
                  </div>
                </div>

                <span
                  className={rating === 1 ? "rate-required" : "rate-optional"}
                >
                  {rating === 1 ? "REQUIRED" : "OPTIONAL"}
                </span>
              </div>

              <textarea
                className="rate-textarea"
                value={feedback}
                maxLength={MAX_CHARS}
                onChange={(event) => {
                  setFeedback(event.target.value);
                  setError("");
                }}
                placeholder="Describe your experience..."
              />

              <div className="rate-textarea-footer">
                <span>Be specific, factual and respectful.</span>
                <span>
                  {feedback.length}/{MAX_CHARS}
                </span>
              </div>
            </section>
          )}

          {error && <div className="rate-alert rate-alert-error">{error}</div>}

          {/* Actions */}

          <div className="rate-submit-row">
            <Link to="/student/dashboard" className="rate-cancel-button">
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleContinue}
              disabled={windowLoading || !isWindowOpen}
              className="rate-submit-button"
            >
              Continue to Review
              <ArrowRight size={15} />
            </button>
          </div>
        </main>

        {/* Sidebar */}

        <aside className="dashboard-sidebar">
          {/* Your Voting Progress */}

          <section className="dashboard-widget rate-progress-widget">
            <div className="fr-side-title">Your voting progress</div>

            {progressLoading ? (
              <div className="rate-progress-empty">
                <Clock3 size={20} />
                <p>Loading your voting progress...</p>
              </div>
            ) : votingProgress ? (
              <>
                <div className="fr-votes-number">
                  <span className="votes-current">{progressVotesCast}</span>
                  <span className="votes-total">
                    {" "}
                    / {progressMaxVotes} votes
                  </span>
                </div>

                <div className="fr-progress">
                  <div
                    className="fr-progress-fill"
                    style={{
                      width: `${progressPercent}%`,
                      minWidth: progressVotesCast > 0 ? "4px" : "0",
                    }}
                  />
                </div>

                <div className="fr-remaining">
                  <strong>{progressRemainingVotes}</strong> votes remaining
                </div>

                <div className="fr-deadline">
                  <div className="fr-deadline-label">Time remaining</div>

                  <div className="fr-countdown">{detailedTimeRemaining}</div>

                  <div className="fr-deadline-note">
                    Voting ends: {votingEnds}
                  </div>
                </div>
              </>
            ) : (
              <div className="rate-progress-empty">
                <Clock3 size={20} />
                <p>Voting progress is currently unavailable.</p>
              </div>
            )}
          </section>

          {/* Your Rating */}

          <section className="dashboard-widget rate-your-rating-widget">
            <div className="widget-heading">
              <div className="widget-title">
                <BarChart3 size={16} />
                <h3>Your Rating</h3>
              </div>
            </div>

            <div className="rating-content">
              <div className="rating-score">
                <strong>{rating ?? "—"}</strong>
                <span>/ 3</span>
              </div>

              {rating ? (
                <RatingStars count={rating} size={19} selected />
              ) : (
                <p>Choose your rating</p>
              )}

              {rating && (
                <p>
                  {OPTIONS.find((option) => option.value === rating)?.title}
                </p>
              )}
            </div>

            <div className="privacy-message">
              <LockKeyhole size={14} />
              <p>Your identity remains private from the learner.</p>
            </div>
          </section>

          {/* Rating Guide */}

          <section className="dashboard-widget rate-guide-widget">
            <div className="widget-heading">
              <h3>Rating Guide</h3>
              <Star size={16} />
            </div>

            {OPTIONS.map((option) => (
              <div className="rate-guide-item" key={option.value}>
                <div className="rate-guide-row">
                  <RatingStars count={option.value} size={14} selected />
                  <span>{option.title}</span>
                </div>

                <p>{option.desc}</p>
              </div>
            ))}

            <div className="rate-guide-privacy">
              <LockKeyhole size={15} />
              <p>
                Feedback is private. The learner you rate and other learners
                never see it. Only staff can review it.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
