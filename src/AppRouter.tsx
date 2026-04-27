import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Pages
import LandingPage from "./pages/LandingPage";
import ProductPage from "./pages/ProductPage";
import IntelligencePage from "./pages/IntelligencePage";
import EnterprisePage from "./pages/EnterprisePage";
import PricingPage from "./pages/PricingPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectManagementPage from "./pages/ProjectManagementPage";
import ProjectDetailedViewPage from "./pages/ProjectDetailedViewPage";
import SpecificationPage from "./pages/SpecificationPage";
import EndpointsPage from "./pages/EndpointsPage";
import TestSuitesPage from "./pages/TestSuitesPage";
import TestSuiteDetailPage from "./pages/TestSuiteDetailPage";
import GeneratingTestCasesPage from "./pages/GeneratingTestCasesPage";
import GenerationRunExecutePage from "./pages/GenerationRunExecutePage";
import TestCasesHubPage from "./pages/TestCasesHubPage";
import SrsDocumentsPage from "./pages/SrsDocumentsPage";
import TraceabilityPage from "./pages/TraceabilityPage";

import TestCaseDetailPage from "./pages/TestCaseDetailPage";
import SuggestionsPage from "./pages/SuggestionsPage";
import EnvironmentsPage from "./pages/EnvironmentsPage";
import TestRunsPage from "./pages/TestRunsPage";
import ReportsPage from "./pages/ReportsPage";
import BillingPage from "./pages/BillingPage";
import AccountSettingsPage from "./pages/AccountSettingsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HelpPage from "./pages/HelpPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ManualTestingPage from "./pages/ManualTestingPage";
import ChooseTestingPage from "./pages/ChooseTestingPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import PaymentCancelPage from "./pages/PaymentCancelPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/product" element={<ProductPage />} />
        <Route path="/intelligence" element={<IntelligencePage />} />
        <Route path="/enterprise" element={<EnterprisePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        {/* PayOS payment return pages – public (no auth required after redirect) */}
        <Route path="/payment/result" element={<PaymentResultPage />} />
        <Route path="/payment/cancel" element={<PaymentCancelPage />} />

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
          path="/srs-documents"
          element={
            <ProtectedRoute>
              <SrsDocumentsPage />
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
          path="/test-suites/:suiteId/generating"
          element={
            <ProtectedRoute>
              <GeneratingTestCasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-suites/:suiteId/generation-run"
          element={
            <ProtectedRoute>
              <GenerationRunExecutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-suites/:suiteId/test-cases/:testCaseId"
          element={
            <ProtectedRoute>
              <TestCaseDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/studio"
          element={
            <ProtectedRoute>
              <TestCasesHubPage />
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
        <Route
          path="/manual-testing"
          element={
            <ProtectedRoute>
              <ManualTestingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/traceability"
          element={
            <ProtectedRoute>
              <TraceabilityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/choose-testing"
          element={
            <ProtectedRoute>
              <ChooseTestingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-order-gate"
          element={<Navigate to="/suggestions" replace />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
