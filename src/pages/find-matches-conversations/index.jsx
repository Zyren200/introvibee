import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/ui/Header";
import NavigationBreadcrumb from "../../components/ui/NavigationBreadcrumb";
import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";
import MatchCard from "./components/MatchCard";
import ConversationThread from "./components/ConversationThread";
import MessageComposer from "./components/MessageComposer";
import MessageBubble from "./components/MessageBubble";
import EmptyState from "./components/EmptyState";
import { useIntroVibeAuth } from "../../introVibeAuth";
import {
  createRemoteGroup,
  deleteRemoteDirectConversation,
  deleteRemoteGroupConversation,
  fetchRemoteChatState,
  getDirectChatKey,
  loadLegacyDirectChats,
  loadLegacyGroupChats,
  markRemoteDirectRead,
  markRemoteGroupRead,
  persistLegacyDirectChats,
  persistLegacyGroupChats,
  sendRemoteDirectMessage,
  sendRemoteGroupMessage,
  shouldFallbackToLegacyChat,
  shouldUseRemoteChat,
} from "../../lib/introVibeChat";
import {
  fetchRemoteMatches,
  shouldFallbackToLegacyMatches,
  shouldUseRemoteMatches,
} from "../../lib/introVibeMatches";
import {
  PERSONALITY_META,
  buildMatchSummary,
  canCreateGroupChats,
} from "../../utils/introVibe";

const defaultAvatar = (seed) =>
  `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed || "introvibe")}`;

const NO_MATCH_STATUS_MESSAGE =
  "Can't find a match right now. IntroVibe only shows people with the same personality type and shared interests.";
const REMOTE_CHAT_REFRESH_MS = 5000;
const MESSAGE_PREVIEW_MAX_LENGTH = 90;

const getMessagePreviewText = (message) => {
  const content = (message?.content || "").trim();
  if (content) {
    return content.length > MESSAGE_PREVIEW_MAX_LENGTH
      ? `${content.slice(0, MESSAGE_PREVIEW_MAX_LENGTH).trimEnd()}...`
      : content;
  }

  if (message?.imageData) {
    return "Photo attachment";
  }

  return "Original message unavailable";
};

const formatSyncTime = (timestamp) => {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getConversationClearTimestamp = (conversation, userId) => {
  if (!conversation || !userId) {
    return 0;
  }

  const rawValue = conversation?.clearedAtBy?.[userId];
  return typeof rawValue === "number" ? rawValue : Number(rawValue) || 0;
};

const isConversationHiddenForUser = (conversation, userId) => {
  const clearedAt = getConversationClearTimestamp(conversation, userId);
  if (!clearedAt) {
    return false;
  }

  const lastUpdated = Number(conversation?.lastUpdated || 0);
  return !lastUpdated || clearedAt >= lastUpdated;
};

const restoreConversationVisibility = (clearedAtBy, userIds = []) => {
  const nextValue = { ...(clearedAtBy || {}) };

  userIds.filter(Boolean).forEach((userId) => {
    delete nextValue[userId];
  });

  return nextValue;
};

const FindMatchesConversations = () => {
  const {
    currentUser,
    users,
    isUserOnline,
    authMode,
    authReady,
    isRefreshingUsers,
    lastUsersSyncAt,
    refreshUsers,
  } = useIntroVibeAuth();
  const [activeTab, setActiveTab] = useState("matches");
  const [selectedChat, setSelectedChat] = useState(null);
  const [conversationQuery, setConversationQuery] = useState("");
  const [matchQuery, setMatchQuery] = useState("");
  const [directChats, setDirectChats] = useState(loadLegacyDirectChats);
  const [groupChats, setGroupChats] = useState(loadLegacyGroupChats);
  const [statusMessage, setStatusMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [chatMode, setChatMode] = useState('legacy-local');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isRefreshingChats, setIsRefreshingChats] = useState(false);
  const [remoteMatchResults, setRemoteMatchResults] = useState([]);
  const [matchesMode, setMatchesMode] = useState("legacy-local");
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [lastMatchesSyncAt, setLastMatchesSyncAt] = useState(null);
  const [replyTargetId, setReplyTargetId] = useState(null);
  const [isGroupComposerOpen, setIsGroupComposerOpen] = useState(false);
  const [groupMemberQuery, setGroupMemberQuery] = useState("");
  const [conversationPendingDelete, setConversationPendingDelete] = useState(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);

  const personalityType = currentUser?.personalityType;
  const personalityMeta = PERSONALITY_META[personalityType];
  const groupChatEnabled = canCreateGroupChats(personalityType);

  const buildLocalMatches = (userCollection = users) =>
    userCollection
      .filter((user) => user.id !== currentUser?.id && user.assessmentCompleted)
      .map((peer) => {
        const match = buildMatchSummary(currentUser, peer);
        return toDisplayMatch({
          id: peer.id,
          username: peer.username,
          personalityType: peer.personalityType,
          compatibilityScore: match.compatibilityScore,
          sharedInterests: match.sharedInterests,
          personalityTags: match.personalityTags,
          samePersonality: match.samePersonality,
          presence: peer.presence,
        });
      })
      .filter((match) => match.samePersonality && match.sharedInterests.length > 0)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  useEffect(() => {
    if (chatMode !== 'legacy-local') return;
    persistLegacyDirectChats(directChats);
  }, [chatMode, directChats]);

  useEffect(() => {
    if (chatMode !== 'legacy-local') return;
    persistLegacyGroupChats(groupChats);
  }, [chatMode, groupChats]);

  useEffect(() => {
    if (!authReady) {
      return undefined;
    }

    let cancelled = false;

    const hydrateChatState = async () => {
      setIsLoadingChats(true);
      setStatusMessage('');

      if (shouldUseRemoteChat(authMode, currentUser?.id)) {
        try {
          const payload = await fetchRemoteChatState();
          if (cancelled) return;

          setDirectChats(payload?.directChats || {});
          setGroupChats(payload?.groupChats || []);
          setChatMode('railway-api');
          setIsLoadingChats(false);
          return;
        } catch (error) {
          if (!shouldFallbackToLegacyChat(error)) {
            if (!cancelled) {
              setStatusMessage(error.message || 'Unable to load your chat history right now.');
              setChatMode('railway-api');
              setIsLoadingChats(false);
            }
            return;
          }
        }
      }

      if (!cancelled) {
        setDirectChats(loadLegacyDirectChats());
        setGroupChats(loadLegacyGroupChats());
        setChatMode('legacy-local');
        setIsLoadingChats(false);
      }
    };

    hydrateChatState();

    return () => {
      cancelled = true;
    };
  }, [authMode, authReady, currentUser?.id]);

  const applyRemoteMatches = (payload) => {
    setRemoteMatchResults(Array.isArray(payload?.matches) ? payload.matches : []);
    setMatchesMode("railway-api");
    setLastMatchesSyncAt(payload?.generatedAt || Date.now());
  };

  useEffect(() => {
    if (!authReady) {
      return undefined;
    }

    let cancelled = false;

    const hydrateMatchState = async () => {
      setIsLoadingMatches(true);

      if (shouldUseRemoteMatches(authMode, currentUser?.id)) {
        try {
          const [payload] = await Promise.all([
            fetchRemoteMatches(),
            refreshUsers({ silent: true }),
          ]);

          if (cancelled) return;

          applyRemoteMatches(payload);
          setIsLoadingMatches(false);
          return;
        } catch (error) {
          if (!shouldFallbackToLegacyMatches(error)) {
            if (!cancelled) {
              setStatusMessage(error.message || "Unable to load matches right now.");
              setMatchesMode("railway-api");
              setIsLoadingMatches(false);
            }
            return;
          }
        }
      }

      if (!cancelled) {
        setRemoteMatchResults([]);
        setMatchesMode("legacy-local");
        setLastMatchesSyncAt(lastUsersSyncAt || Date.now());
        setIsLoadingMatches(false);
      }
    };

    hydrateMatchState();

    return () => {
      cancelled = true;
    };
  }, [authMode, authReady, currentUser?.id, lastUsersSyncAt]);

  const toDisplayMatch = (match) => {
    const username = match?.name || match?.username || "IntroVibe user";
    const peerFromUsers = users.find((user) => user.id === match?.id) || null;
    const resolvedPersonalityType =
      match?.personalityType || peerFromUsers?.personalityType || "Ambivert";
    const onlinePeer = peerFromUsers || { presence: match?.presence };

    return {
      id: match?.id,
      name: username,
      avatar: defaultAvatar(username),
      avatarAlt: `${username} avatar`,
      isOnline: isUserOnline(onlinePeer),
      major: resolvedPersonalityType,
      year: PERSONALITY_META[resolvedPersonalityType]?.chatLabel || "Chat access",
      personalityType: resolvedPersonalityType,
      compatibilityScore: Number(match?.compatibilityScore) || 0,
      sharedInterests: Array.isArray(match?.sharedInterests) ? match.sharedInterests : [],
      personalityTags: Array.isArray(match?.personalityTags) ? match.personalityTags : [],
      bio: PERSONALITY_META[resolvedPersonalityType]?.description || "",
      samePersonality: Boolean(match?.samePersonality),
      status: match?.status || "suggested",
    };
  };
  const peers = useMemo(
    () => users.filter((user) => user.id !== currentUser?.id && user.assessmentCompleted),
    [users, currentUser]
  );

  const localMatchResults = useMemo(
    () => buildLocalMatches(users),
    [currentUser, users, isUserOnline]
  );

  const remoteDisplayMatches = useMemo(
    () => remoteMatchResults.map((match) => toDisplayMatch(match)),
    [remoteMatchResults, users, isUserOnline]
  );

  const matchResults = useMemo(
    () => (matchesMode === "railway-api" ? remoteDisplayMatches : localMatchResults),
    [localMatchResults, matchesMode, remoteDisplayMatches]
  );
  const availableGroupMembers = useMemo(
    () => matchResults.filter((match) => match.id !== currentUser?.id),
    [matchResults, currentUser]
  );

  const directThreads = useMemo(
    () =>
      peers
        .map((peer) => {
          const key = getDirectChatKey(currentUser?.id, peer.id);
          const conversation = directChats[key];
          const messages = conversation?.messages || [];

          if (
            messages.length === 0 ||
            isConversationHiddenForUser(conversation, currentUser?.id)
          ) {
            return null;
          }

          const lastMessage = messages[messages.length - 1];
          const unreadCount = messages.filter(
            (message) =>
              message.senderId !== currentUser?.id &&
              !(message.readBy || []).includes(currentUser?.id)
          ).length;

          return {
            id: peer.id,
            name: peer.username,
            avatar: defaultAvatar(peer.username),
            avatarAlt: `${peer.username} avatar`,
            lastMessage: lastMessage?.content || "Attachment",
            lastMessageTime: lastMessage?.timestamp || conversation?.lastUpdated,
            unreadCount,
            isOnline: isUserOnline(peer),
            messageCount: messages.length,
            hasPrompt: false,
            isDraft: false,
            status: "direct",
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)),
    [peers, directChats, currentUser, isUserOnline]
  );

  const joinedGroups = useMemo(
    () => groupChats.filter((group) => (group?.memberIds || []).includes(currentUser?.id)),
    [groupChats, currentUser]
  );

  const groupThreads = useMemo(
    () =>
      joinedGroups
        .map((group) => {
          if (isConversationHiddenForUser(group, currentUser?.id)) {
            return null;
          }

          const messages = group?.messages || [];
          const lastMessage = messages[messages.length - 1];
          const unreadCount = messages.filter(
            (message) =>
              message.senderId !== currentUser?.id &&
              !(message.readBy || []).includes(currentUser?.id)
          ).length;

          return {
            id: group.id,
            name: `# ${group.name}`,
            avatar: defaultAvatar(group.name),
            avatarAlt: `${group.name} group avatar`,
            lastMessage: lastMessage?.content || "Group created",
            lastMessageTime: lastMessage?.timestamp || group?.lastUpdated,
            unreadCount,
            isOnline: false,
            messageCount: messages.length,
            hasPrompt: false,
            isDraft: false,
            status: "group",
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)),
    [joinedGroups, currentUser]
  );

  const selectedMatchPeer =
    selectedChat?.type === "direct"
      ? matchResults.find((match) => match.id === selectedChat.id) || null
      : null;

  const selectedDirectPeer =
    selectedChat?.type === "direct"
      ? peers.find((peer) => peer.id === selectedChat.id) ||
        (selectedMatchPeer
          ? {
              id: selectedMatchPeer.id,
              username: selectedMatchPeer.name,
              personalityType: selectedMatchPeer.personalityType,
            }
          : null)
      : null;
  const selectedGroup =
    selectedChat?.type === "group"
      ? joinedGroups.find((group) => group.id === selectedChat.id) || null
      : null;

  const selectedMessages = useMemo(() => {
    if (selectedChat?.type === "direct" && selectedDirectPeer) {
      const key = getDirectChatKey(currentUser?.id, selectedDirectPeer.id);
      return directChats[key]?.messages || [];
    }

    if (selectedChat?.type === "group" && selectedGroup) {
      return selectedGroup?.messages || [];
    }

    return [];
  }, [selectedChat, selectedDirectPeer, selectedGroup, currentUser, directChats]);

  const findUserById = (userId) => users.find((user) => user.id === userId) || null;

  const getMessageAuthorLabel = (message) => {
    if (!message) {
      return "Original message";
    }

    if (message.senderId === currentUser?.id) {
      return "You";
    }

    const sender = findUserById(message.senderId);
    if (sender?.username) {
      return sender.username;
    }

    if (selectedChat?.type === "direct") {
      return selectedDirectPeer?.username || "Match";
    }

    return "Group member";
  };

  const selectedMessagesLookup = useMemo(
    () => Object.fromEntries(selectedMessages.map((message) => [message.id, message])),
    [selectedMessages]
  );

  const replyTarget = useMemo(
    () => selectedMessagesLookup[replyTargetId] || null,
    [replyTargetId, selectedMessagesLookup]
  );

  const selectedMessagesWithContext = useMemo(
    () =>
      selectedMessages.map((message) => {
        const sender = findUserById(message.senderId) || selectedDirectPeer;
        const referencedMessage = message?.replyToMessageId
          ? selectedMessagesLookup[message.replyToMessageId] || null
          : null;

        return {
          ...message,
          senderName:
            selectedChat?.type === "group" && message.senderId !== currentUser?.id
              ? sender?.username
              : null,
          avatar: defaultAvatar(sender?.username || selectedGroup?.name),
          avatarAlt: `${sender?.username || selectedGroup?.name} avatar`,
          isRead: false,
          replyToMessage: message?.replyToMessageId
            ? {
                id: message.replyToMessageId,
                senderName: getMessageAuthorLabel(referencedMessage),
                preview: getMessagePreviewText(referencedMessage),
                isMissing: !referencedMessage,
              }
            : null,
        };
      }),
    [
      currentUser,
      selectedChat,
      selectedDirectPeer,
      selectedGroup,
      selectedMessages,
      selectedMessagesLookup,
      users,
    ]
  );

  useEffect(() => {
    setReplyTargetId(null);
  }, [selectedChat?.id, selectedChat?.type]);

  useEffect(() => {
    if (replyTargetId && !selectedMessagesLookup[replyTargetId]) {
      setReplyTargetId(null);
    }
  }, [replyTargetId, selectedMessagesLookup]);

  useEffect(() => {
    if (!isGroupComposerOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeGroupComposer();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGroupComposerOpen]);

  const applyRemoteChatState = (payload) => {
    setDirectChats(payload?.directChats || {});
    setGroupChats(payload?.groupChats || []);
    setChatMode('railway-api');
  };

  const upsertLegacyDirectChat = (peerId, updater) => {
    setDirectChats((prev) => {
      const key = getDirectChatKey(currentUser?.id, peerId);
      const existing = prev[key] || { participants: [currentUser?.id, peerId], messages: [] };
      return {
        ...prev,
        [key]: updater(existing),
      };
    });
  };

  const addLegacyDirectMessage = (peerId, payload) => {
    const message = typeof payload === 'string' ? { text: payload } : payload;

    upsertLegacyDirectChat(peerId, (existing) => ({
      ...existing,
      participants: existing.participants || [currentUser?.id, peerId],
      clearedAtBy: restoreConversationVisibility(
        existing.clearedAtBy,
        existing.participants || [currentUser?.id, peerId]
      ),
      lastUpdated: Date.now(),
      messages: [
        ...(existing.messages || []),
        {
          id: crypto.randomUUID(),
          senderId: currentUser?.id,
          content: message?.text || '',
          imageData: message?.imageData || null,
          replyToMessageId: message?.replyToMessageId || null,
          timestamp: Date.now(),
          readBy: [currentUser?.id],
        },
      ],
    }));
  };

  const addLegacyGroupMessage = (groupId, payload) => {
    const message = typeof payload === 'string' ? { text: payload } : payload;

    setGroupChats((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              clearedAtBy: restoreConversationVisibility(
                group.clearedAtBy,
                group.memberIds || []
              ),
              lastUpdated: Date.now(),
              messages: [
                ...(group.messages || []),
                {
                  id: crypto.randomUUID(),
                  senderId: currentUser?.id,
                  content: message?.text || '',
                  imageData: message?.imageData || null,
                  replyToMessageId: message?.replyToMessageId || null,
                  timestamp: Date.now(),
                  readBy: [currentUser?.id],
                },
              ],
            }
          : group
      )
    );
  };

  const clearLegacyDirectConversation = (peerId) => {
    const key = getDirectChatKey(currentUser?.id, peerId);

    setDirectChats((prev) => {
      const existing = prev[key];
      if (!existing) {
        return prev;
      }

      return {
        ...prev,
        [key]: {
          ...existing,
          clearedAtBy: {
            ...(existing.clearedAtBy || {}),
            [currentUser?.id]: Date.now(),
          },
        },
      };
    });
  };

  const clearLegacyGroupConversation = (groupId) => {
    setGroupChats((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              clearedAtBy: {
                ...(group.clearedAtBy || {}),
                [currentUser?.id]: Date.now(),
              },
            }
          : group
      )
    );
  };

  const markLegacyDirectRead = (peerId) => {
    upsertLegacyDirectChat(peerId, (existing) => ({
      ...existing,
      messages: (existing.messages || []).map((message) =>
        (message.readBy || []).includes(currentUser?.id)
          ? message
          : { ...message, readBy: [...(message.readBy || []), currentUser?.id] }
      ),
    }));
  };

  const markLegacyGroupRead = (groupId) => {
    setGroupChats((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              messages: (group.messages || []).map((message) =>
                (message.readBy || []).includes(currentUser?.id)
                  ? message
                  : { ...message, readBy: [...(message.readBy || []), currentUser?.id] }
              ),
            }
          : group
      )
    );
  };

  const fallbackToLegacyChat = () => {
    setChatMode('legacy-local');
    setStatusMessage('Switched to local chat fallback while the API is unavailable.');
  };

  const handleRefreshChats = async ({ silent = false } = {}) => {
    if (!shouldUseRemoteChat(authMode, currentUser?.id)) {
      return { success: false, mode: chatMode };
    }

    if (!silent) {
      setIsRefreshingChats(true);
    }

    try {
      const payload = await fetchRemoteChatState();
      applyRemoteChatState(payload);
      return { success: true, mode: 'railway-api' };
    } catch (error) {
      if (!shouldFallbackToLegacyChat(error)) {
        if (!silent) {
          setStatusMessage(error.message || 'Unable to refresh your chats right now.');
        }

        return { success: false, error: error.message };
      }

      fallbackToLegacyChat();
      return { success: false, fallback: true };
    } finally {
      if (!silent) {
        setIsRefreshingChats(false);
      }
    }
  };

  useEffect(() => {
    if (!authReady || !shouldUseRemoteChat(authMode, currentUser?.id)) {
      return undefined;
    }

    let cancelled = false;

    const syncChats = async () => {
      try {
        const payload = await fetchRemoteChatState();
        if (cancelled) return;
        applyRemoteChatState(payload);
      } catch (error) {
        if (cancelled) return;
        if (shouldFallbackToLegacyChat(error)) {
          fallbackToLegacyChat();
        }
      }
    };

    void syncChats();

    const interval = setInterval(() => {
      void syncChats();
    }, REMOTE_CHAT_REFRESH_MS);

    const handleFocus = () => {
      void syncChats();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncChats();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authMode, authReady, currentUser?.id]);

  const handleStartDirectChat = async (peerId) => {
    setActiveTab('messages');
    setSelectedChat({ type: 'direct', id: peerId });
    setStatusMessage('');

    const key = getDirectChatKey(currentUser?.id, peerId);

    if (chatMode === 'railway-api') {
      try {
        let payload = await markRemoteDirectRead(peerId);
        applyRemoteChatState(payload);

        const remoteMessages = payload?.directChats?.[key]?.messages || [];
        if (!remoteMessages.length) {
          payload = await sendRemoteDirectMessage(peerId, 'Hey, I saw we matched on IntroVibe.');
          applyRemoteChatState(payload);
        }
        return;
      } catch (error) {
        if (!shouldFallbackToLegacyChat(error)) {
          setStatusMessage(error.message || 'Unable to start this chat right now.');
          return;
        }

        fallbackToLegacyChat();
      }
    }

    markLegacyDirectRead(peerId);
    if (!(directChats[key]?.messages || []).length) {
      addLegacyDirectMessage(peerId, 'Hey, I saw we matched on IntroVibe.');
    }
  };

  const handleSelectDirectThread = async (peerId) => {
    setActiveTab('messages');
    setSelectedChat({ type: 'direct', id: peerId });
    setStatusMessage('');

    if (chatMode === 'railway-api') {
      try {
        const payload = await markRemoteDirectRead(peerId);
        applyRemoteChatState(payload);
        return;
      } catch (error) {
        if (!shouldFallbackToLegacyChat(error)) {
          setStatusMessage(error.message || 'Unable to open this conversation right now.');
          return;
        }

        fallbackToLegacyChat();
      }
    }

    markLegacyDirectRead(peerId);
  };

  const handleSelectGroupThread = async (groupId) => {
    setActiveTab('messages');
    setSelectedChat({ type: 'group', id: groupId });
    setStatusMessage('');

    if (chatMode === 'railway-api') {
      try {
        const payload = await markRemoteGroupRead(groupId);
        applyRemoteChatState(payload);
        return;
      } catch (error) {
        if (!shouldFallbackToLegacyChat(error)) {
          setStatusMessage(error.message || 'Unable to open this group right now.');
          return;
        }

        fallbackToLegacyChat();
      }
    }

    markLegacyGroupRead(groupId);
  };

  const handleSendMessage = async (payload) => {
    if (!selectedChat) return;
    setStatusMessage('');
    const nextPayload = replyTargetId
      ? { ...payload, replyToMessageId: replyTargetId }
      : payload;

    if (chatMode === 'railway-api') {
      try {
        const nextState = selectedChat.type === 'direct'
          ? await sendRemoteDirectMessage(selectedChat.id, nextPayload)
          : await sendRemoteGroupMessage(selectedChat.id, nextPayload);
        applyRemoteChatState(nextState);
        setReplyTargetId(null);
        return;
      } catch (error) {
        if (!shouldFallbackToLegacyChat(error)) {
          setStatusMessage(error.message || 'Unable to send your message right now.');
          return;
        }

        fallbackToLegacyChat();
      }
    }

    if (selectedChat.type === 'direct') {
      addLegacyDirectMessage(selectedChat.id, nextPayload);
      setReplyTargetId(null);
      return;
    }

    addLegacyGroupMessage(selectedChat.id, nextPayload);
    setReplyTargetId(null);
  };

  const handleCreateGroup = async () => {
    if (!groupChatEnabled) return;

    if (availableGroupMembers.length < 2) {
      setActiveTab('matches');
      setStatusMessage("Can't create a group yet because you need at least two matched users.");
      return;
    }

    const trimmedGroupName = groupName.trim();
    if (!trimmedGroupName) {
      setStatusMessage('Add a group name first.');
      return;
    }

    if (selectedGroupMembers.length < 2) {
      setStatusMessage('Select at least two people to create a group.');
      return;
    }

    if (chatMode === 'railway-api') {
      try {
        const payload = await createRemoteGroup(trimmedGroupName, selectedGroupMembers);
        applyRemoteChatState(payload);
        setGroupName('');
        setSelectedGroupMembers([]);
        setGroupMemberQuery("");
        setIsGroupComposerOpen(false);
        setStatusMessage('Group chat created.');
        setSelectedChat({ type: 'group', id: payload?.groupId });
        setActiveTab('messages');
        return;
      } catch (error) {
        if (!shouldFallbackToLegacyChat(error)) {
          setStatusMessage(error.message || 'Unable to create that group right now.');
          return;
        }

        fallbackToLegacyChat();
      }
    }

    const newGroup = {
      id: crypto.randomUUID(),
      name: trimmedGroupName,
      createdBy: currentUser?.id,
      memberIds: [currentUser?.id, ...selectedGroupMembers],
      lastUpdated: Date.now(),
      messages: [
        {
          id: crypto.randomUUID(),
          senderId: currentUser?.id,
          content: `Welcome to ${trimmedGroupName}.`,
          imageData: null,
          timestamp: Date.now(),
          readBy: [currentUser?.id],
        },
      ],
    };

    setGroupChats((prev) => [newGroup, ...prev]);
    setGroupName('');
    setSelectedGroupMembers([]);
    setGroupMemberQuery("");
    setIsGroupComposerOpen(false);
    setStatusMessage('Group chat created.');
    setSelectedChat({ type: 'group', id: newGroup.id });
    setActiveTab('messages');
  };

  const toggleGroupMember = (memberId) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((entry) => entry !== memberId)
        : [...prev, memberId]
    );
  };

  const openGroupComposer = () => {
    setIsGroupComposerOpen(true);
  };

  const closeGroupComposer = () => {
    setIsGroupComposerOpen(false);
    setGroupMemberQuery("");
  };

  const handleRefreshMatches = async ({
    showSuccessMessage = true,
    showNoMatchMessage = true,
  } = {}) => {
    setStatusMessage("");

    if (shouldUseRemoteMatches(authMode, currentUser?.id)) {
      setIsLoadingMatches(true);

      try {
        const [payload] = await Promise.all([
          fetchRemoteMatches(),
          refreshUsers({ silent: true }),
        ]);

        applyRemoteMatches(payload);
        if (!payload?.matches?.length && showNoMatchMessage) {
          setStatusMessage(NO_MATCH_STATUS_MESSAGE);
        } else if (showSuccessMessage) {
          setStatusMessage("Matches refreshed.");
        }
        return;
      } catch (error) {
        if (!shouldFallbackToLegacyMatches(error)) {
          setStatusMessage(error.message || "Unable to refresh matches right now.");
          return;
        }

        setRemoteMatchResults([]);
        setMatchesMode("legacy-local");
        setStatusMessage("Live sync is unavailable right now.");
        return;
      } finally {
        setIsLoadingMatches(false);
      }
    }

    const result = await refreshUsers();
    if (result?.success) {
      setLastMatchesSyncAt(Date.now());
      const nextMatches = buildLocalMatches(result?.users || users);
      if (!nextMatches.length && showNoMatchMessage) {
        setStatusMessage(NO_MATCH_STATUS_MESSAGE);
      } else if (showSuccessMessage) {
        setStatusMessage("Matches refreshed.");
      }
      return;
    }

    if (result?.fallback) {
      setStatusMessage("Live sync is unavailable right now.");
      return;
    }

    if (result?.error) {
      setStatusMessage(result.error);
    }
  };

  const handleFindMatchesAction = async () => {
    setActiveTab("matches");

    if (matchResults.length > 0) {
      setStatusMessage("Choose a match to start chatting.");
      return;
    }

    await handleRefreshMatches({
      showSuccessMessage: false,
      showNoMatchMessage: true,
    });
  };

  const handleSendFirstMessage = async () => {
    if (directThreads.length > 0) {
      await handleSelectDirectThread(directThreads[0].id);
      return;
    }

    if (matchResults.length > 0) {
      await handleStartDirectChat(matchResults[0].id);
      return;
    }

    setActiveTab("matches");
    await handleRefreshMatches({
      showSuccessMessage: false,
      showNoMatchMessage: true,
    });
  };

  const handleSelectInboxThread = async (thread) => {
    if (!thread) return;

    if (thread.status === "group") {
      await handleSelectGroupThread(thread.id);
      return;
    }

    await handleSelectDirectThread(thread.id);
  };

  const openDeleteConversationDialog = (conversation) => {
    if (!conversation?.id) {
      return;
    }

    const conversationType = conversation?.type || conversation?.status;
    const resolvedName =
      conversationType === "group"
        ? (conversation?.name || selectedGroup?.name || "this group").replace(/^#\s*/, "")
        : conversation?.name || selectedDirectPeer?.username || "this conversation";

    setConversationPendingDelete({
      id: conversation.id,
      type: conversationType,
      name: resolvedName,
    });
  };

  const closeDeleteConversationDialog = () => {
    if (isDeletingConversation) {
      return;
    }

    setConversationPendingDelete(null);
  };

  const handleDeleteConversation = async () => {
    if (!conversationPendingDelete) {
      return;
    }

    const targetConversation = conversationPendingDelete;
    setIsDeletingConversation(true);
    setStatusMessage("");

    try {
      if (chatMode === "railway-api") {
        const payload = targetConversation.type === "direct"
          ? await deleteRemoteDirectConversation(targetConversation.id)
          : await deleteRemoteGroupConversation(targetConversation.id);

        applyRemoteChatState(payload);
      } else if (targetConversation.type === "direct") {
        clearLegacyDirectConversation(targetConversation.id);
      } else {
        clearLegacyGroupConversation(targetConversation.id);
      }

      if (
        selectedChat?.type === targetConversation.type &&
        selectedChat?.id === targetConversation.id
      ) {
        setSelectedChat(null);
      }

      setReplyTargetId(null);
      setConversationPendingDelete(null);
      setStatusMessage(
        targetConversation.type === "group"
          ? `Removed # ${targetConversation.name} from your inbox.`
          : `Removed ${targetConversation.name} from your inbox.`
      );
    } catch (error) {
      if (shouldFallbackToLegacyChat(error)) {
        fallbackToLegacyChat();
        setConversationPendingDelete(null);
        return;
      }

      setStatusMessage(error.message || "Unable to delete this conversation right now.");
    } finally {
      setIsDeletingConversation(false);
    }
  };

  const inboxThreads = useMemo(
    () => [...directThreads, ...groupThreads].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)),
    [directThreads, groupThreads]
  );

  const filteredInboxThreads = useMemo(() => {
    const query = conversationQuery.trim().toLowerCase();
    if (!query) return inboxThreads;

    return inboxThreads.filter((thread) => {
      const name = (thread?.name || "").toLowerCase();
      const lastMessage = (thread?.lastMessage || "").toLowerCase();
      return name.includes(query) || lastMessage.includes(query);
    });
  }, [conversationQuery, inboxThreads]);

  const filteredMatchResults = useMemo(() => {
    const query = matchQuery.trim().toLowerCase();
    if (!query) return matchResults;

    return matchResults.filter((match) => {
      const name = (match?.name || "").toLowerCase();
      const interests = Array.isArray(match?.sharedInterests)
        ? match.sharedInterests.some((interest) => (interest || "").toLowerCase().includes(query))
        : false;
      return name.includes(query) || interests;
    });
  }, [matchQuery, matchResults]);

  const filteredAvailableGroupMembers = useMemo(() => {
    const query = groupMemberQuery.trim().toLowerCase();
    if (!query) return availableGroupMembers;

    return availableGroupMembers.filter((member) => {
      const name = (member?.name || "").toLowerCase();
      const personality = (member?.personalityType || "").toLowerCase();
      return name.includes(query) || personality.includes(query);
    });
  }, [availableGroupMembers, groupMemberQuery]);

  const latestSyncAt = lastMatchesSyncAt || lastUsersSyncAt;
  const syncLabel = latestSyncAt
    ? `Last synced ${formatSyncTime(latestSyncAt)}`
    : matchesMode === "railway-api" || authMode === "railway-api"
      ? "Auto-refresh is on"
      : "Refresh to pull the latest matches";
  const totalThreadCount = inboxThreads.length;
  const selectedChatName = selectedChat?.type === "direct"
    ? selectedDirectPeer?.username
    : selectedGroup?.name;
  const selectedChatSubtitle = selectedChat?.type === "direct"
    ? selectedDirectPeer?.personalityType
    : `${selectedGroup?.memberIds?.length || 0} members`;
  const selectedChatAvatar = defaultAvatar(selectedChatName || "introvibe-chat");
  const selectedChatOnline = selectedChat?.type === "direct" && selectedDirectPeer
    ? isUserOnline(selectedDirectPeer)
    : false;
  const suggestedStarter = filteredMatchResults[0] || matchResults[0] || null;
  const chatSyncLabel = chatMode === "railway-api" ? "Live chat sync is on" : "Local chat fallback is active";
  const showMobileInbox = activeTab === "messages" && !selectedChat;
  const showMobileConversation = activeTab === "messages" && Boolean(selectedChat);
  const showMobileMatches = activeTab === "matches";
  const showCompactMessageLayout = activeTab === "messages";
  const composerReplyTarget = replyTarget
    ? {
        senderName: getMessageAuthorLabel(replyTarget),
        preview: getMessagePreviewText(replyTarget),
      }
    : null;
  const selectedConversationDeleteTarget = selectedChat
    ? {
        id: selectedChat.id,
        type: selectedChat.type,
        name: selectedChatName || "this conversation",
      }
    : null;
  const selectedGroupMemberLabels = selectedGroupMembers
    .map((memberId) => {
      const member = availableGroupMembers.find((entry) => entry.id === memberId);
      return member ? { id: member.id, name: member.name } : null;
    })
    .filter(Boolean);
  const featuredMatch = filteredMatchResults[0] || matchResults[0] || null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent_30%),linear-gradient(180deg,var(--color-background),color-mix(in_oklab,var(--color-background)_88%,var(--color-secondary)_12%))]">
      <Header />
      <div className={showCompactMessageLayout ? "hidden xl:block" : ""}>
        <NavigationBreadcrumb />
      </div>
      <main className="mx-auto max-w-[1560px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <section className={`mb-6 rounded-[2rem] border border-border/70 bg-card/90 p-5 shadow-gentle-sm backdrop-blur md:p-6 ${showCompactMessageLayout ? "hidden xl:block" : ""}`}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Icon name="MessagesSquare" size={16} color="var(--color-primary)" />
                <span>{personalityType} mode</span>
              </div>
              <h1 className="font-heading text-3xl font-semibold text-foreground md:text-4xl">
                Matches & Chat
              </h1>
              <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
                IntroVibe matches you by personality plus shared interests. Your profile currently supports {personalityMeta?.chatLabel}.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[460px]">
              <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 shadow-gentle-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Matches</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{matchResults.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">{syncLabel}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 shadow-gentle-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Inbox</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{totalThreadCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">{chatSyncLabel}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 shadow-gentle-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Group chat</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {groupChatEnabled ? "Available for your vibe" : "Locked to 1-on-1"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {groupChatEnabled ? "Create shared threads from your matches." : "Introverts stay in direct conversations only."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {statusMessage && (
          <div className={`mb-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 ${showCompactMessageLayout ? "hidden xl:block" : ""}`}>
            <p className="text-sm text-foreground">{statusMessage}</p>
          </div>
        )}

        <div className={`mb-4 xl:hidden ${showCompactMessageLayout ? "hidden" : ""}`}>
          <div className="flex gap-2 rounded-full border border-border bg-card/80 p-1 shadow-gentle-sm">
            <button
              onClick={() => setActiveTab("matches")}
              className={`flex-1 rounded-full px-4 py-2.5 font-medium transition-gentle ${
                activeTab === "matches"
                  ? "bg-primary text-primary-foreground shadow-gentle-sm"
                  : "text-foreground hover:bg-background"
              }`}
            >
              Matches
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`flex-1 rounded-full px-4 py-2.5 font-medium transition-gentle ${
                activeTab === "messages"
                  ? "bg-primary text-primary-foreground shadow-gentle-sm"
                  : "text-foreground hover:bg-background"
              }`}
            >
              Inbox
            </button>
          </div>
        </div>

        {showCompactMessageLayout && (
          <div className="mb-4 xl:hidden">
            <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/95 shadow-[0_28px_80px_rgba(86,54,63,0.18)] backdrop-blur">
              {!selectedChat ? (
                <div className="flex min-h-[72svh] flex-col">
                  <div className="border-b border-border bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--color-primary)_15%,transparent),transparent_40%),linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_95%,var(--color-background)_5%),var(--color-card))] px-4 pb-4 pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Mobile message interface</p>
                        <h2 className="mt-1 text-3xl font-heading font-semibold text-foreground">Inbox</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{chatSyncLabel}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        iconName="RefreshCw"
                        onClick={() => handleRefreshChats()}
                        loading={isRefreshingChats}
                        disabled={isLoadingChats}
                        className="rounded-full"
                      >
                        Refresh
                      </Button>
                    </div>

                    <div className="mt-4 flex gap-2 rounded-full border border-border bg-background/70 p-1 shadow-gentle-sm">
                      <button
                        onClick={() => setActiveTab("matches")}
                        className="flex-1 rounded-full px-4 py-2.5 font-medium text-foreground transition-gentle hover:bg-background"
                      >
                        Matches
                      </button>
                      <button
                        onClick={() => setActiveTab("messages")}
                        className="flex-1 rounded-full bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-gentle-sm transition-gentle"
                      >
                        Inbox
                      </button>
                    </div>

                    <div className="mt-4 rounded-[1.5rem] border border-border bg-background/82 px-4 py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon name="Search" size={16} color="currentColor" />
                        <input
                          type="text"
                          value={conversationQuery}
                          onChange={(event) => setConversationQuery(event.target.value)}
                          placeholder="Search chats"
                          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                  </div>

                  {statusMessage && (
                    <div className="border-b border-border/70 bg-primary/10 px-4 py-3">
                      <p className="text-sm text-foreground">{statusMessage}</p>
                    </div>
                  )}

                  <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                    {suggestedStarter && (
                      <div className="rounded-[1.6rem] border border-primary/15 bg-primary/[0.08] p-4 shadow-gentle-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-primary/80">Suggested chat</p>
                            <h3 className="mt-1 text-lg font-semibold text-foreground">{suggestedStarter.name}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Start with a shared-interest conversation and keep the same IntroVibe look.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartDirectChat(suggestedStarter.id)}
                            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-gentle-sm transition-gentle hover:bg-primary/90"
                          >
                            Chat
                          </button>
                        </div>
                      </div>
                    )}

                    {isLoadingChats ? (
                      <div className="rounded-[1.6rem] border border-border bg-background/75 p-4">
                        <p className="text-sm text-muted-foreground">Loading your chat history...</p>
                      </div>
                    ) : filteredInboxThreads.length > 0 ? (
                      <div className="space-y-2">
                        {filteredInboxThreads.map((thread) => (
                          <ConversationThread
                            key={`${thread.status}-${thread.id}`}
                            conversation={thread}
                            onSelect={() => handleSelectInboxThread(thread)}
                            onDelete={openDeleteConversationDialog}
                            isActive={selectedChat?.type === thread.status && selectedChat?.id === thread.id}
                            isBusy={isDeletingConversation}
                          />
                        ))}
                      </div>
                    ) : totalThreadCount > 0 ? (
                      <div className="rounded-[1.6rem] border border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
                        No conversations match your search yet.
                      </div>
                    ) : (
                      <div className="rounded-[1.8rem] border border-dashed border-border bg-background/80 p-5 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                          <Icon name="MessagesSquare" size={24} color="var(--color-primary)" />
                        </div>
                        <p className="text-base font-semibold text-foreground">No conversations yet</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Start with a match and your mobile inbox will appear here.
                        </p>
                        <Button
                          variant="default"
                          iconName="Search"
                          className="mt-4 rounded-full"
                          onClick={handleFindMatchesAction}
                        >
                          Find matches
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[78svh] flex-col bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_96%,var(--color-primary)_4%),color-mix(in_oklab,var(--color-card)_90%,var(--color-background)_10%))]">
                  <div className="border-b border-border bg-card/92 px-4 py-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedChat(null)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/75 text-foreground transition-gentle hover:bg-muted"
                        aria-label="Back to inbox"
                      >
                        <Icon name="ChevronLeft" size={18} color="currentColor" />
                      </button>

                      <div className="relative flex-shrink-0">
                        <img
                          src={selectedChatAvatar}
                          alt={`${selectedChatName || "Chat"} avatar`}
                          className="h-11 w-11 rounded-full object-cover ring-1 ring-border"
                        />
                        {selectedChatOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {selectedChat?.type === "direct" ? "Direct conversation" : "Group conversation"}
                        </p>
                        <h3 className="truncate text-lg font-semibold text-foreground">
                          {selectedChat?.type === "direct" ? selectedChatName : `# ${selectedChatName}`}
                        </h3>
                        <p className="truncate text-sm text-muted-foreground">
                          {selectedChatOnline ? "Active now" : selectedChatSubtitle}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab("matches")}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-gentle hover:bg-muted"
                      >
                        Matches
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteConversationDialog(selectedConversationDeleteTarget)}
                        disabled={!selectedConversationDeleteTarget || isDeletingConversation}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/75 text-muted-foreground transition-gentle hover:border-destructive/25 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Delete this conversation"
                      >
                        <Icon name="Trash2" size={16} color="currentColor" />
                      </button>
                    </div>

                    {statusMessage && (
                      <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
                        <p className="text-sm text-foreground">{statusMessage}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_78%,var(--color-card)_22%),color-mix(in_oklab,var(--color-card)_92%,var(--color-muted)_8%))] px-4 py-5">
                    <div className="mx-auto max-w-3xl">
                      {selectedMessagesWithContext.length > 0 ? (
                        selectedMessagesWithContext.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={message.senderId === currentUser?.id}
                            isReplying={replyTargetId === message.id}
                            onReply={() => setReplyTargetId(message.id)}
                          />
                        ))
                      ) : (
                        <div className="flex min-h-[42svh] items-center justify-center">
                          <div className="max-w-md rounded-[2rem] border border-dashed border-border bg-card/80 px-6 py-8 text-center shadow-gentle-sm">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                              <Icon name="MessageCircleMore" size={24} color="var(--color-primary)" />
                            </div>
                            <p className="text-base font-semibold text-foreground">No messages yet</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Start the conversation whenever you are ready.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <MessageComposer
                    compact
                    recipientName={selectedChat.type === "direct" ? selectedDirectPeer?.username : `# ${selectedGroup?.name}`}
                    replyToMessage={composerReplyTarget}
                    onCancelReply={() => setReplyTargetId(null)}
                    onSend={handleSendMessage}
                    onSaveDraft={(value) => setStatusMessage(`Draft saved (${value.length} characters).`)}
                    onReplyLater={() => setStatusMessage("Saved for later.")}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className={`overflow-hidden rounded-[2rem] border border-border/70 bg-card/95 shadow-[0_28px_80px_rgba(86,54,63,0.18)] backdrop-blur ${showCompactMessageLayout ? "hidden xl:block" : ""}`}>
          <div className="grid min-h-[78vh] grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
            <aside className={`${showMobileInbox ? "block" : "hidden"} border-b border-border bg-muted/20 xl:block xl:border-b-0 xl:border-r`}>
              <div className="flex h-full flex-col p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Messenger-style inbox</p>
                    <h2 className="mt-1 text-2xl font-heading font-semibold text-foreground">Chats</h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="RefreshCw"
                    onClick={() => handleRefreshChats()}
                    loading={isRefreshingChats}
                    disabled={isLoadingChats}
                    className="rounded-full"
                  >
                    Refresh
                  </Button>
                </div>

                <p className="mb-4 text-sm text-muted-foreground">
                  1-on-1 for all. Group chat is {groupChatEnabled ? "enabled" : "disabled"} for your profile.
                </p>

                <div className="mb-4 rounded-2xl border border-border bg-background/75 px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon name="Search" size={16} color="currentColor" />
                    <input
                      type="text"
                      value={conversationQuery}
                      onChange={(event) => setConversationQuery(event.target.value)}
                      placeholder="Search chats"
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  {isLoadingChats ? (
                    <div className="rounded-2xl border border-border bg-background/70 p-4">
                      <p className="text-sm text-muted-foreground">Loading your chat history...</p>
                    </div>
                  ) : filteredInboxThreads.length > 0 ? (
                    <div className="space-y-2">
                      {filteredInboxThreads.map((thread) => (
                        <ConversationThread
                          key={`${thread.status}-${thread.id}`}
                          conversation={thread}
                          onSelect={() => handleSelectInboxThread(thread)}
                          onDelete={openDeleteConversationDialog}
                          isActive={selectedChat?.type === thread.status && selectedChat?.id === thread.id}
                          isBusy={isDeletingConversation}
                        />
                      ))}
                    </div>
                  ) : totalThreadCount > 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
                      No conversations match your search yet.
                    </div>
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-border bg-background/80 p-5">
                      <p className="text-sm font-medium text-foreground">No conversations yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Start with a match and your inbox will appear here.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        iconName="Search"
                        className="mt-3 rounded-full"
                        onClick={handleFindMatchesAction}
                      >
                        Find matches
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <section className={`${showMobileConversation ? "flex" : "hidden"} min-h-[42rem] flex-col bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_96%,var(--color-primary)_4%),color-mix(in_oklab,var(--color-card)_90%,var(--color-background)_10%))] xl:flex`}>
              {selectedChat ? (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-border bg-card/88 px-5 py-4 backdrop-blur">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={selectedChatAvatar}
                          alt={`${selectedChatName || "Chat"} avatar`}
                          className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
                        />
                        {selectedChatOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {selectedChat?.type === "direct" ? "Direct conversation" : "Group conversation"}
                        </p>
                        <h3 className="truncate text-lg font-semibold text-foreground">
                          {selectedChat?.type === "direct" ? selectedChatName : `# ${selectedChatName}`}
                        </h3>
                        <p className="truncate text-sm text-muted-foreground">
                          {selectedChatOnline ? "Active now" : selectedChatSubtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary md:inline-flex">
                        {selectedChat?.type === "direct" ? "Direct" : "Group"}
                      </div>
                      <button
                        type="button"
                        onClick={() => openDeleteConversationDialog(selectedConversationDeleteTarget)}
                        disabled={!selectedConversationDeleteTarget || isDeletingConversation}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/75 text-muted-foreground transition-gentle hover:border-destructive/25 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Delete this conversation"
                      >
                        <Icon name="Trash2" size={16} color="currentColor" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedChat(null)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-gentle hover:bg-muted xl:hidden"
                      >
                        Inbox
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_78%,var(--color-card)_22%),color-mix(in_oklab,var(--color-card)_92%,var(--color-muted)_8%))] px-4 py-6 md:px-6">
                    <div className="mx-auto max-w-3xl">
                      {selectedMessagesWithContext.length > 0 ? (
                        selectedMessagesWithContext.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={message.senderId === currentUser?.id}
                            isReplying={replyTargetId === message.id}
                            onReply={() => setReplyTargetId(message.id)}
                          />
                        ))
                      ) : (
                        <div className="flex min-h-[22rem] items-center justify-center">
                          <div className="max-w-md rounded-[2rem] border border-dashed border-border bg-card/80 px-6 py-8 text-center shadow-gentle-sm">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                              <Icon name="MessageCircleMore" size={24} color="var(--color-primary)" />
                            </div>
                            <p className="text-base font-semibold text-foreground">No messages yet</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Start the conversation whenever you are ready.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <MessageComposer
                    recipientName={selectedChat.type === "direct" ? selectedDirectPeer?.username : `# ${selectedGroup?.name}`}
                    replyToMessage={composerReplyTarget}
                    onCancelReply={() => setReplyTargetId(null)}
                    onSend={handleSendMessage}
                    onSaveDraft={(value) => setStatusMessage(`Draft saved (${value.length} characters).`)}
                    onReplyLater={() => setStatusMessage("Saved for later.")}
                  />
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 md:p-10">
                  <div className="max-w-lg text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Icon name="MessagesSquare" size={30} color="var(--color-primary)" />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
                      Your Messenger-style chat space
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                      Pick a conversation from the inbox, or start one from your match suggestions.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      {suggestedStarter ? (
                        <Button
                          variant="default"
                          iconName="MessageCircle"
                          iconPosition="left"
                          className="rounded-full"
                          onClick={() => handleStartDirectChat(suggestedStarter.id)}
                        >
                          Chat with {suggestedStarter.name}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          iconName="Search"
                          iconPosition="left"
                          className="rounded-full"
                          onClick={handleFindMatchesAction}
                        >
                          Find matches
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        iconName="Users"
                        iconPosition="left"
                        className="rounded-full"
                        onClick={() => setActiveTab("matches")}
                      >
                        View suggestions
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <aside className={`${showMobileMatches ? "block" : "hidden"} border-t border-border bg-background/85 xl:block xl:border-l xl:border-t-0`}>
              <div className="flex h-full flex-col gap-5 p-5">
                <div className="rounded-[1.75rem] border border-border bg-card/80 p-4 shadow-gentle-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Find people</p>
                      <h2 className="mt-1 text-2xl font-heading font-semibold text-foreground">Matches</h2>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      iconName="RefreshCw"
                      onClick={handleRefreshMatches}
                      loading={isRefreshingUsers || isLoadingMatches}
                      disabled={!authReady}
                      className="rounded-full"
                    >
                      Refresh
                    </Button>
                  </div>

                  <p className="mb-4 text-sm text-muted-foreground">
                    Same personality type plus shared interests keeps your suggestions more intentional.
                  </p>

                  <div className="rounded-2xl border border-border bg-background/75 px-4 py-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon name="Search" size={16} color="currentColor" />
                      <input
                        type="text"
                        value={matchQuery}
                        onChange={(event) => setMatchQuery(event.target.value)}
                        placeholder="Search matches or interests"
                        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_94%,var(--color-primary)_6%),color-mix(in_oklab,var(--color-card)_88%,var(--color-background)_12%))] p-4 shadow-gentle-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ready to connect</p>
                      <h3 className="mt-1 text-xl font-heading font-semibold text-foreground">
                        {matchResults.length} people match your vibe
                      </h3>
                    </div>
                    <div className="rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
                      Live suggestions
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your matches appear here right away. You can chat instantly or save the connection for later.
                  </p>
                  {featuredMatch && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        variant="default"
                        iconName="MessageCircle"
                        className="rounded-full"
                        onClick={() => handleStartDirectChat(featuredMatch.id)}
                      >
                        Chat with {featuredMatch.name}
                      </Button>
                      <Button
                        variant="outline"
                        iconName="RefreshCw"
                        className="rounded-full"
                        onClick={handleRefreshMatches}
                        disabled={!authReady}
                      >
                        Refresh list
                      </Button>
                    </div>
                  )}
                </div>

                {groupChatEnabled && (
                  <div className="rounded-[1.75rem] border border-border bg-card/80 p-4 shadow-gentle-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <Icon name="UsersRound" size={18} color="var(--color-accent)" />
                      <h3 className="text-lg font-heading font-semibold text-foreground">Create group chat</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Keep the interface clean, then open a focused selector only when you want to build a group.
                    </p>

                    <div className="mt-4 flex items-center justify-between rounded-[1.4rem] border border-border bg-background/70 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {availableGroupMembers.length > 1
                            ? `${availableGroupMembers.length} matches are ready`
                            : "Need at least two matches"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Choose people only after you tap the create button.
                        </p>
                      </div>
                      <Button
                        variant="default"
                        iconName="UsersRound"
                        onClick={openGroupComposer}
                        disabled={isLoadingChats || availableGroupMembers.length < 2}
                        className="rounded-full"
                      >
                        Create group chat
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto pr-1">
                  {isLoadingMatches ? (
                    <div className="rounded-2xl border border-border bg-background/70 p-5">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Checking for compatible matches...
                      </p>
                    </div>
                  ) : filteredMatchResults.length > 0 ? (
                    <div className="space-y-4">
                      {filteredMatchResults.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          onSendHello={handleStartDirectChat}
                          onSaveLater={() => setStatusMessage(`Saved your connection with ${match.name}.`)}
                        />
                      ))}
                    </div>
                  ) : matchResults.length > 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
                      No matches match your search yet.
                    </div>
                  ) : (
                    <EmptyState type="noMatches" onAction={handleRefreshMatches} />
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {groupChatEnabled && isGroupComposerOpen && (
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
            onClick={closeGroupComposer}
          >
            <div
              className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_28px_80px_rgba(40,24,29,0.28)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_92%,var(--color-primary)_8%),var(--color-card))] px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Group setup</p>
                    <h3 className="mt-1 text-2xl font-heading font-semibold text-foreground">Create group chat</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Pick matched people only after opening this panel so the main interface stays clean.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeGroupComposer}
                    className="rounded-full p-2 text-muted-foreground transition-gentle hover:bg-muted hover:text-foreground"
                    aria-label="Close group creator"
                  >
                    <Icon name="X" size={18} color="currentColor" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Group name</label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(event) => setGroupName(event.target.value)}
                      placeholder="Example: Weekend study circle"
                      className="flex h-12 w-full rounded-[1.25rem] border border-input bg-background px-4 py-2 text-sm text-foreground outline-none transition-gentle focus:border-primary/40"
                    />

                    <div className="mt-4 rounded-[1.4rem] border border-border bg-background/70 px-4 py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon name="Search" size={16} color="currentColor" />
                        <input
                          type="text"
                          value={groupMemberQuery}
                          onChange={(event) => setGroupMemberQuery(event.target.value)}
                          placeholder="Search matched people"
                          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {filteredAvailableGroupMembers.length > 0 ? (
                        filteredAvailableGroupMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleGroupMember(member.id)}
                            className={`flex w-full items-center justify-between rounded-[1.35rem] border px-4 py-3 text-left transition-gentle ${
                              selectedGroupMembers.includes(member.id)
                                ? "border-primary/40 bg-primary/[0.07] shadow-gentle-sm"
                                : "border-border bg-card hover:border-primary/25 hover:bg-background/80"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{member.name}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {member.personalityType} | {member.sharedInterests?.slice(0, 2).join(", ") || "Shared interests"}
                              </p>
                            </div>
                            <Icon
                              name={selectedGroupMembers.includes(member.id) ? "CheckCircle2" : "Circle"}
                              size={20}
                              color={selectedGroupMembers.includes(member.id) ? "var(--color-primary)" : "var(--color-muted-foreground)"}
                            />
                          </button>
                        ))
                      ) : (
                        <div className="rounded-[1.4rem] border border-dashed border-border bg-background/75 p-4 text-sm text-muted-foreground">
                          No matched people are available for this search yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-border bg-background/72 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Selected members</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{selectedGroupMembers.length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Select at least two matched people to create the conversation.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedGroupMemberLabels.length > 0 ? (
                        selectedGroupMemberLabels.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleGroupMember(member.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-gentle hover:bg-primary/20"
                          >
                            <span>{member.name}</span>
                            <Icon name="X" size={12} color="currentColor" />
                          </button>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No one selected yet.</span>
                      )}
                    </div>

                    <div className="mt-5 rounded-[1.2rem] border border-accent/25 bg-accent/10 px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">Quick guide</p>
                      <p className="mt-2 text-sm text-foreground">
                        Name the chat, pick your members, then create the group in one step.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border bg-card/95 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Matches stay hidden until you open this creator, then you can select exactly who to add.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={closeGroupComposer} className="rounded-full">
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      iconName="UsersRound"
                      onClick={handleCreateGroup}
                      disabled={isLoadingChats}
                      className="rounded-full"
                    >
                      Create group chat
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {conversationPendingDelete && (
          <div
            className="fixed inset-0 z-[230] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
            onClick={closeDeleteConversationDialog}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_28px_80px_rgba(40,24,29,0.28)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_92%,var(--color-primary)_8%),var(--color-card))] px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Delete conversation</p>
                    <h3 className="mt-1 text-2xl font-heading font-semibold text-foreground">
                      Remove from inbox
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeDeleteConversationDialog}
                    disabled={isDeletingConversation}
                    className="rounded-full p-2 text-muted-foreground transition-gentle hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Close delete conversation dialog"
                  >
                    <Icon name="X" size={18} color="currentColor" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Icon name="Trash2" size={24} color="currentColor" />
                </div>
                <p className="mt-4 text-base font-semibold text-foreground">
                  Delete {conversationPendingDelete.type === "group" ? `# ${conversationPendingDelete.name}` : conversationPendingDelete.name}?
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  This removes the conversation from your inbox view. The other person or group members will keep their copy.
                </p>
              </div>

              <div className="border-t border-border bg-card/95 px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={closeDeleteConversationDialog}
                    disabled={isDeletingConversation}
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    iconName="Trash2"
                    onClick={handleDeleteConversation}
                    loading={isDeletingConversation}
                    className="rounded-full"
                  >
                    Delete conversation
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FindMatchesConversations;

