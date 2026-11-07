const db = require("../config/db");

const EFFECTIVE_RATING_CONDITION = `
  r.status = 'valid'
  AND r.moderation_status NOT IN ('under_review', 'confirmed_abuse')
  AND r.weight > 0
`;

const getSystemAnalytics = async () => {
  const [windows] = await db.query(`
    SELECT
      COUNT(*) AS total_windows,
      COALESCE(SUM(status = 'published'), 0) AS published_windows,
      COALESCE(SUM(status = 'draft'), 0) AS draft_windows,
      COALESCE(SUM(status = 'cancelled'), 0) AS cancelled_windows
    FROM voting_windows
  `);

  const [participants] = await db.query(`
    SELECT COUNT(*) AS total_participations
    FROM rating_participants
  `);

  const [ratings] = await db.query(`
    SELECT
      COUNT(*) AS total_ratings,
      COALESCE(SUM(status = 'valid'), 0) AS valid_ratings,
      COALESCE(SUM(status = 'invalid'), 0) AS invalid_ratings,

      SUM(
        CASE WHEN ${EFFECTIVE_RATING_CONDITION}
        THEN 1 ELSE 0 END
      ) AS effective_ratings,

      ROUND(
        SUM(
          CASE WHEN ${EFFECTIVE_RATING_CONDITION}
          THEN stars * weight ELSE 0 END
        ) /
        NULLIF(
          SUM(
            CASE WHEN ${EFFECTIVE_RATING_CONDITION}
            THEN weight ELSE 0 END
          ), 0
        ),
        2
      ) AS average_stars
    FROM ratings r
  `);

  const [topLabels] = await db.query(`
    SELECT
      l.label_id,
      l.label_name,
      COUNT(*) AS usage_count
    FROM rating_labels rl
    JOIN ratings r ON r.rating_id = rl.rating_id
    JOIN labels l ON l.label_id = rl.label_id
    WHERE ${EFFECTIVE_RATING_CONDITION}
    GROUP BY l.label_id, l.label_name
    ORDER BY usage_count DESC
    LIMIT 10
  `);

  // أحدث Voting Window منشورة، مع إعطاء الأولوية للنافذة الحالية
  const [currentWindows] = await db.query(`
    SELECT
      window_id,
      window_name,
      starts_at,
      ends_at,
      min_votes,
      max_votes,
      status
    FROM voting_windows
    WHERE status = 'published'
    ORDER BY
      CASE
        WHEN NOW() BETWEEN starts_at AND ends_at THEN 0
        WHEN starts_at > NOW() THEN 1
        ELSE 2
      END,
      starts_at DESC
    LIMIT 1
  `);

  let dashboard = null;

  if (currentWindows.length > 0) {
    const window = currentWindows[0];
    const windowId = window.window_id;

    // عدد المشاركين والذين أرسلوا تقييمًا واحدًا على الأقل
    const [participationStats] = await db.query(
      `
      SELECT
        COUNT(DISTINCT rp.user_id) AS total_participants,
        COUNT(DISTINCT r.voter_id) AS students_who_rated
      FROM rating_participants rp
      LEFT JOIN ratings r
        ON r.window_id = rp.window_id
        AND r.voter_id = rp.user_id
      WHERE rp.window_id = ?
    `,
      [windowId],
    );

    // عدد التقييمات حسب حالتها
    const [windowRatingStats] = await db.query(
      `
      SELECT
        COUNT(*) AS total_ratings,
        COALESCE(SUM(status = 'valid'), 0) AS valid_ratings,
        COALESCE(SUM(status = 'invalid'), 0) AS invalid_ratings,
        COALESCE(SUM(moderation_status = 'under_review'), 0)
          AS paused_ratings
      FROM ratings
      WHERE window_id = ?
    `,
      [windowId],
    );

    // الحالات التي تحتاج مراجعة
    const [abuseStats] = await db.query(
      `
      SELECT
        COUNT(*) AS open_cases,
        COALESCE(SUM(severity IN ('high', 'critical')), 0)
          AS high_priority_cases
      FROM suspicious_activities
      WHERE window_id = ?
        AND status = 'pending'
    `,
      [windowId],
    );

    // آخر الحالات المشتبه بها
    const [pendingActivities] = await db.query(
      `
      SELECT
        activity_id,
        activity_type,
        severity,
        description,
        created_at
      FROM suspicious_activities
      WHERE window_id = ?
        AND status = 'pending'
      ORDER BY
        FIELD(severity, 'critical', 'high', 'medium', 'low'),
        created_at DESC
      LIMIT 5
    `,
      [windowId],
    );

    // التقييمات اليومية خلال آخر 7 أيام
    const [ratingsByDay] = await db.query(
      `
      SELECT
        DATE(created_at) AS rating_date,
        COUNT(*) AS total
      FROM ratings
      WHERE window_id = ?
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      GROUP BY DATE(created_at)
      ORDER BY rating_date ASC
    `,
      [windowId],
    );

    // توزيع النجوم الفعلي
    const [starDistribution] = await db.query(
      `
      SELECT
        stars,
        COUNT(*) AS total
      FROM ratings r
      WHERE r.window_id = ?
        AND ${EFFECTIVE_RATING_CONDITION}
      GROUP BY stars
      ORDER BY stars DESC
    `,
      [windowId],
    );

    dashboard = {
      window,

      participation: participationStats[0],

      ratings: windowRatingStats[0],

      abuse: abuseStats[0],

      pendingActivities,

      ratingsByDay,

      starDistribution,
    };
  }

  return {
    windows: windows[0],
    participants: participants[0],
    ratings: ratings[0],
    topLabels,
    dashboard,
  };
};

