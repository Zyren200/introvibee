import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const MessageBubble = ({ message, isOwn }) => {
  const formatTime = (date) => {
    return new Date(date)?.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={`flex items-start space-x-3 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''} mb-4 md:mb-6`}>
      {!isOwn && (
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={message?.avatar}
            alt={message?.avatarAlt}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className={`flex-1 max-w-[85%] md:max-w-[75%] ${isOwn ? 'flex flex-col items-end' : ''}`}>
        <div className={`
          p-3 md:p-4 rounded-2xl
          ${isOwn 
            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
            : 'bg-card border border-border rounded-tl-sm'
          }
        `}>
          {message?.isPromptUsed && (
            <div className={`
              flex items-center space-x-2 mb-2 pb-2 border-b
              ${isOwn ? 'border-primary-foreground/20' : 'border-border'}
            `}>
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
            <p className={`
              text-sm md:text-base leading-relaxed
              ${isOwn ? 'text-primary-foreground' : 'text-foreground'}
            `}>
              {message?.content}
            </p>
          )}
          {message?.imageData && (
            <div className="mt-3">
              <img
                src={message?.imageData}
                alt="Shared attachment"
                className="max-h-64 rounded-lg border border-border object-cover"
              />
            </div>
          )}
        </div>

        <div className={`flex items-center space-x-2 mt-1.5 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <span className="caption text-muted-foreground">
            {formatTime(message?.timestamp)}
          </span>
          {isOwn && message?.isRead && (
            <div className="flex items-center space-x-1">
              <Icon name="CheckCheck" size={14} color="var(--color-success)" />
              <span className="caption text-success">Read</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
