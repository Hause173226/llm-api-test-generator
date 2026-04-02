import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Play,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Download,
  MoreVertical,
  Calendar,
  Zap,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  StopCircle,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import Modal from "../components/ui/Modal";
import { cn } from "../lib/utils";
import { useTestRuns } from "../hooks/useTestRuns";
import { useTestSuites } from "../hooks/useTestSuites";
import {
  handleError,
  showErrorToast,
  showSuccessToast,
} from "../utils/errorHandler";
import { signalRService } from "../services/signalrService";
import { useProject } from "../contexts/ProjectContext";
import environmentService, {
  Environment,
} from "../services/environmentService";
import testCaseService, { TestCase } from "../services/testCaseService";
import testRunService, {
  TestRunDetailResponse,
} from "../services/testRunService";
import { testSuiteService } from "../services/testSuiteService";
import { apiService } from "../services/apiService";
import { useAutoLLMAnalysis } from "../hooks/useAutoLLMAnalysis";
import AutoAnalysisProgressPanel from "../components/test-runs/AutoAnalysisProgressPanel";

export default function TestRunsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedProject } = useProject();

  const projectId = searchParams.get("projectId") || selectedProject?.id || "";
  const preselectedSuiteId = searchParams.get("suiteId") || "";
  const preselectedTestCaseId = searchParams.get("testCaseId") || "";
  const preselectedTestCaseIdsRaw = searchParams.get("testCaseIds") || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [selectedTestSuiteId, setSelectedTestSuiteId] = useState("");
  const [activeSuiteId, setActiveSuiteId] = useState("");
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<string[]>([]);
  const [suiteTestCases, setSuiteTestCases] = useState<TestCase[]>([]);
  const [isLoadingTestCases, setIsLoadingTestCases] = useState(false);
  const [runDetailsById, setRunDetailsById] = useState<
    Record<string, TestRunDetailResponse>
  >({});
  const [loadingRunDetailsById, setLoadingRunDetailsById] = useState<
    Record<string, boolean>
  >({});
  const [expandedCaseByRunId, setExpandedCaseByRunId] = useState<
    Record<string, string | null>
  >({});
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageSize = 20;

  const {
    testRuns,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch,
    startTestRun,
    cancelTestRun,
    retryFailedTests,
    exportResults,
  } = useTestRuns(activeSuiteId || "", currentPage, pageSize, statusFilter);

  const { testSuites } = useTestSuites(projectId || "");

  const {
    state: autoAnalysisState,
    cancel: cancelAutoAnalysis,
    dismiss: dismissAutoAnalysis,
    retry: retryAutoAnalysis,
  } = useAutoLLMAnalysis(projectId || "", Boolean(projectId));

  const activeSuiteName =
    testSuites.find((suite) => suite.id === activeSuiteId)?.name || "";

  const handleActiveSuiteChange = (suiteId: string) => {
    setActiveSuiteId(suiteId);
    setCurrentPage(1);
  };

  const getDefaultEnvironmentId = (items: Environment[]) => {
    if (items.length === 0) return "";
    const defaultEnv = items.find((env) => env.isDefault);
    return defaultEnv?.id || items[0].id;
  };

  useEffect(() => {
    const loadEnvironments = async () => {
      if (!projectId) {
        setEnvironments([]);
        setSelectedEnvironmentId("");
        return;
      }

      try {
        const envs = await environmentService.getEnvironments(projectId);
        setEnvironments(envs);
        setSelectedEnvironmentId((prev) => {
          if (prev && envs.some((env) => env.id === prev)) {
            return prev;
          }
          return getDefaultEnvironmentId(envs);
        });
      } catch (err) {
        setEnvironments([]);
        setSelectedEnvironmentId("");
        handleError(err);
      }
    };

    loadEnvironments();
  }, [projectId]);

  useEffect(() => {
    if (!activeSuiteId && testSuites.length > 0) {
      setActiveSuiteId(testSuites[0].id);
    }
  }, [testSuites, activeSuiteId]);

  useEffect(() => {
    if (!preselectedSuiteId) return;

    setSelectedTestSuiteId(preselectedSuiteId);
    setActiveSuiteId(preselectedSuiteId);

    const idsFromCsv = preselectedTestCaseIdsRaw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (idsFromCsv.length > 0) {
      setSelectedTestCaseIds(idsFromCsv);
    } else if (preselectedTestCaseId) {
      setSelectedTestCaseIds([preselectedTestCaseId]);
    }

    setIsStartModalOpen(true);

    // Prevent repeated auto-open when user refreshes page state.
    const params = new URLSearchParams(searchParams);
    params.delete("suiteId");
    params.delete("testCaseId");
    params.delete("testCaseIds");
    setSearchParams(params, { replace: true });
  }, [preselectedSuiteId, preselectedTestCaseId, preselectedTestCaseIdsRaw]);

  useEffect(() => {
    const loadTestCasesForSuite = async () => {
      if (!isStartModalOpen || !selectedTestSuiteId) {
        setSuiteTestCases([]);
        setIsLoadingTestCases(false);
        return;
      }

      try {
        setIsLoadingTestCases(true);
        const response = await testCaseService.getTestCases(
          selectedTestSuiteId,
          1,
          200,
        );
        const items = response.items || [];
        setSuiteTestCases(items);

        // Keep only selected IDs that still belong to the selected suite.
        setSelectedTestCaseIds((prev) =>
          prev.filter((id) => items.some((testCase) => testCase.id === id)),
        );
      } catch (err) {
        setSuiteTestCases([]);
        setSelectedTestCaseIds([]);
        handleError(err);
      } finally {
        setIsLoadingTestCases(false);
      }
    };

    loadTestCasesForSuite();
  }, [isStartModalOpen, selectedTestSuiteId]);

  // Connect to SignalR for real-time updates
  useEffect(() => {
    signalRService.connect().catch(console.error);

    const handleTestRunUpdate = () => {
      refetch();
    };

    signalRService.on("TestRunStatusChanged", handleTestRunUpdate);
    signalRService.on("TestCaseCompleted", handleTestRunUpdate);

    return () => {
      signalRService.off("TestRunStatusChanged", handleTestRunUpdate);
      signalRService.off("TestCaseCompleted", handleTestRunUpdate);
    };
  }, [refetch]);

  const handleStartTestRun = async () => {
    if (!selectedTestSuiteId) {
      showErrorToast("Please select a test suite");
      return;
    }

    if (environments.length === 0) {
      showErrorToast("No execution environment found for this project");
      return;
    }

    if (!selectedEnvironmentId) {
      showErrorToast("Please select an execution environment");
      return;
    }

    try {
      setIsSubmitting(true);
      const startedRun = await startTestRun({
        testSuiteId: selectedTestSuiteId,
        environmentId: selectedEnvironmentId || undefined,
        selectedTestCaseIds:
          selectedTestCaseIds.length > 0 ? selectedTestCaseIds : undefined,
      });

      const startedRunId =
        (startedRun as any)?.id || (startedRun as any)?.run?.id || null;

      // Fallback flow: immediately trigger one-time LLM analysis after run completes,
      // even when SignalR completion events are not published from backend.
      if (startedRunId) {
        void (async () => {
          try {
            const suiteDetail = await testSuiteService.getTestSuiteDetail(
              projectId,
              selectedTestSuiteId,
            );

            if (suiteDetail.apiSpecId) {
              try {
                await apiService.post(
                  `/test-suites/${selectedTestSuiteId}/llm-suggestions/generate`,
                  {
                    specificationId: suiteDetail.apiSpecId,
                    forceRefresh: false,
                  },
                );
              } catch (err: any) {
                const statusCode = err?.status ?? err?.response?.status;
                const message = String(
                  err?.message || err?.response?.data?.message || "",
                );
                const alreadyHasPendingSuggestions =
                  statusCode === 400 &&
                  (message.includes("ForceRefresh=true") ||
                    message.includes("suggestion preview"));

                if (!alreadyHasPendingSuggestions) {
                  throw err;
                }
              }
            }

            const runDetail = await testRunService.getTestRunResults(
              selectedTestSuiteId,
              startedRunId,
            );

            const failedCases = (runDetail.cases || []).filter(
              (c) => (c.status || "").toLowerCase() === "failed",
            );

            await Promise.all(
              failedCases.map((testCase) =>
                apiService.post(
                  `/test-suites/${selectedTestSuiteId}/test-runs/${startedRunId}/failures/${testCase.testCaseId}/explanation`,
                ),
              ),
            );

            try {
              const raw = localStorage.getItem("autoLLMAnalysis_processedRuns");
              const processed = raw ? (JSON.parse(raw) as string[]) : [];
              if (!processed.includes(startedRunId)) {
                processed.push(startedRunId);
                localStorage.setItem(
                  "autoLLMAnalysis_processedRuns",
                  JSON.stringify(processed),
                );
              }
            } catch {
              // Non-blocking localStorage write.
            }
          } catch (err) {
            console.error("Fallback post-run LLM analysis failed:", err);
          }
        })();
      }

      setActiveSuiteId(selectedTestSuiteId);
      showSuccessToast("Test run started successfully");
      setIsStartModalOpen(false);
      setSelectedTestSuiteId("");
      setSelectedTestCaseIds([]);
      setSelectedEnvironmentId(getDefaultEnvironmentId(environments));
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (testRunId: string) => {
    try {
      await cancelTestRun(testRunId);
      showSuccessToast("Test run cancelled");
    } catch (err) {
      handleError(err);
    }
  };

  const handleRetry = async (testRunId: string) => {
    try {
      await retryFailedTests(testRunId);
      showSuccessToast("Retrying failed tests");
    } catch (err) {
      handleError(err);
    }
  };

  const handleExport = async (
    testRunId: string,
    format: "json" | "csv" | "html",
  ) => {
    try {
      const blob = await exportResults(testRunId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-run-${testRunId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccessToast("Export downloaded");
    } catch (err) {
      handleError(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "passed":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400";
      case "failed":
        return "bg-error-container dark:bg-rose-900/30 text-on-error-container dark:text-rose-400";
      case "running":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
      case "pending":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400";
      case "cancelled":
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-400";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "passed":
        return "bg-emerald-500";
      case "failed":
        return "bg-error";
      case "running":
        return "bg-blue-500 animate-pulse";
      case "pending":
        return "bg-amber-500";
      case "cancelled":
        return "bg-slate-500";
      default:
        return "bg-slate-500";
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const handleToggleTestCase = (testCaseId: string) => {
    setSelectedTestCaseIds((prev) => {
      if (prev.includes(testCaseId)) {
        return prev.filter((id) => id !== testCaseId);
      }
      return [...prev, testCaseId];
    });
  };

  const handleSelectAllTestCases = () => {
    setSelectedTestCaseIds(suiteTestCases.map((testCase) => testCase.id));
  };

  const handleClearSelectedTestCases = () => {
    setSelectedTestCaseIds([]);
  };

  const loadRunDetails = async (runId: string, suiteId: string) => {
    if (runDetailsById[runId]) {
      return;
    }

    try {
      setLoadingRunDetailsById((prev) => ({ ...prev, [runId]: true }));
      const detail = await testRunService.getTestRunResults(suiteId, runId);
      setRunDetailsById((prev) => ({ ...prev, [runId]: detail }));
    } catch (err) {
      handleError(err);
    } finally {
      setLoadingRunDetailsById((prev) => ({ ...prev, [runId]: false }));
    }
  };

  const handleToggleRunDetails = async (runId: string, suiteId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      return;
    }

    setExpandedRunId(runId);
    await loadRunDetails(runId, suiteId);
  };

  const handleToggleCaseDetails = (runId: string, caseId: string) => {
    setExpandedCaseByRunId((prev) => ({
      ...prev,
      [runId]: prev[runId] === caseId ? null : caseId,
    }));
  };

  const handleOpenLlmSuggestions = (suiteId: string) => {
    const params = new URLSearchParams({
      suiteId,
    });

    if (projectId) {
      params.set("projectId", projectId);
    }

    navigate(`/suggestions?${params.toString()}`);
  };

  const hasAutoAnalysisActivity =
    autoAnalysisState.isRunning ||
    autoAnalysisState.suggestionsStatus !== "idle" ||
    autoAnalysisState.explanationsStatus !== "idle";

  // Calculate stats
  const stats = {
    total: totalCount,
    passed: testRuns.filter(
      (r) => r.status === "completed" && r.failedTests === 0,
    ).length,
    failed: testRuns.filter((r) => r.failedTests > 0).length,
    avgDuration:
      testRuns.length > 0
        ? formatDuration(
            testRuns.reduce((sum, r) => sum + (r.duration || 0), 0) /
              testRuns.length,
          )
        : "N/A",
  };

  const filteredRuns = testRuns.filter((run) => {
    if (!searchTerm.trim()) return true;
    const keyword = searchTerm.toLowerCase();
    return (
      run.id.toLowerCase().includes(keyword) ||
      run.testSuiteId.toLowerCase().includes(keyword) ||
      (run.environmentId || "").toLowerCase().includes(keyword) ||
      (run.runNumber?.toString() || "").includes(keyword)
    );
  });

  if (error) {
    return (
      <MainLayout title={t("testRuns.title")}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("testRuns.title")}>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("testRuns.title")}
            </h1>
            <p className="text-on-surface-variant">{t("testRuns.subtitle")}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refetch}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={cn("w-5 h-5", isLoading && "animate-spin")}
              />
              Refresh
            </button>
            <button
              onClick={() => setIsStartModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-primary dark:bg-indigo-600 text-on-primary font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Play className="w-5 h-5" />
              {t("testRuns.runNew")}
            </button>
          </div>
        </header>

        <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm">
          <p className="text-sm text-on-surface-variant">
            Viewing runs for suite{" "}
            <span className="font-bold text-on-surface">
              {activeSuiteName || "N/A"}
            </span>
          </p>
          <select
            value={activeSuiteId}
            onChange={(e) => handleActiveSuiteChange(e.target.value)}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/10 dark:border-slate-700 text-on-surface font-medium focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all"
          >
            {testSuites.length === 0 ? (
              <option value="">No test suites available</option>
            ) : (
              testSuites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-surface-container-low dark:bg-slate-800 text-primary dark:text-indigo-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Total Runs
              </p>
              <p className="text-2xl font-black text-on-surface">
                {stats.total}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-surface-container-low dark:bg-slate-800 text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Passed
              </p>
              <p className="text-2xl font-black text-on-surface">
                {stats.passed}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-surface-container-low dark:bg-slate-800 text-error dark:text-rose-400">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Failed
              </p>
              <p className="text-2xl font-black text-on-surface">
                {stats.failed}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-surface-container-low dark:bg-slate-800 text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Avg Duration
              </p>
              <p className="text-2xl font-black text-on-surface">
                {stats.avgDuration}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low dark:bg-slate-800 rounded-lg border-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 text-sm text-on-surface"
              placeholder="Search test runs..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2">
              Status
            </span>
            {["All", "Running", "Completed", "Failed"].map((s) => (
              <button
                key={s}
                onClick={() =>
                  setStatusFilter(s === "All" ? "" : s.toLowerCase())
                }
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                  (s === "All" && !statusFilter) ||
                    s.toLowerCase() === statusFilter
                    ? "bg-primary dark:bg-indigo-600 text-on-primary"
                    : "bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-highest dark:hover:bg-slate-700",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Runs Table */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 dark:bg-slate-800/50">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Run ID
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Test Suite
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Tests
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Duration
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : filteredRuns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-8 py-12 text-center text-on-surface-variant"
                    >
                      No test runs found
                    </td>
                  </tr>
                ) : (
                  filteredRuns.map((run) => (
                    <React.Fragment key={run.id}>
                      <tr className="hover:bg-surface-container-low/30 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-on-surface">
                              Run #{run.runNumber ?? "-"}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-medium">
                              {run.id.substring(0, 8)} •{" "}
                              {formatDate(run.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-on-surface">
                              Test Suite #{run.testSuiteId.substring(0, 8)}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-medium">
                              Env #
                              {(run.environmentId || "N/A").substring(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold",
                              getStatusColor(run.status),
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                getStatusIcon(run.status),
                              )}
                            ></span>
                            {run.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-mono font-bold text-on-surface">
                            {run.passedTests +
                              run.failedTests +
                              run.skippedTests}
                            /{run.totalTests}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-xs font-medium text-on-surface-variant">
                            {formatDuration(run.duration)}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {run.status === "running" && (
                              <button
                                onClick={() => handleCancel(run.id)}
                                className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors text-error"
                                title="Cancel"
                              >
                                <StopCircle className="w-4 h-4" />
                              </button>
                            )}
                            {run.status === "completed" &&
                              run.failedTests > 0 && (
                                <button
                                  onClick={() => handleRetry(run.id)}
                                  className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors text-amber-500"
                                  title="Retry Failed"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            <button
                              onClick={() => {
                                const status = run.status.toLowerCase();
                                const isFinished =
                                  status === "completed" ||
                                  status === "failed" ||
                                  status === "cancelled";

                                if (isFinished) {
                                  handleOpenLlmSuggestions(run.testSuiteId);
                                  return;
                                }

                                handleToggleRunDetails(run.id, run.testSuiteId);
                              }}
                              className="px-4 py-2 bg-surface-container-high dark:bg-slate-800 text-on-surface dark:text-slate-200 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-primary dark:hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
                            >
                              Details
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedRunId === run.id && (
                        <tr className="bg-surface-container-low/20 dark:bg-slate-800/20">
                          <td colSpan={6} className="px-8 py-5">
                            {loadingRunDetailsById[run.id] ? (
                              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading run details...
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-on-surface-variant">
                                      Started:
                                    </span>{" "}
                                    <span className="text-on-surface font-medium">
                                      {formatDateTime(run.startedAt)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-on-surface-variant">
                                      Completed:
                                    </span>{" "}
                                    <span className="text-on-surface font-medium">
                                      {formatDateTime(run.completedAt)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-on-surface-variant">
                                      Passed:
                                    </span>{" "}
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                      {run.passedTests}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-on-surface-variant">
                                      Failed:
                                    </span>{" "}
                                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                      {run.failedTests}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-on-surface-variant">
                                      Skipped:
                                    </span>{" "}
                                    <span className="text-on-surface font-medium">
                                      {run.skippedTests}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-on-surface-variant">
                                      Results Expire:
                                    </span>{" "}
                                    <span className="text-on-surface font-medium">
                                      {formatDateTime(run.resultsExpireAt)}
                                    </span>
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="text-on-surface-variant">
                                      Has Detailed Results:
                                    </span>{" "}
                                    <span className="text-on-surface font-medium">
                                      {run.hasDetailedResults ? "Yes" : "No"}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-outline-variant/10 dark:border-slate-700">
                                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                                    Test Cases In This Run
                                  </p>

                                  {runDetailsById[run.id]?.cases?.length ? (
                                    <div className="space-y-2">
                                      {runDetailsById[run.id].cases.map(
                                        (testCase) => {
                                          const isExpanded =
                                            expandedCaseByRunId[run.id] ===
                                            testCase.testCaseId;

                                          return (
                                            <div
                                              key={testCase.testCaseId}
                                              className="rounded-lg border border-outline-variant/10 dark:border-slate-700 bg-surface-container-low/40 dark:bg-slate-800/40"
                                            >
                                              <div className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                                <div className="min-w-0">
                                                  <p className="text-sm font-semibold text-on-surface truncate">
                                                    {testCase.name}
                                                  </p>
                                                  <p className="text-xs text-on-surface-variant">
                                                    Status: {testCase.status} •
                                                    Duration:{" "}
                                                    {formatDuration(
                                                      testCase.durationMs,
                                                    )}
                                                  </p>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleToggleCaseDetails(
                                                      run.id,
                                                      testCase.testCaseId,
                                                    )
                                                  }
                                                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-surface-container-high dark:bg-slate-700 text-on-surface hover:bg-primary hover:text-white dark:hover:bg-indigo-600 transition-all"
                                                >
                                                  {isExpanded
                                                    ? "Hide detail"
                                                    : "View detail"}
                                                </button>
                                              </div>

                                              {isExpanded && (
                                                <div className="px-3 pb-3 space-y-2 text-xs text-on-surface-variant">
                                                  <p>
                                                    URL:{" "}
                                                    <span className="text-on-surface">
                                                      {testCase.resolvedUrl ||
                                                        "N/A"}
                                                    </span>
                                                  </p>
                                                  <p>
                                                    HTTP Status:{" "}
                                                    <span className="text-on-surface">
                                                      {testCase.httpStatusCode ??
                                                        "N/A"}
                                                    </span>
                                                  </p>
                                                  {testCase.failureReasons
                                                    ?.length > 0 && (
                                                    <div>
                                                      <p className="font-semibold text-rose-600 dark:text-rose-400">
                                                        Failure Reasons:
                                                      </p>
                                                      {testCase.failureReasons.map(
                                                        (reason, index) => (
                                                          <p
                                                            key={`${testCase.testCaseId}-${index}`}
                                                          >
                                                            -{" "}
                                                            {(reason.code ||
                                                              "") +
                                                              (reason.message
                                                                ? `: ${reason.message}`
                                                                : "")}
                                                          </p>
                                                        ),
                                                      )}
                                                    </div>
                                                  )}
                                                  {testCase.responseBodyPreview && (
                                                    <div>
                                                      <p className="font-semibold text-on-surface">
                                                        Response Preview:
                                                      </p>
                                                      <pre className="mt-1 p-2 rounded bg-slate-900 text-slate-100 overflow-x-auto whitespace-pre-wrap break-all">
                                                        {
                                                          testCase.responseBodyPreview
                                                        }
                                                      </pre>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <p className="text-sm text-on-surface-variant">
                                        {runDetailsById[run.id]
                                          ?.resultsSource === "unavailable"
                                          ? "Detailed run results are unavailable because cache (Redis) was unavailable or expired."
                                          : "No detailed test case data available for this run."}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          navigate(
                                            `/test-suites/${run.testSuiteId}/test-cases${projectId ? `?projectId=${projectId}` : ""}`,
                                          )
                                        }
                                        className="text-sm font-semibold text-primary dark:text-indigo-400 hover:underline"
                                      >
                                        View test case definitions in suite
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-8 py-6 flex items-center justify-between bg-surface-container-low/30 dark:bg-slate-800/30">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Showing{" "}
                {testRuns.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-on-surface" />
                </button>
                <span className="text-sm font-medium text-on-surface px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages || isLoading}
                  className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-on-surface" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Start Test Run Modal */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => {
          setIsStartModalOpen(false);
          setSelectedTestSuiteId("");
          setSelectedTestCaseIds([]);
          setSuiteTestCases([]);
          setSelectedEnvironmentId(getDefaultEnvironmentId(environments));
        }}
        title="Start New Test Run"
        footer={
          <>
            <button
              onClick={() => {
                setIsStartModalOpen(false);
                setSelectedTestSuiteId("");
                setSelectedTestCaseIds([]);
                setSuiteTestCases([]);
                setSelectedEnvironmentId(getDefaultEnvironmentId(environments));
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleStartTestRun}
              disabled={isSubmitting || !selectedTestSuiteId}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Start Run
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Select Test Suite
            </label>
            <select
              value={selectedTestSuiteId}
              onChange={(e) => {
                setSelectedTestSuiteId(e.target.value);
                setSelectedTestCaseIds([]);
                setSuiteTestCases([]);
              }}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface"
            >
              <option value="">Choose a test suite...</option>
              {testSuites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name} (
                  {(suite as any).totalTestCases ?? suite.testCaseCount ?? 0}{" "}
                  test cases)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Select Test Cases (Optional)
              </label>
              {suiteTestCases.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllTestCases}
                    className="text-xs font-semibold text-primary dark:text-indigo-400 hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelectedTestCases}
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {!selectedTestSuiteId ? (
              <p className="text-sm text-on-surface-variant">
                Select a test suite to load test cases.
              </p>
            ) : isLoadingTestCases ? (
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading test cases...
              </div>
            ) : suiteTestCases.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No test cases found in this suite.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {suiteTestCases.map((testCase) => {
                  const isChecked = selectedTestCaseIds.includes(testCase.id);
                  return (
                    <label
                      key={testCase.id}
                      className="flex items-start gap-3 p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTestCase(testCase.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-on-surface truncate">
                          {testCase.name}
                        </div>
                        <div className="text-xs text-on-surface-variant truncate">
                          {testCase.method} {testCase.path}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Select Environment
            </label>
            <select
              value={selectedEnvironmentId}
              onChange={(e) => setSelectedEnvironmentId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface"
              disabled={environments.length === 0}
            >
              {environments.length === 0 ? (
                <option value="">No environment found</option>
              ) : (
                environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                    {env.isDefault ? " (default)" : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {environments.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Please create an execution environment in Environments page
                before starting a run.
              </p>
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (projectId) {
                    params.set("projectId", projectId);
                  }

                  const target = params.toString()
                    ? `/environments?${params.toString()}`
                    : "/environments";

                  setIsStartModalOpen(false);
                  navigate(target);
                }}
                className="text-sm font-semibold text-primary dark:text-indigo-400 hover:underline"
              >
                Go to Environments
              </button>
            </div>
          )}
          <p className="text-sm text-on-surface-variant">
            {selectedTestCaseIds.length > 0
              ? `This run will execute ${selectedTestCaseIds.length} selected test case(s) in the suite.`
              : "The test run will execute all test cases in the selected suite."}
          </p>
          {!activeSuiteId && testSuites.length === 0 && (
            <p className="text-sm text-on-surface-variant">
              Please create a test suite first.
            </p>
          )}
        </div>
      </Modal>

      {hasAutoAnalysisActivity && (
        <AutoAnalysisProgressPanel
          state={autoAnalysisState}
          onCancel={cancelAutoAnalysis}
          onDismiss={dismissAutoAnalysis}
          onRetry={retryAutoAnalysis}
          onViewSuggestions={() => {
            if (
              !autoAnalysisState.currentRunId ||
              !autoAnalysisState.currentSuiteId
            ) {
              return;
            }
            handleOpenLlmSuggestions(autoAnalysisState.currentSuiteId);
          }}
          onViewResults={() => {
            if (
              !autoAnalysisState.currentRunId ||
              !autoAnalysisState.currentSuiteId
            ) {
              return;
            }
            handleOpenLlmSuggestions(autoAnalysisState.currentSuiteId);
          }}
        />
      )}
    </MainLayout>
  );
}
