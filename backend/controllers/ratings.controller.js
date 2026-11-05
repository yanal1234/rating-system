const {
  createRating: createRatingService,
  getRatings: getRatingsService,
  invalidateRating: invalidateRatingService,
} = require("../services/rating.service");

// Create rating
const createRating = async (req, res) => {
  try {
    const { window_id, rated_user_id, stars, labels } = req.body;
    const voter_id = req.user.user_id;

    // Validate required fields
    if (
      !window_id ||
      !rated_user_id ||
      stars === undefined ||
      !Array.isArray(labels)
    ) {
      return res.status(400).json({
        message: "Window ID, rated user ID, stars and labels are required",
      });
    }

    if (
      !Number.isInteger(Number(window_id)) ||
      Number(window_id) <= 0 ||
      !Number.isInteger(Number(rated_user_id)) ||
      Number(rated_user_id) <= 0
    ) {
      return res.status(400).json({
        message: "Invalid window ID or rated user ID",
      });
    }

    const ratingStars = Number(stars);

    if (!Number.isInteger(ratingStars) || ratingStars < 1 || ratingStars > 3) {
      return res.status(400).json({
        message: "Stars must be between 1 and 3",
      });
    }

    if (Number(rated_user_id) === Number(voter_id)) {
      return res.status(400).json({
        message: "You cannot rate yourself",
      });
    }

    if (labels.length === 0) {
      return res.status(400).json({
        message: "At least one label is required",
      });
    }

    // Validate labels
    const labelIds = [];

    for (const label of labels) {
      if (!label || typeof label !== "object") {
        return res.status(400).json({
          message: "Invalid label format",
        });
      }

      const labelId = Number(label.label_id);
      const labelStars = Number(label.stars);

      if (
        !Number.isInteger(labelId) ||
        labelId <= 0 ||
        !Number.isInteger(labelStars) ||
        labelStars < 1 ||
        labelStars > 3
      ) {
        return res.status(400).json({
          message:
            "Each label must have a valid label ID and stars between 1 and 3",
        });
      }

      labelIds.push(labelId);
    }

    if (new Set(labelIds).size !== labelIds.length) {
      return res.status(400).json({
        message: "Duplicate labels are not allowed",
      });
    }

    const rating_id = await createRatingService({
      window_id: Number(window_id),
      voter_id,
      rated_user_id: Number(rated_user_id),
      stars: ratingStars,
      labels,
    });

    return res.status(201).json({
      message: "Rating submitted successfully",
      rating_id,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "You have already rated this user in this window",
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Create rating error:", error);

    return res.status(500).json({
      message: "Failed to submit rating",
    });
  }
};

// Get ratings (Staff only)
const getRatings = async (req, res) => {
  try {
    const { window_id } = req.params;

    if (!/^\d+$/.test(window_id) || Number(window_id) < 1) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    const ratings = await getRatingsService(Number(window_id));

    return res.status(200).json({
      message: "Ratings retrieved successfully",
      ratings,
    });
  } catch (error) {
    console.error("Get ratings error:", error);

    return res.status(500).json({
      message: "Failed to retrieve ratings",
    });
  }
};

// Invalidate rating (Staff only)
const invalidateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { invalidation_reason } = req.body;

    if (!/^\d+$/.test(id) || Number(id) < 1) {
      return res.status(400).json({
        message: "Invalid rating ID",
      });
    }

    if (
      typeof invalidation_reason !== "string" ||
      !invalidation_reason.trim()
    ) {
      return res.status(400).json({
        message: "Invalidation reason is required",
      });
    }

    if (invalidation_reason.trim().length > 500) {
      return res.status(400).json({
        message: "Invalidation reason cannot exceed 500 characters",
      });
    }

    await invalidateRatingService({
      rating_id: Number(id),
      performed_by: req.user.user_id,
      invalidation_reason: invalidation_reason.trim(),
    });

    return res.status(200).json({
      message: "Rating invalidated successfully",
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Invalidate rating error:", error);

    return res.status(500).json({
      message: "Failed to invalidate rating",
    });
  }
};

module.exports = {
  createRating,
  getRatings,
  invalidateRating,
};
