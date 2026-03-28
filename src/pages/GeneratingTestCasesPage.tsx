import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { apiService } from "../services/apiService";
import { handleError, showErrorToast } from "../utils/errorHandler";

export default function GeneratingTestCasesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const suiteId = searchParams.get("suiteId");
  const specId = searchParams.get("specId");

  const [status, setStatus] = useState<"generating" | "success" | "error">(
    "generating",
  );
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Initializing...");
  const [errorMessage, setErrorMessage] = useState("");
  const hasAutoStartedRef = useRef(false);
  const isGeneratingRef = useRef(false);

  const goBackInTab = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (suiteId) {
      navigate(`/test-suites/${suiteId}`);
      return;
    }

    navigate("/test-suites");
  };

  useEffect(() => {
    if (!suiteId || !specId) {
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
  }, [suiteId, specId]);

  const generateTestCases = async () => {
    if (isGeneratingRef.current) {
      return;
    }

    try {
      isGeneratingRef.current = true;
      setStatus("generating");
      setProgress(10);
      setCurrentStep("Preparing test suite...");

      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress(20);
      setCurrentStep("Analyzing API endpoints...");

      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress(30);
      setCurrentStep("Sending request to LLM...");

      // Call API to generate test cases
      const response = await apiService.post(
        `/test-suites/${suiteId}/test-cases/generate-happy-path`,
        {
          SpecificationId: specId,
          ForceRegenerate: searchParams.get("regenerate") === "true",
        },
      );

      setProgress(60);
      setCurrentStep("LLM is generating test cases...");

      // Poll for completion (simplified - you might want to use SignalR or polling)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setProgress(80);
      setCurrentStep("Finalizing test cases...");

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProgress(100);
      setCurrentStep("Test cases generated successfully!");
      setStatus("success");

      // Navigate to test cases list page after a short delay
      setTimeout(() => {
        navigate(`/test-suites/${suiteId}/test-cases`);
      }, 1500);
    } catch (err: any) {
      console.error("Failed to generate test cases:", err);
      console.error("Error detail:", err.response?.data);
      setStatus("error");
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Unknown error";
      setErrorMessage(errorMsg);
    } finally {
      isGeneratingRef.current = false;
    }
  };

  const handleRetry = () => {
    setStatus("generating");
    setProgress(0);
    setErrorMessage("");
    generateTestCases();
  };

  const handleGoBack = () => {
    goBackInTab();
  };

  return (
    <MainLayout title="Generating Test Cases">
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary to-primary-container dark:from-indigo-600 dark:to-indigo-800 p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                {status === "generating" && (
                  <Sparkles className="w-10 h-10 text-white animate-pulse" />
                )}
                {status === "success" && (
                  <CheckCircle2 className="w-10 h-10 text-white" />
                )}
                {status === "error" && (
                  <AlertTriangle className="w-10 h-10 text-white" />
                )}
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {status === "generating" && "Generating Test Cases"}
                {status === "success" && "Generation Complete!"}
                {status === "error" && "Generation Failed"}
              </h1>
              <p className="text-white/80">
                {status === "generating" &&
                  "AI is creating comprehensive test cases for your endpoints"}
                {status === "success" &&
                  "Your test cases are ready. Redirecting..."}
                {status === "error" && "Something went wrong during generation"}
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              {status === "generating" && (
                <div className="space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-on-surface">
                        {currentStep}
                      </span>
                      <span className="font-bold text-primary dark:text-indigo-400">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-3 bg-surface-container dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-container dark:from-indigo-600 dark:to-indigo-400 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Loading Animation */}
                  <div className="flex items-center justify-center py-8">
                    <div className="relative">
                      <Loader2 className="w-16 h-16 text-primary dark:text-indigo-400 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-primary/20 dark:bg-indigo-900/30 rounded-full animate-ping" />
                      </div>
                    </div>
                  </div>

                  {/* Info Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-surface-container-low dark:bg-slate-800 p-4 rounded-xl text-center">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        Step
                      </p>
                      <p className="text-2xl font-black text-on-surface">
                        {Math.floor(progress / 25) + 1}/4
                      </p>
                    </div>
                    <div className="bg-surface-container-low dark:bg-slate-800 p-4 rounded-xl text-center">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        Status
                      </p>
                      <p className="text-sm font-bold text-primary dark:text-indigo-400">
                        Processing
                      </p>
                    </div>
                    <div className="bg-surface-container-low dark:bg-slate-800 p-4 rounded-xl text-center">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        ETA
                      </p>
                      <p className="text-2xl font-black text-on-surface">
                        ~{Math.ceil((100 - progress) / 20)}m
                      </p>
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30">
                    <p className="text-sm text-amber-800 dark:text-amber-400">
                      💡 <span className="font-bold">Tip:</span> This process
                      may take a few minutes depending on the number of
                      endpoints. You can safely close this page and check back
                      later.
                    </p>
                  </div>
                </div>
              )}

              {status === "success" && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-lg text-on-surface mb-6">
                    Test cases have been generated successfully!
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Redirecting to test cases...</span>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="space-y-6">
                  <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/30">
                    <p className="text-sm text-rose-800 dark:text-rose-400">
                      {errorMessage}
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleGoBack}
                      className="px-6 py-3 bg-surface-container-high dark:bg-slate-800 text-on-surface font-semibold rounded-xl hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleRetry}
                      className="px-6 py-3 bg-primary dark:bg-indigo-600 text-white font-semibold rounded-xl hover:bg-primary/90 dark:hover:bg-indigo-500 transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
