import React, { useState, useEffect } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
  Link,
} from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import {
  ArrowLeft,
  GripVertical,
  Loader2,
  AlertTriangle,
  Save,
  Play,
  Search,
  RefreshCw,
  CheckCircle2,
  Check,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileText,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { cn } from "../lib/utils";
import GlobalSpinner from "../components/ui/GlobalSpinner";
import {
  handleError,
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../utils/errorHandler";
import { testSuiteService } from "../services/testSuiteService";
import endpointService from "../services/endpointService";
import { apiService } from "../services/apiService";
import srsService, { type SrsDocument } from "../services/srsService";
import { useProject } from "../contexts/ProjectContext";
import testCaseService, { TestCase } from "../services/testCaseService";
import testSuiteLlmSuggestionService, {
  GenerationJobStatus,
  GenerationJobStatusModel,
  SuiteSuggestionModel,
  SuiteSuggestionQuery,
} from "../services/testSuiteLlmSuggestionService";
import SuggestionReviewPanel from "../components/test-runs/SuggestionReviewPanel";
import Modal from "../components/ui/Modal";
import StepTransitionOverlay from "../components/ui/StepTransitionOverlay";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";
import {
  getGenerationStatusLabel,
  useGenerationJobPolling,
} from "../hooks/useGenerationJobPolling";
type ProposalApiResponse = {
  proposalId?: string;
  ProposalId?: string;
  rowVersion?: string;
  RowVersion?: string;
  status?: number | string;
  Status?: number | string;
  proposedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
  ProposedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
  userModifiedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
  UserModifiedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
  appliedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
  AppliedOrder?: Array<{ endpointId?: string; orderIndex?: number }>;
};

type SuiteTab = "testcases" | "details" | "suggestions";

type LocalGenerationRun = {
  id: string;
  generatedAt: string;
  suggestionIds?: string[];
  completedAt?: string;
  jobId?: string;
};

type ActiveGenerationJob = {
  jobId: string;
  runId: string;
  generatedAt: string;
  successToast?: string;
};

type GenerationItem = {
  id: string;
  label: string;
  generatedAt?: string;
  totalSuggestions: number;
  pendingSuggestions: number;
  approvedSuggestions: number;
  rejectedSuggestions: number;
  supersededSuggestions: number;
  testCaseIds: string[];
  suggestionIds: string[];
};

export default function TestSuiteDetailPage() {
  const { suiteId } = useParams<{ suiteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedProject } = useProject();
  const { t } = useTranslation();

  const projectId = selectedProject?.id || searchParams.get("projectId") || "";
  const tabFromQuery = (searchParams.get("tab") || "details").toLowerCase();

  useEffect(() => {
    isRouteActiveRef.current = location.pathname === `/test-suites/${suiteId}`;
  }, [location.pathname, suiteId]);

  const SUPPRESS_NOT_FOUND_WINDOW_MS = 8000;
  const suppressNotFoundToastUntilRef = React.useRef(0);
  const lastProjectIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      lastProjectIdRef.current = projectId || null;
      return;
    }

    if (lastProjectIdRef.current && lastProjectIdRef.current !== projectId) {
      suppressNotFoundToastUntilRef.current =
        Date.now() + SUPPRESS_NOT_FOUND_WINDOW_MS;
      if (suiteId) {
        navigate("/test-suites", { replace: true });
      }
    }

    lastProjectIdRef.current = projectId;
  }, [projectId, navigate, suiteId]);

  const [suite, setSuite] = useState<any>(null);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [allSpecEndpoints, setAllSpecEndpoints] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [suggestions, setSuggestions] = useState<SuiteSuggestionModel[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<SuiteSuggestionModel[]>(
    [],
  );
  const [archivedSuggestions, setArchivedSuggestions] = useState<
    SuiteSuggestionModel[]
  >([]);
  const [generationRuns, setGenerationRuns] = useState<LocalGenerationRun[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTestCases, setIsLoadingTestCases] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestionGenerationStatus, setSuggestionGenerationStatus] =
    useState<GenerationJobStatus | null>(null);
  const [generationJobs, setGenerationJobs] = useState<
    GenerationJobStatusModel[]
  >([]);
  const [isWaitingForServerCallbackData, setIsWaitingForServerCallbackData] =
    useState(false);
  const isGeneratingSuggestionsRef = React.useRef(false);
  const isRouteActiveRef = React.useRef(true);
  const [isReviewingSuggestion, setIsReviewingSuggestion] = useState(false);
  const [pendingGeneration, setPendingGeneration] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [activeGenerationJob, setActiveGenerationJob] =
    useState<ActiveGenerationJob | null>(null);
  const finalizedGenerationJobIdsRef = React.useRef<Set<string>>(new Set());
  const [forceOpenSuggestions, setForceOpenSuggestions] = useState(false);
  const [isBulkReviewingSuggestions, setIsBulkReviewingSuggestions] =
    useState(false);
  const [overlayState, setOverlayState] = useState({
    isVisible: false,
    title: "",
    message: "",
    stepLabel: "",
  });
  const [isBulkRestoringSuggestions, setIsBulkRestoringSuggestions] =
    useState(false);
  const [isBulkApprovingSuggestions, setIsBulkApprovingSuggestions] =
    useState(false);
  const [isLoadingSuggestionDetail, setIsLoadingSuggestionDetail] =
    useState(false);
  const [bulkRejectModalOpen, setBulkRejectModalOpen] = useState(false);
  const [bulkRejectNotes, setBulkRejectNotes] = useState("");
  const [addEndpointModalOpen, setAddEndpointModalOpen] = useState(false);
  const [manualEndpointModalOpen, setManualEndpointModalOpen] = useState(false);
  const [selectedEndpointIdsToAdd, setSelectedEndpointIdsToAdd] = useState<
    string[]
  >([]);
  const [manualEndpointForm, setManualEndpointForm] = useState({
    method: "GET",
    path: "",
    description: "",
  });
  const [isCreatingEndpoint, setIsCreatingEndpoint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  // Track the last-saved endpoint order to detect real changes after drag-and-drop
  const savedOrderRef = React.useRef<string[]>([]);
  const [hasApprovedOrderOnce, setHasApprovedOrderOnce] = useState(false);
  const [srsDocuments, setSrsDocuments] = useState<SrsDocument[]>([]);
  const [linkedSrsDocId, setLinkedSrsDocId] = useState<string>("");
  const [isLinkingSrsDoc, setIsLinkingSrsDoc] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [testCaseSearchTerm, setTestCaseSearchTerm] = useState("");
  const [testCaseFilterMethod, setTestCaseFilterMethod] = useState("");
  const [activeTab, setActiveTab] = useState<SuiteTab>("details");
  const [isTabPinned, setIsTabPinned] = useState<boolean>(false);
  const [hasRestoredUiState, setHasRestoredUiState] = useState<boolean>(false);
  const [suggestionReviewStatusFilter, setSuggestionReviewStatusFilter] =
    useState("");
  const [suggestionTestTypeFilter, setSuggestionTestTypeFilter] = useState("");
  const [suggestionEndpointFilter, setSuggestionEndpointFilter] = useState("");
  const [srsCoverageSummary, setSrsCoverageSummary] = useState<{
    totalRequirements: number;
    coveredRequirements: number;
    uncoveredRequirements: number;
    coveragePercent: number;
    coveredItems: Array<{
      requirementId?: string;
      requirementCode?: string;
      title?: string;
    }>;
  } | null>(null);
  const [expandedGenerationItemId, setExpandedGenerationItemId] = useState<
    string | null
  >(null);
  const hasAnyTestCases =
    Number(suite?.testCaseCount ?? 0) > 0 || testCases.length > 0;
  const hasGeneratedSuggestions = allSuggestions.length > 0;
  const hasServerGenerationHistory = generationJobs.length > 0;
  // Chỉ tính isStep1Completed sau khi load xong để tránh redirect nhầm
  const isStep1Completed = !isLoading && !hasChanges && hasGeneratedSuggestions;

  // True when the suite now has an SRS linked but existing pending suggestions
  // were generated before the SRS was linked (hasSrsContext === false).
  // Signals user to regenerate so the LLM actually uses the SRS requirements.
  const hasStaleNoSrsSuggestions =
    !!linkedSrsDocId &&
    allSuggestions.some(
      (s) => s.reviewStatus === "Pending" && !s.hasSrsContext,
    );

  useEffect(() => {
    let cancelled = false;
    const loadSrsCoverage = async () => {
      if (!projectId || !suiteId || !linkedSrsDocId) {
        setSrsCoverageSummary(null);
        return;
      }

      try {
        const data = await srsService.getTraceability(projectId, suiteId);
        if (cancelled) return;

        const rows = Array.isArray(data?.requirements) ? data.requirements : [];
        const coveredRows = rows.filter((r: any) => r?.isCovered);
        setSrsCoverageSummary({
          totalRequirements: Number(data?.totalRequirements ?? 0),
          coveredRequirements: Number(data?.coveredRequirements ?? 0),
          uncoveredRequirements: Number(data?.uncoveredRequirements ?? 0),
          coveragePercent: Number(data?.coveragePercent ?? 0),
          coveredItems: coveredRows.map((r: any) => ({
            requirementId: r?.requirementId,
            requirementCode: r?.requirementCode,
            title: r?.title,
          })),
        });
      } catch {
        if (!cancelled) setSrsCoverageSummary(null);
      }
    };

    loadSrsCoverage();
    return () => {
      cancelled = true;
    };
  }, [projectId, suiteId, linkedSrsDocId, allSuggestions.length]);

  const breadcrumbs = useProjectBreadcrumbs(
    t("testSuites.title"),
    suite?.name || undefined,
  );

  const generationStorageKey = suiteId
    ? `suite-generation-runs:${suiteId}`
    : "suite-generation-runs:unknown";

  const uiStateStorageKey = suiteId
    ? `suite-ui-state:${suiteId}`
    : "suite-ui-state:unknown";

  useEffect(() => {
    if (!suiteId) {
      setGenerationRuns([]);
      return;
    }

    try {
      const raw = localStorage.getItem(generationStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const items: LocalGenerationRun[] = Array.isArray(parsed)
        ? parsed.filter(
            (item) =>
              item &&
              typeof item.id === "string" &&
              typeof item.generatedAt === "string",
          )
        : [];

      // Cleanup strategy:
      // - Always keep completed runs.
      // - Keep the newest pending run if it is recent so the loading
      //   state survives navigation (e.g. user switches tabs).
      // - Otherwise, keep only recent pending runs to avoid stale
      //   "Generating..." markers.
      const PENDING_CLEANUP_MS = 30 * 60 * 1000; // 30 minutes
      const now = Date.now();

      const isCompletedRun = (run: LocalGenerationRun) =>
        !!run.completedAt ||
        (Array.isArray((run as any).suggestionIds) &&
          (run as any).suggestionIds.length > 0);

      const isRecentPendingRun = (run: LocalGenerationRun) => {
        const time = new Date(run.generatedAt).getTime();
        if (!Number.isFinite(time)) return false;
        return now - time <= PENDING_CLEANUP_MS;
      };

      const completedRuns = items.filter(isCompletedRun);
      const pendingRuns = items.filter((r) => !isCompletedRun(r));

      let cleaned: LocalGenerationRun[] = [];
      if (completedRuns.length > 0) {
        const latestPending = [...pendingRuns]
          .sort(
            (a, b) =>
              new Date(a.generatedAt).getTime() -
              new Date(b.generatedAt).getTime(),
          )
          .pop();

        cleaned =
          latestPending && isRecentPendingRun(latestPending)
            ? [...completedRuns, latestPending]
            : [...completedRuns];
      } else {
        cleaned = pendingRuns.filter(isRecentPendingRun);
      }

      const sorted = cleaned.sort(
        (a: LocalGenerationRun, b: LocalGenerationRun) =>
          new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
      );

      setGenerationRuns(sorted);
    } catch {
      setGenerationRuns([]);
    }
  }, [suiteId, generationStorageKey]);

  // Restore UI state (active tab, expanded generation item, pinned flag)
  // from localStorage. If the URL does not specify a `tab`, restore the
  // saved tab; also set activeTab directly when restoring so the page
  // immediately reflects the user's last sub-screen.
  useEffect(() => {
    if (!suiteId) return;

    try {
      const raw = localStorage.getItem(uiStateStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw || "{}");

      const storedTab = parsed?.activeTab;
      const storedExpanded = parsed?.expandedGenerationItemId;
      const storedPinned = Boolean(parsed?.isTabPinned);

      setIsTabPinned(storedPinned);

      // If URL already specifies a tab, honor it. Otherwise restore.
      if (!searchParams.get("tab") && storedTab) {
        const params = new URLSearchParams(searchParams);
        params.set("tab", storedTab);
        setSearchParams(params, { replace: true });
      }

      if (storedTab) {
        setActiveTab(storedTab as SuiteTab);
        setHasRestoredUiState(true);
      } else {
        setHasRestoredUiState(false);
      }

      if (storedExpanded) {
        setExpandedGenerationItemId(storedExpanded);
      }
    } catch (e) {
      // ignore
    }
  }, [suiteId]);

  // Remember the last visited test suite so sidebar can reopen it
  useEffect(() => {
    if (!suiteId) return;
    try {
      localStorage.setItem("lastVisitedTestSuite", suiteId);
    } catch (e) {
      // ignore
    }
  }, [suiteId]);

  // Persist UI state when active tab or expanded generation item changes
  useEffect(() => {
    if (!suiteId) return;
    try {
      const payload = {
        activeTab,
        expandedGenerationItemId,
        isTabPinned,
      };
      localStorage.setItem(uiStateStorageKey, JSON.stringify(payload));
    } catch (e) {
      // ignore
    }
  }, [suiteId, activeTab, expandedGenerationItemId, isTabPinned]);

  // Clear the "restored" flag when suiteId changes so subsequent navigation
  // can re-evaluate auto-tab behavior for the new suite.
  useEffect(() => {
    setHasRestoredUiState(false);
  }, [suiteId]);

  const persistGenerationRuns = (nextRuns: LocalGenerationRun[]) => {
    if (!suiteId) return;
    localStorage.setItem(generationStorageKey, JSON.stringify(nextRuns));
    setGenerationRuns(nextRuns);
  };

  const getCurrentGenerationRuns = (): LocalGenerationRun[] => {
    if (!suiteId) return [];
    try {
      const raw = localStorage.getItem(generationStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return generationRuns || [];
      return parsed.filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.generatedAt === "string",
      ) as LocalGenerationRun[];
    } catch {
      return generationRuns || [];
    }
  };

  const updateGenerationRun = (
    runId: string,
    patch: Partial<LocalGenerationRun>,
  ) => {
    if (!suiteId) return;
    const nextRuns = getCurrentGenerationRuns().map((r) =>
      r.id === runId ? { ...r, ...patch } : r,
    );
    persistGenerationRuns(nextRuns);
  };

  const appendGenerationRun = (
    generatedAt: string,
  ): LocalGenerationRun | undefined => {
    if (!suiteId) return undefined;

    const run: LocalGenerationRun = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      generatedAt,
    };

    // Remove older runs that are still pending (no suggestionIds) because
    // a newly started generation supersedes them. Keeping old pending
    // runs causes confusing "Generating..." entries for earlier runs.
    const retainedRuns = getCurrentGenerationRuns().filter(
      (r) =>
        !!r.completedAt ||
        (Array.isArray(r.suggestionIds) && (r.suggestionIds || []).length > 0),
    );

    const nextRuns = [...retainedRuns, run].sort(
      (a, b) =>
        new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
    );

    persistGenerationRuns(nextRuns);
    return run;
  };

  const removeGenerationRun = (runId: string) => {
    if (!suiteId) return;
    const nextRuns = getCurrentGenerationRuns().filter((r) => r.id !== runId);
    persistGenerationRuns(nextRuns);
  };

  const getSuggestionFilters = (
    overrides?: Partial<SuiteSuggestionQuery>,
  ): SuiteSuggestionQuery => ({
    reviewStatus:
      overrides?.reviewStatus !== undefined
        ? overrides.reviewStatus
        : suggestionReviewStatusFilter || undefined,
    testType:
      overrides?.testType !== undefined
        ? overrides.testType
        : suggestionTestTypeFilter || undefined,
    endpointId:
      overrides?.endpointId !== undefined
        ? overrides.endpointId
        : suggestionEndpointFilter || undefined,
  });

  const mergeSuggestionIntoList = (
    items: SuiteSuggestionModel[],
    updated: SuiteSuggestionModel,
  ) => {
    const index = items.findIndex((item) => item.id === updated.id);
    if (index === -1) {
      return [updated, ...items];
    }

    const next = [...items];
    next[index] = { ...next[index], ...updated };
    return next;
  };

  const applySuggestionToLocalState = (updated: SuiteSuggestionModel) => {
    setSuggestions((prev) => {
      return mergeSuggestionIntoList(prev, updated);
    });

    const status = String(updated.reviewStatus || "").toLowerCase();
    setAllSuggestions((prev) => {
      if (status === "superseded") {
        return prev.filter((item) => item.id !== updated.id);
      }

      return mergeSuggestionIntoList(prev, updated);
    });

    setArchivedSuggestions((prev) => {
      if (status === "superseded") {
        return mergeSuggestionIntoList(prev, updated);
      }

      return prev.map((item) =>
        item.id === updated.id ? { ...item, ...updated } : item,
      );
    });
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }
    // If the user has pinned a tab, or we just restored the UI state from
    // localStorage, avoid automatic tab changes.
    if (isTabPinned || hasRestoredUiState) return;

    if (
      tabFromQuery === "testcases" ||
      tabFromQuery === "details" ||
      tabFromQuery === "suggestions"
    ) {
      // Allow staying on Suggestions tab if there's an active pending generation.
      if (
        tabFromQuery === "suggestions" &&
        !isStep1Completed &&
        !forceOpenSuggestions &&
        !pendingGeneration
      ) {
        setActiveTab("details");
        const params = new URLSearchParams(searchParams);
        params.set("tab", "details");
        setSearchParams(params, { replace: true });
        return;
      }

      if (tabFromQuery === "testcases" && !hasAnyTestCases) {
        setActiveTab("details");
        const params = new URLSearchParams(searchParams);
        params.set("tab", "details");
        setSearchParams(params, { replace: true });
      } else {
        setActiveTab(tabFromQuery as SuiteTab);
      }
    }
  }, [
    tabFromQuery,
    hasAnyTestCases,
    isStep1Completed,
    isLoading,
    forceOpenSuggestions,
    pendingGeneration,
  ]);

  // Auto-navigate to Step 3 whenever the user is on the suggestions tab,
  // all suggestions are reviewed (0 pending), and test cases exist.
  // This covers: (a) last approval just happened, (b) user re-opens the tab
  // when everything is already approved.
  useEffect(() => {
    if (activeTab !== "suggestions") return;
    if (isLoading || isLoadingSuggestions) return;
    if (overlayState.isVisible) return; // already transitioning

    const hasPending = allSuggestions.some(
      (s) => String(s.reviewStatus || "").toLowerCase() === "pending",
    );
    const hasCases =
      testCases.length > 0 || Number(suite?.testCaseCount ?? 0) > 0;

    if (!hasPending && hasCases && allSuggestions.length > 0) {
      // All suggestions are reviewed — release the pin so navigation proceeds,
      // even if the user had previously pinned this tab manually.
      setIsTabPinned(false);
      setOverlayState({
        isVisible: true,
        title: t("testSuites.detailToast.moveToStep3Title"),
        message: t("testSuites.detailToast.moveToStep3Message"),
        stepLabel: t("testSuites.detailToast.moveToStep3Label"),
      });
      const timer = setTimeout(() => {
        setActiveTab("testcases");
        const params = new URLSearchParams(searchParams);
        params.set("tab", "testcases");
        setSearchParams(params, { replace: true });
        setOverlayState({
          isVisible: false,
          title: "",
          message: "",
          stepLabel: "",
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [
    activeTab,
    isLoading,
    isLoadingSuggestions,
    allSuggestions,
    testCases,
    suite,
  ]);

  const changeTab = (tab: SuiteTab) => {
    const nextTab = tab === "testcases" && !hasAnyTestCases ? "details" : tab;

    if (tab === "testcases" && !hasAnyTestCases) {
      showInfoToast(
        "Chua co test case. Vui long tao test case trong tab Details.",
      );
    }

    // User-initiated tab change: pin this tab so auto-navigation won't override it.
    setIsTabPinned(true);
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", nextTab);
    setSearchParams(params, { replace: true });
  };

  const getBusinessContextMap = (suiteData: any): Record<string, string> => {
    if (!suiteData) return {};

    return (
      suiteData.endpointBusinessContexts ||
      suiteData.EndpointBusinessContexts ||
      {}
    );
  };

  useEffect(() => {
    fetchData();
  }, [suiteId, projectId]);

  // Keep pending generation visible based on persisted generation runs.
  // This ensures the "Generating…" card remains visible across tab changes
  // or other UI interactions until the server produces suggestionIds for the run.
  useEffect(() => {
    if (!generationRuns || generationRuns.length === 0) {
      setPendingGeneration(null);
      return;
    }

    const sorted = [...generationRuns].sort(
      (a, b) =>
        new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
    );

    // Prefer the latest run that does not yet have suggestionIds attached
    const pendingRun = [...sorted]
      .reverse()
      .find(
        (r) =>
          !r.completedAt && (!r.suggestionIds || r.suggestionIds.length === 0),
      );

    if (!pendingRun) {
      setPendingGeneration(null);
      return;
    }

    const idx = sorted.findIndex((r) => r.id === pendingRun.id);
    setPendingGeneration({ id: pendingRun.id, label: `Generate #${idx + 1}` });
  }, [generationRuns]);

  // Resume polling after page refresh/navigation:
  // if we still have a pending local run with jobId, re-attach active job.
  useEffect(() => {
    if (activeGenerationJob || !generationRuns || generationRuns.length === 0) {
      return;
    }

    const pendingWithJob = [...generationRuns]
      .reverse()
      .find(
        (r) =>
          !r.completedAt &&
          (!r.suggestionIds || r.suggestionIds.length === 0) &&
          !!r.jobId,
      );

    if (pendingWithJob?.jobId) {
      setIsGeneratingSuggestions(true);
      setActiveGenerationJob({
        jobId: pendingWithJob.jobId,
        runId: pendingWithJob.id,
        generatedAt: pendingWithJob.generatedAt,
      });
    }
  }, [generationRuns, activeGenerationJob]);

  // Cleanup orphan pending runs (no jobId) that are too old and would otherwise
  // leave the UI stuck in "Generating suggestions..." forever.
  useEffect(() => {
    if (!generationRuns || generationRuns.length === 0) return;
    const now = Date.now();
    const ORPHAN_PENDING_TTL_MS = 3 * 60 * 1000;

    const orphanRuns = generationRuns.filter((r) => {
      if (r.completedAt || (r.suggestionIds && r.suggestionIds.length > 0)) {
        return false;
      }
      if (r.jobId) return false;
      const startedAt = new Date(r.generatedAt).getTime();
      return Number.isFinite(startedAt) && now - startedAt > ORPHAN_PENDING_TTL_MS;
    });

    if (orphanRuns.length > 0) {
      orphanRuns.forEach((r) => removeGenerationRun(r.id));
      if (!activeGenerationJob) {
        setIsGeneratingSuggestions(false);
      }
      showErrorToast(
        "Generation callback was not received. Please regenerate (n8n callback URL may be unreachable).",
      );
    }
  }, [generationRuns, activeGenerationJob]);

  const availableSpecEndpoints = allSpecEndpoints.filter(
    (endpoint) => !endpoints.some((selected) => selected.id === endpoint.id),
  );

  const handleAddEndpointsFromSpec = () => {
    if (selectedEndpointIdsToAdd.length === 0) {
      showInfoToast(t("testSuites.detailToast.chooseEndpoint"));
      return;
    }

    const selectedSet = new Set(selectedEndpointIdsToAdd);
    const toAdd = allSpecEndpoints.filter((endpoint) =>
      selectedSet.has(endpoint.id),
    );
    if (toAdd.length === 0) {
      showInfoToast(t("testSuites.detailToast.noValidEndpoint"));
      return;
    }

    setEndpoints((prev) => {
      const prevIds = new Set(prev.map((item) => item.id));
      const deduped = toAdd.filter((item) => !prevIds.has(item.id));
      return [...prev, ...deduped];
    });
    setHasChanges(true);
    setSelectedEndpointIdsToAdd([]);
    setAddEndpointModalOpen(false);
    showSuccessToast(
      t("testSuites.detailToast.addedEndpoints", { count: toAdd.length }),
    );
  };

  const handleCreateManualEndpoint = async () => {
    if (!projectId || !suite?.apiSpecId) {
      showErrorToast(t("testSuites.detailToast.missingProjectSpec"));
      return;
    }

    const path = manualEndpointForm.path.trim();
    if (!path) {
      showErrorToast(t("testSuites.detailToast.endpointPathRequired"));
      return;
    }

    try {
      setIsCreatingEndpoint(true);
      const method = manualEndpointForm.method.toUpperCase();

      const created = await endpointService.createEndpoint(
        projectId,
        suite.apiSpecId,
        {
          path,
          method: method as any,
          httpMethod: method,
          description: manualEndpointForm.description.trim() || undefined,
        } as any,
      );

      const normalized = {
        id: created?.id,
        projectId,
        path: created?.path || path,
        method: String(created?.method || method).toUpperCase(),
        description:
          created?.description || manualEndpointForm.description.trim(),
        tags: created?.tags || [],
      };

      if (!normalized.id) {
        showErrorToast(t("testSuites.detailToast.createEndpointMissingId"));
        return;
      }

      setAllSpecEndpoints((prev) => {
        if (prev.some((item) => item.id === normalized.id)) return prev;
        return [...prev, normalized];
      });
      setEndpoints((prev) => {
        if (prev.some((item) => item.id === normalized.id)) return prev;
        return [...prev, normalized];
      });

      setHasChanges(true);
      setManualEndpointForm({ method: "GET", path: "", description: "" });
      setManualEndpointModalOpen(false);
      showSuccessToast(t("testSuites.detailToast.manualEndpointAdded"));
    } catch (err) {
      handleError(err);
    } finally {
      setIsCreatingEndpoint(false);
    }
  };

  const normalizeProposalOrder = (
    items?: Array<{ endpointId?: string; orderIndex?: number }>,
  ) =>
    (items || [])
      .filter((item) => Boolean(item?.endpointId))
      .sort(
        (a, b) =>
          (a.orderIndex ?? Number.MAX_SAFE_INTEGER) -
          (b.orderIndex ?? Number.MAX_SAFE_INTEGER),
      )
      .map((item) => item.endpointId as string);

  const loadSuite = async () => {
    const suiteData = await testSuiteService.getTestSuiteDetail(
      projectId,
      suiteId!,
    );
    console.log("Suite data from API:", suiteData);

    // WORKAROUND: Backend detail API returns testCaseCount=0, but list API returns correct count.
    try {
      const allSuites = await testSuiteService.getTestSuites(projectId);
      const suiteFromList = allSuites.find((s: any) => s.id === suiteId);
      if (suiteFromList && suiteFromList.testCaseCount !== undefined) {
        suiteData.testCaseCount = suiteFromList.testCaseCount;
        console.log(
          "Updated testCaseCount from list API:",
          suiteFromList.testCaseCount,
        );
      }
    } catch (err) {
      console.warn("Failed to fetch testCaseCount from list API:", err);
    }

    setSuite(suiteData);
    return suiteData;
  };

  const loadSrsDocuments = async () => {
    try {
      const docs = await srsService.listDocuments(projectId);
      setSrsDocuments(docs);
      const linked = docs.find((d) => d.testSuiteId === suiteId);
      setLinkedSrsDocId(linked?.id ?? "");
    } catch {
      // non-critical
    }
  };

  const loadEndpointsAndOrder = async (suiteData: any) => {
    let approvedOrderDetected = false;

    if (!suiteData.apiSpecId) {
      setAllSpecEndpoints([]);
      setEndpoints([]);
      savedOrderRef.current = [];
      return { approvedOrderDetected };
    }

    const response = await endpointService.getEndpoints(
      suiteData.projectId,
      suiteData.apiSpecId,
    );

    const allEndpoints = response.items || [];
    setAllSpecEndpoints(allEndpoints);

    let orderedEndpointIds: string[] = suiteData.selectedEndpointIds || [];

    try {
      const latestProposal = await apiService.get<ProposalApiResponse>(
        `/test-suites/${suiteId}/order-proposals/latest`,
      );

      const latestProposalStatus = String(
        latestProposal?.status || latestProposal?.Status || "",
      ).toLowerCase();

      const appliedOrder = normalizeProposalOrder(
        latestProposal?.appliedOrder || latestProposal?.AppliedOrder,
      );
      const userModifiedOrder = normalizeProposalOrder(
        latestProposal?.userModifiedOrder || latestProposal?.UserModifiedOrder,
      );
      const proposedOrder = normalizeProposalOrder(
        latestProposal?.proposedOrder || latestProposal?.ProposedOrder,
      );

      const proposalOrder =
        appliedOrder.length > 0
          ? appliedOrder
          : userModifiedOrder.length > 0
            ? userModifiedOrder
            : proposedOrder;

      if (proposalOrder.length > 0) {
        orderedEndpointIds = proposalOrder;
      }

      if (
        appliedOrder.length > 0 ||
        latestProposalStatus === "approved" ||
        latestProposalStatus === "applied"
      ) {
        approvedOrderDetected = true;
      }
    } catch (proposalErr) {
      console.warn(
        "Failed to load latest order proposal, fallback to suite selectedEndpointIds.",
        proposalErr,
      );
    }

    const orderedEndpoints = orderedEndpointIds
      .map((id: string) => allEndpoints.find((ep: any) => ep.id === id))
      .filter(Boolean);

    setEndpoints(orderedEndpoints);
    savedOrderRef.current = orderedEndpoints.map((ep: any) => ep.id);
    return { approvedOrderDetected };
  };

  const fetchData = async () => {
    if (!suiteId || !projectId) return;
    if (!isRouteActiveRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const suiteData = await loadSuite();
      const [, , loadedSuggestions] = await Promise.all([
        loadSrsDocuments(),
        refreshTestCases(),
        refreshSuggestionBuckets(),
      ]);
      const { approvedOrderDetected } = await loadEndpointsAndOrder(suiteData);

      setHasApprovedOrderOnce(
        approvedOrderDetected || loadedSuggestions.length > 0,
      );
    } catch (err) {
      const statusCode =
        (err as any)?.status ||
        (err as any)?.response?.status ||
        (err as any)?.statusCode;
      const isNotFound = statusCode === 404;
      const isActivePath =
        window.location.pathname === `/test-suites/${suiteId}`;
      const suppressNotFoundToast =
        Date.now() < suppressNotFoundToastUntilRef.current;
      const suppressToast =
        !isActivePath || (isNotFound && suppressNotFoundToast);
      setError(handleError(err, undefined, suppressToast));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newEndpoints = [...endpoints];
    const draggedItem = newEndpoints[draggedIndex];
    newEndpoints.splice(draggedIndex, 1);
    newEndpoints.splice(index, 0, draggedItem);

    setEndpoints(newEndpoints);
    setDraggedIndex(index);
    // Only mark dirty when the current order actually differs from the saved order
    const newOrder = newEndpoints.map((ep: any) => ep.id);
    const saved = savedOrderRef.current;
    const isDifferent =
      newOrder.length !== saved.length ||
      newOrder.some((id, i) => id !== saved[i]);
    setHasChanges(isDifferent);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleGlobalBusinessRulesChange = (value: string) => {
    setSuite((prev: any) => {
      if (!prev) return prev;

      return {
        ...prev,
        globalBusinessRules: value,
      };
    });
    setHasChanges(true);
  };

  const handleEndpointContextChange = (endpointId: string, value: string) => {
    setSuite((prev: any) => {
      if (!prev) return prev;

      const contextMap = {
        ...getBusinessContextMap(prev),
      };

      if (!value.trim()) {
        delete contextMap[endpointId];
      } else {
        contextMap[endpointId] = value;
      }

      return {
        ...prev,
        endpointBusinessContexts: contextMap,
      };
    });
    setHasChanges(true);
  };

  const handleSaveOrder = async (): Promise<boolean> => {
    if (!suite || !projectId) return false;

    try {
      setIsSubmitting(true);
      const orderedIds = endpoints.map((ep) => ep.id);

      const updatedSuite = await testSuiteService.updateTestSuite(
        projectId,
        suite.id,
        {
          name: suite.name,
          description: suite.description,
          apiSpecId: suite.apiSpecId,
          generationType: suite.generationType,
          selectedEndpointIds: orderedIds,
          endpointBusinessContexts: getBusinessContextMap(suite),
          globalBusinessRules: suite.globalBusinessRules,
          rowVersion: suite.rowVersion,
        },
      );

      // Update suite with new rowVersion, but keep other fields like testCaseCount
      setSuite({ ...suite, ...updatedSuite });
      showSuccessToast(t("testSuites.detailToast.suiteSaved"));
      setHasChanges(false);
      // Update savedOrder to reflect the newly committed order
      savedOrderRef.current = endpoints.map((ep) => ep.id);

      // Create and approve the order proposal
      try {
        // Step 1: Create a new proposal with the ordered endpoints
        const newProposal = await apiService.post<ProposalApiResponse>(
          `/test-suites/${suite.id}/order-proposals`,
          {
            specificationId: suite.apiSpecId,
            selectedEndpointIds: orderedIds,
            source: "User",
            reasoningNote: "Order updated by user",
          },
        );

        console.log("Created proposal:", newProposal);

        const proposalId = newProposal?.proposalId || newProposal?.ProposalId;
        const proposalRowVersion =
          newProposal?.rowVersion || newProposal?.RowVersion;

        if (proposalId && proposalRowVersion) {
          // Step 2: Reorder to enforce the user-defined order
          const reordered = await apiService.put<ProposalApiResponse>(
            `/test-suites/${suite.id}/order-proposals/${proposalId}/reorder`,
            {
              orderedEndpointIds: orderedIds,
              rowVersion: proposalRowVersion,
              reviewNotes: "Reordered after suite save",
            },
          );

          const reorderedRowVersion =
            reordered?.rowVersion || reordered?.RowVersion;

          if (!reorderedRowVersion) {
            throw new Error("Missing rowVersion after reorder.");
          }

          // Step 3: Approve the reordered proposal
          await apiService.post(
            `/test-suites/${suite.id}/order-proposals/${proposalId}/approve`,
            {
              rowVersion: reorderedRowVersion,
              reviewNotes: "Auto-approved after order save",
            },
          );
          setHasApprovedOrderOnce(true);
          showSuccessToast(t("testSuites.detailToast.orderApproved"));

          // Fire-and-forget so that isSubmitting can clear
          setTimeout(() => {
            startSuggestionGeneration({
              source: "auto",
              forceRefresh: true,
              checkGate: false,
              successToast: t("testSuites.detailToast.aiPreviewRegenerated"),
            }).catch((e) => console.error("Background generation failed", e));
          }, 0);
        }
      } catch (approveErr) {
        // If auto-approve fails, show a warning but don't fail the whole operation
        console.error("Auto-approve failed:", approveErr);
        showErrorToast(t("testSuites.detailToast.orderSavedButApproveFailed"));
      }

      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveOrderAndGoToReview = async () => {
    const success = await handleSaveOrder();
    if (success) {
      changeTab("suggestions");
    }
  };

  const handleLinkSrsDoc = async (newDocId: string) => {
    if (!projectId) return;
    setIsLinkingSrsDoc(true);
    try {
      // Unlink old document if switching
      if (linkedSrsDocId && linkedSrsDocId !== newDocId) {
        await srsService.linkTestSuite(projectId, linkedSrsDocId, null);
      }
      if (newDocId) {
        await srsService.linkTestSuite(projectId, newDocId, suiteId!);
      }
      setLinkedSrsDocId(newDocId);
      showSuccessToast(
        newDocId ? "Đã liên kết tài liệu SRS." : "Đã hủy liên kết.",
      );
    } catch (err) {
      handleError(err);
    } finally {
      setIsLinkingSrsDoc(false);
    }
  };

  const handleRunTests = () => {
    navigate(`/runs?suiteId=${suiteId}`);
  };

  const refreshTestCases = async (): Promise<TestCase[]> => {
    if (!suiteId) return [];

    try {
      setIsLoadingTestCases(true);
      const testCaseResponse = await testCaseService.getTestCases(
        suiteId,
        1,
        300,
      );
      const items = testCaseResponse.items || [];
      setTestCases(items);
      return items;
    } catch (err) {
      handleError(err, undefined, !isRouteActiveRef.current);
      return [];
    } finally {
      setIsLoadingTestCases(false);
    }
  };

  const refreshSuggestions = async (): Promise<SuiteSuggestionModel[]> => {
    if (!suiteId) return [];

    try {
      setIsLoadingSuggestions(true);
      const items = await testSuiteLlmSuggestionService.list(suiteId);
      const result = Array.isArray(items) ? items : [];
      setAllSuggestions(result);
      return result;
    } catch (err) {
      handleError(err, undefined, !isRouteActiveRef.current);
      return [];
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const refreshSuggestionBuckets = async (): Promise<
    SuiteSuggestionModel[]
  > => {
    if (!suiteId) return [];

    try {
      setIsLoadingSuggestions(true);
      const [activeItems, archivedItems] = await Promise.all([
        testSuiteLlmSuggestionService.list(suiteId),
        testSuiteLlmSuggestionService.list(suiteId, {
          reviewStatus: "Superseded",
        }),
      ]);
      const active = Array.isArray(activeItems) ? activeItems : [];
      const archived = Array.isArray(archivedItems) ? archivedItems : [];
      setAllSuggestions(active);
      setArchivedSuggestions(archived);
      return active;
    } catch (err) {
      handleError(err, undefined, !isRouteActiveRef.current);
      setAllSuggestions([]);
      setArchivedSuggestions([]);
      return [];
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Refresh archived (superseded) suggestions used only for timeline/history view
  const refreshArchivedSuggestions = async (): Promise<
    SuiteSuggestionModel[]
  > => {
    if (!suiteId) return [];

    try {
      const items = await testSuiteLlmSuggestionService.list(suiteId, {
        reviewStatus: "Superseded",
      });
      const result = Array.isArray(items) ? items : [];
      setArchivedSuggestions(result);
      return result;
    } catch (err) {
      handleError(err, undefined, !isRouteActiveRef.current);
      setArchivedSuggestions([]);
      return [];
    }
  };

  const beginSuggestionGeneration = (source: "manual" | "auto") => {
    if (isGeneratingSuggestionsRef.current) {
      if (source === "manual") {
        showInfoToast(t("testSuites.detailToast.generatingInProgress"));
      }
      return false;
    }
    isGeneratingSuggestionsRef.current = true;
    return true;
  };

  const endSuggestionGeneration = () => {
    isGeneratingSuggestionsRef.current = false;
  };

  const clearSuggestionGenerationState = () => {
    setIsGeneratingSuggestions(false);
    setSuggestionGenerationStatus(null);
    setForceOpenSuggestions(false);
    setActiveGenerationJob(null);
    endSuggestionGeneration();
  };

  useEffect(() => {
    if (!suiteId) {
      setGenerationJobs([]);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();

    const syncJobs = async () => {
      try {
        const jobs = await testSuiteLlmSuggestionService.listGenerationJobs(
          suiteId,
          20,
          { signal: controller.signal },
        );
        if (cancelled) return;
        const safeJobs = Array.isArray(jobs) ? jobs : [];
        setGenerationJobs(safeJobs);

        const activeFromBe = safeJobs.find((job) =>
          ["Queued", "Triggering", "WaitingForCallback"].includes(job.status),
        );

        if (activeFromBe && !activeGenerationJob) {
          const existingRun = generationRuns.find(
            (run) => run.jobId === activeFromBe.jobId,
          );
          const runId = existingRun?.id || `be-${activeFromBe.jobId}`;
          const generatedAt = existingRun?.generatedAt || activeFromBe.queuedAt;
          const nextIndex = (generationRuns?.length || 0) + 1;

          setPendingGeneration({
            id: runId,
            label: `Generate #${nextIndex}`,
          });
          setExpandedGenerationItemId(runId);
          setIsGeneratingSuggestions(true);
          setActiveGenerationJob({
            jobId: activeFromBe.jobId,
            runId,
            generatedAt,
          });
        }
      } catch {
        // Keep existing UI state; next poll will retry.
      } finally {
        if (!cancelled) {
          timer = setTimeout(syncJobs, 5000);
        }
      }
    };

    void syncJobs();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [suiteId, activeGenerationJob, generationRuns]);

  useEffect(() => {
    if (!suiteId) {
      setIsWaitingForServerCallbackData(false);
      return;
    }

    if (activeGenerationJob) {
      setIsWaitingForServerCallbackData(false);
      return;
    }

    const latestJob = generationJobs[0];
    const noTimelineDataYet =
      generationRuns.length === 0 &&
      allSuggestions.length === 0 &&
      archivedSuggestions.length === 0;
    const shouldWait =
      !!latestJob &&
      noTimelineDataYet &&
      [
        "Queued",
        "Triggering",
        "WaitingForCallback",
        // Completed can still need a short delay until suggestions are visible.
        "Completed",
      ].includes(String(latestJob.status));

    if (!shouldWait) {
      setIsWaitingForServerCallbackData(false);
      return;
    }

    setIsWaitingForServerCallbackData(true);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pump = async () => {
      try {
        const refreshed = await refreshSuggestions();
        if (cancelled) return;

        if (Array.isArray(refreshed) && refreshed.length > 0) {
          setIsWaitingForServerCallbackData(false);
          return;
        }

        await refreshArchivedSuggestions();
      } catch {
        // keep waiting; next cycle retries
      } finally {
        if (!cancelled && isRouteActiveRef.current) {
          timer = setTimeout(pump, 4000);
        }
      }
    };

    void pump();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    suiteId,
    activeGenerationJob,
    generationJobs,
    generationRuns.length,
    allSuggestions.length,
    archivedSuggestions.length,
  ]);

  const finalizeSuggestionGeneration = async (
    run?: LocalGenerationRun,
  ): Promise<SuiteSuggestionModel[]> => {
    // Backend can report Completed slightly before freshly generated suggestions
    // are visible in list API. Retry briefly so Step 2 can render immediately.
    const previousCount = allSuggestions.length;
    const runStartedAt = run?.generatedAt
      ? new Date(run.generatedAt).getTime()
      : 0;
    const hasFreshItems = (items: SuiteSuggestionModel[]) =>
      items.some((item) => {
        const value = item.createdDateTime || item.updatedDateTime;
        if (!value) return false;
        const time = new Date(value).getTime();
        return Number.isFinite(time) && time >= runStartedAt;
      });

    let nextSuggestions = await refreshSuggestions();
    const deadline = Date.now() + 20000;
    while (
      Date.now() < deadline &&
      nextSuggestions.length <= previousCount &&
      !hasFreshItems(nextSuggestions)
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      nextSuggestions = await refreshSuggestions();
    }
    await refreshArchivedSuggestions();

    const pendingSuggestionIds = nextSuggestions
      .filter(
        (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
      )
      .map((item) => item.id);

    if (run?.id && pendingSuggestionIds.length > 0) {
      updateGenerationRun(run.id, { suggestionIds: pendingSuggestionIds });
    }

    return nextSuggestions;
  };

  const generationPolling = useGenerationJobPolling({
    suiteId,
    jobId: activeGenerationJob?.jobId,
    enabled: !!activeGenerationJob,
    timeoutMs: 180000,
  });

  useEffect(() => {
    if (!activeGenerationJob) return;
    setSuggestionGenerationStatus(generationPolling.status);
  }, [activeGenerationJob, generationPolling.status]);

  useEffect(() => {
    if (!activeGenerationJob || !generationPolling.terminalStatus) return;
    if (finalizedGenerationJobIdsRef.current.has(activeGenerationJob.jobId)) {
      return;
    }

    finalizedGenerationJobIdsRef.current.add(activeGenerationJob.jobId);
    let isCurrent = true;

    const completeJob = async () => {
      try {
        if (generationPolling.terminalStatus === "Completed") {
          const finalized = await finalizeSuggestionGeneration({
            id: activeGenerationJob.runId,
            generatedAt: activeGenerationJob.generatedAt,
          });
          updateGenerationRun(activeGenerationJob.runId, {
            completedAt: new Date().toISOString(),
          });
          if (finalized.length === 0) {
            showInfoToast(
              t("testSuites.detailToast.generationCompletedNoValidSuggestions"),
            );
          } else {
            showSuccessToast(
              activeGenerationJob.successToast ||
                t("testSuites.detailToast.suggestionsReady"),
            );
          }
        } else if (generationPolling.terminalStatus === "Cancelled") {
          removeGenerationRun(activeGenerationJob.runId);
          showInfoToast(t("testSuites.detailToast.generationCancelled"));
        } else {
          removeGenerationRun(activeGenerationJob.runId);
          const latest =
            await testSuiteLlmSuggestionService.getGenerationStatus(
              suiteId!,
              activeGenerationJob.jobId,
            );
          showErrorToast(
            latest.errorMessage || t("testSuites.detailToast.generationFailed"),
          );
        }
      } catch (err) {
        handleError(err);
      } finally {
        if (isCurrent) {
          clearSuggestionGenerationState();
        }
      }
    };

    void completeJob();

    return () => {
      isCurrent = false;
    };
  }, [activeGenerationJob, generationPolling.terminalStatus]);

  useEffect(() => {
    if (!activeGenerationJob || !generationPolling.error) return;
    if (finalizedGenerationJobIdsRef.current.has(activeGenerationJob.jobId)) {
      return;
    }

    finalizedGenerationJobIdsRef.current.add(activeGenerationJob.jobId);
    removeGenerationRun(activeGenerationJob.runId);
    handleError(generationPolling.error);
    clearSuggestionGenerationState();
  }, [activeGenerationJob, generationPolling.error]);

  const startSuggestionGeneration = async ({
    source,
    forceRefresh,
    checkGate,
    successToast,
  }: {
    source: "manual" | "auto";
    forceRefresh: boolean;
    checkGate: boolean;
    successToast?: string;
  }) => {
    if (!suite || !suiteId || !suite.apiSpecId) {
      showErrorToast(t("testSuites.detailToast.noApiSpec"));
      return false;
    }

    if (!beginSuggestionGeneration(source)) return false;

    const nextIndex = (generationRuns?.length || 0) + 1;
    let run: LocalGenerationRun | undefined;
    let jobStarted = false;
    const tempRunId = `pending-${Date.now()}`;
    const tempGeneratedAt = new Date().toISOString();

    try {
      setForceOpenSuggestions(true);
      setActiveTab("suggestions");
      const params = new URLSearchParams(searchParams);
      params.set("tab", "suggestions");
      setSearchParams(params, { replace: true });

      setPendingGeneration({ id: tempRunId, label: `Generate #${nextIndex}` });
      setExpandedGenerationItemId(tempRunId);
      setIsGeneratingSuggestions(true);

      if (checkGate) {
        try {
          const gateStatus = await testSuiteService.getOrderGateStatus(suiteId);
          if (!gateStatus.isGatePassed) {
            showErrorToast(
              gateStatus.message ||
                "Order gate not passed. Please approve the API order proposal first.",
            );
            if (run?.id) removeGenerationRun(run.id);
            return false;
          }
        } catch (gateErr: any) {
          console.warn("Could not check order gate status:", gateErr);
        }
      }

      const accepted = await testSuiteLlmSuggestionService.generate(suiteId, {
        specificationId: suite.apiSpecId,
        forceRefresh,
      });

      run = appendGenerationRun(new Date().toISOString());
      const runId = run?.id ?? tempRunId;
      const generatedAt = run?.generatedAt ?? tempGeneratedAt;
      setPendingGeneration({ id: runId, label: `Generate #${nextIndex}` });
      setExpandedGenerationItemId(runId);

      setActiveGenerationJob({
        jobId: accepted.jobId,
        runId,
        generatedAt,
        successToast,
      });
      if (runId) {
        updateGenerationRun(runId, { jobId: accepted.jobId });
      }
      jobStarted = true;
      return true;
    } catch (err: any) {
      const statusCode = err?.status ?? err?.response?.status;
      const message = String(
        err?.message || err?.response?.data?.message || "",
      );
      const alreadyHasPendingSuggestions =
        statusCode === 400 &&
        (message.includes("ForceRefresh=true") ||
          message.includes("suggestion preview"));

      if (run?.id) removeGenerationRun(run.id);

      if (alreadyHasPendingSuggestions) {
        await refreshSuggestionBuckets();
        showSuccessToast(t("testSuites.detailToast.suggestionsReady"));
      } else {
        handleError(err);
      }
      return false;
    } finally {
      if (!jobStarted) {
        clearSuggestionGenerationState();
      }
    }
  };

  const handleGenerateSuggestions = async (forceRefresh = false) => {
    await startSuggestionGeneration({
      source: "manual",
      forceRefresh,
      checkGate: true,
      successToast: t("testSuites.detailToast.suggestionsReady"),
    });
  };

  const handleOpenSuggestionDetail = async (suggestionId: string) => {
    if (!suiteId || !suggestionId) return null as any;

    try {
      setIsLoadingSuggestionDetail(true);
      const detail = await testSuiteLlmSuggestionService.detail(
        suiteId,
        suggestionId,
      );
      applySuggestionToLocalState(detail);
      return detail;
    } catch (err) {
      handleError(err);
      return null as any;
    } finally {
      setIsLoadingSuggestionDetail(false);
    }
  };

  const getLatestSuggestion = async (suggestion: SuiteSuggestionModel) => {
    if (suggestion.rowVersion) return suggestion;
    if (!suiteId) return suggestion;

    const detail = await testSuiteLlmSuggestionService.detail(
      suiteId,
      suggestion.id,
    );
    applySuggestionToLocalState(detail);
    return detail;
  };

  const maybeAutoNavigateToTestCases = (
    nextSuggestions: SuiteSuggestionModel[],
    nextTestCases: TestCase[],
  ) => {
    if (activeTab !== "suggestions") return;
    // If the user pinned a tab, do not auto-navigate away from it.
    if (isTabPinned) return;

    const hasPending = nextSuggestions.some(
      (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
    );
    const hasCases =
      nextTestCases.length > 0 || Number(suite?.testCaseCount ?? 0) > 0;

    if (!hasPending && hasCases) {
      setOverlayState({
        isVisible: true,
        title: t("testSuites.detailToast.moveToStep3Title"),
        message: t("testSuites.detailToast.moveToStep3Message"),
        stepLabel: t("testSuites.detailToast.moveToStep3Label"),
      });
      setTimeout(() => {
        setActiveTab("testcases");
        const params = new URLSearchParams(searchParams);
        params.set("tab", "testcases");
        setSearchParams(params, { replace: true });
        setOverlayState({
          isVisible: false,
          title: "",
          message: "",
          stepLabel: "",
        });
      }, 1200);
    }
  };

  const handleApproveSuggestion = async (
    suggestion: SuiteSuggestionModel,
    payload?: {
      reviewNotes?: string;
      modifiedContent: {
        name?: string;
        description?: string;
        testType?: string;
        priority?: string;
        tags?: string[];
      };
    },
  ) => {
    if (!suiteId) return;

    try {
      setIsReviewingSuggestion(true);
      const latest = await getLatestSuggestion(suggestion);

      if (!latest.rowVersion) {
        showErrorToast(t("testSuites.detailToast.missingRowVersion"));
        return;
      }

      const result = await testSuiteLlmSuggestionService.review(
        suiteId,
        latest.id,
        {
          action: payload?.modifiedContent ? "Modify" : "Approve",
          rowVersion: latest.rowVersion,
          reviewNotes: payload?.reviewNotes,
          modifiedContent: payload?.modifiedContent,
        },
      );

      const nextSuggestions = mergeSuggestionIntoList(allSuggestions, result);
      applySuggestionToLocalState(result);
      showSuccessToast(
        payload?.modifiedContent
          ? "Edited suggestion approved successfully."
          : "Suggestion approved successfully.",
      );

      const nextTestCases = await refreshTestCases();
      maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
    } catch (err) {
      handleError(err);
    } finally {
      setIsReviewingSuggestion(false);
    }
  };

  const handleRejectSuggestion = async (
    suggestion: SuiteSuggestionModel,
    reviewNotes: string,
  ): Promise<boolean> => {
    if (!suiteId) return false;

    try {
      setIsReviewingSuggestion(true);
      const latest = await getLatestSuggestion(suggestion);

      if (!latest.rowVersion) {
        showErrorToast(t("testSuites.detailToast.missingRowVersion"));
        return false;
      }

      const result = await testSuiteLlmSuggestionService.review(
        suiteId,
        latest.id,
        {
          action: "Reject",
          rowVersion: latest.rowVersion,
          reviewNotes,
        },
      );

      const nextSuggestions = mergeSuggestionIntoList(allSuggestions, result);
      applySuggestionToLocalState(result);
      showSuccessToast(t("testSuites.detailToast.suggestionReviewed"));
      maybeAutoNavigateToTestCases(nextSuggestions, testCases);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setIsReviewingSuggestion(false);
    }
  };

  const handleBulkReview = async (
    action: "Approve" | "Reject",
    rejectNotes?: string,
  ) => {
    if (!suiteId) return;

    const hasFilteredSuggestions = displayedSuggestions.length > 0;
    if (!hasFilteredSuggestions) {
      showInfoToast(t("testSuites.detailToast.noSuggestionsForFilter"));
      return;
    }

    if (action === "Reject" && !rejectNotes?.trim()) {
      setBulkRejectNotes("");
      setBulkRejectModalOpen(true);
      return;
    }

    try {
      setIsBulkReviewingSuggestions(true);
      const result = await testSuiteLlmSuggestionService.bulkReview(suiteId, {
        action,
        reviewNotes: rejectNotes?.trim() || undefined,
        filterByTestType: suggestionTestTypeFilter || undefined,
        filterByEndpointId: suggestionEndpointFilter || undefined,
      });

      showSuccessToast(
        `${action} completed. Processed ${result?.processedCount || 0} suggestion(s).`,
      );

      const nextSuggestions = await refreshSuggestionBuckets();
      const nextTestCases =
        action === "Approve" ? await refreshTestCases() : testCases;
      maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
    } catch (err) {
      handleError(err);
    } finally {
      setIsBulkReviewingSuggestions(false);
    }
  };

  const handleBulkRestore = async (suggestionIds: string[]) => {
    if (!suiteId) return;
    if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      showInfoToast(t("testSuites.detailToast.noSuggestionsForRestore"));
      return;
    }

    try {
      setIsBulkRestoringSuggestions(true);
      const result = await testSuiteLlmSuggestionService.bulkRestore(suiteId, {
        suggestionIds,
      });

      showSuccessToast(
        `Restore processed. Restored ${result?.processedCount || suggestionIds.length} suggestion(s).`,
      );

      const nextSuggestions = await refreshSuggestionBuckets();
      maybeAutoNavigateToTestCases(nextSuggestions, testCases);
    } catch (err) {
      handleError(err);
    } finally {
      setIsBulkRestoringSuggestions(false);
    }
  };

  const handleBulkReject = async (
    suggestionIds: string[],
    reviewNotes: string,
  ) => {
    if (!suiteId) return;
    if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      showInfoToast(t("testSuites.detailToast.noSuggestionsForReject"));
      return;
    }

    try {
      setIsBulkReviewingSuggestions(true);

      // If selection equals all pending suggestions under current filters, prefer server bulk-review
      const currentPendingIds = displayedSuggestions
        .filter((s) => String(s.reviewStatus || "").toLowerCase() === "pending")
        .map((s) => s.id);

      const isAllPendingSelected =
        currentPendingIds.length > 0 &&
        suggestionIds.length === currentPendingIds.length &&
        suggestionIds.every((id) => currentPendingIds.includes(id));

      if (isAllPendingSelected) {
        try {
          const payload: any = {
            action: "Reject",
            reviewNotes: reviewNotes || undefined,
            filterByTestType: suggestionTestTypeFilter || undefined,
            filterByEndpointId: suggestionEndpointFilter || undefined,
          };

          const result = await testSuiteLlmSuggestionService.bulkReview(
            suiteId,
            payload,
          );
          showSuccessToast(
            `Reject processed. Rejected ${result?.processedCount ?? 0} suggestion(s).`,
          );

          const nextSuggestions = await refreshSuggestionBuckets();
          maybeAutoNavigateToTestCases(nextSuggestions, testCases);
          return;
        } catch (err) {
          console.warn(
            "bulk-review reject failed, falling back to per-item reject",
            err,
          );
        }
      }

      // Fallback: reject items individually
      let processed = 0;
      for (const id of suggestionIds) {
        try {
          const suggestion = allSuggestions.find((s) => s.id === id);
          const latest = suggestion?.rowVersion
            ? suggestion
            : suggestion
              ? await getLatestSuggestion(suggestion)
              : null;
          if (!latest || !latest.rowVersion) continue;

          const ok = await handleRejectSuggestion(latest, reviewNotes);
          if (ok) processed++;
        } catch (e) {
          console.warn("single reject failed", e);
        }
      }

      const nextSuggestions = await refreshSuggestionBuckets();

      if (processed > 0) {
        showSuccessToast(
          `Reject processed. Rejected ${processed} suggestion(s).`,
        );
      } else {
        showErrorToast(t("testSuites.detailToast.noSuggestionsRejected"));
      }

      maybeAutoNavigateToTestCases(nextSuggestions, testCases);
    } catch (err) {
      handleError(err);
    } finally {
      setIsBulkReviewingSuggestions(false);
    }
  };

  const handleBulkApprove = async (suggestionIds: string[]) => {
    if (!suiteId) return;
    if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      showInfoToast(t("testSuites.detailToast.noSuggestionsForApprove"));
      return;
    }

    try {
      setIsBulkApprovingSuggestions(true);
      // If the selection corresponds exactly to "all pending suggestions" under current filters,
      // prefer the server-side bulk-review API (atomic) to avoid rowVersion conflicts.
      const currentPendingIds = displayedSuggestions
        .filter((s) => String(s.reviewStatus || "").toLowerCase() === "pending")
        .map((s) => s.id);

      const isAllPendingSelected =
        currentPendingIds.length > 0 &&
        suggestionIds.length === currentPendingIds.length &&
        suggestionIds.every((id) => currentPendingIds.includes(id));

      if (isAllPendingSelected) {
        // Build payload using current FE filters so server applies the same scope
        const payload: any = { action: "Approve" };
        if (suggestionTestTypeFilter)
          payload.filterByTestType = suggestionTestTypeFilter;
        if (suggestionEndpointFilter)
          payload.filterByEndpointId = suggestionEndpointFilter;
        // Note: FilterBySuggestionType not exposed in UI currently

        try {
          const result = await testSuiteLlmSuggestionService.bulkReview(
            suiteId,
            payload,
          );
          showSuccessToast(
            `Approve processed. Approved ${result?.processedCount ?? 0} suggestion(s).`,
          );

          const [nextSuggestions, nextTestCases] = await Promise.all([
            refreshSuggestionBuckets(),
            refreshTestCases(),
          ]);

          maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
          return;
        } catch (err) {
          // If bulk-review fails for any reason, fall back to per-item approves below
          console.warn(
            "bulk-review failed, falling back to per-item review",
            err,
          );
        }
      }

      // Fallback: approve items individually (parallel) and show one summary toast
      const approvePromises = suggestionIds.map(async (id) => {
        try {
          const suggestion = allSuggestions.find((s) => s.id === id);
          const latest = suggestion?.rowVersion
            ? suggestion
            : suggestion
              ? await getLatestSuggestion(suggestion)
              : null;
          if (!latest || !latest.rowVersion) {
            return { id, ok: false, reason: "missing-rowVersion" } as const;
          }

          const updated = await testSuiteLlmSuggestionService.review(
            suiteId,
            id,
            {
              action: "Approve",
              rowVersion: latest.rowVersion,
            },
          );
          applySuggestionToLocalState(updated);

          return { id, ok: true } as const;
        } catch (e) {
          return { id, ok: false, reason: e } as const;
        }
      });

      const results = await Promise.all(approvePromises);
      const processed = results.filter((r) => r.ok).length;

      const [nextSuggestions, nextTestCases] = await Promise.all([
        refreshSuggestionBuckets(),
        refreshTestCases(),
      ]);

      if (processed > 0) {
        showSuccessToast(
          `Approve processed. Approved ${processed} suggestion(s).`,
        );
      } else {
        showErrorToast(t("testSuites.detailToast.noSuggestionsApproved"));
      }

      maybeAutoNavigateToTestCases(nextSuggestions, nextTestCases);
    } catch (err) {
      handleError(err);
    } finally {
      setIsBulkApprovingSuggestions(false);
    }
  };

  const handleBulkRejectConfirm = async () => {
    if (!bulkRejectNotes.trim()) {
      showErrorToast(t("testSuites.detailToast.reviewNotesRequired"));
      return;
    }
    setBulkRejectModalOpen(false);
    await handleBulkReview("Reject", bulkRejectNotes.trim());
    setBulkRejectNotes("");
  };

  const clearSuggestionFilters = () => {
    setSuggestionReviewStatusFilter("");
    setSuggestionTestTypeFilter("");
    setSuggestionEndpointFilter("");
  };

  const reviewableSuggestions = allSuggestions.filter(
    (item) => String(item.reviewStatus || "").toLowerCase() !== "superseded",
  );

  const pendingSuggestionsCount = reviewableSuggestions.filter(
    (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
  ).length;
  const approvedSuggestionsCount = reviewableSuggestions.filter((item) => {
    const status = String(item.reviewStatus || "").toLowerCase();
    return status === "approved" || status === "modifiedandapproved";
  }).length;
  const rejectedSuggestionsCount = reviewableSuggestions.filter(
    (item) => String(item.reviewStatus || "").toLowerCase() === "rejected",
  ).length;
  const filteredApprovedSuggestionsCount = allSuggestions.filter((item) => {
    const status = String(item.reviewStatus || "").toLowerCase();
    return status === "approved" || status === "modifiedandapproved";
  }).length;
  const shouldShowSuggestionBulkActions = allSuggestions.some(
    (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
  );

  const steps: Array<{
    id: SuiteTab;
    title: string;
    helper: string;
    isDone: boolean;
  }> = [
    {
      id: "details",
      title: t("testSuites.detailToast.step1Title"),
      helper: hasChanges
        ? t("testSuites.detailToast.step1HelperPending")
        : allSuggestions.length > 0
          ? t("testSuites.detailToast.step1HelperApproved")
          : t("testSuites.detailToast.step1HelperNeedApprove"),
      isDone: isStep1Completed,
    },
    {
      id: "suggestions",
      title: t("testSuites.detailToast.step2Title"),
      helper:
        reviewableSuggestions.length === 0
          ? t("testSuites.detailToast.step2HelperGenerate")
          : t("testSuites.detailToast.step2HelperStatus", {
              pending: pendingSuggestionsCount,
              approved: approvedSuggestionsCount,
            }),
      isDone:
        reviewableSuggestions.length > 0 &&
        pendingSuggestionsCount === 0 &&
        approvedSuggestionsCount > 0,
    },
    {
      id: "testcases",
      title: t("testSuites.detailToast.step3Title"),
      helper: hasAnyTestCases
        ? t("testSuites.detailToast.step3HelperReady", {
            count: testCases.length || suite?.testCaseCount || 0,
          })
        : t("testSuites.detailToast.step3HelperEmpty"),
      isDone: hasAnyTestCases,
    },
  ];

  const activeStepIndex = steps.findIndex((step) => step.id === activeTab);

  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case "GET":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "POST":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "PUT":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      case "DELETE":
        return "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400";
      case "PATCH":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400";
    }
  };

  const getTestCaseMethod = (testCase: TestCase): string => {
    const method = String((testCase as any).method || "").toUpperCase();
    return method || "GET";
  };

  const filteredTestCases = testCases.filter((testCase) => {
    const keyword = testCaseSearchTerm.trim().toLowerCase();
    const method = getTestCaseMethod(testCase);
    const testType = String((testCase as any).testType || "").toLowerCase();

    const matchesSearch =
      !keyword ||
      testCase.name?.toLowerCase().includes(keyword) ||
      testCase.description?.toLowerCase().includes(keyword) ||
      testCase.path?.toLowerCase().includes(keyword) ||
      method.toLowerCase().includes(keyword) ||
      testType.includes(keyword);

    const matchesMethod =
      !testCaseFilterMethod || method === testCaseFilterMethod;

    return matchesSearch && matchesMethod;
  });

  const filteredEndpoints = endpoints.filter((endpoint) => {
    const keyword = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !keyword ||
      endpoint.path?.toLowerCase().includes(keyword) ||
      endpoint.description?.toLowerCase().includes(keyword) ||
      endpoint.tags?.some((tag: string) =>
        tag?.toLowerCase().includes(keyword),
      );

    const matchesMethod = !filterMethod || endpoint.method === filterMethod;

    return matchesSearch && matchesMethod;
  });

  const isFiltering = !!searchTerm.trim() || !!filterMethod;

  const getSuggestionDate = (suggestion: SuiteSuggestionModel) => {
    const value = suggestion.createdDateTime || suggestion.updatedDateTime;
    if (!value) return null;

    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : null;
  };

  const fallbackGenerationItems = () => {
    // Cluster suggestions by time-gap so two generate actions close in time are still separated.
    const splitGapMs = 20 * 1000;
    const combined = [...allSuggestions, ...archivedSuggestions];
    const withTime = combined
      .map((suggestion) => ({
        suggestion,
        time: getSuggestionDate(suggestion),
      }))
      .sort((a, b) => {
        if (a.time === null && b.time === null) return 0;
        if (a.time === null) return -1;
        if (b.time === null) return 1;
        return a.time - b.time;
      });

    const groups: Array<{
      id: string;
      generatedAt?: string;
      items: SuiteSuggestionModel[];
    }> = [];
    let currentGroup: {
      id: string;
      generatedAt?: string;
      items: SuiteSuggestionModel[];
    } | null = null;
    let lastTime: number | null = null;

    for (const entry of withTime) {
      const { suggestion, time } = entry;

      if (!currentGroup) {
        currentGroup = {
          id: `auto-${time ?? `unknown-${suggestion.id}`}`,
          generatedAt: time !== null ? new Date(time).toISOString() : undefined,
          items: [suggestion],
        };
        lastTime = time;
        continue;
      }

      if (time === null || lastTime === null || time - lastTime <= splitGapMs) {
        currentGroup.items.push(suggestion);
      } else {
        groups.push(currentGroup);
        currentGroup = {
          id: `auto-${time}`,
          generatedAt: new Date(time).toISOString(),
          items: [suggestion],
        };
      }

      if (time !== null) {
        lastTime = time;
      }
    }

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups
      .map((group, index) => {
        const items = group.items;

        const pendingSuggestions = items.filter(
          (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
        ).length;
        const approvedSuggestions = items.filter((item) => {
          const status = String(item.reviewStatus || "").toLowerCase();
          return status === "approved" || status === "modifiedandapproved";
        }).length;
        const rejectedSuggestions = items.filter(
          (item) =>
            String(item.reviewStatus || "").toLowerCase() === "rejected",
        ).length;
        const supersededSuggestions = items.filter(
          (item) =>
            String(item.reviewStatus || "").toLowerCase() === "superseded",
        ).length;

        return {
          id: group.id,
          label: `Generate #${index + 1}`,
          generatedAt: group.generatedAt,
          totalSuggestions: items.length,
          pendingSuggestions,
          approvedSuggestions,
          rejectedSuggestions,
          supersededSuggestions,
          testCaseIds: Array.from(
            new Set(
              items
                .filter((item) => {
                  const status = String(item.reviewStatus || "").toLowerCase();
                  return (
                    status === "approved" || status === "modifiedandapproved"
                  );
                })
                .map((item) => item.appliedTestCaseId)
                .filter((id): id is string => Boolean(id)),
            ),
          ),
          suggestionIds: items.map((item) => item.id),
        } as GenerationItem;
      })
      .sort((a, b) => {
        const aTime = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
        const bTime = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
        return aTime - bTime;
      });
  };

  const generationItems: GenerationItem[] = (() => {
    const combinedForTimeline = [...allSuggestions, ...archivedSuggestions];
    if (combinedForTimeline.length === 0) {
      return [];
    }

    // If local run markers are missing or only partially available, fallback clustering is safer.
    if (generationRuns.length <= 1) {
      return fallbackGenerationItems();
    }

    const sortedRuns = [...generationRuns].sort(
      (a, b) =>
        new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
    );

    const groups = new Map<string, SuiteSuggestionModel[]>();
    sortedRuns.forEach((run) => groups.set(run.id, []));

    combinedForTimeline.forEach((suggestion) => {
      const suggestionTime = getSuggestionDate(suggestion);
      if (suggestionTime === null) {
        const firstRun = sortedRuns[0];
        groups.set(firstRun.id, [
          ...(groups.get(firstRun.id) || []),
          suggestion,
        ]);
        return;
      }

      let assignedRunId = sortedRuns[0].id;
      for (let i = 0; i < sortedRuns.length; i++) {
        const currentRun = sortedRuns[i];
        const nextRun = sortedRuns[i + 1];
        const currentTime = new Date(currentRun.generatedAt).getTime();
        const nextTime = nextRun
          ? new Date(nextRun.generatedAt).getTime()
          : Number.POSITIVE_INFINITY;

        if (suggestionTime >= currentTime && suggestionTime < nextTime) {
          assignedRunId = currentRun.id;
          break;
        }

        if (suggestionTime >= currentTime) {
          assignedRunId = currentRun.id;
        }
      }

      groups.set(assignedRunId, [
        ...(groups.get(assignedRunId) || []),
        suggestion,
      ]);
    });

    return sortedRuns
      .map((run, index) => {
        let items: SuiteSuggestionModel[] = [];

        if (run.suggestionIds && run.suggestionIds.length > 0) {
          items = run.suggestionIds
            .map((id) => combinedForTimeline.find((s) => s.id === id))
            .filter((s): s is SuiteSuggestionModel => Boolean(s));
        } else {
          items = groups.get(run.id) || [];
        }

        const pendingSuggestions = items.filter(
          (item) => String(item.reviewStatus || "").toLowerCase() === "pending",
        ).length;
        const approvedSuggestions = items.filter((item) => {
          const status = String(item.reviewStatus || "").toLowerCase();
          return status === "approved" || status === "modifiedandapproved";
        }).length;
        const rejectedSuggestions = items.filter(
          (item) =>
            String(item.reviewStatus || "").toLowerCase() === "rejected",
        ).length;
        const supersededSuggestions = items.filter(
          (item) =>
            String(item.reviewStatus || "").toLowerCase() === "superseded",
        ).length;

        return {
          id: run.id,
          label: `Generate #${index + 1}`,
          generatedAt: run.generatedAt,
          totalSuggestions: items.length,
          pendingSuggestions,
          approvedSuggestions,
          rejectedSuggestions,
          supersededSuggestions,
          testCaseIds: Array.from(
            new Set(
              items
                .filter((item) => {
                  const status = String(item.reviewStatus || "").toLowerCase();
                  return (
                    status === "approved" || status === "modifiedandapproved"
                  );
                })
                .map((item) => item.appliedTestCaseId)
                .filter((id): id is string => Boolean(id)),
            ),
          ),
          suggestionIds: items.map((item) => item.id),
        };
      })
      .filter((item) => item.totalSuggestions > 0)
      .sort(
        (a, b) =>
          new Date(a.generatedAt || 0).getTime() -
          new Date(b.generatedAt || 0).getTime(),
      );
  })();

  useEffect(() => {
    if (
      expandedGenerationItemId &&
      !generationItems.some((item) => item.id === expandedGenerationItemId)
    ) {
      setExpandedGenerationItemId(null);
    }
  }, [expandedGenerationItemId, generationItems]);

  const expandedGenerationItem = expandedGenerationItemId
    ? generationItems.find((item) => item.id === expandedGenerationItemId)
    : undefined;

  const displayedSuggestions = (() => {
    const base = expandedGenerationItem
      ? // When viewing a specific generation, include both active and archived (superseded)
        [...allSuggestions, ...archivedSuggestions].filter((item) =>
          new Set(expandedGenerationItem.suggestionIds).has(item.id),
        )
      : allSuggestions;

    return base.filter((item) => {
      if (suggestionReviewStatusFilter) {
        if (
          String(item.reviewStatus || "").toLowerCase() !==
          suggestionReviewStatusFilter.toLowerCase()
        )
          return false;
      }
      if (suggestionTestTypeFilter) {
        if (
          String(item.testType || "").toLowerCase() !==
          suggestionTestTypeFilter.toLowerCase()
        )
          return false;
      }
      if (suggestionEndpointFilter) {
        if (item.endpointId !== suggestionEndpointFilter) return false;
      }
      return true;
    });
  })();

  const handleRunGenerationItem = (item: GenerationItem) => {
    if (!suiteId) return;

    if (item.testCaseIds.length === 0) {
      showInfoToast(
        "This generation has no approved test cases yet. Approve suggestions first.",
      );
      return;
    }

    setOverlayState({
      isVisible: true,
      title: "Preparing Execution Run",
      message: "Loading test cases for execution...",
      stepLabel: "Step 3 → Execute",
    });

    const params = new URLSearchParams();
    if (projectId) {
      params.set("projectId", projectId);
    }
    params.set("batchLabel", item.label);
    if (item.generatedAt) {
      params.set("generatedAt", item.generatedAt);
    }
    params.set("testCaseIds", item.testCaseIds.join(","));

    setTimeout(() => {
      navigate(`/test-suites/${suiteId}/generation-run?${params.toString()}`);
    }, 800);
  };

  if (isLoading) {
    return (
      <MainLayout
        title={suite?.name || "Test Suite Details"}
        breadcrumbs={breadcrumbs}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout
        title={suite?.name || "Test Suite Details"}
        breadcrumbs={breadcrumbs}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-on-surface-variant mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              {t("pages.TestSuiteDetailPage.try_again")}
            </button>
          </div>
        </div>
      </MainLayout>
    );
    {
      t("pages.TestSuiteDetailPage.confirm_reject_all");
    }
  }

  if (!suite) {
    return (
      <MainLayout
        title={suite?.name || "Test Suite Details"}
        breadcrumbs={breadcrumbs}
      >
        <div className="text-center py-20">
          <p className="text-on-surface-variant">
            {t("pages.TestSuiteDetailPage.test_suite_not_found")}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      {isSubmitting && (
        <GlobalSpinner label={t("testSuites.detailToast.savingSuite")} />
      )}

      {/* Bulk Reject Modal */}
      <Modal
        isOpen={bulkRejectModalOpen}
        onClose={() => {
          if (!isBulkReviewingSuggestions) setBulkRejectModalOpen(false);
        }}
        title="Bulk Reject Suggestions"
        footer={
          <>
            <button
              onClick={() => setBulkRejectModalOpen(false)}
              disabled={isBulkReviewingSuggestions}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              {t("pages.TestSuiteDetailPage.cancel")}
            </button>
            <button
              onClick={handleBulkRejectConfirm}
              disabled={isBulkReviewingSuggestions || !bulkRejectNotes.trim()}
              className="px-8 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isBulkReviewingSuggestions ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              {t("pages.TestSuiteDetailPage.confirm_reject_all")}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-on-surface-variant">
            <Trans
              i18nKey="pages.TestSuiteDetailPage.bulk_reject_description"
              values={{
                count: displayedSuggestions.filter(
                  (s) =>
                    String(s.reviewStatus || "").toLowerCase() === "pending",
                ).length,
              }}
              components={{
                bold: <span className="font-bold text-on-surface" />,
              }}
            />
          </p>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t("pages.TestSuiteDetailPage.review_notes_required")}
            </label>
            <textarea
              value={bulkRejectNotes}
              onChange={(e) => setBulkRejectNotes(e.target.value)}
              rows={3}
              autoFocus
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder={t(
                "pages.TestSuiteDetailPage.review_notes_placeholder",
              )}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={addEndpointModalOpen}
        onClose={() => setAddEndpointModalOpen(false)}
        title={t("pages.TestSuiteDetailPage.add_endpoints_from_spec_title")}
        footer={
          <>
            <button
              onClick={() => setAddEndpointModalOpen(false)}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              {t("pages.TestSuiteDetailPage.cancel")}
            </button>
            <button
              onClick={handleAddEndpointsFromSpec}
              disabled={selectedEndpointIdsToAdd.length === 0}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("pages.TestSuiteDetailPage.add_selected", {
                count: selectedEndpointIdsToAdd.length,
              })}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {availableSpecEndpoints.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              {t(
                "pages.TestSuiteDetailPage.all_endpoints_from_this_spec_are_already",
              )}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {availableSpecEndpoints.map((endpoint) => {
                const checked = selectedEndpointIdsToAdd.includes(endpoint.id);
                return (
                  <label
                    key={endpoint.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEndpointIdsToAdd((prev) => [
                            ...prev,
                            endpoint.id,
                          ]);
                        } else {
                          setSelectedEndpointIdsToAdd((prev) =>
                            prev.filter((id) => id !== endpoint.id),
                          );
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface">
                        {endpoint.method} {endpoint.path}
                      </p>
                      {!!endpoint.description && (
                        <p className="text-xs text-on-surface-variant mt-1 truncate">
                          {endpoint.description}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={manualEndpointModalOpen}
        onClose={() => {
          if (!isCreatingEndpoint) setManualEndpointModalOpen(false);
        }}
        title={t("pages.TestSuiteDetailPage.add_manual_endpoint_title")}
        footer={
          <>
            <button
              onClick={() => setManualEndpointModalOpen(false)}
              disabled={isCreatingEndpoint}
              className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              {t("pages.TestSuiteDetailPage.cancel")}
            </button>
            <button
              onClick={handleCreateManualEndpoint}
              disabled={isCreatingEndpoint || !manualEndpointForm.path.trim()}
              className="px-8 py-3 bg-primary dark:bg-indigo-600 text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreatingEndpoint ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {t("pages.TestSuiteDetailPage.create_endpoint")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                {t("pages.TestSuiteDetailPage.method")}
              </label>
              <select
                value={manualEndpointForm.method}
                onChange={(e) =>
                  setManualEndpointForm((prev) => ({
                    ...prev,
                    method: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              >
                <option value="GET">
                  {t("pages.TestSuiteDetailPage.get")}
                </option>
                <option value="POST">
                  {t("pages.TestSuiteDetailPage.post")}
                </option>
                <option value="PUT">
                  {t("pages.TestSuiteDetailPage.put")}
                </option>
                <option value="PATCH">
                  {t("pages.TestSuiteDetailPage.patch")}
                </option>
                <option value="DELETE">
                  {t("pages.TestSuiteDetailPage.delete")}
                </option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                {t("pages.TestSuiteDetailPage.path")}
              </label>
              <input
                value={manualEndpointForm.path}
                onChange={(e) =>
                  setManualEndpointForm((prev) => ({
                    ...prev,
                    path: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
                placeholder={t(
                  "pages.TestSuiteDetailPage.manual_endpoint_path_placeholder",
                )}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t("pages.TestSuiteDetailPage.description")}
            </label>
            <textarea
              rows={3}
              value={manualEndpointForm.description}
              onChange={(e) =>
                setManualEndpointForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-4 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-on-surface"
              placeholder={t(
                "pages.TestSuiteDetailPage.manual_endpoint_description_placeholder",
              )}
            />
          </div>
        </div>
      </Modal>

      <StepTransitionOverlay
        isVisible={overlayState.isVisible}
        title={overlayState.title}
        message={overlayState.message}
        stepLabel={overlayState.stepLabel}
      />
      <MainLayout
        title={suite?.name || "Test Suite Details"}
        breadcrumbs={breadcrumbs}
      >
        <div className="space-y-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mt-4">
            <div className="space-y-2 ">
              <h1 className="text-4xl font-bold tracking-tight text-on-surface">
                {suite.name}
              </h1>
              {suite.description && (
                <p className="text-on-surface-variant">{suite.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              {activeTab === "details" && (!isStep1Completed || hasChanges) && (
                <button
                  onClick={handleApproveOrderAndGoToReview}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {hasChanges && hasApprovedOrderOnce
                    ? t("testSuites.detailToast.saveApproveOrder")
                    : t("testSuites.detailToast.approveOrder")}
                </button>
              )}
            </div>
          </header>

          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border border-outline-variant/10 dark:border-slate-800 p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {steps.map((step, index) => {
                const isActive = step.id === activeTab;
                const isAccessible =
                  step.id === "details" ||
                  (step.id === "suggestions" && isStep1Completed) ||
                  (step.id === "testcases" && hasAnyTestCases);

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (!isAccessible) {
                        if (step.id === "suggestions") {
                          showInfoToast(
                            t("testSuites.detailToast.needApproveBeforeReview"),
                          );
                        } else {
                          showInfoToast(
                            t("testSuites.detailToast.completePreviousSteps"),
                          );
                        }
                        return;
                      }
                      changeTab(step.id);
                    }}
                    className={cn(
                      "text-left p-3 rounded-xl border transition-all",
                      isActive
                        ? "border-primary bg-primary/10"
                        : "border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-on-surface">
                        {step.title}
                      </p>
                      {step.isDone && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {step.helper}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-2">
                      {isActive
                        ? t("testSuites.detailToast.current")
                        : isAccessible
                          ? t("testSuites.detailToast.available")
                          : t("testSuites.detailToast.locked")}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl bg-surface-container-low dark:bg-slate-800/60 p-3 flex flex-wrap items-center gap-3 justify-between">
              <p className="text-sm font-semibold text-on-surface">
                {t("testSuites.detailToast.workflowProgress", {
                  current: activeStepIndex + 1,
                })}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                <span className="px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                  {t("testSuites.detailToast.pendingAi", {
                    count: pendingSuggestionsCount,
                  })}
                </span>
                <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800">
                  {t("testSuites.detailToast.approvedCount", {
                    count: approvedSuggestionsCount,
                  })}
                </span>
                <span className="px-2 py-1 rounded-md bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200">
                  {t("testSuites.detailToast.rejectedCount", {
                    count: rejectedSuggestionsCount,
                  })}
                </span>
              </div>
            </div>
          </div>

          {activeTab === "testcases" && (
            <div className="space-y-4">
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                    Generated Items
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Open one generation batch at a time
                  </p>
                </div>

                {generationItems.length === 0 ? (
                  <div className="text-sm text-on-surface-variant">
                    No generation item detected yet. Generate and approve
                    suggestions to create executable items.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {generationItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-outline-variant/10 dark:border-slate-800 p-3 bg-surface-container-low dark:bg-slate-800/50"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-on-surface">
                              {item.label}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {item.generatedAt
                                ? new Date(item.generatedAt).toLocaleString()
                                : "Unknown generate time"}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                Suggestions: {item.totalSuggestions}
                              </span>
                              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                                Approved: {item.approvedSuggestions}
                              </span>
                              <span className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                                Pending: {item.pendingSuggestions}
                              </span>
                              <span className="px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200">
                                Rejected: {item.rejectedSuggestions}
                              </span>
                              <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                Superseded: {item.supersededSuggestions}
                              </span>
                              <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
                                Test cases: {item.testCaseIds.length}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRunGenerationItem(item)}
                            disabled={item.testCaseIds.length === 0}
                            className="px-4 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Play className="w-4 h-4" />
                            Open
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 text-sm text-on-surface-variant">
                Detailed test-case listing is hidden on this screen.
              </div>
            </div>
          )}

          {activeTab === "suggestions" && (
            <div className="space-y-4">
              {/* Stale-suggestions warning: SRS was linked AFTER generation */}
              {hasStaleNoSrsSuggestions && !isGeneratingSuggestions && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      Pending suggestions were generated without SRS context
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      The SRS document &ldquo;
                      {srsDocuments.find((d) => d.id === linkedSrsDocId)
                        ?.title ?? linkedSrsDocId}
                      &rdquo; was linked after these suggestions were generated.
                      Regenerate so the LLM aligns scenarios with your
                      requirements.
                    </p>
                  </div>
                  <button
                    onClick={() => handleGenerateSuggestions(true)}
                    className="flex items-center gap-1.5 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate with SRS
                  </button>
                </div>
              )}

              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                    Generate Timeline
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Suggestions grouped by each generation run
                  </p>
                </div>

                {generationItems.length === 0 &&
                !pendingGeneration &&
                !hasServerGenerationHistory ? (
                  <div className="text-sm text-on-surface-variant">
                    No generation run detected yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {generationItems.length === 0 &&
                      !pendingGeneration &&
                      hasServerGenerationHistory && (
                        <div className="text-sm text-on-surface-variant">
                          {isWaitingForServerCallbackData
                            ? "Waiting for callback data from server..."
                            : "Generation job history exists on server. Waiting for callback data to appear."}
                        </div>
                      )}
                    {isWaitingForServerCallbackData && !pendingGeneration && (
                      <div className="rounded-lg border-2 bg-indigo-50/60 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 p-4 transition-colors">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                              Waiting for callback data from server...
                            </p>
                            <p className="text-xs text-indigo-500 dark:text-indigo-400">
                              Suggestions will appear automatically when callback finishes.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {pendingGeneration && (
                      <div
                        key={pendingGeneration.id}
                        className="rounded-lg border-2 bg-indigo-50/60 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 p-4 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                              {generationPolling.phaseLabel ||
                                getGenerationStatusLabel(
                                  suggestionGenerationStatus,
                                )}
                            </p>
                            <p className="text-xs text-indigo-500 dark:text-indigo-400">
                              Suggestions will appear here when complete.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {generationItems.map((item, index) => {
                      // Highlight if all suggestions are superseded
                      const isSupersededBatch =
                        item.supersededSuggestions === item.totalSuggestions &&
                        item.totalSuggestions > 0;
                      return (
                        <div
                          key={item.id}
                          className={
                            `rounded-lg border border-outline-variant/10 dark:border-slate-800 p-3 ` +
                            (isSupersededBatch
                              ? "bg-slate-200 dark:bg-slate-700/80 opacity-80"
                              : "bg-surface-container-low dark:bg-slate-800/50")
                          }
                        >
                          {(() => {
                            const isExpanded =
                              expandedGenerationItemId === item.id;
                            return (
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-on-surface">
                                      {item.label}
                                    </p>
                                    {index === generationItems.length - 1 && (
                                      <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold uppercase tracking-wider">
                                        Latest
                                      </span>
                                    )}
                                    {isSupersededBatch && (
                                      <span className="px-2 py-0.5 rounded bg-slate-400 text-white text-[10px] font-bold uppercase tracking-wider">
                                        Superseded
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-on-surface-variant">
                                    {item.generatedAt
                                      ? new Date(
                                          item.generatedAt,
                                        ).toLocaleString()
                                      : "Unknown generate time"}
                                  </p>
                                </div>

                                <div className="flex flex-col items-start md:items-end gap-2">
                                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                    <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                      Total: {item.totalSuggestions}
                                    </span>
                                    <span className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                                      Pending: {item.pendingSuggestions}
                                    </span>
                                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                                      Approved: {item.approvedSuggestions}
                                    </span>
                                    <span className="px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200">
                                      Rejected: {item.rejectedSuggestions}
                                    </span>
                                    <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                      Superseded: {item.supersededSuggestions}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newId =
                                        expandedGenerationItemId === item.id
                                          ? null
                                          : item.id;
                                      setExpandedGenerationItemId(newId);
                                      // Reset filter về All khi mở generation item để hiện tất cả suggestions
                                      if (newId) {
                                        setSuggestionReviewStatusFilter("");
                                        setSuggestionTestTypeFilter("");
                                        setSuggestionEndpointFilter("");
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-md bg-primary dark:bg-indigo-600 text-on-primary text-xs font-semibold flex items-center gap-1"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                    {isExpanded ? "Hide" : "Open"}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {expandedGenerationItem ? (
                <SuggestionReviewPanel
                  suggestions={displayedSuggestions}
                  allSuggestions={allSuggestions}
                  endpoints={endpoints}
                  isLoadingSuggestions={isLoadingSuggestions}
                  isReviewingSuggestion={isReviewingSuggestion}
                  isLoadingSuggestionDetail={isLoadingSuggestionDetail}
                  reviewStatusFilter={suggestionReviewStatusFilter}
                  testTypeFilter={suggestionTestTypeFilter}
                  endpointFilter={suggestionEndpointFilter}
                  onReviewStatusFilterChange={setSuggestionReviewStatusFilter}
                  onTestTypeFilterChange={setSuggestionTestTypeFilter}
                  onEndpointFilterChange={setSuggestionEndpointFilter}
                  onApplyFilters={async (filters) => {
                    setSuggestionReviewStatusFilter(filters.reviewStatus);
                    setSuggestionTestTypeFilter(filters.testType);
                    setSuggestionEndpointFilter(filters.endpointId);
                  }}
                  onClearFilters={clearSuggestionFilters}
                  onLoadDetail={handleOpenSuggestionDetail}
                  onApprove={handleApproveSuggestion}
                  onReject={handleRejectSuggestion}
                  onBulkRestore={handleBulkRestore}
                  isBulkRestoringSuggestions={isBulkRestoringSuggestions}
                  onBulkApprove={handleBulkApprove}
                  isBulkApprovingSuggestions={isBulkApprovingSuggestions}
                  onBulkReject={handleBulkReject}
                  srsCoverageSummary={srsCoverageSummary}
                />
              ) : (
                <div className="text-sm text-on-surface-variant text-center py-8">
                  Open a generation batch above to review its suggestions.
                </div>
              )}
            </div>
          )}

          {activeTab === "details" && (
            <>
              {/* SRS Document Link */}
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
                <div className="flex-1">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                    Tài liệu SRS liên kết
                  </p>
                  <p className="text-sm text-on-surface">
                    {linkedSrsDocId
                      ? (srsDocuments.find((d) => d.id === linkedSrsDocId)
                          ?.title ?? linkedSrsDocId)
                      : "Chưa liên kết"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!linkedSrsDocId && (
                    <Link
                      to="/srs-documents"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200/60 dark:border-amber-700/30"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {t("pages.TestSuiteDetailPage.srs_documents")}
                    </Link>
                  )}
                  {linkedSrsDocId && suiteId && (
                    <Link
                      to={`/traceability?suiteId=${suiteId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200/60 dark:border-emerald-700/30"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {t("pages.TestSuiteDetailPage.traceability")}
                    </Link>
                  )}
                  <select
                    value={linkedSrsDocId}
                    onChange={(e) => handleLinkSrsDoc(e.target.value)}
                    disabled={isLinkingSrsDoc}
                    className="px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low dark:bg-slate-800 text-sm text-on-surface disabled:opacity-60"
                  >
                    <option value="">
                      {t("pages.TestSuiteDetailPage.unlink_option")}
                    </option>
                    {srsDocuments.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title}
                      </option>
                    ))}
                  </select>
                  {isLinkingSrsDoc && (
                    <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />
                  )}
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-xl border border-outline-variant/10 dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-surface-container-low dark:bg-slate-800 rounded-lg border-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-indigo-900/30 text-sm text-on-surface"
                    placeholder={t(
                      "pages.TestSuiteDetailPage.search_endpoints_placeholder",
                    )}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-2">
                    {t("pages.TestSuiteDetailPage.method")}
                  </span>
                  {["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"].map(
                    (method) => (
                      <button
                        key={method}
                        onClick={() =>
                          setFilterMethod(method === "ALL" ? "" : method)
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                          (method === "ALL" && !filterMethod) ||
                            method === filterMethod
                            ? "bg-primary dark:bg-indigo-600 text-on-primary"
                            : "bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-highest dark:hover:bg-slate-700",
                        )}
                      >
                        {method}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Endpoints List - Drag & Drop */}
              <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl border border-outline-variant/10 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/10 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-on-surface">
                        Endpoints ({filteredEndpoints.length}/{endpoints.length}
                        )
                      </h2>
                      <p className="text-sm text-on-surface-variant mt-1">
                        {isFiltering
                          ? "Filtering is active. Clear search/filter to reorder endpoints."
                          : "Drag and drop to reorder execution sequence"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEndpointIdsToAdd([]);
                          setAddEndpointModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-lg bg-surface-container-high dark:bg-slate-800 text-on-surface text-xs font-semibold"
                      >
                        Add From Spec
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManualEndpointForm({
                            method: "GET",
                            path: "",
                            description: "",
                          });
                          setManualEndpointModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-lg bg-primary dark:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Manual
                      </button>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-outline-variant/10 dark:divide-slate-800">
                  {filteredEndpoints.length === 0 ? (
                    <div className="px-6 py-12 text-center text-on-surface-variant">
                      No endpoints match current search/filter
                    </div>
                  ) : (
                    filteredEndpoints.map((endpoint, index) => (
                      <div
                        key={endpoint.id}
                        draggable={!isFiltering}
                        onDragStart={() =>
                          !isFiltering && handleDragStart(index)
                        }
                        onDragOver={(e) =>
                          !isFiltering && handleDragOver(e, index)
                        }
                        onDragEnd={() => !isFiltering && handleDragEnd()}
                        className={cn(
                          "px-6 py-4 hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors",
                          draggedIndex === index && "opacity-50",
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center gap-4",
                            !isFiltering && "cursor-move",
                          )}
                        >
                          <GripVertical className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                          <div className="flex items-center gap-1 text-on-surface-variant font-mono text-sm flex-shrink-0">
                            <span className="w-6 text-right">{index + 1}</span>
                            <span>.</span>
                          </div>
                          <span
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-black tracking-tighter min-w-[70px] text-center flex-shrink-0",
                              getMethodColor(endpoint.method),
                            )}
                          >
                            {endpoint.method}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate">
                              {endpoint.path}
                            </p>
                            {endpoint.description && (
                              <p className="text-xs text-on-surface-variant truncate">
                                {endpoint.description}
                              </p>
                            )}
                          </div>
                          {endpoint.tags &&
                            Array.isArray(endpoint.tags) &&
                            endpoint.tags.length > 0 && (
                              <div className="flex gap-1 flex-shrink-0">
                                {endpoint.tags
                                  .slice(0, 2)
                                  .map((tag: string, i: number) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 bg-surface-container dark:bg-slate-800 text-on-surface-variant text-[10px] font-bold rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                {endpoint.tags.length > 2 && (
                                  <span className="px-2 py-0.5 bg-surface-container dark:bg-slate-800 text-on-surface-variant text-[10px] font-bold rounded-full">
                                    +{endpoint.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </MainLayout>
    </>
  );
}
