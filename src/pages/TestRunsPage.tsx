import React, { useRef, useState, useEffect } from "react";
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
import AutoAnalysisProgressPanel from "../components/test-runs/AutoAnalysisProgressPanel";
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
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";
import environmentService, {
  ExecutionEnvironment,
} from "../services/environmentService";
import testCaseService, { TestCase } from "../services/testCaseService";
import testRunService, {
  TestRunDetailResponse,
} from "../services/testRunService";
import { testSuiteService } from "../services/testSuiteService";
import { apiService } from "../services/apiService";
import ExpectedAuditPanel from "../components/test-runs/ExpectedAuditPanel";

export default function TestRunsPage() {
  const { t } = useTranslation();
  const breadcrumbs = useProjectBreadcrumbs(t("testRuns.title"));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id ?? "";
  const lastProjectIdRef = useRef<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeSuiteId, setActiveSuiteId] = useState<string>(
    () => searchParams.get("suiteId") || "",
  );
  const [activeSuiteName, setActiveSuiteName] = useState<string | undefined>(
    undefined,
  );

  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [expandedCaseByRunId, setExpandedCaseByRunId] = useState<
    Record<string, string | null>
  >({});

  const [runDetailsById, setRunDetailsById] = useState<
    Record<string, TestRunDetailResponse>
  >({});
  const [loadingRunDetailsById, setLoadingRunDetailsById] = useState<
    Record<string, boolean>
  >({});

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const { testSuites } = useTestSuites(projectId);
  const { testRuns, totalCount, isLoading, error, refetch } = useTestRuns(
    activeSuiteId || "",
    currentPage,
    pageSize,
    statusFilter,
  );

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));

  // ── Pending run (triggered when navigated from execute page) ─────────
  const [pendingRun, setPendingRun] = useState<{
    status: "running" | "done";
  } | null>(null);
  const pendingRunStarted = useRef(false);

  useEffect(() => {
    if (!projectId) {
      lastProjectIdRef.current = projectId || null;
      return;
    }

    if (lastProjectIdRef.current && lastProjectIdRef.current !== projectId) {
      navigate("/runs", { replace: true });
      setActiveSuiteId("");
      setExpandedRunId(null);
      setExpandedCaseByRunId({});
      setRunDetailsById({});
      setLoadingRunDetailsById({});
    }

    lastProjectIdRef.current = projectId;
  }, [projectId, navigate]);

  useEffect(() => {
    if (pendingRunStarted.current) return;
    const envId = searchParams.get("pendingEnvironmentId");
    const tcIds = searchParams.get("pendingTestCaseIds");
    const suiteForRun = searchParams.get("suiteId") || activeSuiteId;
    if (!envId || !suiteForRun) return;

    pendingRunStarted.current = true;

    // Remove pending params from URL so back-navigation won't re-trigger
    const next = new URLSearchParams(searchParams);
    next.delete("pendingEnvironmentId");
    next.delete("pendingTestCaseIds");
    navigate(`/runs?${next.toString()}`, { replace: true });

    if (suiteForRun !== activeSuiteId) setActiveSuiteId(suiteForRun);

    setPendingRun({ status: "running" });
    const ids = tcIds
      ? tcIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    testRunService
      .startTestRun({
        testSuiteId: suiteForRun,
        environmentId: envId,
        selectedTestCaseIds: ids?.length ? ids : undefined,
      })
      .then(() => {
        setPendingRun({ status: "done" });
        setCurrentPage(1);
        refetch();
        setTimeout(() => setPendingRun(null), 3000);
      })
      .catch((err) => {
        showErrorToast(handleError(err));
        setPendingRun(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeSuiteId && testSuites.length > 0) {
      setActiveSuiteId(testSuites[0].id);
    }
    const found = testSuites.find((s) => s.id === activeSuiteId);
    setActiveSuiteName(found?.name);
  }, [testSuites, activeSuiteId]);

  const formatDate = (dateString?: string) =>
    dateString ? new Date(dateString).toLocaleDateString() : "—";
  const formatDateTime = (dateString?: string) =>
    dateString ? new Date(dateString).toLocaleString() : "—";
  const formatDuration = (ms?: number) => {
    if (!ms) return "0ms";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "running":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "completed":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "failed":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
      case "cancelled":
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
      default:
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "running":
        return "bg-blue-500";
      case "completed":
        return "bg-emerald-500";
      case "failed":
        return "bg-rose-500";
      case "cancelled":
        return "bg-slate-500";
      default:
        return "bg-amber-500";
    }
  };

  const handleActiveSuiteChange = (id: string) => setActiveSuiteId(id);

  const loadRunDetails = async (runId: string, suiteId: string) => {
    setLoadingRunDetailsById((prev) => ({ ...prev, [runId]: true }));
    try {
      const detail = await testRunService.getTestRunResults(suiteId, runId);
      setRunDetailsById((prev) => ({ ...(prev || {}), [runId]: detail }));
    } catch (err) {
      showErrorToast(handleError(err));
    } finally {
      setLoadingRunDetailsById((prev) => ({ ...prev, [runId]: false }));
    }
  };

  // minimal autoAnalysisState placeholder used by UI
  const autoAnalysisState = {
    isRunning: false,
    suggestionsStatus: "idle",
    explanationsStatus: "idle",
  } as any;
  const cancelAutoAnalysis = () => {};
  const dismissAutoAnalysis = () => {};
  const retryAutoAnalysis = () => {};

  // --- Modal / start-run state (missing previously) ---
  const [environments, setEnvironments] = useState<ExecutionEnvironment[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState("");
  const [selectedTestSuiteId, setSelectedTestSuiteId] = useState<string>("");
  const [suiteTestCases, setSuiteTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<string[]>([]);
  const [isLoadingTestCases, setIsLoadingTestCases] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [strictValidation, setStrictValidation] = useState(false);
  const [maxRetryAttempts, setMaxRetryAttempts] = useState<number>(0);
  const [retryFailedDependencies, setRetryFailedDependencies] = useState(false);
  const [rerunSkippedCases, setRerunSkippedCases] = useState(false);

  const closeStartModal = () => setIsStartModalOpen(false);

  const getDefaultEnvironmentId = (items: ExecutionEnvironment[]) => {
    if (!items || items.length === 0) return "";
    const def = items.find((e) => e.isDefault);
    return def?.id || items[0].id;
  };

  // Load environments for the project (used by start-run modal)
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!projectId) return;
      try {
        const envs = await environmentService.getEnvironments(projectId);
        if (!mounted) return;
        setEnvironments(envs);
        setSelectedEnvironmentId(getDefaultEnvironmentId(envs));
      } catch (err) {
        showErrorToast(handleError(err));
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  // When a suite is selected in the modal, fetch its test cases
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedTestSuiteId) {
        setSuiteTestCases([]);
        return;
      }
      setIsLoadingTestCases(true);
      try {
        const resp = await testCaseService.getTestCases(
          selectedTestSuiteId,
          1,
          2000,
        );
        if (!mounted) return;
        setSuiteTestCases(resp.items || []);
        setSelectedTestCaseIds([]);
      } catch (err) {
        showErrorToast(handleError(err));
      } finally {
        setIsLoadingTestCases(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedTestSuiteId]);

  const handleToggleTestCase = (id: string) => {
    setSelectedTestCaseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSelectAllTestCases = () =>
    setSelectedTestCaseIds(suiteTestCases.map((c) => c.id));
  const handleClearSelectedTestCases = () => setSelectedTestCaseIds([]);

  const handleStartTestRun = async () => {
    if (!selectedTestSuiteId) return;
    setIsSubmitting(true);
    try {
      await testRunService.startTestRun({
        testSuiteId: selectedTestSuiteId,
        environmentId: selectedEnvironmentId || undefined,
        selectedTestCaseIds: selectedTestCaseIds.length
          ? selectedTestCaseIds
          : undefined,
        strictValidation: strictValidation,
        retryPolicy: {
          maxRetryAttempts: maxRetryAttempts,
          retryFailedDependencies: retryFailedDependencies,
          rerunSkippedCases: rerunSkippedCases,
        },
      });
      showSuccessToast(t("testRuns.startSuccess") || "Test run started");
      closeStartModal();
      refetch();
    } catch (err) {
      showErrorToast(handleError(err));
    } finally {
      setIsSubmitting(false);
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
            {[
              t("testRuns.filterAll"),
              t("testRuns.filterRunning"),
              t("testRuns.filterCompleted"),
              t("testRuns.filterFailed"),
            ].map((s, i) => {
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
                {pendingRun && (
                  <tr
                    className={cn(
                      "border-b-2 transition-colors",
                      pendingRun.status === "running"
                        ? "bg-indigo-50/60 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
                        : "bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
                    )}
                  >
                    <td colSpan={6} className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        {pendingRun.status === "running" ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                Running test cases...
                              </p>
                              <p className="text-xs text-indigo-500 dark:text-indigo-400">
                                Results will appear here when complete.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                              Test run completed! Results loaded below.
                            </p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
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
                              {run.testSuiteName
                                ? run.testSuiteName
                                : `Test Suite #${run.testSuiteId.substring(0, 8)}`}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-medium">
                              {run.environmentName
                                ? run.environmentName
                                : `Env #${(run.environmentId || "N/A").substring(0, 8)}`}
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
                                  handleOpenLlmSuggestions(
                                    run.testSuiteId,
                                    run.id,
                                  );
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
                                      {run.hasDetailedResults
                                        ? t("testRuns.yes")
                                        : t("testRuns.no")}
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
                                          const totalAttempts =
                                            testCase.totalAttempts ?? 1;
                                          const retryCount = totalAttempts - 1;
                                          const statusLower = (
                                            testCase.status || ""
                                          ).toLowerCase();
                                          let statusLabel = testCase.status;
                                          let statusColor =
                                            "text-on-surface-variant";
                                          if (statusLower === "passed") {
                                            statusColor =
                                              "text-emerald-600 dark:text-emerald-400";
                                            statusLabel =
                                              retryCount > 0
                                                ? `Passed (Retried ×${retryCount})`
                                                : "Passed";
                                          } else if (statusLower === "failed") {
                                            statusColor =
                                              "text-rose-600 dark:text-rose-400";
                                            statusLabel =
                                              retryCount > 0
                                                ? `Failed (after ${retryCount} retr${retryCount > 1 ? "ies" : "y"})`
                                                : "Failed";
                                          } else if (
                                            statusLower === "skipped"
                                          ) {
                                            statusColor =
                                              "text-amber-500 dark:text-amber-400";
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
                                                    {testCase.description && (
                                                      <p className="w-full text-xs text-on-surface-variant truncate">
                                                        {testCase.description}
                                                      </p>
                                                    )}
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
                                                    <span
                                                      className={`font-semibold ${statusColor}`}
                                                    >
                                                      {statusLabel}
                                                    </span>
                                                    <span className="text-on-surface-variant">
                                                      {" "}
                                                      •{" "}
                                                      {t(
                                                        "testRuns.detail.caseDuration",
                                                      )}{" "}
                                                      {formatDuration(
                                                        testCase.durationMs,
                                                      )}
                                                    </span>
                                                  </p>
                                                  {/* BC-1: skipped dependency info */}
                                                  {statusLower === "skipped" &&
                                                    testCase.skippedCause && (
                                                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                                        {testCase.skippedCause}
                                                      </p>
                                                    )}
                                                  {statusLower === "skipped" &&
                                                    testCase
                                                      .skippedBecauseDependencyIds
                                                      ?.length > 0 && (
                                                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                                        Depends on:{" "}
                                                        {testCase.skippedBecauseDependencyIds
                                                          .map((depId) => {
                                                            const depCase =
                                                              runDetailsById[
                                                                run.id
                                                              ]?.cases?.find(
                                                                (c) =>
                                                                  c.testCaseId ===
                                                                  depId,
                                                              );
                                                            return depCase
                                                              ? depCase.name
                                                              : depId.slice(
                                                                  0,
                                                                  8,
                                                                ) + "…";
                                                          })
                                                          .join(", ")}
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
                                                    ? t(
                                                        "testRuns.detail.hideDetail",
                                                      )
                                                    : t(
                                                        "testRuns.detail.viewDetail",
                                                      )}
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
                                                    {t(
                                                      "testRuns.detail.httpStatus",
                                                    )}{" "}
                                                    <span className="text-on-surface">
                                                      {testCase.httpStatusCode ??
                                                        t("testRuns.na")}
                                                    </span>
                                                    {testCase.expectedStatus && (
                                                      <span className="text-on-surface-variant">
                                                        {" "}
                                                        (expected:{" "}
                                                        {
                                                          testCase.expectedStatus
                                                        }
                                                        )
                                                      </span>
                                                    )}
                                                  </p>
                                                  <ExpectedAuditPanel
                                                    title="Expected audit"
                                                    compact
                                                    expectedStatus={testCase.expectedStatus}
                                                    bodyContains={testCase.expectedBodyContains}
                                                    bodyNotContains={testCase.expectedBodyNotContains}
                                                    jsonPathChecks={testCase.expectedJsonPathChecks}
                                                    headerChecks={testCase.expectedHeaderChecks}
                                                    maxResponseTime={testCase.expectedMaxResponseTime}
                                                    expectedProvenance={testCase.expectedProvenance}
                                                    expectationSource={testCase.expectationSource}
                                                    requirementCode={testCase.requirementCode}
                                                    actualStatusCode={testCase.httpStatusCode}
                                                    responseBodyPreview={testCase.responseBodyPreview}
                                                    responseHeaders={testCase.responseHeaders}
                                                  />
                                                  {/* Check results row — hide for skipped cases */}
                                                  {statusLower !== "skipped" &&
                                                    (testCase.checksPerformed !=
                                                      null ||
                                                      testCase.checksSkipped !=
                                                        null) && (
                                                      <p>
                                                        Checks:{" "}
                                                        <span className="text-on-surface">
                                                          {testCase.checksPerformed ??
                                                            0}{" "}
                                                          performed
                                                          {(testCase.checksSkipped ??
                                                            0) > 0 &&
                                                            `, ${testCase.checksSkipped} skipped`}
                                                        </span>
                                                      </p>
                                                    )}
                                                  {/* Individual check results — only show when HTTP was actually sent */}
                                                  {statusLower !== "skipped" &&
                                                    testCase.httpStatusCode !=
                                                      null &&
                                                    [
                                                      {
                                                        label: "Status code",
                                                        value:
                                                          testCase.statusCodeMatched,
                                                      },
                                                      {
                                                        label: "Schema",
                                                        value:
                                                          testCase.schemaMatched,
                                                      },
                                                      {
                                                        label: "Headers",
                                                        value:
                                                          testCase.headerChecksPassed,
                                                      },
                                                      {
                                                        label: "Body contains",
                                                        value:
                                                          testCase.bodyContainsPassed,
                                                      },
                                                      {
                                                        label:
                                                          "Body not contains",
                                                        value:
                                                          testCase.bodyNotContainsPassed,
                                                      },
                                                      {
                                                        label: "JSON path",
                                                        value:
                                                          testCase.jsonPathChecksPassed,
                                                      },
                                                      {
                                                        label: "Response time",
                                                        value:
                                                          testCase.responseTimePassed,
                                                      },
                                                    ].filter(
                                                      (c) => c.value != null,
                                                    ).length > 0 && (
                                                      <div className="flex flex-wrap gap-1">
                                                        {[
                                                          {
                                                            label:
                                                              "Status code",
                                                            value:
                                                              testCase.statusCodeMatched,
                                                          },
                                                          {
                                                            label: "Schema",
                                                            value:
                                                              testCase.schemaMatched,
                                                          },
                                                          {
                                                            label: "Headers",
                                                            value:
                                                              testCase.headerChecksPassed,
                                                          },
                                                          {
                                                            label:
                                                              "Body contains",
                                                            value:
                                                              testCase.bodyContainsPassed,
                                                          },
                                                          {
                                                            label:
                                                              "Body not contains",
                                                            value:
                                                              testCase.bodyNotContainsPassed,
                                                          },
                                                          {
                                                            label: "JSON path",
                                                            value:
                                                              testCase.jsonPathChecksPassed,
                                                          },
                                                          {
                                                            label:
                                                              "Response time",
                                                            value:
                                                              testCase.responseTimePassed,
                                                          },
                                                        ]
                                                          .filter(
                                                            (c) =>
                                                              c.value != null,
                                                          )
                                                          .map((c) => (
                                                            <span
                                                              key={c.label}
                                                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.value ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"}`}
                                                            >
                                                              {c.value
                                                                ? "✓"
                                                                : "✗"}{" "}
                                                              {c.label}
                                                            </span>
                                                          ))}
                                                      </div>
                                                    )}
                                                  {/* For failed cases with no HTTP (pre-request failure like UNRESOLVED_VARIABLE) */}
                                                  {statusLower === "failed" &&
                                                    testCase.httpStatusCode ==
                                                      null && (
                                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                                        ⚠ Request not sent —
                                                        pre-execution failure
                                                      </span>
                                                    )}
                                                  {/* Failure reasons */}
                                                  {testCase.failureReasons
                                                    ?.length > 0 && (
                                                    <div>
                                                      <p className="font-semibold text-rose-600 dark:text-rose-400 mb-1">
                                                        {t(
                                                          "testRuns.detail.failureReasons",
                                                        )}
                                                      </p>
                                                      {testCase.failureReasons.map(
                                                        (reason, index) => (
                                                          <p
                                                            key={`${testCase.testCaseId}-f${index}`}
                                                            className="ml-2"
                                                          >
                                                            <span className="font-mono text-rose-500 dark:text-rose-400">
                                                              {reason.code}
                                                            </span>
                                                            {reason.message
                                                              ? `: ${reason.message}`
                                                              : ""}
                                                            {reason.expected && (
                                                              <span className="text-on-surface-variant">
                                                                {" "}
                                                                (expected:{" "}
                                                                <span className="text-on-surface">
                                                                  {
                                                                    reason.expected
                                                                  }
                                                                </span>
                                                                , got:{" "}
                                                                <span className="text-on-surface">
                                                                  {
                                                                    reason.actual
                                                                  }
                                                                </span>
                                                                )
                                                              </span>
                                                            )}
                                                          </p>
                                                        ),
                                                      )}
                                                    </div>
                                                  )}
                                                  {/* Warnings */}
                                                  {testCase.warnings &&
                                                    testCase.warnings.length >
                                                      0 && (
                                                      <div>
                                                        <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                                                          Warnings
                                                        </p>
                                                        {testCase.warnings.map(
                                                          (w, index) => (
                                                            <p
                                                              key={`${testCase.testCaseId}-w${index}`}
                                                              className="ml-2"
                                                            >
                                                              <span className="font-mono text-yellow-500">
                                                                {w.code}
                                                              </span>
                                                              {w.message
                                                                ? `: ${w.message}`
                                                                : ""}
                                                            </p>
                                                          ),
                                                        )}
                                                      </div>
                                                    )}
                                                  {/* Extracted variables */}
                                                  {Object.keys(
                                                    testCase.extractedVariables ||
                                                      {},
                                                  ).length > 0 && (
                                                    <div>
                                                      <p className="font-semibold text-on-surface mb-1">
                                                        Extracted Variables
                                                      </p>
                                                      {Object.entries(
                                                        testCase.extractedVariables,
                                                      ).map(([k, v]) => (
                                                        <p
                                                          key={k}
                                                          className="ml-2 font-mono"
                                                        >
                                                          <span className="text-indigo-500 dark:text-indigo-400">
                                                            {k}
                                                          </span>
                                                          {" = "}
                                                          <span className="text-on-surface">
                                                            {v}
                                                          </span>
                                                        </p>
                                                      ))}
                                                    </div>
                                                  )}
                                                  {/* Response body preview */}
                                                  {/* Expected response (from test case expectation) */}
                                                  {testCase.expectedResponse !=
                                                    null && (
                                                    <div>
                                                      <p className="font-semibold text-on-surface">
                                                        Expected response
                                                      </p>
                                                      <pre className="mt-1 p-2 rounded bg-surface-container-high dark:bg-slate-800 text-on-surface overflow-x-auto whitespace-pre-wrap break-words">
                                                        {(() => {
                                                          try {
                                                            const er =
                                                              testCase.expectedResponse;
                                                            if (
                                                              typeof er ===
                                                              "string"
                                                            ) {
                                                              const t =
                                                                er.trim();
                                                              if (
                                                                t.startsWith(
                                                                  "{",
                                                                ) ||
                                                                t.startsWith(
                                                                  "[",
                                                                )
                                                              ) {
                                                                return JSON.stringify(
                                                                  JSON.parse(t),
                                                                  null,
                                                                  2,
                                                                );
                                                              }
                                                              return er;
                                                            }
                                                            return JSON.stringify(
                                                              er,
                                                              null,
                                                              2,
                                                            );
                                                          } catch {
                                                            return String(
                                                              testCase.expectedResponse,
                                                            );
                                                          }
                                                        })()}
                                                      </pre>
                                                    </div>
                                                  )}

                                                  {/* Response body preview */}
                                                  {testCase.responseBodyPreview && (
                                                    <div>
                                                      <p className="font-semibold text-on-surface">
                                                        {t(
                                                          "testRuns.detail.responsePreview",
                                                        )}
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
                                {runDetailsById[run.id]?.attempts &&
                                  runDetailsById[run.id].attempts!.length > 0 &&
                                  (() => {
                                    const attempts =
                                      runDetailsById[run.id].attempts!;
                                    const childrenMap =
                                      runDetailsById[run.id]
                                        .attemptChildrenMap || {};
                                    // Group attempts by testCaseId, show only cases with >1 attempt or retries
                                    const byCase = attempts.reduce<
                                      Record<string, typeof attempts>
                                    >((acc, a) => {
                                      if (!acc[a.testCaseId])
                                        acc[a.testCaseId] = [];
                                      acc[a.testCaseId].push(a);
                                      return acc;
                                    }, {});
                                    const casesWithRetries = Object.entries(
                                      byCase,
                                    ).filter(
                                      ([, atts]) =>
                                        atts.length > 1 ||
                                        atts.some((a) => a.retryReason),
                                    );
                                    if (casesWithRetries.length === 0)
                                      return null;
                                    return (
                                      <div className="mt-4 pt-4 border-t border-outline-variant/10 dark:border-slate-700">
                                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                                          Retry / Attempt Timeline
                                        </p>
                                        <div className="space-y-3">
                                          {casesWithRetries.map(
                                            ([caseId, atts]) => {
                                              const caseInfo = runDetailsById[
                                                run.id
                                              ].cases?.find(
                                                (c) => c.testCaseId === caseId,
                                              );
                                              const sorted = [...atts].sort(
                                                (a, b) =>
                                                  a.attemptNumber -
                                                  b.attemptNumber,
                                              );
                                              return (
                                                <div
                                                  key={caseId}
                                                  className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3"
                                                >
                                                  <p className="text-xs font-semibold text-on-surface mb-2">
                                                    {caseInfo?.name ||
                                                      caseId.slice(0, 8) + "…"}
                                                  </p>
                                                  <div className="flex flex-wrap gap-2">
                                                    {sorted.map((att, i) => {
                                                      const attStatusLower =
                                                        att.status.toLowerCase();
                                                      const dotColor =
                                                        attStatusLower ===
                                                        "passed"
                                                          ? "bg-emerald-500"
                                                          : attStatusLower ===
                                                              "failed"
                                                            ? "bg-rose-500"
                                                            : "bg-amber-400";
                                                      return (
                                                        <div
                                                          key={
                                                            att.executionAttemptId
                                                          }
                                                          className="flex items-center gap-1"
                                                        >
                                                          {i > 0 && (
                                                            <span className="text-on-surface-variant text-xs">
                                                              →
                                                            </span>
                                                          )}
                                                          <div className="flex flex-col items-center">
                                                            <div
                                                              className={`w-2.5 h-2.5 rounded-full ${dotColor}`}
                                                              title={att.status}
                                                            />
                                                            <span className="text-[9px] text-on-surface-variant mt-0.5">
                                                              #
                                                              {
                                                                att.attemptNumber
                                                              }
                                                            </span>
                                                            {att.isReplay && (
                                                              <span className="text-[9px] text-indigo-500 font-bold">
                                                                ↺
                                                              </span>
                                                            )}
                                                          </div>
                                                          <div className="text-[10px] text-on-surface-variant max-w-[120px]">
                                                            <span
                                                              className={`font-semibold ${attStatusLower === "passed" ? "text-emerald-600 dark:text-emerald-400" : attStatusLower === "failed" ? "text-rose-600 dark:text-rose-400" : "text-amber-500"}`}
                                                            >
                                                              {att.status}
                                                            </span>
                                                            {att.retryReason && (
                                                              <span
                                                                className="block text-[9px] italic truncate"
                                                                title={
                                                                  att.retryReason
                                                                }
                                                              >
                                                                {
                                                                  att.retryReason
                                                                }
                                                              </span>
                                                            )}
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              );
                                            },
                                          )}
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
              ? t("testRuns.modal.selectedCasesInfo", {
                  count: selectedTestCaseIds.length,
                })
              : t("testRuns.modal.allCasesInfo")}
          </p>

          {/* Strict Validation Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Strict Validation
              </label>
              <p className="text-xs text-on-surface-variant mt-0.5">
                When enabled, test cases without expectations will fail instead
                of warn.
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
