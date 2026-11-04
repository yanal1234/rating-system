const db = require("../config/db");

// Get all suspicious activities
const getSuspiciousActivities = async (req, res) => {
  try {
    const [activities] = await db.query(
      `SELECT
         sa.*,
         u.username AS username,
         reviewer.username AS reviewer_username
       FROM suspicious_activities sa
       JOIN users u ON sa.user_id = u.user_id
       LEFT JOIN users reviewer ON sa.reviewed_by = reviewer.user_id
       ORDER BY sa.created_at DESC`,
    );

    return res.status(200).json({
      message: "Suspicious activities retrieved successfully",
      activities,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve suspicious activities",
    });
  }
};

// Get suspicious activity by ID
const getSuspiciousActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const [activities] = await db.query(
      `SELECT
         sa.*,
         u.username AS username,
         reviewer.username AS reviewer_username
       FROM suspicious_activities sa
       JOIN users u ON sa.user_id = u.user_id
       LEFT JOIN users reviewer ON sa.reviewed_by = reviewer.user_id
       WHERE sa.activity_id = ?`,
      [id],
    );

    if (activities.length === 0) {
      return res.status(404).json({
        message: "Suspicious activity not found",
      });
    }

    return res.status(200).json({
      message: "Suspicious activity retrieved successfully",
      activity: activities[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve suspicious activity",
    });
  }
};

// Review suspicious activity
const reviewSuspiciousActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["reviewed", "dismissed", "confirmed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid review status",
      });
    }

    const [result] = await db.query(
      `UPDATE suspicious_activities
       SET status = ?,
           reviewed_by = ?,
           reviewed_at = NOW()
       WHERE activity_id = ? AND status = 'pending'`,
      [status, req.user.user_id, id],
    );

    if (result.affectedRows === 0) {
      const [activities] = await db.query(
        "SELECT activity_id FROM suspicious_activities WHERE activity_id = ?",
        [id],
      );

      if (activities.length === 0) {
        return res.status(404).json({
          message: "Suspicious activity not found",
        });
      }

      return res.status(409).json({
        message: "Suspicious activity has already been reviewed",
      });
    }

    return res.status(200).json({
      message: "Suspicious activity reviewed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to review suspicious activity",
    });
  }
};

module.exports = {
  getSuspiciousActivities,
  getSuspiciousActivityById,
  reviewSuspiciousActivity,
};
