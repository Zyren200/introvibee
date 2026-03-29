const { withTransaction } = require("../_lib/db");
const { requireSession } = require("../_lib/auth");
const { createHttpError, ensureMethod, handleApiError, parseJsonBody, sendJson } = require("../_lib/http");
const {
  createGroupChat,
  getChatStateForUser,
  markDirectConversationRead,
  markGroupChatRead,
  sendDirectMessage,
  sendGroupMessage,
} = require("../_lib/chat");

const getChatRoute = (req) => {
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

const handleState = async (req, res) => {
  if (!ensureMethod(req, res, ["GET"])) {
    return;
  }

  const session = await requireSession(req);
  const chatState = await getChatStateForUser(session.user.id);
  sendJson(res, 200, { mode: "railway-api", ...chatState });
};

const handleDirectSend = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  const body = await parseJsonBody(req);
  const chatState = await withTransaction(async (connection) => {
    const session = await requireSession(req, connection);
    return sendDirectMessage(session.user.id, body?.peerId, body, connection);
  });

  sendJson(res, 200, { mode: "railway-api", ...chatState });
};

const handleDirectRead = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  const body = await parseJsonBody(req);
  const chatState = await withTransaction(async (connection) => {
    const session = await requireSession(req, connection);
    return markDirectConversationRead(session.user.id, body?.peerId, connection);
  });

  sendJson(res, 200, { mode: "railway-api", ...chatState });
};

const handleGroupCreate = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  const body = await parseJsonBody(req);
  const result = await withTransaction(async (connection) => {
    const session = await requireSession(req, connection);
    return createGroupChat(session.user, body?.name, body?.memberIds, connection);
  });

  sendJson(res, 200, { mode: "railway-api", ...result.chatState, groupId: result.groupId });
};

const handleGroupSend = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  const body = await parseJsonBody(req);
  const chatState = await withTransaction(async (connection) => {
    const session = await requireSession(req, connection);
    return sendGroupMessage(session.user.id, body?.groupId, body, connection);
  });

  sendJson(res, 200, { mode: "railway-api", ...chatState });
};

const handleGroupRead = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  const body = await parseJsonBody(req);
  const chatState = await withTransaction(async (connection) => {
    const session = await requireSession(req, connection);
    return markGroupChatRead(session.user.id, body?.groupId, connection);
  });

  sendJson(res, 200, { mode: "railway-api", ...chatState });
};

module.exports = async (req, res) => {
  try {
    const route = getChatRoute(req);

    if (!route || route === "state") {
      await handleState(req, res);
      return;
    }

    if (route === "direct/send") {
      await handleDirectSend(req, res);
      return;
    }

    if (route === "direct/read") {
      await handleDirectRead(req, res);
      return;
    }

    if (route === "groups/create") {
      await handleGroupCreate(req, res);
      return;
    }

    if (route === "groups/send") {
      await handleGroupSend(req, res);
      return;
    }

    if (route === "groups/read") {
      await handleGroupRead(req, res);
      return;
    }

    throw createHttpError("Chat endpoint not found.", 404);
  } catch (error) {
    handleApiError(res, error);
  }
};
