import {
  getStoredSessionToken,
  isApiOnlyMode,
  isRecoverableApiError,
  isRemoteAuthEnabled,
  requestIntroVibeApi,
} from "./introVibeApi";

export const USER_SETTINGS_KEY = "userSettings";
export const THEME_MODE_KEY = "isf-theme-mode";

export const DEFAULT_SETTINGS = {
  appearance: {
    theme: "light",
  },
  quietMode: {
    enabled: false,
    startTime: "22:00",
    endTime: "07:00",
    daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  },
  sessionTimer: {
    duration: 30,
    breakReminder: true,
    breakDuration: 5,
    autoStart: false,
    soundEnabled: true,
  },
  notifications: {
    messageAlerts: true,
    matchSuggestions: true,
    systemUpdates: false,
    emailNotifications: false,
    quietHoursRespect: true,
  },
  account: {
    email: "",
    twoFactorEnabled: false,
    dataExportRequested: false,
  },
};

export const mergeSettings = (settings = {}) => ({
  ...DEFAULT_SETTINGS,
  ...settings,
  appearance: {
    ...DEFAULT_SETTINGS.appearance,
    ...(settings?.appearance || {}),
  },
  quietMode: {
    ...DEFAULT_SETTINGS.quietMode,
    ...(settings?.quietMode || {}),
    daysOfWeek: Array.isArray(settings?.quietMode?.daysOfWeek)
      ? settings.quietMode.daysOfWeek
      : DEFAULT_SETTINGS.quietMode.daysOfWeek,
  },
  sessionTimer: {
    ...DEFAULT_SETTINGS.sessionTimer,
    ...(settings?.sessionTimer || {}),
  },
  notifications: {
    ...DEFAULT_SETTINGS.notifications,
    ...(settings?.notifications || {}),
  },
  account: {
    ...DEFAULT_SETTINGS.account,
    ...(settings?.account || {}),
  },
});

export const applyThemeMode = (mode) => {
  const root = document?.documentElement;
  if (!root) return;
  root.classList.toggle("dark", mode === "dark");
};

export const loadLegacySettings = () => {
  try {
    const rawSettings = localStorage.getItem(USER_SETTINGS_KEY);
    if (rawSettings) {
      return mergeSettings(JSON.parse(rawSettings));
    }
  } catch (error) {
    console.error("Failed to load legacy IntroVibe settings", error);
  }

  try {
    const storedTheme = localStorage.getItem(THEME_MODE_KEY);
    return mergeSettings({
      appearance: {
        theme: storedTheme || DEFAULT_SETTINGS.appearance.theme,
      },
    });
  } catch (error) {
    console.error("Failed to load legacy IntroVibe theme", error);
  }

  return mergeSettings();
};

export const persistLegacySettings = (settings) => {
  const nextSettings = mergeSettings(settings);

  try {
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(nextSettings));
    localStorage.setItem(THEME_MODE_KEY, nextSettings.appearance.theme || DEFAULT_SETTINGS.appearance.theme);
  } catch (error) {
    console.error("Failed to persist legacy IntroVibe settings", error);
  }

  return nextSettings;
};

export const shouldUseRemoteSettings = (authMode, currentUserId) =>
  Boolean(currentUserId) &&
  (authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken()));

export const shouldFallbackToLegacySettings = (error) =>
  isRemoteAuthEnabled() && !isApiOnlyMode() && isRecoverableApiError(error);

export const fetchRemoteSettings = async () => {
  const payload = await requestIntroVibeApi("/api/settings");
  return mergeSettings(payload?.settings || {});
};

export const saveRemoteSettings = async (settings) => {
  const payload = await requestIntroVibeApi("/api/settings", {
    method: "PUT",
    body: JSON.stringify({
      settings: mergeSettings(settings),
    }),
  });

  return mergeSettings(payload?.settings || {});
};
