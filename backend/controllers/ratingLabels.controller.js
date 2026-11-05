const db = require("../config/db");

// Add labels to a rating
const addRatingLabels = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { rating_id, labels } = req.body;

    if (
      !Number.isSafeInteger(Number(rating_id)) ||
      Number(rating_id) <= 0 ||
      !Array.isArray(labels) ||
      labels.length === 0
    ) {
      return res.status(400).json({
        message: "Valid rating ID and labels are required",
      });
    }

    const normalizedRatingId = Number(rating_id);

    const seenLabels = new Set();

    for (const item of labels) {
      if (
        !item ||
        !Number.isSafeInteger(item.label_id) ||
        item.label_id <= 0 ||
        !Number.isInteger(item.stars) ||
        item.stars < 1 ||
        item.stars > 3
      ) {
        return res.status(400).json({
          message: "Each label must have a valid ID and stars from 1 to 3",
        });
      }

      if (seenLabels.has(item.label_id)) {
        return res.status(400).json({
          message: "Duplicate labels are not allowed",
        });
      }

      seenLabels.add(item.label_id);
    }

    await connection.beginTransaction();

    const [ratings] = await connection.query(
      `SELECT rating_id, voter_id, status
       FROM ratings
       WHERE rating_id = ?
       FOR UPDATE`,
      [normalizedRatingId],
    );

    if (ratings.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Rating not found",
      });
    }

    const rating = ratings[0];

    if (Number(rating.voter_id) !== Number(req.user.user_id)) {
      await connection.rollback();

      return res.status(403).json({
        message: "You cannot modify another user's rating",
      });
    }

    if (rating.status !== "valid") {
      await connection.rollback();

      return res.status(400).json({
        message: "Cannot add labels to an invalid rating",
      });
    }

    const labelIds = labels.map((item) => item.label_id);

    const [allowedLabels] = await connection.query(
      `SELECT l.label_id, ls.stars
       FROM labels l
       JOIN label_star_levels ls ON l.label_id = ls.label_id
       WHERE l.is_active = 1
         AND l.label_id IN (${labelIds.map(() => "?").join(",")})`,
      labelIds,
    );

    const allowedLevels = new Set(
      allowedLabels.map(
        (item) => `${Number(item.label_id)}:${Number(item.stars)}`,
      ),
    );

    for (const item of labels) {
      if (!allowedLevels.has(`${item.label_id}:${item.stars}`)) {
        await connection.rollback();

        return res.status(400).json({
          message: `Invalid label or star level for label ${item.label_id}`,
        });
      }
    }

    const values = labels.map((item) => [
      normalizedRatingId,
      item.label_id,
      item.stars,
    ]);

    await connection.query(
      `INSERT INTO rating_labels (rating_id, label_id, stars)
       VALUES ?`,
      [values],
    );

    await connection.commit();

    return res.status(201).json({
      message: "Rating labels added successfully",
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "A label was already added to this rating",
      });
    }

    console.error("Add rating labels error:", error);

    return res.status(500).json({
      message: "Failed to add rating labels",
    });
  } finally {
    connection.release();
  }
};

// Get labels for a rating
const getRatingLabels = async (req, res) => {
  try {
    const { rating_id } = req.params;

    if (!/^[1-9]\d*$/.test(rating_id)) {
      return res.status(400).json({
        message: "Invalid rating ID",
      });
    }

    const [ratings] = await db.query(
      `SELECT rating_id
       FROM ratings
       WHERE rating_id = ?`,
      [rating_id],
    );

    if (ratings.length === 0) {
      return res.status(404).json({
        message: "Rating not found",
      });
    }

    const [labels] = await db.query(
      `SELECT
         rl.rating_id,
         rl.label_id,
         l.label_name,
         rl.stars
       FROM rating_labels rl
       JOIN labels l ON rl.label_id = l.label_id
       WHERE rl.rating_id = ?
       ORDER BY l.label_name ASC`,
      [rating_id],
    );

    return res.status(200).json({
      message: "Rating labels retrieved successfully",
      labels,
    });
  } catch (error) {
    console.error("Get rating labels error:", error);

    return res.status(500).json({
      message: "Failed to retrieve rating labels",
    });
  }
};

module.exports = {
  addRatingLabels,
  getRatingLabels,
};
