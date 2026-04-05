import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const MatchCard = ({ match, onSendHello, onSaveLater }) => {
  const [isSaved, setIsSaved] = useState(match?.status === 'saved');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = () => {
    setIsSaved((value) => !value);
    if (onSaveLater) {
      onSaveLater(match?.id);
    }
  };

  return (
    <div className="rounded-[1.6rem] border border-border bg-card/78 p-4 shadow-gentle-sm transition-gentle hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-gentle">
      <div className="mb-4 flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-primary/15 md:h-[4.5rem] md:w-[4.5rem]">
            <Image
              src={match?.avatar}
              alt={match?.avatarAlt}
              className="h-full w-full object-cover"
            />
          </div>
          <div
            className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card md:h-6 md:w-6 ${
              match?.isOnline ? 'bg-success' : 'bg-muted'
            }`}
          >
            <Icon
              name={match?.isOnline ? 'Check' : 'Moon'}
              size={12}
              color="white"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-secondary/12 px-2.5 py-1">
            <Icon name="HeartHandshake" size={13} color="var(--color-secondary-foreground)" />
            <span className="caption text-secondary-foreground">Instant connection</span>
          </div>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 truncate font-heading text-base font-semibold text-foreground md:text-lg">
                {match?.name}
              </h3>
              <p className="caption text-muted-foreground">
                {match?.major} - {match?.year}
              </p>
            </div>
            <button
              onClick={handleSave}
              type="button"
              className="flex-shrink-0 rounded-full p-2 transition-gentle hover:bg-muted"
              aria-label={isSaved ? 'Remove from saved' : 'Save for later'}
            >
              <Icon
                name={isSaved ? 'BookmarkCheck' : 'Bookmark'}
                size={18}
                color={isSaved ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
              />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1">
              <Icon name="Sparkles" size={14} color="var(--color-primary)" />
              <span className="caption font-medium text-primary">
                {match?.compatibilityScore}% match
              </span>
            </div>
            {match?.isOnline && (
              <span className="caption rounded-full bg-success/12 px-2.5 py-1 text-success">
                Active now
              </span>
            )}
            {match?.status === 'messaged' && (
              <span className="caption rounded-full bg-accent/15 px-2.5 py-1 text-accent">
                Messaged
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <Icon name="Users" size={16} color="var(--color-accent)" />
          <span className="caption font-medium text-muted-foreground">
            Shared Interests
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {match?.sharedInterests
            ?.slice(0, isExpanded ? match?.sharedInterests?.length : 4)
            ?.map((interest, index) => (
              <span
                key={index}
                className="caption rounded-full bg-accent/12 px-3 py-1.5 font-medium text-accent"
              >
                {interest}
              </span>
            ))}
          {match?.sharedInterests?.length > 4 && (
            <button
              onClick={() => setIsExpanded((value) => !value)}
              type="button"
              className="caption px-3 py-1.5 font-medium text-muted-foreground transition-gentle hover:text-foreground"
            >
              {isExpanded ? 'Show less' : `+${match?.sharedInterests?.length - 4} more`}
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <Icon name="Tag" size={16} color="var(--color-secondary)" />
          <span className="caption font-medium text-muted-foreground">
            Personality Tags
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {match?.personalityTags?.map((tag, index) => (
            <span
              key={index}
              className="caption rounded-full bg-secondary/12 px-3 py-1.5 text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {match?.bio && (
        <div className="mb-4 rounded-2xl bg-muted/55 p-3">
          <p className="line-clamp-3 text-sm leading-7 text-foreground">
            {match?.bio}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="default"
          iconName="MessageCircle"
          iconPosition="left"
          onClick={() => onSendHello?.(match?.id)}
          className="flex-1 rounded-full"
        >
          Chat now
        </Button>
        <Button
          variant="outline"
          iconName={isSaved ? 'BookmarkCheck' : 'UserPlus'}
          iconPosition="left"
          onClick={handleSave}
          className="rounded-full"
        >
          {isSaved ? 'Connection saved' : 'Save connection'}
        </Button>
      </div>
    </div>
  );
};

export default MatchCard;
