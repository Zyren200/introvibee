import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../AppIcon';
import { useAppState } from '../../context/AppStateContext';

const TIMER_POSITION_KEY = 'isf-session-timer-position';

const SessionTimer = ({ initialMinutes = 30, onSessionEnd, onWarning, onSaveProgress }) => {
  const { sessionLimitMinutes, sessionWarningOffsetMinutes, logSessionMinutes } = useAppState();
  const cappedMinutes = useMemo(
    () => Math.min(initialMinutes, sessionLimitMinutes),
    [initialMinutes, sessionLimitMinutes]
  );
  const totalSeconds = useMemo(() => cappedMinutes * 60, [cappedMinutes]);

  const [timeRemaining, setTimeRemaining] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const timerRef = useRef(null);
  const dragRef = useRef({
    active: false,
    offsetX: 0,
    offsetY: 0,
  });

  const getClampedPosition = (nextX, nextY) => {
    const rect = timerRef.current?.getBoundingClientRect();
    const width = rect?.width || 320;
    const height = rect?.height || 180;
    const minX = 8;
    const minY = 8;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - height - 8);

    return {
      x: Math.min(Math.max(minX, nextX), maxX),
      y: Math.min(Math.max(minY, nextY), maxY),
    };
  };

  useEffect(() => {
    let rafId = null;
    try {
      const raw = localStorage.getItem(TIMER_POSITION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
          setPosition(getClampedPosition(parsed.x, parsed.y));
          return undefined;
        }
      }
    } catch (error) {
      console.error('Failed to load timer position', error);
    }

    rafId = window.requestAnimationFrame(() => {
      const rect = timerRef.current?.getBoundingClientRect();
      const width = rect?.width || 320;
      const height = rect?.height || 180;
      const defaultPosition = getClampedPosition(
        window.innerWidth - width - 24,
        window.innerHeight - height - 24
      );
      setPosition(defaultPosition);
    });

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        return getClampedPosition(prev.x, prev.y);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let interval = null;

    if (isActive && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((time) => {
          const newTime = time - 1;

          if (newTime === sessionWarningOffsetMinutes * 60 && !warningShown && onWarning) {
            setWarningShown(true);
            onWarning();
          }

          if (newTime === 0) {
            setSessionEnded(true);
            setIsActive(false);
            if (logSessionMinutes) {
              logSessionMinutes(cappedMinutes);
            }
            if (onSessionEnd) {
              onSessionEnd();
            }
          }

          return newTime;
        });
      }, 1000);
    } else if (timeRemaining === 0) {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [
    isActive,
    isPaused,
    timeRemaining,
    warningShown,
    onWarning,
    onSessionEnd,
    sessionWarningOffsetMinutes,
    cappedMinutes,
    logSessionMinutes,
  ]);

  useEffect(() => {
    const handleMove = (event) => {
      if (!dragRef.current.active) return;
      const next = getClampedPosition(
        event.clientX - dragRef.current.offsetX,
        event.clientY - dragRef.current.offsetY
      );
      setPosition(next);
    };

    const handleUp = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      setIsDragging(false);
      if (position) {
        try {
          localStorage.setItem(TIMER_POSITION_KEY, JSON.stringify(position));
        } catch (error) {
          console.error('Failed to persist timer position', error);
        }
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [position]);

  const handleDragStart = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!timerRef.current) return;
    const rect = timerRef.current.getBoundingClientRect();
    dragRef.current = {
      active: true,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setIsDragging(true);
    event.preventDefault();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins?.toString()?.padStart(2, '0')}:${secs?.toString()?.padStart(2, '0')}`;
  };

  const togglePause = () => {
    if (sessionEnded) return;
    setIsPaused(!isPaused);
  };

  const resetTimer = () => {
    setTimeRemaining(totalSeconds);
    setWarningShown(false);
    setIsPaused(false);
    setIsActive(true);
    setSessionEnded(false);
    setIsHidden(false);
    setIsMinimized(false);
  };

  const getTimerColor = () => {
    if (timeRemaining <= sessionWarningOffsetMinutes * 60) return 'text-warning';
    if (timeRemaining <= 600) return 'text-accent';
    return 'text-primary';
  };

  const elapsedSeconds = totalSeconds - timeRemaining;
  const progress = elapsedSeconds / totalSeconds;

  if (isHidden) return null;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed top-4 right-4 z-200 bg-card border border-border rounded-lg px-3 py-2 shadow-gentle-lg flex items-center gap-2 hover:shadow-gentle-md transition-gentle"
        aria-label="Restore session timer"
      >
        <Icon name="Clock" size={16} color="var(--color-primary)" />
        <span className={`font-data text-sm ${getTimerColor()}`}>
          {formatTime(Math.max(timeRemaining, 0))}
        </span>
      </button>
    );
  }

  return (
    <div
      ref={timerRef}
      className={`fixed z-200 bg-card rounded-xl shadow-gentle-lg p-4 border border-border transition-gentle ${isDragging ? 'select-none' : ''}`}
      style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
    >
      <div
        onPointerDown={handleDragStart}
        className={`mb-3 -mt-1 px-2 py-1 rounded-md bg-muted/40 border border-border/70 flex items-center justify-between gap-2 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div className="flex items-center justify-center gap-2">
          <Icon name="GripHorizontal" size={14} color="var(--color-muted-foreground)" />
          <span className="caption text-xs text-muted-foreground">Drag timer</span>
        </div>
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setIsMinimized(true)}
          className="p-1 rounded-md hover:bg-muted transition-gentle"
          aria-label="Minimize timer"
          title="Minimize"
        >
          <Icon name="Minus" size={14} color="var(--color-muted-foreground)" />
        </button>
      </div>

      <div className="flex items-center space-x-3">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="var(--color-muted)"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="var(--color-primary)"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress)}`}
              className="transition-gentle"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon name="Clock" size={20} color="var(--color-primary)" />
          </div>
        </div>

        <div className="flex-1">
          <div className="caption text-muted-foreground mb-1">Session Time</div>
          <div className={`text-2xl font-data font-medium ${getTimerColor()} transition-gentle`}>
            {formatTime(Math.max(timeRemaining, 0))}
          </div>
          <p className="caption text-muted-foreground">
            Max {sessionLimitMinutes} minutes - reminder at {sessionLimitMinutes - sessionWarningOffsetMinutes} minutes
          </p>
        </div>

        <div className="flex flex-col space-y-2">
          <button
            onClick={togglePause}
            className="p-2 rounded-lg hover:bg-muted transition-gentle"
            aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
            disabled={sessionEnded}
          >
            <Icon
              name={isPaused ? 'Play' : 'Pause'}
              size={18}
              color="var(--color-foreground)"
            />
          </button>
          <button
            onClick={resetTimer}
            className="p-2 rounded-lg hover:bg-muted transition-gentle"
            aria-label="Reset timer"
          >
            <Icon name="RotateCcw" size={18} color="var(--color-foreground)" />
          </button>
        </div>
      </div>

      {timeRemaining <= sessionWarningOffsetMinutes * 60 && timeRemaining > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center space-x-2 text-warning caption">
            <Icon name="AlertCircle" size={14} color="var(--color-warning)" />
            <span>5 minutes remaining</span>
          </div>
        </div>
      )}

      {sessionEnded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="flex items-center space-x-2 text-accent caption">
            <Icon name="Coffee" size={14} color="var(--color-accent)" />
            <span>Session paused. Take a breather.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetTimer}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground font-body text-sm hover:shadow-gentle-sm transition-gentle"
            >
              Resume (new 30m)
            </button>
            <button
              onClick={() => {
                const minutesSpent = elapsedSeconds / 60;
                if (onSaveProgress) {
                  onSaveProgress(minutesSpent);
                } else if (logSessionMinutes) {
                  logSessionMinutes(minutesSpent);
                }
                setIsHidden(true);
              }}
              className="px-3 py-2 rounded-lg bg-muted text-foreground font-body text-sm hover:bg-muted/80 transition-gentle"
            >
              Save & Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionTimer;
