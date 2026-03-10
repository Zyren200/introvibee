import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import QuietModeIndicator from '../../components/ui/QuietModeIndicator';
import NavigationBreadcrumb from '../../components/ui/NavigationBreadcrumb';
import MatchCard from './components/MatchCard';
import ConversationThread from './components/ConversationThread';
import MessageComposer from './components/MessageComposer';
import MessageBubble from './components/MessageBubble';
import EmptyState from './components/EmptyState';
import FilterPanel from './components/FilterPanel';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';

const CONVERSATIONS_KEY = 'isfEaseConversations';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const createDefaultMatchFilters = () => ({
  interests: [],
  personalityTags: [],
  availability: [],
  compatibilityRange: [70, 100],
});

const normalizeText = (value) => (value || '').toString().trim().toLowerCase();

const loadConversations = () => {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load conversations', error);
  }
  return {};
};

const saveConversations = (data) => {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('isf-conversations-updated'));
    }
  } catch (error) {
    console.error('Failed to save conversations', error);
  }
};

const getConversationKey = (a, b) => [a, b].sort().join(':');

const defaultAvatar = (seed) =>
  `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed || 'calm')}`;

const FindMatchesConversations = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isQuietNow, queueNotification, quietState, clearPendingNotifications } = useAppState();
  const { currentUser, users, isUserOnline, presenceVersion } = useAuth();

  const [activeTab, setActiveTab] = useState('discover');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedPeerId, setSelectedPeerId] = useState(null);
  const [savedMessageBanner, setSavedMessageBanner] = useState(null);
  const [conversations, setConversations] = useState(loadConversations);
  const [matchResults, setMatchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [composerPrefill, setComposerPrefill] = useState('');
  const [appliedFilters, setAppliedFilters] = useState(createDefaultMatchFilters);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login-personal-info');
    }
  }, [currentUser, navigate]);

  const peers = useMemo(
    () => users?.filter((u) => u?.id !== currentUser?.id) || [],
    [users, currentUser]
  );

  const normalize = (arr) =>
    (arr || [])
      .map((v) => (v || '').toString().trim().toLowerCase())
      .filter(Boolean);

  const calcMatchScore = (peer) => {
    const userInterests = normalize(currentUser?.interests);
    const userTags = normalize(currentUser?.tags);
    const peerInterests = normalize(peer?.interests);
    const peerTags = normalize(peer?.tags);

    const sharedInterests = userInterests.filter((i) => peerInterests.includes(i));
    const sharedTags = userTags.filter((t) => peerTags.includes(t));

    const interestScore =
      userInterests.length && peerInterests.length
        ? (sharedInterests.length / Math.max(userInterests.length, peerInterests.length)) * 100
        : 0;
    const tagScore =
      userTags.length && peerTags.length
        ? (sharedTags.length / Math.max(userTags.length, peerTags.length)) * 100
        : 0;

    const overall =
      userInterests.length && userTags.length
        ? Math.round((interestScore + tagScore) / 2)
        : Math.round(Math.max(interestScore, tagScore));

    return {
      sharedInterests,
      sharedTags,
      score: overall,
    };
  };

  const handleFindMatches = () => {
    setHasSearched(true);
    const results = peers
      .map((peer) => {
        const match = calcMatchScore(peer);
        return { peer, match };
      })
      .filter(({ match }) => match.sharedInterests.length > 0 && match.sharedTags.length > 0)
      .map(({ peer, match }) => ({
        ...peer,
        compatibilityScore: match.score || 90,
        sharedInterests: match.sharedInterests,
        personalityTags: match.sharedTags,
      }))
      .sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));
    setMatchResults(results);
    try {
      sessionStorage.setItem('isf-latest-match-count', results.length?.toString());
    } catch (e) {
      console.error('Unable to store match count', e);
    }
    window.dispatchEvent(new CustomEvent('isf-new-matches', { detail: { count: results.length } }));
  };

  const filteredMatchResults = useMemo(() => {
    if (!matchResults.length) return [];

    const interestFilters = (appliedFilters?.interests || []).map(normalizeText).filter(Boolean);
    const personalityFilters = (appliedFilters?.personalityTags || []).map(normalizeText).filter(Boolean);
    const availabilityFilters = (appliedFilters?.availability || []).map(normalizeText).filter(Boolean);
    const [minCompatibility = 0, maxCompatibility = 100] = appliedFilters?.compatibilityRange || [0, 100];
    const hasCompatibilityOverride =
      minCompatibility !== 70 || maxCompatibility !== 100;

    return matchResults.filter((match) => {
      const sharedInterests = (match?.sharedInterests || []).map(normalizeText);
      const sharedTags = (match?.personalityTags || []).map(normalizeText);

      const matchesInterestFilter =
        interestFilters.length === 0 ||
        sharedInterests.some((interest) => interestFilters.includes(interest));

      const matchesPersonalityFilter =
        personalityFilters.length === 0 ||
        sharedTags.some((tag) => personalityFilters.includes(tag));

      const compatibilityScore = Number(match?.compatibilityScore) || 0;
      const matchesCompatibility =
        !hasCompatibilityOverride ||
        (compatibilityScore >= minCompatibility && compatibilityScore <= maxCompatibility);

      const isActiveToday = (() => {
        const lastActiveAt = match?.presence?.lastActiveAt || match?.presence?.lastLogoutAt;
        return Number.isFinite(lastActiveAt) && Date.now() - lastActiveAt <= ONE_DAY_MS;
      })();

      const respondsWithin24h = (() => {
        if (!currentUser?.id || !match?.id) return false;
        const key = getConversationKey(currentUser.id, match.id);
        const lastUpdated = conversations?.[key]?.lastUpdated;
        return Number.isFinite(lastUpdated) && Date.now() - lastUpdated <= ONE_DAY_MS;
      })();

      const matchesAvailabilityFilter =
        availabilityFilters.length === 0 ||
        availabilityFilters.some((filterOption) => {
          if (filterOption === 'available now') return isUserOnline(match);
          if (filterOption === 'active today') return isActiveToday;
          if (filterOption === 'responds within 24h') return respondsWithin24h;
          return false;
        });

      return (
        matchesInterestFilter &&
        matchesPersonalityFilter &&
        matchesCompatibility &&
        matchesAvailabilityFilter
      );
    });
  }, [matchResults, appliedFilters, currentUser, conversations, isUserOnline]);

  const hasActiveFilters = useMemo(() => {
    const hasCompatibilityOverride =
      (appliedFilters?.compatibilityRange?.[0] ?? 70) !== 70 ||
      (appliedFilters?.compatibilityRange?.[1] ?? 100) !== 100;
    return (
      (appliedFilters?.interests?.length || 0) > 0 ||
      (appliedFilters?.personalityTags?.length || 0) > 0 ||
      (appliedFilters?.availability?.length || 0) > 0 ||
      hasCompatibilityOverride
    );
  }, [appliedFilters]);

  const getConversation = (peerId) => {
    const key = getConversationKey(currentUser?.id, peerId);
    return conversations?.[key] || { messages: [], participants: [currentUser?.id, peerId] };
  };

  const upsertConversation = (peerId, updater) => {
    setConversations((prev) => {
      const key = getConversationKey(currentUser?.id, peerId);
      const existing = prev?.[key] || { messages: [], participants: [currentUser?.id, peerId] };
      const updated = updater(existing);
      return { ...prev, [key]: { ...existing, ...updated, participants: existing.participants } };
    });
  };

  const addMessage = (peerId, senderId, content, options = {}) => {
    const status = getConversation(peerId)?.status || 'active';
    if (status === 'blocked' || status === 'restricted') {
      setSavedMessageBanner(`Cannot send while conversation is ${status}.`);
      return;
    }
    const message = {
      id: crypto.randomUUID(),
      senderId,
      content: typeof content === 'string' ? content : content?.text || '',
      imageData: content?.imageData || null,
      timestamp: Date.now(),
      readBy: [senderId],
      isPromptUsed: options?.isPromptUsed || false,
    };
    upsertConversation(peerId, (conv) => ({
      messages: [...(conv?.messages || []), message],
      lastUpdated: Date.now(),
    }));
  };

  const markConversationRead = (peerId) => {
    upsertConversation(peerId, (conv) => ({
      ...conv,
      messages: (conv?.messages || []).map((m) =>
        m.readBy?.includes(currentUser?.id)
          ? m
          : { ...m, readBy: [...(m.readBy || []), currentUser?.id] }
      ),
    }));
  };

  const setConversationStatus = (peerId, status) => {
    upsertConversation(peerId, (conv) => ({
      ...conv,
      status,
    }));
  };

  const deleteConversation = (peerId) => {
    setConversations((prev) => {
      const key = getConversationKey(currentUser?.id, peerId);
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
    if (selectedPeerId === peerId) {
      setSelectedPeerId(null);
    }
  };

  const conversationThreads = useMemo(() => {
    return peers
      .map((peer) => {
        const conv = getConversation(peer.id);
        const messages = conv?.messages || [];
        if (messages.length === 0) return null;
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(
          (m) => m.senderId !== currentUser?.id && !(m.readBy || []).includes(currentUser?.id)
        ).length;
        return {
          id: peer.id,
          name: peer.username,
          avatar: defaultAvatar(peer.username),
          lastMessage: lastMessage?.content || 'No messages yet',
          lastMessageTime: lastMessage?.timestamp || peer.createdAt,
          unreadCount,
          isOnline: isUserOnline(peer),
          messageCount: messages.length,
          hasPrompt: false,
          isDraft: false,
          status: conv?.status || 'active',
        };
      })
      .filter(Boolean);
  }, [peers, conversations, currentUser, isUserOnline, presenceVersion]);

  useEffect(() => {
    const promptFromDashboard = location.state?.initialPrompt;
    if (typeof promptFromDashboard !== 'string') return;

    const normalizedPrompt = promptFromDashboard.trim();
    if (!normalizedPrompt) return;

    setComposerPrefill(normalizedPrompt);
    setActiveTab('messages');

    const sortedThreads = [...conversationThreads]
      .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
    const preferredThread =
      sortedThreads.find((thread) => thread.status === 'active') ||
      sortedThreads.find((thread) => thread.status !== 'archived');

    if (preferredThread?.id) {
      setSelectedPeerId(preferredThread.id);
      markConversationRead(preferredThread.id);
      setSavedMessageBanner('Prompt loaded from dashboard. You can send or edit it.');
    } else {
      setSavedMessageBanner('Prompt loaded from dashboard. Start or select a conversation to use it.');
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, conversationThreads, markConversationRead, navigate]);

  const selectedConversationData = selectedPeerId
    ? peers.find((p) => p.id === selectedPeerId)
    : null;

  const selectedConversation = selectedPeerId ? getConversation(selectedPeerId) : null;
  const selectedConversationStatus = selectedConversation?.status || 'active';

  const selectedMessages = selectedConversation
    ? selectedConversation?.messages || []
    : [];

  const handleSendHello = (peerId) => {
    setSelectedPeerId(peerId);
    setActiveTab('messages');
    addMessage(peerId, currentUser?.id, 'Sent a quiet hello');
  };

  const handleSaveLater = () => {
    setSavedMessageBanner('Saved for later. You can return anytime.');
  };

  const handleSelectConversation = (peerId) => {
    setSelectedPeerId(peerId);
    setActiveTab('messages');
    markConversationRead(peerId);
  };

  const handleSendMessage = (payload) => {
    if (!selectedPeerId) return;
    const message = typeof payload === 'string' ? { text: payload } : payload;
    if (isQuietNow) {
      queueNotification({
        type: 'message',
        from: currentUser?.username,
        content: message?.text,
      });
      setSavedMessageBanner('Message stored quietly. It will send when Quiet Mode ends.');
      return;
    }
    addMessage(selectedPeerId, currentUser?.id, message);
  };

  const handleSaveDraft = (message) => {
    setSavedMessageBanner(`Draft saved (${message.length} characters).`);
  };

  const handleReplyLater = () => {
    setActiveTab('discover');
    setSavedMessageBanner('Marked to reply later. We will keep it here.');
  };

  useEffect(() => {
    if (!isQuietNow && quietState?.pendingNotifications?.length > 0) {
      setSavedMessageBanner(
        `${quietState.pendingNotifications.length} message(s) arrived during Quiet Mode.`
      );
    }
  }, [isQuietNow, quietState?.pendingNotifications]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NavigationBreadcrumb />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mb-2">
              Connect Gently
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Discover compatible peers and engage in low-pressure conversations
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <QuietModeIndicator />
            <Link to="/personalized-dashboard">
              <Button variant="outline" iconName="Home" iconPosition="left">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {savedMessageBanner && (
          <div className="mb-6 p-4 bg-muted/40 border border-border rounded-lg flex items-start space-x-3">
            <Icon name="Inbox" size={18} color="var(--color-foreground)" />
            <div className="flex-1">
              <p className="text-sm text-foreground">{savedMessageBanner}</p>
              {quietState?.pendingNotifications?.length > 0 && !isQuietNow && (
                <button
                  onClick={() => {
                    setSavedMessageBanner(null);
                    clearPendingNotifications();
                  }}
                  className="mt-2 text-primary text-sm hover:underline"
                >
                  Mark as seen
                </button>
              )}
            </div>
          </div>
        )}

        <div className="lg:hidden mb-6">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab('discover')}
              className={`
                flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg
                transition-gentle font-body font-medium
                ${activeTab === 'discover' ? 'bg-primary text-primary-foreground shadow-gentle-sm' : 'text-foreground hover:bg-background'}
              `}
            >
              <Icon
                name="Users"
                size={18}
                color={activeTab === 'discover' ? 'var(--color-primary-foreground)' : 'currentColor'} />
              <span>Discover</span>
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`
                flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg
                transition-gentle font-body font-medium relative
                ${activeTab === 'messages' ? 'bg-primary text-primary-foreground shadow-gentle-sm' : 'text-foreground hover:bg-background'}
              `}
            >
              <Icon
                name="MessageCircle"
                size={18}
                color={activeTab === 'messages' ? 'var(--color-primary-foreground)' : 'currentColor'} />
              <span>Messages</span>
              {conversationThreads?.reduce((sum, conv) => sum + (conv?.unreadCount || 0), 0) > 0 &&
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {conversationThreads?.reduce((sum, conv) => sum + (conv?.unreadCount || 0), 0)}
                </span>
              }
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className={`lg:col-span-5 ${activeTab === 'messages' ? 'hidden lg:block' : ''}`}>
            <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-heading font-semibold text-foreground">
              Discover Matches
            </h2>
            <div className="flex items-center gap-3">
              <Button variant="default" iconName="Search" onClick={handleFindMatches}>
                Find Matches
              </Button>
              <FilterPanel
                onApplyFilters={(filters) => setAppliedFilters(filters)}
                onReset={() => setAppliedFilters(createDefaultMatchFilters())}
              />
            </div>
          </div>

            <div className="space-y-6">
              {filteredMatchResults?.length > 0 ? (
                filteredMatchResults.map((match) => (
                  <MatchCard
                    key={match?.id}
                    match={{
                      ...match,
                      avatar: defaultAvatar(match?.username),
                      avatarAlt: `${match?.username} avatar`,
                      major: 'Student',
                      year: 'Member',
                      isOnline: isUserOnline(match),
                      bio: 'Introvert-friendly peer ready for calm conversations.',
                    }}
                    onSendHello={handleSendHello}
                    onSaveLater={handleSaveLater}
                  />
                ))
              ) : hasSearched ? (
                hasActiveFilters && matchResults.length > 0 ? (
                  <div className="p-4 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
                    <p>No matches fit your current filters.</p>
                    <p className="mt-2">Adjust your filter selection and try again.</p>
                  </div>
                ) : (
                  <EmptyState
                    type="noMatches"
                    onAction={() => {
                      setHasSearched(false);
                      setMatchResults([]);
                    }}
                  />
                )
              ) : (
                <div className="p-4 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
                  Press "Find Matches" to see peers sharing both your interests and personality tags.
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-accent/5 rounded-lg border border-accent/20">
              <div className="flex items-start space-x-3">
                <Icon name="Info" size={20} color="var(--color-accent)" className="flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-body font-medium text-foreground mb-1">
                    Matching Tips
                  </h3>
                  <p className="caption text-muted-foreground leading-relaxed">
                    Create or log into another account to see it appear here. We only show matches that share at least one interest and one personality tag with you.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={`lg:col-span-7 ${activeTab === 'discover' ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-heading font-semibold text-foreground">
              Conversations
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant={showArchived ? 'outline' : 'default'}
                size="sm"
                onClick={() => setShowArchived(false)}
              >
                Active
              </Button>
              <Button
                variant={showArchived ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowArchived(true);
                  setSelectedPeerId(null);
                }}
              >
                Archived
              </Button>
            </div>
          </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {conversationThreads
                  ?.filter((c) => (showArchived ? c.status === 'archived' : c.status !== 'archived'))
                  ?.length > 0 ? (
                  conversationThreads
                    ?.filter((c) => (showArchived ? c.status === 'archived' : c.status !== 'archived'))
                    ?.map((conversation) => (
                      <ConversationThread
                        key={conversation?.id}
                        conversation={conversation}
                        onSelect={handleSelectConversation}
                        isActive={selectedPeerId === conversation?.id}
                      />
                    ))
                ) : (
                  <EmptyState
                    type="noConversations"
                    onAction={() => setActiveTab('discover')}
                  />
                )}
              </div>

              <div className="lg:col-span-3">
                {selectedPeerId ?
                  <div className="space-y-6">
                    <div className="bg-card rounded-xl border border-border p-4 md:p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden">
                            <img
                              src={selectedConversationData ? defaultAvatar(selectedConversationData?.username) : defaultAvatar('peer')}
                              alt={`${selectedConversationData?.username} avatar`}
                              className="w-full h-full object-cover" />

                          </div>
                          <div>
                            <h3 className="font-body font-semibold text-foreground">
                              {selectedConversationData?.username}
                            </h3>
                            <p className="caption text-muted-foreground">
                              {selectedConversationStatus}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedConversationStatus === 'archived' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              iconName="RefreshCw"
                              onClick={() => setConversationStatus(selectedPeerId, 'active')}
                              title="Unarchive"
                            />
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              iconName="Archive"
                              onClick={() => setConversationStatus(selectedPeerId, 'archived')}
                              title="Archive"
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            iconName={selectedConversationStatus === 'restricted' ? 'ShieldCheck' : 'ShieldOff'}
                            onClick={() =>
                              setConversationStatus(
                                selectedPeerId,
                                selectedConversationStatus === 'restricted' ? 'active' : 'restricted'
                              )
                            }
                            title={selectedConversationStatus === 'restricted' ? 'Unrestrict' : 'Restrict'}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            iconName={selectedConversationStatus === 'blocked' ? 'UserCheck' : 'Ban'}
                            onClick={() =>
                              setConversationStatus(
                                selectedPeerId,
                                selectedConversationStatus === 'blocked' ? 'active' : 'blocked'
                              )
                            }
                            title={selectedConversationStatus === 'blocked' ? 'Unblock' : 'Block'}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            iconName="Trash2"
                            onClick={() => deleteConversation(selectedPeerId)}
                            title="Delete conversation"
                          />
                        </div>

                      </div>

                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {selectedMessages?.map((message) =>
                          <MessageBubble
                            key={message?.id}
                            message={{
                              ...message,
                              avatar: selectedConversationData ? defaultAvatar(selectedConversationData?.username) : '',
                              avatarAlt: `${selectedConversationData?.username} avatar`,
                              isRead: (message?.readBy || []).includes(selectedPeerId),
                            }}
                            isOwn={message?.senderId === currentUser?.id} />
                        )}
                      </div>
                    </div>

                    <MessageComposer
                      recipientName={selectedConversationData?.username}
                      onSend={handleSendMessage}
                      onSaveDraft={handleSaveDraft}
                      onReplyLater={handleReplyLater}
                      initialMessage={composerPrefill}
                      onInitialMessageApplied={() => setComposerPrefill('')}
                      disabled={['blocked', 'restricted', 'archived'].includes(selectedConversationStatus)}
                    />

                  </div> :

                  <div className="bg-card rounded-xl border border-border p-8 md:p-12">
                    <EmptyState
                      type="noMessages"
                      onAction={() => setActiveTab('discover')} />

                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>);

};

export default FindMatchesConversations;

