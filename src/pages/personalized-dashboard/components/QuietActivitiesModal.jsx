import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const quietActivities = [
  {
    id: 'breathing',
    title: 'Breathing Reset',
    durationMinutes: 3,
    iconName: 'Coffee',
    description: 'Slow breathing cycle for a short reset before studying.',
    guide: 'Inhale gently, hold briefly, then exhale longer.',
  },
  {
    id: 'reading',
    title: 'Silent Reading',
    durationMinutes: 10,
    iconName: 'BookOpen',
    description: 'Read quietly without notifications or pressure.',
    guide: 'Pick one short topic and stay focused only on that.',
  },
  {
    id: 'mind-dump',
    title: 'Mind Dump Notes',
    durationMinutes: 15,
    iconName: 'PenTool',
    description: 'Write down thoughts to clear mental noise.',
    guide: 'Write freely, no need for perfect grammar or structure.',
  },
];

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const formatDateTime = (timestamp) =>
  new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const QuietActivitiesModal = ({ entries = [], onClose, onComplete }) => {
  const [activeActivity, setActiveActivity] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return undefined;
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const completeActivity = (minutesSpent) => {
    if (!activeActivity) return;
    const trimmedNotes = sessionNotes.trim();
    if (onComplete) {
      onComplete({
        activityId: activeActivity.id,
        title: activeActivity.title,
        minutesSpent,
        notes: trimmedNotes,
      });
    }
    setCompletionMessage(`Completed "${activeActivity.title}"`);
    setActiveActivity(null);
    setIsRunning(false);
    setSecondsLeft(0);
    setSessionNotes('');
  };

  useEffect(() => {
    if (isRunning && activeActivity && secondsLeft === 0) {
      completeActivity(activeActivity.durationMinutes);
    }
  }, [isRunning, activeActivity, secondsLeft]);

  const startActivity = (activity) => {
    setActiveActivity(activity);
    setSecondsLeft(activity.durationMinutes * 60);
    setIsRunning(true);
    setCompletionMessage('');
    setSessionNotes('');
  };

  const completeNow = () => {
    if (!activeActivity) return;
    const totalSeconds = activeActivity.durationMinutes * 60;
    const elapsedSeconds = Math.max(0, totalSeconds - secondsLeft);
    const minutesSpent = Math.max(0.5, Math.round((elapsedSeconds / 60) * 10) / 10);
    completeActivity(minutesSpent);
  };

  const recentEntries = useMemo(() => entries.slice(0, 5), [entries]);

  return (
    <div className="fixed inset-0 z-[130] bg-black/45 px-4 py-6 flex items-center justify-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-gentle-lg p-5 md:p-6"
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-xl font-heading font-semibold text-foreground">Quiet Activities</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start a calm solo session and keep your progress tracked.
            </p>
          </div>
          <Button variant="ghost" size="icon" iconName="X" onClick={onClose} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {quietActivities.map((activity) => (
              <div key={activity.id} className="rounded-xl border border-border p-4 bg-background/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon name={activity.iconName} size={18} color="var(--color-primary)" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.durationMinutes} minutes
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => startActivity(activity)}>
                    Start
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-3">{activity.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border p-4 bg-background/70">
            {activeActivity ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="Clock3" size={16} color="var(--color-accent)" />
                  <span className="text-sm font-medium text-foreground">{activeActivity.title}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{activeActivity.guide}</p>
                <div className="text-3xl font-data text-primary mb-4">{formatTime(secondsLeft)}</div>
                <div className="mb-4">
                  <label
                    htmlFor="quiet-session-notes"
                    className="block text-xs font-medium text-muted-foreground mb-2"
                  >
                    {activeActivity.id === 'mind-dump'
                      ? 'Write your thoughts'
                      : 'Session notes (optional)'}
                  </label>
                  <textarea
                    id="quiet-session-notes"
                    value={sessionNotes}
                    onChange={(event) => setSessionNotes(event.target.value)}
                    placeholder={
                      activeActivity.id === 'mind-dump'
                        ? 'Write anything on your mind. No pressure, no format required.'
                        : 'Optional notes while you do this activity.'
                    }
                    className="w-full min-h-28 resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    iconName={isRunning ? 'Pause' : 'Play'}
                    onClick={() => setIsRunning((value) => !value)}
                  >
                    {isRunning ? 'Pause' : 'Resume'}
                  </Button>
                  <Button size="sm" variant="default" iconName="Check" onClick={completeNow}>
                    Mark complete
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col justify-center">
                <p className="text-sm text-muted-foreground">
                  Choose an activity to start a quiet session.
                </p>
                {completionMessage && (
                  <div className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                    {completionMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="History" size={16} color="var(--color-muted-foreground)" />
            <p className="text-sm font-medium text-foreground">Recent quiet activities</p>
          </div>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed quiet activities yet.</p>
          ) : (
            <div className="space-y-2">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border bg-background/60 px-3 py-2">
                  <p className="text-sm text-foreground">{entry.title}</p>
                  {entry.notes ? (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line break-words">
                      {entry.notes}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.minutesSpent} min - {formatDateTime(entry.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuietActivitiesModal;
