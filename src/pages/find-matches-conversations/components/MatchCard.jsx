import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const MatchCard = ({ match, onSendHello, onSaveLater }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = () => {
    setIsSaved(!isSaved);
    if (onSaveLater) {
      onSaveLater(match?.id);
    }
  };

  const handleSendHello = () => {
    if (onSendHello) {
      onSendHello(match?.id);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-gentle transition-gentle hover:shadow-gentle-md p-4 md:p-6">
      <div className="flex items-start space-x-3 md:space-x-4 mb-4">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-primary/20">
            <Image
              src={match?.avatar}
              alt={match?.avatarAlt}
              className="w-full h-full object-cover"
            />
          </div>
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-card flex items-center justify-center ${
            match?.isOnline ? 'bg-success' : 'bg-muted'
          }`}>
            <Icon 
              name={match?.isOnline ? 'Check' : 'Moon'} 
              size={12} 
              color="white" 
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-foreground text-base md:text-lg mb-1 truncate">
                {match?.name}
              </h3>
              <p className="caption text-muted-foreground">
                {match?.major} • {match?.year}
              </p>
            </div>
            <button
              onClick={handleSave}
              className="p-2 rounded-lg hover:bg-muted transition-gentle flex-shrink-0"
              aria-label={isSaved ? 'Remove from saved' : 'Save for later'}
            >
              <Icon 
                name={isSaved ? 'BookmarkCheck' : 'Bookmark'} 
                size={18} 
                color={isSaved ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} 
              />
            </button>
          </div>

          <div className="flex items-center space-x-2 mb-3">
            <div className="flex items-center space-x-1 px-2 py-1 bg-primary/10 rounded-lg">
              <Icon name="Sparkles" size={14} color="var(--color-primary)" />
              <span className="caption text-primary font-medium">
                {match?.compatibilityScore}% match
              </span>
            </div>
            {match?.isOnline && (
              <span className="caption text-success">Available now</span>
            )}
          </div>
        </div>
      </div>
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Icon name="Users" size={16} color="var(--color-accent)" />
          <span className="caption text-muted-foreground font-medium">
            Shared Interests
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {match?.sharedInterests?.slice(0, isExpanded ? match?.sharedInterests?.length : 4)?.map((interest, index) => (
            <span
              key={index}
              className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg caption font-medium"
            >
              {interest}
            </span>
          ))}
          {match?.sharedInterests?.length > 4 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 text-muted-foreground hover:text-foreground caption font-medium transition-gentle"
            >
              {isExpanded ? 'Show less' : `+${match?.sharedInterests?.length - 4} more`}
            </button>
          )}
        </div>
      </div>
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Icon name="Tag" size={16} color="var(--color-secondary)" />
          <span className="caption text-muted-foreground font-medium">
            Personality Tags
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {match?.personalityTags?.map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1.5 bg-secondary/10 text-secondary-foreground rounded-lg caption"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      {match?.bio && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-foreground leading-relaxed line-clamp-3">
            {match?.bio}
          </p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
        <Button
          variant="default"
          iconName="MessageCircle"
          iconPosition="left"
          onClick={handleSendHello}
          className="flex-1"
        >
          Send a quiet hello
        </Button>
        <Button
          variant="outline"
          iconName="Clock"
          iconPosition="left"
          onClick={handleSave}
          className="flex-1 sm:flex-initial"
        >
          {isSaved ? 'Saved' : 'Save for later'}
        </Button>
      </div>
    </div>
  );
};

export default MatchCard;