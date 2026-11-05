const {
  createRating: createRatingService,
  getRatings: getRatingsService,
  invalidateRating: invalidateRatingService,
} = require("../services/rating.service");

const {
  updateRatingModeration: updateRatingModerationService,
} = require("../services/moderation.service");

// Create rating
const createRating = async (req, res) => {
  try {
    const {
      window_id,
      rated_user_id,
      stars,
      labels = [],
      feedback,
      interaction_type,
      interaction_details,
    } = req.body;

    const voter_id = req.user.user_id;

    if (
      window_id === undefined ||
      rated_user_id === undefined ||
      stars === undefined
    ) {
      return res.status(400).json({
        message: "Window ID, rated user ID and stars are required",
      });
    }

    if (
      !/^\d+$/.test(String(window_id)) ||
      Number(window_id) < 1 ||
      !/^\d+$/.test(String(rated_user_id)) ||
      Number(rated_user_id) < 1
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

    if (!Array.isArray(labels)) {
      return res.status(400).json({
        message: "Labels must be an array",
      });
    }

    if (ratingStars === 1) {
      if (typeof feedback !== "string" || !feedback.trim()) {
        return res.status(400).json({
          message: "Written feedback is required for a one-star rating",
        });
      }

      if (labels.length === 0) {
        return res.status(400).json({
          message: "At least one label is required for a one-star rating",
        });
      }
    }

    if (
      feedback !== undefined &&
      feedback !== null &&
      typeof feedback !== "string"
    ) {
      return res.status(400).json({
        message: "Feedback must be a string",
      });
    }

    const allowedInteractionTypes = [
      "project",
      "cluster",
      "campus_event",
      "campus_activity",
      "other",
    ];

    if (!allowedInteractionTypes.includes(interaction_type)) {
      return res.status(400).json({
        message: "Invalid interaction type",
      });
    }

    if (
      interaction_details !== undefined &&
      interaction_details !== null &&
      typeof interaction_details !== "string"
    ) {
      return res.status(400).json({
        message: "Interaction details must be a string",
      });
    }

    const labelIds = [];

    for (const label of labels) {
      if (!label || typeof label !== "object" || Array.isArray(label)) {
        return res.status(400).json({
          message: "Invalid label format",
        });
      }

      const labelId = Number(label.label_id);
      const labelStars = Number(label.stars);

      if (
        !Number.isInteger(labelId) ||
        labelId < 1 ||
        !Number.isInteger(labelStars) ||
        labelStars < 1 ||
        labelStars > 3
      ) {
        return res.status(400).json({
          message: "Each label must have a valid ID and stars between 1 and 3",
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
      feedback: feedback?.trim() || null,
      interaction_type,
      interaction_details: interaction_details?.trim() || null,
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

    if (!/^\d+$/.test(String(window_id)) || Number(window_id) < 1) {
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

    if (!/^\d+$/.test(String(id)) || Number(id) < 1) {
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

// Update rating moderation status (Staff only)
const updateRatingModeration = async (req, res) => {
  try {
    const { id } = req.params;
    const { moderation_status, reason } = req.body;

    if (!/^\d+$/.test(String(id)) || Number(id) < 1) {
      return res.status(400).json({
        message: "Invalid rating ID",
      });
    }

    const allowedStatuses = [
      "normal",
      "suspicious",
      "under_review",
      "confirmed_abuse",
    ];

    if (!allowedStatuses.includes(moderation_status)) {
      return res.status(400).json({
        message: "Invalid moderation status",
      });
    }

    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        message: "Moderation reason is required",
      });
    }

    if (reason.trim().length > 500) {
      return res.status(400).json({
        message: "Reason cannot exceed 500 characters",
      });
    }

    const result = await updateRatingModerationService({
      rating_id: Number(id),
      performed_by: req.user.user_id,
      moderation_status,
      reason: reason.trim(),
    });

    return res.status(200).json({
      message: "Rating moderation status updated successfully",
      result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Update rating moderation error:", error);

    return res.status(500).json({
      message: "Failed to update rating moderation status",
    });
  }
};

module.exports = {
  createRating,
  getRatings,
  invalidateRating,
  updateRatingModeration,
};
