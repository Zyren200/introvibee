const { withTransaction } = require("../_lib/db");
const { requireSession } = require("../_lib/auth");
const { ensureMethod, handleApiError, parseJsonBody, sendJson } = require("../_lib/http");
const { getSudokuProgressForUser, saveSudokuProgressForUser } = require("../_lib/sudoku");

module.exports = async (req, res) => {
  if (!ensureMethod(req, res, ["GET", "PUT"])) {
    return;
  }

  try {
    if (req.method === "GET") {
      const session = await requireSession(req);
      const progress = await getSudokuProgressForUser(session.user.id);
      sendJson(res, 200, { mode: "railway-api", progress });
      return;
    }

    const body = await parseJsonBody(req);
    const progress = await withTransaction(async (connection) => {
      const session = await requireSession(req, connection);
      return saveSudokuProgressForUser(session.user.id, body?.boardState, connection);
    });

    sendJson(res, 200, { mode: "railway-api", progress });
  } catch (error) {
    handleApiError(res, error);
  }
};
