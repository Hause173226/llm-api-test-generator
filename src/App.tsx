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
import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
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
                    background: "var(--md-sys-color-surface-container-low)",
                    color: "#1e293b", // Dark slate for better readability
                    borderRadius: "16px",
                    padding: "16px 24px",
                    fontWeight: "700", // Bolder
                    fontSize: "15px", // Slightly larger
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
                    border: "1px solid var(--md-sys-color-outline-variant)",
                    minWidth: "300px",
                    maxWidth: "500px",
                  },
                  success: {
                    duration: 3000,
                    style: {
                      background: "var(--md-sys-color-primary-container)",
                      color: "#1e293b", // Dark slate for better contrast
                      border: "2px solid var(--md-sys-color-primary)",
                    },
                    iconTheme: {
                      primary: "var(--md-sys-color-primary)",
                      secondary: "white",
                    },
                  },
                  error: {
                    duration: 5000,
                    style: {
                      background: "var(--md-sys-color-error-container)",
                      color: "#7f1d1d", // Dark red for better contrast
                      border: "2px solid var(--md-sys-color-error)",
                    },
                    iconTheme: {
                      primary: "var(--md-sys-color-error)",
                      secondary: "white",
                    },
                  },
                  loading: {
                    style: {
                      background: "var(--md-sys-color-surface-container-high)",
                      color: "#1e293b", // Dark slate for better contrast
                      border: "2px solid var(--md-sys-color-primary)",
                    },
                  },
                }}
              />
            </SignalRProvider>
          </ProjectProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}
