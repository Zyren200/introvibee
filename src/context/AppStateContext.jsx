import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Lightweight app-wide state to coordinate quiet mode, pending notifications,
 * and session limits without pulling in a full state manager.
 */
const AppStateContext = createContext(null);

const STATS_KEY = 'isfEaseStats';

const loadStats = () => {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to load stats', error);
  }
  return {
    learningMinutes: 0,
    quietSessions: 0,
    reflections: 0,
  };
};

const persistStats = (stats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to persist stats', error);
  }
};

const loadPersistedQuietState = () => {
  try {
    const saved = localStorage.getItem('isfEaseQuietState');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        // Guard against stale timestamps
        until: parsed?.until ? new Date(parsed.until).getTime() : null,
      };
    }
  } catch (error) {
    console.error('Failed to load quiet state', error);
  }
  return {
    enabled: false,
    until: null,
    pendingNotifications: [],
    lastReminderAt: null,
  };
};

const persistQuietState = (state) => {
  try {
    localStorage.setItem('isfEaseQuietState', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to persist quiet state', error);
  }
};

export const AppStateProvider = ({ children }) => {
  const [quietState, setQuietState] = useState(loadPersistedQuietState);
  const [stats, setStats] = useState(loadStats);

  // Global 30‑minute cap (validation) used by timers across pages
  const sessionLimitMinutes = 30;
  const sessionWarningOffsetMinutes = 5; // warn at 25 minutes

  const isQuietNow = useMemo(() => {
    if (!quietState?.enabled) return false;
    if (!quietState?.until) return true; // manual quiet mode with no expiry
    return Date.now() < quietState.until;
  }, [quietState]);

  useEffect(() => {
    persistQuietState(quietState);
  }, [quietState]);

  useEffect(() => {
    persistStats(stats);
  }, [stats]);

  // Auto-disable quiet mode when the scheduled window ends and keep messages pending
  useEffect(() => {
    if (!quietState?.enabled || !quietState?.until) return undefined;

    const remaining = quietState.until - Date.now();
    if (remaining <= 0) {
      setQuietState((prev) => ({
        ...prev,
        enabled: false,
        until: null,
        lastReminderAt: Date.now(),
      }));
      return undefined;
    }

    const timer = setTimeout(() => {
      setQuietState((prev) => ({
        ...prev,
        enabled: false,
        until: null,
        lastReminderAt: Date.now(),
      }));
    }, remaining);

    return () => clearTimeout(timer);
  }, [quietState?.enabled, quietState?.until]);

  const enableQuietMode = (durationMinutes = 120) => {
    const until = Date.now() + durationMinutes * 60 * 1000;
    setQuietState((prev) => ({
      ...prev,
      enabled: true,
      until,
    }));
    setStats((prev) => ({
      ...prev,
      quietSessions: prev.quietSessions + 1,
    }));
  };

  const disableQuietMode = () => {
    setQuietState((prev) => ({
      ...prev,
      enabled: false,
      until: null,
      lastReminderAt: Date.now(),
    }));
  };

  const queueNotification = (notification) => {
    setQuietState((prev) => ({
      ...prev,
      pendingNotifications: [...(prev?.pendingNotifications || []), { id: crypto.randomUUID(), ...notification }],
    }));
  };

  const clearPendingNotifications = () => {
    setQuietState((prev) => ({
      ...prev,
      pendingNotifications: [],
      lastReminderAt: null,
    }));
  };

  const logSessionMinutes = (minutes) => {
    setStats((prev) => ({
      ...prev,
      learningMinutes: prev.learningMinutes + minutes,
    }));
  };

  const logReflection = () => {
    setStats((prev) => ({
      ...prev,
      reflections: prev.reflections + 1,
    }));
  };

  const value = {
    sessionLimitMinutes,
    sessionWarningOffsetMinutes,
    quietState,
    stats,
    isQuietNow,
    enableQuietMode,
    disableQuietMode,
    queueNotification,
    clearPendingNotifications,
    logSessionMinutes,
    logReflection,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return ctx;
};
