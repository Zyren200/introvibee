import React from "react";
import Routes from "./Routes";
import { AppStateProvider } from "./context/AppStateContext";
import { IntroVibeAuthProvider, useIntroVibeAuth } from "./introVibeAuth";
import {
  getStoredSessionToken,
  isApiOnlyMode,
  isRecoverableApiError,
  isRemoteAuthEnabled,
  requestIntroVibeApi,
} from "./lib/introVibeApi";
import { applyThemeMode, loadLegacySettings } from "./lib/introVibeSettings";

const AppContent = () => {
  const { currentUser, authMode, authReady } = useIntroVibeAuth();

  React.useEffect(() => {
    let cancelled = false;

    const syncTheme = async () => {
      if (!authReady) {
        return;
      }

      const shouldUseRemoteTheme = Boolean(currentUser?.id) && (
        authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken())
      );

      if (shouldUseRemoteTheme) {
        try {
          const payload = await requestIntroVibeApi("/api/settings");
          if (!cancelled) {
            applyThemeMode(payload?.settings?.appearance?.theme || "light");
          }
          return;
        } catch (error) {
          if (!(isRemoteAuthEnabled() && !isApiOnlyMode() && isRecoverableApiError(error))) {
            if (!cancelled) {
              applyThemeMode("light");
            }
            return;
          }
        }
      }

      if (!cancelled) {
        const legacySettings = loadLegacySettings();
        applyThemeMode(legacySettings?.appearance?.theme || "light");
      }
    };

    syncTheme();
    window.addEventListener("isf-theme-updated", syncTheme);
    return () => {
      cancelled = true;
      window.removeEventListener("isf-theme-updated", syncTheme);
    };
  }, [authMode, authReady, currentUser?.id]);

  return <Routes />;
};

function App() {
  return (
    <IntroVibeAuthProvider>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </IntroVibeAuthProvider>
  );
}

export default App;
