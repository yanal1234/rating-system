const {
  createRating: createRatingService,
  getRatings: getRatingsService,
  invalidateRating: invalidateRatingService,
  getMyVoteProgress: getMyVoteProgressService,
} = require("../services/rating.service");

const db = require("../config/db");

const {
  updateRatingModeration: updateRatingModerationService,
} = require("../services/moderation.service");

// =========================================
// Create rating
// =========================================
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

// =========================================
// Get ratings (Staff only)
// =========================================
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

// =========================================
// Invalidate rating
// =========================================
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

// =========================================
// Update moderation status
// =========================================
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

// =========================================
// Get private statistics
// =========================================
const getMyRatingStats = async (req, res) => {
  try {
    const windowId = Number(req.params.window_id);
    const userId = Number(req.user.user_id);

    if (!Number.isInteger(windowId) || windowId < 1) {
      return res.status(400).json({
        message: "Invalid voting window ID",
      });
    }

    const [rows] = await db.query(
      `
      SELECT
        vw.window_id,
        vw.max_votes,
        vw.ends_at,

        (
          SELECT COUNT(*)
          FROM ratings sent
          WHERE sent.window_id = vw.window_id
            AND sent.voter_id = ?
        ) AS submitted_count,

        COALESCE(received.total, 0) AS received_total,
        received.average_rating,
        COALESCE(received.one_star, 0) AS one_star,
        COALESCE(received.two_stars, 0) AS two_stars,
        COALESCE(received.three_stars, 0) AS three_stars

      FROM voting_windows vw

      LEFT JOIN (
        SELECT
          rated_user_id,
          window_id,
          COUNT(*) AS total,
          ROUND(
            SUM(stars * weight) / NULLIF(SUM(weight), 0),
            2
          ) AS average_rating,
          SUM(CASE WHEN stars = 1 THEN 1 ELSE 0 END) AS one_star,
          SUM(CASE WHEN stars = 2 THEN 1 ELSE 0 END) AS two_stars,
          SUM(CASE WHEN stars = 3 THEN 1 ELSE 0 END) AS three_stars
        FROM ratings
        WHERE status = 'valid'
          AND moderation_status NOT IN (
            'under_review',
            'confirmed_abuse'
          )
          AND weight > 0
        GROUP BY rated_user_id, window_id
      ) received
        ON received.rated_user_id = ?
        AND received.window_id = vw.window_id

      WHERE vw.window_id = ?
      LIMIT 1
      `,
      [userId, userId, windowId],
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Voting window not found",
      });
    }

    const stats = rows[0];

    const submitted = Number(stats.submitted_count);
    const maxVotes = Number(stats.max_votes);
    const receivedTotal = Number(stats.received_total);

    const oneStar = Number(stats.one_star);
    const twoStars = Number(stats.two_stars);
    const threeStars = Number(stats.three_stars);

    return res.status(200).json({
      message: "Student rating statistics retrieved successfully",
      stats: {
        window_id: Number(stats.window_id),
        ends_at: stats.ends_at,
        submitted_count: submitted,
        max_votes: maxVotes,
        remaining_votes: Math.max(0, maxVotes - submitted),
        progress_percentage:
          maxVotes > 0
            ? Math.min(100, Math.round((submitted / maxVotes) * 100))
            : 0,
        received_total: receivedTotal,
        average_rating:
          stats.average_rating == null ? null : Number(stats.average_rating),
        distribution: {
          one_star: {
            count: oneStar,
            percentage:
              receivedTotal > 0
                ? Math.round((oneStar / receivedTotal) * 100)
                : 0,
          },
          two_stars: {
            count: twoStars,
            percentage:
              receivedTotal > 0
                ? Math.round((twoStars / receivedTotal) * 100)
                : 0,
          },
          three_stars: {
            count: threeStars,
            percentage:
              receivedTotal > 0
                ? Math.round((threeStars / receivedTotal) * 100)
                : 0,
          },
        },
      },
    });
  } catch (error) {
    console.error("Get student rating stats error:", error);

    return res.status(500).json({
      message: "Failed to retrieve student rating statistics",
    });
  }
};

// =========================================
// Get my vote progress
// =========================================
const getMyVoteProgress = async (req, res) => {
  try {
    const windowId = Number(req.query.window_id);
    const userId = Number(req.user.user_id);

    if (!Number.isInteger(windowId) || windowId <= 0) {
      return res.status(400).json({
        message: "Valid window_id is required",
      });
    }

    const progress = await getMyVoteProgressService(windowId, userId);

    if (!progress) {
      return res.status(404).json({
        message: "Voting window not found",
      });
    }

    return res.status(200).json({
      message: "Voting progress retrieved successfully",
      progress,
    });
  } catch (error) {
    console.error("Get my vote progress error:", error);

    return res.status(500).json({
      message: "Failed to retrieve voting progress",
    });
  }
};

module.exports = {
  createRating,
  getRatings,
  invalidateRating,
  updateRatingModeration,
  getMyRatingStats,
  getMyVoteProgress,
};
