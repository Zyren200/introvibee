import React from 'react';
import Icon from '../../../components/AppIcon';

const WelcomeSection = ({ userName, currentTime }) => {
  return (
    <div className="bg-gradient-to-br from-primary/10 via-card to-secondary/15 rounded-xl p-6 md:p-8 border border-border mb-6 md:mb-8 shadow-gentle-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-heading font-semibold text-foreground mb-2">
            Welcome, {userName}
          </h1>
          <p className="text-muted-foreground font-body text-sm md:text-base">
            You're in a calm space. Move at your own pace.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-background/80 rounded-lg px-4 py-3 border border-border">
          <Icon name="Calendar" size={20} color="var(--color-primary)" />
          <div>
            <p className="caption text-xs text-muted-foreground">Today</p>
            <p className="font-data text-sm text-foreground font-medium">
              {currentTime?.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;
