import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const USERS_KEY = 'isfEaseUsers';
const CURRENT_USER_KEY = 'isfEaseCurrentUser';
const CONVERSATIONS_KEY = 'isfEaseConversations';
const REFLECTION_DATA_KEY = 'isfReflectionData';
const QUIET_ACTIVITY_KEY = 'isfQuietActivities';
const ADAPTIVE_QUIZ_PROGRESS_KEY = 'adaptiveQuizProgress';
const MATCH_COUNT_KEY = 'isf-latest-match-count';
const ONLINE_GRACE_MS = 5 * 60 * 1000;

const loadUsers = () => {
  try {
    const saved = localStorage.getItem(USERS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to load users', error);
  }
  return [];
};

const saveUsers = (users) => {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Failed to save users', error);
  }
};

const loadCurrentUserId = () => {
  try {
    return localStorage.getItem(CURRENT_USER_KEY);
  } catch (error) {
    return null;
  }
};

const saveCurrentUserId = (id) => {
  try {
    localStorage.setItem(CURRENT_USER_KEY, id || '');
  } catch (error) {
    console.error('Failed to save current user id', error);
  }
};

const removeUserBucketFromStorage = (key, userId) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
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

const removeUserConversationsFromStorage = (userId) => {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

    const nextEntries = Object.entries(parsed).filter(([, conversation]) => {
      const participants = Array.isArray(conversation?.participants) ? conversation.participants : [];
      return !participants.includes(userId);
    });

    if (nextEntries.length === 0) {
      localStorage.removeItem(CONVERSATIONS_KEY);
      return;
    }

    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(Object.fromEntries(nextEntries)));
  } catch (error) {
    console.error('Failed to clean conversations for deleted account', error);
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState(loadUsers);
  const [currentUserId, setCurrentUserId] = useState(loadCurrentUserId);
  const [error, setError] = useState(null);
  const [sessionAuthenticated, setSessionAuthenticated] = useState(false);
  const [presenceVersion, setPresenceVersion] = useState(0);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId]
  );

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    saveCurrentUserId(currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    // Force periodic re-check so presence dots update when grace window expires.
    const interval = setInterval(() => {
      setPresenceVersion((version) => version + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!sessionAuthenticated || !currentUserId) return undefined;

    const beat = () => {
      const now = Date.now();
      setUsers((prev) =>
        prev.map((user) =>
          user.id === currentUserId
            ? {
                ...user,
                presence: {
                  status: 'online',
                  lastActiveAt: now,
                  lastLogoutAt: null,
                },
              }
            : user
        )
      );
    };

    beat();
    const interval = setInterval(beat, 60000);
    return () => clearInterval(interval);
  }, [sessionAuthenticated, currentUserId]);

  const isUserOnline = (user) => {
    if (!user?.presence) return false;
    const now = Date.now();
    const { status, lastActiveAt, lastLogoutAt } = user.presence;

    if (status === 'online') {
      return now - (lastActiveAt || 0) <= ONLINE_GRACE_MS;
    }

    if (status === 'away') {
      return now - (lastLogoutAt || 0) <= ONLINE_GRACE_MS;
    }

    return false;
  };

  const signUp = ({ username, email, password, interests = [], tags = [], avatarId = 1 }) => {
    setError(null);
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    if (!trimmedUsername || !trimmedEmail || !password) {
      const message = 'Username, email, and password are required.';
      setError(message);
      return { success: false, error: message };
    }
    const exists = users.some((u) => u.username.toLowerCase() === trimmedUsername.toLowerCase());
    if (exists) {
      const message = 'That username is already taken.';
      setError(message);
      return { success: false, error: message };
    }
    const newUser = {
      id: crypto.randomUUID(),
      username: trimmedUsername,
      email: trimmedEmail,
      password,
      interests,
      tags,
      avatarId,
      createdAt: Date.now(),
      presence: {
        status: 'online',
        lastActiveAt: Date.now(),
        lastLogoutAt: null,
      },
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUserId(newUser.id);
    setSessionAuthenticated(true);
    return { success: true, user: newUser };
  };

  const login = ({ username, password }) => {
    setError(null);
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === username?.trim()?.toLowerCase() &&
        u.password === password
    );
    if (!user) {
      const message = 'Invalid credentials. Please sign up if you are new.';
      setError(message);
      return { success: false, error: message };
    }
    setCurrentUserId(user.id);
    setSessionAuthenticated(true);
    setUsers((prev) =>
      prev.map((entry) =>
        entry.id === user.id
          ? {
              ...entry,
              presence: {
                status: 'online',
                lastActiveAt: Date.now(),
                lastLogoutAt: null,
              },
            }
          : entry
      )
    );
    return { success: true, user };
  };

  const logout = () => {
    if (currentUserId) {
      const logoutAt = Date.now();
      setUsers((prev) =>
        prev.map((entry) =>
          entry.id === currentUserId
            ? {
                ...entry,
                presence: {
                  status: 'away',
                  lastActiveAt: logoutAt,
                  lastLogoutAt: logoutAt,
                },
              }
            : entry
        )
      );
    }
    setCurrentUserId(null);
    setSessionAuthenticated(false);
  };

  const deleteAccount = () => {
    setError(null);

    if (!currentUserId) {
      const message = 'No signed-in account to delete.';
      setError(message);
      return { success: false, error: message };
    }

    const deletedUserId = currentUserId;

    setUsers((prev) => prev.filter((entry) => entry.id !== deletedUserId));
    setCurrentUserId(null);
    setSessionAuthenticated(false);

    removeUserConversationsFromStorage(deletedUserId);
    removeUserBucketFromStorage(REFLECTION_DATA_KEY, deletedUserId);
    removeUserBucketFromStorage(QUIET_ACTIVITY_KEY, deletedUserId);

    try {
      localStorage.removeItem(ADAPTIVE_QUIZ_PROGRESS_KEY);
    } catch (error) {
      console.error('Failed to clear adaptive quiz progress', error);
    }

    try {
      sessionStorage.removeItem(MATCH_COUNT_KEY);
    } catch (error) {
      console.error('Failed to clear match count', error);
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        users,
        currentUser,
        error,
        sessionAuthenticated,
        presenceVersion,
        isUserOnline,
        signUp,
        login,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
