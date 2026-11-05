const express = require("express");
const router = express.Router();

const {
  createRating,
  getRatings,
  invalidateRating,
  updateRatingModeration,
} = require("../controllers/ratings.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

// Create rating
router.post("/", verifyToken, createRating);

// Get ratings (Staff only)
router.get("/window/:window_id", verifyToken, verifyStaff, getRatings);

// Invalidate rating (Staff only)
router.patch("/:id/invalidate", verifyToken, verifyStaff, invalidateRating);

// Update moderation status (Staff only)
router.patch(
  "/:id/moderation",
  verifyToken,
  verifyStaff,
  updateRatingModeration,
);

module.exports = router;
