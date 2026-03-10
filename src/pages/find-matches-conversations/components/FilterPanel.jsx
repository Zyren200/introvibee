import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const FilterPanel = ({ onApplyFilters, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    interests: [],
    personalityTags: [],
    availability: [],
    compatibilityRange: [70, 100]
  });

  const interestOptions = [
    'Reading', 'Writing', 'Art', 'Music', 'Gaming', 'Coding',
    'Photography', 'Hiking', 'Cooking', 'Meditation'
  ];

  const personalityOptions = [
    'Thoughtful listener', 'Deep thinker', 'Creative mind',
    'Quiet observer', 'Reflective soul', 'Gentle communicator'
  ];

  const availabilityOptions = [
    'Available now', 'Active today', 'Responds within 24h'
  ];

  const handleInterestToggle = (interest) => {
    setFilters(prev => ({
      ...prev,
      interests: prev?.interests?.includes(interest)
        ? prev?.interests?.filter(i => i !== interest)
        : [...prev?.interests, interest]
    }));
  };

  const handlePersonalityToggle = (tag) => {
    setFilters(prev => ({
      ...prev,
      personalityTags: prev?.personalityTags?.includes(tag)
        ? prev?.personalityTags?.filter(t => t !== tag)
        : [...prev?.personalityTags, tag]
    }));
  };

  const handleAvailabilityToggle = (option) => {
    setFilters(prev => ({
      ...prev,
      availability: prev?.availability?.includes(option)
        ? prev?.availability?.filter(a => a !== option)
        : [...prev?.availability, option]
    }));
  };

  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters(filters);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    setFilters({
      interests: [],
      personalityTags: [],
      availability: [],
      compatibilityRange: [70, 100]
    });
    if (onReset) {
      onReset();
    }
  };

  const activeFilterCount = 
    filters?.interests?.length + 
    filters?.personalityTags?.length + 
    filters?.availability?.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted transition-gentle"
      >
        <Icon name="SlidersHorizontal" size={18} color="var(--color-foreground)" />
        <span className="font-body font-medium text-foreground">Filters</span>
        {activeFilterCount > 0 && (
          <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full caption font-medium">
            {activeFilterCount}
          </span>
        )}
      </button>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-card rounded-xl border border-border shadow-gentle-lg z-50 max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
              <h3 className="font-heading font-semibold text-foreground">
                Filter Matches
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-muted transition-gentle"
              >
                <Icon name="X" size={18} color="var(--color-foreground)" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              <div>
                <h4 className="font-body font-medium text-foreground mb-3">
                  Shared Interests
                </h4>
                <div className="space-y-2">
                  {interestOptions?.map((interest) => (
                    <Checkbox
                      key={interest}
                      label={interest}
                      checked={filters?.interests?.includes(interest)}
                      onChange={() => handleInterestToggle(interest)}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h4 className="font-body font-medium text-foreground mb-3">
                  Personality Tags
                </h4>
                <div className="space-y-2">
                  {personalityOptions?.map((tag) => (
                    <Checkbox
                      key={tag}
                      label={tag}
                      checked={filters?.personalityTags?.includes(tag)}
                      onChange={() => handlePersonalityToggle(tag)}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h4 className="font-body font-medium text-foreground mb-3">
                  Availability
                </h4>
                <div className="space-y-2">
                  {availabilityOptions?.map((option) => (
                    <Checkbox
                      key={option}
                      label={option}
                      checked={filters?.availability?.includes(option)}
                      onChange={() => handleAvailabilityToggle(option)}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h4 className="font-body font-medium text-foreground mb-3">
                  Compatibility Score
                </h4>
                <div className="flex items-center space-x-3">
                  <span className="caption text-muted-foreground">
                    {filters?.compatibilityRange?.[0]}%
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full relative">
                    <div 
                      className="absolute h-full bg-primary rounded-full"
                      style={{ 
                        left: `${filters?.compatibilityRange?.[0]}%`,
                        right: `${100 - filters?.compatibilityRange?.[1]}%`
                      }}
                    />
                  </div>
                  <span className="caption text-muted-foreground">
                    {filters?.compatibilityRange?.[1]}%
                  </span>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-card border-t border-border p-4 flex gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                variant="default"
                onClick={handleApply}
                className="flex-1"
              >
                Apply filters
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FilterPanel;