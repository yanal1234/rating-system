const db = require("../config/db");

const {
  initializeUserCredibility,
  recalculateUserCredibility,
} = require("./credibility.service");

const { detectSuspiciousActivities } = require("./suspiciousDetection.service");

const INTERACTION_TYPES = [
  "project",
  "cluster",
  "campus_event",
  "campus_activity",
  "other",
];

// Helper: create an error with an HTTP status code
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Create rating
const createRating = async ({
  window_id,
  voter_id,
  rated_user_id,
  stars,
  labels = [],
  feedback,
  interaction_type,
  interaction_details,
}) => {
  let connection;
  let committed = false;

  try {
    // Validate IDs
    if (
      !Number.isInteger(Number(window_id)) ||
      Number(window_id) < 1 ||
      !Number.isInteger(Number(voter_id)) ||
      Number(voter_id) < 1 ||
      !Number.isInteger(Number(rated_user_id)) ||
      Number(rated_user_id) < 1
    ) {
      throw createError("Invalid user or voting window ID");
    }

    // Validate stars
    if (
      !Number.isInteger(Number(stars)) ||
      Number(stars) < 1 ||
      Number(stars) > 3
    ) {
      throw createError("Stars must be between 1 and 3");
    }

    // Prevent self-rating
    if (Number(voter_id) === Number(rated_user_id)) {
      throw createError("You cannot rate yourself");
    }

    // Validate interaction type
    if (!INTERACTION_TYPES.includes(interaction_type)) {
      throw createError("Invalid interaction type");
    }

    // Validate interaction details
    if (
      interaction_details !== undefined &&
      interaction_details !== null &&
      typeof interaction_details !== "string"
    ) {
      throw createError("Interaction details must be a string");
    }

    const normalizedInteractionDetails =
      typeof interaction_details === "string"
        ? interaction_details.trim()
        : null;

    // Validate feedback
    if (
      feedback !== undefined &&
      feedback !== null &&
      typeof feedback !== "string"
    ) {
      throw createError("Feedback must be a string");
    }

    const normalizedFeedback =
      typeof feedback === "string" ? feedback.trim() : "";

    // Validate labels
    if (!Array.isArray(labels)) {
      throw createError("Labels must be an array");
    }

    // One-star ratings require feedback and at least one flag
    if (Number(stars) === 1) {
      if (!normalizedFeedback) {
        throw createError("Written feedback is required for a one-star rating");
      }

      if (labels.length === 0) {
        throw createError(
          "At least one flag is required for a one-star rating",
        );
      }
    }

    // Validate label structure
    const labelIds = [];

    for (const label of labels) {
      if (!label || typeof label !== "object" || Array.isArray(label)) {
        throw createError("Invalid label format");
      }

      const labelId = Number(label.label_id);
      const labelStars = Number(label.stars);

      if (
        !Number.isInteger(labelId) ||
        labelId < 1 ||
        !Number.isInteger(labelStars) ||
        labelStars < 1 ||
        labelStars > 3
      ) {
        throw createError("Invalid label ID or label stars");
      }

      labelIds.push(labelId);
    }

    // Prevent duplicate labels
    if (new Set(labelIds).size !== labelIds.length) {
      throw createError("Duplicate labels are not allowed");
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check voting window
    const [windows] = await connection.query(
      `SELECT window_id
       FROM voting_windows
       WHERE window_id = ?
         AND status = 'published'
         AND starts_at <= NOW()
         AND ends_at >= NOW()
       FOR UPDATE`,
      [window_id],
    );

    if (windows.length === 0) {
      throw createError("Voting window not found or not currently active");
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
      throw createError(
        "Both users must be participants in this voting window",
        403,
      );
    }

    // Validate labels against active labels and allowed star levels
    if (labels.length > 0) {
      const placeholders = labelIds.map(() => "?").join(",");

      const [allowedLevels] = await connection.query(
        `SELECT l.label_id, lsl.stars
         FROM labels l
         JOIN label_star_levels lsl
           ON l.label_id = lsl.label_id
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
          throw createError(
            `Invalid or inactive label, or stars are not allowed for label ${label.label_id}`,
          );
        }
      }
    }

    // Initialize credibility record
    await initializeUserCredibility(voter_id, connection);

    // Get current weight based on voter's credibility
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

    // Insert rating
    const [ratingResult] = await connection.query(
      `INSERT INTO ratings (
         window_id,
         voter_id,
         rated_user_id,
         stars,
         status,
         weight,
         moderation_status,
         feedback,
         interaction_type,
         interaction_details
       )
       VALUES (?, ?, ?, ?, 'valid', ?, 'normal', ?, ?, ?)`,
      [
        window_id,
        voter_id,
        rated_user_id,
        Number(stars),
        currentWeight,
        normalizedFeedback || null,
        interaction_type,
        normalizedInteractionDetails || null,
      ],
    );

    const rating_id = ratingResult.insertId;

    // Insert rating labels
    if (labels.length > 0) {
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
    }

    // Increase total ratings submitted by this user
    await connection.query(
      `UPDATE user_credibility
       SET total_ratings = total_ratings + 1
       WHERE user_id = ?`,
      [voter_id],
    );

    // Insert audit log
    await connection.query(
      `INSERT INTO rating_audit_logs (
         rating_id,
         performed_by,
         action_type,
         reason,
         details
       )
       VALUES (?, ?, 'rating_created', ?, ?)`,
      [
        rating_id,
        voter_id,
        "Rating created successfully",
        JSON.stringify({
          window_id,
          rated_user_id,
          stars: Number(stars),
          feedback: normalizedFeedback || null,
          interaction_type,
          interaction_details: normalizedInteractionDetails || null,
          labels,
          weight: currentWeight,
          moderation_status: "normal",
        }),
      ],
    );

    // Commit rating transaction
    await connection.commit();
    committed = true;

    // Release connection before running detection
    connection.release();
    connection = null;

    // Run suspicious activity detection after saving the rating
    try {
      await detectSuspiciousActivities(Number(window_id));
    } catch (detectionError) {
      console.error("Suspicious activity detection failed:", detectionError);
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

// Get ratings for staff moderation
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
       r.weight,
       r.moderation_status,
       r.feedback,
       r.interaction_type,
       r.interaction_details,
       r.invalidated_by,
       r.invalidation_reason,
       r.invalidated_at,
       r.created_at
     FROM ratings r
     JOIN users voter
       ON r.voter_id = voter.user_id
     JOIN users rated
       ON r.rated_user_id = rated.user_id
     WHERE r.window_id = ?
     ORDER BY r.created_at DESC`,
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
  let voter_id;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Get and lock current rating
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

    if (ratings.length === 0 || ratings[0].status === "invalid") {
      throw createError("Rating not found or already invalid", 404);
    }

    const previousRating = ratings[0];
    voter_id = previousRating.voter_id;

    // Invalidate rating and remove its mathematical influence
    await connection.query(
      `UPDATE ratings
       SET status = 'invalid',
           weight = 0,
           invalidated_by = ?,
           invalidation_reason = ?,
           invalidated_at = NOW()
       WHERE rating_id = ?`,
      [performed_by, invalidation_reason, rating_id],
    );

    // Record audit log
    await connection.query(
      `INSERT INTO rating_audit_logs (
         rating_id,
         performed_by,
         action_type,
         reason,
         details
       )
       VALUES (?, ?, 'rating_invalidated', ?, ?)`,
      [
        rating_id,
        performed_by,
        invalidation_reason,
        JSON.stringify({
          previous_status: previousRating.status,
          previous_moderation_status: previousRating.moderation_status,
          previous_weight: Number(previousRating.weight),
          new_status: "invalid",
          new_weight: 0,
        }),
      ],
    );

    await connection.commit();
    committed = true;

    // Release connection before recalculating credibility
    connection.release();
    connection = null;

    // Recalculate credibility because an invalidated confirmed-abuse
    // rating must no longer contribute to the credibility penalty.
    let credibilityUpdated = true;

    try {
      await recalculateUserCredibility(voter_id, performed_by);
    } catch (credibilityError) {
      credibilityUpdated = false;

      console.error(
        "Credibility recalculation failed after invalidation:",
        credibilityError,
      );
    }

    return {
      success: true,
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
  createRating,
  getRatings,
  invalidateRating,
};
