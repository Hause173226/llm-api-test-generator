import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { apiService } from "../services/apiService";
import { handleError, showErrorToast } from "../utils/errorHandler";

interface GenerationJobStatus {
  jobId: string;
  testSuiteId: string;
  status: string; // Queued | Triggering | WaitingForCallback | Completed | Failed
  queuedAt?: string;
  triggeredAt?: string;
  completedAt?: string;
  testCasesGenerated?: number;
  errorMessage?: string;
  webhookName?: string;
}

interface ApiState {
  status: "idle" | "generating" | "success" | "error";
  progress: number;
  currentStep: string;
  errorMessage: string;
}

export default function GeneratingTestCasesPage() {
  const navigate = useNavigate();
  const { suiteId } = useParams<{ suiteId: string }>();

  const [happyPathState, setHappyPathState] = useState<ApiState>({
    status: "idle",
    progress: 0,
    currentStep: "",
    errorMessage: "",
  });

  const [boundaryNegativeState, setBoundaryNegativeState] = useState<ApiState>({
    status: "idle",
    progress: 0,
    currentStep: "",
    errorMessage: "",
  });

  const hasAutoStartedRef = useRef(false);
  const isGeneratingRef = useRef(false);

  const goBackInTab = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (suiteId) {
      navigate(`/test-suites/${suiteId}?tab=testcases`);
      return;
    }

    navigate("/test-suites");
  };

  useEffect(() => {
    if (!suiteId) {
      showErrorToast("Missing required parameters");
      goBackInTab();
      return;
    }

    // React StrictMode can re-run effects in development; prevent duplicate generation requests.
    if (hasAutoStartedRef.current) {
      return;
    }

    hasAutoStartedRef.current = true;

    generateTestCases();
  }, [suiteId]);

  const extractErrorMessage = (error: any): string => {
    if (error.response?.data?.detail) return error.response.data.detail;
    if (error.response?.data?.message) return error.response.data.message;
    if (error.message) return error.message;
    return "Unknown error";
  };

  const POLL_INTERVAL_MS = 3000;
  const POLL_TIMEOUT_MS = 300000; // 5 minutes max

  const getProgressForStatus = (jobStatus: string): { progress: number; step: string } => {
    switch (jobStatus) {
      case "Queued":
        return { progress: 15, step: "Job queued, waiting to start..." };
      case "Triggering":
        return { progress: 30, step: "Triggering AI generation workflow..." };
      case "WaitingForCallback":
        return { progress: 55, step: "LLM generating test cases (this may take a few minutes)..." };
      case "Completed":
        return { progress: 100, step: "Unified generation complete!" };
      case "Failed":
        return { progress: 0, step: "Generation failed" };
      default:
        return { progress: 20, step: `Status: ${jobStatus}` };
    }
  };

  const pollGenerationStatus = async (jobId: string): Promise<GenerationJobStatus> => {
    const startTime = Date.now();

    while (Date.now() - startTime < POLL_TIMEOUT_MS) {
      const jobStatus = await apiService.get<GenerationJobStatus>(
        `/test-suites/${suiteId}/generation-status`,
        { params: { jobId } },
      );

      const { progress, step } = getProgressForStatus(jobStatus.status);

      setHappyPathState((prev) => ({ ...prev, progress, currentStep: step }));
      setBoundaryNegativeState((prev) => ({ ...prev, progress, currentStep: step }));

      if (jobStatus.status === "Completed") {
        return jobStatus;
      }

      if (jobStatus.status === "Failed") {
        throw new Error(jobStatus.errorMessage || "Generation job failed");
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error("Generation timed out. Please check status later.");
  };

  const executeUnifiedGeneration = async () => {
    try {
      setHappyPathState((prev) => ({
        ...prev,
        status: "generating",
        progress: 10,
        currentStep: "Submitting generation request...",
      }));
      setBoundaryNegativeState((prev) => ({
        ...prev,
        status: "generating",
        progress: 10,
        currentStep: "Submitting generation request...",
      }));

      // POST generate-tests returns 202 Accepted with jobId
      const response = await apiService.post<{ jobId: string; testSuiteId: string; mode: string; message: string }>(
        `/test-suites/${suiteId}/generate-tests`,
      );

      const jobId = response.jobId;

      if (!jobId) {
        throw new Error("No jobId returned from generation request");
      }

      setHappyPathState((prev) => ({
        ...prev,
        progress: 15,
        currentStep: "Generation job queued, polling status...",
      }));
      setBoundaryNegativeState((prev) => ({
        ...prev,
        progress: 15,
        currentStep: "Generation job queued, polling status...",
      }));

      // Poll until Completed or Failed
      await pollGenerationStatus(jobId);

      setHappyPathState((prev) => ({
        ...prev,
        progress: 100,
        currentStep: "Unified generation complete!",
        status: "success",
      }));
      setBoundaryNegativeState((prev) => ({
        ...prev,
        progress: 100,
        currentStep: "Unified generation complete!",
        status: "success",
      }));
    } catch (error: any) {
      console.error("Unified generation failed:", error);
      const errorMsg = extractErrorMessage(error);
      setHappyPathState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: errorMsg,
      }));
      setBoundaryNegativeState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: errorMsg,
      }));
      throw error;
    }
  };

  const generateTestCases = async () => {
    if (isGeneratingRef.current) return;

    try {
      isGeneratingRef.current = true;

      // Initialize both states to generating
      setHappyPathState({
        status: "generating",
        progress: 10,
        currentStep: "Preparing...",
        errorMessage: "",
      });
      setBoundaryNegativeState({
        status: "generating",
        progress: 10,
        currentStep: "Preparing...",
        errorMessage: "",
      });

      // Execute APIs sequentially to avoid optimistic concurrency conflicts on TestSuite updates.
      let unifiedSuccess = false;

      try {
        await executeUnifiedGeneration();
        unifiedSuccess = true;
      } catch {
        unifiedSuccess = false;
      }

      if (unifiedSuccess) {
        // Both succeeded - auto-redirect
        setTimeout(() => {
          navigate(`/test-suites/${suiteId}?tab=testcases`);
        }, 1500);
      }
      // If partial success or both failed, states are already set by individual functions
    } catch (err: any) {
      console.error("Generation error:", err);
    } finally {
      isGeneratingRef.current = false;
    }
  };

  const retryHappyPath = async () => {
    setHappyPathState({
      status: "generating",
      progress: 0,
      currentStep: "Retrying...",
      errorMessage: "",
    });

    try {
      await executeUnifiedGeneration();
    } catch (error) {
      // Error already handled in executeUnifiedGeneration
    }
  };

  const retryBoundaryNegative = async () => {
    setBoundaryNegativeState({
      status: "generating",
      progress: 0,
      currentStep: "Retrying...",
      errorMessage: "",
    });

    try {
      await executeUnifiedGeneration();
    } catch (error) {
      // Error already handled in executeUnifiedGeneration
    }
  };

  const handleContinue = () => {
    navigate(`/test-suites/${suiteId}?tab=testcases`);
  };

  const handleGoBack = () => {
    goBackInTab();
  };

  const getOverallStatus = ():
    | "generating"
    | "success"
    | "error"
    | "partial" => {
    const happyDone =
      happyPathState.status === "success" || happyPathState.status === "error";
    const boundaryDone =
      boundaryNegativeState.status === "success" ||
      boundaryNegativeState.status === "error";

    if (!happyDone || !boundaryDone) return "generating";
    if (
      happyPathState.status === "success" &&
      boundaryNegativeState.status === "success"
    )
      return "success";
    if (
      happyPathState.status === "error" &&
      boundaryNegativeState.status === "error"
    )
      return "error";
    return "partial";
  };

  const overallStatus = getOverallStatus();
  const showContinueButton =
    happyPathState.status === "success" ||
    boundaryNegativeState.status === "success";

  return (
    <MainLayout title="Generating Test Cases">
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary to-primary-container dark:from-indigo-600 dark:to-indigo-800 p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                {overallStatus === "generating" && (
                  <Sparkles className="w-10 h-10 text-white animate-pulse" />
                )}
                {overallStatus === "success" && (
                  <CheckCircle2 className="w-10 h-10 text-white" />
                )}
                {(overallStatus === "error" || overallStatus === "partial") && (
                  <AlertTriangle className="w-10 h-10 text-white" />
                )}
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {overallStatus === "generating" && "Generating Test Cases"}
                {overallStatus === "success" && "Generation Complete!"}
                {overallStatus === "partial" && "Partial Success"}
                {overallStatus === "error" && "Generation Failed"}
              </h1>
              <p className="text-white/80">
                {overallStatus === "generating" &&
                  "AI is creating comprehensive test cases for your endpoints"}
                {overallStatus === "success" &&
                  "All test cases generated successfully. Redirecting..."}
                {overallStatus === "partial" &&
                  "Some test cases generated successfully"}
                {overallStatus === "error" && "Test case generation failed"}
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="space-y-6">
                {/* Happy Path Progress Section */}
                <div className="bg-surface-container dark:bg-slate-800 p-6 rounded-xl border border-outline-variant/10 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-500" />
                      Happy Path Test Cases
                    </h3>
                    {happyPathState.status === "generating" && (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-full">
                        Generating...
                      </span>
                    )}
                    {happyPathState.status === "success" && (
                      <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Complete
                      </span>
                    )}
                    {happyPathState.status === "error" && (
                      <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </div>

                  {happyPathState.status === "generating" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant">
                          {happyPathState.currentStep}
                        </span>
                        <span className="font-bold text-primary dark:text-indigo-400">
                          {happyPathState.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-surface-container-high dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${happyPathState.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                      </div>
                    </div>
                  )}

                  {happyPathState.status === "success" && (
                    <div className="text-center py-4">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm text-on-surface-variant">
                        {happyPathState.currentStep}
                      </p>
                    </div>
                  )}

                  {happyPathState.status === "error" && (
                    <div className="space-y-3">
                      <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-lg border border-rose-200 dark:border-rose-900/30">
                        <p className="text-sm text-rose-800 dark:text-rose-400">
                          {happyPathState.errorMessage}
                        </p>
                      </div>
                      <button
                        onClick={retryHappyPath}
                        className="w-full px-4 py-2 bg-primary dark:bg-indigo-600 text-white font-semibold rounded-lg hover:bg-primary/90 dark:hover:bg-indigo-500 transition-all"
                      >
                        Retry Happy Path
                      </button>
                    </div>
                  )}
                </div>

                {/* Boundary/Negative Progress Section */}
                <div className="bg-surface-container dark:bg-slate-800 p-6 rounded-xl border border-outline-variant/10 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Boundary/Negative Test Cases
                    </h3>
                    {boundaryNegativeState.status === "generating" && (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-full">
                        Generating...
                      </span>
                    )}
                    {boundaryNegativeState.status === "success" && (
                      <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Complete
                      </span>
                    )}
                    {boundaryNegativeState.status === "error" && (
                      <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </div>

                  {boundaryNegativeState.status === "generating" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant">
                          {boundaryNegativeState.currentStep}
                        </span>
                        <span className="font-bold text-primary dark:text-indigo-400">
                          {boundaryNegativeState.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-surface-container-high dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                          style={{
                            width: `${boundaryNegativeState.progress}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                      </div>
                    </div>
                  )}

                  {boundaryNegativeState.status === "success" && (
                    <div className="text-center py-4">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm text-on-surface-variant">
                        {boundaryNegativeState.currentStep}
                      </p>
                    </div>
                  )}

                  {boundaryNegativeState.status === "error" && (
                    <div className="space-y-3">
                      <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-lg border border-rose-200 dark:border-rose-900/30">
                        <p className="text-sm text-rose-800 dark:text-rose-400">
                          {boundaryNegativeState.errorMessage}
                        </p>
                      </div>
                      <button
                        onClick={retryBoundaryNegative}
                        className="w-full px-4 py-2 bg-primary dark:bg-indigo-600 text-white font-semibold rounded-lg hover:bg-primary/90 dark:hover:bg-indigo-500 transition-all"
                      >
                        Retry Boundary/Negative
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {overallStatus !== "generating" && (
                  <div className="flex gap-3 justify-center pt-4">
                    <button
                      onClick={goBackInTab}
                      className="px-6 py-3 bg-surface-container-high dark:bg-slate-800 text-on-surface font-semibold rounded-xl hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all"
                    >
                      Go Back
                    </button>
                    {showContinueButton && (
                      <button
                        onClick={handleContinue}
                        className="px-6 py-3 bg-primary dark:bg-indigo-600 text-white font-semibold rounded-xl hover:bg-primary/90 dark:hover:bg-indigo-500 transition-all"
                      >
                        Continue to Test Cases
                      </button>
                    )}
                  </div>
                )}

                {/* Tips */}
                {overallStatus === "generating" && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30">
                    <p className="text-sm text-amber-800 dark:text-amber-400">
                      💡 <span className="font-bold">Tip:</span> Unified
                      generation is running once for all types (HappyPath,
                      Boundary, Negative). This may take a few minutes depending
                      on the number of endpoints.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
