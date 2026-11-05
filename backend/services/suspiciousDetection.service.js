const db = require("../config/db");

// Detection thresholds
const RULES = {
  RAPID_COUNT: 4,
  RAPID_MINUTES: 5,

  BULK_COUNT: 5,
  BULK_MINUTES: 30,

  EXTREME_MIN_COUNT: 5,
  EXTREME_PERCENTAGE: 80,

  RETALIATION_HOURS: 24,

  GROUP_MIN_SIZE: 3,
  GROUP_MAX_SIZE: 5,
};

// Save suspicious activity without duplicating an active record

const saveActivity = async ({
  window_id,
  user_id,
  related_user_id = null,
  rating_id = null,
  activity_type,
  severity,
  description,
}) => {
  const [existing] = await db.query(
    `SELECT activity_id
     FROM suspicious_activities
     WHERE window_id = ?
       AND user_id = ?
       AND related_user_id <=> ?
       AND activity_type = ?
       AND (
         activity_type <> 'group_voting'
         OR description = ?
       )
       AND status <> 'dismissed'
     LIMIT 1`,
    [window_id, user_id, related_user_id, activity_type, description],
  );

  if (existing.length > 0) {
    return false;
  }

  await db.query(
    `INSERT INTO suspicious_activities
     (
       window_id,
       user_id,
       related_user_id,
       rating_id,
       activity_type,
       severity,
       description
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      window_id,
      user_id,
      related_user_id,
      rating_id,
      activity_type,
      severity,
      description,
    ],
  );

  return true;
};

// Get valid ratings and their creation times
const getWindowRatings = async (window_id) => {
  const [ratings] = await db.query(
    `SELECT
       r.rating_id,
       r.window_id,
       r.voter_id,
       r.rated_user_id,
       r.stars,
       al.created_at
     FROM ratings r
     LEFT JOIN (
       SELECT rating_id, MIN(created_at) AS created_at
       FROM rating_audit_logs
       WHERE action_type = 'rating_created'
       GROUP BY rating_id
     ) al ON al.rating_id = r.rating_id
     WHERE r.window_id = ?
       AND r.status = 'valid'
     ORDER BY al.created_at ASC, r.rating_id ASC`,
    [window_id],
  );

  return ratings;
};

// 1. Mutual voting
const detectMutualVoting = async (ratings) => {
  const detectedPairs = new Set();

  for (const rating of ratings) {
    const reverse = ratings.find(
      (other) =>
        Number(other.voter_id) === Number(rating.rated_user_id) &&
        Number(other.rated_user_id) === Number(rating.voter_id),
    );

    if (!reverse) continue;

    const first = Math.min(
      Number(rating.voter_id),
      Number(rating.rated_user_id),
    );

    const second = Math.max(
      Number(rating.voter_id),
      Number(rating.rated_user_id),
    );

    const key = `${first}-${second}`;

    if (detectedPairs.has(key)) continue;

    detectedPairs.add(key);

    await saveActivity({
      window_id: rating.window_id,
      user_id: first,
      related_user_id: second,
      rating_id: Math.max(Number(rating.rating_id), Number(reverse.rating_id)),
      activity_type: "mutual_voting",
      severity: "low",
      description: `Users ${first} and ${second} rated each other.`,
    });
  }
};

// 2. Group voting (cycles of 3 to 5 users)
const detectGroupVoting = async (ratings) => {
  const graph = new Map();

  for (const rating of ratings) {
    const voter = Number(rating.voter_id);
    const target = Number(rating.rated_user_id);

    if (!graph.has(voter)) {
      graph.set(voter, new Set());
    }

    graph.get(voter).add(target);
  }

  const detectedGroups = new Set();

  const findCycles = (start, current, path) => {
    if (path.length > RULES.GROUP_MAX_SIZE) return;

    const neighbors = graph.get(current) || new Set();

    for (const next of neighbors) {
      if (next === start && path.length >= RULES.GROUP_MIN_SIZE) {
        const group = [...path].sort((a, b) => a - b);
        const key = group.join("-");

        if (!detectedGroups.has(key)) {
          detectedGroups.add(key);
        }

        continue;
      }

      // Avoid repeated users and duplicate cycle searches
      if (next <= start || path.includes(next)) continue;

      findCycles(start, next, [...path, next]);
    }
  };

  for (const user of graph.keys()) {
    findCycles(user, user, [user]);
  }

  for (const groupKey of detectedGroups) {
    const group = groupKey.split("-").map(Number);

    const groupRatings = ratings.filter(
      (rating) =>
        group.includes(Number(rating.voter_id)) &&
        group.includes(Number(rating.rated_user_id)),
    );

    const latestRating = groupRatings.reduce((latest, rating) =>
      Number(rating.rating_id) > Number(latest.rating_id) ? rating : latest,
    );

    await saveActivity({
      window_id: latestRating.window_id,
      user_id: group[0],
      rating_id: latestRating.rating_id,
      activity_type: "group_voting",
      severity: "high",
      description: `Possible circular voting detected between users: ${group.join(", ")}.`,
    });
  }
};

// 3. Rapid voting
const detectRapidVoting = async (ratings) => {
  const userRatings = new Map();

  for (const rating of ratings) {
    if (!rating.created_at) continue;

    const voter = Number(rating.voter_id);

    if (!userRatings.has(voter)) {
      userRatings.set(voter, []);
    }

    userRatings.get(voter).push(rating);
  }

  for (const [user_id, userVotes] of userRatings) {
    for (let i = 0; i < userVotes.length; i++) {
      const firstTime = new Date(userVotes[i].created_at).getTime();

      const matchingVotes = userVotes.slice(i).filter((rating) => {
        const time = new Date(rating.created_at).getTime();

        return time - firstTime <= RULES.RAPID_MINUTES * 60 * 1000;
      });

      if (matchingVotes.length >= RULES.RAPID_COUNT) {
        const latest = matchingVotes[matchingVotes.length - 1];

        await saveActivity({
          window_id: latest.window_id,
          user_id,
          rating_id: latest.rating_id,
          activity_type: "rapid_voting",
          severity: "medium",
          description: `User ${user_id} submitted ${matchingVotes.length} ratings within ${RULES.RAPID_MINUTES} minutes.`,
        });

        break;
      }
    }
  }
};

// 4. Bulk voting
const detectBulkVoting = async (ratings) => {
  const userRatings = new Map();

  for (const rating of ratings) {
    if (!rating.created_at) continue;

    const voter = Number(rating.voter_id);

    if (!userRatings.has(voter)) {
      userRatings.set(voter, []);
    }

    userRatings.get(voter).push(rating);
  }

  for (const [user_id, userVotes] of userRatings) {
    for (let i = 0; i < userVotes.length; i++) {
      const firstTime = new Date(userVotes[i].created_at).getTime();

      const matchingVotes = userVotes.slice(i).filter((rating) => {
        const time = new Date(rating.created_at).getTime();

        return time - firstTime <= RULES.BULK_MINUTES * 60 * 1000;
      });

      const uniqueTargets = new Set(
        matchingVotes.map((rating) => Number(rating.rated_user_id)),
      );

      if (uniqueTargets.size >= RULES.BULK_COUNT) {
        const latest = matchingVotes[matchingVotes.length - 1];

        await saveActivity({
          window_id: latest.window_id,
          user_id,
          rating_id: latest.rating_id,
          activity_type: "bulk_voting",
          severity: "medium",
          description: `User ${user_id} rated ${uniqueTargets.size} different participants within ${RULES.BULK_MINUTES} minutes.`,
        });

        break;
      }
    }
  }
};

// 5. Extreme voting
const detectExtremeVoting = async (ratings) => {
  const userRatings = new Map();

  for (const rating of ratings) {
    const voter = Number(rating.voter_id);

    if (!userRatings.has(voter)) {
      userRatings.set(voter, []);
    }

    userRatings.get(voter).push(rating);
  }

  for (const [user_id, userVotes] of userRatings) {
    if (userVotes.length < RULES.EXTREME_MIN_COUNT) continue;

    for (const extremeStars of [1, 3]) {
      const extremeCount = userVotes.filter(
        (rating) => Number(rating.stars) === extremeStars,
      ).length;

      const percentage = (extremeCount / userVotes.length) * 100;

      if (percentage >= RULES.EXTREME_PERCENTAGE) {
        const latest = userVotes[userVotes.length - 1];

        await saveActivity({
          window_id: latest.window_id,
          user_id,
          rating_id: latest.rating_id,
          activity_type: "extreme_voting",
          severity: "medium",
          description: `User ${user_id} gave ${extremeStars} star ratings in ${percentage.toFixed(1)}% of their votes.`,
        });

        break;
      }
    }
  }
};

// 6. Retaliation
const detectRetaliation = async (ratings) => {
  for (const rating of ratings) {
    if (!rating.created_at || Number(rating.stars) !== 1) continue;

    const reverse = ratings.find((other) => {
      if (!other.created_at || Number(other.stars) !== 1) {
        return false;
      }

      const samePair =
        Number(other.voter_id) === Number(rating.rated_user_id) &&
        Number(other.rated_user_id) === Number(rating.voter_id);

      if (!samePair) return false;

      const firstTime = new Date(rating.created_at).getTime();
      const secondTime = new Date(other.created_at).getTime();

      const difference = secondTime - firstTime;

      return (
        difference > 0 && difference <= RULES.RETALIATION_HOURS * 60 * 60 * 1000
      );
    });

    if (!reverse) continue;

    await saveActivity({
      window_id: rating.window_id,
      user_id: Number(reverse.voter_id),
      related_user_id: Number(rating.voter_id),
      rating_id: reverse.rating_id,
      activity_type: "retaliation",
      severity: "high",
      description: `User ${reverse.voter_id} gave a one-star rating after receiving a one-star rating from user ${rating.voter_id}.`,
    });
  }
};

// Run all detection rules
const detectSuspiciousActivities = async (window_id) => {
  if (!Number.isInteger(Number(window_id)) || Number(window_id) <= 0) {
    throw new Error("Invalid voting window ID");
  }

  const ratings = await getWindowRatings(window_id);

  await detectMutualVoting(ratings);
  await detectGroupVoting(ratings);
  await detectRapidVoting(ratings);
  await detectBulkVoting(ratings);
  await detectExtremeVoting(ratings);
  await detectRetaliation(ratings);

  return {
    message: "Suspicious activity detection completed",
  };
};

module.exports = {
  detectMutualVoting,
  detectGroupVoting,
  detectRapidVoting,
  detectBulkVoting,
  detectExtremeVoting,
  detectRetaliation,
  detectSuspiciousActivities,
};
