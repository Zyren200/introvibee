import React, { useEffect, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const MessageComposer = ({
  recipientName,
  onSend,
  onSaveDraft,
  onReplyLater,
  initialMessage = '',
  onInitialMessageApplied,
  disabled = false,
  compact = false,
}) => {
  const [message, setMessage] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);
  const [imageData, setImageData] = useState(null);

  const iceBreakers = [
    "What's your favorite way to unwind after classes?",
    'Have you discovered any interesting study spots on campus?',
    'What book or show are you currently enjoying?',
    "What's something you're looking forward to this week?",
    "Do you have any hobbies you'd like to share?",
  ];

  const handleSend = () => {
    if ((message?.trim() || imageData) && onSend) {
      onSend({ text: message, imageData });
      setMessage('');
      setImageData(null);
    }
  };

  const handleSaveDraft = () => {
    if ((message?.trim() || imageData) && onSaveDraft) {
      onSaveDraft(message || '[image]');
    }
  };

  const handleImageUpload = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageData(e.target.result);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const normalizedInitialMessage =
      typeof initialMessage === 'string' ? initialMessage.trim() : '';
    if (!normalizedInitialMessage) return;
    setMessage(normalizedInitialMessage);
    if (onInitialMessageApplied) onInitialMessageApplied();
  }, [initialMessage, onInitialMessageApplied]);

  return (
    <div
      className={`border-t border-border bg-card/95 backdrop-blur ${
        compact ? 'px-3 py-3' : 'p-4 md:p-5'
      }`}
    >
      <div className={`flex items-center justify-between gap-3 ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="min-w-0 flex items-center space-x-2">
          <Icon name="MessageCircle" size={20} color="var(--color-primary)" />
          <span className={`font-body font-medium text-foreground ${compact ? 'truncate text-sm' : ''}`}>
            Message to {recipientName}
          </span>
        </div>
        <button
          onClick={() => setShowPrompts(!showPrompts)}
          className={`inline-flex items-center rounded-full border border-border bg-background/60 text-xs text-muted-foreground transition-gentle hover:bg-muted ${
            compact ? 'h-9 w-9 justify-center' : 'space-x-2 px-3 py-1.5'
          }`}
          type="button"
          aria-label="Toggle ice breakers"
        >
          <Icon name="Lightbulb" size={16} color="currentColor" />
          {!compact && <span className="hidden sm:inline">Ice breakers</span>}
        </button>
      </div>

      {showPrompts && (
        <div className={`rounded-[1.5rem] border border-accent/25 bg-accent/10 ${compact ? 'mb-3 p-3' : 'mb-4 p-4'}`}>
          <div className="mb-3 flex items-center space-x-2">
            <Icon name="Sparkles" size={16} color="var(--color-accent)" />
            <span className="caption font-medium text-accent">
              Optional conversation starters
            </span>
          </div>
          <div className="space-y-2">
            {iceBreakers?.map((prompt, index) => (
              <button
                key={index}
                onClick={() => {
                  setMessage(prompt);
                  setShowPrompts(false);
                }}
                type="button"
                className={`w-full rounded-xl bg-card/90 text-left text-sm text-foreground transition-gentle hover:bg-muted ${
                  compact ? 'p-2.5' : 'p-3'
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPrompts(false)}
            type="button"
            className="mt-3 caption text-muted-foreground transition-gentle hover:text-foreground"
          >
            Skip prompts
          </button>
        </div>
      )}

      {imageData && (
        <div className="mb-3 flex items-center gap-3 rounded-[1.4rem] border border-border bg-background/75 px-3 py-2">
          <img
            src={imageData}
            alt="Pending attachment"
            className={`${compact ? 'h-12 w-12' : 'h-14 w-14'} rounded-xl object-cover`}
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Image ready to send</p>
            <p className="text-xs text-muted-foreground">You can still add text before sending.</p>
          </div>
          <button
            type="button"
            onClick={() => setImageData(null)}
            className="rounded-full p-2 text-muted-foreground transition-gentle hover:bg-muted hover:text-foreground"
            disabled={disabled}
          >
            <Icon name="X" size={16} color="currentColor" />
          </button>
        </div>
      )}

      <div className={`flex items-end ${compact ? 'gap-2' : 'gap-3'}`}>
        <label
          className={`flex cursor-pointer items-center justify-center border border-border bg-background/70 text-primary transition-gentle hover:bg-muted ${
            compact ? 'h-11 w-11 rounded-[1.1rem]' : 'h-12 w-12 rounded-full'
          }`}
        >
          <Icon name="Image" size={18} color="currentColor" />
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={disabled} />
        </label>
        <div
          className={`flex-1 border border-border bg-background/75 shadow-inner ${
            compact ? 'rounded-[1.35rem] px-3 py-2.5' : 'rounded-[1.75rem] px-4 py-3'
          }`}
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e?.target?.value)}
            placeholder="Type a message..."
            className={`w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none ${
              compact ? 'min-h-[44px] max-h-28 text-[15px]' : 'min-h-[52px] max-h-32 text-sm'
            }`}
            aria-label="Message content"
            disabled={disabled}
          />
        </div>
        <Button
          variant="default"
          size="icon"
          iconName="Send"
          onClick={handleSend}
          disabled={disabled || (!message?.trim() && !imageData)}
          className={compact ? 'h-11 w-11 rounded-[1.1rem]' : 'h-12 w-12 rounded-full'}
        />
      </div>

      {compact ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={disabled || (!message?.trim() && !imageData)}
              className="text-xs font-medium text-muted-foreground transition-gentle hover:text-foreground disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={onReplyLater}
              disabled={disabled}
              className="text-xs font-medium text-muted-foreground transition-gentle hover:text-foreground disabled:opacity-50"
            >
              Reply later
            </button>
          </div>
          <span className="text-[11px] italic text-muted-foreground">
            Respond when ready
          </span>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                iconName="Save"
                iconPosition="left"
                onClick={handleSaveDraft}
                disabled={disabled || (!message?.trim() && !imageData)}
              >
                Save draft
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconName="Clock"
                iconPosition="left"
                onClick={onReplyLater}
                disabled={disabled}
              >
                Reply later
              </Button>
            </div>
            <span className="text-xs italic text-muted-foreground">
              Respond when you're ready
            </span>
          </div>

          <div className="mt-4 rounded-[1.4rem] border border-success/20 bg-success/10 p-3">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={16} color="var(--color-success)" className="mt-0.5 flex-shrink-0" />
              <p className="caption leading-relaxed text-success">
                Your messages are saved automatically. You can come back anytime to continue the conversation.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MessageComposer;
