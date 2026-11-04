const db = require("../config/db");

// Get star levels for a label
const getStarLevels = async (req, res) => {
  try {
    const { label_id } = req.params;

    const [levels] = await db.query(
      `SELECT label_id, stars
       FROM label_star_levels
       WHERE label_id = ?
       ORDER BY stars ASC`,
      [label_id],
    );

    return res.status(200).json({
      message: "Star levels retrieved successfully",
      levels,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve star levels",
    });
  }
};

// Set star levels for a label
const setStarLevels = async (req, res) => {
  try {
    const { label_id } = req.params;
    const { stars } = req.body;

    if (
      !Array.isArray(stars) ||
      stars.length === 0 ||
      !stars.every((star) => Number.isInteger(star) && star >= 1 && star <= 3)
    ) {
      return res.status(400).json({
        message: "Stars must be an array containing values from 1 to 3",
      });
    }

    const uniqueStars = [...new Set(stars)];

    const [labels] = await db.query(
      "SELECT label_id FROM labels WHERE label_id = ?",
      [label_id],
    );

    if (labels.length === 0) {
      return res.status(404).json({
        message: "Label not found",
      });
    }

    await db.query("DELETE FROM label_star_levels WHERE label_id = ?", [
      label_id,
    ]);

    const values = uniqueStars.map((star) => [label_id, star]);

    await db.query(
      `INSERT INTO label_star_levels (label_id, stars)
       VALUES ?`,
      [values],
    );

    return res.status(200).json({
      message: "Star levels updated successfully",
      stars: uniqueStars,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update star levels",
    });
  }
};

module.exports = {
  getStarLevels,
  setStarLevels,
};
