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
  ExecutionEnvironment,
} from "../services/environmentService";
import testCaseService, { TestCase } from "../services/testCaseService";
import testRunService, {
  TestRunDetailResponse,
} from "../services/testRunService";
import { testSuiteService } from "../services/testSuiteService";
import { apiService } from "../services/apiService";
import { useAutoLLMAnalysis } from "../hooks/useAutoLLMAnalysis";
import AutoAnalysisProgressPanel from "../components/test-runs/AutoAnalysisProgressPanel";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";

export default function TestRunsPage() {
  const { t } = useTranslation();
  const breadcrumbs = useProjectBreadcrumbs(t("testRuns.title"));
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedProject } = useProject();

  const projectId = searchParams.get("projectId") || selectedProject?.id || "";
  const preselectedSuiteId = searchParams.get("suiteId") || "";
  const activeSuiteIdFromQuery = searchParams.get("activeSuiteId") || "";
  const preselectedTestCaseId = searchParams.get("testCaseId") || "";
  const preselectedTestCaseIdsRaw = searchParams.get("testCaseIds") || "";

  // Key lưu activeSuiteId theo projectId để không bị lẫn giữa các project
  const activeSuiteStorageKey = projectId ? `testRuns_activeSuiteId:${projectId}` : null;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [selectedTestSuiteId, setSelectedTestSuiteId] = useState("");
  const [activeSuiteId, setActiveSuiteId] = useState(() => {
    // Khôi phục suite đang xem từ localStorage khi mount
    if (!projectId) return "";
    const key = `testRuns_activeSuiteId:${projectId}`;
    return localStorage.getItem(key) || "";
  });
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
  const [environments, setEnvironments] = useState<ExecutionEnvironment[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState("");
  const [strictValidation, setStrictValidation] = useState(false);
  const [maxRetryAttempts, setMaxRetryAttempts] = useState(0);
  const [retryFailedDependencies, setRetryFailedDependencies] = useState(true);
  const [rerunSkippedCases, setRerunSkippedCases] = useState(true);
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
    if (activeSuiteStorageKey) {
      localStorage.setItem(activeSuiteStorageKey, suiteId);
    }
  };

  const getDefaultEnvironmentId = (items: ExecutionEnvironment[]) => {
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
      const firstId = testSuites[0].id;
      setActiveSuiteId(firstId);
      if (activeSuiteStorageKey) {
        localStorage.setItem(activeSuiteStorageKey, firstId);
      }
    }
  }, [testSuites, activeSuiteId]);

  useEffect(() => {
    if (!activeSuiteIdFromQuery) return;

    setActiveSuiteId(activeSuiteIdFromQuery);
    if (activeSuiteStorageKey) {
      localStorage.setItem(activeSuiteStorageKey, activeSuiteIdFromQuery);
    }

    const params = new URLSearchParams(searchParams);
    params.delete("activeSuiteId");
    setSearchParams(params, { replace: true });
  }, [activeSuiteIdFromQuery]);

  useEffect(() => {
    if (!preselectedSuiteId) return;

    setSelectedTestSuiteId(preselectedSuiteId);
    setActiveSuiteId(preselectedSuiteId);
    if (activeSuiteStorageKey) {
      localStorage.setItem(activeSuiteStorageKey, preselectedSuiteId);
    }

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

    const handleTestRunUpdate = (data?: any) => {
      // Invalidate cache cho run đang running để force re-fetch khi expand
      const runId = data?.testRunId || data?.TestRunId;
      if (runId) {
        setRunDetailsById((prev) => {
          const next = { ...prev };
          delete next[runId];
          return next;
        });
      } else {
        // Không biết run nào → clear toàn bộ cache running runs
        setRunDetailsById((prev) => {
          const next = { ...prev };
          // Chỉ xóa những run đang running trong cache
          Object.keys(next).forEach((id) => {
            const cached = next[id];
            const status = String((cached as any)?.status || "").toLowerCase();
            if (status === "running" || status === "pending") {
              delete next[id];
            }
          });
          return next;
        });
      }
      refetch();
    };

    signalRService.on("TestRunStatusChanged", handleTestRunUpdate);
    signalRService.on("TestCaseCompleted", handleTestRunUpdate);

    return () => {
      signalRService.off("TestRunStatusChanged", handleTestRunUpdate);
      signalRService.off("TestCaseCompleted", handleTestRunUpdate);
    };
  }, [refetch]);

  const closeStartModal = () => {
    setIsStartModalOpen(false);
    setSelectedTestSuiteId("");
    setSelectedTestCaseIds([]);
    setSuiteTestCases([]);
    setMaxRetryAttempts(0);
    setRetryFailedDependencies(true);
    setRerunSkippedCases(true);
  };

  const handleStartTestRun = async () => {
    if (!selectedTestSuiteId) {
      showErrorToast(t("testRuns.modal.suiteRequired"));
      return;
    }

    if (environments.length === 0) {
      showErrorToast(t("testRuns.modal.noEnvFound"));
      return;
    }

    if (!selectedEnvironmentId) {
      showErrorToast(t("testRuns.modal.envRequired"));
      return;
    }

    try {
      setIsSubmitting(true);
      await startTestRun({
        testSuiteId: selectedTestSuiteId,
        environmentId: selectedEnvironmentId || undefined,
        selectedTestCaseIds:
          selectedTestCaseIds.length > 0 ? selectedTestCaseIds : undefined,
        strictValidation,
        retryPolicy: {
          maxRetryAttempts,
          retryFailedDependencies,
          rerunSkippedCases,
        },
      });

      // Post-run LLM analysis (suggestions + failure explanations) is handled
      // by the useAutoLLMAnalysis hook via SignalR TestRunStatusChanged events.
      // No inline fallback trigger needed here to avoid duplicate side effects.

      setActiveSuiteId(selectedTestSuiteId);
      if (activeSuiteStorageKey) {
        localStorage.setItem(activeSuiteStorageKey, selectedTestSuiteId);
      }
      showSuccessToast(t("testRuns.toast.started"));
      closeStartModal();
      setStrictValidation(false);
      setMaxRetryAttempts(0);
      setRetryFailedDependencies(true);
      setRerunSkippedCases(true);
      setSelectedEnvironmentId(getDefaultEnvironmentId(environments));
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
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
      showSuccessToast(t("testRuns.toast.exported"));
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
    if (!ms) return t("testRuns.na");
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

    if (diffMins < 60) return t("projects.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("projects.hoursAgo", { count: diffHours });
    if (diffDays === 1) return t("specifications.yesterday");
    if (diffDays < 30) return t("projects.daysAgo", { count: diffDays });
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return t("testRuns.na");
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
    const cached = runDetailsById[runId];
    // Không cache nếu run đang running/pending — luôn fetch mới
    const cachedStatus = String((cached as any)?.status || "").toLowerCase();
    if (cached && cachedStatus !== "running" && cachedStatus !== "pending") {
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

  const handleOpenLlmSuggestions = (suiteId: string, runId?: string) => {
    const params = new URLSearchParams({
      suiteId,
    });

    if (projectId) {
      params.set("projectId", projectId);
    }

    if (runId) {
      params.set("runId", runId);
    }

    navigate(`/suggestions?${params.toString()}`);
  };

  const hasAutoAnalysisActivity =
    autoAnalysisState.isRunning ||
    autoAnalysisState.suggestionsStatus !== "idle" ||
    autoAnalysisState.explanationsStatus !== "idle";

  // Stats tính trên page hiện tại (không phải toàn bộ)
  const pagePassedCount = testRuns.filter(
    (r) => r.status === "completed" && r.failedTests === 0,
  ).length;
  const pageFailedCount = testRuns.filter((r) => r.failedTests > 0).length;
  const runsWithDuration = testRuns.filter((r) => (r.duration || 0) > 0);
  const pageAvgDuration =
    runsWithDuration.length > 0
      ? formatDuration(
        runsWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0) /
        runsWithDuration.length,
      )
      : "N/A";

  const stats = {
    total: totalCount,
    passed: pagePassedCount,
    failed: pageFailedCount,
    avgDuration: pageAvgDuration,
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
      <MainLayout title={t("testRuns.title")} breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 cursor-pointer"
            >
              {t("testRuns.tryAgain")}
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t("testRuns.title")} breadcrumbs={breadcrumbs}>
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
              className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold flex items-center gap-2 hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={cn("w-5 h-5", isLoading && "animate-spin")}
              />
              {t("testRuns.refreshButton")}
            </button>
            <button
              onClick={() => setIsStartModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="w-5 h-5" />
              {t("testRuns.runNew")}
            </button>
          </div>
        </header>

        <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm">
          <p className="text-sm text-on-surface-variant">
            {t("testRuns.viewingRunsFor")}{" "}
            <span className="font-bold text-on-surface">
              {activeSuiteName || t("testRuns.na")}
            </span>
          </p>
          <select
            value={activeSuiteId}
            onChange={(e) => handleActiveSuiteChange(e.target.value)}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/10 dark:border-slate-700 text-on-surface font-medium focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all"
          >
            {testSuites.length === 0 ? (
              <option value="">{t("testRuns.noSuites")}</option>
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
                {t("testRuns.stats.total")}
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
                {t("testRuns.stats.success")}
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
                {t("testRuns.stats.failures")}
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
                {t("testRuns.stats.duration")}
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
              placeholder={t("testRuns.searchPlaceholder")}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2">
              {t("testRuns.statusLabel")}
            </span>
            {[t("testRuns.filterAll"), t("testRuns.filterRunning"), t("testRuns.filterCompleted"), t("testRuns.filterFailed")].map((s, i) => {
              const values = ["", "running", "completed", "failed"];
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(values[i])}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                    values[i] === statusFilter
                      ? "bg-indigo-600 dark:bg-indigo-500 text-white"
                      : "bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-highest dark:hover:bg-slate-700",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Runs Table */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 dark:bg-slate-800/50">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("testRuns.table.id")}
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("testRuns.table.suite")}
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("testRuns.table.status")}
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("testRuns.table.tests")}
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("testRuns.table.duration")}
                  </th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">
                    {t("testRuns.table.actions")}
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
                      {t("testRuns.noRuns")}
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
                            <button
                              onClick={() =>
                                navigate(
                                  `/traceability?suiteId=${run.testSuiteId}&testRunId=${run.id}${projectId ? `&projectId=${projectId}` : ""}`,
                                )
                              }
                              className="px-4 py-2 bg-surface-container-high dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer"
                              title="View SRS Coverage for this run"
                            >
                              SRS
                            </button>
                            <button
                              onClick={() => {
                                const status = run.status.toLowerCase();
                                const isFinished =
                                  status === "completed" ||
                                  status === "failed" ||
                                  status === "cancelled";

                                if (isFinished) {
                                  handleOpenLlmSuggestions(run.testSuiteId, run.id);
                                  return;
                                }

                                handleToggleRunDetails(run.id, run.testSuiteId);
                              }}
                              className="px-4 py-2 bg-surface-container-high dark:bg-slate-800 text-on-surface dark:text-slate-200 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-primary dark:hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                            >
                              {t("testRuns.detailsButton")}
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
                                {t("testRuns.loadingDetails")}
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-on-surface-variant">
                                      {t("testRuns.detail.started")}
                                    </span>{" "}
                                    <span className="text-on-surface font-medium">
                                      {formatDateTime(run.startedAt)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-on-surface-variant">
                                      {t("testRuns.detail.completed")}
                                    </span>{" "}
                                    <span className="text-on-surface font-medium">
                                      {formatDateTime(run.completedAt)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-on-surface-variant">
                                      {t("testRuns.detail.passed")}
                                    </span>{" "}
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                      {run.passedTests}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-on-surface-variant">
                                      {t("testRuns.detail.failed")}
                                    </span>{" "}
                                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                      {run.failedTests}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-on-surface-variant">
                                      {t("testRuns.detail.skipped")}
                                    </span>{" "}
                                    <span className="text-on-surface font-medium">
                                      {run.skippedTests}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-on-surface-variant">
                                      {t("testRuns.detail.resultsExpire")}
                                    </span>{" "}
                                    <span className="text-on-surface font-medium">
                                      {formatDateTime(run.resultsExpireAt)}
                                    </span>
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="text-on-surface-variant">
                                      {t("testRuns.detail.hasDetailed")}
                                    </span>{" "}
                                    <span className="text-on-surface font-medium">
                                      {run.hasDetailedResults ? t("testRuns.yes") : t("testRuns.no")}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-outline-variant/10 dark:border-slate-700">
                                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                                    {t("testRuns.detail.testCasesInRun")}
                                  </p>

                                  {runDetailsById[run.id]?.cases?.length ? (
                                    <div className="space-y-2">
                                      {runDetailsById[run.id].cases.map(
                                        (testCase) => {
                                          const isExpanded =
                                            expandedCaseByRunId[run.id] ===
                                            testCase.testCaseId;

                                          // BC-1/BC-2: retry badge logic
                                          // totalAttempts is the correct field (executionAttempt = index of last attempt, NOT total count)
                                          const totalAttempts = testCase.totalAttempts ?? 1;
                                          const retryCount = totalAttempts - 1;
                                          const statusLower = (testCase.status || "").toLowerCase();
                                          let statusLabel = testCase.status;
                                          let statusColor = "text-on-surface-variant";
                                          if (statusLower === "passed") {
                                            statusColor = "text-emerald-600 dark:text-emerald-400";
                                            statusLabel = retryCount > 0 ? `Passed (Retried ×${retryCount})` : "Passed";
                                          } else if (statusLower === "failed") {
                                            statusColor = "text-rose-600 dark:text-rose-400";
                                            statusLabel = retryCount > 0 ? `Failed (after ${retryCount} retr${retryCount > 1 ? "ies" : "y"})` : "Failed";
                                          } else if (statusLower === "skipped") {
                                            statusColor = "text-amber-500 dark:text-amber-400";
                                            statusLabel = "Skipped";
                                          }

                                          return (
                                            <div
                                              key={testCase.testCaseId}
                                              className="rounded-lg border border-outline-variant/10 dark:border-slate-700 bg-surface-container-low/40 dark:bg-slate-800/40"
                                            >
                                              <div className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-semibold text-on-surface truncate">
                                                      {testCase.name}
                                                    </p>
                                                    {/* Retry / Replay badge */}
                                                    {retryCount > 0 && (
                                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
                                                        ↩ ×{retryCount}
                                                      </span>
                                                    )}
                                                    {testCase.hasWarnings && (
                                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 shrink-0">
                                                        ⚠ warn
                                                      </span>
                                                    )}
                                                  </div>
                                                  <p className="text-xs mt-0.5">
                                                    <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
                                                    <span className="text-on-surface-variant">
                                                      {" "}• {t("testRuns.detail.caseDuration")}{" "}
                                                      {formatDuration(testCase.durationMs)}
                                                    </span>
                                                  </p>
                                                  {/* BC-1: skipped dependency info */}
                                                  {statusLower === "skipped" && testCase.skippedCause && (
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                                      {testCase.skippedCause}
                                                    </p>
                                                  )}
                                                  {statusLower === "skipped" && testCase.skippedBecauseDependencyIds?.length > 0 && (
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                                      Depends on: {testCase.skippedBecauseDependencyIds.map((depId) => {
                                                        const depCase = runDetailsById[run.id]?.cases?.find((c) => c.testCaseId === depId);
                                                        return depCase ? depCase.name : depId.slice(0, 8) + "…";
                                                      }).join(", ")}
                                                    </p>
                                                  )}
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
                                                    ? t("testRuns.detail.hideDetail")
                                                    : t("testRuns.detail.viewDetail")}
                                                </button>
                                              </div>

                                              {isExpanded && (
                                                <div className="px-3 pb-3 space-y-2 text-xs text-on-surface-variant border-t border-outline-variant/10 dark:border-slate-700 pt-2">
                                                  <p>
                                                    {t("testRuns.detail.url")}{" "}
                                                    <span className="text-on-surface break-all">
                                                      {testCase.resolvedUrl ||
                                                        t("testRuns.na")}
                                                    </span>
                                                  </p>
                                                  <p>
                                                    {t("testRuns.detail.httpStatus")}{" "}
                                                    <span className="text-on-surface">
                                                      {testCase.httpStatusCode ??
                                                        t("testRuns.na")}
                                                    </span>
                                                    {testCase.expectedStatus && (
                                                      <span className="text-on-surface-variant">
                                                        {" "}(expected: {testCase.expectedStatus})
                                                      </span>
                                                    )}
                                                  </p>
                                                  {/* Check results row — hide for skipped cases */}
                                                  {statusLower !== "skipped" && (testCase.checksPerformed != null || testCase.checksSkipped != null) && (
                                                    <p>
                                                      Checks:{" "}
                                                      <span className="text-on-surface">
                                                        {testCase.checksPerformed ?? 0} performed
                                                        {(testCase.checksSkipped ?? 0) > 0 && `, ${testCase.checksSkipped} skipped`}
                                                      </span>
                                                    </p>
                                                  )}
                                                  {/* Individual check results — only show when HTTP was actually sent */}
                                                  {statusLower !== "skipped" && testCase.httpStatusCode != null && [
                                                    { label: "Status code", value: testCase.statusCodeMatched },
                                                    { label: "Schema", value: testCase.schemaMatched },
                                                    { label: "Headers", value: testCase.headerChecksPassed },
                                                    { label: "Body contains", value: testCase.bodyContainsPassed },
                                                    { label: "Body not contains", value: testCase.bodyNotContainsPassed },
                                                    { label: "JSON path", value: testCase.jsonPathChecksPassed },
                                                    { label: "Response time", value: testCase.responseTimePassed },
                                                  ].filter((c) => c.value != null).length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                      {[
                                                        { label: "Status code", value: testCase.statusCodeMatched },
                                                        { label: "Schema", value: testCase.schemaMatched },
                                                        { label: "Headers", value: testCase.headerChecksPassed },
                                                        { label: "Body contains", value: testCase.bodyContainsPassed },
                                                        { label: "Body not contains", value: testCase.bodyNotContainsPassed },
                                                        { label: "JSON path", value: testCase.jsonPathChecksPassed },
                                                        { label: "Response time", value: testCase.responseTimePassed },
                                                      ].filter((c) => c.value != null).map((c) => (
                                                        <span
                                                          key={c.label}
                                                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.value ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"}`}
                                                        >
                                                          {c.value ? "✓" : "✗"} {c.label}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  )}
                                                  {/* For failed cases with no HTTP (pre-request failure like UNRESOLVED_VARIABLE) */}
                                                  {statusLower === "failed" && testCase.httpStatusCode == null && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                                      ⚠ Request not sent — pre-execution failure
                                                    </span>
                                                  )}
                                                  {/* Failure reasons */}
                                                  {testCase.failureReasons?.length > 0 && (
                                                    <div>
                                                      <p className="font-semibold text-rose-600 dark:text-rose-400 mb-1">
                                                        {t("testRuns.detail.failureReasons")}
                                                      </p>
                                                      {testCase.failureReasons.map(
                                                        (reason, index) => (
                                                          <p
                                                            key={`${testCase.testCaseId}-f${index}`}
                                                            className="ml-2"
                                                          >
                                                            <span className="font-mono text-rose-500 dark:text-rose-400">{reason.code}</span>
                                                            {reason.message ? `: ${reason.message}` : ""}
                                                            {reason.expected && (
                                                              <span className="text-on-surface-variant"> (expected: <span className="text-on-surface">{reason.expected}</span>, got: <span className="text-on-surface">{reason.actual}</span>)</span>
                                                            )}
                                                          </p>
                                                        ),
                                                      )}
                                                    </div>
                                                  )}
                                                  {/* Warnings */}
                                                  {testCase.warnings && testCase.warnings.length > 0 && (
                                                    <div>
                                                      <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                                                        Warnings
                                                      </p>
                                                      {testCase.warnings.map((w, index) => (
                                                        <p key={`${testCase.testCaseId}-w${index}`} className="ml-2">
                                                          <span className="font-mono text-yellow-500">{w.code}</span>
                                                          {w.message ? `: ${w.message}` : ""}
                                                        </p>
                                                      ))}
                                                    </div>
                                                  )}
                                                  {/* Extracted variables */}
                                                  {Object.keys(testCase.extractedVariables || {}).length > 0 && (
                                                    <div>
                                                      <p className="font-semibold text-on-surface mb-1">
                                                        Extracted Variables
                                                      </p>
                                                      {Object.entries(testCase.extractedVariables).map(([k, v]) => (
                                                        <p key={k} className="ml-2 font-mono">
                                                          <span className="text-indigo-500 dark:text-indigo-400">{k}</span>
                                                          {" = "}
                                                          <span className="text-on-surface">{v}</span>
                                                        </p>
                                                      ))}
                                                    </div>
                                                  )}
                                                  {/* Response body preview */}
                                                  {testCase.responseBodyPreview && (
                                                    <div>
                                                      <p className="font-semibold text-on-surface">
                                                        {t("testRuns.detail.responsePreview")}
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
                                          ? t("testRuns.detail.unavailable")
                                          : t("testRuns.detail.noDetailedData")}
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
                                        {t("testRuns.detail.viewInSuite")}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Attempt Timeline (BC-2/BC-3) */}
                                {runDetailsById[run.id]?.attempts && runDetailsById[run.id].attempts!.length > 0 && (() => {
                                  const attempts = runDetailsById[run.id].attempts!;
                                  const childrenMap = runDetailsById[run.id].attemptChildrenMap || {};
                                  // Group attempts by testCaseId, show only cases with >1 attempt or retries
                                  const byCase = attempts.reduce<Record<string, typeof attempts>>((acc, a) => {
                                    if (!acc[a.testCaseId]) acc[a.testCaseId] = [];
                                    acc[a.testCaseId].push(a);
                                    return acc;
                                  }, {});
                                  const casesWithRetries = Object.entries(byCase).filter(([, atts]) => atts.length > 1 || atts.some((a) => a.retryReason));
                                  if (casesWithRetries.length === 0) return null;
                                  return (
                                    <div className="mt-4 pt-4 border-t border-outline-variant/10 dark:border-slate-700">
                                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                                        Retry / Attempt Timeline
                                      </p>
                                      <div className="space-y-3">
                                        {casesWithRetries.map(([caseId, atts]) => {
                                          const caseInfo = runDetailsById[run.id].cases?.find((c) => c.testCaseId === caseId);
                                          const sorted = [...atts].sort((a, b) => a.attemptNumber - b.attemptNumber);
                                          return (
                                            <div key={caseId} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
                                              <p className="text-xs font-semibold text-on-surface mb-2">
                                                {caseInfo?.name || caseId.slice(0, 8) + "…"}
                                              </p>
                                              <div className="flex flex-wrap gap-2">
                                                {sorted.map((att, i) => {
                                                  const attStatusLower = att.status.toLowerCase();
                                                  const dotColor = attStatusLower === "passed"
                                                    ? "bg-emerald-500"
                                                    : attStatusLower === "failed"
                                                      ? "bg-rose-500"
                                                      : "bg-amber-400";
                                                  return (
                                                    <div key={att.executionAttemptId} className="flex items-center gap-1">
                                                      {i > 0 && <span className="text-on-surface-variant text-xs">→</span>}
                                                      <div className="flex flex-col items-center">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} title={att.status} />
                                                        <span className="text-[9px] text-on-surface-variant mt-0.5">#{att.attemptNumber}</span>
                                                        {att.isReplay && (
                                                          <span className="text-[9px] text-indigo-500 font-bold">↺</span>
                                                        )}
                                                      </div>
                                                      <div className="text-[10px] text-on-surface-variant max-w-[120px]">
                                                        <span className={`font-semibold ${attStatusLower === "passed" ? "text-emerald-600 dark:text-emerald-400" : attStatusLower === "failed" ? "text-rose-600 dark:text-rose-400" : "text-amber-500"}`}>
                                                          {att.status}
                                                        </span>
                                                        {att.retryReason && (
                                                          <span className="block text-[9px] italic truncate" title={att.retryReason}>
                                                            {att.retryReason}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
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
                {t("projects.showing")}{" "}
                {testRuns.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}{" "}
                {t("projects.to")}{" "}
                {Math.min(currentPage * pageSize, totalCount)}{" "}
                {t("projects.of")} {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-on-surface" />
                </button>
                <span className="text-sm font-medium text-on-surface px-4">
                  {t("projects.page")} {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages || isLoading}
                  className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
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
          closeStartModal();
          setSelectedEnvironmentId(getDefaultEnvironmentId(environments));
        }}
        title={t("testRuns.modal.title")}
        footer={
          <>
            <button
              onClick={() => {
                closeStartModal();
                setSelectedEnvironmentId(getDefaultEnvironmentId(environments));
              }}
              disabled={isSubmitting}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("testRuns.modal.cancel")}
            </button>
            <button
              onClick={handleStartTestRun}
              disabled={isSubmitting || !selectedTestSuiteId}
              className="px-8 py-3 bg-indigo-600 dark:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("testRuns.modal.startButton")}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              {t("testRuns.modal.suiteLabel")}
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
              <option value="">{t("testRuns.modal.suitePlaceholder")}</option>
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
                {t("testRuns.modal.testCasesLabel")}
              </label>
              {suiteTestCases.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllTestCases}
                    className="text-xs font-semibold text-primary dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {t("testRuns.modal.selectAll")}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelectedTestCases}
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                  >
                    {t("testRuns.modal.clear")}
                  </button>
                </div>
              )}
            </div>

            {!selectedTestSuiteId ? (
              <p className="text-sm text-on-surface-variant">
                {t("testRuns.modal.selectSuiteFirst")}
              </p>
            ) : isLoadingTestCases ? (
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("testRuns.modal.loadingTestCases")}
              </div>
            ) : suiteTestCases.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                {t("testRuns.modal.noTestCases")}
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
              {t("testRuns.modal.envLabel")}
            </label>
            <select
              value={selectedEnvironmentId}
              onChange={(e) => setSelectedEnvironmentId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all appearance-none text-on-surface"
              disabled={environments.length === 0}
            >
              {environments.length === 0 ? (
                <option value="">{t("testRuns.modal.noEnvOption")}</option>
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
                {t("testRuns.modal.noEnvWarning")}
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

                  closeStartModal();
                  navigate(target);
                }}
                className="text-sm font-semibold text-primary dark:text-indigo-400 hover:underline"
              >
                {t("testRuns.modal.goToEnvs")}
              </button>
            </div>
          )}
          <p className="text-sm text-on-surface-variant">
            {selectedTestCaseIds.length > 0
              ? t("testRuns.modal.selectedCasesInfo", { count: selectedTestCaseIds.length })
              : t("testRuns.modal.allCasesInfo")}
          </p>

          {/* Strict Validation Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Strict Validation
              </label>
              <p className="text-xs text-on-surface-variant mt-0.5">
                When enabled, test cases without expectations will fail instead of warn.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStrictValidation((prev) => !prev)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                strictValidation
                  ? "bg-primary dark:bg-indigo-500"
                  : "bg-slate-300 dark:bg-slate-600",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  strictValidation ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>

          {/* Retry Policy */}
          <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Retry Policy
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Max Retry Attempts (0 = no retry, max 3)
              </label>
              <input
                type="number"
                min={0}
                max={3}
                value={maxRetryAttempts}
                onChange={(e) =>
                  setMaxRetryAttempts(
                    Math.min(3, Math.max(0, parseInt(e.target.value) || 0)),
                  )
                }
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all text-on-surface text-sm"
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Retry Failed Dependencies
                </label>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Retry test cases that failed due to a dependency failing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRetryFailedDependencies((prev) => !prev)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0",
                  retryFailedDependencies
                    ? "bg-primary dark:bg-indigo-500"
                    : "bg-slate-300 dark:bg-slate-600",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    retryFailedDependencies ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Rerun Skipped Cases
                </label>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Replay skipped cases after their dependency is recovered.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRerunSkippedCases((prev) => !prev)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0",
                  rerunSkippedCases
                    ? "bg-primary dark:bg-indigo-500"
                    : "bg-slate-300 dark:bg-slate-600",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    rerunSkippedCases ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </div>

          {!activeSuiteId && testSuites.length === 0 && (
            <p className="text-sm text-on-surface-variant">
              {t("testRuns.modal.noSuitesWarning")}
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
