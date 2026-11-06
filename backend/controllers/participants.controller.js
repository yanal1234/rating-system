const {
  addParticipant: addParticipantService,
  getParticipants: getParticipantsService,
  removeParticipant: removeParticipantService,
  getEligibleParticipants: getEligibleParticipantsService,
} = require("../services/participant.service");

const addParticipant = async (req, res) => {
  try {
    const { window_id, user_id } = req.body;

    if (!window_id || !user_id) {
      return res.status(400).json({
        message: "Window ID and user ID are required.",
      });
    }

    const participant = await addParticipantService(window_id, user_id);

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

const getParticipants = async (req, res) => {
  try {
    const { window_id } = req.params;

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

const removeParticipant = async (req, res) => {
  try {
    const { window_id, user_id } = req.params;

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

const getEligibleParticipants = async (req, res) => {
  try {
    const window_id = Number(req.params.window_id);
    const currentUserId = req.user.user_id;

    if (!Number.isInteger(window_id) || window_id <= 0) {
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

module.exports = {
  addParticipant,
  getParticipants,
  removeParticipant,
  getEligibleParticipants,
};
