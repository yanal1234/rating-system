const {
  getSystemAnalytics,
  getWindowAnalytics,
} = require("../services/analytics.service");

// Get general system analytics (Staff only)
const getAnalytics = async (req, res) => {
  try {
    const analytics = await getSystemAnalytics();

    return res.status(200).json({
      message: "System analytics retrieved successfully",
      analytics,
    });
  } catch (error) {
    console.error("Get analytics error:", error);

    return res.status(500).json({
      message: "Failed to retrieve system analytics",
    });
  }
};

// Get analytics for a specific voting window (Staff only)
const getWindowAnalyticsById = async (req, res) => {
  try {
    const { window_id } = req.params;

    if (!/^\d+$/.test(window_id) || Number(window_id) < 1) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    const analytics = await getWindowAnalytics(Number(window_id));

    if (!analytics) {
      return res.status(404).json({
        message: "Voting window not found",
      });
    }

    return res.status(200).json({
      message: "Voting window analytics retrieved successfully",
      analytics,
    });
  } catch (error) {
    console.error("Get window analytics error:", error);

    return res.status(500).json({
      message: "Failed to retrieve voting window analytics",
    });
  }
};

module.exports = {
  getAnalytics,
  getWindowAnalyticsById,
};
