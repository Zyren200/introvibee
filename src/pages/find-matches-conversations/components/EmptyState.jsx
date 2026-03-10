import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const EmptyState = ({ type, onAction }) => {
  const states = {
    noMatches: {
      icon: 'Users',
      title: 'No matches yet',
      description: 'We\'re finding compatible peers for you. Check back soon for gentle suggestions based on your interests and personality.',
      actionLabel: 'Refresh matches',
      actionIcon: 'RefreshCw'
    },
    noConversations: {
      icon: 'MessageCircle',
      title: 'No conversations yet',
      description: 'Start connecting with peers at your own pace. Send a quiet hello to someone who shares your interests.',
      actionLabel: 'Find matches',
      actionIcon: 'Search'
    },
    noMessages: {
      icon: 'Mail',
      title: 'No messages in this conversation',
      description: 'This is the beginning of your conversation. Take your time to craft a thoughtful message.',
      actionLabel: 'Send first message',
      actionIcon: 'Send'
    }
  };

  const state = states?.[type] || states?.noMatches;

  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 px-4 text-center">
      <div className="w-20 h-20 md:w-24 md:h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Icon name={state?.icon} size={40} color="var(--color-primary)" />
      </div>
      <h3 className="font-heading font-semibold text-foreground text-xl md:text-2xl mb-3">
        {state?.title}
      </h3>
      <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-md mb-6">
        {state?.description}
      </p>
      {onAction && (
        <Button
          variant="default"
          iconName={state?.actionIcon}
          iconPosition="left"
          onClick={onAction}
        >
          {state?.actionLabel}
        </Button>
      )}
      <div className="mt-8 p-4 bg-accent/5 rounded-lg border border-accent/20 max-w-md">
        <div className="flex items-start space-x-2">
          <Icon name="Info" size={16} color="var(--color-accent)" className="flex-shrink-0 mt-0.5" />
          <p className="caption text-accent leading-relaxed text-left">
            Remember: There's no pressure to respond immediately. Take your time and engage when you feel comfortable.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;