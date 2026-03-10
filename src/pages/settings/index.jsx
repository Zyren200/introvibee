import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import QuietModeSection from './components/QuietModeSection';
import SessionTimerSection from './components/SessionTimerSection';
import NotificationSection from './components/NotificationSection';
import AccountSecuritySection from './components/AccountSecuritySection';
import AppearanceSection from './components/AppearanceSection';
import Button from '../../components/ui/Button';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';

const USER_SETTINGS_KEY = 'userSettings';
const THEME_MODE_KEY = 'isf-theme-mode';

const applyThemeMode = (mode) => {
  const root = document?.documentElement;
  if (!root) return;
  root.classList.toggle('dark', mode === 'dark');
};

const defaultSettings = {
  appearance: {
    theme: 'light'
  },
  quietMode: {
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  sessionTimer: {
    duration: 30,
    breakReminder: true,
    breakDuration: 5,
    autoStart: false,
    soundEnabled: true
  },
  notifications: {
    messageAlerts: true,
    matchSuggestions: true,
    systemUpdates: false,
    emailNotifications: false,
    quietHoursRespect: true
  },
  account: {
    email: '',
    twoFactorEnabled: false,
    dataExportRequested: false
  }
};

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(defaultSettings);

  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const { enableQuietMode, disableQuietMode } = useAppState();
  const { currentUser, deleteAccount } = useAuth();

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(USER_SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const merged = {
          ...defaultSettings,
          ...parsed,
          appearance: { ...defaultSettings.appearance, ...(parsed?.appearance || {}) },
          quietMode: { ...defaultSettings.quietMode, ...(parsed?.quietMode || {}) },
          sessionTimer: { ...defaultSettings.sessionTimer, ...(parsed?.sessionTimer || {}) },
          notifications: { ...defaultSettings.notifications, ...(parsed?.notifications || {}) },
          account: { ...defaultSettings.account, ...(parsed?.account || {}) }
        };
        setSettings(merged);
        applyThemeMode(merged?.appearance?.theme || 'light');
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    } else {
      const storedTheme = localStorage.getItem(THEME_MODE_KEY) || 'light';
      applyThemeMode(storedTheme);
    }
  }, []);

  const updateSettings = (section, updates) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        ...updates
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(THEME_MODE_KEY, settings?.appearance?.theme || 'light');
    applyThemeMode(settings?.appearance?.theme || 'light');
    window.dispatchEvent(new Event('isf-theme-updated'));
    setHasChanges(false);
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 3000);

    // Apply quiet mode immediately when toggled on in settings for 2 hours (aligns with spec).
    if (settings?.quietMode?.enabled) {
      enableQuietMode(120);
    } else {
      disableQuietMode();
    }
  };

  const handleReset = () => {
    const savedSettings = localStorage.getItem(USER_SETTINGS_KEY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      const merged = {
        ...defaultSettings,
        ...parsed,
        appearance: { ...defaultSettings.appearance, ...(parsed?.appearance || {}) },
        quietMode: { ...defaultSettings.quietMode, ...(parsed?.quietMode || {}) },
        sessionTimer: { ...defaultSettings.sessionTimer, ...(parsed?.sessionTimer || {}) },
        notifications: { ...defaultSettings.notifications, ...(parsed?.notifications || {}) },
        account: { ...defaultSettings.account, ...(parsed?.account || {}) }
      };
      setSettings(merged);
      applyThemeMode(merged?.appearance?.theme || 'light');
    } else {
      setSettings(defaultSettings);
      applyThemeMode(defaultSettings?.appearance?.theme || 'light');
    }
    setHasChanges(false);
  };

  const handleDeleteAccount = () => {
    const result = deleteAccount();
    if (!result?.success) {
      return result;
    }

    setSettings(defaultSettings);
    setHasChanges(false);
    setShowSaveConfirmation(false);
    navigate('/login-personal-info');
    return result;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Settings" size={20} color="var(--color-primary)" />
            </div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">
              Settings
            </h1>
          </div>
          <p className="text-muted-foreground font-body">
            Customize your learning environment to match your preferences and comfort level
          </p>
        </div>

        {showSaveConfirmation && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center space-x-3 transition-gentle">
            <Icon name="CheckCircle" size={20} color="var(--color-success)" />
            <span className="text-success font-body">Settings saved successfully!</span>
          </div>
        )}

        <div className="space-y-6">
          <AppearanceSection
            settings={settings?.appearance}
            onUpdate={(updates) => updateSettings('appearance', updates)}
          />

          <QuietModeSection 
            settings={settings?.quietMode}
            onUpdate={(updates) => updateSettings('quietMode', updates)}
          />

          <SessionTimerSection 
            settings={settings?.sessionTimer}
            onUpdate={(updates) => updateSettings('sessionTimer', updates)}
          />

          <NotificationSection 
            settings={settings?.notifications}
            onUpdate={(updates) => updateSettings('notifications', updates)}
          />

          <AccountSecuritySection 
            settings={settings?.account}
            accountEmail={currentUser?.email}
            onDeleteAccount={handleDeleteAccount}
            onUpdate={(updates) => updateSettings('account', updates)}
          />
        </div>

        {hasChanges && (
          <div className="sticky bottom-6 mt-8 p-4 bg-card border border-border rounded-lg shadow-gentle-lg flex items-center justify-between">
            <div className="flex items-center space-x-2 text-muted-foreground caption">
              <Icon name="AlertCircle" size={16} color="var(--color-muted-foreground)" />
              <span>You have unsaved changes</span>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button
                variant="default"
                iconName="Save"
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
