const db = require("../config/db");

// Validate positive numeric IDs
const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

// Get star levels for a label
const getStarLevels = async (req, res) => {
  try {
    const { label_id } = req.params;

    if (!isValidId(label_id)) {
      return res.status(400).json({
        message: "Invalid label ID",
      });
    }

    const [labels] = await db.query(
      "SELECT label_id FROM labels WHERE label_id = ?",
      [label_id],
    );

    if (labels.length === 0) {
      return res.status(404).json({
        message: "Label not found",
      });
    }

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
    console.error("Get star levels error:", error);

    return res.status(500).json({
      message: "Failed to retrieve star levels",
    });
  }
};

// Set star levels for a label
const setStarLevels = async (req, res) => {
  let connection;

  try {
    const { label_id } = req.params;
    const stars = req.body?.stars;

    if (!isValidId(label_id)) {
      return res.status(400).json({
        message: "Invalid label ID",
      });
    }

    if (
      !Array.isArray(stars) ||
      stars.length === 0 ||
      !stars.every((star) => Number.isInteger(star) && star >= 1 && star <= 3)
    ) {
      return res.status(400).json({
        message:
          "Stars must be a non-empty array containing values from 1 to 3",
      });
    }

    const uniqueStars = [...new Set(stars)];

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check whether the label exists and lock it
    const [labels] = await connection.query(
      `SELECT label_id
       FROM labels
       WHERE label_id = ?
       FOR UPDATE`,
      [label_id],
    );

    if (labels.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Label not found",
      });
    }

    // Replace existing star levels atomically
    await connection.query("DELETE FROM label_star_levels WHERE label_id = ?", [
      label_id,
    ]);

    const values = uniqueStars.map((star) => [label_id, star]);

    await connection.query(
      `INSERT INTO label_star_levels (label_id, stars)
       VALUES ?`,
      [values],
    );

    await connection.commit();

    return res.status(200).json({
      message: "Star levels updated successfully",
      stars: uniqueStars,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Set star levels error:", error);

    return res.status(500).json({
      message: "Failed to update star levels",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  getStarLevels,
  setStarLevels,
};
