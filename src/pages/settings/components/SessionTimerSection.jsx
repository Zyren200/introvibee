import React from 'react';
import Icon from '../../../components/AppIcon';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';


const SessionTimerSection = ({ settings, onUpdate }) => {
  const durationOptions = [
    { value: 15, label: '15 minutes' },
    { value: 20, label: '20 minutes' },
    { value: 25, label: '25 minutes (Pomodoro)' },
    { value: 30, label: '30 minutes (max)' }
  ];

  const breakDurationOptions = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' }
  ];

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-gentle transition-gentle hover:shadow-gentle-md">
      <div className="flex items-start space-x-4 mb-6">
        <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name="Clock" size={24} color="var(--color-accent)" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            30-Minute Session Timer Configuration
          </h2>
          <p className="text-muted-foreground font-body text-sm">
            Customize your focus session settings with gentle countdown options and break reminders
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Select
          label="Session Duration"
          options={durationOptions}
          value={settings?.duration}
          onChange={(value) => onUpdate({ duration: value })}
          description="Choose your preferred focus session length"
        />

        <Select
          label="Break Duration"
          options={breakDurationOptions}
          value={settings?.breakDuration}
          onChange={(value) => onUpdate({ breakDuration: value })}
          description="Length of break between sessions"
        />

        <div className="space-y-4 pt-2">
          <Checkbox
            checked={settings?.breakReminder}
            onChange={(e) => onUpdate({ breakReminder: e?.target?.checked })}
            label="Break Reminders"
            description="Receive gentle notifications when it's time for a break"
          />

          <Checkbox
            checked={settings?.autoStart}
            onChange={(e) => onUpdate({ autoStart: e?.target?.checked })}
            label="Auto-start Sessions"
            description="Automatically begin the next session after break ends"
          />

          <Checkbox
            checked={settings?.soundEnabled}
            onChange={(e) => onUpdate({ soundEnabled: e?.target?.checked })}
            label="Sound Notifications"
            description="Play a gentle chime when session or break ends"
          />
        </div>

        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start space-x-3">
          <Icon name="Info" size={18} color="var(--color-primary)" className="flex-shrink-0 mt-0.5" />
          <div className="text-sm text-foreground font-body">
            <strong>Progress Tracking:</strong> Focus sessions are capped at 30 minutes to encourage gentle breaks. History is saved automatically so you can resume later.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionTimerSection;
