import React from 'react';
import Icon from '../../../components/AppIcon';
import { cn } from '../../../utils/cn';

const AppearanceSection = ({ settings, onUpdate }) => {
  const theme = settings?.theme || 'light';

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-gentle transition-gentle hover:shadow-gentle-md">
      <div className="flex items-start space-x-4 mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name="Palette" size={24} color="var(--color-primary)" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Appearance
          </h2>
          <p className="text-muted-foreground font-body text-sm">
            Choose your theme mode for better visibility and comfort.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => onUpdate({ theme: 'light' })}
          className={cn(
            'p-4 rounded-lg border text-left transition-gentle',
            theme === 'light'
              ? 'border-primary bg-primary/10 shadow-gentle-sm'
              : 'border-border hover:bg-muted/40'
          )}
        >
          <div className="flex items-center space-x-2 mb-1">
            <Icon name="Sun" size={18} color="var(--color-warning)" />
            <span className="font-body font-medium text-foreground">Light Mode</span>
          </div>
          <p className="caption text-muted-foreground text-xs">
            Brighter interface with soft dusty-rose accents.
          </p>
        </button>

        <button
          onClick={() => onUpdate({ theme: 'dark' })}
          className={cn(
            'p-4 rounded-lg border text-left transition-gentle',
            theme === 'dark'
              ? 'border-primary bg-primary/10 shadow-gentle-sm'
              : 'border-border hover:bg-muted/40'
          )}
        >
          <div className="flex items-center space-x-2 mb-1">
            <Icon name="Moon" size={18} color="var(--color-accent)" />
            <span className="font-body font-medium text-foreground">Dark Mode</span>
          </div>
          <p className="caption text-muted-foreground text-xs">
            Dimmed background with high contrast for evening use.
          </p>
        </button>
      </div>
    </div>
  );
};

export default AppearanceSection;
