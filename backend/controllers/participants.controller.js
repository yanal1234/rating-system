const db = require("../config/db");

// Add participant
const addParticipant = async (req, res) => {
  try {
    const { window_id, user_id } = req.body;

    if (!window_id || !user_id) {
      return res.status(400).json({
        message: "Window ID and User ID are required",
      });
    }

    const [result] = await db.query(
      `INSERT INTO rating_participants (window_id, user_id)
       VALUES (?, ?)`,
      [window_id, user_id],
    );

    return res.status(201).json({
      message: "Participant added successfully",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "User is already a participant in this window",
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(404).json({
        message: "User or voting window not found",
      });
    }

    return res.status(500).json({
      message: "Failed to add participant",
    });
  }
};

// Get participants in a voting window
const getParticipants = async (req, res) => {
  try {
    const { window_id } = req.params;

    const [participants] = await db.query(
      `SELECT u.user_id, u.username, rp.joined_at
       FROM rating_participants rp
       JOIN users u ON rp.user_id = u.user_id
       WHERE rp.window_id = ?
       ORDER BY rp.joined_at ASC`,
      [window_id],
    );

    return res.status(200).json({
      message: "Participants retrieved successfully",
      participants,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve participants",
    });
  }
};

// Remove participant
const removeParticipant = async (req, res) => {
  try {
    const { window_id, user_id } = req.params;

    const [result] = await db.query(
      `DELETE FROM rating_participants
       WHERE window_id = ? AND user_id = ?`,
      [window_id, user_id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Participant not found",
      });
    }

    return res.status(200).json({
      message: "Participant removed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to remove participant",
    });
  }
};

module.exports = {
  addParticipant,
  getParticipants,
  removeParticipant,
};
