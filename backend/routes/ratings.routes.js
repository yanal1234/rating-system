const express = require("express");
const router = express.Router();

const {
  createRating,
  getRatings,
  invalidateRating,
} = require("../controllers/ratings.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

// Submit rating (Student)
router.post("/", verifyToken, createRating);

// Staff routes
router.get("/window/:window_id", verifyToken, verifyStaff, getRatings);
router.patch("/:id/invalidate", verifyToken, verifyStaff, invalidateRating);

module.exports = router;
