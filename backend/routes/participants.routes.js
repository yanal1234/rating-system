const express = require("express");
const router = express.Router();

const {
  addParticipant,
  getParticipants,
  removeParticipant,
} = require("../controllers/participants.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

router.use(verifyToken, verifyStaff);

router.post("/", addParticipant);
router.get("/:window_id", getParticipants);
router.delete("/:window_id/:user_id", removeParticipant);

module.exports = router;
