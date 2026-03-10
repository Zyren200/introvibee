import React from 'react';
import Icon from '../../../components/AppIcon';

const ProgressIndicator = ({ current, total, percentage }) => {
  const getMotivationalMessage = () => {
    if (percentage === 0) return "Let's begin this journey together";
    if (percentage < 25) return "You're doing great—take your time";
    if (percentage < 50) return "Wonderful progress—keep going at your pace";
    if (percentage < 75) return "You're more than halfway there!";
    if (percentage < 100) return "Almost there—you're doing amazing";
    return "All done—wonderful work!";
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon name="Target" size={20} color="var(--color-primary)" />
          <span className="font-body font-medium text-foreground">
            Your Progress
          </span>
        </div>
        <span className="caption text-muted-foreground text-sm">
          {current} of {total} answered
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Motivational Message */}
      <div className="flex items-center space-x-2">
        <Icon name="Heart" size={16} color="var(--color-accent)" />
        <p className="caption text-muted-foreground text-sm italic">
          {getMotivationalMessage()}
        </p>
      </div>
    </div>
  );
};

export default ProgressIndicator;