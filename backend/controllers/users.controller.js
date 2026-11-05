const db = require("../config/db");
const { getUserCredibility } = require("../services/credibility.service");

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
    console.error("Get all users error:", error);

    return res.status(500).json({
      message: "Failed to retrieve users",
    });
  }
};

// Get user by ID with credibility (Staff only)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
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

    const credibility = await getUserCredibility(Number(id));

    return res.status(200).json({
      message: "User retrieved successfully",
      user: {
        ...users[0],
        credibility: credibility
          ? {
              credibility_score: credibility.credibility_score,
              current_weight: credibility.current_weight,
              total_ratings: credibility.total_ratings,
              reviewed_ratings: credibility.reviewed_ratings,
              updated_at: credibility.updated_at,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get user by ID error:", error);

    return res.status(500).json({
      message: "Failed to retrieve user",
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
};
