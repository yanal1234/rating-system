const {
  addParticipant: addParticipantService,
  getParticipants: getParticipantsService,
  removeParticipant: removeParticipantService,
} = require("../services/participant.service");

// Add participant
const addParticipant = async (req, res) => {
  try {
    const { window_id, user_id } = req.body;

    if (!window_id || !user_id) {
      return res.status(400).json({
        message: "Window ID and User ID are required",
      });
    }

    if (
      !Number.isInteger(Number(window_id)) ||
      Number(window_id) <= 0 ||
      !Number.isInteger(Number(user_id)) ||
      Number(user_id) <= 0
    ) {
      return res.status(400).json({
        message: "Invalid window ID or user ID",
      });
    }

    await addParticipantService(Number(window_id), Number(user_id));

    return res.status(201).json({
      message: "Participant added successfully",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "User is already a participant in this window",
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(404).json({
        message: "User or voting window not found",
      });
    }

    console.error("Add participant error:", error);

    return res.status(500).json({
      message: "Failed to add participant",
    });
  }
};

// Get participants
const getParticipants = async (req, res) => {
  try {
    const { window_id } = req.params;

    if (!/^\d+$/.test(window_id) || Number(window_id) <= 0) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    const participants = await getParticipantsService(Number(window_id));

    return res.status(200).json({
      message: "Participants retrieved successfully",
      participants,
    });
  } catch (error) {
    console.error("Get participants error:", error);

    return res.status(500).json({
      message: "Failed to retrieve participants",
    });
  }
};

// Remove participant
const removeParticipant = async (req, res) => {
  try {
    const { window_id, user_id } = req.params;

    if (
      !/^\d+$/.test(window_id) ||
      Number(window_id) <= 0 ||
      !/^\d+$/.test(user_id) ||
      Number(user_id) <= 0
    ) {
      return res.status(400).json({
        message: "Invalid window ID or user ID",
      });
    }

    const affectedRows = await removeParticipantService(
      Number(window_id),
      Number(user_id),
    );

    if (affectedRows === 0) {
      return res.status(404).json({
        message: "Participant not found",
      });
    }

    return res.status(200).json({
      message: "Participant removed successfully",
    });
  } catch (error) {
    console.error("Remove participant error:", error);

    return res.status(500).json({
      message: "Failed to remove participant",
    });
  }
};

module.exports = {
  addParticipant,
  getParticipants,
  removeParticipant,
};