// Analytics for a specific voting window
const getWindowAnalytics = async (window_id) => {
  const [windows] = await db.query(
    `SELECT
       window_id,
       window_name,
       starts_at,
       ends_at,
       min_votes,
       max_votes,
       status
     FROM voting_windows
     WHERE window_id = ?`,
    [window_id],
  );

  if (windows.length === 0) return null;

  // Participants
  const [participants] = await db.query(
    `SELECT
       COUNT(DISTINCT rp.user_id) AS total_participants,
       COUNT(DISTINCT r.voter_id) AS students_who_rated
     FROM rating_participants rp
     LEFT JOIN ratings r
       ON r.window_id = rp.window_id
       AND r.voter_id = rp.user_id
     WHERE rp.window_id = ?`,
    [window_id],
  );

  // Rating statistics
  const [ratings] = await db.query(
    `
    SELECT
      COUNT(*) AS total_ratings,
      COALESCE(SUM(status = 'valid'), 0) AS valid_ratings,
      COALESCE(SUM(status = 'invalid'), 0) AS invalid_ratings,
      COALESCE(SUM(moderation_status = 'under_review'), 0)
        AS paused_ratings,

      SUM(
        CASE WHEN ${EFFECTIVE_RATING_CONDITION}
        THEN 1 ELSE 0 END
      ) AS effective_ratings,

      ROUND(
        SUM(
          CASE WHEN ${EFFECTIVE_RATING_CONDITION}
          THEN stars * weight ELSE 0 END
        ) /
        NULLIF(
          SUM(
            CASE WHEN ${EFFECTIVE_RATING_CONDITION}
            THEN weight ELSE 0 END
          ), 0
        ),
        2
      ) AS average_stars

    FROM ratings r
    WHERE r.window_id = ?
    `,
    [window_id],
  );

  // Abuse statistics
  const [abuse] = await db.query(
    `
    SELECT
      COUNT(*) AS open_cases,
      COALESCE(
        SUM(severity IN ('high', 'critical')),
        0
      ) AS high_priority_cases
    FROM suspicious_activities
    WHERE window_id = ?
      AND status = 'pending'
    `,
    [window_id],
  );

  // Pending activities
  const [pendingActivities] = await db.query(
    `
    SELECT
      activity_id,
      activity_type,
      severity,
      description,
      created_at
    FROM suspicious_activities
    WHERE window_id = ?
      AND status = 'pending'
    ORDER BY
      FIELD(severity, 'critical', 'high', 'medium', 'low'),
      created_at DESC
    LIMIT 5
    `,
    [window_id],
  );

  // Ratings per day (last 7 days)
  const [ratingsByDay] = await db.query(
    `
    SELECT
      DATE(created_at) AS rating_date,
      COUNT(*) AS total
    FROM ratings
    WHERE window_id = ?
      AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    GROUP BY DATE(created_at)
    ORDER BY rating_date ASC
    `,
    [window_id],
  );

  // Effective star distribution
  const [starDistribution] = await db.query(
    `
    SELECT
      stars,
      COUNT(*) AS total
    FROM ratings r
    WHERE r.window_id = ?
      AND ${EFFECTIVE_RATING_CONDITION}
    GROUP BY stars
    ORDER BY stars DESC
    `,
    [window_id],
  );

  // Top rated users
  const [topRatedUsers] = await db.query(
    `
    SELECT
      u.user_id,
      u.username,
      COUNT(r.rating_id) AS received_ratings,
      ROUND(
        SUM(r.stars * r.weight) / NULLIF(SUM(r.weight), 0),
        2
      ) AS average_stars
    FROM ratings r
    JOIN users u ON u.user_id = r.rated_user_id
    WHERE r.window_id = ?
      AND ${EFFECTIVE_RATING_CONDITION}
    GROUP BY u.user_id, u.username
    ORDER BY average_stars DESC, received_ratings DESC
    `,
    [window_id],
  );

  // Top labels
  const [topLabels] = await db.query(
    `
    SELECT
      l.label_id,
      l.label_name,
      COUNT(*) AS usage_count
    FROM rating_labels rl
    JOIN ratings r ON r.rating_id = rl.rating_id
    JOIN labels l ON l.label_id = rl.label_id
    WHERE r.window_id = ?
      AND ${EFFECTIVE_RATING_CONDITION}
    GROUP BY l.label_id, l.label_name
    ORDER BY usage_count DESC
    LIMIT 10
    `,
    [window_id],
  );

  return {
    window: windows[0],
    participation: participants[0],
    participants: participants[0],
    ratings: ratings[0],
    abuse: abuse[0],
    pendingActivities,
    ratingsByDay,
    starDistribution,
    topRatedUsers,
    topLabels,
  };
};

module.exports = {
  getSystemAnalytics,
  getWindowAnalytics,
};
