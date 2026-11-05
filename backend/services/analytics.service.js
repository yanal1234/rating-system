const db = require("../config/db");

// Only ratings that currently have mathematical influence
const EFFECTIVE_RATING_CONDITION = `
  r.status = 'valid'
  AND r.moderation_status NOT IN ('under_review', 'confirmed_abuse')
  AND r.weight > 0
`;

// Get general system analytics
const getSystemAnalytics = async () => {
  // Voting windows statistics
  const [windows] = await db.query(`
    SELECT
      COUNT(*) AS total_windows,
      COALESCE(SUM(status = 'published'), 0) AS published_windows,
      COALESCE(SUM(status = 'draft'), 0) AS draft_windows,
      COALESCE(SUM(status = 'cancelled'), 0) AS cancelled_windows
    FROM voting_windows
  `);

  // Participants statistics
  const [participants] = await db.query(`
    SELECT COUNT(*) AS total_participations
    FROM rating_participants
  `);

  // Ratings statistics
  const [ratings] = await db.query(`
    SELECT
      COUNT(*) AS total_ratings,
      COALESCE(SUM(status = 'valid'), 0) AS valid_ratings,
      COALESCE(SUM(status = 'invalid'), 0) AS invalid_ratings,

      SUM(
        CASE
          WHEN ${EFFECTIVE_RATING_CONDITION} THEN 1
          ELSE 0
        END
      ) AS effective_ratings,

      ROUND(
        SUM(
          CASE
            WHEN ${EFFECTIVE_RATING_CONDITION}
            THEN stars * weight
            ELSE 0
          END
        ) /
        NULLIF(
          SUM(
            CASE
              WHEN ${EFFECTIVE_RATING_CONDITION}
              THEN weight
              ELSE 0
            END
          ),
          0
        ),
        2
      ) AS average_stars

    FROM ratings r
  `);

  // Most used labels in effective ratings
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

  return {
    windows: windows[0],
    participants: participants[0],
    ratings: ratings[0],
    topLabels,
  };
};

// Get analytics for a specific voting window
const getWindowAnalytics = async (window_id) => {
  // Check if the window exists
  const [windows] = await db.query(
    `SELECT window_id, window_name, starts_at, ends_at, status
     FROM voting_windows
     WHERE window_id = ?`,
    [window_id],
  );

  if (windows.length === 0) {
    return null;
  }

  // Participants count
  const [participants] = await db.query(
    `SELECT COUNT(*) AS total_participants
     FROM rating_participants
     WHERE window_id = ?`,
    [window_id],
  );

  // Ratings statistics
  const [ratings] = await db.query(
    `SELECT
       COUNT(*) AS total_ratings,
       COALESCE(SUM(status = 'valid'), 0) AS valid_ratings,
       COALESCE(SUM(status = 'invalid'), 0) AS invalid_ratings,

       SUM(
         CASE
           WHEN ${EFFECTIVE_RATING_CONDITION} THEN 1
           ELSE 0
         END
       ) AS effective_ratings,

       ROUND(
         SUM(
           CASE
             WHEN ${EFFECTIVE_RATING_CONDITION}
             THEN stars * weight
             ELSE 0
           END
         ) /
         NULLIF(
           SUM(
             CASE
               WHEN ${EFFECTIVE_RATING_CONDITION}
               THEN weight
               ELSE 0
             END
           ),
           0
         ),
         2
       ) AS average_stars

     FROM ratings r
     WHERE r.window_id = ?`,
    [window_id],
  );

  // Most rated users by weighted average
  const [topRatedUsers] = await db.query(
    `SELECT
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
     ORDER BY average_stars DESC, received_ratings DESC`,
    [window_id],
  );

  // Most used labels in effective ratings
  const [topLabels] = await db.query(
    `SELECT
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
     LIMIT 10`,
    [window_id],
  );

  return {
    window: windows[0],
    participants: participants[0],
    ratings: ratings[0],
    topRatedUsers,
    topLabels,
  };
};

module.exports = {
  getSystemAnalytics,
  getWindowAnalytics,
};
