const { withTransaction } = require("../_lib/db");
const { requireSession } = require("../_lib/auth");
const { createHttpError, ensureMethod, handleApiError, parseJsonBody, sendJson } = require("../_lib/http");
const { createGroupChat, deleteGroupConversationForUser, markGroupChatRead, sendGroupMessage } = require("../_lib/chat");

module.exports = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const action = (body?.action || "").toString().trim().toLowerCase();

    const result = await withTransaction(async (connection) => {
      const session = await requireSession(req, connection);

      if (action === "create") {
        return createGroupChat(session.user, body?.name, body?.memberIds, connection);
      }

      if (action === "send") {
        return {
          chatState: await sendGroupMessage(session.user.id, body?.groupId, body, connection),
        };
      }

      if (action === "read") {
        return {
          chatState: await markGroupChatRead(session.user.id, body?.groupId, connection),
        };
      }

      if (action === "delete") {
        return {
          chatState: await deleteGroupConversationForUser(session.user.id, body?.groupId, connection),
        };
      }

      throw createHttpError("Unsupported group chat action.", 400);
    });

    sendJson(res, 200, {
      mode: "railway-api",
      ...result.chatState,
      ...(result.groupId ? { groupId: result.groupId } : {}),
    });
  } catch (error) {
    handleApiError(res, error);
  }
};
