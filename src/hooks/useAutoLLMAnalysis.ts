import { useState, useEffect, useRef, useCallback } from "react";
import { apiService } from "../services/apiService";
import { signalRService } from "../services/signalrService";
import testRunService, { TestRunDetailResponse, TestCaseRunDetail } from "../services/testRunService";
import { testSuiteService } from "../services/testSuiteService";
import testSuiteLlmSuggestionService, {
  GenerationJobStatusModel,
} from "../services/testSuiteLlmSuggestionService";
import { showErrorToast } from "../utils/errorHandler";

// State interfaces
export interface AutoAnalysisState {
  isRunning: boolean;
  currentRunId: string | null;
  currentSuiteId: string | null;

  // LLM Suggestions state
  suggestionsStatus: "idle" | "running" | "success" | "error" | "cancelled";
  suggestionsError: string | null;

  // Failure Explanations state
  explanationsStatus: "idle" | "running" | "success" | "partial" | "error" | "cancelled";
  explanationsProgress: {
    total: number;
    completed: number;
    failed: number;
  };
  explanationsErrors: string[];
}

export interface UseAutoLLMAnalysisReturn {
  state: AutoAnalysisState;
  cancel: () => void;
  dismiss: () => void;
  retry: () => void;
}

const INITIAL_STATE: AutoAnalysisState = {
  isRunning: false,
  currentRunId: null,
  currentSuiteId: null,
  suggestionsStatus: "idle",
  suggestionsError: null,
  explanationsStatus: "idle",
  explanationsProgress: {
    total: 0,
    completed: 0,
    failed: 0,
  },
  explanationsErrors: [],
};

