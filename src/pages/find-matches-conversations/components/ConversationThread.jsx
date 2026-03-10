import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const ConversationThread = ({ conversation, onSelect, isActive }) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatTimestamp = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <button
      onClick={() => onSelect(conversation?.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        w-full text-left p-3 md:p-4 rounded-xl transition-gentle
        ${isActive 
          ? 'bg-primary/10 border-2 border-primary' :'hover:bg-muted border-2 border-transparent'
        }
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden">
            <Image
              src={conversation?.avatar}
              alt={conversation?.avatarAlt}
              className="w-full h-full object-cover"
            />
          </div>
          {conversation?.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-card"></div>
          )}
          {conversation?.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {conversation?.unreadCount}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h4 className="font-body font-semibold text-foreground text-sm md:text-base truncate">
              {conversation?.name}
            </h4>
            <span className="caption text-muted-foreground flex-shrink-0 ml-2">
              {formatTimestamp(conversation?.lastMessageTime)}
            </span>
          </div>

          <p className={`
            text-sm leading-relaxed line-clamp-2
            ${conversation?.unreadCount > 0 
              ? 'text-foreground font-medium' 
              : 'text-muted-foreground'
            }
          `}>
            {conversation?.lastMessage}
          </p>

          {conversation?.status && conversation?.status !== 'active' && (
            <div className="flex items-center space-x-1 mt-2">
              <Icon name="AlertCircle" size={12} color="var(--color-warning)" />
              <span className="caption text-warning capitalize">{conversation?.status}</span>
            </div>
          )}

          {conversation?.isDraft && (
            <div className="flex items-center space-x-1 mt-2">
              <Icon name="Edit3" size={12} color="var(--color-warning)" />
              <span className="caption text-warning">Draft saved</span>
            </div>
          )}
        </div>
      </div>
      {(isHovered || isActive) && (
        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-border">
          <div className="flex items-center space-x-1 text-muted-foreground caption">
            <Icon name="MessageCircle" size={14} color="currentColor" />
            <span>{conversation?.messageCount} messages</span>
          </div>
          {conversation?.hasPrompt && (
            <div className="flex items-center space-x-1 text-accent caption">
              <Icon name="Lightbulb" size={14} color="var(--color-accent)" />
              <span>Prompt used</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
};

export default ConversationThread;
