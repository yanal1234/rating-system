const db = require("../config/db");

// Add participant
const addParticipant = async (window_id, user_id) => {
  await db.query(
    `INSERT INTO rating_participants (window_id, user_id)
     VALUES (?, ?)`,
    [window_id, user_id],
  );
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
  const [result] = await db.query(
    `DELETE FROM rating_participants
     WHERE window_id = ? AND user_id = ?`,
    [window_id, user_id],
  );

  return result.affectedRows;
};

module.exports = {
  addParticipant,
  getParticipants,
  removeParticipant,
};
