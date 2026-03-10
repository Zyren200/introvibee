import React from 'react';
import Button from '../../../components/ui/Button';

const NavigationControls = ({
  onPrevious,
  onNext,
  onSkip,
  onPause,
  canGoPrevious,
  canGoNext,
  isLastQuestion
}) => {
  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Previous Button */}
        <Button
          variant="ghost"
          iconName="ChevronLeft"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="flex-1"
        >
          Previous
        </Button>

        {/* Skip Button */}
        <Button
          variant="secondary"
          iconName="SkipForward"
          onClick={onSkip}
          className="flex-1"
        >
          Skip for now
        </Button>

        {/* Next/Complete Button */}
        <Button
          variant="default"
          iconName={isLastQuestion ? 'CheckCircle' : 'ChevronRight'}
          iconPosition="right"
          onClick={onNext}
          disabled={!canGoNext}
          className="flex-1"
        >
          {isLastQuestion ? 'Complete Quiz' : 'Next Question'}
        </Button>
      </div>

      {/* Pause Button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={onPause}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-gentle caption"
        >
          <span>Pause & Save Progress</span>
        </button>
      </div>
    </div>
  );
};

export default NavigationControls;