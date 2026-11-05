const db = require("../config/db");

// Get general system analytics
const getSystemAnalytics = async () => {
  // Voting windows statistics
  const [windows] = await db.query(`
    SELECT
      COUNT(*) AS total_windows,
      SUM(status = 'published') AS published_windows,
      SUM(status = 'draft') AS draft_windows,
      SUM(status = 'cancelled') AS cancelled_windows
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
      SUM(status = 'valid') AS valid_ratings,
      SUM(status = 'invalid') AS invalid_ratings,
      ROUND(
        AVG(CASE WHEN status = 'valid' THEN stars END),
        2
      ) AS average_stars
    FROM ratings
  `);

  // Most used labels
  const [topLabels] = await db.query(`
    SELECT
      l.label_id,
      l.label_name,
      COUNT(*) AS usage_count
    FROM rating_labels rl
    JOIN ratings r ON r.rating_id = rl.rating_id
    JOIN labels l ON l.label_id = rl.label_id
    WHERE r.status = 'valid'
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
       SUM(status = 'valid') AS valid_ratings,
       SUM(status = 'invalid') AS invalid_ratings,
       ROUND(
         AVG(CASE WHEN status = 'valid' THEN stars END),
         2
       ) AS average_stars
     FROM ratings
     WHERE window_id = ?`,
    [window_id],
  );

  // Most rated users
  const [topRatedUsers] = await db.query(
    `SELECT
       u.user_id,
       u.username,
       COUNT(r.rating_id) AS received_ratings,
       ROUND(AVG(r.stars), 2) AS average_stars
     FROM ratings r
     JOIN users u ON u.user_id = r.rated_user_id
     WHERE r.window_id = ?
       AND r.status = 'valid'
     GROUP BY u.user_id, u.username
     ORDER BY average_stars DESC, received_ratings DESC`,
    [window_id],
  );

  // Most used labels in this window
  const [topLabels] = await db.query(
    `SELECT
       l.label_id,
       l.label_name,
       COUNT(*) AS usage_count
     FROM rating_labels rl
     JOIN ratings r ON r.rating_id = rl.rating_id
     JOIN labels l ON l.label_id = rl.label_id
     WHERE r.window_id = ?
       AND r.status = 'valid'
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
