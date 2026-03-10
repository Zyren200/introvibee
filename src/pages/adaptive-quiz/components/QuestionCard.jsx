import React from 'react';
import Icon from '../../../components/AppIcon';

const QuestionCard = ({ question, questionNumber, totalQuestions, selectedAnswer, onAnswer }) => {
  if (!question) return null;

  const handleOptionClick = (option) => {
    onAnswer(question?.id, option);
  };
  const difficultyLabel =
    question?.difficulty === 'deep'
      ? 'Deep'
      : question?.difficulty === 'easy'
        ? 'Easy'
        : 'Medium';

  return (
    <div className="bg-card rounded-xl p-8 border border-border shadow-gentle mb-6 transition-gentle">
      {/* Question Header */}
      <div className="flex items-start space-x-4 mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name={question?.icon || 'MessageCircle'} size={24} color="var(--color-primary)" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="caption text-muted-foreground text-sm">
              Question {questionNumber} of {totalQuestions}
            </span>
            <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-full caption text-xs">
              {question?.category}
            </span>
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full caption text-xs">
              {difficultyLabel}
            </span>
          </div>
          <h2 className="font-heading text-xl font-semibold text-foreground leading-relaxed">
            {question?.text}
          </h2>
        </div>
      </div>

      {/* Response Options */}
      <div className="space-y-3">
        {question?.options?.map((option, index) => {
          const isSelected = selectedAnswer === option?.value;
          return (
            <button
              key={index}
              onClick={() => handleOptionClick(option?.value)}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-gentle
                ${isSelected
                  ? 'border-primary bg-primary/5 shadow-gentle'
                  : 'border-border hover:border-primary/30 hover:bg-muted'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-gentle
                  ${isSelected
                    ? 'border-primary bg-primary' :'border-muted-foreground'
                  }
                `}>
                  {isSelected && (
                    <Icon name="Check" size={14} color="var(--color-primary-foreground)" />
                  )}
                </div>
                <span className={`font-body ${
                  isSelected ? 'text-foreground font-medium' : 'text-foreground'
                }`}>
                  {option?.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Helpful Note */}
      <div className="mt-6 flex items-start space-x-2 p-4 bg-muted/50 rounded-lg">
        <Icon name="Info" size={16} color="var(--color-muted-foreground)" className="flex-shrink-0 mt-0.5" />
        <p className="caption text-muted-foreground text-sm leading-relaxed">
          Choose the option that feels most true to you. You can always change your answer before moving on.
        </p>
      </div>
    </div>
  );
};

export default QuestionCard;
