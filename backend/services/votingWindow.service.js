const db = require("../config/db");

// Create voting window
const createVotingWindow = async (windowData) => {
  const { window_name, starts_at, ends_at, min_votes, max_votes, created_by } =
    windowData;

  const [result] = await db.query(
    `INSERT INTO voting_windows
     (window_name, starts_at, ends_at, min_votes, max_votes, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [window_name, starts_at, ends_at, min_votes, max_votes, created_by],
  );

  return result.insertId;
};

// Get all voting windows
const getAllVotingWindows = async () => {
  const [windows] = await db.query(
    `SELECT *
     FROM voting_windows
     ORDER BY starts_at DESC`,
  );

  return windows;
};

// Get voting window by ID
const getVotingWindowById = async (id) => {
  const [windows] = await db.query(
    `SELECT *
     FROM voting_windows
     WHERE window_id = ?`,
    [id],
  );

  return windows[0] || null;
};

// Update voting window
const updateVotingWindow = async (id, updated) => {
  const [result] = await db.query(
    `UPDATE voting_windows
     SET window_name = ?,
         starts_at = ?,
         ends_at = ?,
         min_votes = ?,
         max_votes = ?,
         status = ?
     WHERE window_id = ?`,
    [
      updated.window_name,
      updated.starts_at,
      updated.ends_at,
      updated.min_votes,
      updated.max_votes,
      updated.status,
      id,
    ],
  );

  return result.affectedRows;
};

// Delete voting window
const deleteVotingWindow = async (id) => {
  const [result] = await db.query(
    "DELETE FROM voting_windows WHERE window_id = ?",
    [id],
  );

  return result.affectedRows;
};

module.exports = {
  createVotingWindow,
  getAllVotingWindows,
  getVotingWindowById,
  updateVotingWindow,
  deleteVotingWindow,
};
