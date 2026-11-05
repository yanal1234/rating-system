const db = require("../config/db");

// Export ratings for a specific voting window as CSV
const exportWindowRatings = async (window_id) => {
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

  // Get ratings data
  const [ratings] = await db.query(
    `SELECT
       r.rating_id,
       vw.window_name,
       voter.username AS voter_username,
       rated.username AS rated_username,
       r.stars,
       r.status,
       r.invalidation_reason,
       r.invalidated_at
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
    "Invalidation Reason",
    "Invalidated At",
  ];

  // Escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) {
      return "";
    }

    const text = String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  // Convert rows to CSV
  const rows = ratings.map((rating) => [
    rating.rating_id,
    rating.window_name,
    rating.voter_username,
    rating.rated_username,
    rating.stars,
    rating.status,
    rating.invalidation_reason,
    rating.invalidated_at,
  ]);

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\n");

  // Add UTF-8 BOM for Excel compatibility
  return {
    fileName: `voting-window-${window_id}-ratings.csv`,
    content: "\uFEFF" + csv,
  };
};

module.exports = {
  exportWindowRatings,
};
