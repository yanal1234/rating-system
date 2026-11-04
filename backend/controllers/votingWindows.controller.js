const db = require("../config/db");

// Create voting window (Staff only)
const createVotingWindow = async (req, res) => {
  try {
    const {
      window_name,
      starts_at,
      ends_at,
      min_votes = 0,
      max_votes = 5,
    } = req.body;

    if (!window_name || !starts_at || !ends_at) {
      return res.status(400).json({
        message: "Window name, start date and end date are required",
      });
    }

    if (
      isNaN(Date.parse(starts_at)) ||
      isNaN(Date.parse(ends_at)) ||
      new Date(ends_at) <= new Date(starts_at)
    ) {
      return res.status(400).json({
        message: "Invalid voting window dates",
      });
    }

    if (
      !Number.isInteger(Number(min_votes)) ||
      !Number.isInteger(Number(max_votes)) ||
      Number(min_votes) < 1 ||
      Number(max_votes) < Number(min_votes)
    ) {
      return res.status(400).json({
        message: "Invalid minimum or maximum votes",
      });
    }

    const [result] = await db.query(
      `INSERT INTO voting_windows
       (window_name, starts_at, ends_at, min_votes, max_votes, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [window_name, starts_at, ends_at, min_votes, max_votes, req.user.user_id],
    );

    return res.status(201).json({
      message: "Voting window created successfully",
      window_id: result.insertId,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create voting window",
      error: error.message,
    });
  }
};

// Get all voting windows (Staff only)
const getAllVotingWindows = async (req, res) => {
  try {
    const [windows] = await db.query(
      `SELECT *
       FROM voting_windows
       ORDER BY starts_at DESC`,
    );

    return res.status(200).json({
      message: "Voting windows retrieved successfully",
      windows,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve voting windows",
      error: error.message,
    });
  }
};

// Get voting window by ID (Staff only)
const getVotingWindowById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    const [windows] = await db.query(
      `SELECT *
       FROM voting_windows
       WHERE window_id = ?`,
      [id],
    );

    if (windows.length === 0) {
      return res.status(404).json({
        message: "Voting window not found",
      });
    }

    return res.status(200).json({
      message: "Voting window retrieved successfully",
      window: windows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve voting window",
      error: error.message,
    });
  }
};

// Update voting window (Staff only)
const updateVotingWindow = async (req, res) => {
  try {
    const { id } = req.params;
    const { window_name, starts_at, ends_at, min_votes, max_votes, status } =
      req.body;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    const [windows] = await db.query(
      "SELECT * FROM voting_windows WHERE window_id = ?",
      [id],
    );

    if (windows.length === 0) {
      return res.status(404).json({
        message: "Voting window not found",
      });
    }

    const current = windows[0];

    const updated = {
      window_name: window_name ?? current.window_name,
      starts_at: starts_at ?? current.starts_at,
      ends_at: ends_at ?? current.ends_at,
      min_votes: min_votes ?? current.min_votes,
      max_votes: max_votes ?? current.max_votes,
      status: status ?? current.status,
    };

    if (
      !updated.window_name ||
      isNaN(Date.parse(updated.starts_at)) ||
      isNaN(Date.parse(updated.ends_at)) ||
      new Date(updated.ends_at) <= new Date(updated.starts_at)
    ) {
      return res.status(400).json({
        message: "Invalid voting window information or dates",
      });
    }

    if (
      !Number.isInteger(Number(updated.min_votes)) ||
      !Number.isInteger(Number(updated.max_votes)) ||
      Number(updated.min_votes) < 1 ||
      Number(updated.max_votes) < Number(updated.min_votes)
    ) {
      return res.status(400).json({
        message: "Invalid minimum or maximum votes",
      });
    }

    if (!["draft", "published", "cancelled"].includes(updated.status)) {
      return res.status(400).json({
        message: "Invalid voting window status",
      });
    }

    await db.query(
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

    return res.status(200).json({
      message: "Voting window updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update voting window",
      error: error.message,
    });
  }
};

// Delete voting window (Staff only)
const deleteVotingWindow = async (req, res) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    const [result] = await db.query(
      "DELETE FROM voting_windows WHERE window_id = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Voting window not found",
      });
    }

    return res.status(200).json({
      message: "Voting window deleted successfully",
    });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message:
          "Cannot delete this voting window because it is linked to other records",
      });
    }

    return res.status(500).json({
      message: "Failed to delete voting window",
      error: error.message,
    });
  }
};

module.exports = {
  createVotingWindow,
  getAllVotingWindows,
  getVotingWindowById,
  updateVotingWindow,
  deleteVotingWindow,
};
