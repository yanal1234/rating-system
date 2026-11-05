const express = require("express");
const router = express.Router();

const {
  addRatingLabels,
  getRatingLabels,
} = require("../controllers/ratingLabels.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

router.post("/", verifyToken, addRatingLabels);
router.get("/:rating_id", verifyToken, verifyStaff, getRatingLabels);

module.exports = router;
