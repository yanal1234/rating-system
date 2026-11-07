const db = require("../config/db");

// Add participant
const addParticipant = async (window_id, user_id) => {
  await db.query(
    `INSERT INTO rating_participants (window_id, user_id)
     VALUES (?, ?)`,
    [window_id, user_id],
  );

  return {
    window_id,
    user_id,
  };
};

// Get all participants in a window
const getParticipants = async (window_id) => {
  const [participants] = await db.query(
    `SELECT
        rp.window_id,
        rp.user_id,
        rp.joined_at,
        u.username,
        u.full_name,
        u.email,
        u.is_active,
        u.bio,
        u.profile_picture,
        COALESCE(
          JSON_ARRAYAGG(
            CASE
              WHEN s.skill_id IS NOT NULL THEN
                JSON_OBJECT(
                  'skill_id', s.skill_id,
                  'name', s.skill_name
                )
              ELSE NULL
            END
          ),
          JSON_ARRAY()
        ) AS skills
     FROM rating_participants rp
     INNER JOIN users u
       ON u.user_id = rp.user_id
     LEFT JOIN user_skills us
       ON us.user_id = u.user_id
     LEFT JOIN skills s
       ON s.skill_id = us.skill_id
     WHERE rp.window_id = ?
     GROUP BY
        rp.window_id,
        rp.user_id,
        rp.joined_at,
        u.username,
        u.full_name,
        u.email,
        u.is_active,
        u.bio,
        u.profile_picture
     ORDER BY u.full_name ASC`,
    [window_id],
  );

  return participants.map((participant) => ({
    ...participant,
    skills: normalizeSkills(participant.skills),
  }));
};

// Remove participant
const removeParticipant = async (window_id, user_id) => {
  const [result] = await db.query(
    `DELETE FROM rating_participants
     WHERE window_id = ?
       AND user_id = ?`,
    [window_id, user_id],
  );

  if (result.affectedRows === 0) {
    throw new Error("Participant not found.");
  }

  return true;
};

// Get eligible students for current student
const getEligibleParticipants = async (window_id, currentUserId) => {
  const [participants] = await db.query(
    `SELECT
        u.user_id,
        u.full_name,
        u.username,
        u.bio,
        u.profile_picture,
        rp.joined_at,
        COALESCE(
          JSON_ARRAYAGG(
            CASE
              WHEN s.skill_id IS NOT NULL THEN
                JSON_OBJECT(
                  'skill_id', s.skill_id,
                  'name', s.skill_name
                )
              ELSE NULL
            END
          ),
          JSON_ARRAY()
        ) AS skills
     FROM rating_participants rp
     INNER JOIN users u
       ON u.user_id = rp.user_id
     INNER JOIN voting_windows vw
       ON vw.window_id = rp.window_id
     LEFT JOIN user_skills us
       ON us.user_id = u.user_id
     LEFT JOIN skills s
       ON s.skill_id = us.skill_id
     WHERE rp.window_id = ?
       AND vw.status = 'published'
       AND vw.starts_at <= NOW()
       AND vw.ends_at >= NOW()
       AND u.is_active = 1
       AND u.role = 'student'
       AND u.user_id != ?
       AND EXISTS (
         SELECT 1
         FROM rating_participants own
         WHERE own.window_id = rp.window_id
           AND own.user_id = ?
       )
       AND NOT EXISTS (
         SELECT 1
         FROM ratings r
         WHERE r.window_id = rp.window_id
           AND r.voter_id = ?
           AND r.rated_user_id = u.user_id
           AND r.status = 'valid'
       )
     GROUP BY
        u.user_id,
        u.full_name,
        u.username,
        u.bio,
        u.profile_picture,
        rp.joined_at
     ORDER BY u.full_name ASC`,
    [window_id, currentUserId, currentUserId, currentUserId],
  );

  return participants.map((participant) => ({
    ...participant,
    skills: normalizeSkills(participant.skills),
  }));
};

