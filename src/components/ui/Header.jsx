import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navigationItems = [
    {
      label: 'Your Dashboard',
      path: '/personalized-dashboard',
      icon: 'LayoutDashboard',
      description: 'Central coordination space'
    },
    {
      label: 'Adaptive Quiz',
      path: '/adaptive-quiz',
      icon: 'ClipboardList',
      description: 'Personalized assessment'
    },
    {
      label: 'Connect Gently',
      path: '/find-matches-conversations',
      icon: 'MessageCircle',
      description: 'Discovery and messaging'
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: 'Settings',
      description: 'Customize preferences'
    },
    {
      label: 'Log out',
      icon: 'LogOut',
      description: 'End current session',
      action: 'logout'
    }
  ];

  const isActivePath = (path) => {
    return location?.pathname === path;
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const openLogoutConfirm = () => {
    setMobileMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const closeLogoutConfirm = () => {
    setShowLogoutConfirm(false);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    navigate('/login-personal-info');
  };

  return (
    <header className="sticky top-0 z-100 bg-card shadow-gentle transition-gentle">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link 
            to="/personalized-dashboard" 
            className="flex items-center space-x-3 transition-gentle hover:opacity-80"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center transition-gentle">
              <Icon name="Sparkles" size={24} color="var(--color-primary)" />
            </div>
            <span className="text-xl font-heading font-semibold text-foreground">
              ISF_Ease
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-2">
            {navigationItems?.map((item) => {
              if (item?.action === 'logout') {
                return (
                  <button
                    key={item?.label}
                    type="button"
                    onClick={openLogoutConfirm}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-gentle font-body font-medium text-foreground hover:bg-muted hover:shadow-gentle-sm"
                    title={item?.description}
                  >
                    <Icon name={item?.icon} size={20} color="currentColor" />
                    <span>{item?.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item?.path}
                  to={item?.path}
                  className={`
                    flex items-center space-x-2 px-4 py-2.5 rounded-lg
                    transition-gentle font-body font-medium
                    ${isActivePath(item?.path)
                      ? 'bg-primary text-primary-foreground shadow-gentle-sm'
                      : 'text-foreground hover:bg-muted hover:shadow-gentle-sm'
                    }
                  `}
                  title={item?.description}
                >
                  <Icon
                    name={item?.icon}
                    size={20}
                    color={isActivePath(item?.path) ? 'var(--color-primary-foreground)' : 'currentColor'}
                  />
                  <span>{item?.label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-gentle"
            aria-label="Toggle mobile menu"
          >
            <Icon 
              name={mobileMenuOpen ? 'X' : 'Menu'} 
              size={24} 
              color="var(--color-foreground)" 
            />
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-border">
          <nav className="px-6 py-4 space-y-2">
            {navigationItems?.map((item) => {
              if (item?.action === 'logout') {
                return (
                  <button
                    key={item?.label}
                    type="button"
                    onClick={openLogoutConfirm}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-gentle font-body font-medium text-foreground hover:bg-muted"
                  >
                    <Icon name={item?.icon} size={20} color="currentColor" />
                    <div className="flex-1 text-left">
                      <div>{item?.label}</div>
                      <div className="text-xs opacity-70 caption">{item?.description}</div>
                    </div>
                  </button>
                );
              }

              return (
                <Link
                  key={item?.path}
                  to={item?.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg
                    transition-gentle font-body font-medium
                    ${isActivePath(item?.path)
                      ? 'bg-primary text-primary-foreground shadow-gentle-sm'
                      : 'text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <Icon
                    name={item?.icon}
                    size={20}
                    color={isActivePath(item?.path) ? 'var(--color-primary-foreground)' : 'currentColor'}
                  />
                  <div className="flex-1">
                    <div>{item?.label}</div>
                    <div className="text-xs opacity-70 caption">{item?.description}</div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[120] bg-black/45 px-4 flex items-center justify-center">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-gentle-lg p-5 md:p-6">
            <h2 className="text-lg font-heading font-semibold text-foreground">Log out?</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to log out of your account?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={closeLogoutConfirm}>
                Cancel
              </Button>
              <Button variant="danger" iconName="LogOut" onClick={confirmLogout}>
                Yes, log out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
