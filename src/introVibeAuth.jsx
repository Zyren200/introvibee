import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  clearStoredSessionToken,
  getStoredSessionToken,
  isApiOnlyMode,
  isApiUnavailableError,
  isRemoteAuthEnabled,
  requestIntroVibeApi,
  setStoredSessionToken,
} from "./lib/introVibeApi";
import { predictPersonalityFromInterests, uniqueInterests } from "./utils/introVibe";

const USERS_KEYS = ["introVibeUsers", "isfEaseUsers"];
const CURRENT_USER_KEYS = ["introVibeCurrentUser", "isfEaseCurrentUser"];
const LEGACY_CONVERSATIONS_KEY = "isfEaseConversations";
const DIRECT_CHAT_KEY = "introVibeDirectChats";
const GROUP_CHAT_KEY = "introVibeGroupChats";
const REFLECTION_DATA_KEY = "isfReflectionData";
const QUIET_ACTIVITY_KEY = "isfQuietActivities";
const ADAPTIVE_QUIZ_PROGRESS_KEY = "adaptiveQuizProgress";
const SUDOKU_PROGRESS_KEY = "introVibeSudokuProgress";
const MATCH_COUNT_KEY = "isf-latest-match-count";
const ONLINE_GRACE_MS = 5 * 60 * 1000;
const REMOTE_USERS_REFRESH_MS = 15000;

const readStorageValue = (keys) => {
  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);
      if (value) return value;
    } catch (error) {
      console.error(`Failed to read ${key}`, error);
    }
  }

  return null;
};

