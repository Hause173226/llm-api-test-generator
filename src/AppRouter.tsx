import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProjectManagementPage from './pages/ProjectManagementPage';
import ProjectDetailedViewPage from './pages/ProjectDetailedViewPage';
import SpecificationPage from './pages/SpecificationPage';
import EndpointsPage from './pages/EndpointsPage';
import TestSuitesPage from './pages/TestSuitesPage';
import TestOrderGatePage from './pages/TestOrderGatePage';
import TestCaseStudioPage from './pages/TestCaseStudioPage';
import SuggestionsPage from './pages/SuggestionsPage';
import EnvironmentsPage from './pages/EnvironmentsPage';
import TestRunsPage from './pages/TestRunsPage';
import FailureExplanationPage from './pages/FailureExplanationPage';
import ReportsPage from './pages/ReportsPage';
import BillingPage from './pages/BillingPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HelpPage from './pages/HelpPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectManagementPage />} />
        <Route path="/project/:id" element={<ProjectDetailedViewPage />} />
        <Route path="/specifications" element={<SpecificationPage />} />
        <Route path="/endpoints" element={<EndpointsPage />} />
        <Route path="/test-suites" element={<TestSuitesPage />} />
        <Route path="/order-gate" element={<TestOrderGatePage />} />
        <Route path="/studio" element={<TestCaseStudioPage />} />
        <Route path="/suggestions" element={<SuggestionsPage />} />
        <Route path="/environments" element={<EnvironmentsPage />} />
        <Route path="/runs" element={<TestRunsPage />} />
        <Route path="/failure-explanation" element={<FailureExplanationPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/settings" element={<AccountSettingsPage />} />
        <Route path="/help" element={<HelpPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

