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
}) => {
  const [message, setMessage] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);
  const [imageData, setImageData] = useState(null);

  const iceBreakers = [
    "What\'s your favorite way to unwind after classes?",
    "Have you discovered any interesting study spots on campus?",
    "What book or show are you currently enjoying?",
    "What\'s something you\'re looking forward to this week?",
    "Do you have any hobbies you\'d like to share?"
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

  const handleReplyLater = () => {
    if (onReplyLater) {
      onReplyLater();
    }
  };

  const handleImageUpload = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageData(e.target.result);
    reader.readAsDataURL(file);
  };

  const usePrompt = (prompt) => {
    setMessage(prompt);
    setShowPrompts(false);
  };

  useEffect(() => {
    const normalizedInitialMessage =
      typeof initialMessage === 'string' ? initialMessage.trim() : '';
    if (!normalizedInitialMessage) return;
    setMessage(normalizedInitialMessage);
    if (onInitialMessageApplied) onInitialMessageApplied();
  }, [initialMessage, onInitialMessageApplied]);

  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Icon name="MessageCircle" size={20} color="var(--color-primary)" />
          <span className="font-body font-medium text-foreground">
            Message to {recipientName}
          </span>
        </div>
        <button
          onClick={() => setShowPrompts(!showPrompts)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-gentle caption text-muted-foreground"
        >
          <Icon name="Lightbulb" size={16} color="currentColor" />
          <span className="hidden sm:inline">Ice breakers</span>
        </button>
      </div>
      {showPrompts && (
        <div className="mb-4 p-4 bg-accent/5 rounded-lg border border-accent/20">
          <div className="flex items-center space-x-2 mb-3">
            <Icon name="Sparkles" size={16} color="var(--color-accent)" />
            <span className="caption text-accent font-medium">
              Optional conversation starters
            </span>
          </div>
          <div className="space-y-2">
            {iceBreakers?.map((prompt, index) => (
              <button
                key={index}
                onClick={() => usePrompt(prompt)}
                className="w-full text-left p-3 rounded-lg bg-card hover:bg-muted transition-gentle text-sm text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPrompts(false)}
            className="mt-3 text-muted-foreground caption hover:text-foreground transition-gentle"
          >
            Skip prompts
          </button>
        </div>
      )}
      <div className="mb-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e?.target?.value)}
          placeholder="Type your message here... Take your time, there's no rush."
          className="w-full min-h-32 md:min-h-40 p-4 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-gentle resize-none"
          aria-label="Message content"
          disabled={disabled}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center space-x-2 cursor-pointer text-sm text-primary">
              <Icon name="Image" size={16} color="currentColor" />
              <span>Attach image</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={disabled} />
            </label>
            {imageData && (
              <span className="caption text-muted-foreground">1 image attached</span>
            )}
          </div>
          <span className="caption text-muted-foreground italic">
            Respond when you're ready
          </span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
        <Button
          variant="default"
          iconName="Send"
          iconPosition="right"
          onClick={handleSend}
          disabled={disabled || (!message?.trim() && !imageData)}
          className="flex-1"
        >
          Send message
        </Button>
        <Button
          variant="outline"
          iconName="Save"
          iconPosition="left"
          onClick={handleSaveDraft}
          disabled={disabled || (!message?.trim() && !imageData)}
        >
          Save draft
        </Button>
        <Button
          variant="ghost"
          iconName="Clock"
          iconPosition="left"
          onClick={handleReplyLater}
          disabled={disabled}
        >
          Reply later
        </Button>
      </div>
      <div className="mt-4 p-3 bg-success/5 rounded-lg border border-success/20">
        <div className="flex items-start space-x-2">
          <Icon name="Info" size={16} color="var(--color-success)" className="flex-shrink-0 mt-0.5" />
          <p className="caption text-success leading-relaxed">
            Your messages are saved automatically. You can come back anytime to continue the conversation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageComposer;
