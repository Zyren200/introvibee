import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';

const QuickAccessTile = ({ title, subtitle, iconName, iconColor, path, badge }) => {
  return (
    <Link
      to={path}
      className="relative overflow-hidden bg-card rounded-xl p-4 border border-border transition-gentle hover:shadow-gentle-md hover:border-primary/30 group"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-gentle"
        style={{ background: `linear-gradient(120deg, ${iconColor}10 0%, transparent 55%)` }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-gentle border border-border/60"
            style={{ backgroundColor: `${iconColor}18` }}
          >
            <Icon name={iconName} size={20} color={iconColor} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h4 className="font-heading font-semibold text-foreground text-base leading-tight">
                {title}
              </h4>
              {badge && (
                <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-md caption text-[11px] font-semibold">
                  {badge}
                </span>
              )}
            </div>
            <p className="caption text-muted-foreground text-xs leading-relaxed">
              {subtitle}
            </p>
            <div className="mt-2 inline-flex items-center gap-1 text-primary caption text-xs font-medium">
              <span>Open</span>
              <Icon name="ArrowRight" size={12} color="var(--color-primary)" />
            </div>
          </div>
        </div>

        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/60 text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary transition-gentle flex-shrink-0">
          <Icon name="ChevronRight" size={16} color="currentColor" />
        </div>
      </div>
    </Link>
  );
};

export default QuickAccessTile;
