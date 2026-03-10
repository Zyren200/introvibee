import React from 'react';
import Icon from '../../../components/AppIcon';

const TrustSignals = () => {
  const trustFeatures = [
    {
      icon: 'Shield',
      label: 'SSL Secured',
      description: 'Your data is encrypted'
    },
    {
      icon: 'Lock',
      label: 'Privacy Protected',
      description: 'We never share your information'
    },
    {
      icon: 'Eye',
      label: 'Safe Space',
      description: 'Respectful community guidelines'
    }
  ];

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {trustFeatures?.map((feature, index) => (
          <div
            key={index}
            className="flex flex-col items-center text-center space-y-2 transition-gentle"
          >
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <Icon name={feature?.icon} size={24} color="var(--color-success)" />
            </div>
            <h3 className="font-body font-medium text-foreground">
              {feature?.label}
            </h3>
            <p className="caption text-muted-foreground">
              {feature?.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustSignals;