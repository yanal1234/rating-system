const db = require("../config/db");

const {
  initializeUserCredibility,
  recalculateUserCredibility,
} = require("./credibility.service");

const ALLOWED_MODERATION_STATUSES = [
  "normal",
  "suspicious",
  "under_review",
  "confirmed_abuse",
];

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Update rating moderation status
const updateRatingModeration = async ({
  rating_id,
  performed_by,
  moderation_status,
  reason,
}) => {
  let connection;
  let committed = false;
  let voter_id;

  try {
    // Validate rating ID
    if (!Number.isInteger(Number(rating_id)) || Number(rating_id) < 1) {
      throw createError("Invalid rating ID");
    }

    // Validate staff ID
    if (!Number.isInteger(Number(performed_by)) || Number(performed_by) < 1) {
      throw createError("Invalid staff ID");
    }

    // Validate moderation status
    if (!ALLOWED_MODERATION_STATUSES.includes(moderation_status)) {
      throw createError("Invalid moderation status");
    }

    // Validate reason
    if (typeof reason !== "string" || !reason.trim()) {
      throw createError("Moderation reason is required");
    }

    if (reason.trim().length > 500) {
      throw createError("Reason cannot exceed 500 characters");
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Lock rating during moderation
    const [ratings] = await connection.query(
      `SELECT
         rating_id,
         voter_id,
         status,
         moderation_status,
         weight
       FROM ratings
       WHERE rating_id = ?
       FOR UPDATE`,
      [rating_id],
    );

    if (ratings.length === 0) {
      throw createError("Rating not found", 404);
    }

    const rating = ratings[0];
    voter_id = rating.voter_id;

    // Invalidated ratings cannot be moderated
    if (rating.status === "invalid") {
      throw createError("Cannot moderate an invalidated rating", 400);
    }

    // Avoid duplicate decisions
    if (rating.moderation_status === moderation_status) {
      throw createError("Rating already has this moderation status", 409);
    }

    // Ensure credibility record exists
    await initializeUserCredibility(voter_id, connection);

    // Lock and retrieve current credibility weight
    const [credibilityRows] = await connection.query(
      `SELECT current_weight
       FROM user_credibility
       WHERE user_id = ?
       FOR UPDATE`,
      [voter_id],
    );

    if (credibilityRows.length === 0) {
      throw new Error("User credibility record not found");
    }

    const currentWeight = Number(credibilityRows[0].current_weight);

    // Determine new rating weight
    let newWeight = currentWeight;

    if (
      moderation_status === "under_review" ||
      moderation_status === "confirmed_abuse"
    ) {
      newWeight = 0;
    }

    // Update moderation status and weight
    await connection.query(
      `UPDATE ratings
       SET moderation_status = ?,
           weight = ?
       WHERE rating_id = ?`,
      [moderation_status, newWeight, rating_id],
    );

    // Record moderation decision in audit log
    await connection.query(
      `INSERT INTO rating_audit_logs (
         rating_id,
         performed_by,
         action_type,
         reason,
         details
       )
       VALUES (?, ?, 'moderation_decision', ?, ?)`,
      [
        rating_id,
        performed_by,
        reason.trim(),
        JSON.stringify({
          previous_moderation_status: rating.moderation_status,
          new_moderation_status: moderation_status,
          previous_weight: Number(rating.weight),
          new_weight: newWeight,
          voter_id,
        }),
      ],
    );

    await connection.commit();
    committed = true;

    // Release transaction connection before recalculating credibility
    connection.release();
    connection = null;

    // Recalculate credibility after the decision
    let credibility = null;
    let credibilityUpdated = true;

    try {
      credibility = await recalculateUserCredibility(voter_id, performed_by);
    } catch (credibilityError) {
      credibilityUpdated = false;

      console.error(
        "Credibility recalculation failed after moderation:",
        credibilityError,
      );
    }

    // Return the final effective weight when recalculation succeeds
    const finalWeight =
      moderation_status === "under_review" ||
      moderation_status === "confirmed_abuse"
        ? 0
        : credibilityUpdated
          ? credibility.current_weight
          : newWeight;

    return {
      rating_id: Number(rating_id),
      previous_moderation_status: rating.moderation_status,
      moderation_status,
      weight: finalWeight,
      credibility,
      credibilityUpdated,
    };
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
  updateRatingModeration,
};
