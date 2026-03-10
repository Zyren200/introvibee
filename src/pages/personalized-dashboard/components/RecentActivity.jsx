import React, { useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';

const RecentActivity = ({ activities }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getActivityIcon = (type) => {
    const iconMap = {
      'conversation': 'MessageCircle',
      'learning': 'BookOpen',
      'reflection': 'PenTool',
      'match': 'Users',
      'quiet': 'Moon'
    };
    return iconMap?.[type] || 'Activity';
  };

  const getActivityColor = (type) => {
    const colorMap = {
      'conversation': 'var(--color-primary)',
      'learning': 'var(--color-accent)',
      'reflection': 'var(--color-secondary)',
      'match': 'var(--color-success)',
      'quiet': 'var(--color-primary)'
    };
    return colorMap?.[type] || 'var(--color-muted-foreground)';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const visibleActivities = useMemo(
    () => (isExpanded ? activities || [] : (activities || []).slice(0, 6)),
    [activities, isExpanded]
  );

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading font-semibold text-foreground text-lg">
          Recent Activity
        </h3>
        {activities?.length > 6 ? (
          <button
            className="caption text-primary hover:text-primary/80 transition-gentle text-sm font-medium"
            onClick={() => setIsExpanded((value) => !value)}
          >
            {isExpanded ? 'Show less' : 'View all'}
          </button>
        ) : null}
      </div>
      {visibleActivities?.length > 0 ? (
        <div className="space-y-4">
          {visibleActivities.map((activity, index) => (
          <div 
            key={index}
            className="flex items-start space-x-3 pb-4 border-b border-border last:border-b-0 last:pb-0"
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${getActivityColor(activity?.type)}15` }}
            >
              <Icon 
                name={getActivityIcon(activity?.type)} 
                size={18} 
                color={getActivityColor(activity?.type)} 
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-foreground font-body text-sm mb-1">
                {activity?.description}
              </p>
              <p className="caption text-muted-foreground text-xs">
                {formatTimeAgo(activity?.timestamp)}
              </p>
            </div>
          </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-foreground">
            No activity yet. Start by finding a match, taking a quiz, or opening a reflection tool.
          </p>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
