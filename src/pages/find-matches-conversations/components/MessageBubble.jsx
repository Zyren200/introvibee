import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const MessageBubble = ({ message, isOwn }) => {
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
            <p className={`text-sm leading-relaxed md:text-[15px] ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`}>
              {message?.content}
            </p>
          )}

          {message?.imageData && (
            <div className="mt-3">
              <img
                src={message?.imageData}
                alt="Shared attachment"
                className="max-h-64 rounded-2xl border border-border object-cover"
              />
            </div>
          )}
        </div>

        <div className={`mt-1.5 flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
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
