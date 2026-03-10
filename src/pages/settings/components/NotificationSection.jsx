import React from 'react';
import Icon from '../../../components/AppIcon';
import { Checkbox, CheckboxGroup } from '../../../components/ui/Checkbox';

const NotificationSection = ({ settings, onUpdate }) => {
  const notificationTypes = [
    {
      key: 'messageAlerts',
      label: 'Message Alerts',
      description: 'Get notified when you receive new messages from matches',
      icon: 'MessageSquare'
    },
    {
      key: 'matchSuggestions',
      label: 'Match Suggestions',
      description: 'Receive notifications about new potential matches based on your interests',
      icon: 'Users'
    },
    {
      key: 'systemUpdates',
      label: 'System Updates',
      description: 'Stay informed about platform updates and new features',
      icon: 'Bell'
    },
    {
      key: 'emailNotifications',
      label: 'Email Notifications',
      description: 'Receive important updates via email (weekly digest)',
      icon: 'Mail'
    },
    {
      key: 'quietHoursRespect',
      label: 'Respect Quiet Hours',
      description: 'Automatically silence notifications during your scheduled quiet mode',
      icon: 'Moon'
    }
  ];

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-gentle transition-gentle hover:shadow-gentle-md">
      <div className="flex items-start space-x-4 mb-6">
        <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name="Bell" size={24} color="var(--color-secondary)" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Notification Preferences
          </h2>
          <p className="text-muted-foreground font-body text-sm">
            Control what notifications you receive and when you receive them
          </p>
        </div>
      </div>

      <CheckboxGroup
        label="Notification Types"
        description="Choose which notifications you'd like to receive"
      >
        <div className="space-y-4">
          {notificationTypes?.map((type) => (
            <div
              key={type?.key}
              className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-gentle"
            >
              <div className="flex items-start space-x-3">
                <div className="pt-1">
                  <Icon 
                    name={type?.icon} 
                    size={20} 
                    color="var(--color-foreground)" 
                  />
                </div>
                <div className="flex-1">
                  <Checkbox
                    checked={settings?.[type?.key]}
                    onChange={(e) => onUpdate({ [type?.key]: e?.target?.checked })}
                    label={type?.label}
                    description={type?.description}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CheckboxGroup>

      <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-lg flex items-start space-x-3">
        <Icon name="Heart" size={18} color="var(--color-accent)" className="flex-shrink-0 mt-0.5" />
        <div className="text-sm text-foreground font-body">
          <strong>Gentle Notifications:</strong> All notifications are designed to be non-intrusive and supportive, respecting your need for a calm learning environment.
        </div>
      </div>
    </div>
  );
};

export default NotificationSection;