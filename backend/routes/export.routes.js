const express = require("express");
const router = express.Router();

const { exportRatings } = require("../controllers/export.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

router.get("/ratings/:window_id", verifyToken, verifyStaff, exportRatings);

module.exports = router;
