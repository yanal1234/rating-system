const db = require("../config/db");

// Get all labels
const getAllLabels = async () => {
  const [labels] = await db.query(
    `SELECT label_id, label_name, description, is_active, created_at
     FROM labels
     ORDER BY label_name ASC`,
  );

  return labels;
};

// Create label
const createLabel = async (label_name, description, user_id) => {
  const [result] = await db.query(
    `INSERT INTO labels (label_name, description, created_by)
     VALUES (?, ?, ?)`,
    [label_name, description, user_id],
  );

  return result.insertId;
};

// Update label
const updateLabel = async (id, label_name, description) => {
  const [result] = await db.query(
    `UPDATE labels
     SET label_name = ?, description = ?
     WHERE label_id = ?`,
    [label_name, description, id],
  );

  if (result.affectedRows === 0) {
    const [labels] = await db.query(
      "SELECT label_id FROM labels WHERE label_id = ?",
      [id],
    );

    if (labels.length === 0) {
      return false;
    }
  }

  return true;
};

// Activate / deactivate label
const toggleLabelStatus = async (id, is_active) => {
  const [result] = await db.query(
    `UPDATE labels
     SET is_active = ?
     WHERE label_id = ?`,
    [is_active, id],
  );

  if (result.affectedRows === 0) {
    const [labels] = await db.query(
      "SELECT label_id FROM labels WHERE label_id = ?",
      [id],
    );

    if (labels.length === 0) {
      return false;
    }
  }

  return true;
};

module.exports = {
  getAllLabels,
  createLabel,
  updateLabel,
  toggleLabelStatus,
};
