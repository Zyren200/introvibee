import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useIntroVibeAuth } from '../introVibeAuth';
import {
  getStoredSessionToken,
  isApiOnlyMode,
  isRecoverableApiError,
  isRemoteAuthEnabled,
  requestIntroVibeApi,
} from '../lib/introVibeApi';
import {
  DEFAULT_QUIET_STATE,
  DEFAULT_STATS,
  loadLegacyQuietState,
  loadLegacyStats,
  normalizeQuietState,
  normalizeStats,
  persistLegacyQuietState,
  persistLegacyStats,
} from '../lib/introVibeAppState';

const AppStateContext = createContext(null);

const createSnapshot = (stats, quietState) =>
  JSON.stringify({
    stats: normalizeStats(stats),
    quietState: normalizeQuietState(quietState),
  });

export const AppStateProvider = ({ children }) => {
  const { currentUser, authMode, authReady } = useIntroVibeAuth();
  const [quietState, setQuietState] = useState(loadLegacyQuietState);
  const [stats, setStats] = useState(loadLegacyStats);
  const [storageMode, setStorageMode] = useState('legacy-local');
  const [syncError, setSyncError] = useState(null);
  const lastRemoteSnapshotRef = useRef(createSnapshot(DEFAULT_STATS, DEFAULT_QUIET_STATE));

  const sessionLimitMinutes = 30;
  const sessionWarningOffsetMinutes = 5;

  const isQuietNow = useMemo(() => {
    if (!quietState?.enabled) return false;
    if (!quietState?.until) return true;
    return Date.now() < quietState.until;
  }, [quietState]);

  const shouldUseRemoteState = Boolean(currentUser?.id) && (
    authMode === 'railway-api' || (isRemoteAuthEnabled() && getStoredSessionToken())
  );

  useEffect(() => {
    if (!authReady) return undefined;

    if (!currentUser?.id) {
      if (isApiOnlyMode()) {
        setStats({ ...DEFAULT_STATS });
        setQuietState({ ...DEFAULT_QUIET_STATE });
        setStorageMode('railway-api');
      } else {
        setStats(loadLegacyStats());
        setQuietState(loadLegacyQuietState());
        setStorageMode('legacy-local');
      }
      setSyncError(null);
      return undefined;
    }

    if (!shouldUseRemoteState) {
      setStats(loadLegacyStats());
      setQuietState(loadLegacyQuietState());
      setStorageMode('legacy-local');
      setSyncError(null);
      return undefined;
    }

    let cancelled = false;

    const hydrateRemoteState = async () => {
      try {
        const payload = await requestIntroVibeApi('/api/app-state');
        if (cancelled) return;

        const nextStats = normalizeStats(payload?.stats || DEFAULT_STATS);
        const nextQuietState = normalizeQuietState(payload?.quietState || DEFAULT_QUIET_STATE);
        lastRemoteSnapshotRef.current = createSnapshot(nextStats, nextQuietState);
        setStats(nextStats);
        setQuietState(nextQuietState);
        setStorageMode('railway-api');
        setSyncError(null);
      } catch (error) {
        if (cancelled) return;

        if (isRemoteAuthEnabled() && !isApiOnlyMode() && isRecoverableApiError(error)) {
          setStats(loadLegacyStats());
          setQuietState(loadLegacyQuietState());
          setStorageMode('legacy-local');
          setSyncError(null);
          return;
        }

        setStorageMode('railway-api');
        setSyncError(error.message);
      }
    };

    hydrateRemoteState();

    return () => {
      cancelled = true;
    };
  }, [authReady, authMode, currentUser?.id, shouldUseRemoteState]);

  useEffect(() => {
    if (storageMode !== 'legacy-local') return;
    persistLegacyQuietState(quietState);
  }, [quietState, storageMode]);

  useEffect(() => {
    if (storageMode !== 'legacy-local') return;
    persistLegacyStats(stats);
  }, [stats, storageMode]);

  const remoteSnapshot = useMemo(() => createSnapshot(stats, quietState), [stats, quietState]);

  useEffect(() => {
    if (storageMode !== 'railway-api' || !authReady || !currentUser?.id) return undefined;
    if (lastRemoteSnapshotRef.current === remoteSnapshot) return undefined;

    const timer = setTimeout(async () => {
      try {
        const payload = await requestIntroVibeApi('/api/app-state', {
          method: 'PUT',
          body: remoteSnapshot,
        });

        const nextStats = normalizeStats(payload?.stats || stats);
        const nextQuietState = normalizeQuietState(payload?.quietState || quietState);
        const nextSnapshot = createSnapshot(nextStats, nextQuietState);
        lastRemoteSnapshotRef.current = nextSnapshot;
        setSyncError(null);

        if (nextSnapshot !== remoteSnapshot) {
          setStats(nextStats);
          setQuietState(nextQuietState);
        }
      } catch (error) {
        if (isRemoteAuthEnabled() && !isApiOnlyMode() && isRecoverableApiError(error)) {
          setStorageMode('legacy-local');
          persistLegacyStats(stats);
          persistLegacyQuietState(quietState);
          setSyncError(null);
          return;
        }

        setSyncError(error.message);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [authReady, currentUser?.id, quietState, remoteSnapshot, stats, storageMode]);

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
      pendingNotifications: [
        ...(prev?.pendingNotifications || []),
        {
          id: crypto.randomUUID(),
          ...notification,
        },
      ],
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
      learningMinutes: prev.learningMinutes + Number(minutes || 0),
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
    storageMode,
    syncError,
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
