const db = require("../config/db");

// Add labels to a rating
const addRatingLabels = async (req, res) => {
  try {
    const { rating_id, labels } = req.body;

    if (!rating_id || !Array.isArray(labels) || labels.length === 0) {
      return res.status(400).json({
        message: "Rating ID and labels are required",
      });
    }

    // Check rating ownership and status
    const [ratings] = await db.query(
      `SELECT rating_id, voter_id, status
       FROM ratings
       WHERE rating_id = ?`,
      [rating_id],
    );

    if (ratings.length === 0) {
      return res.status(404).json({
        message: "Rating not found",
      });
    }

    const rating = ratings[0];

    if (rating.voter_id !== req.user.user_id) {
      return res.status(403).json({
        message: "You cannot modify another user's rating",
      });
    }

    if (rating.status !== "valid") {
      return res.status(400).json({
        message: "Cannot add labels to an invalid rating",
      });
    }

    // Validate labels
    for (const item of labels) {
      if (
        !Number.isInteger(item.label_id) ||
        !Number.isInteger(item.stars) ||
        item.stars < 1 ||
        item.stars > 3
      ) {
        return res.status(400).json({
          message:
            "Each label must have a valid label ID and stars from 1 to 3",
        });
      }

      const [allowedLevels] = await db.query(
        `SELECT l.label_id
         FROM labels l
         JOIN label_star_levels ls ON l.label_id = ls.label_id
         WHERE l.label_id = ?
           AND l.is_active = 1
           AND ls.stars = ?`,
        [item.label_id, item.stars],
      );

      if (allowedLevels.length === 0) {
        return res.status(400).json({
          message: `Invalid label or star level for label ${item.label_id}`,
        });
      }
    }

    // Insert labels
    const values = labels.map((item) => [rating_id, item.label_id, item.stars]);

    await db.query(
      `INSERT INTO rating_labels (rating_id, label_id, stars)
       VALUES ?`,
      [values],
    );

    return res.status(201).json({
      message: "Rating labels added successfully",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "A label was already added to this rating",
      });
    }

    return res.status(500).json({
      message: "Failed to add rating labels",
    });
  }
};

// Get labels for a rating
const getRatingLabels = async (req, res) => {
  try {
    const { rating_id } = req.params;

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
    return res.status(500).json({
      message: "Failed to retrieve rating labels",
    });
  }
};

module.exports = {
  addRatingLabels,
  getRatingLabels,
};
