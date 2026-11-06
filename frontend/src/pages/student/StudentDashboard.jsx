import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  LayoutGrid,
  List,
  UserRound,
  Users,
  LockKeyhole,
  ArrowUpRight,
  CalendarDays,
  BarChart3,
  Gauge,
  SlidersHorizontal,
  LoaderCircle,
  Clock3,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import { getActiveVotingWindow } from "../../services/votingWindows";
import { getEligibleParticipants } from "../../services/participants";
import { getMyRatingStats } from "../../services/ratings";

import "./StudentDashboard.css";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const extractWindow = (response) => {
  const candidates = [
    response?.window,
    response?.activeWindow,
    response?.votingWindow,
    response?.data?.window,
    response?.data,
    response,
  ];

  return (
    candidates.find(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        (item.window_id || item.id),
    ) || null
  );
};

const extractParticipants = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.participants)) return response.participants;
  if (Array.isArray(response?.data?.participants))
    return response.data.participants;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getRemainingTime = (endDate, currentTime) => {
  if (!endDate) return "Not specified";

  const difference = new Date(endDate).getTime() - currentTime;

  if (Number.isNaN(difference)) return "Not specified";
  if (difference <= 0) return "Voting ended";

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / (1000 * 60)) % 60);
  const seconds = Math.floor((difference / 1000) % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;

  return `${minutes}m ${seconds}s`;
};

const formatDate = (date) => {
  if (!date) return "No deadline specified";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "No deadline specified";
  }

  return parsedDate.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getSkillName = (skill) => {
  if (typeof skill === "string") return skill;

  if (skill && typeof skill === "object") {
    return skill.name || skill.skill_name || skill.label || skill.title || "";
  }

  return "";
};

const ProfileAvatar = ({ src, name, className = "" }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const initials = getInitials(name);

  return (
    <div className={className}>
      {src && !imageError ? (
        <img
          src={src}
          alt={`${name} profile`}
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{initials || <UserRound size={22} />}</span>
      )}
    </div>
  );
};

const RatingStar = ({ filled = false, size = 18 }) => {
  const uniqueId = useId().replace(/:/g, "");
  const filterId = `star-shadow-${uniqueId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`rating-star-svg ${filled ? "filled" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M13.8253 1.38197C13.5575 0.557923 12.7896 0 11.9231 0H11.8293C10.9629 0 10.195 0.557922 9.92721 1.38197L8.59463 5.48325C8.32688 6.30729 7.55897 6.86522 6.69252 6.86522L2.38013 6.86523C1.51368 6.86523 0.745773 7.42315 0.478024 8.24719L0.44903 8.33643C0.18128 9.16047 0.474598 10.0632 1.17558 10.5725L4.66436 13.1072C5.36534 13.6165 5.65865 14.5193 5.3909 15.3433L4.05834 19.4445C3.79059 20.2685 4.0839 21.1713 4.78487 21.6806L4.8608 21.7357C5.56178 22.245 6.51098 22.245 7.21196 21.7357L10.7007 19.201C11.4017 18.6918 12.3508 18.6918 13.0518 19.201L16.5406 21.7357C17.2416 22.245 18.1908 22.245 18.8917 21.7357L18.9676 21.6806C19.6686 21.1713 19.9619 20.2685 19.6941 19.4445L18.3616 15.3433C18.0938 14.5192 18.3871 13.6165 19.0881 13.1072L22.5769 10.5725C23.2778 10.0632 23.5712 9.16044 23.3034 8.33638L23.2744 8.24712C23.0066 7.42311 22.2387 6.86521 21.3723 6.86521H17.06C16.1935 6.86521 15.4256 6.30729 15.1578 5.48325L13.8253 1.38197Z"
        fill={filled ? "#01BABD" : "transparent"}
        stroke={filled ? "none" : "#66758a"}
        strokeWidth={filled ? 0 : 1}
      />

      {filled && (
        <>
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
              <feComposite
                in2="hardAlpha"
                operator="arithmetic"
                k2="-1"
                k3="1"
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.0355272 0 0 0 0 0.727649 0 0 0 0 0.741585 0 0 0 1 0"
              />
              <feBlend in2="shape" result="effect1_innerShadow" />
            </filter>
          </defs>

          <path
            d="M12.0479 0C12.9143 0 13.6824 0.557866 13.9502 1.38184L15.2832 5.4834C15.551 6.30719 16.3184 6.86507 17.1846 6.86523H21.4971C22.3635 6.86523 23.1316 7.42307 23.3994 8.24707L23.4287 8.33594C23.6965 9.15988 23.4029 10.0629 22.7021 10.5723L19.2129 13.1074C18.9087 13.3285 18.681 13.6235 18.543 13.9541C13.5137 13.4996 9.50964 9.50145 9.04688 4.47461L10.0518 1.38184C10.3195 0.557859 11.0877 9.45599e-05 11.9541 0H12.0479Z"
            fill="#007173"
            filter={`url(#${filterId})`}
          />
        </>
      )}
    </svg>
  );
};

