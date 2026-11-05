const db = require("../config/db");

/*
  Suspicious activity detection
  --------------------------------
  This service detects patterns and stores evidence for staff review.

  IMPORTANT:
  - It does NOT change rating weights.
  - It does NOT change moderation_status.
  - It does NOT invalidate ratings.
  - Thresholds are initial and should be tuned using real system data.
*/

const CONFIG = {
  historyDays: 180,
  recentDays: 30,

  groupVoting: {
    minRaters: 3,
    minSharedTargets: 2,
    maxTimeDifferenceHours: 48,
  },

  extremeVoting: {
    minRatings: 8,
    extremeRatio: 0.8,
  },

  repeatedTargeting: {
    minNegativeRatings: 4,
    minDistinctRaters: 3,
  },

  groupRetaliation: {
    minRetaliators: 3,
    maxDaysAfterReceivedRating: 7,
  },

  ratingCoordination: {
    minRaters: 3,
    maxTimeDifferenceMinutes: 60,
  },

  historicalBehavior: {
    minCurrentRatings: 5,
    minHistoricalRatings: 10,
    minRatioDifference: 0.5,
  },

  ratingAnomaly: {
    minNegativeRatings: 5,
    minimumAverageMultiplier: 3,
  },

  flagAbuse: {
    minFlaggedRatings: 5,
    minDistinctTargets: 3,
    shortFeedbackLength: 20,
    minShortFeedbackRatio: 0.7,
  },

  closedClique: {
    minMembers: 3,
    minExternalNegativeRatings: 3,
  },
};

const VALID_ACTIVITY_TYPES = [
  "group_voting",
  "extreme_voting",
  "repeated_targeting",
  "group_retaliation",
  "rating_coordination",
  "historical_behavior",
  "rating_anomaly",
  "flag_abuse",
  "closed_clique",
];

const getHoursDifference = (firstDate, secondDate) =>
  Math.abs(new Date(firstDate).getTime() - new Date(secondDate).getTime()) /
  (1000 * 60 * 60);

const getDaysDifference = (firstDate, secondDate) =>
  Math.abs(new Date(firstDate).getTime() - new Date(secondDate).getTime()) /
  (1000 * 60 * 60 * 24);

const getNegativeRatio = (ratings) => {
  if (!ratings.length) return 0;

  const negativeRatings = ratings.filter((rating) => rating.stars === 1);

  return negativeRatings.length / ratings.length;
};

const isNegativeRating = (rating) => rating.stars === 1;

const createActivity = ({
  window_id,
  user_id,
  related_user_id = null,
  rating_id = null,
  activity_type,
  severity = "medium",
  description,
  details = {},
}) => ({
  window_id,
  user_id,
  related_user_id,
  rating_id,
  activity_type,
  severity,
  description,
  details,
});

