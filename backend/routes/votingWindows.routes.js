const express = require("express");
const router = express.Router();

const {
  createVotingWindow,
  getAllVotingWindows,
  getVotingWindowById,
  getActiveVotingWindow,
  updateVotingWindow,
  deleteVotingWindow,
} = require("../controllers/votingWindows.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

// Active window: Any authenticated user
router.get("/active", verifyToken, getActiveVotingWindow);

// Staff only routes
router.post("/", verifyToken, verifyStaff, createVotingWindow);
router.get("/", verifyToken, verifyStaff, getAllVotingWindows);
router.get("/:id", verifyToken, verifyStaff, getVotingWindowById);
router.put("/:id", verifyToken, verifyStaff, updateVotingWindow);
router.delete("/:id", verifyToken, verifyStaff, deleteVotingWindow);

module.exports = router;
