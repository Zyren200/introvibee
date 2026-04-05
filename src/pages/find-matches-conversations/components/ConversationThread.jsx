import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const ConversationThread = ({ conversation, onSelect, onDelete, isActive, isBusy = false }) => {
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
    <div
      className={`group relative w-full overflow-hidden rounded-[1.35rem] border px-3 py-3 text-left transition-gentle ${
        isActive
          ? 'border-primary/35 bg-primary/12 shadow-gentle-sm'
          : 'border-transparent bg-card/45 hover:border-border hover:bg-card/80'
      }`}
    >
      {isActive && (
        <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary" aria-hidden="true" />
      )}

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(conversation)}
          disabled={isBusy}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-gentle-sm transition-gentle hover:border-destructive/25 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          aria-label={`Delete conversation with ${conversation?.name || 'this chat'}`}
        >
          <Icon name="Trash2" size={16} color="currentColor" />
        </button>
      )}

      <button
        type="button"
        onClick={() => onSelect?.(conversation)}
        className="w-full pr-12 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="h-12 w-12 overflow-hidden rounded-full ring-1 ring-border">
              <Image
                src={conversation?.avatar}
                alt={conversation?.avatarAlt}
                className="h-full w-full object-cover"
              />
            </div>
            {conversation?.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" />
            )}
            {conversation?.unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1">
                <span className="text-[10px] font-semibold text-primary-foreground">
                  {conversation?.unreadCount}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h4 className="truncate pr-2 text-sm font-semibold text-foreground md:text-[15px]">
                {conversation?.name}
              </h4>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatTimestamp(conversation?.lastMessageTime)}
              </span>
            </div>

            <p
              className={`line-clamp-2 text-sm leading-6 ${
                conversation?.unreadCount > 0
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {conversation?.lastMessage}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                {conversation?.status === 'group' ? 'Group' : 'Direct'}
              </span>
              {conversation?.isDraft && (
                <span className="rounded-full bg-accent/15 px-2 py-1 text-accent">
                  Draft
                </span>
              )}
              {conversation?.unreadCount > 0 && (
                <span className="rounded-full bg-primary/12 px-2 py-1 font-medium text-primary">
                  {conversation?.unreadCount} unread
                </span>
              )}
              <span className="text-muted-foreground">{conversation?.messageCount} msgs</span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
};

export default ConversationThread;
