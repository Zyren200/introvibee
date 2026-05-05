import {
  getStoredSessionToken,
  isRecoverableApiError,
  isRemoteAuthEnabled,
  requestIntroVibeApi,
} from "./introVibeApi";

export const DIRECT_CHAT_KEY = "introVibeDirectChats";
export const GROUP_CHAT_KEY = "introVibeGroupChats";

export const getDirectChatKey = (firstUserId, secondUserId) =>
  [firstUserId, secondUserId].sort().join(":");

export const loadLegacyDirectChats = () => {
  try {
    const raw = localStorage.getItem(DIRECT_CHAT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Failed to load direct chats", error);
    return {};
  }
};

export const loadLegacyGroupChats = () => {
  try {
    const raw = localStorage.getItem(GROUP_CHAT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to load group chats", error);
    return [];
  }
};

export const persistLegacyDirectChats = (value) => {
  try {
    localStorage.setItem(DIRECT_CHAT_KEY, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to save direct chats", error);
  }
};

export const persistLegacyGroupChats = (value) => {
  try {
    localStorage.setItem(GROUP_CHAT_KEY, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to save group chats", error);
  }
};

export const shouldUseRemoteChat = (authMode, currentUserId) =>
  Boolean(currentUserId) &&
  (authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken()));

export const shouldFallbackToLegacyChat = (error) =>
  isRemoteAuthEnabled() && isRecoverableApiError(error);

export const fetchRemoteChatState = async () => requestIntroVibeApi("/api/chat/state");

export const sendRemoteDirectMessage = async (peerId, payload) =>
  requestIntroVibeApi("/api/chat/direct", {
    method: "POST",
    body: JSON.stringify({
      action: "send",
      peerId,
      ...(typeof payload === "string" ? { text: payload } : payload),
    }),
  });

export const markRemoteDirectRead = async (peerId) =>
  requestIntroVibeApi("/api/chat/direct", {
    method: "POST",
    body: JSON.stringify({ action: "read", peerId }),
  });

export const deleteRemoteDirectConversation = async (peerId) =>
  requestIntroVibeApi("/api/chat/direct", {
    method: "POST",
    body: JSON.stringify({ action: "delete", peerId }),
  });

export const createRemoteGroup = async (name, memberIds) =>
  requestIntroVibeApi("/api/chat/groups", {
    method: "POST",
    body: JSON.stringify({ action: "create", name, memberIds }),
  });

export const sendRemoteGroupMessage = async (groupId, payload) =>
  requestIntroVibeApi("/api/chat/groups", {
    method: "POST",
    body: JSON.stringify({
      action: "send",
      groupId,
      ...(typeof payload === "string" ? { text: payload } : payload),
    }),
  });

export const markRemoteGroupRead = async (groupId) =>
  requestIntroVibeApi("/api/chat/groups", {
    method: "POST",
    body: JSON.stringify({ action: "read", groupId }),
  });

export const deleteRemoteGroupConversation = async (groupId) =>
  requestIntroVibeApi("/api/chat/groups", {
    method: "POST",
    body: JSON.stringify({ action: "delete", groupId }),
  });
