import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import PersonalizedDashboard from './pages/personalized-dashboard';
import LoginPersonalInfo from './pages/login-personal-info';
import FindMatchesConversations from './pages/find-matches-conversations';
import AdaptiveQuiz from './pages/adaptive-quiz';
import Settings from './pages/settings';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        {/* Define your route here */}
        <Route path="/" element={<LoginPersonalInfo />} />
        <Route path="/personalized-dashboard" element={<PersonalizedDashboard />} />
        <Route path="/login-personal-info" element={<LoginPersonalInfo />} />
        <Route path="/find-matches-conversations" element={<FindMatchesConversations />} />
        <Route path="/adaptive-quiz" element={<AdaptiveQuiz />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
