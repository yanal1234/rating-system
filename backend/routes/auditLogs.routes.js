const express = require("express");
const router = express.Router();

const {
  getAuditLogs,
  getRatingAuditLogs,
} = require("../controllers/auditLogs.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

router.use(verifyToken, verifyStaff);

router.get("/", getAuditLogs);
router.get("/rating/:rating_id", getRatingAuditLogs);

module.exports = router;
