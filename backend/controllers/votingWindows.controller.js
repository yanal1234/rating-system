const {
  createVotingWindow: createVotingWindowService,
  getAllVotingWindows: getAllVotingWindowsService,
  getVotingWindowById: getVotingWindowByIdService,
  getActiveVotingWindow: getActiveVotingWindowService,
  updateVotingWindow: updateVotingWindowService,
  deleteVotingWindow: deleteVotingWindowService,
} = require("../services/votingWindow.service");

const isValidId = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

const isValidDate = (value) => value && !Number.isNaN(Date.parse(value));

// Create voting window (Staff only)
const createVotingWindow = async (req, res) => {
  try {
    const {
      window_name,
      starts_at,
      ends_at,
      min_votes = 1,
      max_votes = 5,
    } = req.body;

    if (
      typeof window_name !== "string" ||
      !window_name.trim() ||
      !starts_at ||
      !ends_at
    ) {
      return res.status(400).json({
        message: "Window name, start date and end date are required",
      });
    }

    if (
      !isValidDate(starts_at) ||
      !isValidDate(ends_at) ||
      new Date(ends_at) <= new Date(starts_at)
    ) {
      return res.status(400).json({
        message: "Invalid voting window dates",
      });
    }

    if (
      !Number.isInteger(Number(min_votes)) ||
      !Number.isInteger(Number(max_votes)) ||
      Number(min_votes) < 1 ||
      Number(max_votes) < Number(min_votes)
    ) {
      return res.status(400).json({
        message: "Invalid minimum or maximum votes",
      });
    }

    const window_id = await createVotingWindowService({
      window_name: window_name.trim(),
      starts_at,
      ends_at,
      min_votes: Number(min_votes),
      max_votes: Number(max_votes),
      created_by: req.user.user_id,
    });

    return res.status(201).json({
      message: "Voting window created successfully",
      window_id,
    });
  } catch (error) {
    console.error("Create voting window error:", error);

    return res.status(500).json({
      message: "Failed to create voting window",
    });
  }
};

// Get all voting windows (Staff only)
const getAllVotingWindows = async (req, res) => {
  try {
    const windows = await getAllVotingWindowsService();

    return res.status(200).json({
      message: "Voting windows retrieved successfully",
      windows,
    });
  } catch (error) {
    console.error("Get all voting windows error:", error);

    return res.status(500).json({
      message: "Failed to retrieve voting windows",
    });
  }
};

// Get voting window by ID (Staff only)
const getVotingWindowById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    const window = await getVotingWindowByIdService(Number(id));

    if (!window) {
      return res.status(404).json({
        message: "Voting window not found",
      });
    }

    return res.status(200).json({
      message: "Voting window retrieved successfully",
      window,
    });
  } catch (error) {
    console.error("Get voting window error:", error);

    return res.status(500).json({
      message: "Failed to retrieve voting window",
    });
  }
};

// Get active voting window (Authenticated users)
const getActiveVotingWindow = async (req, res) => {
  try {
    const window = await getActiveVotingWindowService();

    return res.status(200).json({
      message: window
        ? "Active voting window retrieved successfully"
        : "There is no active voting window",
      window,
      is_active: Boolean(window),
    });
  } catch (error) {
    console.error("Get active voting window error:", error);

    return res.status(500).json({
      message: "Failed to retrieve active voting window",
    });
  }
};

// Update voting window (Staff only)
const updateVotingWindow = async (req, res) => {
  try {
    const { id } = req.params;
    const { window_name, starts_at, ends_at, min_votes, max_votes, status } =
      req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    const current = await getVotingWindowByIdService(Number(id));

    if (!current) {
      return res.status(404).json({
        message: "Voting window not found",
      });
    }

    const updated = {
      window_name: window_name ?? current.window_name,
      starts_at: starts_at ?? current.starts_at,
      ends_at: ends_at ?? current.ends_at,
      min_votes: min_votes ?? current.min_votes,
      max_votes: max_votes ?? current.max_votes,
      status: status ?? current.status,
    };

    if (
      typeof updated.window_name !== "string" ||
      !updated.window_name.trim() ||
      !isValidDate(updated.starts_at) ||
      !isValidDate(updated.ends_at) ||
      new Date(updated.ends_at) <= new Date(updated.starts_at)
    ) {
      return res.status(400).json({
        message: "Invalid voting window information or dates",
      });
    }

    if (
      !Number.isInteger(Number(updated.min_votes)) ||
      !Number.isInteger(Number(updated.max_votes)) ||
      Number(updated.min_votes) < 1 ||
      Number(updated.max_votes) < Number(updated.min_votes)
    ) {
      return res.status(400).json({
        message: "Invalid minimum or maximum votes",
      });
    }

    if (!["draft", "published", "cancelled"].includes(updated.status)) {
      return res.status(400).json({
        message: "Invalid voting window status",
      });
    }

    await updateVotingWindowService(Number(id), {
      ...updated,
      window_name: updated.window_name.trim(),
      min_votes: Number(updated.min_votes),
      max_votes: Number(updated.max_votes),
    });

    return res.status(200).json({
      message: "Voting window updated successfully",
    });
  } catch (error) {
    console.error("Update voting window error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to update voting window",
    });
  }
};

// Delete voting window (Staff only)
const deleteVotingWindow = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    const affectedRows = await deleteVotingWindowService(Number(id));

    if (affectedRows === 0) {
      return res.status(404).json({
        message: "Voting window not found",
      });
    }

    return res.status(200).json({
      message: "Voting window deleted successfully",
    });
  } catch (error) {
    console.error("Delete voting window error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message:
          "Cannot delete this voting window because it is linked to other records",
      });
    }

    return res.status(500).json({
      message: "Failed to delete voting window",
    });
  }
};

module.exports = {
  createVotingWindow,
  getAllVotingWindows,
  getVotingWindowById,
  getActiveVotingWindow,
  updateVotingWindow,
  deleteVotingWindow,
};
