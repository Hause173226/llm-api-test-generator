import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-surface-container-lowest rounded-3xl p-8 shadow-xl border border-outline-variant/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-error-container rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-error" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-on-surface">
                  Something went wrong
                </h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  We're sorry, but something unexpected happened.
                </p>
              </div>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-6 p-4 bg-surface-container-low rounded-xl">
                <p className="text-xs font-bold text-error mb-2">
                  Error Details:
                </p>
                <pre className="text-xs text-on-surface-variant overflow-auto max-h-48">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 px-6 py-3 bg-surface-container-high text-on-surface rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-all"
              >
                <Home className="w-5 h-5" />
                Go Home
              </button>
            </div>

            <p className="text-xs text-on-surface-variant text-center mt-6">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
