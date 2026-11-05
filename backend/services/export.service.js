const db = require("../config/db");

// Escape CSV values and protect against CSV Formula Injection
const escapeCSV = (value) => {
  if (value === null || value === undefined) {
    return '""';
  }

  let text = String(value);

  // Prevent Excel from interpreting text as a formula
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
};

// Export ratings for a specific voting window as CSV
const exportWindowRatings = async (window_id) => {
  if (!/^[1-9]\d*$/.test(String(window_id))) {
    const error = new Error("Invalid voting window ID");
    error.statusCode = 400;
    throw error;
  }

  // Check if voting window exists
  const [windows] = await db.query(
    `SELECT window_id, window_name
     FROM voting_windows
     WHERE window_id = ?`,
    [window_id],
  );

  if (windows.length === 0) {
    return null;
  }

  // Get all ratings, including moderation information for staff auditing
  const [ratings] = await db.query(
    `SELECT
       r.rating_id,
       vw.window_name,
       voter.username AS voter_username,
       rated.username AS rated_username,
       r.stars,
       r.status,
       r.moderation_status,
       r.weight,

       CASE
         WHEN r.status = 'valid'
          AND r.moderation_status NOT IN ('under_review', 'confirmed_abuse')
          AND r.weight > 0
         THEN 1
         ELSE 0
       END AS is_effective,

       r.invalidation_reason,
       r.invalidated_at,
       r.created_at

     FROM ratings r
     JOIN voting_windows vw ON vw.window_id = r.window_id
     JOIN users voter ON voter.user_id = r.voter_id
     JOIN users rated ON rated.user_id = r.rated_user_id

     WHERE r.window_id = ?
     ORDER BY r.rating_id ASC`,
    [window_id],
  );

  // CSV columns
  const headers = [
    "Rating ID",
    "Window Name",
    "Voter",
    "Rated User",
    "Stars",
    "Status",
    "Moderation Status",
    "Weight",
    "Effective",
    "Invalidation Reason",
    "Invalidated At",
    "Created At",
  ];

  // Convert rows to CSV
  const rows = ratings.map((rating) => [
    rating.rating_id,
    rating.window_name,
    rating.voter_username,
    rating.rated_username,
    rating.stars,
    rating.status,
    rating.moderation_status,
    rating.weight,
    rating.is_effective,
    rating.invalidation_reason,
    rating.invalidated_at,
    rating.created_at,
  ]);

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\r\n");

  // Add UTF-8 BOM for Excel compatibility
  return {
    fileName: `voting-window-${window_id}-ratings.csv`,
    content: "\uFEFF" + csv,
  };
};

module.exports = {
  exportWindowRatings,
};