/*
  Avoid creating the same pending activity repeatedly.
  If a matching pending activity exists, refresh its evidence instead.
*/
const saveActivity = async (activity) => {
  if (!VALID_ACTIVITY_TYPES.includes(activity.activity_type)) {
    throw new Error("Invalid suspicious activity type");
  }

  const {
    window_id,
    user_id,
    related_user_id,
    rating_id,
    activity_type,
    severity,
    description,
    details,
  } = activity;

  const [existingRows] = await db.query(
    `SELECT activity_id
     FROM suspicious_activities
     WHERE window_id = ?
       AND user_id = ?
       AND activity_type = ?
       AND status = 'pending'
       AND (
         related_user_id = ?
         OR (related_user_id IS NULL AND ? IS NULL)
       )
     ORDER BY created_at DESC
     LIMIT 1`,
    [window_id, user_id, activity_type, related_user_id, related_user_id],
  );

  const serializedDetails = JSON.stringify(details);

  if (existingRows.length) {
    await db.query(
      `UPDATE suspicious_activities
       SET rating_id = ?,
           severity = ?,
           description = ?,
           details = ?
       WHERE activity_id = ?`,
      [
        rating_id,
        severity,
        description,
        serializedDetails,
        existingRows[0].activity_id,
      ],
    );

    return {
      activity_id: existingRows[0].activity_id,
      updated: true,
    };
  }

  const [result] = await db.query(
    `INSERT INTO suspicious_activities (
       window_id,
       user_id,
       related_user_id,
       rating_id,
       activity_type,
       severity,
       description,
       details
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      window_id,
      user_id,
      related_user_id,
      rating_id,
      activity_type,
      severity,
      description,
      serializedDetails,
    ],
  );

  return {
    activity_id: result.insertId,
    created: true,
  };
};

/*
  Load ratings from the current window and recent history.

  We exclude invalidated ratings and ratings confirmed as abuse.
  Suspicious and under-review ratings are still available as evidence,
  but this service never changes their status or influence.
*/
const getDetectionData = async (window_id) => {
  const [windows] = await db.query(
    `SELECT window_id, starts_at, ends_at
     FROM voting_windows
     WHERE window_id = ?
     LIMIT 1`,
    [window_id],
  );

  if (!windows.length) {
    throw new Error("Voting window not found");
  }

  const [ratings] = await db.query(
    `SELECT
       r.rating_id,
       r.window_id,
       r.voter_id,
       r.rated_user_id,
       r.stars,
       r.feedback,
       r.interaction_type,
       r.interaction_details,
       r.created_at
     FROM ratings r
     WHERE r.status = 'valid'
       AND r.moderation_status <> 'confirmed_abuse'
       AND r.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY r.created_at ASC`,
    [CONFIG.historyDays],
  );

  const currentRatings = ratings.filter(
    (rating) => Number(rating.window_id) === Number(window_id),
  );

  return {
    window: windows[0],
    ratings,
    currentRatings,
  };
};

/*
  1. Group Voting

  Looks for multiple raters who repeatedly rate the same targets
  within a short period.

  A single shared target is not enough.
*/
const detectGroupVoting = async (window_id, ratings) => {
  const activities = [];
  const lowRatings = ratings.filter((rating) => Number(rating.stars) <= 2);
  const ratingsByVoter = new Map();

  for (const rating of lowRatings) {
    const voterId = Number(rating.voter_id);
    const targetId = Number(rating.rated_user_id);

    if (!ratingsByVoter.has(voterId)) {
      ratingsByVoter.set(voterId, new Map());
    }

    // A voter can rate a target only once per window. Keep the rating as evidence.
    ratingsByVoter.get(voterId).set(targetId, rating);
  }

  const voters = [...ratingsByVoter.keys()].sort((a, b) => a - b);
  const pairEvidence = new Map();
  const adjacency = new Map(voters.map((voterId) => [voterId, new Set()]));

  // Build an edge only when BOTH users gave low ratings to at least
  // minSharedTargets of the same people within the configured time window.
  for (let i = 0; i < voters.length; i += 1) {
    for (let j = i + 1; j < voters.length; j += 1) {
      const firstVoter = voters[i];
      const secondVoter = voters[j];
      const firstTargets = ratingsByVoter.get(firstVoter);
      const secondTargets = ratingsByVoter.get(secondVoter);
      const sharedTargets = [];

      for (const [targetId, secondRating] of secondTargets) {
        const firstRating = firstTargets.get(targetId);
        if (!firstRating) continue;

        if (
          getHoursDifference(firstRating.created_at, secondRating.created_at) <=
          CONFIG.groupVoting.maxTimeDifferenceHours
        ) {
          sharedTargets.push({
            target_id: targetId,
            first_rating_id: firstRating.rating_id,
            second_rating_id: secondRating.rating_id,
            first_stars: Number(firstRating.stars),
            second_stars: Number(secondRating.stars),
          });
        }
      }

      if (sharedTargets.length < CONFIG.groupVoting.minSharedTargets) continue;

      const key = `${firstVoter}:${secondVoter}`;
      pairEvidence.set(key, sharedTargets);
      adjacency.get(firstVoter).add(secondVoter);
      adjacency.get(secondVoter).add(firstVoter);
    }
  }

  // Find cohesive groups: every pair in a group must have a qualifying edge.
  // This deliberately rejects simple chains such as A-B-C where A and C
  // do not show the same repeated-targeting pattern.
  const groups = new Map();

  for (const seed of voters) {
    const group = [seed];
    const candidates = [...(adjacency.get(seed) || [])].sort((a, b) => a - b);

    for (const candidate of candidates) {
      if (group.every((memberId) => adjacency.get(memberId)?.has(candidate))) {
        group.push(candidate);
      }
    }

    if (group.length < CONFIG.groupVoting.minRaters) continue;

    const normalizedGroup = [...group].sort((a, b) => a - b);
    const groupKey = normalizedGroup.join(":");
    groups.set(groupKey, normalizedGroup);
  }

  for (const group of groups.values()) {
    const pairDetails = [];
    const evidenceRatingIds = [];

    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const sharedTargets = pairEvidence.get(`${group[i]}:${group[j]}`) || [];
        pairDetails.push({
          first_voter_id: group[i],
          second_voter_id: group[j],
          shared_targets: sharedTargets,
          shared_target_count: sharedTargets.length,
        });

        for (const item of sharedTargets) {
          evidenceRatingIds.push(item.first_rating_id, item.second_rating_id);
        }
      }
    }

    const latestEvidenceId =
      [...lowRatings]
        .filter((rating) => group.includes(Number(rating.voter_id)))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        ?.rating_id || null;

    activities.push(
      createActivity({
        window_id,
        user_id: group[0],
        related_user_id: group[1],
        rating_id: latestEvidenceId,
        activity_type: "group_voting",
        severity: "high",
        description:
          "A cohesive group of users repeatedly gave low ratings to the same targets within a short period.",
        details: {
          group_members: group,
          group_size: group.length,
          minimum_required_raters: CONFIG.groupVoting.minRaters,
          pair_evidence: pairDetails,
          evidence_rating_ids: [...new Set(evidenceRatingIds)],
        },
      }),
    );
  }

  return activities;
};

/*
  2. Extreme Voting

  Detects a repeated pattern of giving almost exclusively
  one-star or three-star ratings.

  This is only an indicator. Extreme ratings alone do not prove abuse.
*/

const detectExtremeVoting = async (window_id, ratings) => {
  const activities = [];
  const ratingsByVoter = new Map();

  for (const rating of ratings) {
    if (!ratingsByVoter.has(rating.voter_id)) {
      ratingsByVoter.set(rating.voter_id, []);
    }

    ratingsByVoter.get(rating.voter_id).push(rating);
  }

  for (const [voterId, voterRatings] of ratingsByVoter) {
    if (voterRatings.length < CONFIG.extremeVoting.minRatings) {
      continue;
    }

    const oneStarRatings = voterRatings.filter((rating) => rating.stars === 1);

    const threeStarRatings = voterRatings.filter(
      (rating) => rating.stars === 3,
    );

    const oneStarRatio = oneStarRatings.length / voterRatings.length;
    const threeStarRatio = threeStarRatings.length / voterRatings.length;

    let selectedRatings = null;
    let selectedRatio = 0;
    let pattern = null;

    if (oneStarRatio >= CONFIG.extremeVoting.extremeRatio) {
      selectedRatings = oneStarRatings;
      selectedRatio = oneStarRatio;
      pattern = "mostly_one_star";
    } else if (threeStarRatio >= CONFIG.extremeVoting.extremeRatio) {
      selectedRatings = threeStarRatings;
      selectedRatio = threeStarRatio;
      pattern = "mostly_three_stars";
    }

    if (!selectedRatings) continue;

    activities.push(
      createActivity({
        window_id,
        user_id: voterId,
        rating_id: selectedRatings[selectedRatings.length - 1].rating_id,
        activity_type: "extreme_voting",
        severity: "low",
        description:
          "A user's ratings are heavily concentrated on one extreme of the rating scale.",
        details: {
          pattern,
          total_ratings: voterRatings.length,
          matching_ratings: selectedRatings.length,
          ratio: Number(selectedRatio.toFixed(2)),
        },
      }),
    );
  }

  return activities;
};

/*
  3. Repeated Targeting

  Detects a user receiving repeated one-star ratings
  from several different users within the recent period.
*/
const detectRepeatedTargeting = async (window_id, ratings) => {
  const activities = [];
  const recentRatings = ratings.filter(
    (rating) =>
      isNegativeRating(rating) &&
      getDaysDifference(new Date(), rating.created_at) <= CONFIG.recentDays,
  );

  const ratingsByTarget = new Map();

  for (const rating of recentRatings) {
    if (!ratingsByTarget.has(rating.rated_user_id)) {
      ratingsByTarget.set(rating.rated_user_id, []);
    }

    ratingsByTarget.get(rating.rated_user_id).push(rating);
  }

  for (const [targetId, targetRatings] of ratingsByTarget) {
    const distinctRaters = [
      ...new Set(targetRatings.map((rating) => rating.voter_id)),
    ];

    if (
      targetRatings.length < CONFIG.repeatedTargeting.minNegativeRatings ||
      distinctRaters.length < CONFIG.repeatedTargeting.minDistinctRaters
    ) {
      continue;
    }

    activities.push(
      createActivity({
        window_id,
        user_id: targetId,
        rating_id: targetRatings[targetRatings.length - 1].rating_id,
        activity_type: "repeated_targeting",
        severity: "high",
        description:
          "A user received repeated one-star ratings from several different users in a short period.",
        details: {
          target_user_id: targetId,
          negative_rating_count: targetRatings.length,
          distinct_raters: distinctRaters,
          rating_ids: targetRatings.map((rating) => rating.rating_id),
          period_days: CONFIG.recentDays,
        },
      }),
    );
  }

  return activities;
};

/*
  4. Group Retaliation

  Looks for a user who gives one-star ratings to several users
  shortly after those users gave that user a low rating.
*/
const detectGroupRetaliation = async (window_id, ratings) => {
  const activities = [];
  const recentRatings = ratings.filter(
    (rating) =>
      getDaysDifference(new Date(), rating.created_at) <= CONFIG.recentDays,
  );

  const ratingsByTarget = new Map();

  for (const rating of recentRatings) {
    if (!ratingsByTarget.has(rating.rated_user_id)) {
      ratingsByTarget.set(rating.rated_user_id, []);
    }

    ratingsByTarget.get(rating.rated_user_id).push(rating);
  }

  for (const [centralUserId, receivedRatings] of ratingsByTarget) {
    const previousNegativeRaters = receivedRatings.filter(
      (rating) => rating.stars === 1,
    );

    const retaliatoryRatings = [];

    for (const previousRating of previousNegativeRaters) {
      const possibleRetaliation = recentRatings.find(
        (rating) =>
          Number(rating.voter_id) === Number(centralUserId) &&
          Number(rating.rated_user_id) === Number(previousRating.voter_id) &&
          rating.stars === 1 &&
          new Date(rating.created_at) > new Date(previousRating.created_at) &&
          getDaysDifference(rating.created_at, previousRating.created_at) <=
            CONFIG.groupRetaliation.maxDaysAfterReceivedRating,
      );

      if (possibleRetaliation) {
        retaliatoryRatings.push({
          previous_rating_id: previousRating.rating_id,
          retaliatory_rating_id: possibleRetaliation.rating_id,
          affected_user_id: previousRating.voter_id,
        });
      }
    }

    const affectedUsers = [
      ...new Set(retaliatoryRatings.map((item) => item.affected_user_id)),
    ];

    if (affectedUsers.length < CONFIG.groupRetaliation.minRetaliators) {
      continue;
    }

    activities.push(
      createActivity({
        window_id,
        user_id: centralUserId,
        related_user_id: affectedUsers[0],
        rating_id:
          retaliatoryRatings[retaliatoryRatings.length - 1]
            .retaliatory_rating_id,
        activity_type: "group_retaliation",
        severity: "high",
        description:
          "A user gave one-star ratings to several people after receiving one-star ratings from them.",
        details: {
          central_user_id: centralUserId,
          affected_users: affectedUsers,
          related_rating_pairs: retaliatoryRatings,
          affected_user_count: affectedUsers.length,
        },
      }),
    );
  }

  return activities;
};

/*
  5. Rating Coordination

  Detects three or more users who give low ratings to the same target
  within a short time and share the same interaction context.
*/
const detectRatingCoordination = async (window_id, ratings) => {
  const activities = [];
  const ratingsByTarget = new Map();

  for (const rating of ratings) {
    if (rating.stars > 2) continue;

    if (!ratingsByTarget.has(rating.rated_user_id)) {
      ratingsByTarget.set(rating.rated_user_id, []);
    }

    ratingsByTarget.get(rating.rated_user_id).push(rating);
  }

  for (const [targetId, targetRatings] of ratingsByTarget) {
    const sortedRatings = [...targetRatings].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );

    for (let start = 0; start < sortedRatings.length; start += 1) {
      const firstRating = sortedRatings[start];

      const coordinatedRatings = sortedRatings.filter(
        (rating) =>
          getHoursDifference(firstRating.created_at, rating.created_at) <=
            CONFIG.ratingCoordination.maxTimeDifferenceMinutes / 60 &&
          rating.interaction_type === firstRating.interaction_type,
      );

      const distinctRaters = [
        ...new Set(coordinatedRatings.map((rating) => rating.voter_id)),
      ];

      if (distinctRaters.length < CONFIG.ratingCoordination.minRaters) {
        continue;
      }

      activities.push(
        createActivity({
          window_id,
          user_id: distinctRaters[0],
          related_user_id: targetId,
          rating_id:
            coordinatedRatings[coordinatedRatings.length - 1].rating_id,
          activity_type: "rating_coordination",
          severity: "medium",
          description:
            "Several users gave low ratings to the same person within a short period and shared the same interaction type.",
          details: {
            target_user_id: targetId,
            distinct_raters: distinctRaters,
            rating_ids: coordinatedRatings.map((rating) => rating.rating_id),
            interaction_type: firstRating.interaction_type,
            time_window_minutes:
              CONFIG.ratingCoordination.maxTimeDifferenceMinutes,
          },
        }),
      );

      break;
    }
  }

  return activities;
};

/*
  6. Historical Behavior

  Compares a user's one-star rating ratio in the current window
  with their previous rating history.
*/
const detectHistoricalBehavior = async (
  window_id,
  currentRatings,
  allRatings,
) => {
  const activities = [];
  const currentByVoter = new Map();
  const historicalByVoter = new Map();

  for (const rating of currentRatings) {
    if (!currentByVoter.has(rating.voter_id)) {
      currentByVoter.set(rating.voter_id, []);
    }

    currentByVoter.get(rating.voter_id).push(rating);
  }

  for (const rating of allRatings) {
    if (Number(rating.window_id) === Number(window_id)) continue;

    if (!historicalByVoter.has(rating.voter_id)) {
      historicalByVoter.set(rating.voter_id, []);
    }

    historicalByVoter.get(rating.voter_id).push(rating);
  }

  for (const [voterId, currentUserRatings] of currentByVoter) {
    const historicalRatings = historicalByVoter.get(voterId) || [];

    if (
      currentUserRatings.length < CONFIG.historicalBehavior.minCurrentRatings ||
      historicalRatings.length < CONFIG.historicalBehavior.minHistoricalRatings
    ) {
      continue;
    }

    const currentNegativeRatio = getNegativeRatio(currentUserRatings);
    const historicalNegativeRatio = getNegativeRatio(historicalRatings);
    const ratioDifference = currentNegativeRatio - historicalNegativeRatio;

    if (ratioDifference < CONFIG.historicalBehavior.minRatioDifference) {
      continue;
    }

    activities.push(
      createActivity({
        window_id,
        user_id: voterId,
        rating_id: currentUserRatings[currentUserRatings.length - 1].rating_id,
        activity_type: "historical_behavior",
        severity: "medium",
        description:
          "A user's one-star rating pattern differs significantly from their previous history.",
        details: {
          current_rating_count: currentUserRatings.length,
          historical_rating_count: historicalRatings.length,
          current_negative_ratio: Number(currentNegativeRatio.toFixed(2)),
          historical_negative_ratio: Number(historicalNegativeRatio.toFixed(2)),
          ratio_difference: Number(ratioDifference.toFixed(2)),
        },
      }),
    );
  }

  return activities;
};

/*
  7. Rating Anomaly
  Compares the current number of negative ratings received
  with the average number received in previous voting windows.
*/
const detectRatingAnomaly = async (window_id, currentRatings) => {
  const activities = [];
  const currentNegativeByTarget = new Map();

  for (const rating of currentRatings) {
    if (!isNegativeRating(rating)) continue;

    const targetId = Number(rating.rated_user_id);
    currentNegativeByTarget.set(
      targetId,
      (currentNegativeByTarget.get(targetId) || 0) + 1,
    );
  }

  const targetsToCheck = [...currentNegativeByTarget.entries()]
    .filter(([, count]) => count >= CONFIG.ratingAnomaly.minNegativeRatings)
    .map(([targetId]) => targetId);

  if (!targetsToCheck.length) return activities;

  const placeholders = targetsToCheck.map(() => "?").join(", ");

  // Include every earlier voting window in which the target participated.
  // LEFT JOIN preserves windows with zero one-star ratings.
  const [historicalRows] = await db.query(
    `SELECT
       rp.user_id AS target_id,
       vw.window_id,
       COUNT(r.rating_id) AS negative_count
     FROM rating_participants rp
     INNER JOIN voting_windows vw
       ON vw.window_id = rp.window_id
     LEFT JOIN ratings r
       ON r.window_id = vw.window_id
      AND r.rated_user_id = rp.user_id
      AND r.stars = 1
      AND r.status = 'valid'
      AND r.moderation_status <> 'confirmed_abuse'
     WHERE rp.user_id IN (${placeholders})
       AND vw.status = 'published'
       AND vw.window_id <> ?
       AND vw.ends_at < (
         SELECT starts_at
         FROM voting_windows
         WHERE window_id = ?
       )
       AND vw.ends_at >= DATE_SUB(
         (SELECT starts_at FROM voting_windows WHERE window_id = ?),
         INTERVAL ? DAY
       )
     GROUP BY rp.user_id, vw.window_id`,
    [...targetsToCheck, window_id, window_id, window_id, CONFIG.historyDays],
  );

  const historicalByTarget = new Map();

  for (const row of historicalRows) {
    const targetId = Number(row.target_id);

    if (!historicalByTarget.has(targetId)) {
      historicalByTarget.set(targetId, []);
    }

    historicalByTarget.get(targetId).push(Number(row.negative_count));
  }

  for (const targetId of targetsToCheck) {
    const historicalCounts = historicalByTarget.get(targetId) || [];

    // Do not infer an anomaly without historical participation data.
    if (!historicalCounts.length) continue;

    const currentNegativeCount = currentNegativeByTarget.get(targetId);
    const historicalAverage =
      historicalCounts.reduce((sum, count) => sum + count, 0) /
      historicalCounts.length;

    if (
      currentNegativeCount <
      historicalAverage * CONFIG.ratingAnomaly.minimumAverageMultiplier
    ) {
      continue;
    }

    const evidenceRating = currentRatings.find(
      (rating) =>
        Number(rating.rated_user_id) === targetId && isNegativeRating(rating),
    );

    activities.push(
      createActivity({
        window_id,
        user_id: targetId,
        rating_id: evidenceRating?.rating_id || null,
        activity_type: "rating_anomaly",
        severity: "high",
        description:
          "A user received an unusually high number of one-star ratings compared with earlier windows in which they participated.",
        details: {
          target_user_id: targetId,
          current_negative_count: currentNegativeCount,
          historical_average: Number(historicalAverage.toFixed(2)),
          historical_window_count: historicalCounts.length,
          historical_window_counts: historicalCounts,
          comparison_multiplier: CONFIG.ratingAnomaly.minimumAverageMultiplier,
        },
      }),
    );
  }

  return activities;
};

/*
  8. Flag Abuse

  Detects repeated flag usage with very short feedback.
  This is a review signal, not proof that the flags are false.
*/
const detectFlagAbuse = async (window_id) => {
  // EXISTS ensures each rating is counted once, even when it has several labels.
  const [rows] = await db.query(
    `SELECT
       r.voter_id,
       COUNT(*) AS flagged_ratings,
       COUNT(DISTINCT r.rated_user_id) AS distinct_targets,
       SUM(
         CASE
           WHEN CHAR_LENGTH(TRIM(COALESCE(r.feedback, ''))) < ?
           THEN 1
           ELSE 0
         END
       ) AS short_feedback_count,
       GROUP_CONCAT(r.rating_id) AS rating_ids
     FROM ratings r
     WHERE r.status = 'valid'
       AND r.moderation_status <> 'confirmed_abuse'
       AND r.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       AND EXISTS (
         SELECT 1
         FROM rating_labels rl
         WHERE rl.rating_id = r.rating_id
       )
     GROUP BY r.voter_id
     HAVING flagged_ratings >= ?
        AND distinct_targets >= ?`,
    [
      CONFIG.flagAbuse.shortFeedbackLength,
      CONFIG.recentDays,
      CONFIG.flagAbuse.minFlaggedRatings,
      CONFIG.flagAbuse.minDistinctTargets,
    ],
  );

  const activities = [];

  for (const row of rows) {
    const shortFeedbackRatio =
      Number(row.short_feedback_count) / Number(row.flagged_ratings);

    if (shortFeedbackRatio < CONFIG.flagAbuse.minShortFeedbackRatio) {
      continue;
    }

    activities.push(
      createActivity({
        window_id,
        user_id: row.voter_id,
        activity_type: "flag_abuse",
        severity: "medium",
        description:
          "A user repeatedly used rating flags while providing very limited written feedback.",
        details: {
          flagged_ratings: Number(row.flagged_ratings),
          distinct_targets: Number(row.distinct_targets),
          short_feedback_count: Number(row.short_feedback_count),
          short_feedback_ratio: Number(shortFeedbackRatio.toFixed(2)),
          rating_ids: row.rating_ids
            ? row.rating_ids.split(",").map(Number)
            : [],
        },
      }),
    );
  }

  return activities;
};

/*
  9. Closed Clique

  Looks for groups that repeatedly give positive ratings internally
  while giving one-star ratings to people outside the group.

  A group must have internal positive relationships and multiple
  negative ratings toward outsiders before it is flagged.
*/
const detectClosedClique = async (window_id, ratings) => {
  const activities = [];
  const positiveEdges = new Set();
  const negativeEdges = [];
  const users = new Set();

  for (const rating of ratings) {
    const voterId = Number(rating.voter_id);
    const targetId = Number(rating.rated_user_id);

    users.add(voterId);
    users.add(targetId);

    if (Number(rating.stars) === 3) {
      positiveEdges.add(`${voterId}:${targetId}`);
    }

    if (Number(rating.stars) === 1) {
      negativeEdges.push(rating);
    }
  }

  const adjacency = new Map([...users].map((userId) => [userId, new Set()]));

  // An internal connection requires reciprocal three-star ratings.
  for (const userId of users) {
    for (const otherId of users) {
      if (userId === otherId) continue;

      const forward = positiveEdges.has(`${userId}:${otherId}`);
      const backward = positiveEdges.has(`${otherId}:${userId}`);

      if (forward && backward) {
        adjacency.get(userId).add(otherId);
      }
    }
  }

  // Build fully connected groups, not merely connected components.
  // Every member must have a reciprocal positive edge with every other member.
  const groups = new Map();

  for (const seed of [...users].sort((a, b) => a - b)) {
    const group = [seed];
    const candidates = [...(adjacency.get(seed) || [])].sort((a, b) => a - b);

    for (const candidate of candidates) {
      if (group.every((memberId) => adjacency.get(memberId)?.has(candidate))) {
        group.push(candidate);
      }
    }

    if (group.length < CONFIG.closedClique.minMembers) continue;

    const normalizedGroup = [...group].sort((a, b) => a - b);
    groups.set(normalizedGroup.join(":"), normalizedGroup);
  }

  for (const component of groups.values()) {
    const memberSet = new Set(component);

    const internalPositiveRatings = ratings.filter(
      (rating) =>
        Number(rating.stars) === 3 &&
        memberSet.has(Number(rating.voter_id)) &&
        memberSet.has(Number(rating.rated_user_id)),
    );

    const externalNegativeRatings = negativeEdges.filter(
      (rating) =>
        memberSet.has(Number(rating.voter_id)) &&
        !memberSet.has(Number(rating.rated_user_id)),
    );

    if (
      externalNegativeRatings.length <
      CONFIG.closedClique.minExternalNegativeRatings
    ) {
      continue;
    }

    for (const memberId of component) {
      const memberExternalRatings = externalNegativeRatings.filter(
        (rating) => Number(rating.voter_id) === memberId,
      );

      if (!memberExternalRatings.length) continue;

      activities.push(
        createActivity({
          window_id,
          user_id: memberId,
          related_user_id: memberExternalRatings[0].rated_user_id,
          rating_id: memberExternalRatings[0].rating_id,
          activity_type: "closed_clique",
          severity: "high",
          description:
            "A member of a fully connected group gave one-star ratings to users outside the group while reciprocal three-star ratings were observed between every group member.",
          details: {
            group_members: component,
            group_member_count: component.length,
            internal_positive_rating_count: internalPositiveRatings.length,
            external_negative_rating_count: externalNegativeRatings.length,
            external_negative_rating_ids: externalNegativeRatings.map(
              (rating) => rating.rating_id,
            ),
          },
        }),
      );
    }
  }

  return activities;
};

/*
  Main function

  Keep the existing function name and argument so it can be
  connected to rating.service.js after this service is reviewed.
*/
const detectSuspiciousActivities = async (window_id) => {
  if (
    !window_id ||
    !Number.isInteger(Number(window_id)) ||
    Number(window_id) <= 0
  ) {
    throw new Error("A valid window_id is required");
  }

  const { ratings, currentRatings } = await getDetectionData(Number(window_id));

  if (!currentRatings.length) {
    return {
      message: "No ratings available for suspicious activity detection",
      detected: 0,
      activities: [],
    };
  }

  const detectedActivities = [];

  const detectionResults = await Promise.all([
    detectGroupVoting(Number(window_id), currentRatings),
    detectExtremeVoting(Number(window_id), currentRatings),
    detectRepeatedTargeting(Number(window_id), ratings),
    detectGroupRetaliation(Number(window_id), ratings),
    detectRatingCoordination(Number(window_id), currentRatings),
    detectHistoricalBehavior(Number(window_id), currentRatings, ratings),
    detectRatingAnomaly(Number(window_id), currentRatings),
    detectFlagAbuse(Number(window_id)),
    detectClosedClique(Number(window_id), currentRatings),
  ]);

  for (const activities of detectionResults) {
    detectedActivities.push(...activities);
  }

  const savedActivities = [];

  for (const activity of detectedActivities) {
    const saved = await saveActivity(activity);
    savedActivities.push(saved);
  }

  return {
    message: "Suspicious activity detection completed",
    detected: detectedActivities.length,
    saved: savedActivities.length,
    activities: detectedActivities,
  };
};

module.exports = {
  detectSuspiciousActivities,
};
