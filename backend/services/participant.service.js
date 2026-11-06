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
     INNER JOIN users u ON u.user_id = rp.user_id
     LEFT JOIN user_skills us ON us.user_id = u.user_id
     LEFT JOIN skills s ON s.skill_id = us.skill_id
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
     INNER JOIN users u ON u.user_id = rp.user_id
     INNER JOIN voting_windows vw
       ON vw.window_id = rp.window_id
     LEFT JOIN user_skills us ON us.user_id = u.user_id
     LEFT JOIN skills s ON s.skill_id = us.skill_id
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

module.exports = {
  addParticipant,
  getParticipants,
  removeParticipant,
  getEligibleParticipants,
};
