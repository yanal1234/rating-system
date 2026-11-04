const db = require("../config/db");

// Get all audit logs
const getAuditLogs = async (req, res) => {
  try {
    const [logs] = await db.query(
      `SELECT
         al.log_id,
         al.rating_id,
         al.performed_by,
         u.username AS performed_by_username,
         al.action_type,
         al.reason,
         al.details,
         al.created_at
       FROM rating_audit_logs al
       LEFT JOIN users u ON al.performed_by = u.user_id
       ORDER BY al.created_at DESC`,
    );

    return res.status(200).json({
      message: "Audit logs retrieved successfully",
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve audit logs",
    });
  }
};

// Get audit logs for a specific rating
const getRatingAuditLogs = async (req, res) => {
  try {
    const { rating_id } = req.params;

    const [logs] = await db.query(
      `SELECT
         al.log_id,
         al.rating_id,
         al.performed_by,
         u.username AS performed_by_username,
         al.action_type,
         al.reason,
         al.details,
         al.created_at
       FROM rating_audit_logs al
       LEFT JOIN users u ON al.performed_by = u.user_id
       WHERE al.rating_id = ?
       ORDER BY al.created_at DESC`,
      [rating_id],
    );

    return res.status(200).json({
      message: "Rating audit logs retrieved successfully",
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve rating audit logs",
    });
  }
};

module.exports = {
  getAuditLogs,
  getRatingAuditLogs,
};
