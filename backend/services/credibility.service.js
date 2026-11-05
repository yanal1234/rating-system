const db = require("../config/db");

// Initial credibility settings
const DEFAULT_CREDIBILITY_SCORE = 50;
const DEFAULT_WEIGHT = 1.0;

// Penalty applies only to valid ratings confirmed as abuse by staff.
// These values are initial settings and can be adjusted later.
const CONFIRMED_ABUSE_PENALTY = 10;

// Convert credibility score into rating weight
const getWeightFromScore = (score) => {
  if (score >= 40) return 1.0;
  if (score >= 30) return 0.75;
  if (score >= 20) return 0.5;

  return 0.25;
};

// Initialize user credibility
const initializeUserCredibility = async (user_id, connection = db) => {
  await connection.query(
    `INSERT INTO user_credibility (
       user_id,
       credibility_score,
       current_weight,
       total_ratings,
       reviewed_ratings
     )
     VALUES (?, ?, ?, 0, 0)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
    [user_id, DEFAULT_CREDIBILITY_SCORE, DEFAULT_WEIGHT],
  );

  return getUserCredibility(user_id, connection);
};

// Get user credibility
const getUserCredibility = async (user_id, connection = db) => {
  const [rows] = await connection.query(
    `SELECT
       user_id,
       credibility_score,
       current_weight,
       total_ratings,
       reviewed_ratings,
       updated_at
     FROM user_credibility
     WHERE user_id = ?`,
    [user_id],
  );

  return rows[0] || null;
};

// Recalculate user credibility
const recalculateUserCredibility = async (user_id, performed_by = null) => {
  let connection;
  let committed = false;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Ensure credibility record exists
    await initializeUserCredibility(user_id, connection);

    // Count all ratings submitted by this user
    const [ratingCounts] = await connection.query(
      `SELECT COUNT(*) AS total_ratings
       FROM ratings
       WHERE voter_id = ?`,
      [user_id],
    );

    // Count ratings reviewed by staff
    const [reviewedCounts] = await connection.query(
      `SELECT COUNT(DISTINCT ral.rating_id) AS reviewed_ratings
       FROM rating_audit_logs ral
       JOIN ratings r
         ON r.rating_id = ral.rating_id
       WHERE r.voter_id = ?
         AND ral.action_type = 'moderation_decision'`,
      [user_id],
    );

    // Count only valid ratings confirmed as abuse
    const [abuseCounts] = await connection.query(
      `SELECT COUNT(*) AS confirmed_abuse_count
       FROM ratings
       WHERE voter_id = ?
         AND status = 'valid'
         AND moderation_status = 'confirmed_abuse'`,
      [user_id],
    );

    const totalRatings = Number(ratingCounts[0].total_ratings);
    const reviewedRatings = Number(reviewedCounts[0].reviewed_ratings);
    const confirmedAbuseCount = Number(abuseCounts[0].confirmed_abuse_count);

    // Calculate credibility score
    const credibilityScore = Math.max(
      0,
      DEFAULT_CREDIBILITY_SCORE - confirmedAbuseCount * CONFIRMED_ABUSE_PENALTY,
    );

    // Calculate current rating weight
    const currentWeight = getWeightFromScore(credibilityScore);

    // Lock and retrieve previous credibility values
    const [previousRows] = await connection.query(
      `SELECT
         credibility_score,
         current_weight,
         total_ratings,
         reviewed_ratings
       FROM user_credibility
       WHERE user_id = ?
       FOR UPDATE`,
      [user_id],
    );

    const previousCredibility = previousRows[0];

    if (!previousCredibility) {
      throw new Error("User credibility record not found");
    }

    // Update credibility information
    await connection.query(
      `UPDATE user_credibility
       SET credibility_score = ?,
           current_weight = ?,
           total_ratings = ?,
           reviewed_ratings = ?
       WHERE user_id = ?`,
      [credibilityScore, currentWeight, totalRatings, reviewedRatings, user_id],
    );

    // Update weights of eligible existing ratings.
    // Keep zero weight for ratings under review or confirmed abuse.
    // Invalidated ratings are not modified.
    await connection.query(
      `UPDATE ratings
       SET weight = ?
       WHERE voter_id = ?
         AND status = 'valid'
         AND moderation_status NOT IN (
           'under_review',
           'confirmed_abuse'
         )`,
      [currentWeight, user_id],
    );

    // Check whether any credibility information changed
    const credibilityChanged =
      Number(previousCredibility.credibility_score) !== credibilityScore ||
      Number(previousCredibility.current_weight) !== currentWeight ||
      Number(previousCredibility.total_ratings) !== totalRatings ||
      Number(previousCredibility.reviewed_ratings) !== reviewedRatings;

    // Record changes in audit log
    if (credibilityChanged) {
      await connection.query(
        `INSERT INTO rating_audit_logs (
           performed_by,
           action_type,
           reason,
           details
         )
         VALUES (?, 'credibility_updated', ?, ?)`,
        [
          performed_by,
          "User credibility recalculated",
          JSON.stringify({
            user_id,
            previous_score: Number(previousCredibility.credibility_score),
            new_score: credibilityScore,
            previous_weight: Number(previousCredibility.current_weight),
            new_weight: currentWeight,
            total_ratings: totalRatings,
            reviewed_ratings: reviewedRatings,
            confirmed_abuse_count: confirmedAbuseCount,
          }),
        ],
      );
    }

    await connection.commit();
    committed = true;

    return {
      user_id,
      credibility_score: credibilityScore,
      current_weight: currentWeight,
      total_ratings: totalRatings,
      reviewed_ratings: reviewedRatings,
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
  initializeUserCredibility,
  getUserCredibility,
  recalculateUserCredibility,
};
