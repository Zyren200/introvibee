const { query } = require("./db");
const { normalizeText, uniqueInterests } = require("./personality");
const { createHttpError } = require("./http");
const { getUserById, listUsers, runQuery } = require("./users");

const getSharedInterests = (currentInterests = [], peerInterests = []) => {
  const peerLookup = new Set(uniqueInterests(peerInterests).map(normalizeText));

  return uniqueInterests(currentInterests).filter((interest) =>
    peerLookup.has(normalizeText(interest))
  );
};

let matchTablesReadyPromise = null;

const ensureMatchRecommendationTable = async () => {
  if (!matchTablesReadyPromise) {
    matchTablesReadyPromise = runQuery(
      query,
      `CREATE TABLE IF NOT EXISTS match_recommendations (
         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         user_id CHAR(36) NOT NULL,
         matched_user_id CHAR(36) NOT NULL,
         compatibility_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
         shared_interest_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
         same_personality TINYINT(1) NOT NULL DEFAULT 0,
         status ENUM('suggested', 'saved', 'messaged', 'dismissed') NOT NULL DEFAULT 'suggested',
         generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         PRIMARY KEY (id),
         UNIQUE KEY uq_match_recommendations_pair (user_id, matched_user_id),
         KEY idx_match_recommendations_user_status (user_id, status),
         CONSTRAINT fk_match_recommendations_user
           FOREIGN KEY (user_id) REFERENCES users (id)
           ON DELETE CASCADE,
         CONSTRAINT fk_match_recommendations_matched_user
           FOREIGN KEY (matched_user_id) REFERENCES users (id)
           ON DELETE CASCADE
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ).catch((error) => {
      matchTablesReadyPromise = null;
      throw error;
    });
  }

  return matchTablesReadyPromise;
};

const buildMatchSummary = (currentUser, peer) => {
  const sharedInterests = getSharedInterests(currentUser?.interests, peer?.interests);
  const samePersonality =
    Boolean(currentUser?.personalityType) &&
    Boolean(peer?.personalityType) &&
    currentUser.personalityType === peer.personalityType;

  const compatibilityScore = Math.min(
    99,
    (samePersonality ? 65 : 20) + sharedInterests.length * 12
  );

  return {
    sharedInterests,
    samePersonality,
    compatibilityScore,
    personalityTags: samePersonality
      ? [peer.personalityType, "Same personality type"]
      : [peer.personalityType || "Pending assessment"],
  };
};

const syncMatchRecommendations = async (userId, matches, executor = query) => {
  if (!matches.length) {
    return;
  }

  const valuesSql = matches.map(() => "(?, ?, ?, ?, ?, 'suggested')").join(", ");
  const params = matches.flatMap((match) => [
    userId,
    match.id,
    match.compatibilityScore,
    match.sharedInterests.length,
    Number(match.samePersonality),
  ]);

  await runQuery(
    executor,
    `INSERT INTO match_recommendations (
       user_id,
       matched_user_id,
       compatibility_score,
       shared_interest_count,
       same_personality,
       status
     )
     VALUES ${valuesSql}
     ON DUPLICATE KEY UPDATE
       compatibility_score = VALUES(compatibility_score),
       shared_interest_count = VALUES(shared_interest_count),
       same_personality = VALUES(same_personality),
       generated_at = CURRENT_TIMESTAMP`,
    params
  );
};

const getMatchStatuses = async (userId, matchedUserIds, executor = query) => {
  if (!matchedUserIds.length) {
    return {};
  }

  const rows = await runQuery(
    executor,
    `SELECT matched_user_id, status
     FROM match_recommendations
     WHERE user_id = ?
       AND matched_user_id IN (${matchedUserIds.map(() => "?").join(", ")})`,
    [userId, ...matchedUserIds]
  );

  return rows.reduce((accumulator, row) => {
    accumulator[row.matched_user_id] = row.status;
    return accumulator;
  }, {});
};

const listMatchesForUser = async (userId, executor = query) => {
  await ensureMatchRecommendationTable();
  const currentUser = await getUserById(userId, executor);
  if (!currentUser) {
    throw createHttpError("User not found.", 404);
  }

  if (!currentUser.assessmentCompleted || !currentUser.personalityType) {
    return [];
  }

  const users = await listUsers(executor);
  const matches = users
    .filter(
      (peer) =>
        peer.id !== currentUser.id &&
        peer.assessmentCompleted &&
        Boolean(peer.personalityType)
    )
    .map((peer) => {
      const match = buildMatchSummary(currentUser, peer);

      return {
        id: peer.id,
        username: peer.username,
        avatarId: peer.avatarId,
        personalityType: peer.personalityType,
        predictedPersonality: peer.predictedPersonality,
        sharedInterests: match.sharedInterests,
        samePersonality: match.samePersonality,
        compatibilityScore: match.compatibilityScore,
        personalityTags: match.personalityTags,
        presence: peer.presence,
      };
    })
    .filter((match) => match.samePersonality && match.sharedInterests.length > 0)
    .sort((left, right) => right.compatibilityScore - left.compatibilityScore);

  await syncMatchRecommendations(userId, matches, executor);

  const statusesByUserId = await getMatchStatuses(
    userId,
    matches.map((match) => match.id),
    executor
  );

  return matches.map((match) => ({
    ...match,
    status: statusesByUserId[match.id] || "suggested",
  }));
};

const markMatchMessaged = async (userId, matchedUserId, executor = query) => {
  await ensureMatchRecommendationTable();
  await runQuery(
    executor,
    `UPDATE match_recommendations
     SET status = 'messaged',
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?
       AND matched_user_id = ?`,
    [userId, matchedUserId]
  );
};

module.exports = {
  buildMatchSummary,
  getSharedInterests,
  listMatchesForUser,
  markMatchMessaged,
};