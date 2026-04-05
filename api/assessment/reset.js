const { withTransaction } = require("../_lib/db");
const { requireSession } = require("../_lib/auth");
const { STARTING_PUZZLE } = require("../_lib/sudoku");
const { ensureMethod, handleApiError, sendJson } = require("../_lib/http");
const { getUserById, listUsers, runQuery } = require("../_lib/users");

module.exports = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  try {
    const { user } = await withTransaction(async (connection) => {
      const session = await requireSession(req, connection);
      const userId = session.user.id;

      await runQuery(
        connection,
        `DELETE paa
         FROM personality_assessment_answers paa
         INNER JOIN personality_assessments pa ON pa.id = paa.assessment_id
         WHERE pa.user_id = ?`,
        [userId]
      );

      await runQuery(
        connection,
        `DELETE FROM personality_assessments
         WHERE user_id = ?`,
        [userId]
      );

      await runQuery(
        connection,
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
           KEY idx_match_recommendations_user_status (user_id, status)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      );

      await runQuery(
        connection,
        `DELETE FROM match_recommendations
         WHERE user_id = ?
            OR matched_user_id = ?`,
        [userId, userId]
      );

      await runQuery(
        connection,
        `UPDATE users
         SET personality_type = NULL,
             assessment_completed = 0,
             sudoku_completed = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [userId]
      );

      await runQuery(
        connection,
        `INSERT INTO sudoku_progress (
           user_id,
           status,
           board_state,
           moves_count,
           started_at,
           completed_at
         )
         VALUES (?, 'not_started', ?, 0, NULL, NULL)
         ON DUPLICATE KEY UPDATE
           status = 'not_started',
           board_state = VALUES(board_state),
           moves_count = 0,
           started_at = NULL,
           completed_at = NULL,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, JSON.stringify(STARTING_PUZZLE)]
      );

      const updatedUser = await getUserById(userId, connection);
      return { user: updatedUser };
    });

    const users = await listUsers();

    sendJson(res, 200, {
      mode: "railway-api",
      user,
      users,
    });
  } catch (error) {
    handleApiError(res, error);
  }
};
