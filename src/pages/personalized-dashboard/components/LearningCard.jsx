import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';

const LearningCard = ({ title, description, iconName, iconColor, path, isActive = true, onClick }) => {
  const baseClass = `
    group block w-full text-left bg-card rounded-xl p-6 border border-border
    transition-gentle hover:shadow-gentle-md
    ${isActive ? 'hover:border-primary/30' : 'opacity-60 cursor-not-allowed pointer-events-none'}
  `;

  const content = (
    <div className="flex items-start space-x-4">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-gentle"
        style={{ backgroundColor: `${iconColor}15` }}
      >
        <Icon name={iconName} size={24} color={iconColor} />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-heading font-semibold text-foreground text-lg mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground caption leading-relaxed">
          {description}
        </p>
      </div>

      <Icon
        name="ArrowRight"
        size={20}
        color="var(--color-muted-foreground)"
        className="flex-shrink-0 mt-1 transition-gentle group-hover:translate-x-1"
      />
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClass}>
        {content}
      </button>
    );
  }

  return (
    <Link to={path} className={baseClass}>
      {content}
    </Link>
  );
};

export default LearningCard;
