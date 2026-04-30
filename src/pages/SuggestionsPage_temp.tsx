import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import StepTransitionOverlay from "../components/ui/StepTransitionOverlay";
import { cn } from "../lib/utils";
import { useProject } from "../contexts/ProjectContext";
import { useTestSuites } from "../hooks/useTestSuites";
import { apiService } from "../services/apiService";
import testRunService, {
  TestRun,
  TestRunDetailResponse,
} from "../services/testRunService";
import {
  handleError,
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../utils/errorHandler";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";

interface FailureExplanationModel {
  testSuiteId: string;
  testRunId: string;
  testCaseId: string;
  endpointId?: string | null;
  summaryVi?: string;
  possibleCauses?: string[];
  suggestedNextActions?: string[];
  confidence?: string;
  source?: string;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  latencyMs?: number;
  generatedAt?: string;
  failureCodes?: string[];
}

export default function SuggestionsPage() {
  const { t } = useTranslation();
  const breadcrumbs = useProjectBreadcrumbs(t("suggestions.title"));
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedProject } = useProject();

  const suiteIdFromQuery = searchParams.get("suiteId") || "";
  const runIdFromQuery = searchParams.get("runId") || "";
  const selectedProjectId = selectedProject?.id || "";

  const [selectedSuiteId, setSelectedSuiteId] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [runDetail, setRunDetail] = useState<TestRunDetailResponse | null>(
    null,
  );
  const [runDetailsUnavailable, setRunDetailsUnavailable] = useState(false);
  const [explanationsByCaseId, setExplanationsByCaseId] = useState<
    Record<string, FailureExplanationModel | null>
  >({});
  const [loadingExplanationByCaseId, setLoadingExplanationByCaseId] = useState<
    Record<string, boolean>
  >({});
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTestType, setFilterTestType] = useState("");
  const [filterEndpoint, setFilterEndpoint] = useState("");

  const { testSuites, isLoading: isLoadingSuites } =
    useTestSuites(selectedProjectId);

  useEffect(() => {
    if (!testSuites.length) {
      setSelectedSuiteId("");
      return;
    }

    if (
      suiteIdFromQuery &&
      testSuites.some((suite) => suite.id === suiteIdFromQuery)
    ) {
      setSelectedSuiteId(suiteIdFromQuery);
      return;
    }

    if (
      !selectedSuiteId ||
      !testSuites.some((suite) => suite.id === selectedSuiteId)
    ) {
      setSelectedSuiteId(testSuites[0].id);
    }
  }, [suiteIdFromQuery, selectedSuiteId, testSuites]);

  const selectedSuite = useMemo(
    () => testSuites.find((suite) => suite.id === selectedSuiteId),
    [selectedSuiteId, testSuites],
  );

  const syncQuery = (projectId: string, suiteId: string) => {
    const next = new URLSearchParams();
    if (projectId) {
      next.set("projectId", projectId);
    }
    if (suiteId) {
      next.set("suiteId", suiteId);
    }
    setSearchParams(next, { replace: true });
  };

  const fetchRuns = async (suiteId: string, preferRunId?: string) => {
    if (!suiteId) {
      setRuns([]);
      setSelectedRunId("");
      return;
    }

    try {
      setIsLoadingRuns(true);
      const response = await testRunService.getTestRunsByTestSuite(
        suiteId,
        1,
        50,
      );
      const items = response.items || [];
      setRuns(items);

      if (items.length > 0) {
        // Ưu tiên: 1) preferRunId (từ URL), 2) state hiện tại, 3) localStorage, 4) run mới nhất
        const storedRunId =
          localStorage.getItem(`suggestions_runId:${suiteId}`) || "";
        const currentRunId = preferRunId || storedRunId;
        const preferredRun = items.some((run) => run.id === currentRunId)
          ? currentRunId
          : items[0].id;
        setSelectedRunId(preferredRun);
        localStorage.setItem(`suggestions_runId:${suiteId}`, preferredRun);
      } else {
        setSelectedRunId("");
      }
    } catch (err) {
      setRuns([]);
      setSelectedRunId("");
      handleError(err);
    } finally {
      setIsLoadingRuns(false);
    }
  };

  const fetchRunDetail = async (suiteId: string, runId: string) => {
    if (!suiteId || !runId) {
      setRunDetail(null);
      setRunDetailsUnavailable(false);
      return;
    }

    try {
      setIsLoadingDetail(true);
      let detail: TestRunDetailResponse | null = null;
      // Backend can return resultsSource=unavailable briefly before cache is populated.
      for (let attempt = 0; attempt < 4; attempt++) {
        detail = await testRunService.getTestRunResults(suiteId, runId);
        const unavailable =
          (detail?.resultsSource || "").toLowerCase() === "unavailable";
        const hasCases =
          Array.isArray(detail?.cases) && detail.cases.length > 0;

        if (!unavailable || hasCases) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setRunDetail(detail);
      setRunDetailsUnavailable(
        (detail?.resultsSource || "").toLowerCase() === "unavailable" &&
          (detail?.cases?.length || 0) === 0,
      );
      setExplanationsByCaseId({});
    } catch (err) {
      setRunDetail(null);
      setRunDetailsUnavailable(false);
      handleError(err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!selectedProjectId || !selectedSuiteId) {
      return;
    }

    syncQuery(selectedProjectId, selectedSuiteId);
    fetchRuns(selectedSuiteId, runIdFromQuery || undefined);
  }, [selectedProjectId, selectedSuiteId]);

  useEffect(() => {
    if (!selectedSuiteId || !selectedRunId) {
      return;
    }

    fetchRunDetail(selectedSuiteId, selectedRunId);
  }, [selectedSuiteId, selectedRunId]);

  const getExplanation = async (testCaseId: string) => {
    if (!selectedSuiteId || !selectedRunId) {
      return;
    }

    try {
      setLoadingExplanationByCaseId((prev) => ({
        ...prev,
        [testCaseId]: true,
      }));
      const data = await apiService.get<FailureExplanationModel>(
        `/test-suites/${selectedSuiteId}/test-runs/${selectedRunId}/failures/${testCaseId}/explanation`,
      );
      setExplanationsByCaseId((prev) => ({
        ...prev,
        [testCaseId]: data || null,
      }));
    } catch {
      setExplanationsByCaseId((prev) => ({ ...prev, [testCaseId]: null }));
    } finally {
      setLoadingExplanationByCaseId((prev) => ({
        ...prev,
        [testCaseId]: false,
      }));
    }
  };

  const normalizeStatus = (status?: string) =>
    String(status || "")
      .trim()
      .toLowerCase();

  const failedCaseIds = new Set(
    (runDetail?.cases || [])
      .filter((testCase) => normalizeStatus(testCase.status) === "failed")
      .map((testCase) => testCase.testCaseId),
  );

  const generateExplanation = async (
    testCaseId: string,
    options?: { suppressToast?: boolean },
  ): Promise<boolean> => {
    if (!selectedSuiteId || !selectedRunId) {
      return;
    }

    if (!failedCaseIds.has(testCaseId)) {
      if (!options?.suppressToast) {
        showInfoToast("Chi tao giai thich cho test case FAILED.");
      }
      return false;
    }

    try {
      setLoadingExplanationByCaseId((prev) => ({
        ...prev,
        [testCaseId]: true,
      }));
      const data = await apiService.post<FailureExplanationModel>(
        `/test-suites/${selectedSuiteId}/test-runs/${selectedRunId}/failures/${testCaseId}/explanation`,
      );
      setExplanationsByCaseId((prev) => ({
        ...prev,
        [testCaseId]: data || null,
      }));
      if (!options?.suppressToast) {
        showSuccessToast(t("suggestions.toast.explanationGenerated"));
      }
      return true;
    } catch (err) {
      if (!options?.suppressToast) {
        handleError(err);
      }
      return false;
    } finally {
      setLoadingExplanationByCaseId((prev) => ({
        ...prev,
        [testCaseId]: false,
      }));
    }
  };

  const failedCases = (runDetail?.cases || []).filter(
    (testCase) => normalizeStatus(testCase.status) === "failed",
  );

  // Unique filter options from current run
  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const c of runDetail?.cases || []) {
      if (c.status) set.add(c.status);
    }
    return Array.from(set).sort();
  }, [runDetail]);

  const uniqueTestTypes = useMemo(() => {
    const set = new Set<string>();
    for (const c of runDetail?.cases || []) {
      if (c.testType) set.add(c.testType);
    }
    return Array.from(set).sort();
  }, [runDetail]);

  const uniqueEndpoints = useMemo(() => {
    const set = new Set<string>();
    for (const c of runDetail?.cases || []) {
      const url = c.resolvedUrl || "";
      let path = url;
      try {
        path = new URL(url).pathname;
      } catch {
        /* keep as-is */
      }
      const ep = c.httpMethod ? `${c.httpMethod} ${path}` : path;
      if (ep.trim()) set.add(ep);
    }
    return Array.from(set).sort();
  }, [runDetail]);

  const filteredCases = useMemo(() => {
    let result = runDetail?.cases || [];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.resolvedUrl || "").toLowerCase().includes(q),
      );
    }

    if (filterStatus) {
      result = result.filter((c) => c.status === filterStatus);
    }

    if (filterTestType) {
      result = result.filter((c) => c.testType === filterTestType);
    }

    if (filterEndpoint) {
      result = result.filter((c) => {
        const url = c.resolvedUrl || "";
        let path = url;
        try {
          path = new URL(url).pathname;
        } catch {
          /* keep as-is */
        }
        const ep = c.httpMethod ? `${c.httpMethod} ${path}` : path;
        return ep === filterEndpoint;
      });
    }

    return result;
  }, [runDetail, searchQuery, filterStatus, filterTestType, filterEndpoint]);

  const getCheckStateClass = (value?: boolean) => {
    if (value === true) {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    }
    if (value === false) {
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
    }
    return "bg-surface-container-high dark:bg-slate-800 text-on-surface-variant";
  };

  const getCheckStateLabel = (value?: boolean) => {
    if (value === true) {
      return t("suggestions.checkPassed");
    }
    if (value === false) {
      return t("suggestions.checkFailed");
    }
    return t("suggestions.checkNotAvailable");
  };

  const getExecutionModeLabel = (testType?: string) => {
    const key = String(testType || "")
      .trim()
      .toLowerCase();
    if (key === "happypath" || key === "happy_path" || key === "happy-path") {
      return t("suggestions.modeHappyPath");
    }
    if (key === "boundary") {
      return t("suggestions.modeBoundary");
    }
    if (key === "negative") {
      return t("suggestions.modeNegative");
    }
    return t("suggestions.modeUnknown");
  };

  const generateAllFailed = async () => {
    if (failedCases.length === 0) {
      showErrorToast(t("suggestions.toast.noFailed"));
      return;
    }

    try {
      setIsGeneratingAll(true);
      let succeeded = 0;
      let failed = 0;

      for (const failedCase of failedCases) {
        const ok = await generateExplanation(failedCase.testCaseId, {
          suppressToast: true,
        });
        if (ok) {
          succeeded += 1;
        } else {
          failed += 1;
        }
      }

      if (failed === 0) {
        showSuccessToast(t("suggestions.toast.allGenerated"));
      } else if (succeeded === 0) {
        showErrorToast(`Failure Explanations: All ${failed} requests failed`);
      } else {
        showErrorToast(
          `Failure Explanations: ${succeeded} succeeded, ${failed} failed`,
        );
      }
    } finally {
      setIsGeneratingAll(false);
    }
  };

  return (
    <MainLayout title={t("suggestions.pageTitle")} breadcrumbs={breadcrumbs}>
      <StepTransitionOverlay
        isVisible={isGeneratingAll}
        title={t("overlay.suggestions.generatingTitle")}
        message={t("overlay.suggestions.generatingMessage")}
        stepLabel={t("overlay.suggestions.generatingStep")}
      />
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mt-10 mb-2">
              {t("suggestions.title")}
            </h1>
            <p className="text-on-surface-variant max-w-3xl">
              {t("suggestions.subtitle")}
            </p>
          </div>
          <button
            onClick={() =>
              navigate(
                `/runs${selectedProjectId ? `?projectId=${selectedProjectId}` : ""}`,
              )
            }
            className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-secondary-container dark:text-slate-200 font-semibold hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            {t("suggestions.backToRuns")}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              {t("suggestions.suiteLabel")}
            </label>
            <select
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
              disabled={!selectedProjectId || isLoadingSuites}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/10 dark:border-slate-700 text-on-surface disabled:opacity-60"
            >
              <option value="">{t("suggestions.suitePlaceholder")}</option>
              {testSuites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              {t("suggestions.runLabel")}
            </label>
            <select
              value={selectedRunId}
              onChange={(e) => {
                setSelectedRunId(e.target.value);
                if (selectedSuiteId && e.target.value) {
                  localStorage.setItem(
                    `suggestions_runId:${selectedSuiteId}`,
                    e.target.value,
                  );
                }
              }}
              disabled={!selectedSuiteId || isLoadingRuns}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/10 dark:border-slate-700 text-on-surface disabled:opacity-60"
            >
              <option value="">{t("suggestions.runPlaceholder")}</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  #{run.runNumber || "-"} - {run.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!selectedProjectId && (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant">
            {t("suggestions.selectProject")}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={generateAllFailed}
            disabled={
              !selectedRunId || isGeneratingAll || failedCases.length === 0
            }
            className="px-5 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-semibold flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isGeneratingAll ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {t("suggestions.generateAll")}
          </button>

          <button
            onClick={() => {
              fetchRuns(selectedSuiteId);
              if (selectedSuiteId && selectedRunId) {
                fetchRunDetail(selectedSuiteId, selectedRunId);
              }
            }}
            disabled={!selectedSuiteId || isLoadingRuns || isLoadingDetail}
            className="px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-surface font-semibold flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isLoadingRuns || isLoadingDetail ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {t("suggestions.refresh")}
          </button>

          {selectedSuite && (
            <span className="text-sm text-on-surface-variant">
              {t("suggestions.suiteLabel")}:{" "}
              <span className="font-semibold text-on-surface">
                {selectedSuite.name}
              </span>
            </span>
          )}
        </div>

        {!selectedSuiteId && (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant">
            {t("suggestions.selectSuite")}
          </div>
        )}

        {selectedSuiteId && isLoadingRuns && (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            {t("suggestions.loadingRuns")}
          </div>
        )}

        {selectedSuiteId && !isLoadingRuns && runs.length === 0 && (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-on-surface font-semibold">
                  {t("suggestions.noRuns")}
                </p>
                <p className="text-sm text-on-surface-variant mt-1">
                  {t("suggestions.noRunsDesc")}
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedRunId && isLoadingDetail && (
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800 text-on-surface-variant flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            {t("suggestions.loadingDetail")}
          </div>
        )}

        {selectedRunId && !isLoadingDetail && runDetail && (
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">
              {t("suggestions.runDetails", { count: runDetail.cases.length })}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800">
                <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                  {t("suggestions.runExecutedAt")}
                </p>
                <p className="mt-1 text-sm font-semibold text-on-surface break-all">
                  {runDetail.executedAt
                    ? new Date(runDetail.executedAt).toLocaleString()
                    : t("suggestions.none")}
                </p>
              </div>
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800">
                <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                  {t("suggestions.runEnvironment")}
                </p>
                <p className="mt-1 text-sm font-semibold text-on-surface break-all">
                  {runDetail.resolvedEnvironmentName || t("suggestions.none")}
                </p>
              </div>
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800">
                <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                  {t("suggestions.runSource")}
                </p>
                <p className="mt-1 text-sm font-semibold text-on-surface break-all">
                  {runDetail.resultsSource || t("suggestions.none")}
                </p>
              </div>
            </div>

            {runDetailsUnavailable && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
                {t("suggestions.cacheUnavailable")}
              </div>
            )}

            {/* Filter Bar */}
            <div className="bg-surface-container-lowest dark:bg-slate-900/90 p-4 rounded-2xl border border-outline-variant/10 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
                <span className="text-xs font-black text-cyan-700 dark:text-cyan-200 uppercase tracking-widest">
                  Test Case Filters
                </span>
                {(searchQuery ||
                  filterStatus ||
                  filterTestType ||
                  filterEndpoint) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterStatus("");
                      setFilterTestType("");
                      setFilterEndpoint("");
                    }}
                    className="ml-auto text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by test case name or URL..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all placeholder:text-on-surface-variant/60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
                >
                  <option value="">All statuses</option>
                  {uniqueStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={filterTestType}
                  onChange={(e) => setFilterTestType(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
                >
                  <option value="">All test types</option>
                  {uniqueTestTypes.map((tt) => (
                    <option key={tt} value={tt}>
                      {tt}
                    </option>
                  ))}
                </select>

                <select
                  value={filterEndpoint}
                  onChange={(e) => setFilterEndpoint(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
                >
                  <option value="">All endpoints</option>
                  {uniqueEndpoints.map((ep) => (
                    <option key={ep} value={ep}>
                      {ep}
                    </option>
                  ))}
                </select>
              </div>

              {(searchQuery ||
                filterStatus ||
                filterTestType ||
                filterEndpoint) && (
                <p className="text-xs text-on-surface-variant mt-2">
                  Showing {filteredCases.length} of{" "}
                  {runDetail?.cases?.length || 0} test cases
                </p>
              )}
            </div>

            {filteredCases.map((testCase) => {
              const explanation = explanationsByCaseId[testCase.testCaseId];
              const loadingExplanation =
                !!loadingExplanationByCaseId[testCase.testCaseId];
              const isFailed = normalizeStatus(testCase.status) === "failed";

              return (
                <div
                  key={testCase.testCaseId}
                  className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl border border-outline-variant/10 dark:border-slate-800"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary">
                      {testCase.status || "Unknown"}
                    </span>
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface-container-high dark:bg-slate-800 text-on-surface-variant">
                      {testCase.testType || t("suggestions.none")}
                    </span>
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface-container-high dark:bg-slate-800 text-on-surface-variant">
                      HTTP: {testCase.httpStatusCode ?? "N/A"}
                    </span>
                  </div>

                  <p className="text-lg font-bold text-on-surface">
                    {testCase.name}
                  </p>
                  <p className="text-on-surface-variant mt-1">
                    {testCase.resolvedUrl || t("suggestions.noUrl")}
                  </p>

                  <details className="mt-4 rounded-xl border border-outline-variant/10 dark:border-slate-700 bg-surface-container-low dark:bg-slate-800/70">
                    <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-on-surface">
                      {t("suggestions.executionDetails")}
                    </summary>
                    <div className="px-4 pb-4 pt-1 space-y-4 text-sm">
                      <div className="rounded-lg px-3 py-2 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                        <span className="font-semibold">
                          {t("suggestions.executionMode")}:
                        </span>{" "}
                        {getExecutionModeLabel(testCase.testType)}
                      </div>

                      {/* ── Expected vs Actual (2-Column Layout) ── */}
                      {(() => {
                        const isSkipped =
                          (testCase.status || "").toLowerCase() === "skipped";
                        const neverSentRequest =
                          isSkipped || testCase.httpStatusCode == null;

                        // Parse helper
                        const parseJson = <T,>(raw?: string): T | null => {
                          if (!raw) return null;
                          try {
                            return JSON.parse(raw) as T;
                          } catch {
                            return null;
                          }
                        };

                        const bodyContainsList = parseJson<string[]>(
                          testCase.expectedBodyContains,
