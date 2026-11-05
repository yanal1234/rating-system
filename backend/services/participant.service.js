const db = require("../config/db");

// Add participant
const addParticipant = async (window_id, user_id) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check that the voting window exists
    const [windows] = await connection.query(
      `SELECT window_id
       FROM voting_windows
       WHERE window_id = ?
       FOR UPDATE`,
      [window_id],
    );

    if (windows.length === 0) {
      const error = new Error("Voting window not found");
      error.code = "ER_NO_REFERENCED_ROW_2";
      throw error;
    }

    // Check that the user exists and is active
    const [users] = await connection.query(
      `SELECT user_id
       FROM users
       WHERE user_id = ? AND is_active = 1`,
      [user_id],
    );

    if (users.length === 0) {
      const error = new Error("Active user not found");
      error.code = "ER_NO_REFERENCED_ROW_2";
      throw error;
    }

    await connection.query(
      `INSERT INTO rating_participants (window_id, user_id)
       VALUES (?, ?)`,
      [window_id, user_id],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Get participants
const getParticipants = async (window_id) => {
  const [participants] = await db.query(
    `SELECT u.user_id, u.username, rp.joined_at
     FROM rating_participants rp
     JOIN users u ON rp.user_id = u.user_id
     WHERE rp.window_id = ?
     ORDER BY rp.joined_at ASC`,
    [window_id],
  );

  return participants;
};

// Remove participant
const removeParticipant = async (window_id, user_id) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the participant record
    const [participants] = await connection.query(
      `SELECT window_id, user_id
       FROM rating_participants
       WHERE window_id = ? AND user_id = ?
       FOR UPDATE`,
      [window_id, user_id],
    );

    if (participants.length === 0) {
      await connection.rollback();
      return 0;
    }

    // Prevent removal if the participant has submitted or received ratings
    const [ratings] = await connection.query(
      `SELECT rating_id
       FROM ratings
       WHERE window_id = ?
         AND (voter_id = ? OR rated_user_id = ?)
       LIMIT 1`,
      [window_id, user_id, user_id],
    );

    if (ratings.length > 0) {
      const error = new Error(
        "Cannot remove a participant who is involved in ratings",
      );
      error.statusCode = 409;
      throw error;
    }

    const [result] = await connection.query(
      `DELETE FROM rating_participants
       WHERE window_id = ? AND user_id = ?`,
      [window_id, user_id],
    );

    await connection.commit();

    return result.affectedRows;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  addParticipant,
  getParticipants,
  removeParticipant,
};
