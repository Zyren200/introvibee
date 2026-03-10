import React, { useState } from 'react';
import Icon from '../AppIcon';
import { useAppState } from '../../context/AppStateContext';

const QuietModeIndicator = () => {
  const { isQuietNow, quietState, enableQuietMode, disableQuietMode } = useAppState();
  const [showTooltip, setShowTooltip] = useState(false);

  const toggleQuietMode = () => {
    if (isQuietNow) {
      disableQuietMode();
    } else {
      // Default to 2 hours, aligns with test case
      enableQuietMode(120);
    }
  };

  const quietUntilLabel = quietState?.until
    ? new Date(quietState.until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'until you turn it off';

  const pendingCount = quietState?.pendingNotifications?.length || 0;

  return (
    <div className="relative">
      <button
        onClick={toggleQuietMode}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg
          transition-gentle font-caption
          ${isQuietNow
            ? 'bg-primary text-primary-foreground shadow-gentle-sm'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }
        `}
        aria-label={isQuietNow ? 'Disable quiet mode' : 'Enable quiet mode'}
      >
        <Icon 
          name={isQuietNow ? 'BellOff' : 'Bell'} 
          size={18} 
          color={isQuietNow ? 'var(--color-primary-foreground)' : 'currentColor'}
        />
        <span className="hidden sm:inline">
          {isQuietNow ? 'Quiet Mode' : 'Notifications'}
        </span>
        {pendingCount > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[11px] font-semibold">
            {pendingCount}
          </span>
        )}
      </button>

      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-gentle-md caption whitespace-nowrap z-50 transition-gentle">
          {isQuietNow
            ? `Quiet Hours on ${quietState?.until ? `(until ${quietUntilLabel})` : ''}`
            : 'Click to enable 2-hour Quiet Mode'}
          <div className="absolute -top-1 right-4 w-2 h-2 bg-popover transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

export default QuietModeIndicator;
