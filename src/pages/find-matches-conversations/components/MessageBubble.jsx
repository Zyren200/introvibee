import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const MessageBubble = ({ message, isOwn, onReply, isReplying = false }) => {
  const formatTime = (date) =>
    new Date(date)?.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  return (
    <div className={`mb-4 flex items-end gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && (
        <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-border">
          <Image
            src={message?.avatar}
            alt={message?.avatarAlt}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className={`max-w-[86%] md:max-w-[72%] ${isOwn ? 'ml-auto flex flex-col items-end' : ''}`}>
        <div
          className={`rounded-[1.45rem] px-4 py-3 shadow-gentle-sm ${
            isOwn
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md border border-border/80 bg-card/95 text-foreground backdrop-blur'
          }`}
        >
          {message?.replyToMessage && (
            <div
              className={`mb-3 rounded-[1.1rem] border px-3 py-2 ${
                isOwn
                  ? 'border-primary-foreground/20 bg-primary-foreground/10'
                  : 'border-border/80 bg-background/70'
              }`}
            >
              <p className={`text-[11px] font-semibold ${isOwn ? 'text-primary-foreground/85' : 'text-primary'}`}>
                Replying to {message?.replyToMessage?.senderName}
              </p>
              <p
                className={`mt-1 text-xs leading-relaxed ${
                  isOwn ? 'text-primary-foreground/75' : 'text-muted-foreground'
                } ${message?.replyToMessage?.isMissing ? 'italic' : ''}`}
              >
                {message?.replyToMessage?.preview}
              </p>
            </div>
          )}

          {message?.senderName && !isOwn && (
            <p className="mb-2 text-xs font-semibold text-primary">
              {message?.senderName}
            </p>
          )}

          {message?.isPromptUsed && (
            <div
              className={`mb-2 flex items-center space-x-2 border-b pb-2 ${
                isOwn ? 'border-primary-foreground/20' : 'border-border'
              }`}
            >
              <Icon
                name="Lightbulb"
                size={14}
                color={isOwn ? 'var(--color-primary-foreground)' : 'var(--color-accent)'}
              />
              <span className={`caption ${isOwn ? 'text-primary-foreground/80' : 'text-accent'}`}>
                Used ice breaker
              </span>
            </div>
          )}

          {message?.content && (
            <p
              className={`break-words whitespace-pre-wrap text-sm leading-7 [overflow-wrap:anywhere] md:text-[15px] ${
                isOwn ? 'text-primary-foreground' : 'text-foreground'
              }`}
            >
              {message?.content}
            </p>
          )}

          {message?.imageData && (
            <div className="mt-3 overflow-hidden rounded-2xl">
              <img
                src={message?.imageData}
                alt="Shared attachment"
                className="max-h-72 w-full rounded-2xl border border-border object-cover"
              />
            </div>
          )}
        </div>

        <div className={`mt-1.5 flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-gentle ${
                isReplying
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-label="Reply to this message"
            >
              <Icon name="Reply" size={12} color="currentColor" />
              <span>Reply</span>
            </button>
          )}
          <span className="text-xs text-muted-foreground">{formatTime(message?.timestamp)}</span>
          {isOwn && message?.isRead && (
            <div className="flex items-center space-x-1">
              <Icon name="CheckCheck" size={14} color="var(--color-success)" />
              <span className="text-xs text-success">Read</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
