const db = require("../config/db");
const {
  recalculateUserCredibility,
} = require("../services/credibility.service");

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
    console.error("Get suspicious activities error:", error);

    return res.status(500).json({
      message: "Failed to retrieve suspicious activities",
    });
  }
};

// Get suspicious activity by ID
const getSuspiciousActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        message: "Invalid suspicious activity ID",
      });
    }

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
    console.error("Get suspicious activity error:", error);

    return res.status(500).json({
      message: "Failed to retrieve suspicious activity",
    });
  }
};

// Review suspicious activity
const reviewSuspiciousActivity = async (req, res) => {
  let connection;
  let committed = false;
  let voter_id = null;
  let ratingModerationChanged = false;

  try {
    const { id } = req.params;
    const { status } = req.body;
    const performed_by = req.user.user_id;

    const allowedStatuses = ["reviewed", "dismissed", "confirmed"];

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        message: "Invalid suspicious activity ID",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid review status",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Lock the suspicious activity
    const [activities] = await connection.query(
      `SELECT *
       FROM suspicious_activities
       WHERE activity_id = ?
       FOR UPDATE`,
      [id],
    );

    if (activities.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Suspicious activity not found",
      });
    }

    const activity = activities[0];

    if (activity.status !== "pending") {
      await connection.rollback();

      return res.status(409).json({
        message: "Suspicious activity has already been reviewed",
      });
    }

    // If confirmed and linked to a rating, update that rating too
    if (status === "confirmed" && activity.rating_id) {
      const [ratings] = await connection.query(
        `SELECT rating_id, voter_id, weight, status, moderation_status
         FROM ratings
         WHERE rating_id = ?
         FOR UPDATE`,
        [activity.rating_id],
      );

      if (ratings.length === 0) {
        await connection.rollback();

        return res.status(409).json({
          message: "The linked rating could not be found",
        });
      }

      const rating = ratings[0];
      voter_id = rating.voter_id;

      if (rating.moderation_status !== "confirmed_abuse") {
        await connection.query(
          `UPDATE ratings
           SET moderation_status = 'confirmed_abuse',
               weight = 0
           WHERE rating_id = ?`,
          [rating.rating_id],
        );

        await connection.query(
          `INSERT INTO rating_audit_logs (
             rating_id,
             performed_by,
             action_type,
             reason,
             details
           ) VALUES (?, ?, 'moderation_decision', ?, ?)`,
          [
            rating.rating_id,
            performed_by,
            "Suspicious activity confirmed by staff",
            JSON.stringify({
              activity_id: activity.activity_id,
              previous_moderation_status: rating.moderation_status,
              new_moderation_status: "confirmed_abuse",
              previous_weight: rating.weight,
              new_weight: 0,
            }),
          ],
        );

        ratingModerationChanged = true;
      }
    }

    // Update suspicious activity status
    await connection.query(
      `UPDATE suspicious_activities
       SET status = ?,
           reviewed_by = ?,
           reviewed_at = NOW()
       WHERE activity_id = ?`,
      [status, performed_by, id],
    );

    // Save the staff decision in the audit log
    await connection.query(
      `INSERT INTO rating_audit_logs (
         rating_id,
         performed_by,
         action_type,
         reason,
         details
       ) VALUES (?, ?, 'suspicious_activity', ?, ?)`,
      [
        activity.rating_id || null,
        performed_by,
        `Suspicious activity ${status} by staff`,
        JSON.stringify({
          activity_id: activity.activity_id,
          activity_type: activity.activity_type,
          activity_status: status,
          affected_user_id: activity.user_id,
          related_user_id: activity.related_user_id,
          rating_id: activity.rating_id,
        }),
      ],
    );

    await connection.commit();
    committed = true;

    connection.release();
    connection = null;

    // Recalculate credibility after the transaction
    let credibilityUpdated = null;

    if (status === "confirmed" && voter_id) {
      try {
        await recalculateUserCredibility(voter_id, performed_by);
        credibilityUpdated = true;
      } catch (error) {
        console.error("Credibility recalculation error:", error);
        credibilityUpdated = false;
      }
    }

    return res.status(200).json({
      message: "Suspicious activity reviewed successfully",
      activity_id: Number(id),
      status,
      ratingModerationChanged,
      credibilityUpdated,
    });
  } catch (error) {
    console.error("Review suspicious activity error:", error);

    if (connection && !committed) {
      await connection.rollback();
    }

    return res.status(500).json({
      message: "Failed to review suspicious activity",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  getSuspiciousActivities,
  getSuspiciousActivityById,
  reviewSuspiciousActivity,
};
