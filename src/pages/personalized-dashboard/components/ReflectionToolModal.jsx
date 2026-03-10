import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const moodOptions = ['Calm', 'Focused', 'Happy', 'Tired', 'Stressed'];

const formatEntryTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ReflectionToolModal = ({ tool, entries = [], onClose, onSave }) => {
  const [text, setText] = useState('');
  const [mood, setMood] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setText('');
    setMood('');
    setNote('');
  }, [tool?.id]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const canSave = useMemo(() => {
    if (tool?.id === 2) return Boolean(mood);
    return text.trim().length > 0;
  }, [tool?.id, text, mood]);

  const handleSave = () => {
    if (!canSave) return;
    if (tool?.id === 2) {
      onSave({ mood, note: note.trim() });
      return;
    }
    onSave({ text: text.trim() });
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/45 px-4 py-6 flex items-center justify-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-gentle-lg p-5 md:p-6"
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-xl font-heading font-semibold text-foreground">{tool?.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{tool?.description}</p>
          </div>
          <Button variant="ghost" size="icon" iconName="X" onClick={onClose} />
        </div>

        {tool?.id === 2 ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-foreground font-medium mb-2">How are you feeling right now?</p>
              <div className="flex flex-wrap gap-2">
                {moodOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMood(option)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-gentle ${
                      mood === option
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-foreground font-medium mb-2">
                Optional note
              </label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="What is affecting your mood?"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-foreground font-medium mb-2">
              {tool?.id === 1 ? 'Journal entry' : 'Gratitude note'}
            </label>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder={
                tool?.id === 1
                  ? 'Write your thoughts for today...'
                  : 'What are you grateful for today?'
              }
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" iconName="Save" onClick={handleSave} disabled={!canSave}>
            Save entry
          </Button>
        </div>

        <div className="mt-7 border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="History" size={16} color="var(--color-muted-foreground)" />
            <p className="text-sm font-medium text-foreground">Recent entries</p>
          </div>

          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <div className="space-y-3">
              {entries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border bg-background/70 p-3">
                  {tool?.id === 2 ? (
                    <>
                      <p className="text-sm text-foreground font-medium">{entry?.mood || 'Mood logged'}</p>
                      {entry?.note && <p className="text-sm text-muted-foreground mt-1">{entry.note}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {entry?.text}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{formatEntryTime(entry?.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReflectionToolModal;
