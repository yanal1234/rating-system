const {
  addParticipant: addParticipantService,
  getParticipants: getParticipantsService,
  removeParticipant: removeParticipantService,
  getEligibleParticipants: getEligibleParticipantsService,
  getParticipationStats: getParticipationStatsService,
} = require("../services/participant.service");

const isValidId = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

// Add participant
const addParticipant = async (req, res) => {
  try {
    const { window_id, user_id } = req.body;

    if (!isValidId(window_id) || !isValidId(user_id)) {
      return res.status(400).json({
        message: "Valid window ID and user ID are required.",
      });
    }

    const participant = await addParticipantService(
      Number(window_id),
      Number(user_id),
    );

    return res.status(201).json({
      message: "Participant added successfully.",
      participant,
    });
  } catch (error) {
    console.error("Add participant error:", error);

    return res.status(500).json({
      message: error.message || "Failed to add participant.",
    });
  }
};

// Get all participants
const getParticipants = async (req, res) => {
  try {
    const window_id = Number(req.params.window_id);

    if (!isValidId(window_id)) {
      return res.status(400).json({
        message: "Invalid voting window ID.",
      });
    }

    const participants = await getParticipantsService(window_id);

    return res.status(200).json({
      message: "Participants fetched successfully.",
      participants,
    });
  } catch (error) {
    console.error("Get participants error:", error);

    return res.status(500).json({
      message: "Failed to fetch participants.",
    });
  }
};

// Remove participant
const removeParticipant = async (req, res) => {
  try {
    const window_id = Number(req.params.window_id);
    const user_id = Number(req.params.user_id);

    if (!isValidId(window_id) || !isValidId(user_id)) {
      return res.status(400).json({
        message: "Invalid window ID or user ID.",
      });
    }

    await removeParticipantService(window_id, user_id);

    return res.status(200).json({
      message: "Participant removed successfully.",
    });
  } catch (error) {
    console.error("Remove participant error:", error);

    return res.status(500).json({
      message: error.message || "Failed to remove participant.",
    });
  }
};

// Get eligible students for current student
const getEligibleParticipants = async (req, res) => {
  try {
    const window_id = Number(req.params.window_id);
    const currentUserId = req.user.user_id;

    if (!isValidId(window_id)) {
      return res.status(400).json({
        message: "Invalid voting window ID.",
      });
    }

    const participants = await getEligibleParticipantsService(
      window_id,
      currentUserId,
    );

    return res.status(200).json({
      message: "Eligible participants fetched successfully.",
      participants,
    });
  } catch (error) {
    console.error("Get eligible participants error:", error);

    return res.status(500).json({
      message: "Failed to fetch eligible participants.",
    });
  }
};

// Get participation statistics for staff
const getParticipationStats = async (req, res) => {
  try {
    const window_id = Number(req.params.window_id);

    if (!isValidId(window_id)) {
      return res.status(400).json({
        message: "Invalid voting window ID.",
      });
    }

    const result = await getParticipationStatsService(window_id);

    return res.status(200).json({
      message: "Participation statistics fetched successfully.",
      ...result,
    });
  } catch (error) {
    console.error("Get participation statistics error:", error);

    return res.status(500).json({
      message: "Failed to fetch participation statistics.",
    });
  }
};

module.exports = {
  addParticipant,
  getParticipants,
  removeParticipant,
  getEligibleParticipants,
  getParticipationStats,
};
