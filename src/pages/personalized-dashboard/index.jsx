import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import QuietModeIndicator from '../../components/ui/QuietModeIndicator';
import NavigationBreadcrumb from '../../components/ui/NavigationBreadcrumb';
import SupportivePrompts from '../../components/ui/SupportivePrompts';
import WelcomeSection from './components/WelcomeSection';
import LearningCard from './components/LearningCard';
import QuickAccessTile from './components/QuickAccessTile';
import ReflectionToolCard from './components/ReflectionToolCard';
import ReflectionToolModal from './components/ReflectionToolModal';
import QuietActivitiesModal from './components/QuietActivitiesModal';
import ActivitySummary from './components/ActivitySummary';
import RecentActivity from './components/RecentActivity';
import Icon from '../../components/AppIcon';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';

const CONVERSATIONS_KEY = 'isfEaseConversations';
const REFLECTION_DATA_KEY = 'isfReflectionData';
const QUIET_ACTIVITY_KEY = 'isfQuietActivities';
const MATCH_COUNT_KEY = 'isf-latest-match-count';
const ADAPTIVE_QUIZ_EVENTS_KEY = 'isfAdaptiveQuizEvents';
const SUPPORTIVE_PROMPTS = [
  { id: 1, text: "What's one thing you want to finish today?", category: 'reflection' },
  { id: 2, text: 'Share a small win from this week.', category: 'celebration' },
  { id: 3, text: 'What helps you stay calm while studying?', category: 'connection' },
  { id: 4, text: 'What is one task you can break into a 10-minute step?', category: 'planning' },
  { id: 5, text: 'Which subject feels easiest to start with right now?', category: 'planning' },
  { id: 6, text: 'What kind of support would help you most today?', category: 'support' },
  { id: 7, text: 'What has been draining your energy lately?', category: 'reflection' },
  { id: 8, text: 'What boundary do you need today to protect your focus?', category: 'self-care' },
  { id: 9, text: 'What is one thing you can postpone without guilt?', category: 'planning' },
  { id: 10, text: 'What did you handle better this week compared to last week?', category: 'celebration' },
  { id: 11, text: 'If you had one calm hour, what would you use it for?', category: 'reflection' },
  { id: 12, text: 'What usually helps you re-focus after distractions?', category: 'self-care' },
  { id: 13, text: 'What conversation are you avoiding, and why?', category: 'connection' },
  { id: 14, text: 'What is one question you want to ask a classmate today?', category: 'connection' },
  { id: 15, text: 'What is your realistic goal before the day ends?', category: 'planning' },
  { id: 16, text: 'What does progress look like for you today, not perfection?', category: 'reflection' },
  { id: 17, text: 'Which environment helps you study with less pressure?', category: 'self-care' },
  { id: 18, text: 'What thought has been repeating in your mind today?', category: 'reflection' },
  { id: 19, text: 'What is one tiny reward you can give yourself after studying?', category: 'celebration' },
  { id: 20, text: 'What kind of check-in message would feel safe to send to someone?', category: 'connection' },
  { id: 21, text: 'What is one thing you can ask help for this week?', category: 'support' },
  { id: 22, text: 'Which deadline matters most, and which can wait?', category: 'planning' },
  { id: 23, text: 'What habit has quietly helped you recently?', category: 'celebration' },
  { id: 24, text: 'If your stress had a message, what would it say?', category: 'reflection' },
  { id: 25, text: 'What simple routine helps you reset your mood?', category: 'self-care' },
  { id: 26, text: 'What topic do you enjoy talking about when you feel safe?', category: 'connection' },
  { id: 27, text: 'What is one study block you can protect today?', category: 'planning' },
  { id: 28, text: 'What would make tomorrow easier than today?', category: 'planning' },
  { id: 29, text: 'What challenge did you survive recently that you forget to credit yourself for?', category: 'celebration' },
  { id: 30, text: 'What does a gentle but productive day look like for you?', category: 'reflection' },
];

const loadLocalJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveLocalJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to persist ${key}`, error);
  }
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Not used yet';
  const now = Date.now();
  const diffMinutes = Math.floor((now - timestamp) / (1000 * 60));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return `${Math.floor(diffMinutes / 1440)}d ago`;
};

const createEmptyReflectionBucket = () => ({
  journal: [],
  moods: [],
  gratitude: [],
});

const toSafeReflectionBucket = (bucket) => ({
  journal: Array.isArray(bucket?.journal) ? bucket.journal : [],
  moods: Array.isArray(bucket?.moods) ? bucket.moods : [],
  gratitude: Array.isArray(bucket?.gratitude) ? bucket.gratitude : [],
});

const getLatestTimestamp = (entries = []) =>
  entries.reduce((latest, entry) => Math.max(latest, entry?.timestamp || 0), 0);

const PersonalizedDashboard = () => {
  const navigate = useNavigate();
  const [showPrompts, setShowPrompts] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [reflectionSectionPulse, setReflectionSectionPulse] = useState(false);
  const [reflectionData, setReflectionData] = useState(() =>
    loadLocalJson(REFLECTION_DATA_KEY, {})
  );
  const [activeReflectionTool, setActiveReflectionTool] = useState(null);
  const [showQuietActivities, setShowQuietActivities] = useState(false);
  const [quietActivityData, setQuietActivityData] = useState(() =>
    loadLocalJson(QUIET_ACTIVITY_KEY, {})
  );
  const reflectionSectionRef = useRef(null);

  const {
    quietState,
    isQuietNow,
    clearPendingNotifications,
    stats,
    logReflection,
    logSessionMinutes,
  } = useAppState();
  const { currentUser, users } = useAuth();

  useEffect(() => {
    const handleRefresh = () => setRefreshVersion((value) => value + 1);
    window.addEventListener('isf-conversations-updated', handleRefresh);
    window.addEventListener('isf-new-matches', handleRefresh);
    window.addEventListener('isf-activity-updated', handleRefresh);
    return () => {
      window.removeEventListener('isf-conversations-updated', handleRefresh);
      window.removeEventListener('isf-new-matches', handleRefresh);
      window.removeEventListener('isf-activity-updated', handleRefresh);
    };
  }, []);

  useEffect(() => {
    saveLocalJson(REFLECTION_DATA_KEY, reflectionData);
  }, [reflectionData]);

  useEffect(() => {
    saveLocalJson(QUIET_ACTIVITY_KEY, quietActivityData);
  }, [quietActivityData]);

  const userReflectionBucket = useMemo(() => {
    if (!currentUser?.id) return createEmptyReflectionBucket();
    return toSafeReflectionBucket(reflectionData?.[currentUser.id]);
  }, [reflectionData, currentUser]);

  const userQuietActivities = useMemo(() => {
    if (!currentUser?.id) return [];
    const entries = quietActivityData?.[currentUser.id];
    return Array.isArray(entries) ? entries : [];
  }, [quietActivityData, currentUser]);

  const conversations = useMemo(() => {
    const allConversations = loadLocalJson(CONVERSATIONS_KEY, {});
    return Object.values(allConversations).filter((conversation) =>
      (conversation?.participants || []).includes(currentUser?.id)
    );
  }, [refreshVersion, currentUser]);

  const connectionCount = useMemo(
    () => conversations.filter((conversation) => (conversation?.messages || []).length > 0).length,
    [conversations]
  );

  const unreadCount = useMemo(
    () =>
      conversations.reduce((sum, conversation) => {
        const unreadInConversation = (conversation?.messages || []).filter(
          (message) =>
            currentUser?.id &&
            message.senderId !== currentUser.id &&
            !(message.readBy || []).includes(currentUser.id)
        ).length;
        return sum + unreadInConversation;
      }, 0),
    [conversations, currentUser]
  );

  const newMatchCount = useMemo(() => {
    try {
      const value = sessionStorage.getItem(MATCH_COUNT_KEY);
      const parsed = value ? parseInt(value, 10) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }, [refreshVersion]);

  const learningHours = useMemo(
    () => ((stats?.learningMinutes || 0) / 60).toFixed(1),
    [stats]
  );

  const learningOptions = [
    {
      id: 1,
      title: 'Continue Learning',
      description: 'Jump back into your adaptive quiz and continue your progress.',
      iconName: 'BookOpen',
      iconColor: 'var(--color-accent)',
      path: '/adaptive-quiz',
      isActive: true,
    },
    {
      id: 2,
      title: 'Reflection Tools',
      description: 'Open simple tools to journal, track mood, and keep your thoughts organized.',
      iconName: 'PenTool',
      iconColor: 'var(--color-secondary)',
      path: '/personalized-dashboard',
      isActive: true,
    },
    {
      id: 3,
      title: 'Quiet Activities',
      description: 'Use low-pressure activities designed for focused solo sessions.',
      iconName: 'Sparkles',
      iconColor: 'var(--color-primary)',
      path: '/personalized-dashboard',
      isActive: true,
    },
  ];

  const reflectionToolBase = [
    {
      id: 1,
      title: 'Daily Journal',
      description: 'Write freely about your thoughts and current study experience.',
      iconName: 'BookText',
      iconColor: 'var(--color-secondary)',
    },
    {
      id: 2,
      title: 'Mood Tracker',
      description: 'Log your mood to spot patterns and understand your energy level.',
      iconName: 'Heart',
      iconColor: 'var(--color-accent)',
    },
    {
      id: 3,
      title: 'Gratitude Log',
      description: 'Capture small wins and helpful moments from your day.',
      iconName: 'Smile',
      iconColor: 'var(--color-success)',
    },
  ];

  const latestReflectionTimestamps = useMemo(
    () => ({
      1: getLatestTimestamp(userReflectionBucket.journal),
      2: getLatestTimestamp(userReflectionBucket.moods),
      3: getLatestTimestamp(userReflectionBucket.gratitude),
    }),
    [userReflectionBucket]
  );

  const reflectionTools = useMemo(
    () =>
      reflectionToolBase.map((tool) => ({
        ...tool,
        lastUsed: latestReflectionTimestamps[tool.id]
          ? formatRelativeTime(latestReflectionTimestamps[tool.id])
          : null,
      })),
    [latestReflectionTimestamps]
  );

  const activityStats = [
    {
      label: 'Learning Hours',
      value: learningHours,
      icon: 'Clock',
      color: 'var(--color-accent)',
      meta: `${Math.round(stats?.learningMinutes || 0)} total minutes`,
    },
    {
      label: 'Connections',
      value: `${connectionCount}`,
      icon: 'Users',
      color: 'var(--color-success)',
      meta: `${unreadCount} unread conversations`,
    },
    {
      label: 'Reflections',
      value: `${stats?.reflections || 0}`,
      icon: 'PenTool',
      color: 'var(--color-secondary)',
      meta: 'completed entries',
    },
    {
      label: 'Quiet Sessions',
      value: `${stats?.quietSessions || 0}`,
      icon: 'Moon',
      color: 'var(--color-primary)',
      meta: isQuietNow ? 'quiet mode is active' : 'quiet mode is inactive',
    },
  ];

  const quickAccessOptions = [
    {
      id: 1,
      title: 'Connect Gently',
      subtitle: 'Find matches with shared interests',
      iconName: 'Users',
      iconColor: 'var(--color-success)',
      path: '/find-matches-conversations',
      badge: newMatchCount > 0 ? `${newMatchCount} new` : null,
    },
    {
      id: 2,
      title: 'Conversations',
      subtitle: 'Low-pressure messaging space',
      iconName: 'MessageCircle',
      iconColor: 'var(--color-primary)',
      path: '/find-matches-conversations',
      badge: unreadCount > 0 ? `${unreadCount} unread` : null,
    },
    {
      id: 3,
      title: 'Settings',
      subtitle: 'Adjust quiet mode and limits',
      iconName: 'Settings',
      iconColor: 'var(--color-accent)',
      path: '/settings',
    },
  ];

  const recentActivities = useMemo(() => {
    const userMap = users.reduce((map, user) => {
      map[user.id] = user.username;
      return map;
    }, {});

    const conversationEvents = conversations
      .flatMap((conversation) => {
        const peerId = (conversation?.participants || []).find((id) => id !== currentUser?.id);
        const peerName = userMap[peerId] || 'a peer';
        return (conversation?.messages || []).map((message) => ({
          type: 'conversation',
          description:
            message.senderId === currentUser?.id
              ? `You sent a message to ${peerName}`
              : `${peerName} sent you a message`,
          timestamp: message.timestamp,
        }));
      });

    const reflectionEvents = [
      ...userReflectionBucket.journal.map((entry) => ({
        type: 'reflection',
        description: 'Added a Daily Journal entry',
        timestamp: entry.timestamp,
      })),
      ...userReflectionBucket.moods.map((entry) => ({
        type: 'reflection',
        description: `Logged mood: ${entry?.mood || 'Mood Tracker'}`,
        timestamp: entry.timestamp,
      })),
      ...userReflectionBucket.gratitude.map((entry) => ({
        type: 'reflection',
        description: 'Added a Gratitude Log entry',
        timestamp: entry.timestamp,
      })),
    ];

    const quietActivityEvents = userQuietActivities.map((entry) => ({
      type: 'quiet',
      description: `Completed quiet activity: ${entry?.title || 'Quiet activity'}`,
      timestamp: entry.timestamp,
    }));

    const quizActivityStore = loadLocalJson(ADAPTIVE_QUIZ_EVENTS_KEY, {});
    const userQuizEvents = Array.isArray(quizActivityStore?.[currentUser?.id])
      ? quizActivityStore[currentUser.id]
      : [];
    const quizEvents = userQuizEvents.map((entry) => ({
      type: 'learning',
      description: entry?.description || 'Adaptive quiz activity',
      timestamp: entry?.timestamp,
    }));

    const sorted = [...conversationEvents, ...reflectionEvents, ...quietActivityEvents, ...quizEvents]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 6);

    return sorted;
  }, [conversations, userReflectionBucket, userQuietActivities, users, currentUser, refreshVersion]);

  const handlePromptSelect = (prompt) => {
    setShowPrompts(false);
    const promptText = typeof prompt?.text === 'string' ? prompt.text.trim() : '';
    navigate('/find-matches-conversations', {
      state: promptText ? { initialPrompt: promptText } : undefined,
    });
  };

  const handlePromptSkip = () => {
    setShowPrompts(false);
  };

  const handleReflectionToolClick = (tool) => {
    setActiveReflectionTool(tool);
  };

  const handleOpenReflectionTools = () => {
    reflectionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setReflectionSectionPulse(true);
    window.setTimeout(() => setReflectionSectionPulse(false), 1400);
  };

  const handleOpenQuietActivities = () => {
    setShowQuietActivities(true);
  };

  const handleCompleteQuietActivity = ({ title, minutesSpent, notes, activityId }) => {
    if (!currentUser?.id) return;
    const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
    const entry = {
      id: crypto.randomUUID(),
      activityId,
      title,
      minutesSpent: Number(minutesSpent) || 0,
      notes: trimmedNotes,
      timestamp: Date.now(),
    };

    setQuietActivityData((prev) => {
      const existing = Array.isArray(prev?.[currentUser.id]) ? prev[currentUser.id] : [];
      return {
        ...prev,
        [currentUser.id]: [entry, ...existing].slice(0, 50),
      };
    });

    if (logSessionMinutes && entry.minutesSpent > 0) {
      logSessionMinutes(entry.minutesSpent);
    }
  };

  const handleSaveReflectionEntry = (entryPayload) => {
    if (!currentUser?.id || !activeReflectionTool?.id) return;

    const now = Date.now();
    const entry = {
      id: crypto.randomUUID(),
      timestamp: now,
      ...entryPayload,
    };

    setReflectionData((prev) => {
      const existingBucket = toSafeReflectionBucket(prev?.[currentUser.id]);
      let updatedBucket = existingBucket;

      if (activeReflectionTool.id === 1) {
        updatedBucket = { ...existingBucket, journal: [entry, ...existingBucket.journal] };
      } else if (activeReflectionTool.id === 2) {
        updatedBucket = { ...existingBucket, moods: [entry, ...existingBucket.moods] };
      } else if (activeReflectionTool.id === 3) {
        updatedBucket = { ...existingBucket, gratitude: [entry, ...existingBucket.gratitude] };
      }

      return {
        ...prev,
        [currentUser.id]: updatedBucket,
      };
    });

    if (logReflection) logReflection();
    setActiveReflectionTool(null);
  };

  const activeReflectionEntries = useMemo(() => {
    if (!activeReflectionTool?.id) return [];
    if (activeReflectionTool.id === 1) return userReflectionBucket.journal;
    if (activeReflectionTool.id === 2) return userReflectionBucket.moods;
    if (activeReflectionTool.id === 3) return userReflectionBucket.gratitude;
    return [];
  }, [activeReflectionTool, userReflectionBucket]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/35">
      <Header />
      <NavigationBreadcrumb />
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-10">
        <WelcomeSection
          userName={currentUser?.username || 'Friend'}
          currentTime={new Date()}
        />

        {!isQuietNow && quietState?.pendingNotifications?.length > 0 && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-4 mb-6 flex items-start space-x-3 transition-gentle">
            <Icon name="Inbox" size={20} color="var(--color-success)" />
            <div>
              <p className="text-success font-body text-sm mb-1">
                You have {quietState.pendingNotifications.length} saved message(s) from Quiet Mode.
              </p>
              <button
                className="text-primary caption hover:underline"
                onClick={clearPendingNotifications}
              >
                Mark as seen
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
          <div className="xl:col-span-2 space-y-6 md:space-y-8">
            <section className="bg-card/70 rounded-xl border border-border p-4 md:p-6">
              <div className="flex items-center justify-between mb-5 gap-4">
                <h2 className="text-xl md:text-2xl font-heading font-semibold text-foreground">
                  Learn at Your Pace
                </h2>
                <QuietModeIndicator />
              </div>
              <div className="space-y-4">
                {learningOptions.map((option) => (
                  <LearningCard
                    key={option.id}
                    title={option.title}
                    description={option.description}
                    iconName={option.iconName}
                    iconColor={option.iconColor}
                    path={option.path}
                    isActive={option.isActive}
                    onClick={
                      option.id === 2
                        ? handleOpenReflectionTools
                        : option.id === 3
                          ? handleOpenQuietActivities
                          : undefined
                    }
                  />
                ))}
              </div>
            </section>

            {showPrompts && (
              <SupportivePrompts
                prompts={SUPPORTIVE_PROMPTS}
                onSelect={handlePromptSelect}
                onSkip={handlePromptSkip}
              />
            )}

            <section
              ref={reflectionSectionRef}
              className={`bg-card/70 rounded-xl border p-4 md:p-6 transition-gentle ${
                reflectionSectionPulse ? 'border-primary shadow-gentle-md' : 'border-border'
              }`}
            >
              <h2 className="text-xl md:text-2xl font-heading font-semibold text-foreground mb-5">
                Reflection Space
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reflectionTools.map((tool) => (
                  <ReflectionToolCard
                    key={tool.id}
                    title={tool.title}
                    description={tool.description}
                    iconName={tool.iconName}
                    iconColor={tool.iconColor}
                    lastUsed={tool.lastUsed}
                    onClick={() => handleReflectionToolClick(tool)}
                  />
                ))}
              </div>
            </section>

            <ActivitySummary stats={activityStats} />
          </div>

          <div className="space-y-6 md:space-y-8">
            <section className="bg-card/70 rounded-xl border border-border p-4 md:p-6">
              <div className="mb-4">
                <h2 className="text-xl md:text-2xl font-heading font-semibold text-foreground">
                  Quick Access
                </h2>
                <p className="caption text-xs text-muted-foreground">
                  Go directly to the sections you use most.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {quickAccessOptions.map((option) => (
                  <QuickAccessTile
                    key={option.id}
                    title={option.title}
                    subtitle={option.subtitle}
                    iconName={option.iconName}
                    iconColor={option.iconColor}
                    path={option.path}
                    badge={option.badge}
                  />
                ))}
              </div>
            </section>

            <RecentActivity activities={recentActivities} />

            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 border border-border">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="Info" size={20} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground mb-2">
                    Gentle Reminder
                  </h3>
                  <p className="caption text-muted-foreground text-sm leading-relaxed">
                    Keep your pace steady. Data updates live based on your real usage and conversations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {activeReflectionTool && (
        <ReflectionToolModal
          tool={activeReflectionTool}
          entries={activeReflectionEntries}
          onClose={() => setActiveReflectionTool(null)}
          onSave={handleSaveReflectionEntry}
        />
      )}

      {showQuietActivities && (
        <QuietActivitiesModal
          entries={userQuietActivities}
          onClose={() => setShowQuietActivities(false)}
          onComplete={handleCompleteQuietActivity}
        />
      )}
    </div>
  );
};

export default PersonalizedDashboard;
