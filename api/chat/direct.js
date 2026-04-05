const { withTransaction } = require("../_lib/db");
const { requireSession } = require("../_lib/auth");
const { createHttpError, ensureMethod, handleApiError, parseJsonBody, sendJson } = require("../_lib/http");
const { deleteDirectConversationForUser, markDirectConversationRead, sendDirectMessage } = require("../_lib/chat");

module.exports = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const action = (body?.action || "").toString().trim().toLowerCase();

    const chatState = await withTransaction(async (connection) => {
      const session = await requireSession(req, connection);

      if (action === "send") {
        return sendDirectMessage(session.user.id, body?.peerId, body, connection);
      }

      if (action === "read") {
        return markDirectConversationRead(session.user.id, body?.peerId, connection);
      }

      if (action === "delete") {
        return deleteDirectConversationForUser(session.user.id, body?.peerId, connection);
      }

      throw createHttpError("Unsupported direct chat action.", 400);
    });

    sendJson(res, 200, { mode: "railway-api", ...chatState });
  } catch (error) {
    handleApiError(res, error);
  }
};
