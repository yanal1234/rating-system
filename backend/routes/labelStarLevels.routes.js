const express = require("express");
const router = express.Router();

const {
  getStarLevels,
  setStarLevels,
} = require("../controllers/labelStarLevels.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

router.use(verifyToken, verifyStaff);

router.get("/:label_id", getStarLevels);
router.put("/:label_id", setStarLevels);

module.exports = router;
