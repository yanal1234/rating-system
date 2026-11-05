const db = require("../config/db");

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

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
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [windows] = await connection.query(
      `SELECT *
       FROM voting_windows
       WHERE window_id = ?
       FOR UPDATE`,
      [id],
    );

    if (windows.length === 0) {
      throw createError("Voting window not found", 404);
    }

    const current = windows[0];

    const [ratings] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM ratings
       WHERE window_id = ?`,
      [id],
    );

    const hasRatings = Number(ratings[0].total) > 0;

    const datesChanged =
      new Date(updated.starts_at).getTime() !==
        new Date(current.starts_at).getTime() ||
      new Date(updated.ends_at).getTime() !==
        new Date(current.ends_at).getTime();

    const limitsChanged =
      Number(updated.min_votes) !== Number(current.min_votes) ||
      Number(updated.max_votes) !== Number(current.max_votes);

    if (hasRatings && (datesChanged || limitsChanged)) {
      throw createError(
        "Cannot change voting dates or vote limits after ratings have been submitted",
        409,
      );
    }

    await connection.query(
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

    await connection.commit();

    return true;
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Delete voting window
const deleteVotingWindow = async (id) => {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [windows] = await connection.query(
      `SELECT window_id
       FROM voting_windows
       WHERE window_id = ?
       FOR UPDATE`,
      [id],
    );

    if (windows.length === 0) {
      await connection.rollback();
      return 0;
    }

    const [participants] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM rating_participants
       WHERE window_id = ?`,
      [id],
    );

    const [ratings] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM ratings
       WHERE window_id = ?`,
      [id],
    );

    if (Number(participants[0].total) > 0 || Number(ratings[0].total) > 0) {
      throw createError(
        "Cannot delete a voting window that has participants or ratings",
        409,
      );
    }

    const [result] = await connection.query(
      `DELETE FROM voting_windows
       WHERE window_id = ?`,
      [id],
    );

    await connection.commit();

    return result.affectedRows;
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  createVotingWindow,
  getAllVotingWindows,
  getVotingWindowById,
  updateVotingWindow,
  deleteVotingWindow,
};
