import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';

const NavigationBreadcrumb = () => {
  const location = useLocation();

  const breadcrumbMap = {
    '/personalized-dashboard': [
      { label: 'Your Dashboard', path: '/personalized-dashboard' }
    ],
    '/find-matches-conversations': [
      { label: 'Your Dashboard', path: '/personalized-dashboard' },
      { label: 'Connect Gently', path: '/find-matches-conversations' }
    ],
    '/login-personal-info': [
      { label: 'Your Quiet Space', path: '/login-personal-info' }
    ]
  };

  const breadcrumbs = breadcrumbMap?.[location?.pathname] || [];

  if (breadcrumbs?.length === 0) return null;

  return (
    <nav className="bg-background border-b border-border" aria-label="Breadcrumb">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3">
        <ol className="flex items-center space-x-2 caption">
          <li>
            <Link 
              to="/personalized-dashboard"
              className="flex items-center text-muted-foreground hover:text-foreground transition-gentle"
            >
              <Icon name="Home" size={16} color="currentColor" />
            </Link>
          </li>

          {breadcrumbs?.map((crumb, index) => (
            <li key={crumb?.path} className="flex items-center space-x-2">
              <Icon 
                name="ChevronRight" 
                size={16} 
                color="var(--color-muted-foreground)" 
              />
              {index === breadcrumbs?.length - 1 ? (
                <span className="text-foreground font-medium">
                  {crumb?.label}
                </span>
              ) : (
                <Link
                  to={crumb?.path}
                  className="text-muted-foreground hover:text-foreground transition-gentle"
                >
                  {crumb?.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
};

export default NavigationBreadcrumb;