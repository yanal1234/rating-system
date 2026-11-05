const { exportWindowRatings } = require("../services/export.service");

// Export voting window ratings
const exportRatings = async (req, res) => {
  try {
    const { window_id } = req.params;

    if (!/^[1-9]\d*$/.test(String(window_id))) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    const result = await exportWindowRatings(window_id);

    if (!result) {
      return res.status(404).json({
        message: "Voting window not found",
      });
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.fileName}"`,
    );

    return res.status(200).send(result.content);
  } catch (error) {
    console.error("Export ratings error:", error);

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode === 400 ? error.message : "Failed to export ratings",
    });
  }
};

module.exports = {
  exportRatings,
};
