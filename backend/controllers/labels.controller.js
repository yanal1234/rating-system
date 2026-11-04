const db = require("../config/db");

// Get all labels
const getAllLabels = async (req, res) => {
  try {
    const [labels] = await db.query(
      `SELECT label_id, label_name, description, is_active, created_at
       FROM labels
       ORDER BY label_name ASC`,
    );

    return res.status(200).json({
      message: "Labels retrieved successfully",
      labels,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve labels",
    });
  }
};

// Create label
const createLabel = async (req, res) => {
  try {
    const { label_name, description } = req.body;

    if (!label_name || !label_name.trim()) {
      return res.status(400).json({
        message: "Label name is required",
      });
    }

    if (label_name.trim().length > 100) {
      return res.status(400).json({
        message: "Label name cannot exceed 100 characters",
      });
    }

    const [result] = await db.query(
      `INSERT INTO labels (label_name, description, created_by)
       VALUES (?, ?, ?)`,
      [label_name.trim(), description?.trim() || null, req.user.user_id],
    );

    return res.status(201).json({
      message: "Label created successfully",
      label_id: result.insertId,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Label name already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create label",
    });
  }
};

// Update label
const updateLabel = async (req, res) => {
  try {
    const { id } = req.params;
    const { label_name, description } = req.body;

    if (!label_name || !label_name.trim()) {
      return res.status(400).json({
        message: "Label name is required",
      });
    }

    if (label_name.trim().length > 100) {
      return res.status(400).json({
        message: "Label name cannot exceed 100 characters",
      });
    }

    const [result] = await db.query(
      `UPDATE labels
       SET label_name = ?, description = ?
       WHERE label_id = ?`,
      [label_name.trim(), description?.trim() || null, id],
    );

    if (result.affectedRows === 0) {
      const [labels] = await db.query(
        "SELECT label_id FROM labels WHERE label_id = ?",
        [id],
      );

      if (labels.length === 0) {
        return res.status(404).json({
          message: "Label not found",
        });
      }
    }

    return res.status(200).json({
      message: "Label updated successfully",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Label name already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update label",
    });
  }
};

// Activate / deactivate label
const toggleLabelStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (![0, 1, true, false].includes(is_active)) {
      return res.status(400).json({
        message: "is_active must be 0 or 1",
      });
    }

    const [result] = await db.query(
      `UPDATE labels
       SET is_active = ?
       WHERE label_id = ?`,
      [Number(is_active), id],
    );

    if (result.affectedRows === 0) {
      const [labels] = await db.query(
        "SELECT label_id FROM labels WHERE label_id = ?",
        [id],
      );

      if (labels.length === 0) {
        return res.status(404).json({
          message: "Label not found",
        });
      }
    }

    return res.status(200).json({
      message: "Label status updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update label status",
    });
  }
};

module.exports = {
  getAllLabels,
  createLabel,
  updateLabel,
  toggleLabelStatus,
};
