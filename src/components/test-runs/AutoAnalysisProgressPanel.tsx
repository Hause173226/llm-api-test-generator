import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  RotateCcw,
  StopCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { AutoAnalysisState } from "../../hooks/useAutoLLMAnalysis";

interface AutoAnalysisProgressPanelProps {
  state: AutoAnalysisState;
  onCancel: () => void;
  onDismiss: () => void;
  onRetry: () => void;
  onViewSuggestions: () => void;
  onViewResults: () => void;
}

export default function AutoAnalysisProgressPanel({
  state,
  onCancel,
  onDismiss,
  onRetry,
  onViewSuggestions,
  onViewResults,
}: AutoAnalysisProgressPanelProps) {
  const { t } = useTranslation();
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss after 3 seconds when all operations succeed
  useEffect(() => {
    const allSucceeded =
      state.suggestionsStatus === "success" &&
      state.explanationsStatus === "success";

    if (allSucceeded && !state.isRunning) {
      autoDismissTimerRef.current = setTimeout(() => {
        onDismiss();
      }, 3000);
    }

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, [
    state.suggestionsStatus,
    state.explanationsStatus,
    state.isRunning,
    onDismiss,
  ]);

  // Clear timer on user interaction
  const handleUserInteraction = () => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case "partial":
        return <CheckCircle2 className="w-4 h-4 text-amber-500" />;
      case "cancelled":
        return <StopCircle className="w-4 h-4 text-slate-500" />;
      default:
        return null;
    }
  };

  const getStatusMessage = (
    status: string,
    type: "suggestions" | "explanations",
  ) => {
    if (type === "suggestions") {
      switch (status) {
        case "running":
          return t("testRuns.autoAnalysis.suggestions.running");
        case "success":
          return t("testRuns.autoAnalysis.suggestions.success");
        case "error":
          return (
            state.suggestionsError ||
            t("testRuns.autoAnalysis.suggestions.error")
          );
        case "cancelled":
          return t("testRuns.autoAnalysis.suggestions.cancelled");
        default:
          return "Waiting...";
      }
    } else {
      switch (status) {
        case "running":
          return t("testRuns.autoAnalysis.explanations.running", {
            completed: state.explanationsProgress.completed,
            total: state.explanationsProgress.total,
          });
        case "success":
          return t("testRuns.autoAnalysis.explanations.success");
        case "partial":
          return t("testRuns.autoAnalysis.explanations.partial", {
            completed: state.explanationsProgress.completed,
            total: state.explanationsProgress.total,
            failed: state.explanationsProgress.failed,
          });
        case "error":
          return t("testRuns.autoAnalysis.explanations.error");
        case "cancelled":
          return t("testRuns.autoAnalysis.explanations.cancelled");
        default:
          return "Waiting...";
      }
    }
  };

  const showRetryButton =
    state.suggestionsStatus === "error" || state.explanationsStatus === "error";
  const showCancelButton = state.isRunning;

  return (
    <div
      className="fixed bottom-6 right-6 w-full max-w-md bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-2xl z-50 overflow-hidden"
      onClick={handleUserInteraction}
      onMouseEnter={handleUserInteraction}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 dark:border-slate-800">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">
          {t("testRuns.autoAnalysis.title")}
        </h3>
        <button
          onClick={onDismiss}
          className="p-1.5 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={t("testRuns.autoAnalysis.buttons.dismiss")}
        >
          <X className="w-4 h-4 text-on-surface-variant" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-4">
        {/* LLM Suggestions Section */}
        {state.suggestionsStatus !== "idle" && (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getStatusIcon(state.suggestionsStatus)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  {t("testRuns.autoAnalysis.suggestions.title")}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {getStatusMessage(state.suggestionsStatus, "suggestions")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Failure Explanations Section */}
        {state.explanationsStatus !== "idle" && (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getStatusIcon(state.explanationsStatus)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  {t("testRuns.autoAnalysis.explanations.title")}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {getStatusMessage(state.explanationsStatus, "explanations")}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {state.explanationsStatus === "running" &&
              state.explanationsProgress.total > 0 && (
                <div className="ml-7">
                  <div className="w-full bg-surface-container-high dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary dark:bg-indigo-600 h-full transition-all duration-300"
                      style={{
                        width: `${(state.explanationsProgress.completed / state.explanationsProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-surface-container-low/30 dark:bg-slate-800/30 border-t border-outline-variant/10 dark:border-slate-800 flex flex-wrap items-center gap-2">
        {/* Cancel Button */}
        {showCancelButton && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-surface hover:bg-error hover:text-white dark:hover:bg-rose-600 transition-all flex items-center gap-2"
          >
            <StopCircle className="w-3 h-3" />
            {t("testRuns.autoAnalysis.buttons.cancel")}
          </button>
        )}

        {/* Retry Button */}
        {showRetryButton && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-surface hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-3 h-3" />
            {t("testRuns.autoAnalysis.buttons.retry")}
          </button>
        )}

        {/* View Suggestions Link */}
        {state.suggestionsStatus === "success" && (
          <button
            onClick={onViewSuggestions}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-primary dark:bg-indigo-600 text-on-primary hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            {t("testRuns.autoAnalysis.buttons.viewSuggestions")}
            <ExternalLink className="w-3 h-3" />
          </button>
        )}

        {/* View Results Link */}
        {(state.explanationsStatus === "success" ||
          state.explanationsStatus === "partial") && (
          <button
            onClick={onViewResults}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-primary dark:bg-indigo-600 text-on-primary hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            {t("testRuns.autoAnalysis.buttons.viewResults")}
            <ExternalLink className="w-3 h-3" />
          </button>
        )}

        {/* Dismiss Button (always visible) */}
        {!showCancelButton && (
          <button
            onClick={onDismiss}
            className="ml-auto px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-surface-variant hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all"
          >
            {t("testRuns.autoAnalysis.buttons.dismiss")}
          </button>
        )}
      </div>
    </div>
  );
}
