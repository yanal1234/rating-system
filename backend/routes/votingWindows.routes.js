const express = require("express");
const router = express.Router();

const {
  createVotingWindow,
  getAllVotingWindows,
  getVotingWindowById,
  getActiveVotingWindow,
  getStudentVotingWindows,
  updateVotingWindow,
  deleteVotingWindow,
} = require("../controllers/votingWindows.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

router.get("/active", verifyToken, getActiveVotingWindow);

// Student: get all active windows assigned to the logged-in student
router.get(
  "/student",
  verifyToken,
  (req, res, next) => {
    if (req.user.role !== "student") {
      return res.status(403).json({
        message: "Access denied. Students only.",
      });
    }

    next();
  },
  getStudentVotingWindows,
);

// Staff routes
router.post("/", verifyToken, verifyStaff, createVotingWindow);
router.get("/", verifyToken, verifyStaff, getAllVotingWindows);
router.get("/:id", verifyToken, verifyStaff, getVotingWindowById);
router.put("/:id", verifyToken, verifyStaff, updateVotingWindow);
router.delete("/:id", verifyToken, verifyStaff, deleteVotingWindow);

module.exports = router;
