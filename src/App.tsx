/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import AppRouter from "./AppRouter";
import { AuthProvider } from "./contexts/AuthContext";
import { SignalRProvider } from "./contexts/SignalRContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { ErrorBoundary } from "./components/error/ErrorBoundary";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProjectProvider>
          <SignalRProvider>
            <AppRouter />
            <Toaster
              position="top-center"
              containerStyle={{
                top: 80,
                zIndex: 9999,
              }}
              toastOptions={{
                duration: 4000,
                style: {
                  background: "var(--color-surface-container-low)",
                  color: "var(--color-on-surface)",
                  borderRadius: "16px",
                  padding: "16px 24px",
                  fontWeight: "700",
                  fontSize: "15px",
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
                  border: "1px solid var(--color-outline-variant)",
                  minWidth: "300px",
                  maxWidth: "500px",
                },
                success: {
                  duration: 3000,
                  style: {
                    background: "var(--color-primary-container)",
                    color: "var(--color-on-primary-container)",
                    border: "2px solid var(--color-primary)",
                  },
                  iconTheme: {
                    primary: "var(--color-primary)",
                    secondary: "var(--color-on-primary)",
                  },
                },
                error: {
                  duration: 5000,
                  style: {
                    background: "var(--color-error-container)",
                    color: "var(--color-on-error-container)",
                    border: "2px solid var(--color-error)",
                  },
                  iconTheme: {
                    primary: "var(--color-error)",
                    secondary: "var(--color-on-error)",
                  },
                },
                loading: {
                  style: {
                    background: "var(--color-surface-container-high)",
                    color: "var(--color-on-surface)",
                    border: "2px solid var(--color-primary)",
                  },
                },
              }}
            />
          </SignalRProvider>
        </ProjectProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