const StudentDashboard = () => {
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  const [activeWindow, setActiveWindow] = useState(null);
  const [learners, setLearners] = useState([]);
  const [ratingStats, setRatingStats] = useState(null);

  const [windowLoading, setWindowLoading] = useState(true);
  const [learnersLoading, setLearnersLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const [windowError, setWindowError] = useState("");
  const [learnersError, setLearnersError] = useState("");
  const [statsError, setStatsError] = useState("");

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        setWindowLoading(true);
        setWindowError("");
        setLearnersError("");
        setActiveWindow(null);
        setLearners([]);
        setRatingStats(null);

        const response = await getActiveVotingWindow();

        if (!isMounted) return;

        const windowData = extractWindow(response);

        if (
          !windowData ||
          (windowData.status && windowData.status.toLowerCase() !== "published")
        ) {
          setActiveWindow(null);
          return;
        }

        const windowId = windowData.window_id || windowData.id;

        setActiveWindow(windowData);
        setLearnersLoading(true);

        try {
          const participantsResponse = await getEligibleParticipants(windowId);

          if (!isMounted) return;

          setLearners(extractParticipants(participantsResponse));
        } catch (error) {
          if (!isMounted) return;

          console.error("Failed to fetch eligible learners:", error);

          setLearnersError(
            error.response?.data?.message ||
              "Unable to load learners. Please try again.",
          );
        } finally {
          if (isMounted) setLearnersLoading(false);
        }
      } catch (error) {
        if (!isMounted) return;

        if (error.response?.status === 404) {
          setActiveWindow(null);
          setWindowError("");
        } else {
          console.error("Failed to fetch active voting window:", error);

          setWindowError(
            error.response?.data?.message ||
              "Unable to check the voting session. Please try again later.",
          );
        }
      } finally {
        if (isMounted) setWindowLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const windowId = activeWindow?.window_id || activeWindow?.id;

    if (!windowId) {
      setRatingStats(null);
      setStatsError("");
      return;
    }

    let isMounted = true;

    const fetchMyStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError("");

        const stats = await getMyRatingStats(windowId);

        if (isMounted) {
          setRatingStats(stats);
        }
      } catch (error) {
        if (!isMounted) return;

        console.error("Failed to fetch student statistics:", error);

        setRatingStats(null);

        setStatsError(
          error.response?.data?.message ||
            "Unable to load your rating statistics.",
        );
      } finally {
        if (isMounted) setStatsLoading(false);
      }
    };

    fetchMyStats();

    return () => {
      isMounted = false;
    };
  }, [activeWindow]);

  const isVotingActive = Boolean(activeWindow) && !windowLoading;

  const remainingTime = getRemainingTime(
    ratingStats?.ends_at || activeWindow?.ends_at,
    currentTime,
  );

  const maxVotes = Number(
    ratingStats?.max_votes || activeWindow?.max_votes || 0,
  );

  const submittedCount = Number(ratingStats?.submitted_count || 0);

  const remainingVotes = Number(
    ratingStats?.remaining_votes ?? Math.max(0, maxVotes - submittedCount),
  );

  const progressPercentage = Math.min(
    100,
    Math.max(0, Number(ratingStats?.progress_percentage || 0)),
  );

  const averageRating =
    ratingStats?.average_rating == null
      ? null
      : Number(ratingStats.average_rating);

  const fullName = user?.full_name || user?.name || user?.username || "Student";
  const username = user?.username || "student";
  const firstName = fullName.split(" ")[0];

  const profileSkills = Array.isArray(user?.skills) ? user.skills : [];

  const filteredLearners = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return learners;

    return learners.filter((learner) => {
      const name = (learner.full_name || learner.name || "").toLowerCase();
      const learnerUsername = (learner.username || "").toLowerCase();
      const bio = (learner.bio || "").toLowerCase();

      const skills = Array.isArray(learner.skills)
        ? learner.skills.map(getSkillName).join(" ").toLowerCase()
        : "";

      return (
        name.includes(query) ||
        learnerUsername.includes(query) ||
        bio.includes(query) ||
        skills.includes(query)
      );
    });
  }, [searchTerm, learners]);

  const getVotingMessage = () => {
    if (windowLoading) return "Checking voting session...";
    if (windowError) return windowError;

    return "Searching and rating learners are unavailable because there is no active voting session.";
  };

  const getSessionStatus = () => {
    if (windowLoading) return "Checking session...";
    if (windowError) return "Unable to check session";
    if (isVotingActive) return "Voting session active";

    return "No active session";
  };

  const distribution = [
    { stars: 3, data: ratingStats?.distribution?.three_stars },
    { stars: 2, data: ratingStats?.distribution?.two_stars },
    { stars: 1, data: ratingStats?.distribution?.one_star },
  ];

  return (
    <div className="student-dashboard">
      <section className="dashboard-heading">
        <div>
          <span className="dashboard-eyebrow">
            42 AMMAN <span className="eyebrow-dot">•</span> STUDENT SPACE
          </span>

          <h1>
            Welcome back, <span>{firstName}.</span>
          </h1>

          <p>Connect with your peers and make every interaction count.</p>
        </div>

        <div className="dashboard-date">
          <CalendarDays size={16} />
          <span>Student Dashboard</span>
        </div>
      </section>

      <div className="dashboard-layout">
        <main className="dashboard-main">
          <section className="student-profile-card">
            <ProfileAvatar
              src={user?.profile_picture}
              name={fullName}
              className="student-profile-avatar"
            />

            <div className="student-profile-details">
              <div className="student-name-row">
                <h2>{fullName}</h2>
                <span className="student-handle">@{username}</span>
              </div>

              <p className="student-bio">
                {user?.bio?.trim() || "No bio added yet."}
              </p>

              <div className="student-profile-skills">
                {profileSkills.length > 0 ? (
                  profileSkills.map((skill, index) => {
                    const skillName = getSkillName(skill);
                    if (!skillName) return null;

                    return (
                      <span key={skill.skill_id || skill.id || index}>
                        {skillName}
                      </span>
                    );
                  })
                ) : (
                  <span className="profile-no-skills">No skills added yet</span>
                )}
              </div>
            </div>

            <Link to="/student/edit-profile" className="edit-profile-button">
              <SlidersHorizontal size={14} />
              Edit Profile
            </Link>
          </section>

          <section className="learners-section">
            <div className="learners-heading">
              <div>
                <div className="section-title-row">
                  <Users size={17} />
                  <h2>Learners</h2>
                </div>

                <p>Discover and evaluate your peers privately.</p>
              </div>

              <div className="learners-heading-actions">
                <div className="view-toggle">
                  <button
                    type="button"
                    className={viewMode === "grid" ? "active" : ""}
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                  >
                    <LayoutGrid size={14} />
                    <span>Grid</span>
                  </button>

                  <button
                    type="button"
                    className={viewMode === "list" ? "active" : ""}
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                  >
                    <List size={15} />
                    <span>List</span>
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`learner-search ${!isVotingActive ? "disabled" : ""}`}
            >
              <Search size={16} />

              <input
                type="search"
                placeholder={
                  isVotingActive
                    ? "Search by Intra username or real name..."
                    : "Search unavailable — no active voting session"
                }
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                disabled={!isVotingActive || learnersLoading}
              />
            </div>

            {!isVotingActive && (
              <div className="voting-unavailable-message">
                <LockKeyhole size={15} />
                <span>{getVotingMessage()}</span>
              </div>
            )}

            {learnersError && (
              <div className="voting-unavailable-message">
                <LockKeyhole size={15} />
                <span>{learnersError}</span>
              </div>
            )}
          </section>

          {windowLoading || learnersLoading ? (
            <div className="learners-empty">
              <div className="empty-icon">
                <LoaderCircle size={24} />
              </div>
              <h3>Loading learners...</h3>
              <p>Fetching participants from the database.</p>
            </div>
          ) : learnersError ? (
            <div className="learners-empty">
              <div className="empty-icon">
                <Users size={24} />
              </div>
              <h3>Unable to load learners</h3>
              <p>{learnersError}</p>
            </div>
          ) : !isVotingActive ? (
            <div className="learners-empty">
              <div className="empty-icon">
                <LockKeyhole size={24} />
              </div>
              <h3>No active voting session</h3>
              <p>Wait for staff to publish a voting session.</p>
            </div>
          ) : filteredLearners.length > 0 ? (
            <div className={`learners-grid mode-${viewMode}`}>
              {filteredLearners.map((learner) => {
                const learnerName =
                  learner.full_name ||
                  learner.name ||
                  learner.username ||
                  "Student";

                const skills = Array.isArray(learner.skills)
                  ? learner.skills
                  : [];

                return (
                  <article className="learner-card" key={learner.user_id}>
                    <div className="learner-card-header">
                      <ProfileAvatar
                        src={learner.profile_picture}
                        name={learnerName}
                        className="learner-avatar"
                      />

                      <div className="learner-info">
                        <h3>{learnerName}</h3>
                        <span>@{learner.username || "student"}</span>
                      </div>
                    </div>

                    <p className="learner-bio">
                      {learner.bio?.trim() || "No bio added yet."}
                    </p>

                    <div className="learner-card-footer">
                      <div className="learner-skills">
                        {skills.length > 0 ? (
                          skills.map((skill, index) => {
                            const skillName = getSkillName(skill);
                            if (!skillName) return null;

                            return (
                              <span key={skill.id || skill.skill_id || index}>
                                {skillName}
                              </span>
                            );
                          })
                        ) : (
                          <span className="no-skills">No skills available</span>
                        )}
                      </div>

                      <Link
                        to={`/student/rate-students?user_id=${learner.user_id}&window_id=${activeWindow.window_id || activeWindow.id}`}
                        state={{ learner }}
                        className="feedback-button"
                      >
                        <ArrowUpRight size={14} />
                        Feedback
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="learners-empty">
              <div className="empty-icon">
                <Users size={24} />
              </div>

              <h3>
                {searchTerm.trim()
                  ? "No learners found"
                  : "No eligible learners"}
              </h3>

              <p>
                {searchTerm.trim()
                  ? "Try searching with another name or username."
                  : "There are no more learners available for you to rate in this voting session."}
              </p>
            </div>
          )}
        </main>

        <aside className="dashboard-sidebar">
          <section className="rq-card">
            <div className="rq-card-heading">
              <div className="rq-icon">
                <BarChart3 size={17} />
              </div>
              <h3>Your Rating</h3>
            </div>

            <div className="rq-rating">
              <div className="rq-score">
                <strong>
                  {statsLoading
                    ? "..."
                    : averageRating !== null
                      ? averageRating.toFixed(1)
                      : "—"}
                </strong>
                <span>/ 3.0</span>
              </div>

              <div className="rq-stars">
                {[1, 2, 3].map((star) => (
                  <RatingStar
                    key={star}
                    size={21}
                    filled={averageRating !== null && star <= averageRating}
                  />
                ))}
              </div>

              <p>
                {statsLoading
                  ? "Loading your average..."
                  : ratingStats?.received_total > 0
                    ? `Based on ${ratingStats.received_total} received ratings`
                    : "Your personal average will appear here."}
              </p>

              <span className="rq-standard">Your private average</span>
            </div>

            <div className="rating-distribution">
              <div className="distribution-heading">
                <span>Rating distribution</span>
                <span>{ratingStats?.received_total || 0} ratings</span>
              </div>

              {distribution.map((item) => {
                const percentage = Number(item.data?.percentage || 0);

                return (
                  <div className="distribution-row" key={item.stars}>
                    <div className="distribution-stars">
                      {Array.from({ length: item.stars }, (_, index) => (
                        <RatingStar key={index} size={13} filled />
                      ))}
                    </div>

                    <div className="distribution-bar">
                      <span
                        style={{
                          width: `${Math.min(100, Math.max(0, percentage))}%`,
                        }}
                      />
                    </div>

                    <strong>{percentage.toFixed(0)}%</strong>
                  </div>
                );
              })}
            </div>

            <div className="rq-privacy">
              <LockKeyhole size={14} />
              <p>
                Only you can see your average. Individual voters and received
                labels remain private.
              </p>
            </div>
          </section>

          <section className="rq-card">
            <div className="rq-card-heading">
              <div className="rq-icon">
                <Gauge size={17} />
              </div>
              <h3>Voting Quota</h3>
            </div>

            <div className="rq-quota-count">
              <strong>
                {statsLoading ? "—" : submittedCount}
                <span> / {maxVotes || "—"}</span>
              </strong>
              <small>votes cast</small>
            </div>

            <div className="rq-progress">
              <span style={{ width: `${progressPercentage}%` }} />
            </div>

            <p className="rq-remaining">
              {statsLoading
                ? "Loading your voting activity..."
                : ratingStats
                  ? `${remainingVotes} ${
                      remainingVotes === 1 ? "vote" : "votes"
                    } remaining`
                  : statsError || "Voting statistics are unavailable."}
            </p>

            <div className="rq-divider" />

            <div className="rq-deadline">
              <span className="rq-label">DEADLINE</span>
              <strong>
                {formatDate(ratingStats?.ends_at || activeWindow?.ends_at)}
              </strong>
            </div>

            <div className="rq-divider" />

            <div className="rq-deadline">
              <span className="rq-label">TIME REMAINING</span>
              <strong className="rq-time">
                <Clock3 size={15} />
                {windowLoading ? "Checking..." : remainingTime}
              </strong>
            </div>

            <div className="rq-divider" />

            <div className="rq-deadline">
              <span className="rq-label">SESSION STATUS</span>
              <strong>{getSessionStatus()}</strong>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default StudentDashboard;
