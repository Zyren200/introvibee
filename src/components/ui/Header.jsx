import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import { useIntroVibeAuth } from '../../introVibeAuth';
import { getPostAuthRoute } from '../../utils/introVibe';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, currentUser } = useIntroVibeAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigationItems = [
    {
      label: 'Home',
      path: '/personalized-dashboard',
      icon: 'Home',
      description: 'Your IntroVibe home'
    },
    {
      label: 'Personality Test',
      path: '/adaptive-quiz',
      icon: 'ClipboardList',
      description: '5-question personality check'
    },
    {
      label: 'Matches & Chat',
      path: '/find-matches-conversations',
      icon: 'MessagesSquare',
      description: 'Find people based on personality and interests'
    },
    ...(currentUser?.personalityType === 'Introvert'
      ? [
          {
            label: 'Sudoku',
            path: '/sudoku-puzzle',
            icon: 'Grid3X3',
            description: 'Solve the puzzle to unlock chat access'
          }
        ]
      : []),
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

  const isActivePath = (path) => location?.pathname === path;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const openLogoutConfirm = () => {
    setMobileMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const closeLogoutConfirm = () => {
    if (isLoggingOut) return;
    setShowLogoutConfirm(false);
  };

  useEffect(() => {
    if (!showLogoutConfirm) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeLogoutConfirm();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLogoutConfirm, isLoggingOut]);

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setShowLogoutConfirm(false);
    navigate('/login-personal-info');
  };

  const logoutConfirmModal = showLogoutConfirm && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={closeLogoutConfirm}
        >
          <div
            className="relative w-full max-w-sm rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_28px_80px_rgba(0,0,0,0.35)] md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeLogoutConfirm}
              disabled={isLoggingOut}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-gentle hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label="Close logout confirmation"
            >
              <Icon name="X" size={18} color="currentColor" />
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Icon name="LogOut" size={20} color="var(--color-primary)" />
            </div>
            <h2 className="text-lg font-heading font-semibold text-foreground">Log out?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to log out of your account?
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={closeLogoutConfirm} disabled={isLoggingOut}>
                Cancel
              </Button>
              <Button variant="danger" iconName="LogOut" onClick={confirmLogout} loading={isLoggingOut}>
                Yes, log out
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <header className="sticky top-0 z-[100] bg-card shadow-gentle transition-gentle">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link 
              to={getPostAuthRoute(currentUser)}
              className="flex items-center space-x-3 transition-gentle hover:opacity-80"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center transition-gentle">
                <Icon name="Sparkles" size={24} color="var(--color-primary)" />
              </div>
              <span className="text-xl font-heading font-semibold text-foreground">
                IntroVibe
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
      </header>
      {logoutConfirmModal}
    </>
  );
};

export default Header;
