import React, { useEffect, useMemo, useRef, useState } from "react";
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
import ExpectedAuditPanel from "../components/test-runs/ExpectedAuditPanel";

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
  const lastProjectIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!selectedProjectId) {
      lastProjectIdRef.current = selectedProjectId || null;
      return;
    }

    if (
      lastProjectIdRef.current &&
      lastProjectIdRef.current !== selectedProjectId
    ) {
      navigate("/suggestions", { replace: true });
      setSelectedSuiteId("");
      setSelectedRunId("");
      setRuns([]);
      setRunDetail(null);
      setRunDetailsUnavailable(false);
      setExplanationsByCaseId({});
      setLoadingExplanationByCaseId({});
    }

    lastProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId, navigate]);

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
                  {t("pages.SuggestionsPage.test_case_filters")}
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
                    {t("pages.SuggestionsPage.clear_filters")}
                  </button>
                )}
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("pages.SuggestionsPage.search_placeholder")}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 focus:border-primary dark:focus:border-indigo-500 transition-all placeholder:text-on-surface-variant/60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface border border-outline-variant/20 dark:border-slate-600"
                >
                  <option value="">
                    {t("pages.SuggestionsPage.all_statuses")}
                  </option>
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
                  <option value="">
                    {t("pages.SuggestionsPage.all_test_types")}
                  </option>
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
                  <option value="">
                    {t("pages.SuggestionsPage.all_endpoints")}
                  </option>
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
                  {testCase.description && (
                    <p className="text-sm text-on-surface-variant mt-0.5">
                      {testCase.description}
                    </p>
                  )}
                  <p className="text-sm text-primary/80 dark:text-indigo-400 mt-1">
                    {testCase.resolvedUrl || t("suggestions.noUrl")}
                  </p>

                  <details className="mt-4 rounded-xl border border-outline-variant/10 dark:border-slate-700 bg-surface-container-low dark:bg-slate-800/70">
                    <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-on-surface">
                      {t("suggestions.executionDetails")}
                    </summary>
                    <div className="px-4 pb-4 pt-1 space-y-6 text-sm">
                      {/* 1. REQUEST INPUT */}
                      <div className="rounded-xl border border-outline-variant/20 dark:border-slate-600 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-slate-800 dark:to-slate-700 border-b border-outline-variant/10 dark:border-slate-600">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-900 dark:text-cyan-200 flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Request Input
                          </h3>
                          <p className="mt-1 text-[11px] text-cyan-700 dark:text-cyan-300">
                            Runtime resolved request (variables + environment auth applied), not raw n8n template.
                          </p>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-900/50">
                          <div className="space-y-3">
                            {/* Request Method & URL */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3">
                                <div className="text-[10px] text-on-surface-variant mb-1 uppercase font-semibold">
                                  Method
                                </div>
                                <div className="font-mono text-cyan-700 dark:text-cyan-300 font-bold text-sm">
                                  {testCase.httpMethod || "GET"}
                                </div>
                              </div>
                              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 md:col-span-3">
                                <div className="text-[10px] text-on-surface-variant mb-1 uppercase font-semibold">
                                  URL
                                </div>
                                <div className="font-mono text-cyan-700 dark:text-cyan-300 text-xs break-all">
                                  {testCase.resolvedUrl ||
                                    t("suggestions.noUrl")}
                                </div>
                              </div>
                            </div>

                            {/* Request Headers */}
                            {Object.keys(testCase.requestHeaders || {}).length >
                              0 && (
                              <div>
                                <div className="text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-wider">
                                  Headers
                                </div>
                                <pre className="rounded-lg p-3 bg-surface-container-high dark:bg-slate-800 text-[11px] text-on-surface overflow-x-auto whitespace-pre-wrap break-words max-h-32">
                                  {JSON.stringify(
                                    testCase.requestHeaders,
                                    null,
                                    2,
                                  )}
                                </pre>
                              </div>
                            )}

                            {/* Request Body */}
                            {testCase.requestBody && (
                              <div>
                                <div className="text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-wider">
                                  Body
                                </div>
                                <pre className="rounded-lg p-3 bg-surface-container-high dark:bg-slate-800 text-[11px] text-on-surface overflow-x-auto whitespace-pre-wrap break-words max-h-32">
                                  {testCase.requestBody}
                                </pre>
                              </div>
                            )}

                            {/* Query Parameters */}
                            {Object.keys(testCase.queryParams || {}).length >
                              0 && (
                              <div>
                                <div className="text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-wider">
                                  Query Parameters
                                </div>
                                <pre className="rounded-lg p-3 bg-surface-container-high dark:bg-slate-800 text-[11px] text-on-surface overflow-x-auto whitespace-pre-wrap break-words">
                                  {JSON.stringify(
                                    testCase.queryParams,
                                    null,
                                    2,
                                  )}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2. EXPECTED VS ACTUAL RESPONSE */}
                      {(() => {
                        const isSkipped =
                          (testCase.status || "").toLowerCase() === "skipped";
                        const neverSentRequest =
                          isSkipped || testCase.httpStatusCode == null;

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
                        );
                        const bodyNotContainsList = parseJson<string[]>(
                          testCase.expectedBodyNotContains,
                        );
                        const jsonPathMap = parseJson<Record<string, string>>(
                          testCase.expectedJsonPathChecks,
                        );
                        const maxRespTime = testCase.expectedMaxResponseTime;

                        return (
                          <div className="rounded-xl border border-outline-variant/20 dark:border-slate-600 overflow-hidden shadow-sm">
                            <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 border-b border-outline-variant/10 dark:border-slate-600">
                              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Response: Expected vs Actual
                              </h3>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-900/50 space-y-4 text-xs">
                              {isSkipped ? (
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                    ⏭ SKIPPED — no HTTP request sent
                                  </span>
                                  {testCase.skippedCause && (
                                    <span className="text-amber-600 dark:text-amber-400 break-all">
                                      {testCase.skippedCause}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {/* 2-Column Layout: Expected vs Actual */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* LEFT COLUMN: Expected */}
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 pb-2 border-b-2 border-emerald-200 dark:border-emerald-800">
                                        <svg
                                          className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                          />
                                        </svg>
                                        <span className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                          Expected
                                        </span>
                                      </div>

                                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                                        <div className="text-[10px] text-on-surface-variant mb-1">
                                          HTTP Status
                                        </div>
                                        <div className="font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                                          {testCase.expectedStatus || "—"}
                                        </div>
                                      </div>

                                      <ExpectedAuditPanel
                                        title="Expected audit"
                                        compact
                                        expectedStatus={testCase.expectedStatus}
                                        bodyContains={
                                          testCase.expectedBodyContains
                                        }
                                        bodyNotContains={
                                          testCase.expectedBodyNotContains
                                        }
                                        jsonPathChecks={
                                          testCase.expectedJsonPathChecks
                                        }
                                        headerChecks={
                                          testCase.expectedHeaderChecks
                                        }
                                        maxResponseTime={
                                          testCase.expectedMaxResponseTime
                                        }
                                        expectedProvenance={
                                          testCase.expectedProvenance
                                        }
                                        expectationSource={
                                          testCase.expectationSource
                                        }
                                        requirementCode={
                                          testCase.requirementCode
                                        }
                                        actualStatusCode={
                                          testCase.httpStatusCode
                                        }
                                        responseBodyPreview={
                                          testCase.responseBodyPreview
                                        }
                                        responseHeaders={
                                          testCase.responseHeaders
                                        }
                                      />

                                      {testCase.schemaMatched != null && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                                          <div className="text-[10px] text-on-surface-variant">
                                            Schema Validation
                                          </div>
                                          <div className="text-[10px] italic text-emerald-600 dark:text-emerald-400">
                                            Required
                                          </div>
                                        </div>
                                      )}

                                      {bodyContainsList &&
                                        bodyContainsList.length > 0 && (
                                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                                            <div className="text-[10px] text-on-surface-variant mb-1">
                                              Body Must Contain
                                            </div>
                                            <div className="space-y-1">
                                              {bodyContainsList.map((s, i) => (
                                                <div
                                                  key={i}
                                                  className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300 break-all"
                                                >
                                                  &quot;{s}&quot;
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                      {bodyNotContainsList &&
                                        bodyNotContainsList.length > 0 && (
                                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                                            <div className="text-[10px] text-on-surface-variant mb-1">
                                              Body Must NOT Contain
                                            </div>
                                            <div className="space-y-1">
                                              {bodyNotContainsList.map(
                                                (s, i) => (
                                                  <div
                                                    key={i}
                                                    className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300 break-all"
                                                  >
                                                    &quot;{s}&quot;
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {jsonPathMap &&
                                        Object.keys(jsonPathMap).length > 0 && (
                                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                                            <div className="text-[10px] text-on-surface-variant mb-1">
                                              JSON Path Checks
                                            </div>
                                            <div className="space-y-1">
                                              {Object.entries(jsonPathMap).map(
                                                ([path, expected]) => (
                                                  <div
                                                    key={path}
                                                    className="text-[10px]"
                                                  >
                                                    <span className="font-mono text-cyan-700 dark:text-cyan-300">
                                                      {path}
                                                    </span>
                                                    <span className="text-on-surface-variant">
                                                      {" "}
                                                      ={" "}
                                                    </span>
                                                    <span className="font-mono text-emerald-700 dark:text-emerald-300 break-all">
                                                      {!expected
                                                        ? "*"
                                                        : expected.length > 60
                                                          ? expected.slice(
                                                              0,
                                                              32,
                                                            ) +
                                                            "…" +
                                                            expected.slice(-16)
                                                          : expected}
                                                    </span>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {maxRespTime != null && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                                          <div className="text-[10px] text-on-surface-variant mb-1">
                                            Max Response Time
                                          </div>
                                          <div className="font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                                            {maxRespTime}ms
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* RIGHT COLUMN: Actual */}
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 pb-2 border-b-2 border-blue-200 dark:border-blue-800">
                                        <svg
                                          className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                        <span className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                          Actual
                                        </span>
                                      </div>

                                      <div
                                        className={`rounded-lg p-2 ${testCase.statusCodeMatched === true ? "bg-emerald-50 dark:bg-emerald-900/20" : neverSentRequest ? "bg-amber-50 dark:bg-amber-900/20" : "bg-rose-50 dark:bg-rose-900/20"}`}
                                      >
                                        <div className="text-[10px] text-on-surface-variant mb-1">
                                          HTTP Status
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`font-mono font-semibold ${testCase.statusCodeMatched === true ? "text-emerald-700 dark:text-emerald-300" : neverSentRequest ? "text-amber-700 dark:text-amber-300" : "text-rose-700 dark:text-rose-300"}`}
                                          >
                                            {testCase.httpStatusCode ??
                                              "(no response)"}
                                          </span>
                                          <span
                                            className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${testCase.statusCodeMatched === true ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : neverSentRequest ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"}`}
                                          >
                                            {testCase.statusCodeMatched === true
                                              ? "✓ PASS"
                                              : neverSentRequest
                                                ? "⚠ NO RESP"
                                                : "✗ FAIL"}
                                          </span>
                                        </div>
                                      </div>

                                      {testCase.schemaMatched != null && (
                                        <div
                                          className={`rounded-lg p-2 ${testCase.schemaMatched ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-rose-50 dark:bg-rose-900/20"}`}
                                        >
                                          <div className="text-[10px] text-on-surface-variant mb-1">
                                            Schema Validation
                                          </div>
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${testCase.schemaMatched ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"}`}
                                          >
                                            {testCase.schemaMatched
                                              ? "✓ PASS"
                                              : "✗ FAIL"}
                                          </span>
                                        </div>
                                      )}

                                      {bodyContainsList &&
                                        bodyContainsList.length > 0 && (
                                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                                            <div className="text-[10px] text-on-surface-variant mb-1">
                                              Body Contains Results
                                            </div>
                                            <div className="space-y-1">
                                              {bodyContainsList.map((s, i) => {
                                                const inBody =
                                                  testCase.responseBodyPreview?.includes(
                                                    s,
                                                  );
                                                const failedForThis =
                                                  testCase.failureReasons?.some(
                                                    (r) =>
                                                      r.code ===
                                                        "BODY_CONTAINS_MISSING" &&
                                                      r.expected === s,
                                                  );
                                                const pass =
                                                  inBody === true &&
                                                  !failedForThis;
                                                return (
                                                  <div
                                                    key={i}
                                                    className="flex items-center gap-2"
                                                  >
                                                    <span className="font-mono text-[10px] text-blue-700 dark:text-blue-300 break-all flex-1">
                                                      &quot;{s}&quot;
                                                    </span>
                                                    <span
                                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pass ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"}`}
                                                    >
                                                      {pass
                                                        ? "✓ found"
                                                        : "✗ missing"}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}

                                      {bodyNotContainsList &&
                                        bodyNotContainsList.length > 0 && (
                                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                                            <div className="text-[10px] text-on-surface-variant mb-1">
                                              Body Not Contains Results
                                            </div>
                                            <div className="space-y-1">
                                              {bodyNotContainsList.map(
                                                (s, i) => {
                                                  const inBody =
                                                    testCase.responseBodyPreview?.includes(
                                                      s,
                                                    );
                                                  const pass = !inBody;
                                                  return (
                                                    <div
                                                      key={i}
                                                      className="flex items-center gap-2"
                                                    >
                                                      <span className="font-mono text-[10px] text-blue-700 dark:text-blue-300 break-all flex-1">
                                                        &quot;{s}&quot;
                                                      </span>
                                                      <span
                                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pass ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"}`}
                                                      >
                                                        {pass
                                                          ? "✓ absent"
                                                          : "✗ present"}
                                                      </span>
                                                    </div>
                                                  );
                                                },
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {jsonPathMap &&
                                        Object.keys(jsonPathMap).length > 0 && (
                                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                                            <div className="text-[10px] text-on-surface-variant mb-1">
                                              JSON Path Results
                                            </div>
                                            <div className="space-y-1">
                                              {Object.entries(jsonPathMap).map(
                                                ([path, expected]) => {
                                                  const failureForPath =
                                                    testCase.failureReasons?.find(
                                                      (r) =>
                                                        r.target === path &&
                                                        r.code?.startsWith(
                                                          "JSONPATH",
                                                        ),
                                                    );
                                                  // A path passes when there is no specific failure for it.
                                                  // Do NOT use jsonPathChecksPassed here — that flag reflects
                                                  // whether ALL paths passed; using it would incorrectly mark
                                                  // individually-passing paths as X when any sibling fails.
                                                  const pass = !failureForPath;
                                                  return (
                                                    <div
                                                      key={path}
                                                      className="flex items-center gap-2"
                                                    >
                                                      <div className="text-[10px] flex-1 min-w-0">
                                                        <span className="font-mono text-cyan-700 dark:text-cyan-300">
                                                          {path}
                                                        </span>
                                                        {failureForPath?.actual && (
                                                          <>
                                                            <span className="text-on-surface-variant">
                                                              {" "}
                                                              ={" "}
                                                            </span>
                                                            <span className="font-mono text-rose-700 dark:text-rose-300 break-all whitespace-pre-wrap">
                                                              {
                                                                failureForPath.actual
                                                              }
                                                            </span>
                                                          </>
                                                        )}
                                                      </div>
                                                      <span
                                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pass ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"}`}
                                                      >
                                                        {pass ? "✓" : "✗"}
                                                      </span>
                                                    </div>
                                                  );
                                                },
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {maxRespTime != null && (
                                        <div
                                          className={`rounded-lg p-2 ${testCase.responseTimePassed !== false ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-rose-50 dark:bg-rose-900/20"}`}
                                        >
                                          <div className="text-[10px] text-on-surface-variant mb-1">
                                            Response Time
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`font-mono font-semibold ${testCase.responseTimePassed !== false ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
                                            >
                                              {testCase.durationMs}ms
                                            </span>
                                            <span
                                              className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${testCase.responseTimePassed !== false ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"}`}
                                            >
                                              {testCase.responseTimePassed !==
                                              false
                                                ? "✓"
                                                : "✗"}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {(testCase.validationScore != null ||
                                        testCase.validationScoreThreshold !=
                                          null) && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                                          <div className="text-[10px] text-on-surface-variant mb-1">
                                            Validation Scoring
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
                                              Score:{" "}
                                              {(
                                                testCase.validationScore ?? 0
                                              ).toFixed(2)}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                              Threshold:{" "}
                                              {(
                                                testCase.validationScoreThreshold ??
                                                0.8
                                              ).toFixed(2)}
                                            </span>
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${testCase.hardChecksPassed ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"}`}
                                            >
                                              {testCase.hardChecksPassed
                                                ? "✓"
                                                : "✕"}{" "}
                                              Hard checks
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {testCase.responseBodyPreview && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                                          <div className="text-[10px] text-on-surface-variant mb-1">
                                            Response Body
                                          </div>
                                          <pre className="font-mono text-[10px] text-blue-700 dark:text-blue-300 overflow-x-auto whitespace-pre-wrap break-all max-h-32">
                                            {(() => {
                                              try {
                                                return JSON.stringify(
                                                  JSON.parse(
                                                    testCase.responseBodyPreview,
                                                  ),
                                                  null,
                                                  2,
                                                );
                                              } catch {
                                                return testCase.responseBodyPreview;
                                              }
                                            })()}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {testCase.failureReasons &&
                                    testCase.failureReasons.length > 0 && (
                                      <div className="mt-6 pt-4 border-t-2 border-rose-200 dark:border-rose-800">
                                        <div className="flex items-center gap-2 mb-3">
                                          <svg
                                            className="w-5 h-5 text-rose-600 dark:text-rose-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                          </svg>
                                          <h4 className="text-sm font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                            Failure Details
                                          </h4>
                                        </div>
                                        <div className="space-y-2">
                                          {testCase.failureReasons.map(
                                            (fr, i) => (
                                              <div
                                                key={i}
                                                className="bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2"
                                              >
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="font-mono text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">
                                                    {fr.code?.replace(
                                                      /_/g,
                                                      " ",
                                                    )}
                                                  </span>
                                                  {fr.target && (
                                                    <span className="text-[10px] text-rose-600 dark:text-rose-400 italic">
                                                      ({fr.target})
                                                    </span>
                                                  )}
                                                </div>
                                                {fr.message && (
                                                  <div className="text-[10px] text-on-surface-variant break-all">
                                                    {fr.message}
                                                  </div>
                                                )}
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Test Statistics */}
                      <div className="mt-6 rounded-xl border border-outline-variant/20 dark:border-slate-600 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 border-b border-outline-variant/10 dark:border-slate-600">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                            Test Statistics
                          </h3>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-900/50">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            <div className="rounded-lg px-3 py-2 bg-surface-container-high dark:bg-slate-800 text-on-surface-variant">
                              <span className="font-semibold">
                                {t("suggestions.orderIndex")}:{" "}
                              </span>
                              <span>{testCase.orderIndex}</span>
                            </div>
                            <div className="rounded-lg px-3 py-2 bg-surface-container-high dark:bg-slate-800 text-on-surface-variant">
                              <span className="font-semibold">
                                {t("suggestions.httpMethod")}:{" "}
                              </span>
                              <span>
                                {testCase.httpMethod || t("suggestions.none")}
                              </span>
                            </div>
                            <div className="rounded-lg px-3 py-2 bg-surface-container-high dark:bg-slate-800 text-on-surface-variant">
                              <span className="font-semibold">
                                {t("suggestions.bodyType")}:{" "}
                              </span>
                              <span>
                                {testCase.bodyType || t("suggestions.none")}
                              </span>
                            </div>
                            <div className="rounded-lg px-3 py-2 bg-surface-container-high dark:bg-slate-800 text-on-surface-variant">
                              <span className="font-semibold">
                                {t("suggestions.timeoutMs")}:{" "}
                              </span>
                              <span>
                                {typeof testCase.timeoutMs === "number"
                                  ? `${testCase.timeoutMs} ms`
                                  : t("suggestions.none")}
                              </span>
                            </div>
                            <div className="rounded-lg px-3 py-2 bg-surface-container-high dark:bg-slate-800 text-on-surface-variant lg:col-span-2">
                              <span className="font-semibold">
                                {t("suggestions.expectedStatus")}:{" "}
                              </span>
                              <span>
                                {testCase.expectedStatus ||
                                  t("suggestions.none")}
                              </span>
                            </div>
                            <div className="rounded-lg px-3 py-2 bg-surface-container-high dark:bg-slate-800 text-on-surface-variant">
                              <span className="font-semibold">
                                {t("suggestions.durationMs")}:{" "}
                              </span>
                              <span>{testCase.durationMs} ms</span>
                            </div>
                            <div
                              className={cn(
                                "rounded-lg px-3 py-2",
                                getCheckStateClass(testCase.statusCodeMatched),
                              )}
                            >
                              <span className="font-semibold">
                                {t("suggestions.statusCodeCheck")}:
                              </span>
                              <span>
                                {getCheckStateLabel(testCase.statusCodeMatched)}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "rounded-lg px-3 py-2",
                                getCheckStateClass(testCase.schemaMatched),
                              )}
                            >
                              <span className="font-semibold">
                                {t("suggestions.schemaCheck")}:
                              </span>
                              <span>
                                {getCheckStateLabel(testCase.schemaMatched)}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "rounded-lg px-3 py-2",
                                getCheckStateClass(testCase.headerChecksPassed),
                              )}
                            >
                              <span className="font-semibold">
                                {t("suggestions.headerChecks")}:
                              </span>
                              <span>
                                {getCheckStateLabel(
                                  testCase.headerChecksPassed,
                                )}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "rounded-lg px-3 py-2",
                                getCheckStateClass(testCase.bodyContainsPassed),
                              )}
                            >
                              <span className="font-semibold">
                                {t("suggestions.bodyContainsCheck")}:
                              </span>
                              <span>
                                {getCheckStateLabel(
                                  testCase.bodyContainsPassed,
                                )}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "rounded-lg px-3 py-2",
                                getCheckStateClass(
                                  testCase.bodyNotContainsPassed,
                                ),
                              )}
                            >
                              <span className="font-semibold">
                                {t("suggestions.bodyNotContainsCheck")}:
                              </span>
                              <span>
                                {getCheckStateLabel(
                                  testCase.bodyNotContainsPassed,
                                )}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "rounded-lg px-3 py-2",
                                getCheckStateClass(
                                  testCase.jsonPathChecksPassed,
                                ),
                              )}
                            >
                              <span className="font-semibold">
                                {t("suggestions.jsonPathCheck")}:
                              </span>
                              <span>
                                {getCheckStateLabel(
                                  testCase.jsonPathChecksPassed,
                                )}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "rounded-lg px-3 py-2",
                                getCheckStateClass(testCase.responseTimePassed),
                              )}
                            >
                              <span className="font-semibold">
                                {t("suggestions.responseTimeCheck")}:
                              </span>
                              <span>
                                {getCheckStateLabel(
                                  testCase.responseTimePassed,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* 3. TEST STATISTICS (moved to end) */}
                      {/* Test Statistics section is already in the correct position */}
                    </div>
                  </details>

                  {isFailed && (
                    <div className="mt-4 pt-4 border-t border-outline-variant/10 dark:border-slate-700 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() =>
                            generateExplanation(testCase.testCaseId)
                          }
                          disabled={loadingExplanation}
                          className="px-3 py-2 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {loadingExplanation ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          {t("suggestions.generateExplanation")}
                        </button>
                      </div>

                      {explanation && (
                        <div className="text-sm text-on-surface-variant space-y-2">
                          <p className="text-on-surface font-semibold">
                            {explanation.summaryVi ||
                              t("suggestions.noSummary")}
                          </p>

                          {Array.isArray(explanation.possibleCauses) &&
                            explanation.possibleCauses.length > 0 && (
                              <div>
                                <p className="font-semibold">
                                  {t("suggestions.possibleCauses")}
                                </p>
                                {explanation.possibleCauses.map(
                                  (cause, index) => (
                                    <p
                                      key={`${testCase.testCaseId}-cause-${index}`}
                                    >
                                      - {cause}
                                    </p>
                                  ),
                                )}
                              </div>
                            )}

                          {Array.isArray(explanation.suggestedNextActions) &&
                            explanation.suggestedNextActions.length > 0 && (
                              <div>
                                <p className="font-semibold">
                                  {t("suggestions.suggestedActions")}
                                </p>
                                {explanation.suggestedNextActions.map(
                                  (action, index) => (
                                    <p
                                      key={`${testCase.testCaseId}-action-${index}`}
                                    >
                                      - {action}
                                    </p>
                                  ),
                                )}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
