const express = require("express");
const router = express.Router();

const {
  getAllLabels,
  createLabel,
  updateLabel,
  toggleLabelStatus,
} = require("../controllers/labels.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

router.use(verifyToken, verifyStaff);

router.get("/", getAllLabels);
router.post("/", createLabel);
router.put("/:id", updateLabel);
router.patch("/:id/status", toggleLabelStatus);

module.exports = router;
