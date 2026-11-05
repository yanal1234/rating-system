const db = require("../config/db");
const { detectSuspiciousActivities } = require("./suspiciousDetection.service");

// Create rating
const createRating = async ({
  window_id,
  voter_id,
  rated_user_id,
  stars,
  labels,
}) => {
  let connection;
  let committed = false;

  try {
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
      const error = new Error(
        "Voting window not found or not currently active",
      );
      error.statusCode = 400;
      throw error;
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
      const error = new Error(
        "Both users must be participants in this voting window",
      );
      error.statusCode = 403;
      throw error;
    }

    // Check allowed label star levels
    const labelIds = labels.map((label) => Number(label.label_id));
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
        const error = new Error(
          `Invalid or inactive label, or stars are not allowed for label ${label.label_id}`,
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // Insert rating
    const [ratingResult] = await connection.query(
      `INSERT INTO ratings
       (window_id, voter_id, rated_user_id, stars)
       VALUES (?, ?, ?, ?)`,
      [window_id, voter_id, rated_user_id, stars],
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
          window_id,
          rated_user_id,
          stars,
          labels,
        }),
      ],
    );

    // Commit transaction
    await connection.commit();
    committed = true;

    // Detect suspicious activities after commit
    try {
      await detectSuspiciousActivities(Number(window_id));
    } catch (detectionError) {
      console.error("Suspicious detection failed:", detectionError);
    }

    return rating_id;
  } catch (error) {
    if (connection && !committed) {
      await connection.rollback();
    }

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Get ratings
const getRatings = async (window_id) => {
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

  return ratings;
};

// Invalidate rating
const invalidateRating = async ({
  rating_id,
  performed_by,
  invalidation_reason,
}) => {
  let connection;
  let committed = false;

  try {
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
      [performed_by, invalidation_reason, rating_id],
    );

    if (result.affectedRows === 0) {
      const error = new Error("Rating not found or already invalid");
      error.statusCode = 404;
      throw error;
    }

    // Insert audit log
    await connection.query(
      `INSERT INTO rating_audit_logs
       (rating_id, performed_by, action_type, reason, details)
       VALUES (?, ?, 'rating_invalidated', ?, ?)`,
      [
        rating_id,
        performed_by,
        invalidation_reason,
        JSON.stringify({
          action: "Rating invalidated",
        }),
      ],
    );

    await connection.commit();
    committed = true;
  } catch (error) {
    if (connection && !committed) {
      await connection.rollback();
    }

    throw error;
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
