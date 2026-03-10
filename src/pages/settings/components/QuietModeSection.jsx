import React from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';

import { cn } from '../../../utils/cn';

const QuietModeSection = ({ settings, onUpdate }) => {
  const daysOfWeek = [
    { value: 'monday', label: 'Mon' },
    { value: 'tuesday', label: 'Tue' },
    { value: 'wednesday', label: 'Wed' },
    { value: 'thursday', label: 'Thu' },
    { value: 'friday', label: 'Fri' },
    { value: 'saturday', label: 'Sat' },
    { value: 'sunday', label: 'Sun' }
  ];

  const toggleDay = (day) => {
    const currentDays = settings?.daysOfWeek || [];
    const newDays = currentDays?.includes(day)
      ? currentDays?.filter(d => d !== day)
      : [...currentDays, day];
    onUpdate({ daysOfWeek: newDays });
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-gentle transition-gentle hover:shadow-gentle-md">
      <div className="flex items-start space-x-4 mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name="Moon" size={24} color="var(--color-primary)" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Quiet Mode Scheduling
          </h2>
          <p className="text-muted-foreground font-body text-sm">
            Set automatic do-not-disturb periods to minimize interruptions during your preferred quiet hours
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center space-x-3">
            <Icon 
              name={settings?.enabled ? 'BellOff' : 'Bell'} 
              size={20} 
              color="var(--color-foreground)" 
            />
            <div>
              <div className="font-body font-medium text-foreground">
                Enable Quiet Mode
              </div>
              <div className="text-sm text-muted-foreground caption">
                Notifications will be silenced during scheduled hours
              </div>
            </div>
          </div>
          <button
            onClick={() => onUpdate({ enabled: !settings?.enabled })}
            className={cn(
              'relative w-12 h-6 rounded-full transition-gentle',
              settings?.enabled ? 'bg-primary' : 'bg-muted'
            )}
            aria-label="Toggle quiet mode"
          >
            <div
              className={cn(
                'absolute top-1 w-4 h-4 bg-white rounded-full transition-gentle shadow-gentle-sm',
                settings?.enabled ? 'right-1' : 'left-1'
              )}
            />
          </button>
        </div>

        {settings?.enabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="time"
                label="Start Time"
                value={settings?.startTime}
                onChange={(e) => onUpdate({ startTime: e?.target?.value })}
                description="When quiet mode begins"
              />
              <Input
                type="time"
                label="End Time"
                value={settings?.endTime}
                onChange={(e) => onUpdate({ endTime: e?.target?.value })}
                description="When quiet mode ends"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                Active Days
              </label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek?.map((day) => (
                  <button
                    key={day?.value}
                    onClick={() => toggleDay(day?.value)}
                    className={cn(
                      'px-4 py-2 rounded-lg font-body font-medium transition-gentle',
                      settings?.daysOfWeek?.includes(day?.value)
                        ? 'bg-primary text-primary-foreground shadow-gentle-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {day?.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2 caption">
                Select the days when quiet mode should be active
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuietModeSection;