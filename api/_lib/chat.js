const crypto = require("crypto");
const { query } = require("./db");
const { createHttpError } = require("./http");
const { markMatchMessaged } = require("./matches");
const { runQuery } = require("./users");

const canCreateGroupChats = (personalityType) =>
  personalityType === "Ambivert" || personalityType === "Extrovert";

const createInClause = (values = []) => values.map(() => "?").join(", ");

const toTimestamp = (value) => (value ? new Date(value).getTime() : Date.now());
const MESSAGE_CONTENT_VERSION = "introVibe:message:v1";
let clearTablesReadyPromise = null;
let clearTablesEnabled = null;

const ensureConversationClearTables = async () => {
  if (clearTablesEnabled !== null) {
    return clearTablesEnabled;
  }

  if (!clearTablesReadyPromise) {
    clearTablesReadyPromise = (async () => {
      try {
        await runQuery(
          query,
          `CREATE TABLE IF NOT EXISTS direct_conversation_clears (
             conversation_id CHAR(36) NOT NULL,
             user_id CHAR(36) NOT NULL,
             cleared_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
             PRIMARY KEY (conversation_id, user_id),
             KEY idx_direct_conversation_clears_user (user_id),
             CONSTRAINT fk_direct_conversation_clears_conversation
               FOREIGN KEY (conversation_id) REFERENCES direct_conversations (id)
               ON DELETE CASCADE,
             CONSTRAINT fk_direct_conversation_clears_user
               FOREIGN KEY (user_id) REFERENCES users (id)
               ON DELETE CASCADE
           ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        );
        await runQuery(
          query,
          `CREATE TABLE IF NOT EXISTS group_chat_clears (
             group_chat_id CHAR(36) NOT NULL,
             user_id CHAR(36) NOT NULL,
             cleared_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
             PRIMARY KEY (group_chat_id, user_id),
             KEY idx_group_chat_clears_user (user_id),
             CONSTRAINT fk_group_chat_clears_group
               FOREIGN KEY (group_chat_id) REFERENCES group_chats (id)
               ON DELETE CASCADE,
             CONSTRAINT fk_group_chat_clears_user
               FOREIGN KEY (user_id) REFERENCES users (id)
               ON DELETE CASCADE
           ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        );
        clearTablesEnabled = true;
      } catch (error) {
        clearTablesEnabled = false;
      } finally {
        clearTablesReadyPromise = null;
      }

      return clearTablesEnabled;
    })();
  }

  return clearTablesReadyPromise;
};

const mapClearRowsByConversation = (rows = [], idKey) =>
  rows.reduce((accumulator, row) => {
    accumulator[row[idKey]] = toTimestamp(row.cleared_at);
    return accumulator;
  }, {});

const listDirectChatsForUser = async (userId, executor = query) => {
  const conversationRows = await runQuery(
    executor,
    `SELECT id, conversation_key, user_one_id, user_two_id, updated_at, last_message_at
     FROM direct_conversations
     WHERE user_one_id = ? OR user_two_id = ?
     ORDER BY COALESCE(last_message_at, updated_at) DESC`,
    [userId, userId]
  );

  if (!conversationRows.length) {
    return {};
  }

  const clearTablesEnabled = await ensureConversationClearTables();
  const conversationIds = conversationRows.map((row) => row.id);
  const clearRows = clearTablesEnabled
    ? await runQuery(
        executor,
        `SELECT conversation_id, cleared_at
         FROM direct_conversation_clears
         WHERE user_id = ?
           AND conversation_id IN (${createInClause(conversationIds)})`,
        [userId, ...conversationIds]
      )
    : [];
  const messageRows = await runQuery(
    executor,
    `SELECT id, conversation_id, sender_id, content, image_url, created_at
     FROM direct_messages
     WHERE deleted_at IS NULL
       AND conversation_id IN (${createInClause(conversationIds)})
     ORDER BY created_at ASC`,
    conversationIds
  );

  const messageIds = messageRows.map((row) => row.id);
  const readRows = messageIds.length
    ? await runQuery(
        executor,
        `SELECT message_id, user_id
         FROM direct_message_reads
         WHERE message_id IN (${createInClause(messageIds)})`,
        messageIds
      )
    : [];

  const messagesByConversation = messageRows.reduce((accumulator, row) => {
    if (!accumulator[row.conversation_id]) {
      accumulator[row.conversation_id] = [];
    }

    accumulator[row.conversation_id].push(row);
    return accumulator;
  }, {});

  const clearedAtByConversation = mapClearRowsByConversation(clearRows, "conversation_id");

  return Object.fromEntries(
    conversationRows
      .filter((row) => {
        const clearedAt = clearedAtByConversation[row.id] || 0;
        return !clearedAt || toTimestamp(row.last_message_at || row.updated_at) > clearedAt;
      })
      .map((row) => [
      row.conversation_key,
      {
        id: row.id,
        participants: [row.user_one_id, row.user_two_id],
        lastUpdated: toTimestamp(row.last_message_at || row.updated_at),
        messages: mapMessages(messagesByConversation[row.id] || [], readRows),
      },
    ])
  );
};

const listGroupChatsForUser = async (userId, executor = query) => {
  const groupRows = await runQuery(
    executor,
    `SELECT gc.id, gc.name, gc.created_by, gc.updated_at, gc.last_message_at
     FROM group_chats gc
     INNER JOIN group_chat_members gcm ON gcm.group_chat_id = gc.id
     WHERE gcm.user_id = ?
       AND gc.is_archived = 0
     ORDER BY COALESCE(gc.last_message_at, gc.updated_at) DESC`,
    [userId]
  );

  if (!groupRows.length) {
    return [];
  }

  const clearTablesEnabled = await ensureConversationClearTables();
  const groupIds = groupRows.map((row) => row.id);
  const clearRows = clearTablesEnabled
    ? await runQuery(
        executor,
        `SELECT group_chat_id, cleared_at
         FROM group_chat_clears
         WHERE user_id = ?
           AND group_chat_id IN (${createInClause(groupIds)})`,
        [userId, ...groupIds]
      )
    : [];
  const memberRows = await runQuery(
    executor,
    `SELECT group_chat_id, user_id
     FROM group_chat_members
     WHERE group_chat_id IN (${createInClause(groupIds)})
     ORDER BY joined_at ASC`,
    groupIds
  );
  const messageRows = await runQuery(
    executor,
    `SELECT id, group_chat_id, sender_id, content, image_url, created_at
     FROM group_messages
     WHERE deleted_at IS NULL
       AND group_chat_id IN (${createInClause(groupIds)})
     ORDER BY created_at ASC`,
    groupIds
  );

  const messageIds = messageRows.map((row) => row.id);
  const readRows = messageIds.length
    ? await runQuery(
        executor,
        `SELECT message_id, user_id
         FROM group_message_reads
         WHERE message_id IN (${createInClause(messageIds)})`,
        messageIds
      )
    : [];

  const memberIdsByGroup = memberRows.reduce((accumulator, row) => {
    if (!accumulator[row.group_chat_id]) {
      accumulator[row.group_chat_id] = [];
    }

    accumulator[row.group_chat_id].push(row.user_id);
    return accumulator;
  }, {});

  const messagesByGroup = messageRows.reduce((accumulator, row) => {
    if (!accumulator[row.group_chat_id]) {
      accumulator[row.group_chat_id] = [];
    }

    accumulator[row.group_chat_id].push(row);
    return accumulator;
  }, {});

  const clearedAtByGroup = mapClearRowsByConversation(clearRows, "group_chat_id");

  return groupRows
    .filter((row) => {
      const clearedAt = clearedAtByGroup[row.id] || 0;
      return !clearedAt || toTimestamp(row.last_message_at || row.updated_at) > clearedAt;
    })
    .map((row) => ({
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    memberIds: memberIdsByGroup[row.id] || [],
    lastUpdated: toTimestamp(row.last_message_at || row.updated_at),
    messages: mapMessages(messagesByGroup[row.id] || [], readRows),
  }));
};

const getChatStateForUser = async (userId, executor = query) => {
  await ensureConversationClearTables();
  const [directChats, groupChats] = await Promise.all([
    listDirectChatsForUser(userId, executor),
    listGroupChatsForUser(userId, executor),
  ]);

  return {
    directChats,
    groupChats,
  };
};

const findActiveUser = async (userId, executor = query) => {
  const rows = await runQuery(
    executor,
    `SELECT id, username, personality_type, assessment_completed
     FROM users
     WHERE id = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
};

const ensureDirectConversation = async (userId, peerId, executor = query) => {
  if (!peerId || peerId === userId) {
    throw createHttpError("Choose a valid match for direct chat.", 400);
  }

  const peer = await findActiveUser(peerId, executor);
  if (!peer) {
    throw createHttpError("That user is no longer available.", 404);
  }

  const participants = [userId, peerId].sort();
  const conversationKey = participants.join(":");
  const existingRows = await runQuery(
    executor,
    `SELECT id, conversation_key, user_one_id, user_two_id
     FROM direct_conversations
     WHERE conversation_key = ?
     LIMIT 1`,
    [conversationKey]
  );

  if (existingRows.length) {
    return existingRows[0];
  }

  const conversationId = crypto.randomUUID();
  await runQuery(
    executor,
    `INSERT INTO direct_conversations (
       id,
       conversation_key,
       user_one_id,
       user_two_id,
       status
     )
     VALUES (?, ?, ?, ?, 'active')`,
    [conversationId, conversationKey, participants[0], participants[1]]
  );

  return {
    id: conversationId,
    conversation_key: conversationKey,
    user_one_id: participants[0],
    user_two_id: participants[1],
  };
};

const ensureReplyTarget = async ({
  table,
  conversationColumn,
  conversationId,
  replyToMessageId,
  executor = query,
}) => {
  if (!replyToMessageId) {
    return null;
  }

  const rows = await runQuery(
    executor,
    `SELECT id
     FROM ${table}
     WHERE id = ?
       AND ${conversationColumn} = ?
       AND deleted_at IS NULL
     LIMIT 1`,
    [replyToMessageId, conversationId]
  );

  if (!rows.length) {
    throw createHttpError("The message you're replying to is no longer available.", 400);
  }

  return rows[0];
};

const sendDirectMessage = async (senderId, peerId, payload, executor = query) => {
  const clearTablesEnabled = await ensureConversationClearTables();
  const conversation = await ensureDirectConversation(senderId, peerId, executor);
  const { content, replyToMessageId, storedContent } = serializeStoredMessageContent(payload);
  const imageData = payload?.imageData || null;

  if (!content && !imageData) {
    throw createHttpError("Message content is required.", 400);
  }

  await ensureReplyTarget({
    table: "direct_messages",
    conversationColumn: "conversation_id",
    conversationId: conversation.id,
    replyToMessageId,
    executor,
  });

  const messageId = crypto.randomUUID();
  await runQuery(
    executor,
    `INSERT INTO direct_messages (
       id,
       conversation_id,
       sender_id,
       message_type,
       content,
       image_url
     )
     VALUES (?, ?, ?, ?, ?, ?)`,
    [messageId, conversation.id, senderId, imageData ? "image" : "text", storedContent, imageData]
  );
  await runQuery(
    executor,
    `INSERT IGNORE INTO direct_message_reads (message_id, user_id)
     VALUES (?, ?)`,
    [messageId, senderId]
  );
  await runQuery(
    executor,
    `UPDATE direct_conversations
     SET updated_at = CURRENT_TIMESTAMP,
         last_message_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [conversation.id]
  );

  if (clearTablesEnabled) {
    await runQuery(
      executor,
      `DELETE FROM direct_conversation_clears
       WHERE conversation_id = ?
         AND user_id IN (?, ?)`,
      [conversation.id, conversation.user_one_id, conversation.user_two_id]
    );
  }

  await markMatchMessaged(senderId, peerId, executor);
  return getChatStateForUser(senderId, executor);
};

const markDirectConversationRead = async (userId, peerId, executor = query) => {
  const participants = [userId, peerId].sort();
  const conversationKey = participants.join(":");
  const rows = await runQuery(
    executor,
    `SELECT id
     FROM direct_conversations
     WHERE conversation_key = ?
     LIMIT 1`,
    [conversationKey]
  );

  if (!rows.length) {
    return getChatStateForUser(userId, executor);
  }

  const unreadRows = await runQuery(
    executor,
    `SELECT dm.id
     FROM direct_messages dm
     LEFT JOIN direct_message_reads dmr
       ON dmr.message_id = dm.id
      AND dmr.user_id = ?
     WHERE dm.conversation_id = ?
       AND dm.deleted_at IS NULL
       AND dm.sender_id <> ?
       AND dmr.message_id IS NULL`,
    [userId, rows[0].id, userId]
  );

  if (unreadRows.length) {
    const values = unreadRows.map(() => "(?, ?)").join(", ");
    const params = unreadRows.flatMap((row) => [row.id, userId]);
    await runQuery(
      executor,
      `INSERT IGNORE INTO direct_message_reads (message_id, user_id)
       VALUES ${values}`,
      params
    );
  }

  return getChatStateForUser(userId, executor);
};

const createGroupChat = async (creatorUser, name, memberIds, executor = query) => {
  if (!canCreateGroupChats(creatorUser?.personalityType)) {
    throw createHttpError("Your personality profile does not allow group chats.", 403);
  }

  const trimmedName = (name || "").toString().trim();
  if (!trimmedName) {
    throw createHttpError("Group name is required.", 400);
  }

  const uniqueMemberIds = Array.from(new Set((Array.isArray(memberIds) ? memberIds : []).filter(Boolean)))
    .filter((memberId) => memberId !== creatorUser.id);

  if (uniqueMemberIds.length < 2) {
    throw createHttpError("Select at least two people to create a group.", 400);
  }

  const validMembers = await runQuery(
    executor,
    `SELECT id
     FROM users
     WHERE deleted_at IS NULL
       AND assessment_completed = 1
       AND id IN (${createInClause(uniqueMemberIds)})`,
    uniqueMemberIds
  );

  if (validMembers.length !== uniqueMemberIds.length) {
    throw createHttpError("One or more selected members are no longer available.", 400);
  }

  const groupId = crypto.randomUUID();
  await runQuery(
    executor,
    `INSERT INTO group_chats (
       id,
       name,
       created_by,
       last_message_at
     )
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [groupId, trimmedName, creatorUser.id]
  );

  const allMemberIds = [creatorUser.id, ...uniqueMemberIds];
  const memberValues = allMemberIds.map(() => "(?, ?, ?, 0)").join(", ");
  const memberParams = allMemberIds.flatMap((memberId) => [
    groupId,
    memberId,
    memberId === creatorUser.id ? "owner" : "member",
  ]);
  await runQuery(
    executor,
    `INSERT INTO group_chat_members (group_chat_id, user_id, role, is_muted)
     VALUES ${memberValues}`,
    memberParams
  );

  const messageId = crypto.randomUUID();
  await runQuery(
    executor,
    `INSERT INTO group_messages (
       id,
       group_chat_id,
       sender_id,
       message_type,
       content
     )
     VALUES (?, ?, ?, 'text', ?)`,
    [messageId, groupId, creatorUser.id, `Welcome to ${trimmedName}.`]
  );
  await runQuery(
    executor,
    `INSERT IGNORE INTO group_message_reads (message_id, user_id)
     VALUES (?, ?)`,
    [messageId, creatorUser.id]
  );

  return {
    chatState: await getChatStateForUser(creatorUser.id, executor),
    groupId,
  };
};

const sendGroupMessage = async (userId, groupId, payload, executor = query) => {
  const clearTablesEnabled = await ensureConversationClearTables();
  const membershipRows = await runQuery(
    executor,
    `SELECT group_chat_id
     FROM group_chat_members
     WHERE group_chat_id = ?
       AND user_id = ?
     LIMIT 1`,
    [groupId, userId]
  );

  if (!membershipRows.length) {
    throw createHttpError("You are not a member of that group chat.", 403);
  }

  const { content, replyToMessageId, storedContent } = serializeStoredMessageContent(payload);
  const imageData = payload?.imageData || null;

  if (!content && !imageData) {
    throw createHttpError("Message content is required.", 400);
  }

  await ensureReplyTarget({
    table: "group_messages",
    conversationColumn: "group_chat_id",
    conversationId: groupId,
    replyToMessageId,
    executor,
  });

  const messageId = crypto.randomUUID();
  await runQuery(
    executor,
    `INSERT INTO group_messages (
       id,
       group_chat_id,
       sender_id,
       message_type,
       content,
       image_url
     )
     VALUES (?, ?, ?, ?, ?, ?)`,
    [messageId, groupId, userId, imageData ? "image" : "text", storedContent, imageData]
  );
  await runQuery(
    executor,
    `INSERT IGNORE INTO group_message_reads (message_id, user_id)
     VALUES (?, ?)`,
    [messageId, userId]
  );
  await runQuery(
    executor,
    `UPDATE group_chats
     SET updated_at = CURRENT_TIMESTAMP,
         last_message_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [groupId]
  );

  const memberRows = await runQuery(
    executor,
    `SELECT user_id
     FROM group_chat_members
     WHERE group_chat_id = ?`,
    [groupId]
  );
  const memberIds = memberRows.map((row) => row.user_id);

  if (clearTablesEnabled && memberIds.length) {
    await runQuery(
      executor,
      `DELETE FROM group_chat_clears
       WHERE group_chat_id = ?
         AND user_id IN (${createInClause(memberIds)})`,
      [groupId, ...memberIds]
    );
  }

  return getChatStateForUser(userId, executor);
};

const markGroupChatRead = async (userId, groupId, executor = query) => {
  const membershipRows = await runQuery(
    executor,
    `SELECT group_chat_id
     FROM group_chat_members
     WHERE group_chat_id = ?
       AND user_id = ?
     LIMIT 1`,
    [groupId, userId]
  );

  if (!membershipRows.length) {
    throw createHttpError("You are not a member of that group chat.", 403);
  }

  const unreadRows = await runQuery(
    executor,
    `SELECT gm.id
     FROM group_messages gm
     LEFT JOIN group_message_reads gmr
       ON gmr.message_id = gm.id
      AND gmr.user_id = ?
     WHERE gm.group_chat_id = ?
       AND gm.deleted_at IS NULL
       AND gm.sender_id <> ?
       AND gmr.message_id IS NULL`,
    [userId, groupId, userId]
  );

  if (unreadRows.length) {
    const values = unreadRows.map(() => "(?, ?)").join(", ");
    const params = unreadRows.flatMap((row) => [row.id, userId]);
    await runQuery(
      executor,
      `INSERT IGNORE INTO group_message_reads (message_id, user_id)
       VALUES ${values}`,
      params
    );
  }

  return getChatStateForUser(userId, executor);
};

const deleteDirectConversationForUser = async (userId, peerId, executor = query) => {
  const clearTablesEnabled = await ensureConversationClearTables();
  if (!clearTablesEnabled) {
    throw createHttpError("Conversation delete is unavailable right now.", 503);
  }

  if (!peerId || peerId === userId) {
    throw createHttpError("Choose a valid match for direct chat.", 400);
  }

  const participants = [userId, peerId].sort();
  const conversationKey = participants.join(":");
  const rows = await runQuery(
    executor,
    `SELECT id
     FROM direct_conversations
     WHERE conversation_key = ?
     LIMIT 1`,
    [conversationKey]
  );

  if (!rows.length) {
    return getChatStateForUser(userId, executor);
  }

  await runQuery(
    executor,
    `INSERT INTO direct_conversation_clears (conversation_id, user_id, cleared_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE cleared_at = CURRENT_TIMESTAMP`,
    [rows[0].id, userId]
  );

  return getChatStateForUser(userId, executor);
};

const deleteGroupConversationForUser = async (userId, groupId, executor = query) => {
  const clearTablesEnabled = await ensureConversationClearTables();
  if (!clearTablesEnabled) {
    throw createHttpError("Conversation delete is unavailable right now.", 503);
  }

  const membershipRows = await runQuery(
    executor,
    `SELECT group_chat_id
     FROM group_chat_members
     WHERE group_chat_id = ?
       AND user_id = ?
     LIMIT 1`,
    [groupId, userId]
  );

  if (!membershipRows.length) {
    throw createHttpError("You are not a member of that group chat.", 403);
  }

  await runQuery(
    executor,
    `INSERT INTO group_chat_clears (group_chat_id, user_id, cleared_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE cleared_at = CURRENT_TIMESTAMP`,
    [groupId, userId]
  );

  return getChatStateForUser(userId, executor);
};

module.exports = {
  createGroupChat,
  deleteDirectConversationForUser,
  deleteGroupConversationForUser,
  getChatStateForUser,
  markDirectConversationRead,
  markGroupChatRead,
  sendDirectMessage,
  sendGroupMessage,
};
