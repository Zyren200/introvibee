import React from 'react';
import Icon from '../../../components/AppIcon';

const SupportiveFeatures = () => {
  const features = [
    {
      icon: 'Users',
      title: 'Connect Gently',
      description: 'Find peers with shared interests at your own pace'
    },
    {
      icon: 'MessageCircle',
      title: 'Low-Pressure Messaging',
      description: 'Reply when you\'re ready with supportive prompts'
    },
    {
      icon: 'Moon',
      title: 'Quiet Mode',
      description: 'Set quiet hours and check messages when comfortable'
    },
    {
      icon: 'BookOpen',
      title: 'Self-Paced Learning',
      description: 'Adaptive tools that match your learning style'
    }
  ];

  return (
    <div className="mt-12">
      <h2 className="text-xl md:text-2xl lg:text-3xl font-heading font-semibold text-foreground text-center mb-8">
        Designed for Thoughtful Learners
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {features?.map((feature, index) => (
          <div
            key={index}
            className="bg-card rounded-xl p-6 border border-border hover:shadow-gentle-md transition-gentle"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon name={feature?.icon} size={24} color="var(--color-primary)" />
              </div>
              <div className="flex-1">
                <h3 className="font-body font-semibold text-foreground mb-2">
                  {feature?.title}
                </h3>
                <p className="caption text-muted-foreground leading-relaxed">
                  {feature?.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupportiveFeatures;