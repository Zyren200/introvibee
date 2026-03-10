import React from 'react';
import Icon from '../../../components/AppIcon';

const WelcomeMessage = () => {
  return (
    <div className="text-center space-y-4 mb-8">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center transition-gentle">
          <Icon name="Sparkles" size={40} color="var(--color-primary)" />
        </div>
      </div>
      
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-semibold text-foreground">
        Welcome to Your Quiet Space
      </h1>
      
      <p className="text-base md:text-lg lg:text-xl text-muted-foreground font-body max-w-2xl mx-auto leading-relaxed">
        A calm, supportive environment designed for learning and meaningful connections at your own pace
      </p>
    </div>
  );
};

export default WelcomeMessage;