const clearStorageKeys = (keys) => {
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}`, error);
    }
  });
};

const normalizeUser = (user) => {
  const interests = uniqueInterests(user?.interests);
  const predictedPersonality =
    user?.predictedPersonality || predictPersonalityFromInterests(interests);
  const personalityType = user?.personalityType || null;
  const assessmentCompleted = Boolean(
    (user?.assessmentCompleted ?? Boolean(personalityType)) && personalityType
  );

  return {
    id: user?.id || crypto.randomUUID(),
    username: (user?.username || "").trim(),
    email: (user?.email || "").trim(),
    password: user?.password || "",
    interests,
    tags: Array.isArray(user?.tags) ? user.tags.filter(Boolean) : [],
    avatarId: user?.avatarId || 1,
    createdAt: user?.createdAt || Date.now(),
    predictedPersonality,
    personalityType,
    assessmentCompleted,
    assessmentAnswers: Array.isArray(user?.assessmentAnswers) ? user.assessmentAnswers : [],
    sudokuCompleted:
      personalityType && personalityType !== "Introvert"
        ? Boolean(user?.sudokuCompleted ?? assessmentCompleted)
        : Boolean(user?.sudokuCompleted),
    presence: {
      status: user?.presence?.status || "away",
      lastActiveAt: user?.presence?.lastActiveAt || user?.createdAt || Date.now(),
      lastLogoutAt: user?.presence?.lastLogoutAt || null,
    },
  };
};

const loadUsers = () => {
  try {
    const saved = readStorageValue(USERS_KEYS);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeUser) : [];
  } catch (error) {
    console.error("Failed to load users", error);
  }

  return [];
};

const saveUsers = (users) => {
  try {
    localStorage.setItem("introVibeUsers", JSON.stringify(users));
  } catch (error) {
    console.error("Failed to save users", error);
  }
};

const loadCurrentUserId = () => readStorageValue(CURRENT_USER_KEYS) || null;

const saveCurrentUserId = (id) => {
  try {
    localStorage.setItem("introVibeCurrentUser", id || "");
  } catch (error) {
    console.error("Failed to save current user id", error);
  }
};

const clearLegacySessionPointer = () => {
  clearStorageKeys(CURRENT_USER_KEYS);
};

const removeUserBucketFromStorage = (key, userId) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
    if (!Object.prototype.hasOwnProperty.call(parsed, userId)) return;

    const next = { ...parsed };
    delete next[userId];

    if (Object.keys(next).length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(next));
    }
  } catch (error) {
    console.error(`Failed to clean ${key}`, error);
  }
};

const removeUserFromDirectChats = (userId) => {
  [LEGACY_CONVERSATIONS_KEY, DIRECT_CHAT_KEY].forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;

      const nextEntries = Object.entries(parsed).filter(([, chat]) => {
        const participants = Array.isArray(chat?.participants) ? chat.participants : [];
        return !participants.includes(userId);
      });

      if (nextEntries.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(Object.fromEntries(nextEntries)));
      }
    } catch (error) {
      console.error(`Failed to clean ${key}`, error);
    }
  });
};

const removeUserFromGroupChats = (userId) => {
  try {
    const raw = localStorage.getItem(GROUP_CHAT_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const updated = parsed
      .map((group) => ({
        ...group,
        memberIds: (group?.memberIds || []).filter((memberId) => memberId !== userId),
      }))
      .filter((group) => group.memberIds.length >= 2);

    if (updated.length === 0) {
      localStorage.removeItem(GROUP_CHAT_KEY);
    } else {
      localStorage.setItem(GROUP_CHAT_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.error("Failed to clean group chats", error);
  }
};

const cleanupDeletedUserArtifacts = (userId) => {
  removeUserFromDirectChats(userId);
  removeUserFromGroupChats(userId);
  removeUserBucketFromStorage(REFLECTION_DATA_KEY, userId);
  removeUserBucketFromStorage(QUIET_ACTIVITY_KEY, userId);
  removeUserBucketFromStorage(SUDOKU_PROGRESS_KEY, userId);

  try {
    localStorage.removeItem(ADAPTIVE_QUIZ_PROGRESS_KEY);
  } catch (cleanupError) {
    console.error("Failed to clear adaptive quiz progress", cleanupError);
  }

  try {
    sessionStorage.removeItem(MATCH_COUNT_KEY);
  } catch (cleanupError) {
    console.error("Failed to clear match count", cleanupError);
  }
};

const clearAssessmentArtifacts = (userId) => {
  if (userId) {
    removeUserBucketFromStorage(SUDOKU_PROGRESS_KEY, userId);
  }

  try {
    localStorage.removeItem(ADAPTIVE_QUIZ_PROGRESS_KEY);
  } catch (cleanupError) {
    console.error("Failed to clear adaptive quiz progress", cleanupError);
  }

  try {
    sessionStorage.removeItem(MATCH_COUNT_KEY);
  } catch (cleanupError) {
    console.error("Failed to clear match count", cleanupError);
  }
};

const mergeUserIntoCollection = (collection, user) => {
  const nextUser = normalizeUser(user);
  const hasUser = collection.some((entry) => entry.id === nextUser.id);

  if (!hasUser) {
    return [...collection, nextUser];
  }

  return collection.map((entry) => (entry.id === nextUser.id ? nextUser : entry));
};

const shouldBootstrapLegacyState = () => {
  if (!isRemoteAuthEnabled()) return true;
  if (isApiOnlyMode()) return false;
  return !getStoredSessionToken();
};

const IntroVibeAuthContext = createContext(null);

export const IntroVibeAuthProvider = ({ children }) => {
  const [users, setUsers] = useState(() => (shouldBootstrapLegacyState() ? loadUsers() : []));
  const [currentUserId, setCurrentUserId] = useState(() =>
    shouldBootstrapLegacyState() ? loadCurrentUserId() : null
  );
  const [error, setError] = useState(null);
  const [sessionAuthenticated, setSessionAuthenticated] = useState(() =>
    shouldBootstrapLegacyState() ? Boolean(loadCurrentUserId()) : false
  );
  const [presenceVersion, setPresenceVersion] = useState(0);
  const [authMode, setAuthMode] = useState(() =>
    shouldBootstrapLegacyState() ? "legacy-local" : "railway-api"
  );
  const [authReady, setAuthReady] = useState(() =>
    !isRemoteAuthEnabled() || shouldBootstrapLegacyState()
  );
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [lastUsersSyncAt, setLastUsersSyncAt] = useState(() =>
    shouldBootstrapLegacyState() ? Date.now() : null
  );

  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId) || null,
    [users, currentUserId]
  );

  useEffect(() => {
    if (authMode !== "legacy-local") return;
    saveUsers(users);
  }, [users, authMode]);

  useEffect(() => {
    if (authMode !== "legacy-local") return;
    saveCurrentUserId(currentUserId);
  }, [currentUserId, authMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPresenceVersion((version) => version + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (authMode !== "legacy-local" || !sessionAuthenticated || !currentUserId) return undefined;

    const beat = () => {
      const now = Date.now();
      setUsers((prev) =>
        prev.map((user) =>
          user.id === currentUserId
            ? normalizeUser({
                ...user,
                presence: {
                  status: "online",
                  lastActiveAt: now,
                  lastLogoutAt: null,
                },
              })
            : user
        )
      );
    };

    beat();
    const interval = setInterval(beat, 60000);
    return () => clearInterval(interval);
  }, [authMode, sessionAuthenticated, currentUserId]);

  useEffect(() => {
    if (!isRemoteAuthEnabled()) {
      setAuthReady(true);
      return undefined;
    }

    const sessionToken = getStoredSessionToken();
    if (!sessionToken) {
      if (isApiOnlyMode()) {
        setUsers([]);
        setCurrentUserId(null);
        setSessionAuthenticated(false);
        setAuthMode("railway-api");
      }
      setAuthReady(true);
      return undefined;
    }

    let cancelled = false;

    const hydrateRemoteSession = async () => {
      try {
        const payload = await requestIntroVibeApi("/api/auth/me", {
          sessionToken,
        });

        if (cancelled) return;

        const nextUsers = Array.isArray(payload?.users) ? payload.users.map(normalizeUser) : [];
        const nextUser = payload?.user ? normalizeUser(payload.user) : null;

        clearLegacySessionPointer();
        setUsers(nextUsers.length ? nextUsers : nextUser ? [nextUser] : []);
        setLastUsersSyncAt(Date.now());
        setCurrentUserId(nextUser?.id || null);
        setSessionAuthenticated(Boolean(nextUser));
        setAuthMode("railway-api");
        setError(null);
      } catch (remoteError) {
        if (cancelled) return;

        clearStoredSessionToken();

        if (isApiOnlyMode() || !isApiUnavailableError(remoteError)) {
          setUsers([]);
          setCurrentUserId(null);
          setSessionAuthenticated(false);
          setAuthMode("railway-api");
        }

        if (remoteError?.status && remoteError.status !== 401) {
          setError(remoteError.message);
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    hydrateRemoteSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUsers = async ({ silent = false } = {}) => {
    const hasRemoteSession =
      authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken());

    if (!silent) {
      setIsRefreshingUsers(true);
    }

    try {
      if (hasRemoteSession) {
        const payload = await requestIntroVibeApi("/api/users");
        const nextUsers = Array.isArray(payload?.users) ? payload.users.map(normalizeUser) : [];

        setUsers(nextUsers);
        setLastUsersSyncAt(Date.now());
        setAuthMode("railway-api");
        setError(null);

        return { success: true, mode: "railway-api", users: nextUsers };
      }

      const nextUsers = loadUsers();
      const nextCurrentUserId = loadCurrentUserId();

      setUsers(nextUsers);
      setCurrentUserId(nextCurrentUserId);
      setSessionAuthenticated(Boolean(nextCurrentUserId));
      setLastUsersSyncAt(Date.now());
      setAuthMode("legacy-local");
      setError(null);

      return { success: true, mode: "legacy-local", users: nextUsers };
    } catch (apiError) {
      if (!shouldFallbackToLegacy(apiError)) {
        if (apiError?.status === 401) {
          clearStoredSessionToken();
          clearLegacySessionPointer();
          setUsers([]);
          setCurrentUserId(null);
          setSessionAuthenticated(false);
          setAuthMode("railway-api");
        }

        if (!silent) {
          setError(apiError.message);
        }

        return { success: false, error: apiError.message };
      }

      return { success: false, fallback: true, error: apiError.message };
    } finally {
      if (!silent) {
        setIsRefreshingUsers(false);
      }
    }
  };

  useEffect(() => {
    if (authMode !== "legacy-local") {
      return undefined;
    }

    const handleStorage = (event) => {
      if (
        event?.key &&
        !USERS_KEYS.includes(event.key) &&
        !CURRENT_USER_KEYS.includes(event.key)
      ) {
        return;
      }

      const nextUsers = loadUsers();
      const nextCurrentUserId = loadCurrentUserId();

      setUsers(nextUsers);
      setCurrentUserId(nextCurrentUserId);
      setSessionAuthenticated(Boolean(nextCurrentUserId));
      setLastUsersSyncAt(Date.now());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [authMode]);

  useEffect(() => {
    if (!authReady) {
      return undefined;
    }

    const hasRemoteSession =
      authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken());

    if (!hasRemoteSession || !sessionAuthenticated || !currentUserId) {
      return undefined;
    }

    let cancelled = false;

    const refreshSilently = async () => {
      const result = await refreshUsers({ silent: true });
      if (cancelled || result?.success) {
        return;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshSilently();
      }
    };

    void refreshSilently();

    const interval = setInterval(() => {
      void refreshSilently();
    }, REMOTE_USERS_REFRESH_MS);

    window.addEventListener("focus", refreshSilently);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", refreshSilently);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authMode, authReady, currentUserId, sessionAuthenticated]);

  const isUserOnline = (user) => {
    if (!user?.presence) return false;

    const now = Date.now();
    const { status, lastActiveAt, lastLogoutAt } = user.presence;

    if (status === "online") {
      return now - (lastActiveAt || 0) <= ONLINE_GRACE_MS;
    }

    if (status === "away") {
      return now - (lastLogoutAt || 0) <= ONLINE_GRACE_MS;
    }

    return false;
  };

  const applyRemoteAuthPayload = (payload) => {
    const normalizedUsers = Array.isArray(payload?.users)
      ? payload.users.map(normalizeUser)
      : [];
    const normalizedUser = payload?.user ? normalizeUser(payload.user) : null;
    const syncedAt = Date.now();

    if (payload?.sessionToken) {
      setStoredSessionToken(payload.sessionToken);
    }

    clearLegacySessionPointer();
    setLastUsersSyncAt(syncedAt);
    setUsers((prev) => {
      if (normalizedUsers.length) {
        return normalizedUsers;
      }

      if (normalizedUser) {
        return mergeUserIntoCollection(prev, normalizedUser);
      }

      return prev;
    });
    setCurrentUserId(normalizedUser?.id || null);
    setSessionAuthenticated(Boolean(normalizedUser));
    setAuthMode("railway-api");
    setError(null);

    return normalizedUser;
  };

  const shouldFallbackToLegacy = (apiError) =>
    isRemoteAuthEnabled() && !isApiOnlyMode() && isApiUnavailableError(apiError);

  const localSignUp = ({ username, email, password, interests = [], tags = [], avatarId = 1 }) => {
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    const normalizedInterests = uniqueInterests(interests);

    if (!trimmedUsername || !trimmedEmail || !password) {
      const message = "Username, email, and password are required.";
      setError(message);
      return { success: false, error: message };
    }

    const usernameExists = users.some(
      (user) => user.username.toLowerCase() === trimmedUsername.toLowerCase()
    );

    if (usernameExists) {
      const message = "That username is already taken.";
      setError(message);
      return { success: false, error: message };
    }

    const now = Date.now();
    const nextUser = normalizeUser({
      id: crypto.randomUUID(),
      username: trimmedUsername,
      email: trimmedEmail,
      password,
      interests: normalizedInterests,
      tags,
      avatarId,
      createdAt: now,
      predictedPersonality: predictPersonalityFromInterests(normalizedInterests),
      personalityType: null,
      assessmentCompleted: false,
      assessmentAnswers: [],
      sudokuCompleted: false,
      presence: {
        status: "online",
        lastActiveAt: now,
        lastLogoutAt: null,
      },
    });

    setUsers((prev) => [...prev, nextUser]);
    setCurrentUserId(nextUser.id);
    setSessionAuthenticated(true);
    setAuthMode("legacy-local");

    return { success: true, user: nextUser, mode: "legacy-local" };
  };

  const localLogin = ({ username, password }) => {
    const matchedUser = users.find(
      (user) =>
        user.username.toLowerCase() === username?.trim()?.toLowerCase() &&
        user.password === password
    );

    if (!matchedUser) {
      const message = "Invalid credentials. Please sign up if you are new.";
      setError(message);
      return { success: false, error: message };
    }

    const now = Date.now();
    let nextUser = matchedUser;

    setUsers((prev) =>
      prev.map((entry) => {
        if (entry.id !== matchedUser.id) return entry;

        nextUser = normalizeUser({
          ...entry,
          presence: {
            status: "online",
            lastActiveAt: now,
            lastLogoutAt: null,
          },
        });

        return nextUser;
      })
    );

    setCurrentUserId(matchedUser.id);
    setSessionAuthenticated(true);
    setAuthMode("legacy-local");

    return { success: true, user: nextUser, mode: "legacy-local" };
  };

  const updateCurrentUserProfile = (updates) => {
    if (!currentUserId) return null;

    let updatedUser = null;

    setUsers((prev) =>
      prev.map((entry) => {
        if (entry.id !== currentUserId) return entry;
        updatedUser = normalizeUser({ ...entry, ...updates });
        return updatedUser;
      })
    );

    return updatedUser;
  };

  const localCompleteAssessment = ({ personalityType, answers = [] }) =>
    updateCurrentUserProfile({
      personalityType,
      assessmentCompleted: true,
      assessmentAnswers: answers,
      sudokuCompleted: personalityType === "Introvert" ? false : true,
    });

  const localMarkSudokuComplete = () =>
    updateCurrentUserProfile({
      sudokuCompleted: true,
    });

  const localResetAssessment = () => {
    if (!currentUserId) {
      const message = "No signed-in account to retake.";
      setError(message);
      return null;
    }

    clearAssessmentArtifacts(currentUserId);

    return updateCurrentUserProfile({
      personalityType: null,
      assessmentCompleted: false,
      assessmentAnswers: [],
      sudokuCompleted: false,
    });
  };

  const localLogout = () => {
    if (currentUserId) {
      const logoutAt = Date.now();
      setUsers((prev) =>
        prev.map((entry) =>
          entry.id === currentUserId
            ? normalizeUser({
                ...entry,
                presence: {
                  status: "away",
                  lastActiveAt: logoutAt,
                  lastLogoutAt: logoutAt,
                },
              })
            : entry
        )
      );
    }

    setCurrentUserId(null);
    setSessionAuthenticated(false);
    setAuthMode("legacy-local");

    return { success: true, mode: "legacy-local" };
  };

  const localDeleteAccount = () => {
    if (!currentUserId) {
      const message = "No signed-in account to delete.";
      setError(message);
      return { success: false, error: message };
    }

    const deletedUserId = currentUserId;

    setUsers((prev) => prev.filter((entry) => entry.id !== deletedUserId));
    setCurrentUserId(null);
    setSessionAuthenticated(false);
    setAuthMode("legacy-local");
    cleanupDeletedUserArtifacts(deletedUserId);

    return { success: true, mode: "legacy-local" };
  };

  const signUp = async ({ username, email, password, interests = [], tags = [], avatarId = 1 }) => {
    setError(null);

    if (isRemoteAuthEnabled()) {
      try {
        const payload = await requestIntroVibeApi("/api/auth/register", {
          method: "POST",
          sessionToken: null,
          body: JSON.stringify({
            username,
            email,
            password,
            interests,
            avatarId,
          }),
        });

        const user = applyRemoteAuthPayload(payload);
        return { success: true, user, mode: "railway-api" };
      } catch (apiError) {
        if (!shouldFallbackToLegacy(apiError)) {
          setError(apiError.message);
          return { success: false, error: apiError.message };
        }
      }
    }

    return localSignUp({ username, email, password, interests, tags, avatarId });
  };

  const login = async ({ username, password }) => {
    setError(null);

    if (isRemoteAuthEnabled()) {
      try {
        const payload = await requestIntroVibeApi("/api/auth/login", {
          method: "POST",
          sessionToken: null,
          body: JSON.stringify({ username, password }),
        });

        const user = applyRemoteAuthPayload(payload);
        return { success: true, user, mode: "railway-api" };
      } catch (apiError) {
        if (!shouldFallbackToLegacy(apiError)) {
          setError(apiError.message);
          return { success: false, error: apiError.message };
        }
      }
    }

    return localLogin({ username, password });
  };

  const completeAssessment = async ({ personalityType, answers = [] }) => {
    setError(null);

    if (authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken())) {
      try {
        const payload = await requestIntroVibeApi("/api/assessment/complete", {
          method: "POST",
          body: JSON.stringify({ personalityType, answers }),
        });

        return applyRemoteAuthPayload(payload);
      } catch (apiError) {
        if (!shouldFallbackToLegacy(apiError)) {
          setError(apiError.message);
          return null;
        }
      }
    }

    return localCompleteAssessment({ personalityType, answers });
  };

  const markSudokuComplete = async () => {
    setError(null);

    if (authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken())) {
      try {
        const payload = await requestIntroVibeApi("/api/sudoku/complete", {
          method: "POST",
        });

        return applyRemoteAuthPayload(payload);
      } catch (apiError) {
        if (!shouldFallbackToLegacy(apiError)) {
          setError(apiError.message);
          return null;
        }
      }
    }

    return localMarkSudokuComplete();
  };

  const resetAssessment = async () => {
    setError(null);

    if (!currentUserId) {
      const message = "No signed-in account to retake.";
      setError(message);
      return null;
    }

    if (authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken())) {
      try {
        const payload = await requestIntroVibeApi("/api/assessment/reset", {
          method: "POST",
        });

        clearAssessmentArtifacts(currentUserId);
        return applyRemoteAuthPayload(payload);
      } catch (apiError) {
        if (!shouldFallbackToLegacy(apiError)) {
          setError(apiError.message);
          return null;
        }
      }
    }

    return localResetAssessment();
  };

  const logout = async () => {
    setError(null);

    if (authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken())) {
      try {
        await requestIntroVibeApi("/api/auth/logout", {
          method: "POST",
        });
      } catch (apiError) {
        if (!shouldFallbackToLegacy(apiError)) {
          clearStoredSessionToken();
          clearLegacySessionPointer();
          setCurrentUserId(null);
          setSessionAuthenticated(false);
          setAuthMode("railway-api");
          setError(apiError.message);
          return { success: false, error: apiError.message };
        }
      }

      clearStoredSessionToken();
      clearLegacySessionPointer();

      if (currentUserId) {
        const logoutAt = Date.now();
        setUsers((prev) =>
          prev.map((entry) =>
            entry.id === currentUserId
              ? normalizeUser({
                  ...entry,
                  presence: {
                    status: "away",
                    lastActiveAt: logoutAt,
                    lastLogoutAt: logoutAt,
                  },
                })
              : entry
          )
        );
      }

      setCurrentUserId(null);
      setSessionAuthenticated(false);
      setAuthMode("railway-api");
      return { success: true, mode: "railway-api" };
    }

    return localLogout();
  };

  const deleteAccount = async () => {
    setError(null);

    if (!currentUserId) {
      const message = "No signed-in account to delete.";
      setError(message);
      return { success: false, error: message };
    }

    const deletedUserId = currentUserId;

    if (authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken())) {
      try {
        await requestIntroVibeApi("/api/account", {
          method: "DELETE",
        });

        clearStoredSessionToken();
        clearLegacySessionPointer();
        cleanupDeletedUserArtifacts(deletedUserId);
        setUsers((prev) => prev.filter((entry) => entry.id !== deletedUserId));
        setCurrentUserId(null);
        setSessionAuthenticated(false);
        setAuthMode("railway-api");
        return { success: true, mode: "railway-api" };
      } catch (apiError) {
        if (!shouldFallbackToLegacy(apiError)) {
          setError(apiError.message);
          return { success: false, error: apiError.message };
        }
      }
    }

    return localDeleteAccount();
  };

  return (
    <IntroVibeAuthContext.Provider
      value={{
        users,
        currentUser,
        error,
        sessionAuthenticated,
        presenceVersion,
        authMode,
        authReady,
        isRefreshingUsers,
        lastUsersSyncAt,
        isUserOnline,
        refreshUsers,
        signUp,
        login,
        logout,
        deleteAccount,
        updateCurrentUserProfile,
        completeAssessment,
        resetAssessment,
        markSudokuComplete,
      }}
    >
      {children}
    </IntroVibeAuthContext.Provider>
  );
};

export const useIntroVibeAuth = () => {
  const context = useContext(IntroVibeAuthContext);
  if (!context) {
    throw new Error("useIntroVibeAuth must be used within IntroVibeAuthProvider");
  }
  return context;
};
