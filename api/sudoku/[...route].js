const { withTransaction } = require("../_lib/db");
const { requireSession } = require("../_lib/auth");
const { createHttpError, ensureMethod, handleApiError, parseJsonBody, sendJson } = require("../_lib/http");
const { getSudokuProgressForUser, saveSudokuProgressForUser } = require("../_lib/sudoku");
const { getUserById, listUsers, runQuery } = require("../_lib/users");

const getSudokuRoute = (req) => {
  const routeParam = req?.query?.route;

  if (Array.isArray(routeParam)) {
    return routeParam.filter(Boolean).join("/");
  }

  if (typeof routeParam === "string" && routeParam.trim()) {
    return routeParam.trim();
  }

  const pathname = new URL(req.url || "/", "http://localhost").pathname.replace(/\/+$/, "");
  return pathname
    .split("/")
    .filter(Boolean)
    .slice(2)
    .join("/");
};

const handleProgress = async (req, res) => {
  if (!ensureMethod(req, res, ["GET", "PUT"])) {
    return;
  }

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
};

const handleComplete = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

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
};

module.exports = async (req, res) => {
  try {
    const route = getSudokuRoute(req);

    if (route === "progress") {
      await handleProgress(req, res);
      return;
    }

    if (route === "complete") {
      await handleComplete(req, res);
      return;
    }

    throw createHttpError("Sudoku endpoint not found.", 404);
  } catch (error) {
    handleApiError(res, error);
  }
};
