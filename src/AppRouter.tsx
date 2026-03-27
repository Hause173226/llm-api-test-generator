import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectManagementPage from "./pages/ProjectManagementPage";
import ProjectDetailedViewPage from "./pages/ProjectDetailedViewPage";
import SpecificationPage from "./pages/SpecificationPage";
import EndpointsPage from "./pages/EndpointsPage";
import TestSuitesPage from "./pages/TestSuitesPage";
import TestSuiteDetailPage from "./pages/TestSuiteDetailPage";
import TestOrderGatePage from "./pages/TestOrderGatePage";
import TestCaseStudioPage from "./pages/TestCaseStudioPage";
import SuggestionsPage from "./pages/SuggestionsPage";
import EnvironmentsPage from "./pages/EnvironmentsPage";
import TestRunsPage from "./pages/TestRunsPage";
import FailureExplanationPage from "./pages/FailureExplanationPage";
import ReportsPage from "./pages/ReportsPage";
import BillingPage from "./pages/BillingPage";
import AccountSettingsPage from "./pages/AccountSettingsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HelpPage from "./pages/HelpPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <ProjectDetailedViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/specifications"
          element={
            <ProtectedRoute>
              <SpecificationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/endpoints"
          element={
            <ProtectedRoute>
              <EndpointsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-suites"
          element={
            <ProtectedRoute>
              <TestSuitesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-suites/:suiteId"
          element={
            <ProtectedRoute>
              <TestSuiteDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-gate"
          element={
            <ProtectedRoute>
              <TestOrderGatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio"
          element={
            <ProtectedRoute>
              <TestCaseStudioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suggestions"
          element={
            <ProtectedRoute>
              <SuggestionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/environments"
          element={
            <ProtectedRoute>
              <EnvironmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/runs"
          element={
            <ProtectedRoute>
              <TestRunsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/failure-explanation"
          element={
            <ProtectedRoute>
              <FailureExplanationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AccountSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <HelpPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
