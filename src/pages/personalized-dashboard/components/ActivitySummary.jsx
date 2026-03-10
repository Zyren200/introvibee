import React from 'react';
import Icon from '../../../components/AppIcon';

const ActivitySummary = ({ stats }) => {
  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading font-semibold text-foreground text-lg">
          Your Activity
        </h3>
        <Icon name="BarChart3" size={20} color="var(--color-success)" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats?.map((stat, index) => (
          <div key={index} className="flex flex-col space-y-2 bg-background/70 rounded-lg p-3 border border-border/70">
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat?.color}15` }}
              >
                <Icon name={stat?.icon} size={16} color={stat?.color} />
              </div>
              <span className="caption text-muted-foreground text-xs">
                {stat?.label}
              </span>
            </div>
            <p className="font-data text-2xl font-semibold text-foreground">
              {stat?.value}
            </p>
            {stat?.meta && (
              <p className="caption text-xs text-muted-foreground">
                {stat?.meta}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivitySummary;
