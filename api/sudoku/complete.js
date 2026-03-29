const { withTransaction } = require("../_lib/db");
const { requireSession } = require("../_lib/auth");
const { ensureMethod, handleApiError, sendJson } = require("../_lib/http");
const { getUserById, listUsers, runQuery } = require("../_lib/users");

module.exports = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  try {
    const { user } = await withTransaction(async (connection) => {
      const session = await requireSession(req, connection);

      await runQuery(
        connection,
        `UPDATE users
         SET sudoku_completed = 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [session.user.id]
      );

      await runQuery(
        connection,
        `INSERT INTO sudoku_progress (
           user_id,
           status,
           started_at,
           completed_at
         )
         VALUES (?, 'completed', UTC_TIMESTAMP(), UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
           status = 'completed',
           completed_at = UTC_TIMESTAMP(),
           updated_at = CURRENT_TIMESTAMP`,
        [session.user.id]
      );

      const updatedUser = await getUserById(session.user.id, connection);
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
