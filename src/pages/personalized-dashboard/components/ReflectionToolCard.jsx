import React from 'react';
import Icon from '../../../components/AppIcon';

const ReflectionToolCard = ({ title, description, iconName, iconColor, lastUsed, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-xl p-5 border border-border transition-gentle hover:shadow-gentle hover:border-primary/20"
    >
      <div className="flex items-start space-x-4">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-gentle"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon name={iconName} size={20} color={iconColor} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-semibold text-foreground mb-1">
            {title}
          </h4>
          <p className="caption text-muted-foreground text-sm mb-2 line-clamp-2">
            {description}
          </p>
          {lastUsed && (
            <div className="flex items-center space-x-1 caption text-xs text-muted-foreground">
              <Icon name="Clock" size={12} color="var(--color-muted-foreground)" />
              <span>Last used {lastUsed}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default ReflectionToolCard;