const express = require("express");
const router = express.Router();

const {
  addParticipant,
  getParticipants,
  getEligibleParticipants,
  removeParticipant,
} = require("../controllers/participants.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

// Student: get eligible learners
router.get(
  "/eligible/:window_id",
  verifyToken,
  (req, res, next) => {
    if (req.user.role !== "student") {
      return res.status(403).json({
        message: "Access denied. Students only.",
      });
    }

    next();
  },
  getEligibleParticipants,
);

router.get("/eligible/:window_id", verifyToken, getEligibleParticipants);

// Staff: manage participants
router.post("/", verifyToken, verifyStaff, addParticipant);
router.get("/:window_id", verifyToken, verifyStaff, getParticipants);
router.delete(
  "/:window_id/:user_id",
  verifyToken,
  verifyStaff,
  removeParticipant,
);

module.exports = router;
