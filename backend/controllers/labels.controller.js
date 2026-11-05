const {
  getAllLabels: getAllLabelsService,
  createLabel: createLabelService,
  updateLabel: updateLabelService,
  toggleLabelStatus: toggleLabelStatusService,
} = require("../services/label.service");

// Validate positive numeric IDs without converting to Number
const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

// Get all labels
const getAllLabels = async (req, res) => {
  try {
    const labels = await getAllLabelsService();

    return res.status(200).json({
      message: "Labels retrieved successfully",
      labels,
    });
  } catch (error) {
    console.error("Get all labels error:", error);

    return res.status(500).json({
      message: "Failed to retrieve labels",
    });
  }
};

// Create label
const createLabel = async (req, res) => {
  try {
    const { label_name, description } = req.body;

    if (typeof label_name !== "string" || !label_name.trim()) {
      return res.status(400).json({
        message: "Label name is required",
      });
    }

    const trimmedName = label_name.trim();

    if (trimmedName.length > 100) {
      return res.status(400).json({
        message: "Label name cannot exceed 100 characters",
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be a string",
      });
    }

    const label_id = await createLabelService(
      trimmedName,
      typeof description === "string" ? description.trim() || null : null,
      req.user.user_id,
    );

    return res.status(201).json({
      message: "Label created successfully",
      label_id,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Label name already exists",
      });
    }

    console.error("Create label error:", error);

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

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid label ID",
      });
    }

    if (typeof label_name !== "string" || !label_name.trim()) {
      return res.status(400).json({
        message: "Label name is required",
      });
    }

    const trimmedName = label_name.trim();

    if (trimmedName.length > 100) {
      return res.status(400).json({
        message: "Label name cannot exceed 100 characters",
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be a string",
      });
    }

    const updated = await updateLabelService(
      id,
      trimmedName,
      typeof description === "string" ? description.trim() || null : null,
    );

    if (!updated) {
      return res.status(404).json({
        message: "Label not found",
      });
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

    console.error("Update label error:", error);

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

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid label ID",
      });
    }

    if (![0, 1, true, false].includes(is_active)) {
      return res.status(400).json({
        message: "is_active must be 0 or 1",
      });
    }

    const updated = await toggleLabelStatusService(id, Number(is_active));

    if (!updated) {
      return res.status(404).json({
        message: "Label not found",
      });
    }

    return res.status(200).json({
      message: "Label status updated successfully",
    });
  } catch (error) {
    console.error("Toggle label status error:", error);

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
