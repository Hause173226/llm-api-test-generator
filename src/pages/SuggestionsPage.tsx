import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  GripVertical,
  Network,
  RefreshCw,
  Save,
  Search,
  Sparkles,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import StepTransitionOverlay from "../components/ui/StepTransitionOverlay";
import { cn } from "../lib/utils";
import { useProject } from "../contexts/ProjectContext";
import { useTestSuites } from "../hooks/useTestSuites";
import { apiService } from "../services/apiService";
import { testSuiteService } from "../services/testSuiteService";
import endpointService from "../services/endpointService";
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

  // ── Step 1: Order Gate ───────────────────────────────────────────────────────
  const [orderGateOpen, setOrderGateOpen] = useState(true);
  const [suiteDetail, setSuiteDetail] = useState<any>(null);
  const [suiteEndpoints, setSuiteEndpoints] = useState<any[]>([]);
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [isLoadingOrderGate, setIsLoadingOrderGate] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [gateStatus, setGateStatus] = useState<{
    isGatePassed: boolean;
  } | null>(null);

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

  // ── Step 1: Load Order Gate data when suite changes ─────────────────────────
  useEffect(() => {
    if (!selectedProjectId || !selectedSuiteId) {
      setSuiteDetail(null);
      setSuiteEndpoints([]);
      setLocalOrder([]);
      setGateStatus(null);
      return;
    }

    const loadOrderGate = async () => {
      setIsLoadingOrderGate(true);
      try {
        const [detail, gate] = await Promise.all([
          testSuiteService.getTestSuiteDetail(
            selectedProjectId,
            selectedSuiteId,
          ),
          apiService
            .get<{
              isGatePassed: boolean;
              activeProposalId?: string | null;
            }>(`/test-suites/${selectedSuiteId}/order-gate-status`)
            .catch(() => null),
        ]);

        setSuiteDetail(detail);
        setGateStatus(gate);
        if (gate?.isGatePassed) setOrderGateOpen(false);

        if (!detail?.apiSpecId || !Array.isArray(detail.selectedEndpointIds)) {
          setSuiteEndpoints([]);
          setLocalOrder([]);
          return;
        }

        const response = await endpointService.getEndpoints(
          detail.projectId || selectedProjectId,
          detail.apiSpecId,
          1,
          1000,
        );
        const allEndpoints = Array.isArray(response?.items)
          ? response.items
          : [];
        const ordered = detail.selectedEndpointIds
          .map((id: string) => allEndpoints.find((ep: any) => ep.id === id))
          .filter(Boolean);

        setSuiteEndpoints(ordered);
        setLocalOrder(ordered.map((ep: any) => ep.id));
      } catch (err) {
        handleError(err);
        setSuiteEndpoints([]);
        setLocalOrder([]);
      } finally {
        setIsLoadingOrderGate(false);
      }
    };

    loadOrderGate();
  }, [selectedProjectId, selectedSuiteId]);

  const handleSaveOrder = async () => {
    if (!selectedProjectId || !selectedSuiteId || !suiteDetail) return;

    try {
      setIsSavingOrder(true);

      const gate = await apiService.get<{
        isGatePassed: boolean;
        activeProposalId?: string | null;
        activeProposalStatus?: string | null;
      }>(`/test-suites/${selectedSuiteId}/order-gate-status`);

      let proposalId = gate?.activeProposalId;
      let rowVersion: string | undefined;

      if (!gate?.isGatePassed || !proposalId) {
        const created = await apiService.post<any>(
          `/test-suites/${selectedSuiteId}/order-proposals`,
          {
            specificationId: suiteDetail.apiSpecId,
            selectedEndpointIds: localOrder,
            source: "User",
            reasoningNote: "Created from Suggestions page",
          },
        );
        proposalId = created?.proposalId || created?.ProposalId;
        rowVersion = created?.rowVersion || created?.RowVersion;
      } else {
        const latest = await apiService.get<any>(
          `/test-suites/${selectedSuiteId}/order-proposals/latest`,
        );
        proposalId = latest?.proposalId || latest?.ProposalId;
        rowVersion = latest?.rowVersion || latest?.RowVersion;
      }

      if (!proposalId) throw new Error("Cannot resolve proposalId.");

      const reordered = await apiService.put<any>(
        `/test-suites/${selectedSuiteId}/order-proposals/${proposalId}/reorder`,
        {
          orderedEndpointIds: localOrder,
          rowVersion,
          reviewNotes: "Reordered from Suggestions page",
        },
      );

      const status = String(
        reordered?.status || reordered?.Status || "",
      ).toLowerCase();
      if (status !== "approved" && status !== "modifiedandapproved") {
        await apiService.post(
          `/test-suites/${selectedSuiteId}/order-proposals/${proposalId}/approve`,
          {
            rowVersion: reordered?.rowVersion || reordered?.RowVersion,
            reviewNotes: "Approved from Suggestions page",
          },
        );
      }

      const refreshedGate = await apiService
        .get<{
          isGatePassed: boolean;
        }>(`/test-suites/${selectedSuiteId}/order-gate-status`)
        .catch(() => null);
      setGateStatus(refreshedGate);
      if (refreshedGate?.isGatePassed) setOrderGateOpen(false);

      showSuccessToast("Test order approved.");
    } catch (err) {
      handleError(err);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const next = [...localOrder];
    const from = next.indexOf(draggedId);
    const to = next.indexOf(targetId);
    next.splice(from, 1);
    next.splice(to, 0, draggedId);
    setLocalOrder(next);
  };

  const handleDragEnd = () => setDraggedId(null);

  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case "GET":
        return "bg-emerald-100 text-emerald-700";
      case "POST":
        return "bg-blue-100 text-blue-700";
      case "PUT":
        return "bg-amber-100 text-amber-700";
      case "DELETE":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

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

        <div className="space-y-4">
          {/* Step 1: Order Gate */}
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                  gateStatus?.isGatePassed
                    ? "bg-emerald-600 text-white"
                    : "bg-indigo-600 text-white",
                )}
              >
                {gateStatus?.isGatePassed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  "1"
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-on-surface">
                  Bước 1 — Sắp xếp thứ tự API
                </p>
                <p className="text-xs text-on-surface-variant">
                  Chọn test suite, sắp xếp thứ tự endpoint và approve order
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedSuiteId}
                  onChange={(e) => setSelectedSuiteId(e.target.value)}
                  disabled={!selectedProjectId || isLoadingSuites}
                  className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/10 text-sm text-on-surface disabled:opacity-60"
                >
                  <option value="">{t("suggestions.suitePlaceholder")}</option>
                  {testSuites.map((suite) => (
                    <option key={suite.id} value={suite.id}>
                      {suite.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setOrderGateOpen((v) => !v)}
                  className="rounded-xl border border-outline-variant/10 bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-1"
                >
                  {orderGateOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {orderGateOpen &&
              (isLoadingOrderGate ? (
                <div className="flex items-center gap-2 text-sm text-on-surface-variant py-4 justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang tải dữ liệu Order Gate...
                </div>
              ) : suiteEndpoints.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-on-surface-variant">
                  <Network className="w-10 h-10" />
                  <p className="text-sm font-semibold">
                    Chưa có endpoint nào trong suite này.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                      <GripVertical className="w-3.5 h-3.5" />
                      Kéo thả để sắp xếp thứ tự gọi API
                    </p>
                    {gateStatus?.isGatePassed && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Order đã được approve
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {localOrder
                      .map((id) => suiteEndpoints.find((ep) => ep.id === id))
                      .filter(Boolean)
                      .map((endpoint, index) => (
                        <div
                          key={endpoint.id}
                          draggable
                          onDragStart={() => handleDragStart(endpoint.id)}
                          onDragOver={(e) => handleDragOver(e, endpoint.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border-2 bg-surface-container-low p-3 cursor-move transition-all",
                            draggedId === endpoint.id
                              ? "border-indigo-500 opacity-50"
                              : "border-outline-variant/10 hover:border-indigo-400/40",
                          )}
                        >
                          <GripVertical className="w-4 h-4 text-on-surface-variant shrink-0" />
                          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-black text-indigo-700">
                              {index + 1}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 text-[10px] font-black shrink-0",
                              getMethodColor(endpoint.method),
                            )}
                          >
                            {endpoint.method}
                          </span>
                          <p className="font-semibold text-on-surface text-sm truncate flex-1">
                            {endpoint.path}
                          </p>
                          {endpoint.isActive ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-on-surface-variant/40 shrink-0" />
                          )}
                        </div>
                      ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveOrder}
                    disabled={isSavingOrder}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isSavingOrder ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSavingOrder ? "Đang lưu..." : "Lưu & Approve"}
                  </button>
                </div>
              ))}
          </div>

          {/* Step 2: Test Results */}
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-black shrink-0">
                2
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">
                  Bước 2 — Xem kết quả kiểm thử
                </p>
                <p className="text-xs text-on-surface-variant">
                  Chọn test run để xem kết quả và phân tích lỗi
                </p>
              </div>
            </div>

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
                  {t("suggestions.runDetails", {
                    count: runDetail.cases.length,
                  })}
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
                      {runDetail.resolvedEnvironmentName ||
                        t("suggestions.none")}
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
                  const isFailed =
                    normalizeStatus(testCase.status) === "failed";

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

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
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

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                                {t("suggestions.queryParams")}
                              </p>
                              <pre className="rounded-lg p-3 bg-surface-container-high dark:bg-slate-800 text-xs text-on-surface overflow-x-auto whitespace-pre-wrap break-words">
                                {Object.keys(testCase.queryParams || {})
                                  .length > 0
                                  ? JSON.stringify(
                                      testCase.queryParams,
                                      null,
                                      2,
                                    )
                                  : t("suggestions.none")}
                              </pre>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                                {t("suggestions.dependencies")}
                              </p>
                              <p className="text-on-surface break-all">
                                {testCase.dependencyIds.length > 0
                                  ? testCase.dependencyIds.join(", ")
                                  : t("suggestions.none")}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                                {t("suggestions.skippedByDependencies")}
                              </p>
                              <p className="text-on-surface break-all">
                                {testCase.skippedBecauseDependencyIds.length > 0
                                  ? testCase.skippedBecauseDependencyIds.join(
                                      ", ",
                                    )
                                  : t("suggestions.none")}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                                {t("suggestions.requestHeaders")}
                              </p>
                              <pre className="rounded-lg p-3 bg-surface-container-high dark:bg-slate-800 text-xs text-on-surface overflow-x-auto whitespace-pre-wrap break-words">
                                {Object.keys(testCase.requestHeaders || {})
                                  .length > 0
                                  ? JSON.stringify(
                                      testCase.requestHeaders,
                                      null,
                                      2,
                                    )
                                  : t("suggestions.none")}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                                {t("suggestions.responseHeaders")}
                              </p>
                              <pre className="rounded-lg p-3 bg-surface-container-high dark:bg-slate-800 text-xs text-on-surface overflow-x-auto whitespace-pre-wrap break-words">
                                {Object.keys(testCase.responseHeaders || {})
                                  .length > 0
                                  ? JSON.stringify(
                                      testCase.responseHeaders,
                                      null,
                                      2,
                                    )
                                  : t("suggestions.none")}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                              {t("suggestions.requestBody")}
                            </p>
                            <pre className="rounded-lg p-3 bg-surface-container-high dark:bg-slate-800 text-xs text-on-surface overflow-x-auto whitespace-pre-wrap break-words">
                              {testCase.requestBody || t("suggestions.none")}
                            </pre>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                              {t("suggestions.responseBodyPreview")}
                            </p>
                            <pre className="rounded-lg p-3 bg-surface-container-high dark:bg-slate-800 text-xs text-on-surface overflow-x-auto whitespace-pre-wrap break-words">
                              {testCase.responseBodyPreview ||
                                t("suggestions.none")}
                            </pre>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                              {t("suggestions.extractedVariables")}
                            </p>
                            <pre className="rounded-lg p-3 bg-surface-container-high dark:bg-slate-800 text-xs text-on-surface overflow-x-auto whitespace-pre-wrap break-words">
                              {Object.keys(testCase.extractedVariables || {})
                                .length > 0
                                ? JSON.stringify(
                                    testCase.extractedVariables,
                                    null,
                                    2,
                                  )
                                : t("suggestions.none")}
                            </pre>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                              {t("suggestions.failureReasons")}
                            </p>
                            {testCase.failureReasons.length > 0 ? (
                              <div className="space-y-2">
                                {testCase.failureReasons.map(
                                  (reason, index) => (
                                    <div
                                      key={`${testCase.testCaseId}-reason-${index}`}
                                      className="rounded-lg px-3 py-2 bg-rose-500/5 border border-rose-500/20"
                                    >
                                      <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold">
                                        {reason.code || "VALIDATION"}
                                      </p>
                                      <p className="text-xs text-on-surface mt-1">
                                        {reason.message ||
                                          t("suggestions.none")}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-on-surface-variant">
                                {t("suggestions.noFailureReason")}
                              </p>
                            )}
                          </div>
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

                              {Array.isArray(
                                explanation.suggestedNextActions,
                              ) &&
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
          {/* end Step 2 card */}
        </div>
        {/* end space-y-4 */}
      </div>
      {/* end space-y-8 */}
    </MainLayout>
  );
}
