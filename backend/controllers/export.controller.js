const { exportWindowRatings } = require("../services/export.service");

// Export voting window ratings
const exportRatings = async (req, res) => {
  try {
    const { window_id } = req.params;

    // Validate window ID
    if (!/^\d+$/.test(window_id) || Number(window_id) < 1) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    // Generate CSV file
    const result = await exportWindowRatings(Number(window_id));

    if (!result) {
      return res.status(404).json({
        message: "Voting window not found",
      });
    }

    // Send CSV file for download
    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.fileName}"`,
    );

    return res.status(200).send(result.content);
  } catch (error) {
    console.error("Export ratings error:", error);

    return res.status(500).json({
      message: "Failed to export ratings",
    });
  }
};

module.exports = {
  exportRatings,
};
