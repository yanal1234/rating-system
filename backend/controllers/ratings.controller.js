const db = require("../config/db");
const {
  detectSuspiciousActivities,
} = require("../services/suspiciousDetection.service");

// Create rating with labels and audit log
const createRating = async (req, res) => {
  let connection;

  try {
    const { window_id, rated_user_id, stars, labels } = req.body;
    const voter_id = req.user.user_id;

    // Validate required fields
    if (
      !window_id ||
      !rated_user_id ||
      stars === undefined ||
      !Array.isArray(labels)
    ) {
      return res.status(400).json({
        message: "Window ID, rated user ID, stars and labels are required",
      });
    }

    if (
      !Number.isInteger(Number(window_id)) ||
      Number(window_id) <= 0 ||
      !Number.isInteger(Number(rated_user_id)) ||
      Number(rated_user_id) <= 0
    ) {
      return res.status(400).json({
        message: "Invalid window ID or rated user ID",
      });
    }

    const ratingStars = Number(stars);

    if (!Number.isInteger(ratingStars) || ratingStars < 1 || ratingStars > 3) {
      return res.status(400).json({
        message: "Stars must be between 1 and 3",
      });
    }

    if (Number(rated_user_id) === Number(voter_id)) {
      return res.status(400).json({
        message: "You cannot rate yourself",
      });
    }

    if (labels.length === 0) {
      return res.status(400).json({
        message: "At least one label is required",
      });
    }

    // Validate labels format and prevent duplicates
    const labelIds = [];

    for (const label of labels) {
      const labelId = Number(label.label_id);
      const labelStars = Number(label.stars);

      if (
        !Number.isInteger(labelId) ||
        labelId <= 0 ||
        !Number.isInteger(labelStars) ||
        labelStars < 1 ||
        labelStars > 3
      ) {
        return res.status(400).json({
          message:
            "Each label must have a valid label ID and stars between 1 and 3",
        });
      }

      labelIds.push(labelId);
    }

    if (new Set(labelIds).size !== labelIds.length) {
      return res.status(400).json({
        message: "Duplicate labels are not allowed",
      });
    }

    // Start transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check voting window
    const [windows] = await connection.query(
      `SELECT window_id
       FROM voting_windows
       WHERE window_id = ?
         AND status = 'published'
         AND starts_at <= NOW()
         AND ends_at >= NOW()`,
      [window_id],
    );

    if (windows.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "Voting window not found or not currently active",
      });
    }

    // Check voter and rated user participation
    const [participants] = await connection.query(
      `SELECT user_id
       FROM rating_participants
       WHERE window_id = ?
         AND user_id IN (?, ?)`,
      [window_id, voter_id, rated_user_id],
    );

    if (participants.length !== 2) {
      await connection.rollback();

      return res.status(403).json({
        message: "Both users must be participants in this voting window",
      });
    }

    // Check that labels are active and their stars are allowed
    const placeholders = labelIds.map(() => "?").join(",");

    const [allowedLevels] = await connection.query(
      `SELECT l.label_id, lsl.stars
       FROM labels l
       JOIN label_star_levels lsl ON l.label_id = lsl.label_id
       WHERE l.is_active = 1
         AND l.label_id IN (${placeholders})`,
      labelIds,
    );

    for (const label of labels) {
      const isAllowed = allowedLevels.some(
        (level) =>
          Number(level.label_id) === Number(label.label_id) &&
          Number(level.stars) === Number(label.stars),
      );

      if (!isAllowed) {
        await connection.rollback();

        return res.status(400).json({
          message: `Invalid or inactive label, or stars are not allowed for label ${label.label_id}`,
        });
      }
    }

    // Insert rating
    const [ratingResult] = await connection.query(
      `INSERT INTO ratings
       (window_id, voter_id, rated_user_id, stars)
       VALUES (?, ?, ?, ?)`,
      [window_id, voter_id, rated_user_id, ratingStars],
    );

    const rating_id = ratingResult.insertId;

    // Insert rating labels
    const labelValues = labels.map((label) => [
      rating_id,
      Number(label.label_id),
      Number(label.stars),
    ]);

    await connection.query(
      `INSERT INTO rating_labels
       (rating_id, label_id, stars)
       VALUES ?`,
      [labelValues],
    );

    // Insert audit log
    await connection.query(
      `INSERT INTO rating_audit_logs
       (rating_id, performed_by, action_type, reason, details)
       VALUES (?, ?, 'rating_created', ?, ?)`,
      [
        rating_id,
        voter_id,
        "Rating created successfully",
        JSON.stringify({
          window_id: Number(window_id),
          rated_user_id: Number(rated_user_id),
          stars: ratingStars,
          labels,
        }),
      ],
    );

    // Save all changes
    await connection.commit();

    // Run suspicious voting detection after successful commit
    try {
      await detectSuspiciousActivities(Number(window_id));
    } catch (detectionError) {
      console.error("Suspicious detection failed:", detectionError);
    }

    return res.status(201).json({
      message: "Rating submitted successfully",
      rating_id,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "You have already rated this user in this window",
      });
    }

    console.error("Create rating error:", error);

    return res.status(500).json({
      message: "Failed to submit rating",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Get ratings (Staff only)
const getRatings = async (req, res) => {
  try {
    const { window_id } = req.params;

    const [ratings] = await db.query(
      `SELECT
         r.rating_id,
         r.window_id,
         r.voter_id,
         voter.username AS voter_username,
         r.rated_user_id,
         rated.username AS rated_username,
         r.stars,
         r.status,
         r.invalidated_by,
         r.invalidation_reason,
         r.invalidated_at
       FROM ratings r
       JOIN users voter ON r.voter_id = voter.user_id
       JOIN users rated ON r.rated_user_id = rated.user_id
       WHERE r.window_id = ?
       ORDER BY r.rating_id DESC`,
      [window_id],
    );

    return res.status(200).json({
      message: "Ratings retrieved successfully",
      ratings,
    });
  } catch (error) {
    console.error("Get ratings error:", error);

    return res.status(500).json({
      message: "Failed to retrieve ratings",
    });
  }
};

// Invalidate rating (Staff only)
const invalidateRating = async (req, res) => {
  let connection;

  try {
    const { id } = req.params;
    const { invalidation_reason } = req.body;

    if (!invalidation_reason || !invalidation_reason.trim()) {
      return res.status(400).json({
        message: "Invalidation reason is required",
      });
    }

    if (invalidation_reason.trim().length > 500) {
      return res.status(400).json({
        message: "Invalidation reason cannot exceed 500 characters",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE ratings
       SET status = 'invalid',
           invalidated_by = ?,
           invalidation_reason = ?,
           invalidated_at = NOW()
       WHERE rating_id = ?
         AND status = 'valid'`,
      [req.user.user_id, invalidation_reason.trim(), id],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Rating not found or already invalid",
      });
    }

    // Add audit log
    await connection.query(
      `INSERT INTO rating_audit_logs
       (rating_id, performed_by, action_type, reason, details)
       VALUES (?, ?, 'rating_invalidated', ?, ?)`,
      [
        id,
        req.user.user_id,
        invalidation_reason.trim(),
        JSON.stringify({
          action: "Rating invalidated",
        }),
      ],
    );

    await connection.commit();

    return res.status(200).json({
      message: "Rating invalidated successfully",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Invalidate rating error:", error);

    return res.status(500).json({
      message: "Failed to invalidate rating",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  createRating,
  getRatings,
  invalidateRating,
};
