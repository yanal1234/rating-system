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

// Update current user's bio and skills
const updateMyProfile = async (req, res) => {
  let connection;

  try {
    const userId = req.user.user_id;
    const { bio, skills } = req.body;

    if (typeof bio !== "string") {
      return res.status(400).json({
        message: "Bio must be a string",
      });
    }

    if (bio.length > 500) {
      return res.status(400).json({
        message: "Bio cannot exceed 500 characters",
      });
    }

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        message: "Skills must be an array",
      });
    }

    const normalizedSkills = skills.map((skill) => {
      if (typeof skill !== "string") {
        return null;
      }

      const name = skill.trim();

      if (!name || name.length > 100) {
        return null;
      }

      return name;
    });

    if (normalizedSkills.some((skill) => skill === null)) {
      return res.status(400).json({
        message: "Each skill must be between 1 and 100 characters",
      });
    }

    // Remove duplicate skill names (case-insensitive)
    const uniqueSkills = [
      ...new Map(
        normalizedSkills.map((skill) => [skill.toLowerCase(), skill]),
      ).values(),
    ];

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Update bio
    await connection.query(
      `UPDATE users
       SET bio = ?
       WHERE user_id = ?`,
      [bio.trim(), userId],
    );

    // Create skills if they don't already exist,
    // then get their IDs
    const skillIds = [];

    for (const skillName of uniqueSkills) {
      await connection.query(
        `INSERT INTO skills (skill_name)
         VALUES (?)
         ON DUPLICATE KEY UPDATE skill_id = LAST_INSERT_ID(skill_id)`,
        [skillName],
      );

      const [skillRows] = await connection.query(
        `SELECT skill_id
         FROM skills
         WHERE skill_name = ?`,
        [skillName],
      );

      if (skillRows.length > 0) {
        skillIds.push(skillRows[0].skill_id);
      }
    }

    // Replace this user's skill relationships only
    await connection.query(
      `DELETE FROM user_skills
       WHERE user_id = ?`,
      [userId],
    );

    for (const skillId of skillIds) {
      await connection.query(
        `INSERT INTO user_skills (user_id, skill_id)
         VALUES (?, ?)`,
        [userId, skillId],
      );
    }

    await connection.commit();

    // Fetch updated profile
    const [users] = await connection.query(
      `SELECT
          u.user_id,
          u.username,
          u.full_name,
          u.bio,
          u.email,
          u.role,
          u.profile_picture
       FROM users u
       WHERE u.user_id = ?`,
      [userId],
    );

    const [updatedSkills] = await connection.query(
      `SELECT s.skill_id, s.skill_name AS name
       FROM user_skills us
       INNER JOIN skills s ON s.skill_id = us.skill_id
       WHERE us.user_id = ?
       ORDER BY s.skill_name ASC`,
      [userId],
    );

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        ...users[0],
        skills: updatedSkills,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Failed to update profile",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateMyProfile,
};
