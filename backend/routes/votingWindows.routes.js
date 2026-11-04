const express = require("express");
const router = express.Router();

const {
  createVotingWindow,
  getAllVotingWindows,
  getVotingWindowById,
  updateVotingWindow,
  deleteVotingWindow,
} = require("../controllers/votingWindows.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

router.use(verifyToken, verifyStaff);

router.post("/", createVotingWindow);
router.get("/", getAllVotingWindows);
router.get("/:id", getVotingWindowById);
router.put("/:id", updateVotingWindow);
router.delete("/:id", deleteVotingWindow);

module.exports = router;