// Normalize skills returned by MariaDB JSON aggregation
const normalizeSkills = (skills) => {
  if (!skills) return [];

  try {
    const parsed = typeof skills === "string" ? JSON.parse(skills) : skills;

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (skill) => skill && skill.skill_id !== null && skill.name,
    );
  } catch (error) {
    console.error("Skills parsing error:", error);
    return [];
  }
};

// Get real participation statistics for staff
const getParticipationStats = async (window_id) => {
  const [participants] = await db.query(
    `SELECT
        rp.window_id,
        rp.user_id,
        u.username,
        u.full_name,
        u.email,
        u.profile_picture,
        u.is_active,
        rp.joined_at,

        COALESCE(rating_stats.votes_given, 0) AS votes_given,
        COALESCE(rating_stats.one_star, 0) AS one_star,
        COALESCE(rating_stats.two_stars, 0) AS two_stars,
        COALESCE(rating_stats.three_stars, 0) AS three_stars,
        rating_stats.last_vote_at,

        COALESCE(activity_stats.flag_count, 0) AS flag_count,

        vw.min_votes,
        vw.max_votes,

        CASE
          WHEN COALESCE(rating_stats.votes_given, 0) = 0
            THEN 'not_voted'
          WHEN COALESCE(rating_stats.votes_given, 0) < vw.min_votes
            THEN 'below_minimum'
          ELSE 'completed'
        END AS participation_status

     FROM rating_participants rp

     INNER JOIN users u
       ON u.user_id = rp.user_id

     INNER JOIN voting_windows vw
       ON vw.window_id = rp.window_id

     LEFT JOIN (
       SELECT
         voter_id,
         window_id,
         COUNT(*) AS votes_given,
         SUM(CASE WHEN stars = 1 THEN 1 ELSE 0 END) AS one_star,
         SUM(CASE WHEN stars = 2 THEN 1 ELSE 0 END) AS two_stars,
         SUM(CASE WHEN stars = 3 THEN 1 ELSE 0 END) AS three_stars,
         MAX(created_at) AS last_vote_at
       FROM ratings
       WHERE status = 'valid'
       GROUP BY voter_id, window_id
     ) rating_stats
       ON rating_stats.voter_id = rp.user_id
       AND rating_stats.window_id = rp.window_id

     LEFT JOIN (
       SELECT
         related_user_id,
         window_id,
         COUNT(*) AS flag_count
       FROM suspicious_activities
       WHERE related_user_id IS NOT NULL
         AND status != 'dismissed'
       GROUP BY related_user_id, window_id
     ) activity_stats
       ON activity_stats.related_user_id = rp.user_id
       AND activity_stats.window_id = rp.window_id

     WHERE rp.window_id = ?
       AND u.role = 'student'
       AND u.is_active = 1

     ORDER BY u.full_name ASC`,
    [window_id],
  );

  const normalizedParticipants = participants.map((participant) => ({
    ...participant,
    votes_given: Number(participant.votes_given),
    one_star: Number(participant.one_star),
    two_stars: Number(participant.two_stars),
    three_stars: Number(participant.three_stars),
    flag_count: Number(participant.flag_count),
    min_votes: Number(participant.min_votes),
    max_votes: Number(participant.max_votes),
  }));

  const totalParticipants = normalizedParticipants.length;

  const voted = normalizedParticipants.filter(
    (student) => student.votes_given > 0,
  ).length;

  const notVoted = normalizedParticipants.filter(
    (student) => student.votes_given === 0,
  ).length;

  const belowMinimum = normalizedParticipants.filter(
    (student) =>
      student.votes_given > 0 && student.votes_given < student.min_votes,
  ).length;

  const completed = normalizedParticipants.filter(
    (student) => student.votes_given >= student.min_votes,
  ).length;

  const turnout =
    totalParticipants > 0
      ? Number(((voted / totalParticipants) * 100).toFixed(1))
      : 0;

  return {
    summary: {
      total_participants: totalParticipants,
      voted,
      not_voted: notVoted,
      below_minimum: belowMinimum,
      completed,
      turnout,
    },
    participants: normalizedParticipants,
  };
};

module.exports = {
  addParticipant,
  getParticipants,
  removeParticipant,
  getEligibleParticipants,
  getParticipationStats,
};
