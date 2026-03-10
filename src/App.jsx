import React from "react";
import Routes from "./Routes";
import { AppStateProvider, useAppState } from "./context/AppStateContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import SessionTimer from "./components/ui/SessionTimer";

const USER_SETTINGS_KEY = "userSettings";
const THEME_MODE_KEY = "isf-theme-mode";

const applyThemeMode = (mode) => {
  const root = document?.documentElement;
  if (!root) return;
  root.classList.toggle("dark", mode === "dark");
};

const AppContent = () => {
  const { currentUser, sessionAuthenticated } = useAuth();
  const [showTimer, setShowTimer] = React.useState(true);
  const { logSessionMinutes } = useAppState();

  React.useEffect(() => {
    const applyStoredTheme = () => {
      try {
        const storedSettings = localStorage.getItem(USER_SETTINGS_KEY);
        const parsed = storedSettings ? JSON.parse(storedSettings) : null;
        const mode =
          localStorage.getItem(THEME_MODE_KEY) ||
          parsed?.appearance?.theme ||
          "light";
        applyThemeMode(mode);
      } catch {
        applyThemeMode("light");
      }
    };

    applyStoredTheme();
    window.addEventListener("isf-theme-updated", applyStoredTheme);
    return () =>
      window.removeEventListener("isf-theme-updated", applyStoredTheme);
  }, []);

  return (
    <>
      <Routes />
      {currentUser && sessionAuthenticated && showTimer && (
        <SessionTimer
          initialMinutes={30}
          onWarning={() =>
            alert("5 minutes remaining in your 30-minute focus session.")
          }
          onSessionEnd={() =>
            alert("Session ended. Take a breather. Progress saved.")
          }
          onSaveProgress={(minutesSpent) => {
            if (minutesSpent && logSessionMinutes) {
              logSessionMinutes(minutesSpent);
            }
            setShowTimer(false);
          }}
        />
      )}
      {currentUser && sessionAuthenticated && !showTimer && (
        <button
          className="fixed bottom-6 right-6 z-[199] px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-gentle hover:shadow-gentle-md transition-gentle"
          onClick={() => setShowTimer(true)}
        >
          Start focus session
        </button>
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </AuthProvider>
  );
}

export default App;