const MAX_CONCURRENT_REQUESTS = 5;
const PROCESSED_RUNS_KEY = "autoLLMAnalysis_processedRuns";
const SUGGESTION_POLL_TIMEOUT_MS = 300000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useAutoLLMAnalysis(
  projectId: string,
  isEnabled: boolean
): UseAutoLLMAnalysisReturn {
  const [state, setState] = useState<AutoAnalysisState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processedRunsRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);
  const testRunDetailsCache = useRef<Map<string, TestRunDetailResponse>>(new Map());

  // Load processed runs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROCESSED_RUNS_KEY);
      if (stored) {
        processedRunsRef.current = new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load processed runs from localStorage:", error);
    }
  }, []);

  // Save processed runs to localStorage
  const saveProcessedRuns = useCallback(() => {
    try {
      localStorage.setItem(
        PROCESSED_RUNS_KEY,
        JSON.stringify(Array.from(processedRunsRef.current))
      );
    } catch (error) {
      console.error("Failed to save processed runs to localStorage:", error);
    }
  }, []);

  // Task 1.3: Fetch test run details
  const fetchTestRunDetails = useCallback(
    async (suiteId: string, runId: string, signal: AbortSignal): Promise<TestRunDetailResponse | null> => {
      // Check cache first
      const cacheKey = `${suiteId}-${runId}`;
      if (testRunDetailsCache.current.has(cacheKey)) {
        return testRunDetailsCache.current.get(cacheKey)!;
      }

      try {
        const details = await testRunService.getTestRunResults(suiteId, runId);
        
        // Handle expired cache
        if (details.resultsSource === "unavailable") {
          console.warn("Test run results unavailable (expired cache)");
          return null;
        }

        // Cache the results
        testRunDetailsCache.current.set(cacheKey, details);
        return details;
      } catch (error: any) {
        if (error.name === "AbortError") {
          return null;
        }
        console.error("Failed to fetch test run details:", error);
        return null;
      }
    },
    []
  );

  // Task 1.4: Generate LLM suggestions
  const generateLLMSuggestions = useCallback(
    async (suiteId: string, specificationId: string, signal: AbortSignal): Promise<boolean> => {
      setState((prev) => ({ ...prev, suggestionsStatus: "running" }));

      try {
        const accepted = await testSuiteLlmSuggestionService.generate(suiteId, {
          specificationId,
          forceRefresh: false,
        });

        const startedAt = Date.now();
        let latestStatus: GenerationJobStatusModel | null = null;

        while (Date.now() - startedAt < SUGGESTION_POLL_TIMEOUT_MS) {
          if (signal.aborted) {
            setState((prev) => ({ ...prev, suggestionsStatus: "cancelled" }));
            return false;
          }

          latestStatus = await testSuiteLlmSuggestionService.getGenerationStatus(
            suiteId,
            accepted.jobId,
          );

          if (latestStatus.status === "Completed") {
            break;
          }

          if (latestStatus.status === "Failed") {
            throw new Error(
              latestStatus.errorMessage || "LLM suggestion generation failed",
            );
          }

          if (latestStatus.status === "Cancelled") {
            setState((prev) => ({ ...prev, suggestionsStatus: "cancelled" }));
            return false;
          }

          await wait(
            latestStatus.status === "WaitingForCallback" ? 5000 : 2500,
          );
        }

        if (latestStatus?.status !== "Completed") {
          throw new Error("LLM suggestion generation timed out");
        }

        if (signal.aborted) {
          setState((prev) => ({ ...prev, suggestionsStatus: "cancelled" }));
          return false;
        }

        setState((prev) => ({ ...prev, suggestionsStatus: "success" }));
        return true;
      } catch (error: any) {
        if (error.name === "AbortError" || signal.aborted) {
          setState((prev) => ({ ...prev, suggestionsStatus: "cancelled" }));
          return false;
        }

        const statusCode = error?.status ?? error?.response?.status;
        const errorText = String(
          error?.message || error?.response?.data?.message || "",
        );
        const alreadyHasPendingSuggestions =
          statusCode === 400 &&
          (errorText.includes("ForceRefresh=true") ||
            errorText.includes("suggestion preview"));

        if (alreadyHasPendingSuggestions) {
          // Backend says there are pending suggestions waiting for review.
          // Treat this as usable existing data instead of a hard failure.
          setState((prev) => ({ ...prev, suggestionsStatus: "success" }));
          return true;
        }

        console.error("Failed to generate LLM suggestions:", error);
        const errorMessage = error.message || "Failed to generate LLM suggestions";
        setState((prev) => ({
          ...prev,
          suggestionsStatus: "error",
          suggestionsError: errorMessage,
        }));
        // Task 4.1: Show non-blocking toast notification for LLM suggestions error
        showErrorToast(`LLM Suggestions: ${errorMessage}`);
        return false;
      }
    },
    []
  );

  // Task 1.5: Explain failures in parallel with concurrency control
  const explainFailures = useCallback(
    async (
      suiteId: string,
      runId: string,
      failedCases: TestCaseRunDetail[],
      signal: AbortSignal
    ): Promise<void> => {
      if (failedCases.length === 0) {
        return;
      }

      setState((prev) => ({
        ...prev,
        explanationsStatus: "running",
        explanationsProgress: {
          total: failedCases.length,
          completed: 0,
          failed: 0,
        },
      }));

      const errors: string[] = [];
      let completed = 0;
      let failed = 0;

      // Process in batches with max concurrency
      for (let i = 0; i < failedCases.length; i += MAX_CONCURRENT_REQUESTS) {
        if (signal.aborted) {
          setState((prev) => ({ ...prev, explanationsStatus: "cancelled" }));
          return;
        }

        const batch = failedCases.slice(i, i + MAX_CONCURRENT_REQUESTS);
        const promises = batch.map(async (testCase) => {
          try {
            await apiService.post(
              `/test-suites/${suiteId}/test-runs/${runId}/failures/${testCase.testCaseId}/explanation`
            );
            return { success: true };
          } catch (error: any) {
            if (error.name === "AbortError") {
              return { success: false, aborted: true };
            }
            console.error(`Failed to explain failure for test case ${testCase.testCaseId}:`, error);
            return { success: false, error: error.message || "Unknown error" };
          }
        });

        const results = await Promise.allSettled(promises);

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            if (result.value.success) {
              completed++;
            } else if (result.value.aborted) {
              // Aborted, don't count
            } else {
              failed++;
              errors.push(result.value.error || "Unknown error");
            }
          } else {
            failed++;
            errors.push("Request failed");
          }
        });

        // Update progress
        setState((prev) => ({
          ...prev,
          explanationsProgress: {
            total: failedCases.length,
            completed,
            failed,
          },
        }));
      }

      // Determine final status
      if (signal.aborted) {
        setState((prev) => ({ ...prev, explanationsStatus: "cancelled" }));
      } else if (failed === 0) {
        setState((prev) => ({ ...prev, explanationsStatus: "success" }));
      } else if (completed > 0) {
        setState((prev) => ({
          ...prev,
          explanationsStatus: "partial",
          explanationsErrors: errors,
        }));
        // Task 4.2: Show non-blocking toast notification for partial failure
        showErrorToast(`Failure Explanations: ${completed} succeeded, ${failed} failed`);
      } else {
        setState((prev) => ({
          ...prev,
          explanationsStatus: "error",
          explanationsErrors: errors,
        }));
        // Task 4.2: Show non-blocking toast notification for complete failure
        showErrorToast(`Failure Explanations: All ${failed} requests failed`);
      }
    },
    []
  );

  // Main orchestration logic
  const processTestRunCompletion = useCallback(
    async (runId: string, suiteId: string) => {
      // Prevent duplicate processing
      if (processedRunsRef.current.has(runId) || isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;
      processedRunsRef.current.add(runId);
      saveProcessedRuns();

      // Create new AbortController for this operation
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setState((prev) => ({
        ...prev,
        isRunning: true,
        currentRunId: runId,
        currentSuiteId: suiteId,
        suggestionsStatus: "idle",
        suggestionsError: null,
        explanationsStatus: "idle",
        explanationsProgress: { total: 0, completed: 0, failed: 0 },
        explanationsErrors: [],
      }));

      try {
        // Fetch test run details
        const details = await fetchTestRunDetails(suiteId, runId, signal);
        if (!details || signal.aborted) {
          // Task 4.3: Handle expired cache gracefully
          if (!details && !signal.aborted) {
            console.warn("Test run results unavailable (expired cache)");
          }
          setState(INITIAL_STATE);
          isProcessingRef.current = false;
          return;
        }

        // Get failed test cases
        const failedCases = details.cases.filter(
          (c) => c.status.toLowerCase() === "failed"
        );

        // Get test suite details to check for API specification
        let hasSpecification = false;
        try {
          const suiteDetails = await testSuiteService.getTestSuiteDetail(projectId, suiteId);
          hasSpecification = !!suiteDetails.apiSpecId;

          // Generate LLM suggestions if specification exists
          // Task 4.3: Skip suggestions generation if no API specification exists
          if (hasSpecification && suiteDetails.apiSpecId) {
            await generateLLMSuggestions(suiteId, suiteDetails.apiSpecId, signal);
          } else {
            console.log("Skipping LLM suggestions: No API specification found");
          }
        } catch (error) {
          console.error("Failed to fetch test suite details:", error);
          // Task 4.3: Continue with failure explanations even if suite details fetch fails
        }

        // Explain failures in parallel
        // Task 4.3: Skip explanations if no failed test cases exist
        if (failedCases.length > 0) {
          await explainFailures(suiteId, runId, failedCases, signal);
        } else {
          console.log("Skipping failure explanations: No failed test cases");
        }

        // Mark as not running
        setState((prev) => ({ ...prev, isRunning: false }));
      } catch (error: any) {
        if (error.name !== "AbortError" && !signal.aborted) {
          console.error("Auto-analysis error:", error);
          setState((prev) => ({
            ...prev,
            isRunning: false,
            suggestionsStatus: "error",
            suggestionsError: "Failed to complete auto-analysis",
          }));
          // Task 4.3: Show error toast for unexpected errors
          showErrorToast("Auto-analysis failed unexpectedly");
        }
      } finally {
        isProcessingRef.current = false;
      }
    },
    [projectId, fetchTestRunDetails, generateLLMSuggestions, explainFailures, saveProcessedRuns]
  );

  // Task 1.2: Subscribe to SignalR events
  useEffect(() => {
    if (!isEnabled || !projectId) {
      return;
    }

    const handleTestRunStatusChanged = (data: any) => {
      const status = data?.status?.toLowerCase();
      const runId = data?.runId || data?.id;
      const suiteId = data?.suiteId || data?.testSuiteId;

      // Only process completed or failed runs
      if ((status === "completed" || status === "failed") && runId && suiteId) {
        processTestRunCompletion(runId, suiteId);
      }
    };

    signalRService.on("TestRunStatusChanged", handleTestRunStatusChanged);

    return () => {
      signalRService.off("TestRunStatusChanged", handleTestRunStatusChanged);
    };
  }, [isEnabled, projectId, processTestRunCompletion]);

  // Task 1.6: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Cancel function
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState((prev) => ({
      ...prev,
      isRunning: false,
      suggestionsStatus: prev.suggestionsStatus === "running" ? "cancelled" : prev.suggestionsStatus,
      explanationsStatus: prev.explanationsStatus === "running" ? "cancelled" : prev.explanationsStatus,
    }));
  }, []);

  // Dismiss function
  const dismiss = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // Task 1.7: Retry function
  const retry = useCallback(() => {
    if (state.currentRunId && state.currentSuiteId) {
      // Remove from processed runs to allow re-trigger
      processedRunsRef.current.delete(state.currentRunId);
      saveProcessedRuns();
      
      // Reset state
      setState(INITIAL_STATE);
      
      // Re-trigger processing
      processTestRunCompletion(state.currentRunId, state.currentSuiteId);
    }
  }, [state.currentRunId, state.currentSuiteId, processTestRunCompletion, saveProcessedRuns]);

  return {
    state,
    cancel,
    dismiss,
    retry,
  };
}
