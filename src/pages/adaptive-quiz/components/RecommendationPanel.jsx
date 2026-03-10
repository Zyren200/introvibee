import React from 'react';
import Icon from '../../../components/AppIcon';
import { getRecommendation } from '../data/recommendations';

const RecommendationPanel = ({ question, answer }) => {
  const recommendation = getRecommendation(question?.id, answer);

  if (!recommendation) return null;

  return (
    <div className="bg-success/5 border-2 border-success/20 rounded-xl p-6 mb-6 animate-fade-in">
      <div className="flex items-start space-x-4">
        <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name={recommendation?.icon || 'Sparkles'} size={24} color="var(--color-success)" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
            {recommendation?.title}
          </h3>
          <p className="text-foreground font-body leading-relaxed mb-4">
            {recommendation?.message}
          </p>
          {recommendation?.suggestions && recommendation?.suggestions?.length > 0 && (
            <div className="space-y-2">
              {recommendation?.suggestions?.map((suggestion, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <Icon name="Check" size={16} color="var(--color-success)" className="flex-shrink-0 mt-1" />
                  <span className="caption text-muted-foreground text-sm">
                    {suggestion}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendationPanel;