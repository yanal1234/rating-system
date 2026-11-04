const db = require("../config/db");

// Get all users (Staff only)
const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT user_id, username, email, role
       FROM users
       ORDER BY username ASC`,
    );

    return res.status(200).json({
      message: "Users retrieved successfully",
      users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve users",
      error: error.message,
    });
  }
};

// Get user by ID (Staff only)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const [users] = await db.query(
      `SELECT user_id, username, email, role
       FROM users
       WHERE user_id = ?`,
      [id],
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User retrieved successfully",
      user: users[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve user",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
};
