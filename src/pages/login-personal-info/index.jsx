
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import WelcomeMessage from './components/WelcomeMessage';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import TrustSignals from './components/TrustSignals';
import SupportiveFeatures from './components/SupportiveFeatures';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

const LoginPersonalInfo = () => {
  const [isSignupMode, setIsSignupMode] = useState(false);
  const { currentUser, logout } = useAuth();
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <>
      <Helmet>
        <title>{isSignupMode ? 'Create Account' : 'Login'} - ISF_Ease | Your Quiet Space for Learning</title>
        <meta
          name="description"
          content="Access your supportive learning platform designed for introverted students. Connect, learn, and grow at your own pace in a calm digital environment."
        />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
          <div className="max-w-md mx-auto">
            <WelcomeMessage />

            {currentUser && (
              <div className="bg-success/10 border border-success/20 rounded-2xl p-4 mb-4 flex items-start space-x-3">
                <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                  <span className="font-heading text-success font-semibold text-lg">{currentUser.username[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    You are signed in as <strong>{currentUser.username}</strong>.
                  </p>
                  <p className="caption text-muted-foreground">Log out to create another account for testing two-way messaging.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Log out
                </Button>
              </div>
            )}

            <div className="bg-card rounded-2xl shadow-gentle-lg p-6 md:p-8 lg:p-10 border border-border">
              {isSignupMode ? (
                <SignupForm onSwitchToLogin={() => setIsSignupMode(false)} />
              ) : (
                <LoginForm onSwitchToSignup={() => setIsSignupMode(true)} />
              )}
            </div>

            <TrustSignals />
          </div>

          <div className="max-w-4xl mx-auto mt-16 md:mt-20 lg:mt-24">
            <SupportiveFeatures />
          </div>

          <footer className="mt-16 md:mt-20 lg:mt-24 text-center">
            <p className="caption text-muted-foreground">
              &copy; {new Date()?.getFullYear()} ISF_Ease. Creating calm spaces for thoughtful learning.
            </p>
          </footer>
        </div>
      </div>
    </>
  );
};

export default LoginPersonalInfo;
